import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { WoTable } from '@/components/work-orders/wo-table'
import { WoDialog } from '@/components/work-orders/wo-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RouteGuard } from '@/components/route-guard'

export default async function WorkOrdersPage() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select(`
      *,
      assets:asset_id (*),
      profiles:assigned_to (*)
    `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching work orders:', error)
        return <div>Error loading work orders</div>
    }

    return (
        <RouteGuard feature="WORK_ORDERS_VIEW">
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
                        <p className="text-muted-foreground">
                            Manage maintenance work orders and track their status.
                        </p>
                    </div>
                    <WoDialog
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Work Order
                            </Button>
                        }
                    />
                </div>

                <WoTable workOrders={workOrders || []} />
            </div>
        </RouteGuard>
    )
}
