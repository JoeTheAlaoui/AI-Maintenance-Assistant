// lib/rag/metadata-extractor.ts

import OpenAI from 'openai';
import { AssetMetadata } from '@/types/rag';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Extract basic asset metadata using a single, cheap LLM call
 * Uses GPT-4o-mini for cost efficiency
 */
export async function extractAssetMetadata(
    textSample: string // First ~5000 chars of document
): Promise<AssetMetadata> {

    const prompt = `You are a technical document analyzer. Extract the following information from this equipment manual excerpt.

IMPORTANT: Return ONLY a valid JSON object, no markdown, no explanation.

Extract:
- name: Equipment/Asset name (e.g., "FIAC V30 Compressor")
- manufacturer: Company that made it (e.g., "FIAC", "Atlas Copco")
- model: Model number/name (e.g., "V30", "GA30+")
- serial_number: If mentioned (usually null in manuals)
- category: Equipment category (e.g., "Compressor", "Pump", "Motor", "Generator")
- description: One-line description in French

If information is not found, use null.

Document excerpt:
"""
${textSample.slice(0, 5000)}
"""

JSON Response:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Cheap & fast
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content || '{}';

        // Clean response (remove markdown if present)
        const jsonStr = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(jsonStr);

        return {
            name: parsed.name || 'Unknown Equipment',
            manufacturer: parsed.manufacturer || null,
            model: parsed.model || null,
            serial_number: parsed.serial_number || null,
            category: parsed.category || 'Equipment',
            description: parsed.description || null,
        };
    } catch (error) {
        console.error('Metadata extraction error:', error);
        return {
            name: 'Unknown Equipment',
            manufacturer: null,
            model: null,
            serial_number: null,
            category: 'Equipment',
            description: null,
        };
    }
}
