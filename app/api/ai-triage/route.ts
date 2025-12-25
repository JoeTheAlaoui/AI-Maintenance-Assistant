import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
});

function detectMessageLanguage(text: string): string {
    const arabicChars = text.match(/[\u0600-\u06FF]/g);
    const arabicRatio = arabicChars ? arabicChars.length / text.length : 0;

    const darijaKeywords = [
        'شنو', 'كيفاش', 'واش', 'اللي', 'ديال', 'غادي', 'عندنا', 'دابا',
        'chno', 'kifach', 'wach', 'lli', 'li', 'dial', 'ghadi', 'bghit', '3and'
    ];

    const isDarija = darijaKeywords.some(kw =>
        text.toLowerCase().includes(kw.toLowerCase())
    );

    if (isDarija) {
        return 'Darija (Moroccan Arabic with French/Arabic mix)';
    }

    if (arabicRatio > 0.3) {
        return 'Arabic';
    }

    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'problème', 'compresseur'];
    const hasFrench = frenchWords.some(word =>
        new RegExp(`\\b${word}\\b`, 'i').test(text)
    );

    if (hasFrench) {
        return 'French';
    }

    return 'English';
}

export async function POST(req: NextRequest) {
    try {
        const { message, conversationHistory } = await req.json();

        // Detect user's language
        const userLanguage = detectMessageLanguage(message);
        console.log(`[AI Triage] Detected user language: ${userLanguage}`);

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        // ═══════════════════════════════════════════════════
        // STEP 1: FETCH ASSETS CONTEXT
        // ═══════════════════════════════════════════════════

        const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('*')
            .order('name');

        if (assetsError) {
            console.error('Error fetching assets:', assetsError);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type AssetRow = any;

        // Parse components for each asset
        const assetsWithComponents = (assets as AssetRow[])?.map((asset: AssetRow) => {
            let components: Array<{ name?: string; type?: string; code?: string }> = [];
            try {
                const rawComponents = asset.components;
                components = typeof rawComponents === 'string'
                    ? JSON.parse(rawComponents)
                    : rawComponents || [];
            } catch {
                components = [];
            }

            return {
                id: asset.id,
                name: asset.name,
                code: asset.code,
                location: asset.location || 'Unknown',
                status: asset.status || 'operational',
                manufacturer: asset.manufacturer,
                model: asset.model_number,
                components: Array.isArray(components) ? components.slice(0, 10).map((c) => ({
                    name: typeof c === 'object' && c !== null ? c.name : String(c),
                    type: typeof c === 'object' && c !== null ? c.type : 'component'
                })) : []
            };
        }) || [];

        // ═══════════════════════════════════════════════════
        // STEP 2: BUILD SYSTEM PROMPT WITH CONTEXT
        // ═══════════════════════════════════════════════════

        const systemPrompt = `You are an **Expert Maintenance Triage Assistant** for industrial equipment.

# CRITICAL: LANGUAGE MATCHING RULE
**ALWAYS respond in the SAME language the user is speaking.**

If user speaks in:
- French → Respond in French
- Arabic → Respond in Arabic
- Darija (Moroccan Arabic) → Respond in Darija (mix of Arabic script + French technical terms)
- English → Respond in English

Detect the language from the user's message and adapt your response accordingly.

Examples:
User: "شنو المشكل في الكومبريسور؟"
You: "واش هو الكومبريسور ديال FIAC ولا B-300؟" (Respond in Darija)

User: "Il y a un problème avec le compresseur"
You: "De quel compresseur parlez-vous exactement?" (Respond in French)

# YOUR MISSION
Help maintenance technicians quickly identify:
1. Which specific equipment (Asset) has an issue
2. Which component of that equipment is affected
3. What type of maintenance intervention is needed

# AVAILABLE EQUIPMENT CONTEXT
${JSON.stringify(assetsWithComponents, null, 2)}

# CONVERSATION RULES

## Rule 1: Asset Identification (Proactive Suggestions)
When user mentions a problem but doesn't specify which equipment:
- Generate CLICKABLE SUGGESTION CHIPS with the 2-4 most likely assets
- Format as JSON with type: "suggestion_chips"

## Rule 2: Location-Based Filtering
If user mentions a location (e.g., "Zone A", "Production Line 2"):
- Filter assets by that location
- If only 1 asset matches → Confirm directly

## Rule 3: Component Identification
Once Asset is identified:
- List the asset's main components as SUGGESTION CHIPS
- Ask: "Which part is affected?"

## Rule 4: Symptom-Based Intelligence
Common symptom mappings:
- "Vibration" → Bearings, Motor, Belt
- "Leak" → Seals, Gaskets, Hoses
- "Noise" → Motor, Bearings, Fan
- "Overheating" → Cooling system, Motor
- "Not starting" → Electrical, Motor, Control system

## Rule 5: Work Order Creation
When you have identified Asset + Component + Issue:
→ Generate a WORK ORDER DRAFT with priority, time, and actions

# OUTPUT FORMAT (CRITICAL)

You MUST respond with valid JSON in ONE of these formats:

## Format 1: Suggestion Chips
\`\`\`json
{
  "type": "suggestion_chips",
  "title": "Which equipment are you referring to?",
  "items": [
    {"id": "asset-123", "label": "Compresseur FIAC 5.5HP", "value": "compressor", "metadata": {"location": "Zone A"}}
  ]
}
\`\`\`

## Format 2: Confirmation
\`\`\`json
{
  "type": "confirmation",
  "assetId": "asset-123",
  "assetName": "Compresseur FIAC 5.5HP",
  "componentName": "Moteur électrique",
  "issue": "Vibrations anormales"
}
\`\`\`

## Format 3: Work Order Draft
\`\`\`json
{
  "type": "work_order_draft",
  "assetId": "asset-123",
  "assetName": "Compresseur FIAC 5.5HP",
  "componentName": "Moteur électrique",
  "issue": "Vibrations anormales",
  "priority": "high",
  "estimatedTime": 90,
  "suggestedActions": [
    "Arrêter le compresseur",
    "Vérifier l'alignement",
    "Inspecter les roulements"
  ]
}
\`\`\`

## Format 4: Text Response
\`\`\`json
{
  "type": "text",
  "content": "Your helpful response here"
}
\`\`\`

CRITICAL: Always respond with valid JSON. Never include text outside the JSON structure.`;

        // ═══════════════════════════════════════════════════
        // STEP 3: BUILD CONVERSATION HISTORY
        // ═══════════════════════════════════════════════════

        const messages = [
            ...(conversationHistory || []).map((msg: { role: string; content: string }) => ({
                role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
                content: msg.content
            })),
            {
                role: 'user' as const,
                content: message
            }
        ];

        // ═══════════════════════════════════════════════════
        // STEP 4: CALL CLAUDE API WITH LANGUAGE INSTRUCTION
        // ═══════════════════════════════════════════════════

        const languageInstruction = `\n\nIMPORTANT: The user is speaking in ${userLanguage}. You MUST respond in ${userLanguage}.`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt + languageInstruction,
            messages: messages
        });

        // ═══════════════════════════════════════════════════
        // STEP 5: PARSE STRUCTURED OUTPUT
        // ═══════════════════════════════════════════════════

        const textContent = response.content.find(block => block.type === 'text');
        const aiText = textContent && 'text' in textContent ? textContent.text : '';

        // Extract JSON from response
        let structuredOutput;

        try {
            const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) ||
                aiText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const jsonString = jsonMatch[1] || jsonMatch[0];
                structuredOutput = JSON.parse(jsonString);
            } else {
                structuredOutput = {
                    type: 'text',
                    content: aiText
                };
            }
        } catch {
            structuredOutput = {
                type: 'text',
                content: aiText
            };
        }

        return NextResponse.json({
            response: structuredOutput,
            rawText: aiText,
            messageId: response.id,
            detectedLanguage: userLanguage
        });

    } catch (error) {
        console.error('AI Triage API Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process AI triage request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
