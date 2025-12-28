/**
 * Intent Detection for Document Type Filtering (Phase 6)
 * 
 * Analyzes user query to determine which document types are relevant.
 * Uses keyword matching for speed (no AI call needed).
 * Supports Arabic, French, and English queries.
 */

export type DocumentType =
    | 'manual'
    | 'installation'
    | 'maintenance'
    | 'troubleshooting'
    | 'parts'
    | 'electrical'
    | 'mechanical'
    | 'safety';

export interface IntentDetectionResult {
    detectedTypes: DocumentType[];
    confidence: 'high' | 'medium' | 'low';
    keywords: string[];
    reasoning: string;
}

/**
 * Intent keyword patterns (multi-language: Arabic, French, English, Darija)
 */
const INTENT_PATTERNS: Record<DocumentType, string[]> = {
    parts: [
        // Arabic / Darija
        'قطع', 'غيار', 'قطعة', 'مكونات', 'أجزاء', 'احتياطي', 'ثمن', 'شراء',
        // French
        'pièce', 'pièces', 'rechange', 'spare', 'composant', 'référence', 'prix',
        // English
        'part', 'parts', 'spare', 'component', 'replacement', 'price', 'buy',
        // Contextual
        'catalogue', 'catalog', 'ref', 'كتالوج', 'رقم',
    ],

    maintenance: [
        // Arabic / Darija
        'صيانة', 'صيان', 'فحص', 'نظافة', 'تنظيف', 'زيت', 'تشحيم', 'شحم',
        'بريفنتيف', 'دوري', 'روتين',
        // French
        'maintenance', 'entretien', 'révision', 'inspection', 'nettoyage',
        'graissage', 'lubrification', 'vidange', 'contrôle', 'préventif',
        // English
        'maintain', 'service', 'inspection', 'cleaning', 'lubrication',
        // Contextual
        'périodique', 'preventive', 'schedule', 'interval', 'فترة', 'شحال مرة',
    ],

    troubleshooting: [
        // Arabic / Darija
        'عطل', 'مشكل', 'مشكلة', 'خلل', 'عطب', 'توقف', 'واقف', 'معطل',
        'ضجيج', 'صوت', 'اهتزاز', 'تسرب', 'حرارة', 'ماخدامش', 'ماكيخدمش',
        // French
        'panne', 'problème', 'défaut', 'dysfonctionnement', 'arrêt',
        'bruit', 'vibration', 'fuite', 'surchauffe', 'alarme', 'erreur',
        // English
        'fault', 'problem', 'issue', 'error', 'malfunction', 'breakdown',
        'noise', 'vibration', 'leak', 'overheat', 'alarm', 'broken',
        // Contextual
        'dépannage', 'diagnostic', 'réparer', 'fix', 'إصلاح', 'تصليح',
    ],

    installation: [
        // Arabic / Darija
        'تركيب', 'تثبيت', 'تركيبة', 'وضع', 'إعداد', 'بداية', 'ركب',
        // French
        'installation', 'montage', 'assemblage', 'mise en service',
        'raccordement', 'branchement', 'installer',
        // English
        'install', 'installation', 'setup', 'assembly', 'mounting',
        'connection', 'wiring', 'commissioning',
        // Contextual
        'initial', 'first', 'démarrage', 'start', 'بدء', 'أول مرة',
    ],

    electrical: [
        // Arabic / Darija
        'كهرباء', 'كهربائي', 'سلك', 'أسلاك', 'كابل', 'محرك', 'موتور',
        'فولط', 'أمبير', 'طاقة', 'كهربة',
        // French
        'électrique', 'électricité', 'câble', 'fil', 'moteur',
        'tension', 'courant', 'ampère', 'volt', 'puissance', 'disjoncteur',
        // English
        'electric', 'electrical', 'wire', 'cable', 'motor',
        'voltage', 'current', 'amp', 'power', 'wiring', 'breaker',
        // Contextual
        'schéma électrique', 'circuit', 'مخطط كهربائي', 'فيوز', 'fuse',
    ],

    mechanical: [
        // Arabic / Darija
        'ميكانيكي', 'ميكانيك', 'محمل', 'تروس', 'ترس', 'محور', 'عمود',
        'رولمان', 'كوسيني',
        // French
        'mécanique', 'roulement', 'engrenage', 'arbre', 'axe',
        'courroie', 'poulie', 'vis', 'boulon', 'joint',
        // English
        'mechanical', 'bearing', 'gear', 'shaft', 'axis',
        'belt', 'pulley', 'screw', 'bolt', 'gasket',
        // Contextual
        'schéma mécanique', 'drawing', 'plan', 'مخطط ميكانيكي',
    ],

    safety: [
        // Arabic / Darija
        'أمان', 'سلامة', 'خطر', 'خطير', 'تحذير', 'احتياط', 'حماية',
        // French
        'sécurité', 'danger', 'attention', 'précaution', 'avertissement',
        'protection', 'risque', 'epi',
        // English
        'safety', 'danger', 'warning', 'caution', 'hazard',
        'protection', 'risk', 'ppe',
        // Contextual
        'معدات حماية', 'نظارات', 'قفازات',
    ],

    manual: [
        // Generic/fallback - matches general queries
        // Arabic / Darija
        'كيف', 'كيفاش', 'شنو', 'واش', 'ماهو', 'علاش', 'فين', 'شحال',
        // French
        'comment', 'quoi', 'quel', "qu'est-ce", 'pourquoi', 'où',
        // English
        'how', 'what', 'which', 'why', 'where', 'explain',
    ],
};

/**
 * Enhanced intent detector with confidence scoring
 */
export function detectQueryIntent(query: string): IntentDetectionResult {
    const normalizedQuery = query.toLowerCase().trim();

    const detectedIntents: Map<DocumentType, number> = new Map();
    const matchedKeywords: string[] = [];

    // Score each document type by keyword matches
    for (const [type, keywords] of Object.entries(INTENT_PATTERNS)) {
        let score = 0;

        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();

            // Exact word match (highest weight)
            const wordBoundaryRegex = new RegExp(`(^|\\s|[،,.:;!?])${escapeRegex(keywordLower)}($|\\s|[،,.:;!?])`, 'i');
            if (wordBoundaryRegex.test(normalizedQuery)) {
                score += 3;
                if (!matchedKeywords.includes(keyword)) {
                    matchedKeywords.push(keyword);
                }
                continue;
            }

            // Contains match (medium weight)
            if (normalizedQuery.includes(keywordLower)) {
                score += 2;
                if (!matchedKeywords.includes(keyword)) {
                    matchedKeywords.push(keyword);
                }
                continue;
            }

            // Partial/stem match for longer keywords (low weight)
            if (keywordLower.length > 4) {
                const stem = keywordLower.substring(0, Math.min(5, keywordLower.length));
                if (normalizedQuery.includes(stem)) {
                    score += 1;
                }
            }
        }

        if (score > 0) {
            detectedIntents.set(type as DocumentType, score);
        }
    }

    // If no intents detected, default to 'manual' (search everything)
    if (detectedIntents.size === 0) {
        return {
            detectedTypes: ['manual'],
            confidence: 'low',
            keywords: [],
            reasoning: 'No specific intent detected - searching all document types',
        };
    }

    // Sort by score and take top intents
    const sortedIntents = Array.from(detectedIntents.entries())
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

    const topScore = sortedIntents[0][1];
    const topType = sortedIntents[0][0];

    // Include intents with score >= 50% of top score (for combined intents)
    const selectedIntents = sortedIntents
        .filter(([type, score]) => score >= topScore * 0.5 && type !== 'manual')
        .map(([type]) => type);

    // Determine confidence based on score and clarity
    let confidence: 'high' | 'medium' | 'low';
    if (topScore >= 5 && selectedIntents.length === 1) {
        confidence = 'high';
    } else if (topScore >= 3) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    // For low/medium confidence, include 'manual' as fallback to not miss info
    const finalTypes = confidence === 'high'
        ? selectedIntents
        : [...selectedIntents, 'manual' as DocumentType];

    // Build reasoning
    const reasoning = selectedIntents.length > 0
        ? `Detected ${selectedIntents.join(', ')} based on keywords: ${matchedKeywords.slice(0, 5).join(', ')}`
        : 'General query - searching all documents';

    return {
        detectedTypes: Array.from(new Set(finalTypes)) as DocumentType[],
        confidence,
        keywords: matchedKeywords.slice(0, 10), // Limit to 10 keywords
        reasoning,
    };
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Legacy function for backward compatibility
 * Returns just the types as string array (old API)
 */
export function detectQueryIntentTypes(query: string): string[] {
    const result = detectQueryIntent(query);
    return result.detectedTypes;
}
