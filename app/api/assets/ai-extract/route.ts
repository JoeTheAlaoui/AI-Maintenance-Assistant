import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { processFile, estimateTokens } from '@/lib/ai/pdf-processor'
import { extractEquipmentDataMultiPass, convertToLegacyFormat } from '@/lib/ai/extraction-pipeline'
import type { AIExtractionResponse } from '@/types/ai-import'

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
})

// Rate limiting (simple in-memory - use Redis in production)
const extractionCache = new Map<string, { count: number; resetAt: number }>()
const MAX_EXTRACTIONS_PER_HOUR = 10

/**
 * Check rate limit for AI extractions
 */
function checkExtractionRateLimit(userId: string): boolean {
    const now = Date.now()
    const userCache = extractionCache.get(userId)

    if (!userCache || now > userCache.resetAt) {
        extractionCache.set(userId, {
            count: 1,
            resetAt: now + 3600000 // +1 hour
        })
        return false
    }

    if (userCache.count >= MAX_EXTRACTIONS_PER_HOUR) {
        return true
    }

    userCache.count++
    return false
}

/**
 * POST /api/assets/ai-extract
 * Extrait les données d'équipement depuis un PDF avec le pipeline multi-passes
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Parse request
        const body = await req.json()
        const {
            file_url,
            file_name,
            file_type,
            use_multi_pass = true, // Par défaut: utiliser le nouveau pipeline
            context
        } = body

        if (!file_url) {
            return NextResponse.json(
                { success: false, error: 'URL du fichier requise' },
                { status: 400 }
            )
        }

        // 2. Auth check
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            )
        }

        // 3. Rate limit check
        if (checkExtractionRateLimit(user.id)) {
            return NextResponse.json(
                { success: false, error: 'Limite d\'extractions atteinte (10/heure)' },
                { status: 429 }
            )
        }

        // 4. Extract text from file
        console.log(`[AI Extract] Processing file: ${file_name || file_url}`)
        const extractedText = await processFile(file_url, file_type)
        const estimatedInputTokens = estimateTokens(extractedText)

        console.log(`[AI Extract] Extracted ${extractedText.length} chars (~${estimatedInputTokens} tokens)`)

        // 5. Choisir le mode d'extraction
        if (use_multi_pass) {
            // ============================================
            // NOUVEAU: PIPELINE MULTI-PASSES (5 passes)
            // ============================================
            console.log('[AI Extract] Using MULTI-PASS pipeline (5 passes)...')

            const startTime = Date.now()

            const fullResult = await extractEquipmentDataMultiPass(
                extractedText,
                anthropic,
                { maxTokensPerPass: 8000 }
            )

            const processingTime = Date.now() - startTime

            console.log(`[AI Extract] Multi-pass complete!`)
            console.log(`[AI Extract] Completeness: ${fullResult.validation.completeness_score}%`)
            console.log(`[AI Extract] Confidence: ${fullResult.validation.confidence_score}`)
            console.log(`[AI Extract] Total tokens: ${fullResult.extraction_metadata.total_tokens}`)
            console.log(`[AI Extract] Cost: $${fullResult.extraction_metadata.cost_usd.toFixed(4)}`)
            console.log(`[AI Extract] Time: ${processingTime}ms`)

            // Convertir vers format legacy pour compatibilité frontend
            const legacyData = convertToLegacyFormat(fullResult)

            // Retourner la réponse enrichie
            return NextResponse.json({
                success: true,
                data: {
                    ...legacyData,
                    // Ajouter les nouvelles données du multi-pass
                    model_configurations: fullResult.model_configurations,
                    integrated_subsystems: fullResult.integrated_subsystems,
                    electrical_components: fullResult.electrical_components,
                    motor_protection_settings: fullResult.motor_protection_settings,
                    control_sequences: fullResult.control_sequences,
                    specification_tables: fullResult.specification_tables,
                    diagnostic_codes: fullResult.diagnostic_codes,
                    full_maintenance_schedule: fullResult.maintenance_schedule,
                    // Métadonnées enrichies
                    extraction_mode: 'multi_pass',
                    passes_count: 5,
                    completeness_score: fullResult.validation.completeness_score,
                    confidence_score: fullResult.validation.confidence_score,
                    validation: fullResult.validation
                },
                cost: {
                    tokens_used: fullResult.extraction_metadata.total_tokens,
                    cost_usd: fullResult.extraction_metadata.cost_usd,
                    cost_mad: fullResult.extraction_metadata.cost_usd * 10
                },
                processing_time_ms: processingTime,
                file_name,
                file_url,
                file_type
            }, { status: 200 })

        } else {
            // ============================================
            // LEGACY: SINGLE-PASS EXTRACTION
            // ============================================
            console.log('[AI Extract] Using LEGACY single-pass...')
            return await handleLegacyExtraction(
                extractedText,
                file_name,
                file_url,
                file_type,
                context,
                user.id,
                supabase
            )
        }

    } catch (error) {
        console.error('[AI Extract] Error:', error)

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur lors de l\'extraction'
        }, { status: 500 })
    }
}

/**
 * Legacy single-pass extraction (pour rétrocompatibilité)
 */
async function handleLegacyExtraction(
    extractedText: string,
    file_name: string | undefined,
    file_url: string,
    file_type: string,
    context: { facility_type?: string; language?: string } | undefined,
    userId: string,
    supabase: Awaited<ReturnType<typeof createClient>>
): Promise<NextResponse> {
    // Build legacy prompt
    const systemPrompt = `You are a Senior Maintenance Engineer with 20 years of experience.

TASK: Analyze this equipment documentation and extract structured maintenance data.

OUTPUT: Return ONLY valid JSON with this structure:
{
  "confidence_score": 0.85,
  "main_asset": {
    "name": "Equipment Name",
    "manufacturer": "Manufacturer",
    "model_number": "Model",
    "category": "compressor|pump|motor|generator|other",
    "criticality": "low|medium|high",
    "specifications": {}
  },
  "components": [
    {"id": "uuid", "name": "Component", "type": "motor|pump|valve|filter", "location": "Location", "specifications": {}}
  ],
  "spare_parts": [
    {"id": "uuid", "name": "Part", "reference": "REF", "quantity_recommended": 1, "unit": "piece"}
  ],
  "maintenance_schedule": {
    "daily": [], "weekly": [], "monthly": [], "yearly": []
  }
}`

    const userPrompt = `Analyze this equipment manual and extract ALL maintenance-relevant data:

${extractedText.substring(0, 80000)}`

    console.log('[AI Extract] Calling Claude API (legacy mode)...')
    const startTime = Date.now()

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: systemPrompt },
                { type: 'text', text: userPrompt }
            ]
        }]
    })

    const processingTime = Date.now() - startTime
    console.log(`[AI Extract] Claude response received in ${processingTime}ms`)

    // Parse response
    const content = response.content[0]
    if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
    }

    // Extract JSON
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
    }

    const extractedData = JSON.parse(jsonMatch[0])

    // Add IDs if missing
    if (extractedData.components) {
        extractedData.components = extractedData.components.map((c: Record<string, unknown>, i: number) => ({
            ...c,
            id: c.id || `comp-${Date.now()}-${i}`
        }))
    }
    if (extractedData.spare_parts) {
        extractedData.spare_parts = extractedData.spare_parts.map((p: Record<string, unknown>, i: number) => ({
            ...p,
            id: p.id || `part-${Date.now()}-${i}`
        }))
    }

    // Calculate cost
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    const costUsd = (tokensUsed / 1_000_000) * 9 // Approximation

    console.log(`[AI Extract] Confidence: ${extractedData.confidence_score}, Cost: $${costUsd.toFixed(4)}`)

    return NextResponse.json({
        success: true,
        data: {
            ...extractedData,
            extraction_mode: 'legacy',
            passes_count: 1
        },
        cost: {
            tokens_used: tokensUsed,
            cost_usd: costUsd,
            cost_mad: costUsd * 10
        },
        processing_time_ms: processingTime,
        file_name,
        file_url,
        file_type
    }, { status: 200 })
}
