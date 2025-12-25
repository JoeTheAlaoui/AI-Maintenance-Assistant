// lib/rag/dependency-suggester.ts
// AI-powered dependency suggestion based on equipment manuals

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface DependencySuggestion {
    depends_on_name: string;
    depends_on_id?: string;
    dependency_type: 'feeds' | 'powers' | 'controls' | 'cools' | 'lubricates';
    criticality: 'critical' | 'high' | 'medium' | 'low';
    reasoning: string;
    confidence: number;
}

export interface SuggestionsResult {
    upstream: DependencySuggestion[];
    downstream: DependencySuggestion[];
}

/**
 * Suggest dependencies for an asset based on its documentation
 * Uses GPT-4o to analyze manuals and existing assets
 */
export async function suggestDependencies(
    assetName: string,
    assetType: string,
    documentText: string,
    existingAssets: { id: string; name: string; level: string }[]
): Promise<SuggestionsResult> {

    const existingAssetsList = existingAssets
        .map(a => `- ${a.name} (${a.level})`)
        .join('\n');

    const prompt = `Tu es un expert en maintenance industrielle. Analyse cet équipement et suggère ses dépendances.

ÉQUIPEMENT:
- Nom: ${assetName}
- Type: ${assetType}

ASSETS EXISTANTS DANS LE SYSTÈME:
${existingAssetsList || 'Aucun autre asset pour le moment'}

EXTRAIT DU MANUEL (de l'équipement):
"""
${documentText.slice(0, 4000)}
"""

Basé sur le document et tes connaissances industrielles, suggère:

1. DÉPENDANCES AMONT (ce qui alimente cet équipement):
   - Qu'est-ce qui fournit les matières premières?
   - Qu'est-ce qui fournit l'électricité?
   - Qu'est-ce qui contrôle cet équipement?

2. DÉPENDANCES AVAL (ce que cet équipement alimente):
   - Qu'est-ce qui reçoit la sortie de cet équipement?
   - Qu'est-ce qui dépend du fonctionnement de cet équipement?

Pour chaque dépendance:
- Associe aux assets existants si possible (utilise les noms EXACTS de la liste)
- Si pas dans la liste, suggère le nom du composant
- Indique le type de dépendance et la criticité

Réponds UNIQUEMENT en JSON:
{
  "upstream": [
    {
      "depends_on_name": "Centrale à Béton",
      "dependency_type": "feeds",
      "criticality": "critical",
      "reasoning": "Le malaxeur reçoit le béton de la centrale",
      "confidence": 0.9
    }
  ],
  "downstream": [
    {
      "depends_on_name": "Presse",
      "dependency_type": "feeds",
      "criticality": "critical", 
      "reasoning": "Le malaxeur alimente la presse en béton mélangé",
      "confidence": 0.85
    }
  ]
}

Types de dépendance: feeds, powers, controls, cools, lubricates
Criticité: critical (ne peut pas fonctionner sans), high, medium, low`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
        const suggestions = JSON.parse(cleaned);

        // Try to match suggested names to existing asset IDs
        for (const dep of [...(suggestions.upstream || []), ...(suggestions.downstream || [])]) {
            const match = existingAssets.find(a =>
                a.name.toLowerCase().includes(dep.depends_on_name.toLowerCase()) ||
                dep.depends_on_name.toLowerCase().includes(a.name.toLowerCase())
            );
            if (match) {
                dep.depends_on_id = match.id;
            }
        }

        return {
            upstream: suggestions.upstream || [],
            downstream: suggestions.downstream || [],
        };
    } catch (error) {
        console.error('Dependency suggestion error:', error);
        return { upstream: [], downstream: [] };
    }
}
