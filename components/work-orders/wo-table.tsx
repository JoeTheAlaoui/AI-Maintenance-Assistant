
import Link from 'next/link'
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
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Eye, Trash } from 'lucide-react'
import { Database } from '@/types/database.types'
import { deleteWorkOrder } from '@/lib/actions/work-orders'
import { toast } from 'sonner'

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
    assets?: Database['public']['Tables']['assets']['Row']
    profiles?: Database['public']['Tables']['profiles']['Row'] | null
}

interface WoTableProps {
    workOrders: WorkOrder[]
}

export function WoTable({ workOrders }: WoTableProps) {
    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this work order?')) {
            void (async () => {
                const result = await deleteWorkOrder(id)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success('Work order deleted')
                }
            })()
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

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {workOrders.map((wo) => (
                        <TableRow key={wo.id}>
                            <TableCell className="font-mono text-sm">
                                {wo.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                                {wo.description}
                            </TableCell>
                            <TableCell>
                                {wo.assets?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                                {wo.profiles?.full_name || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                                <Badge className={getPriorityColor(wo.priority)}>
                                    {wo.priority || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge className={getStatusColor(wo.status)}>
                                    {wo.status || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/work-orders/${wo.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleDelete(wo.id)}
                                            className="text-red-600 focus:text-red-600"
                                        >
                                            <Trash className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
