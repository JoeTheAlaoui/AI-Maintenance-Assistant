// lib/rag/document-classifier.ts
// AI-powered document type classification

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type DocumentType = 'manual' | 'installation' | 'catalogue' | 'schematic' | 'datasheet' | 'other';

export interface ClassificationResult {
    type: DocumentType;
    confidence: number;
    reasoning: string;
}

/**
 * Classify an industrial document based on its text content
 * Uses GPT-4o-mini for cost-effective classification
 */
export async function classifyDocument(textSample: string): Promise<ClassificationResult> {
    const prompt = `Analyze this industrial document excerpt and classify its type.

Document types:
- manual: User/maintenance manual (operations, maintenance procedures, troubleshooting)
- installation: Installation guide (setup, commissioning, first-time configuration)
- catalogue: Parts catalog (spare parts list, reference codes, ordering info)
- schematic: Technical drawings (electrical, pneumatic, hydraulic diagrams)
- datasheet: Technical specifications (specs, characteristics, performance data)
- other: Other document type

Document excerpt:
"""
${textSample.slice(0, 3000)}
"""

Respond ONLY with JSON:
{
  "type": "manual|installation|catalogue|schematic|datasheet|other",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 200,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();

        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Document classification error:', error);
        return { type: 'manual', confidence: 0.5, reasoning: 'Default classification (error occurred)' };
    }
}

/**
 * Detect section types within a document chunk
 */
export type SectionType = 'maintenance' | 'installation' | 'troubleshooting' | 'specs' | 'parts_list' | 'safety' | 'general';

export async function detectSectionType(chunkContent: string): Promise<SectionType> {
    // Simple keyword-based detection for speed (no API call)
    const content = chunkContent.toLowerCase();

    if (content.includes('sécurité') || content.includes('danger') || content.includes('avertissement') || content.includes('epi')) {
        return 'safety';
    }
    if (content.includes('maintenance') || content.includes('entretien') || content.includes('lubrification') || content.includes('graissage')) {
        return 'maintenance';
    }
    if (content.includes('installation') || content.includes('montage') || content.includes('mise en service')) {
        return 'installation';
    }
    if (content.includes('panne') || content.includes('dépannage') || content.includes('diagnostic') || content.includes('erreur') || content.includes('défaut')) {
        return 'troubleshooting';
    }
    if (content.includes('caractéristiques') || content.includes('spécifications') || content.includes('dimensions') || content.includes('poids')) {
        return 'specs';
    }
    if (content.includes('pièce') || content.includes('référence') || content.includes('rechange') || content.includes('code article')) {
        return 'parts_list';
    }

    return 'general';
}
