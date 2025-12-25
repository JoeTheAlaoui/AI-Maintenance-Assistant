// lib/rag/embeddings.ts

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Generate embeddings using OpenAI's text-embedding-3-small
 * Cost: ~$0.00002 per 1K tokens (very cheap!)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // Cheapest & fastest
        input: text.replace(/\n/g, ' ').trim(),
    });

    return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts.map(t => t.replace(/\n/g, ' ').trim()),
    });

    return response.data.map(d => d.embedding);
}
