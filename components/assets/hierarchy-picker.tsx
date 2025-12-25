'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, ChevronDown, Factory, Layers, Settings, Cog, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { AssetLevel, HierarchyNode, AssetWithHierarchy, buildHierarchyTree } from '@/types/hierarchy.types'

interface HierarchyPickerProps {
    value: string | null
    onChange: (assetId: string | null) => void
    excludeId?: string
    className?: string
}

const levelIcons: Record<AssetLevel, React.ElementType> = {
    site: Factory,
    line: Layers,
    subsystem: Settings,
    equipment: Cog,
    component: Cog,
}

const levelLabels: Record<AssetLevel, string> = {
    site: 'Site',
    line: 'Ligne',
    subsystem: 'Sous-système',
    equipment: 'Équipement',
    component: 'Composant',
}

function TreeNode({
    node,
    selectedId,
    onSelect,
    excludeId,
    depth = 0
}: {
    node: HierarchyNode
    selectedId: string | null
    onSelect: (id: string) => void
    excludeId?: string
    depth?: number
}) {
    const [expanded, setExpanded] = useState(depth < 2)
    const hasChildren = node.children && node.children.length > 0
    const Icon = levelIcons[node.level] || Cog
    const isSelected = selectedId === node.id
    const isExcluded = excludeId === node.id

    if (isExcluded) return null

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                    isSelected
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => onSelect(node.id)}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setExpanded(!expanded)
                        }}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                        {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                ) : (
                    <div className="w-5" />
                )}
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm">{node.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {levelLabels[node.level]}
                </span>
            </div>
            {expanded && hasChildren && (
                <div>
                    {node.children!.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            excludeId={excludeId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function HierarchyPicker({ value, onChange, excludeId, className }: HierarchyPickerProps) {
    const [assets, setAssets] = useState<AssetWithHierarchy[]>([])
    const [tree, setTree] = useState<HierarchyNode[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [newAssetName, setNewAssetName] = useState('')
    const [newAssetLevel, setNewAssetLevel] = useState<AssetLevel>('site')

    useEffect(() => {
        fetchAssets()
    }, [])

    async function fetchAssets() {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('assets')
            .select('id, name, parent_id, level, path, depth')
            .in('level', ['site', 'line', 'subsystem'])
            .order('depth', { ascending: true })
            .order('name', { ascending: true })

        if (data) {
            const typedData = data as unknown as Array<{
                id: string
                name: string
                parent_id: string | null
                level: string | null
                path: string | null
                depth: number | null
            }>
            setAssets(typedData as unknown as AssetWithHierarchy[])
            // Build tree
            const nodeMap = new Map<string, HierarchyNode>()
            const roots: HierarchyNode[] = []

            typedData.forEach((asset) => {
                nodeMap.set(asset.id, {
                    id: asset.id,
                    name: asset.name,
                    level: (asset.level || 'equipment') as AssetLevel,
                    depth: asset.depth || 0,
                    path: asset.path || '',
                    parent_id: asset.parent_id,
                    children: []
                })
            })

            typedData.forEach((asset) => {
                const node = nodeMap.get(asset.id)!
                if (asset.parent_id && nodeMap.has(asset.parent_id)) {
                    nodeMap.get(asset.parent_id)!.children!.push(node)
                } else {
                    roots.push(node)
                }
            })

            setTree(roots)
        }
        setLoading(false)
    }

    async function handleCreateAsset() {
        if (!newAssetName.trim()) return

        const supabase = createClient()
        // Generate a code from the name
        const code = newAssetName.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 20)

        const { data, error } = await supabase
            .from('assets')
            .insert({
                name: newAssetName,
                code: code,
                location: newAssetName, // Use name as default location
                level: newAssetLevel,
                parent_id: value,
                depth: value ? (assets.find(a => a.id === value)?.depth || 0) + 1 : 0,
                status: 'operational'
            })
            .select('id')
            .single()

        if (data) {
            await fetchAssets()
            onChange(data.id)
            setShowCreateDialog(false)
            setNewAssetName('')
        }
    }

    const selectedAsset = assets.find(a => a.id === value)

    return (
        <div className={cn("space-y-2", className)}>
            <Label>Emplacement dans la hiérarchie</Label>

            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-white dark:bg-gray-900">
                {loading ? (
                    <div className="text-center py-4 text-gray-500">Chargement...</div>
                ) : tree.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                        Aucune hiérarchie. Créez un site d'abord.
                    </div>
                ) : (
                    <>
                        {/* No parent option */}
                        <div
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors mb-2",
                                !value
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                            onClick={() => onChange(null)}
                        >
                            <div className="w-5" />
                            <span className="text-sm text-gray-500">Aucun parent (racine)</span>
                        </div>

                        {tree.map(node => (
                            <TreeNode
                                key={node.id}
                                node={node}
                                selectedId={value}
                                onSelect={onChange}
                                excludeId={excludeId}
                            />
                        ))}
                    </>
                )}
            </div>

            {selectedAsset && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sélectionné: <span className="font-medium">{selectedAsset.name}</span> ({levelLabels[selectedAsset.level as AssetLevel]})
                </p>
            )}

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un nouvel emplacement
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvel emplacement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                                value={newAssetName}
                                onChange={(e) => setNewAssetName(e.target.value)}
                                placeholder="Ex: Usine Casa, Ligne Pavé..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newAssetLevel} onValueChange={(v) => setNewAssetLevel(v as AssetLevel)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="site">🏭 Site (Usine)</SelectItem>
                                    <SelectItem value="line">📍 Ligne de production</SelectItem>
                                    <SelectItem value="subsystem">🔧 Sous-système</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleCreateAsset} className="w-full">
                            Créer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
