'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export async function createWorkOrder(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const status = formData.get('status') as string
    const asset_id = formData.get('asset_id') as string
    const assigned_to = formData.get('assigned_to') as string

    const { error } = await supabase.from('work_orders').insert({
        description,
        priority,
        status,
        asset_id,
        assigned_to: assigned_to || null,
    })

    if (error) {
        console.error('Error creating work order:', error)
        return { error: 'Failed to create work order' }
    }

    revalidatePath('/work-orders')
    return { success: true }
}

export async function updateWorkOrderStatus(id: string, status: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const updates: Database['public']['Tables']['work_orders']['Update'] = {
        status,
    }

    if (status === 'closed') {
        updates.closed_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error('Error updating work order status:', error)
        return { error: 'Failed to update status' }
    }

    revalidatePath('/work-orders')
    revalidatePath(`/work-orders/${id}`)
    return { success: true }
}

export async function addPartToWorkOrder(
    workOrderId: string,
    partId: string,
    quantity: number
) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.from('work_order_parts').insert({
        work_order_id: workOrderId,
        part_id: partId,
        quantity_used: quantity,
    })

    if (error) {
        console.error('Error adding part to work order:', error)
        return { error: 'Failed to add part. Check inventory levels.' }
    }

    revalidatePath(`/work-orders/${workOrderId}`)
    revalidatePath('/inventory')
    return { success: true }
}

export async function getWorkOrderDetails(id: string): Promise<{
    workOrder?: unknown
    parts?: unknown[]
    error?: string
}> {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select(`
      *,
      assets:asset_id (*),
      profiles:assigned_to (*)
    `)
        .eq('id', id)
        .single()

    if (woError) {
        console.error('Error fetching work order:', woError)
        return { error: 'Work order not found' }
    }

    const { data: parts, error: partsError } = await supabase
        .from('work_order_parts')
        .select(`
      *,
      inventory:part_id (*)
    `)
        .eq('work_order_id', id)

    if (partsError) {
        console.error('Error fetching parts:', partsError)
        return { workOrder, parts: [] }
    }

    return { workOrder, parts: parts || [] }
}

export async function deleteWorkOrder(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.from('work_orders').delete().eq('id', id)

    if (error) {
        console.error('Error deleting work order:', error)
        return { error: 'Failed to delete work order' }
    }

    revalidatePath('/work-orders')
    return { success: true }
}

export async function updateWorkOrder(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const id = formData.get('id') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const status = formData.get('status') as string
    const asset_id = formData.get('asset_id') as string
    const assigned_to = formData.get('assigned_to') as string
    const solution_notes = formData.get('solution_notes') as string

    const updates: Database['public']['Tables']['work_orders']['Update'] = {
        description,
        priority,
        status,
        asset_id,
        assigned_to: assigned_to || null,
        solution_notes: solution_notes || null,
    }

    const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error('Error updating work order:', error)
        return { error: 'Failed to update work order' }
    }

    revalidatePath('/work-orders')
    revalidatePath(`/work-orders/${id}`)
    return { success: true }
}
