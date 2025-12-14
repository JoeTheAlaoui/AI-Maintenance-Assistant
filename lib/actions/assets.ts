'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export async function createAsset(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const name = formData.get('name') as string
    const code = formData.get('code') as string
    const location = formData.get('location') as string
    const status = formData.get('status') as string
    const imageFile = formData.get('image') as File

    let imageUrl = null

    if (imageFile && imageFile.size > 0) {
        const fileName = `${Date.now()}-${imageFile.name}`
        const { error } = await supabase.storage
            .from('asset-images')
            .upload(fileName, imageFile)

        if (error) {
            console.error('Error uploading image:', error)
            return { error: 'Failed to upload image' }
        }

        const { data: publicUrlData } = supabase.storage
            .from('asset-images')
            .getPublicUrl(fileName)

        imageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('assets').insert({
        name,
        code,
        location,
        status,
        image_url: imageUrl,
    })

    if (error) {
        console.error('Error creating asset:', error)
        return { error: 'Failed to create asset' }
    }

    revalidatePath('/assets')
    return { success: true }
}

export async function updateAsset(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const code = formData.get('code') as string
    const location = formData.get('location') as string
    const status = formData.get('status') as string
    const imageFile = formData.get('image') as File

    const updates: Database['public']['Tables']['assets']['Update'] = {
        name,
        code,
        location,
        status,
    }

    if (imageFile && imageFile.size > 0) {
        const fileName = `${Date.now()}-${imageFile.name}`
        const { error } = await supabase.storage
            .from('asset-images')
            .upload(fileName, imageFile)

        if (error) {
            console.error('Error uploading image:', error)
            return { error: 'Failed to upload image' }
        }

        const { data: publicUrlData } = supabase.storage
            .from('asset-images')
            .getPublicUrl(fileName)

        updates.image_url = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('assets').update(updates).eq('id', id)

    if (error) {
        console.error('Error updating asset:', error)
        return { error: 'Failed to update asset' }
    }

    revalidatePath('/assets')
    return { success: true }
}

export async function deleteAsset(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.from('assets').delete().eq('id', id)

    if (error) {
        console.error('Error deleting asset:', error)
        return { error: 'Failed to delete asset' }
    }

    revalidatePath('/assets')
    return { success: true }
}
