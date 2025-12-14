'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getDashboardStats() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Execute parallel queries for better performance
    const [
        { count: totalAssets },
        { count: criticalAssets },
        { count: openWorkOrders },
        { data: inventoryData },
    ] = await Promise.all([
        // Total assets
        supabase.from('assets').select('*', { count: 'exact', head: true }),

        // Critical assets (status = 'down')
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'down'),

        // Open work orders (status = 'open' or 'in_progress')
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),

        // Low stock items - fetch inventory to filter
        supabase.from('inventory').select('stock_qty, min_threshold'),
    ])

    // Calculate low stock items where stock_qty <= min_threshold
    const lowStockItems = inventoryData?.filter(
        (item) => item.stock_qty <= (item.min_threshold || 0)
    ).length || 0

    return {
        totalAssets: totalAssets || 0,
        criticalAssets: criticalAssets || 0,
        openWorkOrders: openWorkOrders || 0,
        lowStockItems,
    }
}

export async function getRecentActivity() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: workOrders } = await supabase
        .from('work_orders')
        .select(`
      *,
      assets:asset_id (name, code),
      profiles:assigned_to (full_name)
    `)
        .order('created_at', { ascending: false })
        .limit(5)

    return workOrders || []
}

export async function getWorkOrderStatusStats() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const [
        { count: openCount },
        { count: inProgressCount },
        { count: closedCount },
    ] = await Promise.all([
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    ])

    return [
        { name: 'Open', value: openCount || 0, fill: '#3b82f6' },
        { name: 'In Progress', value: inProgressCount || 0, fill: '#eab308' },
        { name: 'Closed', value: closedCount || 0, fill: '#22c55e' },
    ]
}
