import { createClient } from '@/lib/supabase/client';
import { normalizeText } from '@/lib/utils/normalize-text';

export interface ResolvedEquipment {
    id: string;
    name: string;
    alias: string;
    matchedText: string;
    confidence: number;
}

/**
 * Resolve equipment aliases in user query
 * Finds equipment mentions by alias/nickname and returns resolved equipment info
 * 
 * Example:
 * Input: "شنوا صيانة ديال الكمبريصور الكبير؟"
 * Output: [{ id: "uuid", name: "Atlas Copco GA 55", alias: "الكمبريصور الكبير", ... }]
 */
export async function resolveEquipmentAliases(
    query: string
): Promise<ResolvedEquipment[]> {
    const supabase = createClient();

    // Fetch all aliases
    const { data: aliases, error } = await supabase
        .from('asset_aliases')
        .select(`
            id,
            alias,
            alias_normalized,
            asset_id,
            assets (
                id,
                name,
                code,
                model_number
            )
        `);

    if (error || !aliases) {
        console.error('Error fetching aliases:', error);
        return [];
    }

    const resolved: ResolvedEquipment[] = [];
    const normalizedQuery = normalizeText(query);

    for (const aliasRecord of aliases) {
        const asset = aliasRecord.assets;
        if (!asset) continue;

        // Check exact match (normalized)
        if (normalizedQuery.includes(aliasRecord.alias_normalized)) {
            resolved.push({
                id: asset.id,
                name: asset.name,
                alias: aliasRecord.alias,
                matchedText: aliasRecord.alias,
                confidence: 1.0 // Exact match
            });
            continue;
        }

        // Check fuzzy match (trigram similarity)
        const similarity = calculateSimilarity(
            normalizedQuery,
            aliasRecord.alias_normalized
        );

        if (similarity > 0.6) { // 60% similarity threshold
            resolved.push({
                id: asset.id,
                name: asset.name,
                alias: aliasRecord.alias,
                matchedText: aliasRecord.alias,
                confidence: similarity
            });
        }
    }

    // Remove duplicates (same equipment matched multiple times)
    const uniqueResolved = Array.from(
        new Map(resolved.map(item => [item.id, item])).values()
    );

    // Sort by confidence
    return uniqueResolved.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate similarity between two strings (simple implementation)
 * Uses character bigram overlap
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;

    // Create bigrams
    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);

    if (bigrams1.size === 0 || bigrams2.size === 0) return 0.0;

    // Calculate overlap
    let overlap = 0;
    for (const bigram of bigrams1) {
        if (bigrams2.has(bigram)) overlap++;
    }

    // Jaccard similarity
    const union = bigrams1.size + bigrams2.size - overlap;
    return overlap / union;
}

/**
 * Generate character bigrams from string
 */
function getBigrams(str: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
}

/**
 * Replace aliases in query with equipment names
 * Returns modified query and list of resolved equipment
 */
export async function preprocessRAGQuery(query: string): Promise<{
    modifiedQuery: string;
    resolvedEquipment: ResolvedEquipment[];
    originalQuery: string;
}> {
    const resolvedEquipment = await resolveEquipmentAliases(query);

    if (resolvedEquipment.length === 0) {
        return {
            modifiedQuery: query,
            resolvedEquipment: [],
            originalQuery: query
        };
    }

    let modifiedQuery = query;

    // Replace aliases with equipment names
    for (const equipment of resolvedEquipment) {
        // Replace the alias with official name
        const regex = new RegExp(equipment.alias, 'gi');
        modifiedQuery = modifiedQuery.replace(regex, equipment.name);
    }

    console.log('🔍 Alias Resolution:');
    console.log('  Original:', query);
    console.log('  Modified:', modifiedQuery);
    console.log('  Resolved:', resolvedEquipment.map(e => `${e.alias} → ${e.name}`));

    return {
        modifiedQuery,
        resolvedEquipment,
        originalQuery: query
    };
}

/**
 * Build context string for resolved equipment
 * Adds equipment details to RAG context
 */
export function buildEquipmentContext(equipment: ResolvedEquipment[]): string {
    if (equipment.length === 0) return '';

    const contexts = equipment.map(eq =>
        `Equipment: ${eq.name} (also known as "${eq.alias}")`
    );

    return `\n\nReferenced Equipment:\n${contexts.join('\n')}`;
}
