/**
 * Section Detector - Détecte les sections du document PDF
 * Identifie les pages par section pour extraction ciblée
 */

import type { DocumentSections, DocumentSection } from '@/types/extraction-pipeline'

interface SectionPattern {
    name: string
    patterns: RegExp[]
    priority: number
}

// Patterns pour détecter les sections (FR + EN)
const SECTION_PATTERNS: SectionPattern[] = [
    {
        name: 'specifications',
        patterns: [
            /technical\s+specifications?/i,
            /caractéristiques\s+techniques/i,
            /données\s+techniques/i,
            /technical\s+data/i,
            /specifications?\s+table/i,
            /performance\s+data/i
        ],
        priority: 1
    },
    {
        name: 'maintenance',
        patterns: [
            /maintenance\s+schedule/i,
            /entretien/i,
            /maintenance\s+préventive/i,
            /preventive\s+maintenance/i,
            /service\s+intervals?/i,
            /periodic\s+maintenance/i,
            /lubrication/i,
            /graissage/i
        ],
        priority: 2
    },
    {
        name: 'dryer',
        patterns: [
            /\bdryer\b/i,
            /sécheur/i,
            /secheur/i,
            /refrigerated\s+dryer/i,
            /air\s+dryer/i,
            /desiccant/i,
            /dessiccant/i
        ],
        priority: 3
    },
    {
        name: 'electrical',
        patterns: [
            /electrical\s+diagrams?/i,
            /schémas?\s+électriques?/i,
            /wiring\s+diagrams?/i,
            /electrical\s+connections?/i,
            /connexions?\s+électriques?/i,
            /circuit\s+diagrams?/i,
            /légende\s+électrique/i,
            /electrical\s+legend/i
        ],
        priority: 4
    },
    {
        name: 'pneumatic',
        patterns: [
            /pneumatic\s+circuit/i,
            /schéma\s+pneumatique/i,
            /air\s+system/i,
            /flow\s+diagram/i,
            /circuit\s+d'air/i
        ],
        priority: 5
    },
    {
        name: 'troubleshooting',
        patterns: [
            /troubleshooting/i,
            /diagnostic/i,
            /recherche\s+des?\s+pannes?/i,
            /fault\s+finding/i,
            /error\s+codes?/i,
            /alarm\s+codes?/i,
            /codes?\s+d'erreur/i,
            /codes?\s+d'alarme/i
        ],
        priority: 6
    },
    {
        name: 'safety',
        patterns: [
            /safety\s+instructions?/i,
            /consignes?\s+de\s+sécurité/i,
            /safety\s+precautions?/i,
            /warning\s+symbols?/i,
            /symboles?\s+de\s+danger/i
        ],
        priority: 7
    },
    {
        name: 'installation',
        patterns: [
            /installation/i,
            /mise\s+en\s+service/i,
            /setup/i,
            /commissioning/i
        ],
        priority: 8
    },
    {
        name: 'components',
        patterns: [
            /component\s+list/i,
            /liste\s+des?\s+composants?/i,
            /parts?\s+list/i,
            /nomenclature/i,
            /bill\s+of\s+materials?/i
        ],
        priority: 9
    }
]

/**
 * Détecte les sections dans le texte PDF
 * @param pdfText - Texte complet du PDF
 * @param pageTexts - Texte par page (optionnel pour meilleure détection)
 */
export function detectDocumentSections(
    pdfText: string,
    pageTexts?: { page: number; text: string }[]
): DocumentSections {
    const sections: DocumentSections = {}

    // Si on a le texte par page, utiliser pour meilleure détection
    if (pageTexts && pageTexts.length > 0) {
        for (const pattern of SECTION_PATTERNS) {
            const section = findSectionInPages(pageTexts, pattern)
            if (section) {
                sections[pattern.name] = section
            }
        }
    } else {
        // Détection basique sur texte complet
        for (const pattern of SECTION_PATTERNS) {
            const section = findSectionInText(pdfText, pattern)
            if (section) {
                sections[pattern.name] = section
            }
        }
    }

    console.log(`[Section Detector] Found ${Object.keys(sections).length} sections:`,
        Object.keys(sections).join(', '))

    return sections
}

/**
 * Trouve une section dans les pages du PDF
 */
function findSectionInPages(
    pages: { page: number; text: string }[],
    pattern: SectionPattern
): DocumentSection | null {
    let startPage = -1
    let endPage = -1
    let sectionText = ''
    let confidence = 0

    for (const { page, text } of pages) {
        for (const regex of pattern.patterns) {
            if (regex.test(text)) {
                if (startPage === -1) {
                    startPage = page
                    confidence = 0.9 // Haute confiance si header trouvé
                }
                endPage = page
                sectionText += text + '\n'
                break
            }
        }

        // Continuer à collecter le texte si on est dans la section
        if (startPage !== -1 && page > startPage && page <= startPage + 10) {
            // Limiter à 10 pages après le début de la section
            if (!sectionText.includes(text)) {
                sectionText += text + '\n'
                endPage = page
            }
        }
    }

    if (startPage === -1) {
        return null
    }

    return {
        name: pattern.name,
        startPage,
        endPage,
        text: sectionText.trim(),
        confidence
    }
}

/**
 * Trouve une section dans le texte complet
 */
function findSectionInText(
    fullText: string,
    pattern: SectionPattern
): DocumentSection | null {
    for (const regex of pattern.patterns) {
        const match = fullText.match(regex)
        if (match && match.index !== undefined) {
            // Extraire environ 5000 caractères après le match
            const startIndex = match.index
            const endIndex = Math.min(startIndex + 15000, fullText.length)
            const sectionText = fullText.substring(startIndex, endIndex)

            return {
                name: pattern.name,
                startPage: 0, // Inconnu sans pagination
                endPage: 0,
                text: sectionText.trim(),
                confidence: 0.7 // Confiance moyenne sans pages
            }
        }
    }

    return null
}

/**
 * Estime le nombre de pages basé sur la longueur du texte
 */
export function estimatePageCount(text: string): number {
    // Environ 3000 caractères par page en moyenne
    return Math.ceil(text.length / 3000)
}

/**
 * Divise le texte en chunks gérables pour l'API
 */
export function splitTextIntoChunks(
    text: string,
    maxChars: number = 50000
): string[] {
    const chunks: string[] = []

    // Essayer de couper aux sauts de page ou sections
    const pageBreaks = text.split(/\n{3,}|\f/)

    let currentChunk = ''
    for (const section of pageBreaks) {
        if (currentChunk.length + section.length > maxChars) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim())
            }
            currentChunk = section
        } else {
            currentChunk += '\n\n' + section
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim())
    }

    return chunks
}

/**
 * Priorise les sections pour l'extraction
 */
export function prioritizeSections(sections: DocumentSections): string[] {
    const priorityOrder = [
        'specifications',
        'components',
        'dryer',
        'electrical',
        'maintenance',
        'troubleshooting',
        'safety',
        'pneumatic',
        'installation'
    ]

    return priorityOrder.filter(name => sections[name] !== undefined)
}
