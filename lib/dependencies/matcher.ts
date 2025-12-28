// lib/dependencies/matcher.ts
// Fuzzy equipment name matching for dependency suggestions

import { SupabaseClient } from '@supabase/supabase-js';

export interface EquipmentMatch {
    equipmentId: string;
    equipmentName: string;
    customName?: string;
    similarity: number;
    matchedBy: 'exact' | 'alias' | 'fuzzy';
}

/**
 * Calculate Levenshtein distance-based similarity between two strings
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Create distance matrix
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);

    return 1 - distance / maxLen;
}

/**
 * Find best equipment match for a name extracted from document
 */
export async function findEquipmentMatch(
    supabase: SupabaseClient,
    rawName: string,
    organizationId: string,
    threshold: number = 0.6
): Promise<EquipmentMatch | null> {
    console.log(`🔍 Matching equipment: "${rawName}"`);

    // Normalize the raw name for comparison
    const normalizedRaw = rawName.toLowerCase().trim();

    // 1. Try exact match on name
    const { data: exactMatch } = await supabase
        .from('assets')
        .select('id, name, custom_name')
        .eq('organization_id', organizationId)
        .ilike('name', rawName)
        .limit(1)
        .maybeSingle();

    if (exactMatch) {
        console.log(`   ✅ Exact match: ${exactMatch.name}`);
        return {
            equipmentId: exactMatch.id,
            equipmentName: exactMatch.name,
            customName: exactMatch.custom_name,
            similarity: 1.0,
            matchedBy: 'exact',
        };
    }

    // 2. Try exact match on alias (custom_name)
    const { data: aliasMatch } = await supabase
        .from('assets')
        .select('id, name, custom_name')
        .eq('organization_id', organizationId)
        .ilike('custom_name', rawName)
        .limit(1)
        .maybeSingle();

    if (aliasMatch) {
        console.log(`   ✅ Alias match: ${aliasMatch.name} (alias: ${aliasMatch.custom_name})`);
        return {
            equipmentId: aliasMatch.id,
            equipmentName: aliasMatch.name,
            customName: aliasMatch.custom_name,
            similarity: 1.0,
            matchedBy: 'alias',
        };
    }

    // 3. Fuzzy match on all equipment names and aliases
    const { data: allEquipment } = await supabase
        .from('assets')
        .select('id, name, custom_name')
        .eq('organization_id', organizationId);

    if (!allEquipment || allEquipment.length === 0) {
        console.log(`   ❌ No equipment found in organization`);
        return null;
    }

    let bestMatch: EquipmentMatch | null = null;
    let highestSimilarity = threshold;

    for (const equipment of allEquipment) {
        // Check against name
        const nameSimilarity = calculateSimilarity(rawName, equipment.name);
        if (nameSimilarity > highestSimilarity) {
            highestSimilarity = nameSimilarity;
            bestMatch = {
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                customName: equipment.custom_name,
                similarity: nameSimilarity,
                matchedBy: 'fuzzy',
            };
        }

        // Check against alias if exists
        if (equipment.custom_name) {
            const aliasSimilarity = calculateSimilarity(rawName, equipment.custom_name);
            if (aliasSimilarity > highestSimilarity) {
                highestSimilarity = aliasSimilarity;
                bestMatch = {
                    equipmentId: equipment.id,
                    equipmentName: equipment.name,
                    customName: equipment.custom_name,
                    similarity: aliasSimilarity,
                    matchedBy: 'fuzzy',
                };
            }
        }

        // Also check code if present in raw name
        if (equipment.name.match(/[A-Z]+-?\d+/) && rawName.match(/[A-Z]+-?\d+/)) {
            // Extract equipment codes (e.g., "F-200", "C100")
            const codeMatch = equipment.name.match(/[A-Z]+-?\d+/)?.[0] || '';
            const rawCodeMatch = rawName.match(/[A-Z]+-?\d+/)?.[0] || '';

            if (codeMatch && rawCodeMatch) {
                const codeSimilarity = calculateSimilarity(rawCodeMatch, codeMatch);
                if (codeSimilarity > highestSimilarity) {
                    highestSimilarity = codeSimilarity;
                    bestMatch = {
                        equipmentId: equipment.id,
                        equipmentName: equipment.name,
                        customName: equipment.custom_name,
                        similarity: codeSimilarity,
                        matchedBy: 'fuzzy',
                    };
                }
            }
        }
    }

    if (bestMatch) {
        console.log(`   ✅ Fuzzy match: ${bestMatch.equipmentName} (${(bestMatch.similarity * 100).toFixed(0)}% similar)`);
    } else {
        console.log(`   ❌ No match found above ${(threshold * 100).toFixed(0)}% threshold`);
    }

    return bestMatch;
}
