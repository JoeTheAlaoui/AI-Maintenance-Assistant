// lib/ai/dependency-extractor.ts
// AI-powered extraction of equipment dependencies from manual text

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedRelationship {
    targetEquipment: string; // Name as it appears in document
    relationshipType: 'upstream' | 'downstream' | 'alternative' | 'related' | 'parallel';
    confidence: number; // 0.0 - 1.0
    contextSnippet: string; // Sentence containing the relationship
}

export interface DependencyExtraction {
    sourceEquipment: string;
    relationships: ExtractedRelationship[];
}

/**
 * Extract equipment dependencies from document text using AI
 */
export async function extractDependencies(
    documentText: string,
    sourceEquipmentName: string
): Promise<DependencyExtraction> {
    // Use first 6000 chars (enough context, saves tokens)
    const textSample = documentText.substring(0, 6000);

    const prompt = `You are analyzing an industrial equipment manual to extract process dependencies and relationships.

Source Equipment: ${sourceEquipmentName}

Document Text:
${textSample}

Task: Extract ALL equipment mentioned that have a relationship with "${sourceEquipmentName}".

Relationship Types:
1. **upstream**: Equipment that SUPPLIES/FEEDS INTO the source
   Keywords: "receives from", "supplied by", "fed by", "input from", "يستقبل من", "reçoit de"
   
2. **downstream**: Equipment that RECEIVES FROM the source  
   Keywords: "delivers to", "supplies", "feeds into", "output to", "يغذي", "alimente"
   
3. **alternative**: Backup/redundant equipment
   Keywords: "backup", "standby", "alternative", "احتياطي", "secours"
   
4. **related**: Connected but unclear direction
   Keywords: "connected to", "works with", "متصل ب", "connecté à"
   
5. **parallel**: Runs simultaneously
   Keywords: "parallel to", "alongside", "بالتوازي مع", "en parallèle"

For each relationship:
- Extract EXACT equipment name/code as written
- Determine relationship type from context
- Rate confidence (0.5-1.0)
- Include the phrase showing the relationship

Respond with JSON only:
{
  "sourceEquipment": "${sourceEquipmentName}",
  "relationships": [
    {
      "targetEquipment": "Filter F-200",
      "relationshipType": "upstream",
      "confidence": 0.95,
      "contextSnippet": "receives filtered air from Filter F-200"
    }
  ]
}

Rules:
- If no relationships found, return empty array
- Equipment names must be EXACT (include model numbers, codes)
- Don't include the source equipment itself
- Don't include generic terms without specific identifiers
- Minimum confidence: 0.5

JSON only, no markdown.`;

    try {
        console.log('🤖 Extracting dependencies with AI...');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.2, // Low temperature for consistent extraction
        });

        const content = response.choices[0]?.message?.content || '{}';

        // Parse AI response
        const cleaned = content.trim().replace(/```json|```/g, '');
        const result: DependencyExtraction = JSON.parse(cleaned);

        // Validate and filter
        result.relationships = (result.relationships || []).filter(rel => {
            // Must have target equipment
            if (!rel.targetEquipment || rel.targetEquipment.trim().length === 0) {
                return false;
            }

            // Confidence must be reasonable
            if (rel.confidence < 0.5 || rel.confidence > 1.0) {
                return false;
            }

            // Valid relationship type
            const validTypes = ['upstream', 'downstream', 'alternative', 'related', 'parallel'];
            if (!validTypes.includes(rel.relationshipType)) {
                return false;
            }

            return true;
        });

        console.log(`✅ Extracted ${result.relationships.length} potential dependencies`);
        result.relationships.forEach((rel, idx) => {
            console.log(`   ${idx + 1}. ${rel.targetEquipment} (${rel.relationshipType}, ${(rel.confidence * 100).toFixed(0)}%)`);
        });

        return result;

    } catch (error) {
        console.error('❌ Dependency extraction error:', error);
        return {
            sourceEquipment: sourceEquipmentName,
            relationships: [],
        };
    }
}
