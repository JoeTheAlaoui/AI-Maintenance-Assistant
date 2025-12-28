// lib/dependencies/cache.ts
// Simple in-memory cache for dependency traversal results
// Expires after 5 minutes to prevent stale data

interface CacheEntry {
    data: any;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if valid
 */
export function getCached<T>(key: string): T | null {
    const entry = cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }

    console.log(`💾 Cache hit: ${key.slice(0, 40)}...`);
    return entry.data as T;
}

/**
 * Set cached data
 */
export function setCached<T>(key: string, data: T): void {
    cache.set(key, {
        data,
        timestamp: Date.now(),
    });
    console.log(`💾 Cache set: ${key.slice(0, 40)}...`);
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
    cache.clear();
    console.log('💾 Cache cleared');
}

/**
 * Generate cache key for dependency chain
 */
export function getCacheKey(equipmentId: string, maxDepth: number): string {
    return `dep_chain_${equipmentId}_d${maxDepth}`;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
    return {
        size: cache.size,
        keys: Array.from(cache.keys()),
    };
}
