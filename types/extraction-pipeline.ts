/**
 * Enhanced Types for Multi-Pass AI Extraction Pipeline
 * Système d'extraction multi-passes pour 90%+ de complétude
 */

// ============================================
// EXTRACTION PIPELINE TYPES
// ============================================

export interface ExtractionPass {
    passNumber: 1 | 2 | 3 | 4 | 5
    name: string
    targetContent: string[]
    tokensUsed: number
    timeMs: number
    itemsExtracted: number
}

export interface ExtractionMetadata {
    timestamp: string
    model_used: string
    total_tokens: number
    extraction_passes: number
    completeness_score: number
    confidence_score: number
    processing_time_ms: number
    cost_usd: number
    validation_warnings?: string[]
    validation_suggestions?: string[]
}

// ============================================
// DOCUMENT SECTION DETECTION
// ============================================

export interface DocumentSection {
    name: string
    startPage: number
    endPage: number
    text: string
    confidence: number
}

export interface DocumentSections {
    specifications?: DocumentSection
    maintenance?: DocumentSection
    dryer?: DocumentSection
    electrical?: DocumentSection
    pneumatic?: DocumentSection
    troubleshooting?: DocumentSection
    safety?: DocumentSection
    installation?: DocumentSection
    [key: string]: DocumentSection | undefined
}

// ============================================
// PASS 1: MAIN ASSET & CORE COMPONENTS
// ============================================

export interface ModelConfiguration {
    model: string
    power_hp?: number
    power_kw?: number
    configurations: PressureFlowConfig[]
}

export interface PressureFlowConfig {
    pressure_bar: number
    pressure_psi?: number
    air_flow_lmin: number
    air_flow_cfm?: number
    noise_dba?: number
}

export interface CoreComponent {
    id: string
    name: string
    part_number: string | null
    type: 'motor' | 'compressor' | 'pump' | 'valve' | 'filter' | 'heat_exchanger' | 'tank' | 'fan' | 'other'
    location: string
    function?: string
    specifications: Record<string, string | number>
}

// ============================================
// PASS 2: INTEGRATED SUBSYSTEMS
// ============================================

export interface AlarmCode {
    code: string
    description: string
    action: string
    reset_condition?: string
}

export interface IntegratedSubsystem {
    id: string
    name: string
    type: 'dryer' | 'cooling' | 'filtration' | 'lubrication' | 'control' | 'safety' | 'other'
    function: string
    components: SubsystemComponent[]
    control_panel?: ControlPanel
    alarm_codes: AlarmCode[]
    maintenance: SubsystemMaintenance
}

export interface SubsystemComponent {
    name: string
    type: string
    part_number?: string
    specifications: Record<string, string | number>
}

export interface ControlPanel {
    type: string
    model?: string
    buttons: string[]
    displays: string[]
    indicators: string[]
    programmable_parameters: ProgrammableParameter[]
}

export interface ProgrammableParameter {
    code: string
    description: string
    range: string
    default_value: string | number
    unit?: string
}

export interface SubsystemMaintenance {
    daily?: string[]
    weekly?: string[]
    monthly?: string[]
    yearly?: string[]
    as_needed?: string[]
}

// ============================================
// PASS 3: ELECTRICAL COMPONENTS
// ============================================

export interface ElectricalComponent {
    id: string
    reference: string // e.g., "K1", "F1", "BT"
    name: string
    name_fr?: string
    name_en?: string
    type: 'contactor' | 'relay' | 'fuse' | 'transformer' | 'sensor' | 'switch' | 'motor_starter' | 'vfd' | 'other'
    function: string
    specifications: {
        rating?: string
        voltage?: string
        current?: string
        [key: string]: string | undefined
    }
    wiring_details?: {
        terminal_connections?: string[]
        wire_colors?: string[]
    }
}

export interface MotorProtectionSetting {
    motor_power_hp: number
    motor_power_kw?: number
    voltage: string
    phases?: number
    frequency_hz?: number
    start_method: 'DOL' | 'star_delta' | 'VFD' | 'soft_starter'
    thermal_relay_setting_a: number
    fuse_rating_a?: number
    contactor_rating_a?: number
    cable_size_mm2?: number
}

export interface ControlSequence {
    name: string
    description: string
    steps: string[]
    timing?: string[]
    conditions?: string[]
}

// ============================================
// PASS 4: SPECIFICATION TABLES
// ============================================

export interface SpecificationTable {
    table_name: string
    section?: string
    columns: string[]
    units: Record<string, string>
    rows: Record<string, string | number>[]
    footnotes?: string[]
    conditions?: string[]
}

// ============================================
// PASS 5: MAINTENANCE & DIAGNOSTICS
// ============================================

export interface MaintenanceTask {
    task: string
    component?: string
    procedure?: string
    estimated_time_minutes?: number
    tools_required?: string[]
    parts_required?: string[]
}

export interface MaintenanceInterval {
    interval_hours?: number
    interval_description: string // "Every 2500 hours or 1 year"
    tasks: MaintenanceTask[]
}

export interface MaintenanceSchedule {
    break_in?: {
        interval: string
        tasks: string[]
    }
    daily?: string[]
    weekly?: string[]
    monthly?: string[]
    routine: MaintenanceInterval[]
}

export interface SparePartSchedule {
    id: string
    name: string
    part_number?: string
    replacement_interval_hours?: number
    replacement_interval_description?: string
    quantity: number
    unit?: string
    criticality: 'critical' | 'important' | 'routine'
    estimated_cost?: number
}

export interface DiagnosticCode {
    id: string
    code: string
    display?: string // What user sees on screen
    description: string
    possible_causes: string[]
    corrective_actions: string[]
    reset_procedure?: string
    severity: 'info' | 'warning' | 'alarm' | 'shutdown'
}

// ============================================
// COMPLETE EXTRACTION RESULT
// ============================================

export interface CompleteExtractionResult {
    extraction_metadata: ExtractionMetadata

    // Pass 1
    main_asset: {
        name: string
        manufacturer?: string
        model_number: string | string[]
        serial_number?: string
        category: string
        criticality: 'low' | 'medium' | 'high' | 'critical'
        specifications: Record<string, string | number>
        description?: string
    }
    model_configurations: ModelConfiguration[]
    components: CoreComponent[]

    // Pass 2
    integrated_subsystems: IntegratedSubsystem[]

    // Pass 3
    electrical_components: ElectricalComponent[]
    motor_protection_settings: MotorProtectionSetting[]
    control_sequences: ControlSequence[]

    // Pass 4
    specification_tables: SpecificationTable[]

    // Pass 5
    spare_parts: SparePartSchedule[]
    maintenance_schedule: MaintenanceSchedule
    diagnostic_codes: DiagnosticCode[]

    // Validation
    validation: ValidationResult
    warnings: string[]
    extraction_notes: string[]
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationCheck {
    name: string
    present: boolean
    critical: boolean
    weight: number
    details?: string
}

export interface ValidationResult {
    completeness_score: number // 0-100
    confidence_score: number // 0-1
    missing_critical_sections: string[]
    missing_optional_sections: string[]
    extraction_warnings: string[]
    checks: ValidationCheck[]
}

// ============================================
// API RESPONSE TYPE
// ============================================

export interface MultiPassExtractionResponse {
    success: boolean
    data?: CompleteExtractionResult
    error?: string
    passes_completed: number
    processing_time_ms: number
}
