// lib/rag/schematic-analyzer.ts
// Vision AI-powered schematic analysis for industrial diagrams

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type SchematicType = 'electrical' | 'pneumatic' | 'hydraulic' | 'mechanical' | 'pid' | 'other';

export interface Component {
    ref: string;         // "Q1", "KM1", "M1"
    type: string;        // "disjoncteur", "contacteur", "moteur"
    value?: string;      // "16A", "5.5kW"
    description?: string;
}

export interface Connection {
    from: string;
    to: string;
    type?: string;       // "power", "control", "signal"
}

export interface SchematicAnalysis {
    schematic_type: SchematicType;
    components: Component[];
    connections: Connection[];
    diagnostic_sequence: string[];
    description: string;
    confidence: number;
}

/**
 * Analyze a schematic image using GPT-4o Vision
 * Extracts components, connections, and diagnostic sequences
 */
export async function analyzeSchematicImage(imageBase64: string): Promise<SchematicAnalysis | null> {
    const prompt = `Tu es un expert en maintenance industrielle. Analyse ce schéma/diagramme technique.

Extrais:
1. Type de schéma (electrical, pneumatic, hydraulic, mechanical, pid)
2. Tous les composants avec leurs références et valeurs
3. Les connexions entre composants (qu'est-ce qui est connecté à quoi)
4. La séquence de diagnostic (ordre pour vérifier les composants lors du dépannage)

Réponds UNIQUEMENT en JSON:
{
  "schematic_type": "electrical|pneumatic|hydraulic|mechanical|pid|other",
  "components": [
    {"ref": "Q1", "type": "disjoncteur", "value": "16A", "description": "Disjoncteur principal"}
  ],
  "connections": [
    {"from": "L1-L2-L3", "to": "Q1", "type": "power"},
    {"from": "Q1", "to": "KM1", "type": "power"}
  ],
  "diagnostic_sequence": ["Q1", "KM1", "RT1", "M1"],
  "description": "Description brève de ce que montre ce schéma",
  "confidence": 0.0-1.0
}

Si ceci N'EST PAS un schéma technique, retourne:
{"schematic_type": "other", "components": [], "connections": [], "diagnostic_sequence": [], "description": "Pas un schéma", "confidence": 0}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();

        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Schematic analysis error:', error);
        return null;
    }
}

/**
 * Quick check if a page image contains a schematic
 * Uses GPT-4o-mini for cost-effective detection
 */
export async function isSchematicPage(imageBase64: string): Promise<boolean> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Cette page contient-elle un schéma technique (électrique, pneumatique, hydraulique, P&ID, dessin mécanique)? Réponds UNIQUEMENT "oui" ou "non".'
                        },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
                    ]
                }
            ],
            temperature: 0,
            max_tokens: 10,
        });

        const answer = response.choices[0]?.message?.content?.toLowerCase().trim();
        return answer === 'oui' || answer === 'yes';
    } catch (error) {
        console.error('Schematic detection error:', error);
        return false;
    }
}

/**
 * Detect all pages containing schematics in a PDF
 * Returns array of 1-indexed page numbers
 */
export async function detectSchematicPages(pdfImages: Buffer[]): Promise<number[]> {
    const schematicPages: number[] = [];

    for (let i = 0; i < pdfImages.length; i++) {
        const imageBase64 = pdfImages[i].toString('base64');
        const isSchematic = await isSchematicPage(imageBase64);

        if (isSchematic) {
            schematicPages.push(i + 1); // 1-indexed page numbers
            console.log(`📐 Page ${i + 1}: Schematic detected`);
        }
    }

    return schematicPages;
}

/**
 * Generate a searchable text chunk from schematic analysis
 * This text will be embedded for RAG retrieval
 */
export function generateSchematicChunk(analysis: SchematicAnalysis, pageNumber: number): string {
    const componentsList = analysis.components
        .map(c => `- ${c.ref}: ${c.type}${c.value ? ` (${c.value})` : ''}${c.description ? ` - ${c.description}` : ''}`)
        .join('\n');

    const connectionsList = analysis.connections
        .map(c => `- ${c.from} → ${c.to}${c.type ? ` (${c.type})` : ''}`)
        .join('\n');

    return `[SCHÉMA ${analysis.schematic_type.toUpperCase()} - Page ${pageNumber}]

Description: ${analysis.description}

Composants:
${componentsList || 'Aucun composant identifié'}

Connexions:
${connectionsList || 'Aucune connexion identifiée'}

Séquence de diagnostic: ${analysis.diagnostic_sequence.length > 0 ? analysis.diagnostic_sequence.join(' → ') : 'Non définie'}

Pour dépanner ce circuit, vérifier dans l'ordre: ${analysis.diagnostic_sequence.join(', ')}`;
}
