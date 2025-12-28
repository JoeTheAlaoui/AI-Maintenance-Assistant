// lib/extraction/tiered-extractor.ts
// Tiered extraction: Try regex first (free), AI only if needed

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateDocumentHash, getCachedMetadata, setCachedMetadata } from '@/lib/cache/metadata-cache';

interface ExtractionResult {
    name?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    category?: string;
    description?: string;
    confidence: number;
    method: 'regex' | 'ai' | 'hybrid' | 'cache';
}

interface RegexExtractionResult {
    manufacturer?: string;
    model?: string;
    name?: string;
    confidence: number;
}

// ============================================
// TIER 1: REGEX-BASED EXTRACTION (FREE, INSTANT)
// ============================================

/**
 * Extract metadata using regex patterns (no API cost)
 */
export function extractWithRegex(text: string): RegexExtractionResult {
    console.log('\n🔍 ========= TIER 1: REGEX EXTRACTION =========');

    const result: RegexExtractionResult = {
        confidence: 0,
    };

    // Extract first 1500 chars (page 1-2)
    const firstPage = text.substring(0, 1500);
    const first5000 = text.substring(0, 5000);

    // ========================================
    // 🆕 IMPROVED NAME EXTRACTION
    // ========================================

    // Priority 1: Known equipment keywords (highest confidence)
    const EQUIPMENT_KEYWORDS = [
        'MEGABLOC',
        'MALAXEUR',
        'TRANSBORDEUR',
        'TRANSPALETTE',
        'CENTRALE',
        'PRESSE',
        'VIBRATEUR',
        'CONVOYEUR',
        'TRANSPORTEUR',
        'DOSEUR',
        'MELANGEUR',
        'MULTIFOURCHE',
    ];

    for (const keyword of EQUIPMENT_KEYWORDS) {
        // Check if keyword exists in first page
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (!keywordRegex.test(firstPage)) continue;

        // Pattern 1: Keyword alone on a line (best match)
        const pattern1 = new RegExp(`^\\s*${keyword}\\s*$`, 'im');
        if (pattern1.test(firstPage)) {
            result.name = keyword;
            result.confidence = 0.98;
            console.log(`   ✅ Equipment name (standalone): "${result.name}"`);
            break;
        }

        // Pattern 2: Keyword + short descriptor (e.g., "MEGABLOC AVEC BI-COUCHE")
        const pattern2 = new RegExp(`\\b(${keyword}(?:\\s+(?:AVEC|DE|TYPE|POUR)[^\\n]{0,20})?)`, 'i');
        const match2 = firstPage.match(pattern2);
        if (match2) {
            let name = match2[1].trim().toUpperCase();

            // Remove trailing numbers/dimensions (e.g., "1240 x 1200")
            name = name.replace(/\s+\d+\s*[xX×]\s*\d+.*$/, '');
            name = name.replace(/\s+BANDEJA.*$/i, '');
            name = name.replace(/\s+TABLE.*$/i, '');

            // Limit length
            if (name.length > 35) {
                const lastSpace = name.substring(0, 35).lastIndexOf(' ');
                name = lastSpace > 15 ? name.substring(0, lastSpace) : name.substring(0, 35);
            }

            result.name = name.trim();
            result.confidence = 0.95;
            console.log(`   ✅ Equipment name (keyword): "${result.name}"`);
            break;
        }

        // Pattern 3: Just the keyword (fallback)
        result.name = keyword;
        result.confidence = 0.90;
        console.log(`   ✅ Equipment name (keyword only): "${result.name}"`);
        break;
    }

    // Priority 2: Pattern after "ENTRETIEN" or "MANUEL"
    if (!result.name) {
        const contextPatterns = [
            /ENTRETIEN[^\n]*\n+\s*([A-Z][A-Z\s-]{4,40})/i,
            /MANUEL[^\n]*\n+\s*([A-Z][A-Z\s-]{4,40})/i,
            /LISTE.*RECHANGE[^\n]*\n+\s*([A-Z][A-Z\s-]{4,40})/i,
        ];

        for (const pattern of contextPatterns) {
            const match = firstPage.match(pattern);
            if (match) {
                const candidate = match[1].trim();

                // Filter out common false positives
                const blacklist = [
                    'LES GEANTS',
                    'REVETEMENT',
                    'MAROC',
                    'POYATOS',
                    'ESPANA',
                    'ESPAÑA',
                    'PIECES DE RECHANGE',
                ];

                const isBlacklisted = blacklist.some(term =>
                    candidate.toUpperCase().includes(term)
                );

                if (!isBlacklisted && candidate.length >= 4) {
                    result.name = candidate.toUpperCase();
                    result.confidence = Math.max(result.confidence, 0.85);
                    console.log(`   ✅ Equipment name detected (context): "${result.name}"`);
                    break;
                }
            }
        }
    }

    // Priority 3: Title line (short ALL CAPS, not slogan)
    if (!result.name) {
        const lines = firstPage.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        for (let i = 0; i < Math.min(lines.length, 15); i++) {
            const line = lines[i];

            // Must be: All uppercase, 4-30 chars, not a common header
            if (
                line === line.toUpperCase() &&
                line.length >= 4 &&
                line.length <= 30 &&
                /^[A-Z0-9\s-]+$/.test(line)
            ) {
                const blacklist = [
                    'ENTRETIEN',
                    'MANUEL',
                    'LISTE',
                    'PIECES',
                    'RECHANGE',
                    'LES GEANTS',
                    'REVETEMENT',
                    'MAROC',
                    'OCTOBRE',
                    'PAGE',
                    'INDEX',
                ];

                const isBlacklisted = blacklist.some(term => line.includes(term));

                if (!isBlacklisted) {
                    result.name = line;
                    result.confidence = Math.max(result.confidence, 0.75);
                    console.log(`   ✅ Equipment name detected (title): "${result.name}"`);
                    break;
                }
            }
        }
    }

    // ========== POYATOS DETECTION ==========
    const poyatosPatterns = [
        /pol[ií]gono.*juncaril/i,
        /albolote.*granada/i,
        /18220.*albolote/i,
        /poyatos\.com/i,
        /taller@poyatos/i,
        /\bpoyatos\b/i,
    ];

    for (const pattern of poyatosPatterns) {
        if (pattern.test(first5000)) {
            result.manufacturer = 'POYATOS';
            result.confidence = Math.max(result.confidence, 0.95);
            console.log('   ✅ POYATOS detected via regex pattern');
            break;
        }
    }

    // ========== MODEL DETECTION ==========
    const modelPatterns = [
        // Explicit labels
        { regex: /Type[:\s]+([A-Z]{2,4}-?\d{3,4}[A-Z]?)/i, name: 'Type:' },
        { regex: /Ref[:\s]+([A-Z]{2,4}-?\d{3,4}[A-Z]?)/i, name: 'Ref:' },
        { regex: /Model[:\s]+([A-Z]{2,4}-?\d{3,4}[A-Z]?)/i, name: 'Model:' },
        { regex: /Modèle[:\s]+([A-Z]{2,4}-?\d{3,4}[A-Z]?)/i, name: 'Modèle:' },

        // Standalone patterns (common POYATOS models)
        { regex: /\b(MF-?\d{3,4}[A-Z]?)\b/i, name: 'MF-xxx' },
        { regex: /\b(MP-?\d{3,4}[A-Z]?)\b/i, name: 'MP-xxx' },
        { regex: /\b(TB-?\d{3,4}[A-Z]?)\b/i, name: 'TB-xxx' },
        { regex: /\b(DC-?\d{3,4}[A-Z]?)\b/i, name: 'DC-xxx' },
    ];

    for (const { regex, name } of modelPatterns) {
        const match = first5000.match(regex);
        if (match) {
            result.model = match[1].toUpperCase();
            result.confidence = Math.max(result.confidence, 0.85);
            console.log(`   ✅ Model detected via ${name}: ${result.model}`);
            break;
        }
    }

    // Calculate overall confidence
    if (result.manufacturer && result.model) {
        result.confidence = 0.92;
    } else if (result.manufacturer || result.model) {
        result.confidence = Math.max(result.confidence, 0.75);
    }

    if (result.confidence > 0.7) {
        console.log(`✅ Regex extraction successful (${(result.confidence * 100).toFixed(0)}% confidence)`);
    } else {
        console.log('⚠️ Regex extraction incomplete, will need AI');
    }
    console.log('================================================\n');

    return result;
}

// ============================================
// TIER 2: AI-BASED EXTRACTION (WITH FEW-SHOT)
// ============================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Extract metadata using AI with few-shot learning
 */
async function extractWithAI(
    text: string,
    fileName: string,
    hints: RegexExtractionResult = { confidence: 0 }
): Promise<ExtractionResult> {
    console.log('\n🤖 ========= TIER 2: AI EXTRACTION =========');

    // Use first 3000 chars (page 1-2)
    const textSample = text.substring(0, 3000);

    const prompt = `You are extracting equipment metadata from an industrial manual.

**CONFIRMED PATTERNS FROM REGEX:**
${hints.manufacturer ? `- Manufacturer: ${hints.manufacturer} (confirmed)` : '- Manufacturer: Not detected'}
${hints.model ? `- Model: ${hints.model} (confirmed)` : '- Model: Not detected'}
${hints.name ? `- Name: ${hints.name} (detected)` : '- Name: Not detected'}

**YOUR TASK:**
Complete or verify the extraction for this document.

File: ${fileName}

Text Sample:
"""
${textSample}
"""

Return JSON only:
{
  "name": "Equipment name from title/header",
  "manufacturer": "${hints.manufacturer || 'Extract from first page or null'}",
  "model": "${hints.model || 'Model number or null'}",
  "serial_number": null,
  "category": "Equipment type (Malaxeur, Transbordeur, etc)",
  "description": "Brief description in French (1 sentence)"
}

**RULES:**
- Keep confirmed values from regex
- If POYATOS address visible, manufacturer MUST be POYATOS
- Model patterns: MF-1500, MP-500, TB-3000, DC-SPL
- Respond with ONLY valid JSON`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            temperature: 0.1,
            messages: [{ role: 'user', content: prompt }],
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.trim().replace(/```json|```/g, '');
        const metadata = JSON.parse(cleaned);

        console.log('✅ AI extraction complete:');
        console.log(`   Name: ${metadata.name || 'N/A'}`);
        console.log(`   Manufacturer: ${metadata.manufacturer || 'N/A'}`);
        console.log(`   Model: ${metadata.model || 'N/A'}`);
        console.log('================================================\n');

        return {
            ...metadata,
            confidence: 0.85,
            method: hints.confidence > 0 ? 'hybrid' : 'ai',
        };

    } catch (error) {
        console.error('❌ AI extraction failed:', error);

        // Return regex results if available
        return {
            name: hints.name || fileName.replace('.pdf', ''),
            manufacturer: hints.manufacturer,
            model: hints.model,
            category: 'Equipment',
            description: 'Installation automatique',
            confidence: hints.confidence,
            method: 'regex',
        };
    }
}

// ============================================
// MAIN: TIERED APPROACH
// ============================================

/**
 * Extract metadata using tiered approach: Cache → Regex → AI
 */
export async function extractWithTieredApproach(
    supabase: SupabaseClient,
    text: string,
    fileName: string
): Promise<ExtractionResult> {
    console.log('\n📋 ========= TIERED METADATA EXTRACTION =========');
    console.log(`📄 File: ${fileName}`);

    // TIER 0: Check cache first
    const docHash = generateDocumentHash(text);
    const cached = await getCachedMetadata(supabase, docHash);

    if (cached && cached.manufacturer && cached.confidence > 0.7) {
        console.log('✅ Using cached metadata (no API cost)');
        return {
            name: cached.name,
            manufacturer: cached.manufacturer,
            model: cached.model,
            serial_number: cached.serial_number,
            category: cached.category,
            description: cached.description,
            confidence: cached.confidence,
            method: 'cache',
        };
    }

    // TIER 1: Try regex (free)
    const regexResult = extractWithRegex(text);

    // If regex got both manufacturer AND model with high confidence, use it
    if (regexResult.manufacturer && regexResult.model && regexResult.confidence > 0.85) {
        console.log('✅ Regex sufficient (skipping AI call)');

        const result: ExtractionResult = {
            name: regexResult.name || fileName.replace('.pdf', '').replace(/_/g, ' '),
            manufacturer: regexResult.manufacturer,
            model: regexResult.model,
            category: inferCategory(regexResult.name || ''),
            description: 'Installation automatique POYATOS',
            confidence: regexResult.confidence,
            method: 'regex',
        };

        // Cache for future
        await setCachedMetadata(supabase, docHash, {
            ...result,
            extraction_method: 'regex',
        });

        return result;
    }

    // TIER 2: Use AI with regex hints
    const aiResult = await extractWithAI(text, fileName, regexResult);

    // Cache the result
    await setCachedMetadata(supabase, docHash, {
        ...aiResult,
        extraction_method: aiResult.method,
    });

    console.log('================================================\n');

    return aiResult;
}

/**
 * Infer category from equipment name
 */
function inferCategory(name: string): string {
    const upper = name.toUpperCase();

    if (upper.includes('MALAXEUR')) return 'Malaxeur';
    if (upper.includes('TRANSBORDEUR')) return 'Transbordeur';
    if (upper.includes('TRANSPALETTE')) return 'Transpalette';
    if (upper.includes('CENTRALE')) return 'Centrale à béton';
    if (upper.includes('MEGABLOC')) return 'Presse';
    if (upper.includes('PRESSE')) return 'Presse';

    return 'Équipement';
}
