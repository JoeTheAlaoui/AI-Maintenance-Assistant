// lib/rag/hierarchy-context.ts
// Provides hierarchy and dependency context for AI chat

import { SupabaseClient } from '@supabase/supabase-js';

interface HierarchyContext {
    path: { id: string; name: string; level: string }[];
    siblings: { id: string; name: string; level: string }[];
    children: { id: string; name: string; level: string }[];
    upstream: { id: string; name: string; type: string; criticality: string }[];
    downstream: { id: string; name: string; type: string; criticality: string }[];
}

/**
 * Get full hierarchy and dependency context for an asset
 */
export async function getAssetHierarchyContext(
    supabase: SupabaseClient,
    assetId: string
): Promise<HierarchyContext> {

    // Get path to root
    const { data: path } = await supabase.rpc('get_asset_path', { target_asset_id: assetId });

    // Get asset details
    const { data: asset } = await supabase
        .from('assets')
        .select('parent_id')
        .eq('id', assetId)
        .single();

    // Get siblings (same parent)
    let siblings: any[] = [];
    if (asset?.parent_id) {
        const { data } = await supabase
            .from('assets')
            .select('id, name, level')
            .eq('parent_id', asset.parent_id)
            .neq('id', assetId)
            .order('position_order');
        siblings = data || [];
    }

    // Get children
    const { data: children } = await supabase
        .from('assets')
        .select('id, name, level')
        .eq('parent_id', assetId)
        .order('position_order');

    // Get upstream dependencies
    const { data: upstream } = await supabase.rpc('get_upstream_dependencies', { target_asset_id: assetId });

    // Get downstream dependencies
    const { data: downstream } = await supabase.rpc('get_downstream_dependencies', { target_asset_id: assetId });

    return {
        path: path || [],
        siblings: siblings || [],
        children: children || [],
        upstream: (upstream || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            type: u.dependency_type,
            criticality: u.criticality,
        })),
        downstream: (downstream || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.dependency_type,
            criticality: d.criticality,
        })),
    };
}

/**
 * Format hierarchy context for inclusion in AI prompt
 */
export function formatHierarchyForPrompt(context: HierarchyContext, assetName: string): string {
    let text = '';

    // Path (location in hierarchy)
    if (context.path.length > 1) {
        const pathStr = context.path.map(p => p.name).join(' → ');
        text += `📍 EMPLACEMENT: ${pathStr}\n\n`;
    }

    // Siblings (related equipment in same area)
    if (context.siblings.length > 0) {
        text += `🔧 ÉQUIPEMENTS DANS LA MÊME ZONE:\n`;
        context.siblings.forEach(s => {
            text += `   - ${s.name}\n`;
        });
        text += '\n';
    }

    // Children (sub-components)
    if (context.children.length > 0) {
        text += `📦 SOUS-COMPOSANTS DE ${assetName}:\n`;
        context.children.forEach(c => {
            text += `   - ${c.name}\n`;
        });
        text += '\n';
    }

    // Upstream dependencies
    if (context.upstream.length > 0) {
        text += `⬆️ DÉPENDANCES AMONT (ce qui alimente ${assetName}):\n`;
        context.upstream.forEach(u => {
            const critIcon = u.criticality === 'critical' ? '🔴' : u.criticality === 'high' ? '🟠' : '🟡';
            text += `   ${critIcon} ${u.name} [${u.type}]\n`;
        });
        text += '\n';
    }

    // Downstream dependencies
    if (context.downstream.length > 0) {
        text += `⬇️ DÉPENDANCES AVAL (ce qui dépend de ${assetName}):\n`;
        context.downstream.forEach(d => {
            const critIcon = d.criticality === 'critical' ? '🔴' : d.criticality === 'high' ? '🟠' : '🟡';
            text += `   ${critIcon} ${d.name} [${d.type}]\n`;
        });
        text += '\n';
    }

    return text;
}

/**
 * Generate diagnostic reasoning prompt based on dependencies
 */
export function generateDiagnosticPrompt(context: HierarchyContext, assetName: string): string {
    if (context.upstream.length === 0 && context.downstream.length === 0) {
        return '';
    }

    let prompt = `\nRÈGLES DE DIAGNOSTIC SYSTÈME:\n`;

    if (context.upstream.length > 0) {
        const criticalUpstream = context.upstream.filter(u => u.criticality === 'critical');
        if (criticalUpstream.length > 0) {
            prompt += `1. Si ${assetName} ne fonctionne pas, VÉRIFIE D'ABORD: ${criticalUpstream.map(u => u.name).join(', ')}\n`;
        }
    }

    if (context.downstream.length > 0) {
        const criticalDownstream = context.downstream.filter(d => d.criticality === 'critical');
        if (criticalDownstream.length > 0) {
            prompt += `2. Si ${assetName} est arrêté, AVERTIS que ${criticalDownstream.map(d => d.name).join(', ')} seront impactés\n`;
        }
    }

    prompt += `3. Pour toute panne, propose un diagnostic SÉQUENTIEL basé sur le flux du système\n`;

    return prompt;
}
