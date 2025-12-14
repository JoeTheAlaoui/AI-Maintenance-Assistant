/**
 * Feature Flags Configuration
 * 
 * v1 MVP: AI Assistant Focus
 * - Seules les features essentielles pour l'AI Assistant sont activées
 * - Les autres features restent dans le code mais sont désactivées
 * - Pour activer une feature future: changer false → true
 */

export const FEATURES = {
    // ===== ✅ ENABLED - v1 MVP =====

    // Core AI Features
    AI_ASSISTANT: true,              // Chat AI avec contexte asset
    AI_IMPORT: true,                 // Import PDF avec extraction AI
    QR_SCANNING: true,               // Scan QR codes équipements

    // Asset Management (Read-only)
    ASSET_VIEWING: true,             // Voir détails assets
    ASSET_LIST: true,                // Liste des assets
    ASSET_SEARCH: true,              // Recherche assets

    // ===== 🔒 DISABLED - Futures Versions =====

    // Work Order Management
    WORK_ORDERS_VIEW: false,         // Voir work orders
    WORK_ORDERS_CREATE: false,       // Créer work orders
    WORK_ORDERS_EDIT: false,         // Modifier work orders
    WORK_ORDERS_ASSIGN: false,       // Assigner techniciens

    // Inventory Management
    INVENTORY_VIEW: false,           // Voir inventaire
    INVENTORY_MANAGE: false,         // Gérer stock
    PARTS_ORDERING: false,           // Commander pièces

    // Maintenance Planning
    PREVENTIVE_MAINTENANCE: false,   // Planning préventif
    MAINTENANCE_CALENDAR: false,     // Calendrier maintenance
    TECHNICIAN_SCHEDULE: false,      // Planning techniciens

    // Analytics & Reporting
    ANALYTICS_DASHBOARD: false,      // Tableau de bord analytics
    REPORTS_GENERATION: false,       // Génération rapports
    KPI_TRACKING: false,             // Suivi KPIs

    // Advanced Features
    MULTI_SITE: false,               // Multi-sites
    CUSTOM_WORKFLOWS: false,         // Workflows personnalisés
    API_ACCESS: false,               // API externe

    // Asset Management (Write)
    ASSET_CREATE_MANUAL: false,      // Création manuelle assets (désactivé, import AI uniquement)
    ASSET_EDIT: false,               // Modification assets
    ASSET_DELETE: false,             // Suppression assets

} as const;

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
    return FEATURES[feature];
}

/**
 * Type-safe feature flag type
 */
export type FeatureFlag = keyof typeof FEATURES;

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
    return Object.entries(FEATURES)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature as FeatureFlag);
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): FeatureFlag[] {
    return Object.entries(FEATURES)
        .filter(([_, enabled]) => !enabled)
        .map(([feature, _]) => feature as FeatureFlag);
}
