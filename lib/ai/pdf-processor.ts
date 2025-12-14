/**
 * PDF & Image Text Extraction Utilities
 * Extrait le texte depuis les PDFs et images pour l'analyse IA
 */

import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import { extractText } from 'unpdf'

/**
 * Extrait le texte d'un PDF via unpdf
 * @param fileUrl - URL du fichier dans Supabase Storage
 * @returns Texte extrait
 */
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
    try {
        // Télécharger le fichier
        const response = await fetch(fileUrl)
        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        // Extraire le texte avec unpdf
        const { text, totalPages } = await extractText(buffer, { mergePages: true })
        const extractedText = (text as string).trim()

        console.log(`[PDF Processor] Extracted ${extractedText.length} chars from ${totalPages} pages`)

        // Vérifier si le PDF est probablement scanné
        if (extractedText.length < 100) {
            console.warn('[PDF Processor] PDF appears to be scanned (low text content)')
            throw new Error('PDF appears to be scanned. Please use text-based PDFs or image upload for OCR.')
        }

        return extractedText

    } catch (error) {
        console.error('[PDF Processor] Extraction error:', error)
        throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}


/**
 * Effectue l'OCR sur une image
 * @param fileUrl - URL de l'image
 * @returns Texte reconnu
 */
export async function ocrImage(fileUrl: string): Promise<string> {
    try {
        console.log('[OCR] Starting image processing...')

        // Télécharger l'image
        const response = await fetch(fileUrl)
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Optimiser l'image avec sharp
        const optimizedImage = await sharp(buffer)
            .resize(2000, 2000, { // Max 2000px (maintain aspect ratio)
                fit: 'inside',
                withoutEnlargement: true
            })
            .grayscale() // Convertir en niveaux de gris
            .normalize() // Améliorer le contraste
            .toBuffer()

        console.log('[OCR] Image optimized, starting Tesseract...')

        // OCR avec Tesseract (français + anglais)
        const { data: { text } } = await Tesseract.recognize(
            optimizedImage,
            'eng+fra', // Langues: anglais et français
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`)
                    }
                }
            }
        )

        const recognizedText = text.trim()

        if (recognizedText.length < 50) {
            console.warn('[OCR] Low text recognition quality')
            throw new Error('OCR failed to extract meaningful text from image')
        }

        console.log(`[OCR] Successfully extracted ${recognizedText.length} characters`)
        return recognizedText

    } catch (error) {
        console.error('[OCR] Processing error:', error)
        throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Fonction router pour traiter tous types de fichiers
 * @param fileUrl - URL du fichier
 * @param fileType - Type MIME du fichier
 * @returns Texte extrait (tronqué à 100,000 caractères)
 */
export async function processFile(
    fileUrl: string,
    fileType: string
): Promise<string> {
    console.log(`[File Processor] Processing ${fileType} from ${fileUrl}`)

    let extractedText: string

    if (fileType === 'application/pdf') {
        extractedText = await extractTextFromPDF(fileUrl)
    } else if (fileType.startsWith('image/')) {
        extractedText = await ocrImage(fileUrl)
    } else {
        throw new Error(`Unsupported file type: ${fileType}`)
    }

    // Tronquer si trop long (limite Claude)
    const MAX_CHARS = 100000
    if (extractedText.length > MAX_CHARS) {
        console.warn(`[File Processor] Text truncated from ${extractedText.length} to ${MAX_CHARS} chars`)
        extractedText = extractedText.substring(0, MAX_CHARS) + '\n\n[Texte tronqué...]'
    }

    return extractedText
}

/**
 * Estime le nombre de tokens pour Claude
 * Règle approximative: 1 token ≈ 4 caractères
 * @param text - Texte à analyser
 * @returns Nombre estimé de tokens
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
}

/**
 * EXAMPLE USAGE:
 * 
 * // Pour un PDF
 * const pdfText = await processFile(
 *   'https://your-bucket.supabase.co/.../manual.pdf',
 *   'application/pdf'
 * )
 * 
 * // Pour une image
 * const imageText = await processFile(
 *   'https://your-bucket.supabase.co/.../nameplate.jpg',
 *   'image/jpeg'
 * )
 * 
 * // Estimation des tokens
 * const tokens = estimateTokens(pdfText)
 * console.log(`Estimated tokens: ${tokens}`)
 */
