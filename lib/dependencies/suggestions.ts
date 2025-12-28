// lib/dependencies/suggestions.ts
// Suggestion management for auto-detected dependencies

import { SupabaseClient } from '@supabase/supabase-js';
import { extractDependencies } from '@/lib/ai/dependency-extractor';
import { findEquipmentMatch } from './matcher';

export interface DependencySuggestion {
    id: string;
    source_asset_id: string;
    target_asset_id: string | null;
    target_name_raw: string;
    relationship_type: string;
    confidence: number;
    context_snippet: string;
    document_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
    created_at: string;
}

/**
 * Generate dependency suggestions for a newly imported document
 */
export async function generateDependencySuggestions(
    supabase: SupabaseClient,
    documentId: string,
    sourceAssetId: string,
    sourceAssetName: string,
    documentText: string,
    organizationId: string
): Promise<number> {
    console.log('\n🔗 ========= GENERATING DEPENDENCY SUGGESTIONS =========');
    console.log(`📄 Document: ${documentId.slice(0, 8)}...`);
    console.log(`🎯 Source equipment: ${sourceAssetName}`);

    try {
        // 1. Extract relationships using AI
        const extraction = await extractDependencies(documentText, sourceAssetName);

        if (extraction.relationships.length === 0) {
            console.log('ℹ️  No relationships found in document');
            return 0;
        }

        let suggestionsCreated = 0;

        // 2. Match each extracted equipment to database
        for (const rel of extraction.relationships) {
            console.log(`\n🔍 Processing: ${rel.targetEquipment} (${rel.relationshipType})`);

            const match = await findEquipmentMatch(
                supabase,
                rel.targetEquipment,
                organizationId,
                0.6 // 60% similarity threshold
            );

            // 3. Create suggestion
            const { error } = await supabase
                .from('dependency_suggestions')
                .insert({
                    source_asset_id: sourceAssetId,
                    target_asset_id: match?.equipmentId || null,
                    target_name_raw: rel.targetEquipment,
                    relationship_type: rel.relationshipType,
                    confidence: rel.confidence,
                    context_snippet: rel.contextSnippet,
                    document_id: documentId,
                    status: 'pending',
                });

            if (error) {
                console.error('   ❌ Error creating suggestion:', error.message);
            } else {
                suggestionsCreated++;
                console.log(`   ✅ Suggestion created ${match ? '(matched)' : '(unmatched)'}`);
            }
        }

        console.log(`\n✅ Created ${suggestionsCreated} dependency suggestions`);
        console.log('=========================================================\n');

        return suggestionsCreated;

    } catch (error) {
        console.error('❌ Error generating suggestions:', error);
        return 0;
    }
}

/**
 * Get pending suggestions for an asset
 */
export async function getPendingSuggestions(
    supabase: SupabaseClient,
    assetId: string
): Promise<DependencySuggestion[]> {
    const { data, error } = await supabase
        .from('dependency_suggestions')
        .select(`
            *,
            target:assets!target_asset_id(id, name, custom_name)
        `)
        .eq('source_asset_id', assetId)
        .eq('status', 'pending')
        .order('confidence', { ascending: false });

    if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }

    return data || [];
}

/**
 * Count pending suggestions for an asset
 */
export async function countPendingSuggestions(
    supabase: SupabaseClient,
    assetId: string
): Promise<number> {
    const { count, error } = await supabase
        .from('dependency_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('source_asset_id', assetId)
        .eq('status', 'pending');

    if (error) {
        console.error('Error counting suggestions:', error);
        return 0;
    }

    return count || 0;
}
