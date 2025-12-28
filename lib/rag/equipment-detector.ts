// lib/rag/equipment-detector.ts
// Smart Equipment Detection - Detect equipment from user query text
// Phase 10: Question-first AI Assistant flow

import { SupabaseClient } from '@supabase/supabase-js';
import { normalizeText } from '@/lib/utils/normalize-text';

export interface DetectedEquipment {
    equipmentId: string;
    equipmentName: string;
    customName?: string;
    code?: string;
    mentionedAs: string; // How it was mentioned in query
    confidence: number; // 0.0 - 1.0
    matchType: 'exact_name' | 'exact_alias' | 'exact_code' | 'fuzzy';
}

export interface DetectionResult {
    detected: DetectedEquipment[];
    mode: 'single' | 'multi' | 'none';
    query: string;
}

/**
 * Detect which equipment(s) the user is asking about from their query
 * Supports: exact name match, alias match, code match, fuzzy matching
 */
export async function detectEquipmentFromQuery(
    supabase: SupabaseClient,
    query: string,
    organizationId?: string
): Promise<DetectionResult> {
    console.log('\n🔍 ========= EQUIPMENT DETECTION =========');
    console.log(`📝 Query: "${query.substring(0, 80)}${query.length > 80 ? '...' : ''}"`);

    const detected: DetectedEquipment[] = [];
    const normalizedQuery = normalizeText(query.toLowerCase());

    // 1. Get all equipment (optionally filter by org)
    let equipmentQuery = supabase
        .from('assets')
        .select('id, name, code, custom_name, organization_id');

    if (organizationId) {
        equipmentQuery = equipmentQuery.eq('organization_id', organizationId);
    }

    const { data: allEquipment, error } = await equipmentQuery;

    if (error || !allEquipment || allEquipment.length === 0) {
        console.log('❌ No equipment found');
        return { detected: [], mode: 'none', query };
    }

    console.log(`📊 Scanning ${allEquipment.length} equipment...`);

    // 2. Check each equipment against query
    for (const equipment of allEquipment) {
        const normalizedName = normalizeText(equipment.name.toLowerCase());
        const normalizedCode = equipment.code ? normalizeText(equipment.code.toLowerCase()) : '';
        const normalizedAlias = equipment.custom_name
            ? normalizeText(equipment.custom_name.toLowerCase())
            : '';

        // Check exact name match
        if (normalizedQuery.includes(normalizedName) && normalizedName.length > 3) {
            detected.push({
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                customName: equipment.custom_name,
                code: equipment.code,
                mentionedAs: equipment.name,
                confidence: 1.0,
                matchType: 'exact_name',
            });
            console.log(`   ✅ Exact name: "${equipment.name}"`);
            continue;
        }

        // Check code match (e.g., "A-100", "MF-1500")
        if (normalizedCode && normalizedCode.length >= 3 && normalizedQuery.includes(normalizedCode)) {
            detected.push({
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                customName: equipment.custom_name,
                code: equipment.code,
                mentionedAs: equipment.code!,
                confidence: 1.0,
                matchType: 'exact_code',
            });
            console.log(`   ✅ Code match: "${equipment.code}" → ${equipment.name}`);
            continue;
        }

        // Check alias/custom name match
        if (normalizedAlias && normalizedAlias.length >= 3 && normalizedQuery.includes(normalizedAlias)) {
            detected.push({
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                customName: equipment.custom_name,
                code: equipment.code,
                mentionedAs: equipment.custom_name!,
                confidence: 1.0,
                matchType: 'exact_alias',
            });
            console.log(`   ✅ Alias match: "${equipment.custom_name}" → ${equipment.name}`);
            continue;
        }

        // Fuzzy match on name and alias
        const nameSimilarity = calculateWordSimilarity(normalizedQuery, normalizedName);
        const aliasSimilarity = normalizedAlias
            ? calculateWordSimilarity(normalizedQuery, normalizedAlias)
            : 0;
        const bestSimilarity = Math.max(nameSimilarity, aliasSimilarity);

        if (bestSimilarity >= 0.7) { // 70% threshold for fuzzy
            detected.push({
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                customName: equipment.custom_name,
                code: equipment.code,
                mentionedAs: aliasSimilarity > nameSimilarity
                    ? (equipment.custom_name || equipment.name)
                    : equipment.name,
                confidence: bestSimilarity,
                matchType: 'fuzzy',
            });
            console.log(`   ✅ Fuzzy: "${equipment.name}" (${(bestSimilarity * 100).toFixed(0)}%)`);
        }
    }

    // 3. Also check asset_aliases table
    const { data: aliases } = await supabase
        .from('asset_aliases')
        .select(`
            alias,
            alias_normalized,
            asset_id,
            assets (id, name, code, custom_name)
        `);

    if (aliases) {
        for (const aliasRecord of aliases) {
            const asset = aliasRecord.assets as any;
            if (!asset) continue;

            // Skip if already detected
            if (detected.some(d => d.equipmentId === asset.id)) continue;

            const normalizedAlias = normalizeText(aliasRecord.alias.toLowerCase());

            if (normalizedQuery.includes(normalizedAlias) && normalizedAlias.length >= 3) {
                detected.push({
                    equipmentId: asset.id,
                    equipmentName: asset.name,
                    customName: asset.custom_name,
                    code: asset.code,
                    mentionedAs: aliasRecord.alias,
                    confidence: 1.0,
                    matchType: 'exact_alias',
                });
                console.log(`   ✅ Alias table: "${aliasRecord.alias}" → ${asset.name}`);
            }
        }
    }

    // 4. Sort by confidence (highest first) and deduplicate
    const unique = deduplicateDetections(detected);
    unique.sort((a, b) => b.confidence - a.confidence);

    // Determine mode
    const mode: 'single' | 'multi' | 'none' =
        unique.length === 0 ? 'none' :
            unique.length === 1 ? 'single' : 'multi';

    console.log(`\n📊 Detection Result:`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Found: ${unique.length} equipment`);
    unique.forEach((eq, idx) => {
        console.log(`   ${idx + 1}. ${eq.equipmentName} (as "${eq.mentionedAs}", ${(eq.confidence * 100).toFixed(0)}%)`);
    });
    console.log('==========================================\n');

    return { detected: unique, mode, query };
}

/**
 * Calculate word-based similarity between query and target
 * Checks if significant words from target appear in query
 */
function calculateWordSimilarity(query: string, target: string): number {
    if (!query || !target) return 0;

    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const targetWords = target.split(/\s+/).filter(w => w.length > 2);

    if (targetWords.length === 0) return 0;

    let matches = 0;
    for (const targetWord of targetWords) {
        if (queryWords.some(qw => qw.includes(targetWord) || targetWord.includes(qw))) {
            matches++;
        }
    }

    return matches / targetWords.length;
}

/**
 * Remove duplicate detections (same equipment ID)
 */
function deduplicateDetections(detections: DetectedEquipment[]): DetectedEquipment[] {
    const seen = new Map<string, DetectedEquipment>();

    for (const detection of detections) {
        const existing = seen.get(detection.equipmentId);
        if (!existing || detection.confidence > existing.confidence) {
            seen.set(detection.equipmentId, detection);
        }
    }

    return Array.from(seen.values());
}

/**
 * Format detected equipment for logging/display
 */
export function formatDetectedEquipment(detected: DetectedEquipment[]): string {
    if (detected.length === 0) {
        return 'No equipment detected';
    }

    return detected
        .map((eq, idx) => `${idx + 1}. ${eq.equipmentName}${eq.customName ? ` ("${eq.customName}")` : ''} [${(eq.confidence * 100).toFixed(0)}%]`)
        .join('\n');
}
