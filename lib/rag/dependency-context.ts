import { SupabaseClient } from '@supabase/supabase-js';
import { QueryAnalysis } from './query-analyzer';

export interface Equipment {
    id: string;
    name: string;
    code: string;
    description?: string;
}

export interface DependencyContext {
    upstreamEquipment: Equipment[];
    downstreamEquipment: Equipment[];
    allDependencyIds: string[];
    processDescription: string;
}

/**
 * Get dependency context for an equipment based on query intent
 * Intelligently filters dependencies based on what the user is asking
 */
export async function getDependencyContext(
    supabase: SupabaseClient,
    assetId: string,
    queryAnalysis: QueryAnalysis
): Promise<DependencyContext> {
    // Determine if we should include dependencies based on intent
    const shouldIncludeDependencies =
        queryAnalysis.intent === 'troubleshooting' ||
        queryAnalysis.intent === 'explanation' ||
        queryAnalysis.search_in_dependencies;

    if (!shouldIncludeDependencies) {
        console.log('📊 Intent:', queryAnalysis.intent, '→ No dependency context needed');
        return {
            upstreamEquipment: [],
            downstreamEquipment: [],
            allDependencyIds: [],
            processDescription: ''
        };
    }

    try {
        // Fetch upstream dependencies (what feeds into this equipment)
        const { data: upstreamDeps, error: upstreamError } = await supabase
            .from('asset_dependencies')
            .select(`
                depends_on_id,
                description,
                assets_asset_dependencies_depends_on_id_fkey:depends_on_id (
                    id,
                    name,
                    code
                )
            `)
            .eq('equipement_id', assetId)
            .eq('dependency_type', 'upstream');

        // Fetch downstream dependencies (what this equipment feeds into)
        const { data: downstreamDeps, error: downstreamError } = await supabase
            .from('asset_dependencies')
            .select(`
                equipement_id,
                description,
                assets:equipement_id (
                    id,
                    name,
                    code
                )
            `)
            .eq('depends_on_id', assetId)
            .eq('dependency_type', 'downstream');

        if (upstreamError || downstreamError) {
            console.error('Error fetching dependencies:', upstreamError || downstreamError);
            return {
                upstreamEquipment: [],
                downstreamEquipment: [],
                allDependencyIds: [],
                processDescription: ''
            };
        }

        // Map to Equipment interface
        const upstream: Equipment[] = (upstreamDeps || [])
            .map(dep => dep.assets_asset_dependencies_depends_on_id_fkey)
            .filter(Boolean)
            .map(asset => ({
                id: asset.id,
                name: asset.name,
                code: asset.code,
                description: upstreamDeps?.find(d => d.depends_on_id === asset.id)?.description
            }));

        const downstream: Equipment[] = (downstreamDeps || [])
            .map(dep => dep.assets)
            .filter(Boolean)
            .map(asset => ({
                id: asset.id,
                name: asset.name,
                code: asset.code,
                description: downstreamDeps?.find(d => d.equipement_id === asset.id)?.description
            }));

        const allIds = [
            ...upstream.map(e => e.id),
            ...downstream.map(e => e.id)
        ];

        console.log('🔗 Dependency context:');
        console.log(`   Upstream: ${upstream.length} equipment`);
        console.log(`   Downstream: ${downstream.length} equipment`);

        return {
            upstreamEquipment: upstream,
            downstreamEquipment: downstream,
            allDependencyIds: allIds,
            processDescription: buildProcessDescription(upstream, downstream)
        };

    } catch (error) {
        console.error('Error in getDependencyContext:', error);
        return {
            upstreamEquipment: [],
            downstreamEquipment: [],
            allDependencyIds: [],
            processDescription: ''
        };
    }
}

/**
 * Build human-readable process description
 */
function buildProcessDescription(
    upstream: Equipment[],
    downstream: Equipment[]
): string {
    if (upstream.length === 0 && downstream.length === 0) {
        return '';
    }

    const parts: string[] = [];

    if (upstream.length > 0) {
        parts.push('Upstream: ' + upstream.map(e => e.name).join(', '));
    }

    if (downstream.length > 0) {
        parts.push('Downstream: ' + downstream.map(e => e.name).join(', '));
    }

    return parts.join(' | ');
}

/**
 * Build process context prompt for system message
 */
export function buildProcessContextPrompt(
    context: DependencyContext,
    currentAssetName: string
): string {
    if (context.upstreamEquipment.length === 0 && context.downstreamEquipment.length === 0) {
        return '';
    }

    const upstreamLines = context.upstreamEquipment.map(e =>
        `→ ${e.name}${e.description ? ` (${e.description})` : ''} [upstream]`
    );

    const downstreamLines = context.downstreamEquipment.map(e =>
        `→ ${e.name}${e.description ? ` (${e.description})` : ''} [downstream]`
    );

    return `

Process Chain Context:
${upstreamLines.join('\n')}
→ **${currentAssetName}** ← YOU ARE HERE
${downstreamLines.join('\n')}

Note: Search results include documentation from connected equipment when relevant for troubleshooting.
When analyzing issues, consider the entire process chain.`;
}
