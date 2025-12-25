'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    useDraggable,
    useDroppable,
    closestCenter,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Factory,
    GitBranch,
    Layers,
    Settings2,
    GripVertical,
    Plus,
    Check,
    X,
    ChevronRight,
    ChevronDown,
    Package,
    Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Asset {
    id: string
    name: string
    model_number: string | null
    parent_id: string | null
    level: string | null
}

interface OrganizeModeProps {
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
}

// Draggable Equipment Item
function DraggableEquipment({ asset }: { asset: Asset }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: asset.id,
        data: asset,
    })

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-2 p-2 rounded-lg border bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing transition-all",
                isDragging && "opacity-50 shadow-lg"
            )}
        >
            <GripVertical className="h-4 w-4 text-gray-400" />
            <Package className="h-4 w-4 text-blue-500" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{asset.name}</p>
                {asset.model_number && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{asset.model_number}</p>
                )}
            </div>
        </div>
    )
}

// Droppable Zone
function DropZone({ id, children, label }: { id: string; children?: React.ReactNode; label?: string }) {
    const { isOver, setNodeRef } = useDroppable({ id })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[60px] rounded-lg border-2 border-dashed p-2 transition-colors",
                isOver
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-700"
            )}
        >
            {children}
            {!children && label && (
                <p className="text-sm text-gray-400 text-center py-2">{label}</p>
            )}
        </div>
    )
}

// Hierarchy Node
function HierarchyNode({
    node,
    allAssets,
    pendingMoves,
    onAddChild,
    onDeleteNode,
    onUnassignEquipment,
    depth = 0,
}: {
    node: Asset
    allAssets: Asset[]
    pendingMoves: Map<string, string>
    onAddChild: (parentId: string, level: 'line' | 'subsystem') => void
    onDeleteNode: (nodeId: string) => void
    onUnassignEquipment: (assetId: string) => void
    depth?: number
}) {
    const [expanded, setExpanded] = useState(true)

    // Get children nodes
    const childNodes = allAssets.filter(
        a => (a.parent_id === node.id || pendingMoves.get(a.id) === node.id) &&
            ['site', 'line', 'subsystem'].includes(a.level || '')
    )

    // Get equipment assigned to this node
    const assignedEquipment = allAssets.filter(
        a => (a.parent_id === node.id || pendingMoves.get(a.id) === node.id) &&
            (a.level === 'equipment' || !a.level)
    )

    const Icon = node.level === 'site' ? Factory : node.level === 'line' ? GitBranch : Layers

    return (
        <div className="ml-4">
            <div className="flex items-center gap-2 py-1">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Icon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{node.name}</span>
                <span className="text-xs text-gray-400">
                    ({node.level === 'site' ? 'Site' : node.level === 'line' ? 'Ligne' : 'Sous-système'})
                </span>
                {node.level === 'site' && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => onAddChild(node.id, 'line')}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Ligne
                    </Button>
                )}
                {node.level === 'line' && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => onAddChild(node.id, 'subsystem')}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Sous-système
                    </Button>
                )}
                {/* Delete node button */}
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => onDeleteNode(node.id)}
                    title="Supprimer"
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>

            {expanded && (
                <div className="ml-6 space-y-2">
                    {/* Drop zone for equipment */}
                    <DropZone id={node.id} label="Glissez un équipement ici">
                        {assignedEquipment.length > 0 && (
                            <div className="space-y-1">
                                {assignedEquipment.map(eq => (
                                    <div
                                        key={eq.id}
                                        className="flex items-center gap-2 p-1.5 rounded bg-green-50 dark:bg-green-900/20 text-sm group"
                                    >
                                        <Package className="h-3 w-3 text-green-600" />
                                        <span className="truncate flex-1">{eq.name}</span>
                                        {eq.model_number && (
                                            <span className="text-xs text-gray-500">({eq.model_number})</span>
                                        )}
                                        <button
                                            onClick={() => onUnassignEquipment(eq.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                                            title="Désaffecter"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DropZone>

                    {/* Child nodes */}
                    {childNodes.map(child => (
                        <HierarchyNode
                            key={child.id}
                            node={child}
                            allAssets={allAssets}
                            pendingMoves={pendingMoves}
                            onAddChild={onAddChild}
                            onDeleteNode={onDeleteNode}
                            onUnassignEquipment={onUnassignEquipment}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function OrganizeMode({ isOpen, onClose, onComplete }: OrganizeModeProps) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pendingMoves, setPendingMoves] = useState<Map<string, string>>(new Map())
    const [activeId, setActiveId] = useState<string | null>(null)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [newNodeName, setNewNodeName] = useState('')
    const [newNodeLevel, setNewNodeLevel] = useState<'site' | 'line' | 'subsystem'>('site')
    const [newNodeParent, setNewNodeParent] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchAssets()
        }
    }, [isOpen])

    async function fetchAssets() {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('assets')
            .select('id, name, model_number, parent_id, level')
            .order('name')

        if (data) {
            setAssets(data as Asset[])
        }
        setLoading(false)
    }

    // Get unassigned equipment (no parent, level is equipment or null)
    const unassignedEquipment = assets.filter(
        a => (!a.parent_id && !pendingMoves.has(a.id)) &&
            (a.level === 'equipment' || !a.level)
    )

    // Get hierarchy nodes (sites, lines, subsystems)
    const hierarchyNodes = assets.filter(a => ['site', 'line', 'subsystem'].includes(a.level || ''))
    const sites = hierarchyNodes.filter(a => a.level === 'site' && !a.parent_id)

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        console.log('DragEnd event:', { active: active?.id, over: over?.id })

        if (!over) {
            console.log('No drop target')
            return
        }

        const assetId = active.id as string
        const targetId = over.id as string

        // Don't allow dropping on itself
        if (assetId === targetId) {
            console.log('Cannot drop on itself')
            return
        }

        console.log(`Adding pending move: ${assetId} -> ${targetId}`)
        // Add to pending moves
        setPendingMoves(prev => new Map(prev).set(assetId, targetId))
    }

    const handleCreateNode = async () => {
        if (!newNodeName.trim()) return

        const supabase = createClient()
        const code = newNodeName.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 20)

        const { data, error } = await supabase
            .from('assets')
            .insert({
                name: newNodeName,
                code: code,
                location: newNodeName,
                level: newNodeLevel,
                parent_id: newNodeParent,
                status: 'operational',
            })
            .select()
            .single()

        if (error) {
            toast.error('Erreur lors de la création')
            console.error(error)
            return
        }

        if (data) {
            setAssets(prev => [...prev, data as Asset])
            setShowCreateDialog(false)
            setNewNodeName('')
            toast.success('Nœud créé avec succès')
        }
    }

    const handleAddChild = (parentId: string, level: 'line' | 'subsystem') => {
        setNewNodeParent(parentId)
        setNewNodeLevel(level)
        setShowCreateDialog(true)
    }

    // Delete a hierarchy node (site, line, or subsystem) - CASCADE DELETE
    const handleDeleteNode = async (nodeId: string) => {
        // Find all descendants recursively
        const getAllDescendants = (parentId: string): Asset[] => {
            const directChildren = assets.filter(a => a.parent_id === parentId)
            const allDescendants: Asset[] = [...directChildren]
            for (const child of directChildren) {
                allDescendants.push(...getAllDescendants(child.id))
            }
            return allDescendants
        }

        const node = assets.find(a => a.id === nodeId)
        const descendants = getAllDescendants(nodeId)

        // Separate hierarchy nodes from equipment
        const hierarchyChildren = descendants.filter(a => ['site', 'line', 'subsystem'].includes(a.level || ''))
        const equipmentChildren = descendants.filter(a => a.level === 'equipment' || !a.level)

        // Build confirmation message
        let confirmMsg = `Supprimer "${node?.name || 'ce nœud'}"`
        if (hierarchyChildren.length > 0) {
            confirmMsg += ` et ${hierarchyChildren.length} sous-nœud(s) (${hierarchyChildren.map(h => h.name).join(', ')})`
        }
        if (equipmentChildren.length > 0) {
            confirmMsg += ` ? ${equipmentChildren.length} équipement(s) seront désaffectés.`
        } else {
            confirmMsg += ' ?'
        }

        if (!confirm(confirmMsg)) return

        const supabase = createClient()

        try {
            // 1. Unassign all equipment descendants (set parent_id to null)
            if (equipmentChildren.length > 0) {
                const equipmentIds = equipmentChildren.map(e => e.id)
                await supabase
                    .from('assets')
                    .update({ parent_id: null })
                    .in('id', equipmentIds)
            }

            // 2. Also unassign direct equipment children of the node being deleted
            await supabase
                .from('assets')
                .update({ parent_id: null })
                .eq('parent_id', nodeId)
                .neq('level', 'line')
                .neq('level', 'subsystem')
                .neq('level', 'site')

            // 3. Delete all hierarchy child nodes (in reverse order: deepest first)
            // Sort by depth (subsystems before lines before sites)
            const sortedHierarchyChildren = hierarchyChildren.sort((a, b) => {
                const levelOrder: Record<string, number> = { 'subsystem': 0, 'line': 1, 'site': 2 }
                return (levelOrder[a.level || ''] || 0) - (levelOrder[b.level || ''] || 0)
            })

            for (const child of sortedHierarchyChildren) {
                await supabase.from('assets').delete().eq('id', child.id)
            }

            // 4. Delete the node itself
            const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', nodeId)

            if (error) {
                console.error('Delete error:', error)
                toast.error('Erreur lors de la suppression')
                return
            }

            // 5. Update local state - remove main node and all hierarchy children
            const deletedIds = new Set([nodeId, ...hierarchyChildren.map(h => h.id)])
            setAssets(prev => prev
                .filter(a => !deletedIds.has(a.id))
                .map(a => equipmentChildren.find(e => e.id === a.id)
                    ? { ...a, parent_id: null }
                    : a
                )
            )

            toast.success(`Nœud et ${hierarchyChildren.length} sous-nœud(s) supprimés`)
        } catch (err) {
            console.error('Cascade delete error:', err)
            toast.error('Erreur lors de la suppression en cascade')
        }
    }

    // Unassign equipment from its parent
    const handleUnassign = (assetId: string) => {
        // Add to pending moves with null parent (will be handled on save)
        // For immediate effect, we update locally
        setAssets(prev => prev.map(a =>
            a.id === assetId ? { ...a, parent_id: null } : a
        ))
        // Remove from pending moves if it was there
        setPendingMoves(prev => {
            const newMap = new Map(prev)
            newMap.delete(assetId)
            return newMap
        })
        toast.success('Équipement désaffecté')

        // Also update in database immediately
        const supabase = createClient()
        supabase
            .from('assets')
            .update({ parent_id: null })
            .eq('id', assetId)
            .then(({ error }) => {
                if (error) console.error('Unassign error:', error)
            })
    }

    const handleSave = async () => {
        if (pendingMoves.size === 0) {
            onClose()
            return
        }

        setSaving(true)
        const supabase = createClient()

        try {
            console.log('Saving pending moves:', Array.from(pendingMoves.entries()))

            // Update all pending moves
            for (const [assetId, parentId] of pendingMoves.entries()) {
                console.log(`Updating asset ${assetId} with parent_id ${parentId}`)
                const { error: updateError } = await supabase
                    .from('assets')
                    .update({ parent_id: parentId })
                    .eq('id', assetId)

                if (updateError) {
                    console.error('Update error:', updateError)
                    toast.error(`Erreur: ${updateError.message}`)
                    return
                }
            }

            toast.success(`${pendingMoves.size} équipement(s) organisé(s)`)
            setPendingMoves(new Map())
            onComplete()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Erreur lors de la sauvegarde')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setPendingMoves(new Map())
        onClose()
    }

    const activeAsset = activeId ? assets.find(a => a.id === activeId) : null

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent
                showCloseButton={false}
                className="!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !max-w-none !w-full !h-full !rounded-none md:!inset-auto md:!top-[50%] md:!left-[50%] md:!translate-x-[-50%] md:!translate-y-[-50%] md:!max-w-7xl md:!w-[95vw] md:!h-[85vh] md:!rounded-lg overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-0 md:border border-gray-200 dark:border-gray-700 p-2 md:p-6"
            >
                <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-2 md:pb-4 shrink-0">
                    <DialogTitle className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm md:text-lg">
                            <div className="p-1 md:p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">Organisation</span>
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 h-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white border border-green-700 h-8"
                            >
                                <Check className="h-4 w-4 mr-1" />
                                <span className="text-xs md:text-sm">{saving ? '...' : 'OK'}</span>
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500">Chargement...</p>
                    </div>
                ) : (
                    <DndContext
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-4 overflow-hidden mt-2 md:mt-0">
                            {/* Left: Unassigned Equipment */}
                            <Card className="overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[120px] md:min-h-0">
                                <CardHeader className="py-3 border-b border-gray-200 dark:border-gray-700">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50">
                                            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        Équipements non assignés
                                        <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-semibold">
                                            {unassignedEquipment.length}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto space-y-2">
                                    {unassignedEquipment.length === 0 ? (
                                        <p className="text-sm text-green-600 text-center py-4">
                                            ✓ Tous les équipements sont assignés
                                        </p>
                                    ) : (
                                        unassignedEquipment.map(asset => (
                                            <DraggableEquipment key={asset.id} asset={asset} />
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            {/* Right: Hierarchy */}
                            <Card className="overflow-hidden flex flex-col bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-sm">
                                <CardHeader className="py-3 border-b border-gray-200 dark:border-gray-700">
                                    <CardTitle className="text-sm font-medium flex items-center justify-between text-gray-700 dark:text-gray-200">
                                        <span className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/50">
                                                <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            Hiérarchie
                                        </span>
                                        <Button
                                            size="sm"
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                                            onClick={() => {
                                                setNewNodeParent(null)
                                                setNewNodeLevel('site')
                                                setShowCreateDialog(true)
                                            }}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Site
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto">
                                    {sites.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Factory className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                            <p className="text-sm text-gray-500 mb-3">
                                                Aucune hiérarchie créée
                                            </p>
                                            <Button
                                                onClick={() => {
                                                    setNewNodeParent(null)
                                                    setNewNodeLevel('site')
                                                    setShowCreateDialog(true)
                                                }}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Créer un Site
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {sites.map(site => (
                                                <HierarchyNode
                                                    key={site.id}
                                                    node={site}
                                                    allAssets={assets}
                                                    pendingMoves={pendingMoves}
                                                    onAddChild={handleAddChild}
                                                    onDeleteNode={handleDeleteNode}
                                                    onUnassignEquipment={handleUnassign}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay>
                            {activeAsset && (
                                <div className="flex items-center gap-2 p-2 rounded-lg border bg-white dark:bg-gray-800 shadow-xl">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                    <Package className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">{activeAsset.name}</span>
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* Create Node Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        <DialogHeader>
                            <DialogTitle>
                                {newNodeLevel === 'site' && '🏭 Nouveau Site'}
                                {newNodeLevel === 'line' && '📍 Nouvelle Ligne'}
                                {newNodeLevel === 'subsystem' && '🔧 Nouveau Sous-système'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Input
                                placeholder="Nom..."
                                value={newNodeName}
                                onChange={(e) => setNewNodeName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateNode()
                                }}
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowCreateDialog(false)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700"
                                    onClick={handleCreateNode}
                                >
                                    Créer
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    )
}
