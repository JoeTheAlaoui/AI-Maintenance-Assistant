'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Trash, Trash2, Eye } from 'lucide-react'
import { Database } from '@/types/database.types'
import { AssetDialog } from './asset-dialog'
import { deleteAsset } from '@/lib/actions/assets'
import { toast } from 'sonner'

type Asset = Database['public']['Tables']['assets']['Row']

interface AssetTableProps {
    assets: Asset[]
}

export function AssetTable({ assets }: AssetTableProps) {
    const router = useRouter()
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    // Toggle single selection
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    // Select/deselect all
    const toggleSelectAll = () => {
        if (selectedIds.size === assets.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(assets.map(a => a.id)))
        }
    }

    // Delete single asset
    const handleDelete = (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet asset?')) {
            void (async () => {
                const result = await deleteAsset(id)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success('Asset supprimé')
                    router.refresh()
                }
            })()
        }
    }

    // Bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        const count = selectedIds.size
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${count} asset(s)?`)) {
            return
        }

        setIsDeleting(true)
        let successCount = 0
        let errorCount = 0

        for (const id of selectedIds) {
            const result = await deleteAsset(id)
            if (result.error) {
                errorCount++
            } else {
                successCount++
            }
        }

        setIsDeleting(false)
        setSelectedIds(new Set())

        if (successCount > 0) {
            toast.success(`${successCount} asset(s) supprimé(s)`)
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} erreur(s) lors de la suppression`)
        }

        router.refresh()
    }

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'operational':
                return 'bg-green-500 hover:bg-green-600'
            case 'maintenance':
                return 'bg-yellow-500 hover:bg-yellow-600'
            case 'down':
                return 'bg-red-500 hover:bg-red-600'
            default:
                return 'bg-gray-500 hover:bg-gray-600'
        }
    }

    const isAllSelected = assets.length > 0 && selectedIds.size === assets.length
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < assets.length

    return (
        <>
            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg border">
                    <span className="text-sm font-medium">
                        {selectedIds.size} asset(s) sélectionné(s)
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
                    </Button>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Tout sélectionner"
                                />
                            </TableHead>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Emplacement</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-center">Complétude</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {assets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Aucun asset trouvé
                                </TableCell>
                            </TableRow>
                        ) : (
                            assets.map((asset) => (
                                <TableRow
                                    key={asset.id}
                                    className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(asset.id) ? 'bg-muted/50' : ''}`}
                                    onClick={() => router.push(`/assets/${asset.id}`)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.has(asset.id)}
                                            onCheckedChange={() => toggleSelection(asset.id)}
                                            aria-label={`Sélectionner ${asset.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Avatar>
                                            <AvatarImage src={asset.image_url || ''} alt={asset.name} />
                                            <AvatarFallback>{asset.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium">{asset.name}</TableCell>
                                    <TableCell className="font-mono text-sm">{asset.code}</TableCell>
                                    <TableCell>{asset.location}</TableCell>

                                    <TableCell>
                                        <Badge className={getStatusColor(asset.status)}>
                                            {asset.status || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {asset.completeness_score ? (
                                            <Badge
                                                variant="outline"
                                                className={
                                                    asset.completeness_score >= 90 ? 'border-green-500 text-green-600 bg-green-50' :
                                                        asset.completeness_score >= 70 ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                                                            'border-red-500 text-red-600 bg-red-50'
                                                }
                                            >
                                                {asset.completeness_score}%
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">
                                                Manuel
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Ouvrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/assets/${asset.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Voir détails
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEditingAsset(asset)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Modifier
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(asset.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AssetDialog
                asset={editingAsset || undefined}
                open={!!editingAsset}
                onOpenChange={(open) => !open && setEditingAsset(null)}
            />
        </>
    )
}
