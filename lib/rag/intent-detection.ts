/**
 * Detect user query intent based on multilingual keywords
 * Returns document types that match the query intent
 * 
 * @param query - User's question/query
 * @returns Array of document types to filter by (empty = search all)
 */
export function detectQueryIntent(query: string): string[] {
    // Multilingual keyword mapping to document types
    const intentMap: Record<string, string[]> = {
        // Spare parts - قطع الغيار | spare parts | pièces
        'قطع الغيار|قطع|spare parts?|parts?|pièces|catalogue': ['parts'],

        // Maintenance - صيانة | maintenance | entretien
        'صيانة|maintenance|entretien|maintain|servic': ['maintenance'],

        // Installation - تركيب | installation | montage
        'تركيب|install|montage|monter|setup': ['installation'],

        // Troubleshooting - عطل | مشكل | troubleshoot | panne
        'عطل|مشكل|خلل|troubleshoot|problem|issue|fault|panne|défaut|dépannage': ['troubleshooting'],

        // Electrical - كهرباء | electrical | électrique
        'كهرباء|كهربائي|electrical|electric|électrique': ['electrical'],

        // Mechanical - ميكانيك | mechanical | mécanique
        'ميكانيك|ميكانيكي|mechanical|mechanic|mécanique': ['mechanical'],

        // Safety - أمان | safety | sécurité
        'أمان|سلامة|safety|safe|sécurité|sûreté': ['safety'],
    };

    const detectedTypes: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Check each pattern
    for (const [keywords, types] of Object.entries(intentMap)) {
        const regex = new RegExp(keywords, 'i');
        if (regex.test(lowerQuery)) {
            detectedTypes.push(...types);
        }
    }

    // Remove duplicates and return
    return [...new Set(detectedTypes)];
}
