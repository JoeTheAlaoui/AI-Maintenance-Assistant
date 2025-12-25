// lib/rag/smart-search.ts
// Intelligent search that routes to the right sources based on query analysis

import { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings';
import { QueryAnalysis } from './query-analyzer';

export interface SearchResult {
    content: string;
    source_type: 'manual' | 'schematic' | 'dependency' | 'hierarchy';
    asset_name: string;
    page_number?: number;
    similarity: number;
    metadata?: Record<string, any>;
}

interface SmartSearchOptions {
    supabase: SupabaseClient;
    assetId: string;
    query: string;
    analysis: QueryAnalysis;
    maxResults?: number;
}

/**
 * Smart search that routes to different sources based on query analysis
 */
export async function smartSearch(options: SmartSearchOptions): Promise<SearchResult[]> {
    const { supabase, assetId, query, analysis, maxResults = 15 } = options;

    const results: SearchResult[] = [];

    // Generate enhanced query embedding
    const enhancedQuery = buildEnhancedQuery(query, analysis);
    console.log('🔍 Enhanced query:', enhancedQuery.slice(0, 100) + '...');

    const queryEmbedding = await generateEmbedding(enhancedQuery);

    // 1. Search in document chunks
    console.log('📄 Searching documents:', analysis.search_document_types);

    try {
        const { data: docChunks } = await supabase.rpc('match_document_chunks', {
            query_embedding: `[${queryEmbedding.join(',')}]`,
            match_asset_id: assetId,
            match_threshold: 0.25,
            match_count: 10,
        });

        if (docChunks) {
            for (const chunk of docChunks) {
                results.push({
                    content: chunk.content,
                    source_type: 'manual',
                    asset_name: '',
                    page_number: chunk.metadata?.page_number,
                    similarity: chunk.similarity,
                    metadata: chunk.metadata,
                });
            }
        }
    } catch (err) {
        console.log('📄 Document search error:', err);
    }

    // 2. Search in schematics if needed
    if (analysis.search_in_schematics) {
        console.log('📐 Searching schematics...');

        try {
            const { data: schematics } = await supabase
                .from('schematic_analysis')
                .select('*')
                .eq('asset_id', assetId);

            if (schematics && schematics.length > 0) {
                for (const schema of schematics) {
                    // Check if any mentioned components are in this schematic
                    const schemaComponents = schema.components?.map((c: any) => c.ref?.toLowerCase()) || [];
                    const queryComponents = [
                        ...analysis.components_mentioned,
                        ...analysis.error_codes,
                    ].map(c => c.toLowerCase());

                    const hasRelevantComponent = queryComponents.some(qc =>
                        schemaComponents.some((sc: string) => sc?.includes(qc) || qc.includes(sc))
                    );

                    if (hasRelevantComponent || analysis.intent === 'troubleshooting') {
                        const schematicContent = formatSchematicForContext(schema);
                        results.push({
                            content: schematicContent,
                            source_type: 'schematic',
                            asset_name: '',
                            page_number: schema.page_number,
                            similarity: hasRelevantComponent ? 0.9 : 0.7,
                            metadata: { schematic_type: schema.schematic_type },
                        });
                    }
                }
            }
        } catch (err) {
            console.log('📐 Schematic search skipped (table may not exist)');
        }
    }

    // 3. Add dependency context if troubleshooting
    if (analysis.search_in_dependencies) {
        console.log('🔗 Adding dependency context...');

        try {
            const { data: upstream } = await supabase.rpc('get_upstream_dependencies', {
                target_asset_id: assetId,
            });

            const { data: downstream } = await supabase.rpc('get_downstream_dependencies', {
                target_asset_id: assetId,
            });

            if ((upstream && upstream.length > 0) || (downstream && downstream.length > 0)) {
                const dependencyContent = formatDependenciesForContext(upstream || [], downstream || []);
                results.push({
                    content: dependencyContent,
                    source_type: 'dependency',
                    asset_name: '',
                    similarity: 0.85,
                });
            }

            // Also search in upstream equipment manuals for troubleshooting
            if (upstream && upstream.length > 0 && analysis.intent === 'troubleshooting') {
                for (const dep of upstream.slice(0, 2)) {
                    try {
                        const { data: upstreamChunks } = await supabase.rpc('match_document_chunks', {
                            query_embedding: `[${queryEmbedding.join(',')}]`,
                            match_asset_id: dep.id,
                            match_threshold: 0.4,
                            match_count: 3,
                        });

                        if (upstreamChunks) {
                            for (const chunk of upstreamChunks) {
                                results.push({
                                    content: chunk.content,
                                    source_type: 'manual',
                                    asset_name: dep.name,
                                    page_number: chunk.metadata?.page_number,
                                    similarity: chunk.similarity * 0.8,
                                    metadata: { ...chunk.metadata, from_dependency: true },
                                });
                            }
                        }
                    } catch (e) {
                        // Ignore errors for upstream search
                    }
                }
            }
        } catch (err) {
            console.log('🔗 Dependency search skipped (functions may not exist)');
        }
    }

    // 4. Add hierarchy context for site/line level
    if (['site', 'line', 'subsystem'].includes(analysis.scope)) {
        console.log('🏭 Adding hierarchy context...');

        try {
            const { data: children } = await supabase.rpc('get_asset_descendants', {
                root_id: assetId,
            });

            if (children && children.length > 0) {
                const hierarchyContent = formatHierarchyForContext(children);
                results.push({
                    content: hierarchyContent,
                    source_type: 'hierarchy',
                    asset_name: '',
                    similarity: 0.8,
                });
            }
        } catch (err) {
            console.log('🏭 Hierarchy search skipped');
        }
    }

    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, maxResults);
}

function buildEnhancedQuery(query: string, analysis: QueryAnalysis): string {
    let enhanced = query;

    // Add intent-specific keywords
    const intentKeywords: Record<string, string[]> = {
        troubleshooting: ['diagnostic', 'panne', 'erreur', 'solution', 'cause'],
        maintenance: ['entretien', 'maintenance', 'périodique', 'préventif', 'intervalle'],
        installation: ['installation', 'mise en service', 'configuration', 'branchement'],
        parts: ['pièce', 'référence', 'rechange', 'code article'],
        specs: ['caractéristique', 'spécification', 'technique', 'dimension'],
        procedure: ['procédure', 'étape', 'méthode', 'comment'],
    };

    const keywords = intentKeywords[analysis.intent] || [];
    if (keywords.length > 0) {
        enhanced += ' ' + keywords.slice(0, 2).join(' ');
    }

    // Add mentioned components
    if (analysis.components_mentioned.length > 0) {
        enhanced += ' ' + analysis.components_mentioned.join(' ');
    }

    // Add error codes
    if (analysis.error_codes.length > 0) {
        enhanced += ' ' + analysis.error_codes.join(' ');
    }

    return enhanced;
}

function formatSchematicForContext(schema: any): string {
    let content = `\n📐 SCHÉMA ${schema.schematic_type?.toUpperCase() || 'TECHNIQUE'} (Page ${schema.page_number})\n\n`;

    if (schema.raw_description) {
        content += `Description: ${schema.raw_description}\n\n`;
    }

    if (schema.components && schema.components.length > 0) {
        content += `Composants:\n`;
        for (const comp of schema.components) {
            content += `  • ${comp.ref}: ${comp.type}${comp.value ? ` (${comp.value})` : ''}\n`;
        }
        content += '\n';
    }

    if (schema.connections && schema.connections.length > 0) {
        content += `Connexions:\n`;
        for (const conn of schema.connections) {
            content += `  • ${conn.from} → ${conn.to}${conn.type ? ` [${conn.type}]` : ''}\n`;
        }
        content += '\n';
    }

    if (schema.diagnostic_sequence && schema.diagnostic_sequence.length > 0) {
        content += `Séquence de diagnostic: ${schema.diagnostic_sequence.join(' → ')}\n`;
    }

    return content;
}

function formatDependenciesForContext(upstream: any[], downstream: any[]): string {
    let content = '\n🔗 DÉPENDANCES SYSTÈME\n\n';

    if (upstream.length > 0) {
        content += `⬆️ AMONT (ce qui alimente cet équipement):\n`;
        for (const dep of upstream) {
            const icon = dep.criticality === 'critical' ? '🔴' : dep.criticality === 'high' ? '🟠' : '🟡';
            content += `  ${icon} ${dep.name} [${dep.dependency_type}]\n`;
        }
        content += '\n';
    }

    if (downstream.length > 0) {
        content += `⬇️ AVAL (ce qui dépend de cet équipement):\n`;
        for (const dep of downstream) {
            const icon = dep.criticality === 'critical' ? '🔴' : dep.criticality === 'high' ? '🟠' : '🟡';
            content += `  ${icon} ${dep.name} [${dep.dependency_type}]\n`;
        }
        content += '\n';
    }

    content += `💡 En cas de panne: vérifier d'abord les équipements amont, puis avertir sur l'impact aval.\n`;

    return content;
}

function formatHierarchyForContext(children: any[]): string {
    let content = '\n🏭 ÉQUIPEMENTS DANS CETTE ZONE\n\n';

    const byLevel: Record<string, any[]> = {};
    for (const child of children) {
        const level = child.level || 'equipment';
        if (!byLevel[level]) byLevel[level] = [];
        byLevel[level].push(child);
    }

    const levelLabels: Record<string, string> = {
        line: 'Lignes',
        subsystem: 'Sous-systèmes',
        equipment: 'Équipements',
        component: 'Composants',
    };

    for (const [level, items] of Object.entries(byLevel)) {
        content += `${levelLabels[level] || level}:\n`;
        for (const item of items) {
            content += `  • ${item.name}\n`;
        }
        content += '\n';
    }

    return content;
}
