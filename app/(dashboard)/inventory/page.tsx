import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { InventoryDialog } from '@/components/inventory/inventory-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RouteGuard } from '@/components/route-guard'

export default async function InventoryPage() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: parts, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching inventory:', error)
        return <div>Error loading inventory</div>
    }

    return (
        <RouteGuard feature="INVENTORY_VIEW">
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                        <p className="text-muted-foreground">
                            Manage your spare parts and track stock levels.
                        </p>
                    </div>
                    <InventoryDialog
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Part
                            </Button>
                        }
                    />
                </div>

                <InventoryTable parts={parts || []} />
            </div>
        </RouteGuard>
    )
}
