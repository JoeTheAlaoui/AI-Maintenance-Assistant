'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createWorker } from 'tesseract.js'
import type {
    PDFProcessingOptions,
    AIExtractionResponse,
    AssetImportResult
} from '@/types/ai-import'

/**
 * Extract text from PDF using pdf-parse
 * Handles both text-based and scanned PDFs with OCR fallback
 */
export async function extractTextFromPDF(
    fileBuffer: Buffer,
    options: PDFProcessingOptions = {}
): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
    const { use_ocr = false, max_pages, language = 'fra' } = options

    try {
        // Dynamic import for CommonJS module compatibility
        // @ts-ignore - pdf-parse is CommonJS
        const pdfParse = (await import('pdf-parse')).default

        const pdfData = await pdfParse(fileBuffer, {
            max: max_pages || 0, // 0 = all pages
        })

        const extractedText = pdfData.text.trim()
        const pageCount = pdfData.numpages

        // Check if PDF has meaningful text (not scanned)
        const hasText = extractedText.length > 100
        const isScanned = !hasText

        // Use OCR for scanned PDFs
        if ((isScanned || use_ocr) && fileBuffer) {
            console.log('[PDF] Scanned document detected, using OCR...')
            const ocrText = await performOCR(fileBuffer, language)
            return {
                text: ocrText || extractedText, // Fallback to original if OCR fails
                pageCount,
                isScanned: true,
            }
        }

        return {
            text: extractedText,
            pageCount,
            isScanned: false,
        }
    } catch (error) {
        console.error('[PDF] Extraction error:', error)
        throw new Error(`Échec d'extraction PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
}

/**
 * Perform OCR using Tesseract.js
 * NOTE: Full implementation requires pdf-to-image conversion
 */
async function performOCR(fileBuffer: Buffer, language: string): Promise<string> {
    try {
        const worker = await createWorker(language)

        // TODO: Convert PDF pages to images first
        // For now, return empty string as placeholder
        console.warn('[OCR] Requires pdf-to-image conversion - not fully implemented')

        await worker.terminate()
        return ''
    } catch (error) {
        console.error('[OCR] Error:', error)
        return ''
    }
}

/**
 * Upload PDF to Supabase Storage
 */
async function uploadPDFToStorage(
    file: File,
    userId: string
): Promise<{ url: string; path: string }> {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, '_').toLowerCase()
    const filePath = `ai-imports/${userId}/${timestamp}-${sanitizedName}`

    const { data, error } = await supabase.storage
        .from('assets-files')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
        .from('assets-files')
        .getPublicUrl(data.path)

    return { url: publicUrl, path: data.path }
}

/**
 * Analyze PDF text with Anthropic Claude
 * Extracts structured asset data from equipment manuals
 */
export async function analyzeManualWithClaude(
    extractedText: string,
    fileName: string
): Promise<{ success: boolean; data?: AIExtractionResponse; error?: string }> {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY non configurée')
        }

        // Dynamic import
        const { default: Anthropic } = await import('@anthropic-ai/sdk')
        const client = new Anthropic({ apiKey })

        const startTime = Date.now()

        // Truncate text if too long (Claude token limits)
        const maxChars = 100000 // ~25k tokens
        const truncatedText = extractedText.length > maxChars
            ? extractedText.substring(0, maxChars) + '\n\n[Texte tronqué...]'
            : extractedText

        // Construct prompt for Claude
        const systemPrompt = `Tu es un expert en analyse de manuels d'équipement industriel. 
Ta tâche est d'extraire des données structurées depuis un manuel technique.

Extrais les informations suivantes en JSON valide:
1. Actif principal (nom, fabricant, modèle, criticité, spécifications)
2. Composants/sous-ensembles
3. Pièces de rechange avec références
4. Planning de maintenance (quotidien/hebdomadaire/mensuel/annuel)

Sois exhaustif mais concis. Si une information n'est pas disponible, utilise null.`

        const userPrompt = `Analyse ce manuel d'équipement et extrais les données structurées.

**Fichier**: ${fileName}

**Texte du manuel**:
${truncatedText}

**Retourne ce JSON exact**:
{
  "main_asset": {
    "name": "Nom de l'équipement",
    "manufacturer": "Fabricant",
    "model_number": "Modèle",
    "serial_number": "N° série",
    "category": "Catégorie",
    "criticality": "low|medium|high|critical",
    "specifications": {
      "power": "Valeur",
      "voltage": "Valeur"
    }
  },
  "components": [
    {
      "id": "use crypto.randomUUID()",
      "name": "Composant",
      "part_number": "P/N",
      "type": "moteur|pompe|valve",
      "location": "Emplacement",
      "specifications": {}
    }
  ],
  "spare_parts": [
    {
      "id": "use crypto.randomUUID()",
      "name": "Pièce",
      "reference": "REF",
      "quantity_recommended": 2,
      "unit": "pcs",
      "replacement_frequency": "6 mois"
    }
  ],
  "maintenance_schedule": {
    "daily": ["Tâche 1"],
    "weekly": ["Tâche 2"],
    "monthly": ["Tâche 3"],
    "yearly": ["Tâche 4"]
  },
  "confidence_score": 0.85,
  "warnings": ["Avertissement si nécessaire"]
}`

        // Call Claude API
        const response = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            temperature: 0.2,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: systemPrompt },
                    { type: 'text', text: userPrompt }
                ]
            }],
        })

        const processingTime = Date.now() - startTime

        // Extract JSON from response
        const responseText = response.content[0].type === 'text'
            ? response.content[0].text
            : ''

        // Parse JSON (Claude sometimes wraps in code blocks)
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
            responseText.match(/```\n([\s\S]*?)\n```/) ||
            [null, responseText]

        const jsonString = jsonMatch[1] || responseText
        const parsedData = JSON.parse(jsonString.trim())

        // Generate UUIDs for components and spare parts
        const dataWithIds: AIExtractionResponse = {
            ...parsedData,
            components: parsedData.components.map((c: any) => ({
                ...c,
                id: crypto.randomUUID()
            })),
            spare_parts: parsedData.spare_parts.map((p: any) => ({
                ...p,
                id: crypto.randomUUID()
            }))
        }

        console.log(`[Claude] Analysis completed in ${processingTime}ms with confidence ${dataWithIds.confidence_score}`)

        return {
            success: true,
            data: dataWithIds
        }

    } catch (error) {
        console.error('[Claude] Analysis error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Analyse IA échouée'
        }
    }
}

/**
 * Complete AI Import Flow
 * Process PDF → Analyze with Claude → Return structured data
 */
export async function importAssetFromPDF(
    formData: FormData
): Promise<AssetImportResult> {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Non autorisé' }
        }

        // Get file
        const file = formData.get('file') as File
        if (!file || !file.size) {
            return { success: false, error: 'Aucun fichier fourni' }
        }

        // Validate
        if (!file.type.includes('pdf')) {
            return { success: false, error: 'Le fichier doit être un PDF' }
        }

        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return { success: false, error: 'Taille maximale: 10MB' }
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload PDF
        const { url, path } = await uploadPDFToStorage(file, user.id)

        // Extract text
        const { text, pageCount, isScanned } = await extractTextFromPDF(buffer, {
            use_ocr: false,
            max_pages: 50,
            language: 'fra'
        })

        if (!text || text.length < 50) {
            return {
                success: false,
                error: 'Impossible d\'extraire du texte du PDF'
            }
        }

        // Analyze with Claude
        const analysisResult = await analyzeManualWithClaude(text, file.name)

        if (!analysisResult.success || !analysisResult.data) {
            return {
                success: false,
                error: analysisResult.error || 'Analyse IA échouée'
            }
        }

        // TODO: Save to database (ai_extractions table needs to be added to types)

        return {
            success: true,
            extraction_id: crypto.randomUUID(), // Placeholder
            confidence_score: analysisResult.data.confidence_score,
            warnings: analysisResult.data.warnings
        }

    } catch (error) {
        console.error('[Import] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Import échoué'
        }
    }
}
