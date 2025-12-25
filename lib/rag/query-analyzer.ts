// lib/rag/query-analyzer.ts
// Analyzes user queries to determine intent, urgency, and search strategy

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type QueryIntent =
    | 'troubleshooting'    // Problem solving, diagnostics
    | 'maintenance'        // Preventive maintenance, schedules
    | 'installation'       // Setup, commissioning
    | 'parts'              // Spare parts, references
    | 'specs'              // Technical specifications
    | 'procedure'          // How-to, step-by-step
    | 'general';           // General question

export type QueryUrgency = 'emergency' | 'planning' | 'information';

export type QueryScope = 'component' | 'equipment' | 'subsystem' | 'line' | 'site' | 'unknown';

export interface QueryAnalysis {
    intent: QueryIntent;
    urgency: QueryUrgency;
    scope: QueryScope;

    // Detected entities
    equipment_mentioned: string[];
    components_mentioned: string[];
    error_codes: string[];
    symptoms: string[];

    // Search strategy
    search_document_types: string[];
    search_in_schematics: boolean;
    search_in_dependencies: boolean;

    // Response strategy
    response_format: 'steps' | 'list' | 'table' | 'explanation' | 'diagnostic';
    include_safety_warning: boolean;
    include_parts_list: boolean;

    confidence: number;
    reasoning: string;
}

interface AssetContext {
    name: string;
    level: string;
    category?: string;
    children?: string[];
    aliases?: string[];
}

/**
 * Full AI-powered query analysis for complex queries
 */
export async function analyzeQuery(query: string, assetContext: AssetContext): Promise<QueryAnalysis> {
    const prompt = `You are an industrial maintenance query analyzer. Analyze this user question to determine the best search and response strategy.

CURRENT CONTEXT:
- Asset: ${assetContext.name}
- Level: ${assetContext.level}
- Category: ${assetContext.category || 'unknown'}
${assetContext.children?.length ? `- Contains: ${assetContext.children.join(', ')}` : ''}
${assetContext.aliases?.length ? `- Also known as: ${assetContext.aliases.join(', ')}` : ''}

USER QUESTION:
"${query}"

Analyze and respond with JSON:
{
  "intent": "troubleshooting|maintenance|installation|parts|specs|procedure|general",
  "urgency": "emergency|planning|information",
  "scope": "component|equipment|subsystem|line|site|unknown",
  
  "equipment_mentioned": ["list of equipment names mentioned"],
  "components_mentioned": ["list of components like motor, pump, valve"],
  "error_codes": ["any error codes like E01, F23"],
  "symptoms": ["described symptoms like 'ne démarre pas', 'bruit anormal'"],
  
  "search_document_types": ["manual", "installation", "catalogue", "schematic"],
  "search_in_schematics": true/false,
  "search_in_dependencies": true/false,
  
  "response_format": "steps|list|table|explanation|diagnostic",
  "include_safety_warning": true/false,
  "include_parts_list": true/false,
  
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of analysis"
}

GUIDELINES:
- "troubleshooting" + "emergency" → search schematics, dependencies, use diagnostic format
- "maintenance" → search manual, use steps format
- "parts" → search catalogue, use table format
- "installation" → search installation docs, use steps format
- Safety warning for: electrical work, high pressure, hot surfaces, moving parts
- Parts list for: repairs, replacements, maintenance`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Fast & cheap for analysis
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();

        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Query analysis error:', error);
        return getDefaultAnalysis();
    }
}

/**
 * Quick local analysis without API call (for common patterns)
 */
export function quickAnalyzeQuery(query: string): Partial<QueryAnalysis> {
    const q = query.toLowerCase();

    // Detect urgency
    const emergencyPatterns = [
        'ne marche pas', 'ne fonctionne pas', 'ma khdamch', 'wa9ef', 'arrêté',
        'en panne', 'bloqué', 'urgent', 'erreur', 'alarme', 'défaut', 'mochkil',
        'khsara', 'problème', 'cassé', 'broken', 'down', 'stopped'
    ];
    const isEmergency = emergencyPatterns.some(p => q.includes(p));

    // Detect intent
    let intent: QueryIntent = 'general';

    if (q.includes('problème') || q.includes('panne') || q.includes('erreur') ||
        q.includes('ne marche') || q.includes('diagnostic') || q.includes('mochkil') ||
        q.includes('défaut') || q.includes('alarme')) {
        intent = 'troubleshooting';
    } else if (q.includes('maintenance') || q.includes('entretien') || q.includes('vidange') ||
        q.includes('graissage') || q.includes('préventif') || q.includes('périodique')) {
        intent = 'maintenance';
    } else if (q.includes('installer') || q.includes('installation') || q.includes('mise en service') ||
        q.includes('configurer') || q.includes('brancher') || q.includes('démarrage')) {
        intent = 'installation';
    } else if (q.includes('pièce') || q.includes('référence') || q.includes('code') ||
        q.includes('rechange') || q.includes('commander') || q.includes('article')) {
        intent = 'parts';
    } else if (q.includes('caractéristique') || q.includes('spec') || q.includes('dimension') ||
        q.includes('puissance') || q.includes('capacité') || q.includes('poids')) {
        intent = 'specs';
    } else if (q.includes('comment') || q.includes('kifach') || q.includes('procédure') ||
        q.includes('étapes') || q.includes('faire') || q.includes('méthode')) {
        intent = 'procedure';
    }

    // Detect components
    const componentPatterns = [
        'moteur', 'pompe', 'vanne', 'capteur', 'relais', 'contacteur', 'fusible',
        'courroie', 'roulement', 'joint', 'filtre', 'vérin', 'compresseur', 'variateur',
        'automate', 'plc', 'disjoncteur', 'transformateur', 'résistance', 'condensateur'
    ];
    const components_mentioned = componentPatterns.filter(c => q.includes(c));

    // Detect error codes (patterns like E01, F23, ERR-001)
    const errorCodeRegex = /\b[A-Z]{1,3}[-_]?\d{1,4}\b/gi;
    const error_codes = q.match(errorCodeRegex) || [];

    // Determine response format
    let response_format: QueryAnalysis['response_format'] = 'explanation';
    if (intent === 'troubleshooting') response_format = 'diagnostic';
    else if (intent === 'procedure' || intent === 'installation' || intent === 'maintenance') response_format = 'steps';
    else if (intent === 'parts') response_format = 'table';
    else if (intent === 'specs') response_format = 'list';

    return {
        intent,
        urgency: isEmergency ? 'emergency' : 'information',
        components_mentioned,
        error_codes,
        response_format,
        search_in_schematics: intent === 'troubleshooting' || components_mentioned.length > 0,
        search_in_dependencies: intent === 'troubleshooting',
        include_safety_warning: intent === 'troubleshooting' || intent === 'installation',
        include_parts_list: intent === 'parts' || intent === 'maintenance',
    };
}

function getDefaultAnalysis(): QueryAnalysis {
    return {
        intent: 'general',
        urgency: 'information',
        scope: 'equipment',
        equipment_mentioned: [],
        components_mentioned: [],
        error_codes: [],
        symptoms: [],
        search_document_types: ['manual'],
        search_in_schematics: false,
        search_in_dependencies: false,
        response_format: 'explanation',
        include_safety_warning: false,
        include_parts_list: false,
        confidence: 0.5,
        reasoning: 'Default analysis',
    };
}
