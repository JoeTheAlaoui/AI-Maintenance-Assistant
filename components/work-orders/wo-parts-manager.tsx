'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { addPartToWorkOrder } from '@/lib/actions/work-orders'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type InventoryPart = Database['public']['Tables']['inventory']['Row']
type WorkOrderPart = {
    id: string
    quantity_used: number
    inventory: InventoryPart
}

interface WoPartsManagerProps {
    workOrderId: string
    initialParts: WorkOrderPart[]
}

export function WoPartsManager({ workOrderId, initialParts }: WoPartsManagerProps) {
    const [open, setOpen] = useState(false)
    const [availableParts, setAvailableParts] = useState<InventoryPart[]>([])
    const [selectedPartId, setSelectedPartId] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            const fetchParts = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('inventory')
                    .select('*')
                    .order('name')

                if (data) setAvailableParts(data)
            }

            fetchParts()
        }
    }, [open])

    const handleAddPart = async () => {
        if (!selectedPartId || quantity < 1) {
            toast.error('Please select a part and enter a valid quantity')
            return
        }

        setLoading(true)
        const result = await addPartToWorkOrder(workOrderId, selectedPartId, quantity)
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Part added to work order')
            setOpen(false)
            setSelectedPartId('')
            setQuantity(1)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Parts Used</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Part
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Part to Work Order</DialogTitle>
                            <DialogDescription>
                                Select a part from inventory and specify the quantity used.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="part">Part</Label>
                                <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a part" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableParts.map((part) => (
                                            <SelectItem key={part.id} value={part.id}>
                                                {part.name} ({part.reference}) - Stock: {part.stock_qty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddPart} disabled={loading}>
                                Add Part
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Part Name</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Quantity Used</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialParts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    No parts used yet
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialParts.map((part) => (
                                <TableRow key={part.id}>
                                    <TableCell>{part.inventory.name}</TableCell>
                                    <TableCell>{part.inventory.reference}</TableCell>
                                    <TableCell>{part.quantity_used}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
