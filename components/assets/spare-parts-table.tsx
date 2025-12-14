'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import type { ExtractedSparePart } from '@/types/ai-import'
import { Pencil } from 'lucide-react'

interface Props {
    spareParts: ExtractedSparePart[]
    selectedIds: Set<string>
    onSelectionChange: (ids: Set<string>) => void
    onEdit: (id: string, field: keyof ExtractedSparePart, value: any) => void
}

export function SparePartsTable({ spareParts, selectedIds, onSelectionChange, onEdit }: Props) {
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
    const [editValue, setEditValue] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    const toggleSelectAll = () => {
        if (selectedIds.size === spareParts.length) {
            onSelectionChange(new Set())
        } else {
            onSelectionChange(new Set(spareParts.map(p => p.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        onSelectionChange(newSelection)
    }

    const startEditing = (id: string, field: string, currentValue: any) => {
        setEditingCell({ id, field })
        setEditValue(String(currentValue || ''))
    }

    const saveEdit = () => {
        if (editingCell) {
            let value: any = editValue

            // Convert to number for quantity_recommended
            if (editingCell.field === 'quantity_recommended') {
                const num = parseInt(editValue, 10)
                if (isNaN(num) || num <= 0) {
                    alert('La quantité doit être supérieure à 0')
                    return
                }
                value = num
            }

            onEdit(editingCell.id, editingCell.field as keyof ExtractedSparePart, value)
            setEditingCell(null)
        }
    }

    const cancelEdit = () => {
        setEditingCell(null)
        setEditValue('')
    }

    const filteredParts = searchTerm
        ? spareParts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.reference.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : spareParts

    if (spareParts.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>Aucune pièce de rechange détectée</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header with search and selection count */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Rechercher une pièce..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    {selectedIds.size} pièce(s) sélectionnée(s)
                </p>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={spareParts.length > 0 && selectedIds.size === spareParts.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>Référence</TableHead>
                                <TableHead className="text-right">Qté recommandée</TableHead>
                                <TableHead>Unité</TableHead>
                                <TableHead>Fréquence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredParts.map((part) => (
                                <TableRow
                                    key={part.id}
                                    className={selectedIds.has(part.id) ? 'bg-muted/50' : ''}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(part.id)}
                                            onCheckedChange={() => toggleSelect(part.id)}
                                        />
                                    </TableCell>

                                    {/* Name (editable) */}
                                    <TableCell>
                                        {editingCell?.id === part.id && editingCell?.field === 'name' ? (
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit()
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                                className="h-8"
                                            />
                                        ) : (
                                            <div
                                                className="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                                onClick={() => startEditing(part.id, 'name', part.name)}
                                            >
                                                <span className="font-medium">{part.name}</span>
                                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Reference (editable) */}
                                    <TableCell>
                                        {editingCell?.id === part.id && editingCell?.field === 'reference' ? (
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit()
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                                className="h-8"
                                            />
                                        ) : (
                                            <div
                                                className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                                onClick={() => startEditing(part.id, 'reference', part.reference)}
                                            >
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    {part.reference}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Quantity (editable number) */}
                                    <TableCell className="text-right">
                                        {editingCell?.id === part.id && editingCell?.field === 'quantity_recommended' ? (
                                            <Input
                                                type="number"
                                                min="1"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit()
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                                className="h-8"
                                            />
                                        ) : (
                                            <div
                                                className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                                onClick={() => startEditing(part.id, 'quantity_recommended', part.quantity_recommended)}
                                            >
                                                <span className="font-medium">
                                                    {part.quantity_recommended}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Unit (editable) */}
                                    <TableCell>
                                        {editingCell?.id === part.id && editingCell?.field === 'unit' ? (
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit()
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                                className="h-8 w-24"
                                            />
                                        ) : (
                                            <div
                                                className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                                onClick={() => startEditing(part.id, 'unit', part.unit)}
                                            >
                                                <span className="text-sm text-muted-foreground">
                                                    {part.unit}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Replacement Frequency (editable) */}
                                    <TableCell>
                                        {editingCell?.id === part.id && editingCell?.field === 'replacement_frequency' ? (
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit()
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                                className="h-8"
                                                placeholder="Ex: 6 mois"
                                            />
                                        ) : (
                                            <div
                                                className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                                onClick={() => startEditing(part.id, 'replacement_frequency', part.replacement_frequency)}
                                            >
                                                <span className="text-sm text-muted-foreground">
                                                    {part.replacement_frequency || 'Non spécifié'}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
