/**
 * Multi-Pass Extraction Pipeline
 * Pipeline d'extraction en 5 passes pour 90%+ de complétude
 */

import type {
    CompleteExtractionResult,
    ExtractionMetadata,
    ValidationResult,
    ValidationCheck,
    CoreComponent,
    IntegratedSubsystem,
    ElectricalComponent,
    MotorProtectionSetting,
    ControlSequence,
    SpecificationTable,
    SparePartSchedule,
    MaintenanceSchedule,
    DiagnosticCode,
    ModelConfiguration,
    DocumentSections
} from '@/types/extraction-pipeline'

import { detectDocumentSections, splitTextIntoChunks } from './section-detector'
import {
    PASS1_SYSTEM_PROMPT, PASS1_USER_PROMPT,
    PASS2_SYSTEM_PROMPT, PASS2_USER_PROMPT,
    PASS3_SYSTEM_PROMPT, PASS3_USER_PROMPT,
    PASS4_SYSTEM_PROMPT, PASS4_USER_PROMPT,
    PASS5_SYSTEM_PROMPT, PASS5_USER_PROMPT
} from './extraction-prompts'

// ============================================
// TYPES INTERNES
// ============================================

interface PassResult<T> {
    success: boolean
    data: T | null
    error?: string
    tokensUsed: number
    timeMs: number
}

interface Pass1Result {
    main_asset: CompleteExtractionResult['main_asset']
    model_configurations: ModelConfiguration[]
    components: CoreComponent[]
}

interface Pass2Result {
    integrated_subsystems: IntegratedSubsystem[]
}

interface Pass3Result {
    electrical_components: ElectricalComponent[]
    motor_protection_settings: MotorProtectionSetting[]
    control_sequences: ControlSequence[]
}

interface Pass4Result {
    specification_tables: SpecificationTable[]
}

interface Pass5Result {
    maintenance_schedule: MaintenanceSchedule
    spare_parts: SparePartSchedule[]
    diagnostic_codes: DiagnosticCode[]
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

/**
 * Extrait les données d'équipement avec le pipeline multi-passes
 * @param pdfText - Texte complet du PDF
 * @param claudeClient - Client Anthropic
 * @param options - Options d'extraction
 */
export async function extractEquipmentDataMultiPass(
    pdfText: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    claudeClient: any,
    options: {
        maxTokensPerPass?: number
        includeAllPasses?: boolean
        enableRetry?: boolean
    } = {}
): Promise<CompleteExtractionResult> {
    const startTime = Date.now()
    const maxTokens = options.maxTokensPerPass || 8000
    const enableRetry = options.enableRetry !== false // Default to true

    console.log('[Extraction Pipeline] Starting multi-pass extraction...')

    // 1. Détecter les sections du document
    const sections = detectDocumentSections(pdfText)
    console.log('[Extraction Pipeline] Detected sections:', Object.keys(sections))

    // 2. Préparer le texte pour chaque pass

    // Pour les specs: utiliser la 1ère moitié du PDF (où se trouvent les tableaux de modèles)
    const pdfFirstHalf = pdfText.substring(0, Math.floor(pdfText.length / 2))
    const textForSpecs = sections.specifications?.text
        ? sections.specifications.text + '\n\n' + pdfFirstHalf
        : pdfFirstHalf

    const textForSubsystems = sections.dryer?.text || sections.specifications?.text || pdfText.substring(0, 50000)

    // Pour l'électrique: utiliser la 2ème moitié du PDF (où se trouvent généralement les schémas)
    // + la section détectée si disponible
    const pdfSecondHalf = pdfText.substring(Math.floor(pdfText.length / 2))
    const textForElectrical = sections.electrical?.text
        ? sections.electrical.text + '\n\n' + pdfSecondHalf
        : pdfSecondHalf

    const textForMaintenance = sections.maintenance?.text || sections.troubleshooting?.text || pdfText

    // DEBUG: Log section sizes
    console.log(`[Extraction Pipeline] Section sizes:`)
    console.log(`  - Specs: ${textForSpecs.length} chars (sections.specifications: ${sections.specifications?.text?.length || 0})`)
    console.log(`  - Subsystems: ${textForSubsystems.length} chars`)
    console.log(`  - Electrical: ${textForElectrical.length} chars (sections.electrical: ${sections.electrical?.text?.length || 0})`)
    console.log(`  - Maintenance: ${textForMaintenance.length} chars`)

    // Tronquer si trop long
    const truncate = (text: string, max: number = 80000) =>
        text.length > max ? text.substring(0, max) + '\n[Texte tronqué...]' : text


    let totalTokens = 0

    // 3. Exécuter les passes d'extraction
    console.log('[Extraction Pipeline] Pass 1: Main Asset & Components...')
    const pass1 = await executePass<Pass1Result>(
        claudeClient,
        PASS1_SYSTEM_PROMPT,
        PASS1_USER_PROMPT + '\n\nDOCUMENT:\n' + truncate(textForSpecs, 60000),
        maxTokens
    )
    totalTokens += pass1.tokensUsed
    console.log(`[Extraction Pipeline] Pass 1 complete: ${pass1.tokensUsed} tokens, ${pass1.data?.components?.length || 0} components, ${pass1.data?.model_configurations?.length || 0} model configs`)

    console.log('[Extraction Pipeline] Pass 2: Subsystems...')
    const pass2 = await executePass<Pass2Result>(
        claudeClient,
        PASS2_SYSTEM_PROMPT,
        PASS2_USER_PROMPT + '\n\nDOCUMENT:\n' + truncate(textForSubsystems, 60000),
        maxTokens
    )
    totalTokens += pass2.tokensUsed
    console.log(`[Extraction Pipeline] Pass 2 complete: ${pass2.tokensUsed} tokens, ${pass2.data?.integrated_subsystems?.length || 0} subsystems`)

    console.log('[Extraction Pipeline] Pass 3: Electrical...')
    const pass3 = await executePass<Pass3Result>(
        claudeClient,
        PASS3_SYSTEM_PROMPT,
        PASS3_USER_PROMPT + '\n\nDOCUMENT:\n' + truncate(textForElectrical, 60000),
        maxTokens
    )
    totalTokens += pass3.tokensUsed
    console.log(`[Extraction Pipeline] Pass 3 complete: ${pass3.tokensUsed} tokens, ${pass3.data?.electrical_components?.length || 0} electrical, ${pass3.data?.motor_protection_settings?.length || 0} motor protection`)

    console.log('[Extraction Pipeline] Pass 4: Spec Tables...')
    const pass4 = await executePass<Pass4Result>(
        claudeClient,
        PASS4_SYSTEM_PROMPT,
        PASS4_USER_PROMPT + '\n\nDOCUMENT:\n' + truncate(textForSpecs, 60000),
        maxTokens
    )
    totalTokens += pass4.tokensUsed
    const totalRows = pass4.data?.specification_tables?.reduce((acc, t) => acc + (t.rows?.length || 0), 0) || 0
    console.log(`[Extraction Pipeline] Pass 4 complete: ${pass4.tokensUsed} tokens, ${pass4.data?.specification_tables?.length || 0} tables, ${totalRows} rows`)

    console.log('[Extraction Pipeline] Pass 5: Maintenance & Diagnostics...')
    const pass5 = await executePass<Pass5Result>(
        claudeClient,
        PASS5_SYSTEM_PROMPT,
        PASS5_USER_PROMPT + '\n\nDOCUMENT:\n' + truncate(textForMaintenance, 60000),
        maxTokens
    )
    totalTokens += pass5.tokensUsed
    console.log(`[Extraction Pipeline] Pass 5 complete: ${pass5.tokensUsed} tokens, ${pass5.data?.diagnostic_codes?.length || 0} diagnostic codes`)

    // 4. Fusionner les résultats
    let merged = mergePassResults(pass1.data, pass2.data, pass3.data, pass4.data, pass5.data)

    // 5. NOUVEAU: Cross-validation
    const crossValidation = crossValidateExtraction(merged)
    if (crossValidation.warnings.length > 0) {
        console.log('[Extraction Pipeline] Cross-validation warnings:', crossValidation.warnings)
    }

    // 6. NOUVEAU: Retry failed critical sections
    if (enableRetry) {
        const retryResults = await retryFailedSections(
            merged,
            claudeClient,
            { specs: textForSpecs, electrical: textForElectrical },
            maxTokens
        )

        if (retryResults.model_configurations && retryResults.model_configurations.length > 0) {
            merged.model_configurations = retryResults.model_configurations
            totalTokens += retryResults.tokensUsed || 0
        }

        if (retryResults.motor_protection_settings && retryResults.motor_protection_settings.length > 0) {
            merged.motor_protection_settings = retryResults.motor_protection_settings
            totalTokens += retryResults.tokensUsed || 0
        }
    }

    // 7. Valider la complétude
    const validation = validateCompleteness(merged)

    // 8. Calculer le coût
    const processingTime = Date.now() - startTime
    const costUsd = calculateCost(totalTokens)

    // 9. Assembler le résultat final
    const result: CompleteExtractionResult = {
        extraction_metadata: {
            timestamp: new Date().toISOString(),
            model_used: 'claude-sonnet-4-20250514',
            total_tokens: totalTokens,
            extraction_passes: 5,
            completeness_score: validation.completeness_score,
            confidence_score: validation.confidence_score,
            processing_time_ms: processingTime,
            cost_usd: costUsd,
            validation_warnings: crossValidation.warnings,
            validation_suggestions: crossValidation.suggestions
        },
        main_asset: merged.main_asset,
        model_configurations: merged.model_configurations,
        components: merged.components,
        integrated_subsystems: merged.integrated_subsystems,
        electrical_components: merged.electrical_components,
        motor_protection_settings: merged.motor_protection_settings,
        control_sequences: merged.control_sequences,
        specification_tables: merged.specification_tables,
        spare_parts: merged.spare_parts,
        maintenance_schedule: merged.maintenance_schedule,
        diagnostic_codes: merged.diagnostic_codes,
        validation,
        warnings: [...validation.extraction_warnings, ...crossValidation.warnings],
        extraction_notes: [
            `Sections détectées: ${Object.keys(sections).join(', ')}`,
            `Tokens totaux: ${totalTokens}`,
            `Temps de traitement: ${processingTime}ms`,
            `Retry enabled: ${enableRetry}`
        ]
    }

    console.log(`[Extraction Pipeline] Complete! Score: ${validation.completeness_score}%, Cost: $${costUsd.toFixed(4)}`)

    return result
}

// ============================================
// CROSS-VALIDATION
// ============================================

interface CrossValidationResult {
    warnings: string[]
    suggestions: string[]
}

/**
 * Cross-validate extracted data to catch common mistakes
 */
function crossValidateExtraction(
    data: Omit<CompleteExtractionResult, 'extraction_metadata' | 'validation' | 'warnings' | 'extraction_notes'>
): CrossValidationResult {
    const warnings: string[] = []
    const suggestions: string[] = []

    // Check 1: If we have electrical components but no motor protection
    if (
        data.electrical_components &&
        data.electrical_components.length > 5 &&
        (!data.motor_protection_settings || data.motor_protection_settings.length === 0)
    ) {
        warnings.push(
            "Composants électriques trouvés mais pas de réglages protection moteur. " +
            "Vérifiez les pages 'Electrical Diagrams' pour les tableaux F1/Thermal Relay."
        )
        suggestions.push(
            "Chercher des petits tableaux (3-10 lignes) avec colonnes HP, Voltage, Ampères " +
            "près des schémas électriques."
        )
    }

    // Check 2: If we have subsystems but no model configurations
    if (
        data.integrated_subsystems &&
        data.integrated_subsystems.length > 0 &&
        (!data.model_configurations || data.model_configurations.length === 0)
    ) {
        warnings.push(
            "Sous-systèmes trouvés mais pas de configurations de modèles. " +
            "Les équipements avec sous-systèmes ont généralement plusieurs variantes."
        )
        suggestions.push(
            "Re-vérifier les 10 premières pages pour un tableau avec modèles et spécifications. " +
            "Colonnes: Model, HP, Pressure, Flow."
        )
    }

    // Check 3: If main asset has no manufacturer
    if (
        data.main_asset &&
        (!data.main_asset.manufacturer || data.main_asset.manufacturer.trim() === '')
    ) {
        warnings.push("Fabricant non identifié. Vérifiez la page de couverture.")
    }

    // Check 4: If model_number is null but name contains numbers
    if (
        data.main_asset &&
        !data.main_asset.model_number &&
        data.main_asset.name &&
        /\d+/.test(data.main_asset.name)
    ) {
        suggestions.push(
            "Le nom de l'actif contient des chiffres mais model_number est vide. " +
            "Extraire le modèle spécifique (ex: '5.5 HP', 'XL 9.2')."
        )
    }

    // Check 5: Many electrical components but few control sequences
    if (
        (data.electrical_components?.length ?? 0) > 10 &&
        (data.control_sequences?.length ?? 0) < 1
    ) {
        suggestions.push(
            "Beaucoup de composants électriques mais pas de séquences de contrôle. " +
            "Chercher la section 'Starting Sequence' ou 'Séquence de démarrage'."
        )
    }

    // Check 6: Empty specification tables but have model configs
    if (
        data.model_configurations &&
        data.model_configurations.length > 0 &&
        (!data.specification_tables || data.specification_tables.length === 0)
    ) {
        suggestions.push(
            "Configurations de modèles trouvées mais pas de tableaux de spécifications bruts. " +
            "Considérer l'extraction des tableaux sources pour référence."
        )
    }

    return { warnings, suggestions }
}

// ============================================
// RETRY FAILED SECTIONS
// ============================================

interface RetryResult {
    model_configurations?: ModelConfiguration[]
    motor_protection_settings?: MotorProtectionSetting[]
    tokensUsed?: number
}

/**
 * Retry extraction for specific failed sections with focused prompts
 */
async function retryFailedSections(
    initialResult: Omit<CompleteExtractionResult, 'extraction_metadata' | 'validation' | 'warnings' | 'extraction_notes'>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    claudeClient: any,
    texts: { specs: string, electrical: string },
    maxTokens: number
): Promise<RetryResult> {
    const retryResults: RetryResult = { tokensUsed: 0 }

    // Retry model configurations if empty
    if (!initialResult.model_configurations || initialResult.model_configurations.length === 0) {
        console.log('[Retry] 🔄 Retrying model configurations extraction...')

        const retryPrompt = `MISSION UNIQUE: Trouver le tableau de gamme produits / variantes de modèles.

CHERCHE UNIQUEMENT des tableaux avec ces caractéristiques:
1. Plusieurs lignes (3+ lignes)
2. Colonnes incluant puissance (HP/kW) ET métriques de performance (pression/débit/capacité)
3. Généralement intitulé "Technical Specifications", "Models", "Gamme", "Données Techniques"

SI TROUVÉ: Extrait CHAQUE LIGNE du tableau
SI NON TROUVÉ: Retourne { "model_configurations": [] }

LOCALISATION:
- Pages 1-15 (début du manuel)
- Section "Technical Data" ou "Specifications"
- Tableaux avec 4+ colonnes et 5+ lignes

FORMAT SORTIE:
{
  "model_configurations": [
    {
      "model": "5.5 HP",
      "power_hp": 5.5,
      "power_kw": 4.0,
      "configurations": [
        { "pressure_bar": 8, "air_flow_lmin": 560, "noise_dba": 65 },
        { "pressure_bar": 10, "air_flow_lmin": 450, "noise_dba": 66 }
      ]
    }
  ]
}

DOCUMENT:
${texts.specs.substring(0, 40000)}`

        try {
            const result = await executePass<{ model_configurations: ModelConfiguration[] }>(
                claudeClient,
                'Tu es un expert en extraction de tableaux de spécifications techniques. Réponds uniquement en JSON valide.',
                retryPrompt,
                maxTokens
            )

            retryResults.tokensUsed = (retryResults.tokensUsed || 0) + result.tokensUsed

            if (result.data?.model_configurations && result.data.model_configurations.length > 0) {
                console.log(`[Retry] ✅ Model configurations retry successful! Found ${result.data.model_configurations.length} configurations`)
                retryResults.model_configurations = result.data.model_configurations
            } else {
                console.log('[Retry] ⚠️ Model configurations retry: No data found')
            }
        } catch (error) {
            console.error('[Retry] ❌ Model configurations retry failed:', error)
        }
    }

    // Retry motor protection if empty
    if (!initialResult.motor_protection_settings || initialResult.motor_protection_settings.length === 0) {
        console.log('[Retry] 🔄 Retrying motor protection settings extraction...')

        const retryPrompt = `MISSION UNIQUE: Trouver le tableau des réglages de protection moteur.

CHERCHE UNIQUEMENT des petits tableaux (3-10 lignes) avec:
1. Colonne "HP" ou "kW" (puissance moteur)
2. Colonne avec valeurs d'ampérage (ex: "5.0A", "6.5A", "9.0A")
3. Généralement intitulé "Thermal Relay", "F1 Settings", "Protection", "Réglage Relais"

INDICES DE LOCALISATION:
- Section "Electrical Diagrams" (pages 20-30)
- Près des tableaux de légende électrique
- Petit format (pas un grand tableau de specs)

SI TROUVÉ: Extrait TOUTES les lignes avec valeurs exactes d'ampérage
SI NON TROUVÉ: Retourne { "motor_protection_settings": [] }

FORMAT SORTIE:
{
  "motor_protection_settings": [
    {
      "motor_power_hp": 5.5,
      "motor_power_kw": 4.0,
      "voltage": "380-415V",
      "start_method": "DOL",
      "thermal_relay_setting_a": 5.0,
      "fuse_rating_a": 16
    }
  ]
}

DOCUMENT:
${texts.electrical.substring(0, 40000)}`

        try {
            const result = await executePass<{ motor_protection_settings: MotorProtectionSetting[] }>(
                claudeClient,
                'Tu es un expert en extraction de données électriques. Réponds uniquement en JSON valide.',
                retryPrompt,
                maxTokens
            )

            retryResults.tokensUsed = (retryResults.tokensUsed || 0) + result.tokensUsed

            if (result.data?.motor_protection_settings && result.data.motor_protection_settings.length > 0) {
                console.log(`[Retry] ✅ Motor protection retry successful! Found ${result.data.motor_protection_settings.length} settings`)
                retryResults.motor_protection_settings = result.data.motor_protection_settings
            } else {
                console.log('[Retry] ⚠️ Motor protection retry: No data found')
            }
        } catch (error) {
            console.error('[Retry] ❌ Motor protection retry failed:', error)
        }
    }

    return retryResults
}


// ============================================
// EXECUTE SINGLE PASS
// ============================================

async function executePass<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    claudeClient: any,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
): Promise<PassResult<T>> {
    const startTime = Date.now()

    try {
        const response = await claudeClient.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            temperature: 0,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: userPrompt
            }]
        })

        const text = response.content[0]?.text || ''
        const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

        // Extraire le JSON de la réponse
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('[Pass] No JSON found in response')
            return {
                success: false,
                data: null,
                error: 'No JSON in response',
                tokensUsed,
                timeMs: Date.now() - startTime
            }
        }

        const data = JSON.parse(jsonMatch[0]) as T

        return {
            success: true,
            data,
            tokensUsed,
            timeMs: Date.now() - startTime
        }
    } catch (error) {
        console.error('[Pass] Error:', error)
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            tokensUsed: 0,
            timeMs: Date.now() - startTime
        }
    }
}

// ============================================
// MERGE RESULTS
// ============================================

function mergePassResults(
    pass1: Pass1Result | null,
    pass2: Pass2Result | null,
    pass3: Pass3Result | null,
    pass4: Pass4Result | null,
    pass5: Pass5Result | null
): Omit<CompleteExtractionResult, 'extraction_metadata' | 'validation' | 'warnings' | 'extraction_notes'> {
    return {
        main_asset: pass1?.main_asset || {
            name: 'Unknown Asset',
            model_number: 'Unknown',
            category: 'other',
            criticality: 'medium',
            specifications: {}
        },
        model_configurations: pass1?.model_configurations || [],
        components: pass1?.components || [],
        integrated_subsystems: pass2?.integrated_subsystems || [],
        electrical_components: pass3?.electrical_components || [],
        motor_protection_settings: pass3?.motor_protection_settings || [],
        control_sequences: pass3?.control_sequences || [],
        specification_tables: pass4?.specification_tables || [],
        spare_parts: pass5?.spare_parts || [],
        maintenance_schedule: pass5?.maintenance_schedule || { routine: [] },
        diagnostic_codes: pass5?.diagnostic_codes || []
    }
}

// ============================================
// VALIDATION
// ============================================

export function validateCompleteness(
    data: Omit<CompleteExtractionResult, 'extraction_metadata' | 'validation' | 'warnings' | 'extraction_notes'>
): ValidationResult {
    const checks: ValidationCheck[] = [
        {
            name: 'Main asset identified',
            present: !!data.main_asset?.name && data.main_asset.name !== 'Unknown Asset',
            critical: true,
            weight: 10
        },
        {
            name: 'Model configurations extracted',
            present: (data.model_configurations?.length ?? 0) >= 1,
            critical: true,
            weight: 15
        },
        {
            name: 'Multiple configurations per model',
            present: data.model_configurations?.some(m => (m.configurations?.length ?? 0) >= 2) ?? false,
            critical: false,
            weight: 10
        },
        {
            name: 'Core components extracted',
            present: (data.components?.length ?? 0) >= 3,
            critical: true,
            weight: 10
        },
        {
            name: 'Subsystems detected',
            present: (data.integrated_subsystems?.length ?? 0) > 0,
            critical: true,
            weight: 15
        },
        {
            name: 'Electrical components',
            present: (data.electrical_components?.length ?? 0) >= 3,
            critical: true,
            weight: 10
        },
        {
            name: 'Motor protection settings',
            present: (data.motor_protection_settings?.length ?? 0) >= 1,
            critical: false,
            weight: 5
        },
        {
            name: 'Specification tables complete',
            present: (data.specification_tables?.length ?? 0) >= 1,
            critical: false,
            weight: 5
        },
        {
            name: 'Maintenance schedule exists',
            present: (data.maintenance_schedule?.routine?.length ?? 0) >= 2,
            critical: false,
            weight: 5
        },
        {
            name: 'Spare parts with intervals',
            present: (data.spare_parts?.filter(p => p.replacement_interval_hours)?.length ?? 0) >= 3,
            critical: false,
            weight: 5
        },
        {
            name: 'Diagnostic codes extracted',
            present: (data.diagnostic_codes?.length ?? 0) >= 3,
            critical: false,
            weight: 10
        }
    ]

    let score = 0
    const maxScore = checks.reduce((acc, c) => acc + c.weight, 0)
    const missingCritical: string[] = []
    const missingOptional: string[] = []
    const warnings: string[] = []

    for (const check of checks) {
        if (check.present) {
            score += check.weight
        } else {
            if (check.critical) {
                missingCritical.push(check.name)
                warnings.push(`Section critique manquante: ${check.name}`)
            } else {
                missingOptional.push(check.name)
            }
        }
    }

    const completenessScore = Math.round((score / maxScore) * 100)
    const confidenceScore = calculateConfidence(data, checks)

    return {
        completeness_score: completenessScore,
        confidence_score: confidenceScore,
        missing_critical_sections: missingCritical,
        missing_optional_sections: missingOptional,
        extraction_warnings: warnings,
        checks
    }
}

function calculateConfidence(
    data: Omit<CompleteExtractionResult, 'extraction_metadata' | 'validation' | 'warnings' | 'extraction_notes'>,
    checks: ValidationCheck[]
): number {
    // Base confidence sur les checks réussis
    const passedChecks = checks.filter(c => c.present).length
    const totalChecks = checks.length
    let confidence = passedChecks / totalChecks

    // Bonus pour données détaillées
    if ((data.model_configurations?.flatMap(m => m.configurations)?.length ?? 0) >= 5) {
        confidence += 0.05
    }
    if ((data.electrical_components?.length ?? 0) >= 10) {
        confidence += 0.05
    }
    if ((data.diagnostic_codes?.length ?? 0) >= 10) {
        confidence += 0.05
    }

    return Math.min(1, Math.round(confidence * 100) / 100)
}

// ============================================
// COST CALCULATION
// ============================================

function calculateCost(totalTokens: number): number {
    // Claude Sonnet pricing approximatif
    const inputCostPer1M = 3.0
    const outputCostPer1M = 15.0

    // Estimation 70% input, 30% output
    const inputTokens = totalTokens * 0.7
    const outputTokens = totalTokens * 0.3

    return (inputTokens / 1_000_000) * inputCostPer1M +
        (outputTokens / 1_000_000) * outputCostPer1M
}

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convertit le résultat multi-pass vers le format legacy
 * Pour compatibilité avec l'API existante
 */
export function convertToLegacyFormat(result: CompleteExtractionResult) {
    return {
        main_asset: {
            name: result.main_asset.name,
            manufacturer: result.main_asset.manufacturer || '',
            model_number: Array.isArray(result.main_asset.model_number)
                ? result.main_asset.model_number[0]
                : result.main_asset.model_number,
            category: result.main_asset.category,
            criticality: result.main_asset.criticality,
            specifications: result.main_asset.specifications
        },
        components: result.components.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            location: c.location,
            specifications: c.specifications
        })),
        spare_parts: result.spare_parts.map(p => ({
            id: p.id,
            name: p.name,
            reference: p.part_number || '',
            quantity_recommended: p.quantity,
            unit: p.unit || 'pièce',
            replacement_frequency: p.replacement_interval_description
        })),
        maintenance_schedules: result.maintenance_schedule.routine.map(r => ({
            type: 'routine',
            interval: r.interval_description,
            tasks: r.tasks.map(t => t.task)
        })),
        confidence_score: result.validation.confidence_score,
        extraction_metadata: result.extraction_metadata
    }
}
