// Hierarchical Asset Types

export type AssetLevel = 'site' | 'line' | 'subsystem' | 'equipment' | 'component';

export interface AssetAlias {
    id: string;
    asset_id: string;
    alias: string;
    alias_normalized: string;
    language: 'fr' | 'ar' | 'darija' | 'en';
    is_primary: boolean;
    created_at: string;
}

export interface HierarchyNode {
    id: string;
    name: string;
    level: AssetLevel;
    depth: number;
    path: string;
    parent_id: string | null;
    children?: HierarchyNode[];
}

export interface AliasMatch {
    asset_id: string;
    asset_name: string;
    technical_reference: string | null;
    match_type: 'alias_exact' | 'technical_ref' | 'alias_partial' | 'name_contains';
    confidence: number;
}

export interface SmartRagResult {
    chunk_id: string;
    content: string;
    asset_id: string;
    asset_name: string;
    technical_reference: string | null;
    similarity: number;
    resolution_method: string;
}

// Asset with hierarchy and aliases
export interface AssetWithHierarchy {
    id: string;
    name: string;
    manufacturer: string | null;
    model_number: string | null;
    category: string | null;
    status: string;
    description: string | null;

    // Hierarchy fields
    parent_id: string | null;
    level: AssetLevel;
    path: string | null;
    depth: number;

    // Relations
    aliases?: AssetAlias[];
    parent?: AssetWithHierarchy;
    children?: AssetWithHierarchy[];
}

// For building hierarchy tree
export function buildHierarchyTree(assets: AssetWithHierarchy[]): HierarchyNode[] {
    const map = new Map<string, HierarchyNode>();
    const roots: HierarchyNode[] = [];

    // Create nodes
    assets.forEach(asset => {
        map.set(asset.id, {
            id: asset.id,
            name: asset.name,
            level: asset.level,
            depth: asset.depth,
            path: asset.path || '',
            parent_id: asset.parent_id,
            children: []
        });
    });

    // Build tree
    assets.forEach(asset => {
        const node = map.get(asset.id)!;
        if (asset.parent_id && map.has(asset.parent_id)) {
            map.get(asset.parent_id)!.children!.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}
