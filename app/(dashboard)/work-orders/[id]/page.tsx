'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getWorkOrderDetails, updateWorkOrderStatus } from '@/lib/actions/work-orders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WoPartsManager } from '@/components/work-orders/wo-parts-manager'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type WorkOrderWithRelations = Database['public']['Tables']['work_orders']['Row'] & {
    assets?: Database['public']['Tables']['assets']['Row']
    profiles?: Database['public']['Tables']['profiles']['Row'] | null
}

type WorkOrderPart = {
    id: string
    quantity_used: number
    inventory: Database['public']['Tables']['inventory']['Row']
}

export default function WorkOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [workOrder, setWorkOrder] = useState<WorkOrderWithRelations | null>(null)
    const [parts, setParts] = useState<WorkOrderPart[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    const id = params.id as string

    useEffect(() => {
        const fetchDetails = async () => {
            const result = await getWorkOrderDetails(id)
            if (result.error) {
                toast.error(result.error)
                router.push('/work-orders')
            } else {
                setWorkOrder(result.workOrder as WorkOrderWithRelations)
                setParts((result.parts || []) as WorkOrderPart[])
            }
            setLoading(false)
        }

        fetchDetails()
    }, [id, router])

    const handleStatusChange = async (newStatus: string) => {
        setUpdating(true)
        const result = await updateWorkOrderStatus(id, newStatus)
        setUpdating(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Status updated')
            if (workOrder) {
                setWorkOrder({ ...workOrder, status: newStatus })
            }
        }
    }

    const getPriorityColor = (priority: string | null) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-500 hover:bg-red-600'
            case 'high':
                return 'bg-orange-500 hover:bg-orange-600'
            case 'medium':
                return 'bg-yellow-500 hover:bg-yellow-600'
            case 'low':
                return 'bg-primary hover:bg-primary/90'
            default:
                return 'bg-secondary hover:bg-secondary/80'
        }
    }

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'open':
                return 'bg-primary hover:bg-primary/90'
            case 'in_progress':
                return 'bg-yellow-500 hover:bg-yellow-600'
            case 'closed':
                return 'bg-green-500 hover:bg-green-600'
            default:
                return 'bg-secondary hover:bg-secondary/80'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!workOrder) {
        return <div>Work order not found</div>
    }

    return (
        <div className="container mx-auto px-4 py-10 md:px-8">
            <div className="mb-6">
                <Link href="/work-orders">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Work Orders
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Work Order Details</CardTitle>
                                <CardDescription className="font-mono text-sm mt-1">
                                    ID: {workOrder.id}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Badge className={getPriorityColor(workOrder.priority)}>
                                    {workOrder.priority}
                                </Badge>
                                <Badge className={getStatusColor(workOrder.status)}>
                                    {workOrder.status}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Description</h3>
                            <p className="text-muted-foreground">{workOrder.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold mb-2">Asset</h3>
                                <p>{workOrder.assets?.name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">
                                    Code: {workOrder.assets?.code || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Assigned To</h3>
                                <p>{workOrder.profiles?.full_name || 'Unassigned'}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Change Status</h3>
                            <Select
                                value={workOrder.status || 'open'}
                                onValueChange={handleStatusChange}
                                disabled={updating}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Parts Management</CardTitle>
                        <CardDescription>
                            Manage spare parts used in this work order
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WoPartsManager workOrderId={id} initialParts={parts} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
