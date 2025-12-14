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
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Trash, Trash2 } from 'lucide-react'
import { Database } from '@/types/database.types'
import { InventoryDialog } from './inventory-dialog'
import { deletePart } from '@/lib/actions/inventory'
import { toast } from 'sonner'

type InventoryPart = Database['public']['Tables']['inventory']['Row']

interface InventoryTableProps {
    parts: InventoryPart[]
}

export function InventoryTable({ parts }: InventoryTableProps) {
    const router = useRouter()
    const [editingPart, setEditingPart] = useState<InventoryPart | null>(null)
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
        if (selectedIds.size === parts.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(parts.map(p => p.id)))
        }
    }

    // Delete single part
    const handleDelete = (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette pièce?')) {
            void (async () => {
                const result = await deletePart(id)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success('Pièce supprimée')
                    router.refresh()
                }
            })()
        }
    }

    // Bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        const count = selectedIds.size
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${count} pièce(s)?`)) {
            return
        }

        setIsDeleting(true)
        let successCount = 0
        let errorCount = 0

        for (const id of selectedIds) {
            const result = await deletePart(id)
            if (result.error) {
                errorCount++
            } else {
                successCount++
            }
        }

        setIsDeleting(false)
        setSelectedIds(new Set())

        if (successCount > 0) {
            toast.success(`${successCount} pièce(s) supprimée(s)`)
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} erreur(s) lors de la suppression`)
        }

        router.refresh()
    }

    const getStockBadge = (stockQty: number, minThreshold: number | null) => {
        const threshold = minThreshold || 0
        const isLowStock = stockQty <= threshold

        return (
            <Badge
                variant={isLowStock ? "destructive" : "default"}
                className={isLowStock ? "" : "bg-green-500 hover:bg-green-600"}
            >
                {stockQty} {isLowStock && "- Stock bas"}
            </Badge>
        )
    }

    const isAllSelected = parts.length > 0 && selectedIds.size === parts.length
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < parts.length

    return (
        <>
            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg border">
                    <span className="text-sm font-medium">
                        {selectedIds.size} pièce(s) sélectionnée(s)
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
                            <TableHead>Nom</TableHead>
                            <TableHead>Référence</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Seuil min</TableHead>
                            <TableHead>Emplacement</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Aucune pièce trouvée
                                </TableCell>
                            </TableRow>
                        ) : (
                            parts.map((part) => (
                                <TableRow
                                    key={part.id}
                                    className={selectedIds.has(part.id) ? 'bg-muted/50' : ''}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(part.id)}
                                            onCheckedChange={() => toggleSelection(part.id)}
                                            aria-label={`Sélectionner ${part.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{part.name}</TableCell>
                                    <TableCell className="font-mono text-sm">{part.reference}</TableCell>
                                    <TableCell>
                                        {getStockBadge(part.stock_qty, part.min_threshold)}
                                    </TableCell>
                                    <TableCell>{part.min_threshold ?? '-'}</TableCell>
                                    <TableCell>{part.location || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Ouvrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setEditingPart(part)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Modifier
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(part.id)}
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

            <InventoryDialog
                part={editingPart || undefined}
                open={!!editingPart}
                onOpenChange={(open) => !open && setEditingPart(null)}
            />
        </>
    )
}
