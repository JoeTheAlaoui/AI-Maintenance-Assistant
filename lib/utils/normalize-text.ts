/**
 * Normalize text for case-insensitive, accent-insensitive comparison
 * Used for alias matching and search
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Auto-detect language based on text content
 */
export function detectLanguage(text: string): string {
    // Arabic Unicode range
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';

    // English (Latin alphabet)
    if (/^[A-Za-z0-9\s\-_]+$/.test(text)) return 'en';

    // Default to French
    return 'fr';
}
