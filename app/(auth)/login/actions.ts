'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
    console.log('Login action called')

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    console.log('Attempting login with email:', email)

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.log('Login error:', error.message)
        return { error: error.message }
    }

    console.log('Login successful, redirecting...')
    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
