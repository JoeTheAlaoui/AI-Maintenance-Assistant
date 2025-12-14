'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export async function createPart(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const name = formData.get('name') as string
    const reference = formData.get('reference') as string
    const stock_qty = parseInt(formData.get('stock_qty') as string, 10)
    const min_threshold = parseInt(formData.get('min_threshold') as string, 10)
    const location = formData.get('location') as string

    // Validate non-negative integers
    if (stock_qty < 0 || min_threshold < 0) {
        return { error: 'Stock quantity and minimum threshold must be non-negative' }
    }

    const { error } = await supabase.from('inventory').insert({
        name,
        reference,
        stock_qty,
        min_threshold,
        location: location || null,
    })

    if (error) {
        console.error('Error creating part:', error)
        return { error: 'Failed to create part' }
    }

    revalidatePath('/inventory')
    return { success: true }
}

export async function updatePart(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const reference = formData.get('reference') as string
    const stock_qty = parseInt(formData.get('stock_qty') as string, 10)
    const min_threshold = parseInt(formData.get('min_threshold') as string, 10)
    const location = formData.get('location') as string

    // Validate non-negative integers
    if (stock_qty < 0 || min_threshold < 0) {
        return { error: 'Stock quantity and minimum threshold must be non-negative' }
    }

    const updates: Database['public']['Tables']['inventory']['Update'] = {
        name,
        reference,
        stock_qty,
        min_threshold,
        location: location || null,
    }

    const { error } = await supabase.from('inventory').update(updates).eq('id', id)

    if (error) {
        console.error('Error updating part:', error)
        return { error: 'Failed to update part' }
    }

    revalidatePath('/inventory')
    return { success: true }
}

export async function deletePart(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.from('inventory').delete().eq('id', id)

    if (error) {
        console.error('Error deleting part:', error)
        return { error: 'Failed to delete part' }
    }

    revalidatePath('/inventory')
    return { success: true }
}
