/**
 * Types pour l'import d'actifs par IA
 * Système d'extraction automatique depuis les manuels d'équipement (PDF)
 */

/**
 * ExtractedAsset - Actif principal extrait du manuel
 * Représente l'équipement/machine principal
 */
export interface ExtractedAsset {
    /** Nom de l'actif */
    name: string

    /** Fabricant (optionnel) */
    manufacturer: string | null

    /** Numéro de modèle (optionnel) */
    model_number: string | null

    /** Numéro de série (optionnel) */
    serial_number: string | null

    /** Catégorie de l'actif */
    category: string

    /** Niveau de criticité pour la maintenance */
    criticality: 'low' | 'medium' | 'high' | 'critical'

    /** Spécifications techniques (puissance, voltage, poids, etc.) */
    specifications: Record<string, any>
}

/**
 * ExtractedComponent - Composant/sous-ensemble de l'actif
 * Parties importantes de l'équipement qui nécessitent une maintenance séparée
 */
export interface ExtractedComponent {
    /** Identifiant unique du composant */
    id: string

    /** Nom du composant */
    name: string

    /** Numéro de pièce du fabricant (optionnel) */
    part_number: string | null

    /** Type de composant (moteur, pompe, valve, etc.) */
    type: string

    /** Emplacement dans l'actif (optionnel) */
    location: string | null

    /** Spécifications techniques du composant */
    specifications: Record<string, any>
}

/**
 * ExtractedSparePart - Pièce de rechange recommandée
 * Pièces consommables ou de remplacement périodique
 */
export interface ExtractedSparePart {
    /** Identifiant unique de la pièce */
    id: string

    /** Nom de la pièce */
    name: string

    /** Référence/code dans le manuel */
    reference: string

    /** Quantité recommandée en stock */
    quantity_recommended: number

    /** Unité de mesure (pcs, kg, L, etc.) */
    unit: string

    /** Fréquence de remplacement recommandée (optionnel) */
    replacement_frequency: string | null
}

/**
 * MaintenanceSchedule - Planning de maintenance extrait
 * Tâches de maintenance organisées par fréquence
 */
export interface MaintenanceSchedule {
    /** Tâches quotidiennes */
    daily: string[]

    /** Tâches hebdomadaires */
    weekly: string[]

    /** Tâches mensuelles */
    monthly: string[]

    /** Tâches annuelles */
    yearly: string[]
}

/**
 * AIExtractionResponse - Réponse complète du système d'IA
 * Données structurées extraites du manuel PDF (incluant multi-pass pipeline)
 */
export interface AIExtractionResponse {
    /** Score de confiance de l'extraction (0-1) */
    confidence_score: number

    /** Actif principal */
    main_asset: ExtractedAsset

    /** Liste des composants identifiés */
    components: ExtractedComponent[]

    /** Liste des pièces de rechange */
    spare_parts: ExtractedSparePart[]

    /** Planning de maintenance extrait */
    maintenance_schedule: MaintenanceSchedule

    /** Avertissements ou notes importantes */
    warnings: string[]

    // ============================================
    // ENHANCED MULTI-PASS EXTRACTION DATA
    // ============================================

    /** Model configurations with pressure/flow data (Pass 1) */
    model_configurations?: Array<{
        model: string
        power_hp?: number
        power_kw?: number
        configurations: Array<{
            pressure_bar: number
            air_flow_lmin: number
            noise_dba?: number
        }>
    }>

    /** Integrated subsystems like dryers, cooling (Pass 2) */
    integrated_subsystems?: Array<{
        id: string
        name: string
        type: string
        function: string
        components: Array<{ name: string; type: string; specifications: Record<string, unknown> }>
        alarm_codes?: Array<{ code: string; description: string; action: string }>
    }>

    /** Electrical components list (Pass 3) */
    electrical_components?: Array<{
        id: string
        reference: string
        name: string
        type: string
        function: string
        specifications: Record<string, unknown>
    }>

    /** Motor protection settings by power rating (Pass 3) */
    motor_protection_settings?: Array<{
        motor_power_hp: number
        voltage: string
        start_method: string
        thermal_relay_setting_a: number
        fuse_rating_a?: number
    }>

    /** Diagnostic/alarm codes with corrective actions (Pass 5) */
    diagnostic_codes?: Array<{
        id: string
        code: string
        description: string
        possible_causes: string[]
        corrective_actions: string[]
        severity: 'info' | 'warning' | 'alarm' | 'shutdown'
    }>

    /** Complete specification tables (Pass 4) */
    specification_tables?: Array<{
        table_name: string
        columns: string[]
        rows: Record<string, string | number>[]
    }>

    /** Completeness score from multi-pass validation (0-100) */
    completeness_score?: number

    /** Extraction metadata (tokens, cost, time) */
    extraction_metadata?: {
        timestamp: string
        model_used: string
        total_tokens: number
        extraction_passes: number
        processing_time_ms: number
        cost_usd: number
    }

    /** Full maintenance schedule with hour-based intervals (Pass 5) */
    full_maintenance_schedule?: {
        break_in?: { interval: string; tasks: string[] }
        daily?: string[]
        weekly?: string[]
        monthly?: string[]
        routine: Array<{
            interval_hours?: number
            interval_description: string
            tasks: Array<{ task: string; component?: string }>
        }>
    }
}

/**
 * ProcessingStatus - État du traitement pour l'interface utilisateur
 * Permet de suivre la progression de l'import
 */
export interface ProcessingStatus {
    /** Étape actuelle du traitement */
    step: 'uploading' | 'extracting' | 'analyzing' | 'complete' | 'error'

    /** Message descriptif de l'étape */
    message: string

    /** Progression (0-100) */
    progress: number

    /** Message d'erreur (si step === 'error') */
    error?: string
}

/**
 * PDFProcessingOptions - Options pour le traitement PDF
 */
export interface PDFProcessingOptions {
    /** Utiliser l'OCR pour les PDFs scannés */
    use_ocr?: boolean

    /** Nombre maximum de pages à traiter */
    max_pages?: number

    /** Langue pour l'OCR (défaut: 'fra' pour français) */
    language?: string

    /** Seuil de confiance minimum (0-1) */
    confidence_threshold?: number
}

/**
 * AssetImportResult - Résultat de l'import d'actif
 * Réponse après la création de l'actif dans la base de données
 */
export interface AssetImportResult {
    /** Succès de l'opération */
    success: boolean

    /** ID de l'actif créé (si succès) */
    asset_id?: string

    /** ID de l'extraction IA (pour traçabilité) */
    extraction_id?: string

    /** Score de confiance de l'extraction */
    confidence_score?: number

    /** Avertissements */
    warnings?: string[]

    /** Message d'erreur (si échec) */
    error?: string
}

/**
 * QRCodeData - Données pour la génération de QR code
 * Information encodée dans le QR code de l'actif
 */
export interface QRCodeData {
    /** ID de l'actif */
    asset_id: string

    /** Nom de l'actif */
    asset_name: string

    /** Code unique de l'actif */
    asset_code: string

    /** URL vers la page de détails */
    url: string
}
