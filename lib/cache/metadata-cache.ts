// lib/cache/metadata-cache.ts
// Cache for AI-extracted metadata to avoid redundant API calls

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface CachedMetadata {
    name?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    category?: string;
    description?: string;
    confidence: number;
    extraction_method: 'regex' | 'ai' | 'hybrid';
    cached_at: string;
}

/**
 * Generate hash of first 5000 chars (where metadata usually is)
 */
export function generateDocumentHash(text: string): string {
    const sample = text.substring(0, 5000);
    return crypto.createHash('sha256').update(sample).digest('hex');
}

/**
 * Get cached metadata if available
 */
export async function getCachedMetadata(
    supabase: SupabaseClient,
    docHash: string
): Promise<CachedMetadata | null> {
    console.log('💾 Checking metadata cache...');

    const { data, error } = await supabase
        .from('metadata_cache')
        .select('*')
        .eq('document_hash', docHash)
        .single();

    if (error || !data) {
        console.log('💾 Cache MISS');
        return null;
    }

    // Check if cache is still fresh (30 days)
    const cacheAge = Date.now() - new Date(data.cached_at).getTime();
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (cacheAge > MAX_AGE) {
        console.log('💾 Cache expired (>30 days)');
        return null;
    }

    console.log('💾 Cache HIT ✅');
    console.log(`   Name: ${data.name || 'N/A'}`);
    console.log(`   Manufacturer: ${data.manufacturer || 'N/A'}`);
    console.log(`   Model: ${data.model || 'N/A'}`);
    console.log(`   Method: ${data.extraction_method}`);
    console.log(`   Cached: ${new Date(data.cached_at).toLocaleDateString()}`);

    return data;
}

/**
 * Save metadata to cache
 */
export async function setCachedMetadata(
    supabase: SupabaseClient,
    docHash: string,
    metadata: Partial<CachedMetadata>
): Promise<void> {
    await supabase
        .from('metadata_cache')
        .upsert({
            document_hash: docHash,
            name: metadata.name,
            manufacturer: metadata.manufacturer,
            model: metadata.model,
            serial_number: metadata.serial_number,
            category: metadata.category,
            description: metadata.description,
            confidence: metadata.confidence || 0.85,
            extraction_method: metadata.extraction_method || 'ai',
            cached_at: new Date().toISOString(),
        });

    console.log('💾 Metadata cached for future imports');
}

/**
 * Clear expired cache entries (call periodically)
 */
export async function clearExpiredCache(supabase: SupabaseClient): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('metadata_cache')
        .delete()
        .lt('cached_at', thirtyDaysAgo)
        .select('document_hash');

    const count = data?.length || 0;
    if (count > 0) {
        console.log(`🗑️ Cleared ${count} expired cache entries`);
    }

    return count;
}
