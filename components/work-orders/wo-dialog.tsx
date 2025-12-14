'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workOrderSchema, type WorkOrderFormValues } from './wo-schema'
import { createWorkOrder } from '@/lib/actions/work-orders'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'

type Asset = Database['public']['Tables']['assets']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface WoDialogProps {
    trigger?: React.ReactNode
}

export function WoDialog({ trigger }: WoDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const [assets, setAssets] = useState<Asset[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    const form = useForm<WorkOrderFormValues>({
        resolver: zodResolver(workOrderSchema),
        defaultValues: {
            description: '',
            priority: 'medium',
            status: 'open',
            asset_id: '',
            assigned_to: '',
        },
    })

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                const supabase = createClient()

                const [assetsRes, profilesRes] = await Promise.all([
                    supabase.from('assets').select('*').order('name'),
                    supabase.from('profiles').select('*').order('full_name'),
                ])

                if (assetsRes.data) setAssets(assetsRes.data)
                if (profilesRes.data) setProfiles(profilesRes.data)
                setLoading(false)
            }

            fetchData()
        }
    }, [open])

    async function onSubmit(values: {
        description: string;
        priority: "low" | "medium" | "high" | "critical";
        status: "open" | "in_progress" | "closed";
        asset_id: string;
        assigned_to?: string;
        solution_notes?: string;
    }) {
        startTransition(async () => {
            const formData = new FormData()
            formData.append('description', values.description)
            formData.append('priority', values.priority)
            formData.append('status', values.status)
            formData.append('asset_id', values.asset_id)
            formData.append('assigned_to', values.assigned_to || '')

            const result = await createWorkOrder(formData)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Work order created')
                setOpen(false)
                form.reset()
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create Work Order</DialogTitle>
                    <DialogDescription>
                        Create a new work order for an asset.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="asset_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Asset</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={loading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an asset" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {assets.map((asset) => (
                                                <SelectItem key={asset.id} value={asset.id}>
                                                    {asset.name} ({asset.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="assigned_to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assigned To (Optional)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={loading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a technician" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {profiles.map((profile) => (
                                                <SelectItem key={profile.id} value={profile.id}>
                                                    {profile.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe the maintenance task..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isPending || loading}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Work Order
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
