'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inventorySchema, type InventoryFormValues } from './inventory-schema'
import { createPart, updatePart } from '@/lib/actions/inventory'
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Database } from '@/types/database.types'

type InventoryPart = Database['public']['Tables']['inventory']['Row']

interface InventoryDialogProps {
    part?: InventoryPart
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function InventoryDialog({ part, open, onOpenChange, trigger }: InventoryDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [internalOpen, setInternalOpen] = useState(false)

    const isOpen = open !== undefined ? open : internalOpen
    const setIsOpen = onOpenChange || setInternalOpen

    const form = useForm<InventoryFormValues>({
        resolver: zodResolver(inventorySchema),
        defaultValues: {
            name: part?.name || '',
            reference: part?.reference || '',
            stock_qty: part?.stock_qty || 0,
            min_threshold: part?.min_threshold || 0,
            location: part?.location || '',
        },
    })

    async function onSubmit(values: {
        name: string;
        reference: string;
        stock_qty: number;
        min_threshold: number;
        location?: string;
    }) {
        startTransition(async () => {
            const formData = new FormData()
            if (part) {
                formData.append('id', part.id)
            }
            formData.append('name', values.name)
            formData.append('reference', values.reference)
            formData.append('stock_qty', values.stock_qty.toString())
            formData.append('min_threshold', values.min_threshold.toString())
            formData.append('location', values.location || '')

            const result = part ? await updatePart(formData) : await createPart(formData)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(part ? 'Part updated' : 'Part created')
                setIsOpen(false)
                form.reset()
            }
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{part ? 'Edit Part' : 'Add Part'}</DialogTitle>
                    <DialogDescription>
                        {part ? 'Update spare part details.' : 'Add a new spare part to inventory.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Bearing SKF 6205" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="reference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reference</FormLabel>
                                    <FormControl>
                                        <Input placeholder="SKF-6205-2RS" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stock_qty"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Quantity</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            value={field.value}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="min_threshold"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Minimum Threshold</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            value={field.value}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Warehouse A, Shelf 3" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
