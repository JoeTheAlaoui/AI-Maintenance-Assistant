'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import type { ExtractedComponent } from '@/types/ai-import'
import { Pencil } from 'lucide-react'

interface Props {
    components: ExtractedComponent[]
    selectedIds: Set<string>
    onSelectionChange: (ids: Set<string>) => void
    onEdit: (id: string, field: keyof ExtractedComponent, value: any) => void
}

export function ComponentsTable({ components, selectedIds, onSelectionChange, onEdit }: Props) {
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
    const [editValue, setEditValue] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    const toggleSelectAll = () => {
        if (selectedIds.size === components.length) {
            onSelectionChange(new Set())
        } else {
            onSelectionChange(new Set(components.map(c => c.id)))
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
        setEditValue(currentValue || '')
    }

    const saveEdit = () => {
        if (editingCell) {
            onEdit(editingCell.id, editingCell.field as keyof ExtractedComponent, editValue)
            setEditingCell(null)
        }
    }

    const cancelEdit = () => {
        setEditingCell(null)
        setEditValue('')
    }

    const filteredComponents = searchTerm
        ? components.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : components

    if (components.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>Aucun composant détecté</p>
            </div>
        )
    }

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            motor: 'bg-blue-100 text-blue-800',
            pump: 'bg-green-100 text-green-800',
            valve: 'bg-purple-100 text-purple-800',
            gearbox: 'bg-orange-100 text-orange-800',
            sensor: 'bg-yellow-100 text-yellow-800'
        }
        return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-4">
            {/* Header with search and selection count */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Rechercher un composant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    {selectedIds.size} composant(s) sélectionné(s)
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
                                        checked={components.length > 0 && selectedIds.size === components.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>Référence</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Emplacement</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredComponents.map((component) => (
                                <TableRow
                                    key={component.id}
                                    className={selectedIds.has(component.id) ? 'bg-muted/50' : ''}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(component.id)}
                                            onCheckedChange={() => toggleSelect(component.id)}
                                        />
                                    </TableCell>

                                    {/* Name (editable) */}
                                    <TableCell>
                                        {editingCell?.id === component.id && editingCell?.field === 'name' ? (
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
                                                onClick={() => startEditing(component.id, 'name', component.name)}
                                            >
                                                <span className="font-medium">{component.name}</span>
                                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Part Number (editable) */}
                                    <TableCell>
                                        {editingCell?.id === component.id && editingCell?.field === 'part_number' ? (
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
                                                onClick={() => startEditing(component.id, 'part_number', component.part_number)}
                                            >
                                                <span className="text-sm text-muted-foreground">
                                                    {component.part_number || 'N/A'}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Type (badge) */}
                                    <TableCell>
                                        <Badge className={getTypeColor(component.type)}>
                                            {component.type}
                                        </Badge>
                                    </TableCell>

                                    {/* Location (editable) */}
                                    <TableCell>
                                        {editingCell?.id === component.id && editingCell?.field === 'location' ? (
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
                                                onClick={() => startEditing(component.id, 'location', component.location)}
                                            >
                                                <span className="text-sm text-muted-foreground">
                                                    {component.location || 'Non spécifié'}
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
