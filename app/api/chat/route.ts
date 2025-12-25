// app/api/chat/route.ts
// Smart RAG Chat API with Query Analysis and Intelligent Search

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { analyzeQuery, quickAnalyzeQuery, QueryAnalysis } from '@/lib/rag/query-analyzer';
import { smartSearch } from '@/lib/rag/smart-search';
import { buildSmartSystemPrompt } from '@/lib/rag/response-formatter';
import { getAssetHierarchyContext, formatHierarchyForPrompt } from '@/lib/rag/hierarchy-context';
import { preprocessRAGQuery, buildEquipmentContext } from '@/lib/rag/alias-resolution'; // 🆕 Alias resolution
import { getDependencyContext, buildProcessContextPrompt } from '@/lib/rag/dependency-context';  //  🆕 Dependency context
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        // 1. Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Parse request
        const { message, asset_id, conversation_history = [] } = await request.json();

        if (!message || !asset_id) {
            return new Response(JSON.stringify({ error: 'Message and asset_id required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Get asset info
        const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select('name, manufacturer, model_number, category, level, parent_id')
            .eq('id', asset_id)
            .single();

        if (assetError || !asset) {
            return new Response(JSON.stringify({ error: 'Asset not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Get asset aliases and children (for context)
        const { data: aliases } = await supabase
            .from('asset_aliases')
            .select('alias')
            .eq('asset_id', asset_id);

        const { data: children } = await supabase
            .from('assets')
            .select('name')
            .eq('parent_id', asset_id);

        // 5. 🆕 ALIAS RESOLUTION (Resolve nicknames/jargon to official names)
        console.log('\n🏷️ ========= ALIAS RESOLUTION =========');
        const { modifiedQuery, resolvedEquipment, originalQuery } = await preprocessRAGQuery(message);

        if (resolvedEquipment.length > 0) {
            console.log('✅ Resolved equipment:');
            resolvedEquipment.forEach(eq => {
                console.log(`   "${eq.alias}" → ${eq.name} (confidence: ${(eq.confidence * 100).toFixed(0)}%)`);
            });
        } else {
            console.log('   No aliases detected');
        }

        // Use modified query for analysis
        const queryToAnalyze = modifiedQuery;

        // 6. SMART QUERY ANALYSIS
        console.log('\n🧠 ========= SMART QUERY ANALYSIS =========');
        console.log('📝 Original Query:', originalQuery);
        if (modifiedQuery !== originalQuery) {
            console.log('📝 Modified Query:', modifiedQuery);
        }

        // Quick local analysis first (fast, no API call)
        const quickAnalysis = quickAnalyzeQuery(queryToAnalyze);  // 🆕 Use modified query
        console.log('⚡ Quick analysis:', {
            intent: quickAnalysis.intent,
            urgency: quickAnalysis.urgency,
            components: quickAnalysis.components_mentioned,
            error_codes: quickAnalysis.error_codes,
        });

        // Full AI analysis for complex/emergency queries
        let analysis: QueryAnalysis;
        const needsFullAnalysis =
            quickAnalysis.intent === 'troubleshooting' ||
            quickAnalysis.urgency === 'emergency' ||
            message.length > 100;

        if (needsFullAnalysis) {
            console.log('🤖 Running full AI analysis...');
            try {
                analysis = await analyzeQuery(queryToAnalyze, {  // 🆕 Use modified query
                    name: asset.name,
                    level: asset.level || 'equipment',
                    category: asset.category || undefined,
                    children: children?.map(c => c.name),
                    aliases: aliases?.map(a => a.alias),
                });
            } catch (e) {
                // Fallback to quick analysis if AI fails
                analysis = buildAnalysisFromQuick(quickAnalysis, asset.level);
            }
        } else {
            // Use quick analysis for simple queries
            analysis = buildAnalysisFromQuick(quickAnalysis, asset.level);
        }

        console.log('📊 Final analysis:', {
            intent: analysis.intent,
            urgency: analysis.urgency,
            scope: analysis.scope,
            response_format: analysis.response_format,
            search_in_schematics: analysis.search_in_schematics,
            search_in_dependencies: analysis.search_in_dependencies,
        });

        console.log('\n🔍 ========= SMART SEARCH =========');
        const searchResults = await smartSearch({
            supabase,
            assetId: asset_id,
            query: queryToAnalyze,  // 🆕 Use modified query for search
            analysis,
            maxResults: 15,
        });

        console.log(`📚 Found ${searchResults.length} results:`);
        const sourceTypes = searchResults.map(r => r.source_type);
        console.log('  - Manual chunks:', sourceTypes.filter(t => t === 'manual').length);
        console.log('  - Schematic:', sourceTypes.filter(t => t === 'schematic').length);
        console.log('  - Dependency:', sourceTypes.filter(t => t === 'dependency').length);
        console.log('  - Hierarchy:', sourceTypes.filter(t => t === 'hierarchy').length);

        // 7. Build context from search results
        const context = searchResults
            .map((r, i) => {
                let header = `[Source ${i + 1}`;
                if (r.source_type === 'schematic') header += ' - SCHÉMA';
                if (r.source_type === 'dependency') header += ' - DÉPENDANCES';
                if (r.source_type === 'hierarchy') header += ' - HIÉRARCHIE';
                if (r.asset_name) header += ` - ${r.asset_name}`;
                if (r.page_number) header += ` - Page ${r.page_number}`;
                header += ` - ${Math.round(r.similarity * 100)}%]\n`;
                return header + r.content;
            })
            .join('\n\n---\n\n');

        // 8. Get hierarchy context for equipment
        let hierarchyText = '';
        if (!['site', 'line', 'subsystem'].includes(asset.level || '')) {
            try {
                const hierarchyContext = await getAssetHierarchyContext(supabase, asset_id);
                hierarchyText = formatHierarchyForPrompt(hierarchyContext, asset.name);
                console.log(`🔗 Hierarchy context: ${hierarchyContext.path.length} path, ${hierarchyContext.upstream.length} up, ${hierarchyContext.downstream.length} down`);
            } catch (e) {
                console.log('🔗 No hierarchy context');
            }
        }

        // 🆕 8. Get dependency context for process-aware answers
        console.log('\n🔗 ========= DEPENDENCY CONTEXT =========');
        const dependencyContext = await getDependencyContext(
            supabase,
            asset_id,
            analysis
        );

        // 9. Build smart system prompt
        console.log('\n📝 ========= BUILDING PROMPT =========');

        // 🆕 Add equipment context from alias resolution
        const equipmentContext = buildEquipmentContext(resolvedEquipment);

        // 🆕 Add dependency/process context
        const processContext = buildProcessContextPrompt(dependencyContext, asset.name);

        const systemPrompt = buildSmartSystemPrompt({
            assetName: asset.name,
            assetInfo: {
                manufacturer: asset.manufacturer,
                model: asset.model_number,
                category: asset.category,
            },
            analysis,
            context,
            hierarchyContext: hierarchyText,
        }) + equipmentContext + processContext;  // 🆕 Append contexts

        console.log('📝 Prompt length:', systemPrompt.length, 'chars');

        // 10. Build messages array
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...conversation_history.slice(-10),
            { role: 'user', content: message },
        ];

        // 11. Stream response from GPT-4o
        console.log('\n🤖 ========= GENERATING RESPONSE =========');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            temperature: analysis.urgency === 'emergency' ? 0.3 : 0.7,
            max_tokens: 2000,
            stream: true,
        });

        // 12. Create streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of response) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }

                    // Send analysis metadata at the end
                    const avgSimilarity = searchResults.length > 0
                        ? searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length
                        : 0;

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        done: true,
                        analysis: {
                            intent: analysis.intent,
                            urgency: analysis.urgency,
                            response_format: analysis.response_format,
                        },
                        search: {
                            sources_used: searchResults.length,
                            source_types: [...new Set(searchResults.map(r => r.source_type))],
                            avg_relevance: Math.round(avgSimilarity * 100),
                            context_quality: avgSimilarity > 0.6 ? 'high' : avgSimilarity > 0.4 ? 'medium' : 'low',
                        },
                    })}\n\n`));

                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Chat error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Build full QueryAnalysis from quick analysis results
 */
function buildAnalysisFromQuick(
    quick: Partial<QueryAnalysis>,
    assetLevel: string | null
): QueryAnalysis {
    return {
        intent: quick.intent || 'general',
        urgency: quick.urgency || 'information',
        scope: (assetLevel as QueryAnalysis['scope']) || 'equipment',
        equipment_mentioned: [],
        components_mentioned: quick.components_mentioned || [],
        error_codes: quick.error_codes || [],
        symptoms: [],
        search_document_types: ['manual'],
        search_in_schematics: quick.search_in_schematics || false,
        search_in_dependencies: quick.search_in_dependencies || false,
        response_format: quick.response_format || 'explanation',
        include_safety_warning: quick.include_safety_warning || false,
        include_parts_list: quick.include_parts_list || false,
        confidence: 0.7,
        reasoning: 'Quick local analysis',
    };
}
