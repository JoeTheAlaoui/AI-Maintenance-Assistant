'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assetSchema, type AssetFormValues } from './asset-schema'
import { createAsset, updateAsset } from '@/lib/actions/assets'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Database } from '@/types/database.types'

type Asset = Database['public']['Tables']['assets']['Row']

interface AssetDialogProps {
    asset?: Asset
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function AssetDialog({ asset, open, onOpenChange, trigger }: AssetDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [internalOpen, setInternalOpen] = useState(false)

    // Handle controlled vs uncontrolled open state
    const isOpen = open !== undefined ? open : internalOpen
    const setIsOpen = onOpenChange || setInternalOpen

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: asset?.name || '',
            code: asset?.code || '',
            location: asset?.location || '',
            status: (asset?.status as "operational" | "down" | "maintenance") || 'operational',
        },
    })

    async function onSubmit(values: {
        name: string;
        code: string;
        location: string;
        status: "operational" | "down" | "maintenance";
    }) {
        startTransition(async () => {
            const formData = new FormData()
            if (asset) {
                formData.append('id', asset.id)
            }
            formData.append('name', values.name)
            formData.append('code', values.code)
            formData.append('location', values.location)
            formData.append('status', values.status)

            // Handle file input manually since react-hook-form doesn't fully control file inputs
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
            if (fileInput?.files?.[0]) {
                formData.append('image', fileInput.files[0])
            }

            const result = asset ? await updateAsset(formData) : await createAsset(formData)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(asset ? 'Asset updated' : 'Asset created')
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
                    <DialogTitle>{asset ? 'Edit Asset' : 'Create Asset'}</DialogTitle>
                    <DialogDescription>
                        {asset ? 'Update asset details.' : 'Add a new asset to your inventory.'}
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
                                        <Input placeholder="Hydraulic Pump" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="PUMP-001" {...field} />
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
                                    <FormLabel>Location</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Zone A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="operational">Operational</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="down">Down</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormItem>
                            <FormLabel>Image</FormLabel>
                            <FormControl>
                                <Input type="file" accept="image/*" />
                            </FormControl>
                        </FormItem>
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
