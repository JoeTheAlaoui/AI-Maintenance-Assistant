// lib/dependencies/graph-traversal.ts
// Multi-hop dependency graph traversal for process chain analysis

import { SupabaseClient } from '@supabase/supabase-js';

export interface DependencyNode {
    id: string;
    name: string;
    code?: string;
    customName?: string;
    type: 'upstream' | 'downstream';
    depth: number; // Negative for upstream, positive for downstream
    distance: number; // Absolute depth (always positive)
    relationship?: string;
}

export interface DependencyChain {
    target: {
        id: string;
        name: string;
        code?: string;
        customName?: string;
    };
    upstream: DependencyNode[]; // Sorted by depth (closest first)
    downstream: DependencyNode[]; // Sorted by depth (closest first)
    totalNodes: number;
    maxDepthReached: number;
}

interface TraversalConfig {
    maxDepth: number;
    visited?: Set<string>;
}

const DEFAULT_CONFIG: TraversalConfig = {
    maxDepth: 3,
    visited: new Set(),
};

/**
 * Traverse dependency graph in both directions (upstream + downstream)
 * up to maxDepth levels
 */
export async function traverseDependencies(
    supabase: SupabaseClient,
    equipmentId: string,
    config: Partial<TraversalConfig> = {}
): Promise<DependencyChain> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Get target equipment info
    const { data: target, error: targetError } = await supabase
        .from('assets')
        .select('id, name, code, custom_name')
        .eq('id', equipmentId)
        .single();

    if (targetError || !target) {
        console.error('Target equipment not found:', targetError);
        return {
            target: { id: equipmentId, name: 'Unknown' },
            upstream: [],
            downstream: [],
            totalNodes: 0,
            maxDepthReached: 0,
        };
    }

    console.log(`\n🔗 ========= DEPENDENCY TRAVERSAL =========`);
    console.log(`🎯 Target: ${target.name}${target.custom_name ? ` (${target.custom_name})` : ''}`);
    console.log(`📏 Max depth: ${cfg.maxDepth}`);

    // Initialize visited set
    const visited = new Set<string>([equipmentId]);

    // Traverse upstream (towards sources)
    console.log('\n⬆️  Traversing upstream...');
    const upstream = await traverseUpstream(
        supabase,
        equipmentId,
        1,
        cfg.maxDepth,
        new Set(visited)
    );

    // Traverse downstream (towards sinks)
    console.log('\n⬇️  Traversing downstream...');
    const downstream = await traverseDownstream(
        supabase,
        equipmentId,
        1,
        cfg.maxDepth,
        new Set(visited)
    );

    const totalNodes = upstream.length + downstream.length;
    const maxDepth = Math.max(
        upstream.length > 0 ? Math.max(...upstream.map(n => n.distance)) : 0,
        downstream.length > 0 ? Math.max(...downstream.map(n => n.distance)) : 0
    );

    console.log(`\n📊 Traversal complete:`);
    console.log(`   Upstream nodes: ${upstream.length}`);
    console.log(`   Downstream nodes: ${downstream.length}`);
    console.log(`   Total nodes: ${totalNodes}`);
    console.log(`   Max depth reached: ${maxDepth}`);
    console.log(`==========================================\n`);

    return {
        target: {
            id: target.id,
            name: target.name,
            code: target.code,
            customName: target.custom_name,
        },
        upstream: upstream.sort((a, b) => a.distance - b.distance), // Closest first
        downstream: downstream.sort((a, b) => a.distance - b.distance), // Closest first
        totalNodes,
        maxDepthReached: maxDepth,
    };
}

/**
 * Recursively traverse upstream dependencies (what feeds into this)
 */
async function traverseUpstream(
    supabase: SupabaseClient,
    equipmentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>
): Promise<DependencyNode[]> {
    if (currentDepth > maxDepth) {
        return [];
    }

    // Query asset_dependencies for upstream
    const { data: upstreamDeps, error } = await supabase
        .from('asset_dependencies')
        .select(`
            depends_on_id,
            description,
            depends_on:depends_on_id (
                id,
                name,
                code,
                custom_name
            )
        `)
        .eq('equipement_id', equipmentId)
        .eq('dependency_type', 'upstream');

    if (error || !upstreamDeps || upstreamDeps.length === 0) {
        return [];
    }

    const nodes: DependencyNode[] = [];
    const indent = '  '.repeat(currentDepth);

    for (const dep of upstreamDeps) {
        const equipment = dep.depends_on as any;
        if (!equipment) continue;

        // Cycle detection
        if (visited.has(equipment.id)) {
            console.log(`${indent}⚠️ Cycle detected at ${equipment.name}, skipping`);
            continue;
        }

        visited.add(equipment.id);
        console.log(`${indent}⬆️ [Depth -${currentDepth}] ${equipment.name}${equipment.custom_name ? ` (${equipment.custom_name})` : ''}`);

        // Add this node
        nodes.push({
            id: equipment.id,
            name: equipment.name,
            code: equipment.code,
            customName: equipment.custom_name,
            type: 'upstream',
            depth: -currentDepth,
            distance: currentDepth,
            relationship: dep.description || 'feeds_into',
        });

        // Recursively traverse further upstream
        const furtherUpstream = await traverseUpstream(
            supabase,
            equipment.id,
            currentDepth + 1,
            maxDepth,
            visited
        );

        nodes.push(...furtherUpstream);
    }

    return nodes;
}

/**
 * Recursively traverse downstream dependencies (what receives from this)
 */
async function traverseDownstream(
    supabase: SupabaseClient,
    equipmentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>
): Promise<DependencyNode[]> {
    if (currentDepth > maxDepth) {
        return [];
    }

    // Query asset_dependencies for downstream
    const { data: downstreamDeps, error } = await supabase
        .from('asset_dependencies')
        .select(`
            equipement_id,
            description,
            equipment:equipement_id (
                id,
                name,
                code,
                custom_name
            )
        `)
        .eq('depends_on_id', equipmentId)
        .eq('dependency_type', 'downstream');

    if (error || !downstreamDeps || downstreamDeps.length === 0) {
        return [];
    }

    const nodes: DependencyNode[] = [];
    const indent = '  '.repeat(currentDepth);

    for (const dep of downstreamDeps) {
        const equipment = dep.equipment as any;
        if (!equipment) continue;

        // Cycle detection
        if (visited.has(equipment.id)) {
            console.log(`${indent}⚠️ Cycle detected at ${equipment.name}, skipping`);
            continue;
        }

        visited.add(equipment.id);
        console.log(`${indent}⬇️ [Depth +${currentDepth}] ${equipment.name}${equipment.custom_name ? ` (${equipment.custom_name})` : ''}`);

        // Add this node
        nodes.push({
            id: equipment.id,
            name: equipment.name,
            code: equipment.code,
            customName: equipment.custom_name,
            type: 'downstream',
            depth: currentDepth,
            distance: currentDepth,
            relationship: dep.description || 'receives_from',
        });

        // Recursively traverse further downstream
        const furtherDownstream = await traverseDownstream(
            supabase,
            equipment.id,
            currentDepth + 1,
            maxDepth,
            visited
        );

        nodes.push(...furtherDownstream);
    }

    return nodes;
}

/**
 * Format dependency chain for system prompt
 */
export function formatDependencyChain(chain: DependencyChain): string {
    if (chain.totalNodes === 0) {
        return '';
    }

    let output = '🔗 Process Chain (Multi-Hop Dependencies):\n\n';

    // Build visual representation - most distant upstream first
    const upstreamSorted = [...chain.upstream].sort((a, b) => b.distance - a.distance);
    const downstreamSorted = [...chain.downstream].sort((a, b) => a.distance - b.distance);

    // Upstream nodes (most distant first)
    for (const node of upstreamSorted) {
        const indent = '  '.repeat(chain.maxDepthReached - node.distance);
        const alias = node.customName ? ` ("${node.customName}")` : '';
        output += `${indent}⬆️ ${node.name}${alias} [${node.distance} hop${node.distance > 1 ? 's' : ''} upstream]\n`;
    }

    // Target node
    const targetIndent = '  '.repeat(chain.maxDepthReached);
    const targetAlias = chain.target.customName ? ` ("${chain.target.customName}")` : '';
    output += `${targetIndent}🎯 **${chain.target.name}${targetAlias}** ← YOU ARE HERE\n`;

    // Downstream nodes (closest first)
    for (const node of downstreamSorted) {
        const indent = '  '.repeat(chain.maxDepthReached + node.distance);
        const alias = node.customName ? ` ("${node.customName}")` : '';
        output += `${indent}⬇️ ${node.name}${alias} [${node.distance} hop${node.distance > 1 ? 's' : ''} downstream]\n`;
    }

    // Add diagnostic guidance
    output += '\n📊 Diagnostic Guidance:\n';

    if (chain.upstream.length > 0) {
        output += `• Upstream (${chain.upstream.length} equipment): Check supply/input quality issues\n`;
        const closestUpstream = chain.upstream[0];
        output += `  - Start with: ${closestUpstream.name} (closest upstream)\n`;
    }

    if (chain.downstream.length > 0) {
        output += `• Downstream (${chain.downstream.length} equipment): Check backpressure/capacity issues\n`;
        const closestDownstream = chain.downstream[0];
        output += `  - Start with: ${closestDownstream.name} (closest downstream)\n`;
    }

    return output;
}
