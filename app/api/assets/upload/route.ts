import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const STORAGE_BUCKET = 'ai-uploads'

// Rate limiting cache (en production, utilisez Redis)
const uploadCache = new Map<string, { count: number; resetAt: number }>()
const MAX_UPLOADS_PER_HOUR = 10

/**
 * Sanitize filename - Supprime les caractères spéciaux et espaces
 * @param filename - Nom du fichier original
 * @returns Nom du fichier sécurisé
 */
function sanitizeFilename(filename: string): string {
    // Extraire l'extension
    const lastDotIndex = filename.lastIndexOf('.')
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
    const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : ''

    // Remplacer caractères spéciaux par underscores
    const sanitized = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

    return `${sanitized}${ext}`
}

/**
 * Check rate limit - Limite le nombre d'uploads par heure
 * @param userId - ID de l'utilisateur
 * @returns true si la limite est atteinte
 */
function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const userCache = uploadCache.get(userId)

    if (!userCache || now > userCache.resetAt) {
        // Nouvelle fenêtre d'une heure
        uploadCache.set(userId, {
            count: 1,
            resetAt: now + 3600000 // +1 heure
        })
        return false
    }

    if (userCache.count >= MAX_UPLOADS_PER_HOUR) {
        return true // Limite atteinte
    }

    // Incrémenter le compteur
    userCache.count++
    return false
}

/**
 * POST /api/assets/upload
 * Upload un fichier PDF ou image vers Supabase Storage
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Vérification de l'authentification
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[Upload API] Unauthorized access attempt')
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            )
        }

        // 2. Rate limiting
        if (checkRateLimit(user.id)) {
            console.warn(`[Upload API] Rate limit exceeded for user ${user.id}`)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Limite d\'uploads atteinte (10 par heure)'
                },
                { status: 429 }
            )
        }

        // 3. Parse FormData
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'Aucun fichier fourni' },
                { status: 400 }
            )
        }

        // 4. Validation du type de fichier
        if (!ALLOWED_TYPES.includes(file.type)) {
            console.warn(`[Upload API] Invalid file type: ${file.type}`)
            return NextResponse.json(
                {
                    success: false,
                    error: `Type de fichier non autorisé. Acceptés: PDF, JPEG, PNG`
                },
                { status: 400 }
            )
        }

        // 5. Validation de la taille
        if (file.size > MAX_FILE_SIZE) {
            console.warn(`[Upload API] File too large: ${file.size} bytes`)
            return NextResponse.json(
                {
                    success: false,
                    error: `Fichier trop volumineux (max: 50MB, reçu: ${Math.round(file.size / 1024 / 1024)}MB)`
                },
                { status: 413 }
            )
        }

        // 6. Sanitize et génère le nom de fichier unique
        const timestamp = Date.now()
        const sanitizedName = sanitizeFilename(file.name)
        const uniqueFilename = `${user.id}/${timestamp}_${sanitizedName}`

        // 7. Upload vers Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(uniqueFilename, file, {
                cacheControl: '3600',
                upsert: false,
            })

        if (uploadError) {
            console.error('[Upload API] Supabase upload error:', uploadError)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Échec de l\'upload. Veuillez réessayer.'
                },
                { status: 500 }
            )
        }

        // 8. Créer une URL signée (valide 1 heure) - fonctionne avec buckets privés
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(data.path, 3600) // 1 hour expiry

        if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('[Upload API] Failed to create signed URL:', signedUrlError)
            // Fallback: essayer l'URL publique
            const { data: { publicUrl } } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(data.path)

            const response = {
                success: true,
                file_url: publicUrl,
                file_name: sanitizedName,
                file_size_bytes: file.size,
                file_type: file.type,
                uploaded_at: new Date().toISOString()
            }
            console.log(`[Upload API] File uploaded (public URL): ${uniqueFilename}`)
            return NextResponse.json(response, { status: 200 })
        }

        // 9. Réponse de succès avec URL signée
        const response = {
            success: true,
            file_url: signedUrlData.signedUrl,
            file_name: sanitizedName,
            file_size_bytes: file.size,
            file_type: file.type,
            uploaded_at: new Date().toISOString()
        }

        console.log(`[Upload API] File uploaded successfully: ${uniqueFilename}`)

        return NextResponse.json(response, { status: 200 })


    } catch (error) {
        console.error('[Upload API] Unexpected error:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Erreur serveur lors de l\'upload'
            },
            { status: 500 }
        )
    }
}
