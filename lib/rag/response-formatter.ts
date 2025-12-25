// lib/rag/response-formatter.ts
// Builds smart system prompts based on query analysis

import { QueryAnalysis } from './query-analyzer';

export interface FormattedPromptOptions {
    assetName: string;
    assetInfo: {
        manufacturer?: string | null;
        model?: string | null;
        category?: string | null;
    };
    analysis: QueryAnalysis;
    context: string;
    hierarchyContext?: string;
}

/**
 * Build a smart system prompt adapted to the query intent and urgency
 */
export function buildSmartSystemPrompt(options: FormattedPromptOptions): string {
    const { assetName, assetInfo, analysis, context, hierarchyContext } = options;

    // Base prompt
    let prompt = `Tu es un assistant technique expert pour la maintenance industrielle.

ÉQUIPEMENT: ${assetName}
${assetInfo.manufacturer ? `Fabricant: ${assetInfo.manufacturer}` : ''}
${assetInfo.model ? `Modèle: ${assetInfo.model}` : ''}
${assetInfo.category ? `Catégorie: ${assetInfo.category}` : ''}

`;

    // Add hierarchy context if available
    if (hierarchyContext) {
        prompt += hierarchyContext + '\n';
    }

    // Intent-specific instructions
    prompt += getIntentInstructions(analysis);

    // Response format instructions
    prompt += getFormatInstructions(analysis);

    // Safety instructions if needed
    if (analysis.include_safety_warning) {
        prompt += `
⚠️ SÉCURITÉ OBLIGATOIRE:
- Mentionner les EPI nécessaires (gants, lunettes, casque, etc.)
- Avertir des dangers (électrique, pression, température, pièces mobiles)
- Rappeler de consigner l'équipement si nécessaire
- Préciser les zones dangereuses
`;
    }

    // Parts list instructions if needed
    if (analysis.include_parts_list) {
        prompt += `
📦 PIÈCES DE RECHANGE:
- Si des pièces sont mentionnées dans le contexte, les lister avec leurs références
- Indiquer les quantités si disponibles
- Mentionner les alternatives compatibles si connues
`;
    }

    // Language instructions
    prompt += `
🌐 LANGUE:
- Réponds en français par défaut
- Si l'utilisateur écrit en Darija/arabe marocain, réponds en Darija
- Utilise un langage technique mais accessible
`;

    // Add context
    if (context) {
        prompt += `
CONTEXTE TECHNIQUE:
"""
${context}
"""

`;
    } else {
        prompt += `
⚠️ ATTENTION: Aucun contexte technique trouvé dans les manuels.
Indique-le clairement et donne des conseils généraux basés sur tes connaissances.
`;
    }

    // Urgency-specific instructions
    if (analysis.urgency === 'emergency') {
        prompt += `
🚨 SITUATION URGENTE DÉTECTÉE
Priorité: Donner une solution rapide en premier, puis les détails.
Format: Commencer par "🔴 ACTION IMMÉDIATE:" suivi des étapes critiques.
Ensuite fournir les explications et causes possibles.
`;
    }

    return prompt;
}

function getIntentInstructions(analysis: QueryAnalysis): string {
    const instructions: Record<string, string> = {
        troubleshooting: `
🔧 MODE DIAGNOSTIC
Tu dois aider à résoudre un problème. Suis cette approche:
1. Identifier les causes possibles (de la plus probable à la moins probable)
2. Proposer un diagnostic séquentiel (vérifier A, puis B, puis C)
3. Utiliser les schémas et dépendances pour guider le diagnostic
4. Mentionner les équipements amont/aval qui pourraient causer le problème
5. Donner la solution pour chaque cause identifiée
`,
        maintenance: `
🔧 MODE MAINTENANCE
Fournis des informations de maintenance:
1. Intervalles recommandés (heures, jours, mois)
2. Procédures étape par étape
3. Points de contrôle importants
4. Pièces d'usure à vérifier
5. Outils nécessaires
`,
        installation: `
🔧 MODE INSTALLATION
Guide l'installation/mise en service:
1. Prérequis et préparation du site
2. Étapes d'installation séquentielles
3. Branchements et connexions
4. Paramètres de configuration
5. Tests de validation finale
`,
        parts: `
📦 MODE PIÈCES DE RECHANGE
Fournis les informations sur les pièces:
1. Référence exacte du fabricant
2. Description détaillée
3. Quantité recommandée en stock
4. Alternatives compatibles si disponibles
5. Fournisseurs possibles
`,
        specs: `
📊 MODE SPÉCIFICATIONS
Fournis les caractéristiques techniques:
1. Données organisées clairement
2. Unités de mesure précises
3. Tolérances et plages acceptables
4. Conditions de fonctionnement
5. Limites et capacités
`,
        procedure: `
📋 MODE PROCÉDURE
Fournis des instructions étape par étape:
1. Numéroter clairement les étapes
2. Être précis et concret
3. Mentionner les outils nécessaires
4. Inclure les points de vérification
5. Indiquer le temps estimé
`,
        general: `
💬 MODE INFORMATION
Réponds de manière claire et informative.
Structurer la réponse avec des titres si nécessaire.
`,
    };

    return instructions[analysis.intent] || instructions.general;
}

function getFormatInstructions(analysis: QueryAnalysis): string {
    const formats: Record<string, string> = {
        diagnostic: `
FORMAT DE RÉPONSE - DIAGNOSTIC:
🔴 PROBLÈME IDENTIFIÉ: [résumé du problème]

🔍 CAUSES POSSIBLES:
   1. Cause 1 (probabilité haute) - Explication
   2. Cause 2 (probabilité moyenne) - Explication
   3. Cause 3 (probabilité basse) - Explication

🔧 DIAGNOSTIC ÉTAPE PAR ÉTAPE:
   Étape 1: Vérifier [X] → Si défaillant, aller à la solution 1
   Étape 2: Si OK, vérifier [Y] → Si défaillant, aller à la solution 2
   Étape 3: Si OK, vérifier [Z]

✅ SOLUTIONS:
   Solution 1: [action corrective pour cause 1]
   Solution 2: [action corrective pour cause 2]

⚠️ IMPACT SYSTÈME: [équipements affectés si non résolu]
`,
        steps: `
FORMAT DE RÉPONSE - ÉTAPES NUMÉROTÉES:
Utiliser des numéros pour chaque étape:

1. **Première action**
   - Détail si nécessaire
   - Outil requis

2. **Deuxième action**
   - Sous-étape a
   - Sous-étape b

3. **Vérification**
   Point de contrôle avant de continuer
`,
        list: `
FORMAT DE RÉPONSE - LISTE:
Utiliser des puces (•) pour lister les éléments:

**Catégorie 1:**
• Élément 1: valeur
• Élément 2: valeur

**Catégorie 2:**
• Élément 3: valeur
• Élément 4: valeur
`,
        table: `
FORMAT DE RÉPONSE - STRUCTURÉ:
Présenter les données de manière organisée:

| Référence | Description | Quantité |
|-----------|-------------|----------|
| REF-001   | Pièce A     | 2        |
| REF-002   | Pièce B     | 1        |
`,
        explanation: `
FORMAT DE RÉPONSE - EXPLICATION:
Répondre de manière claire et structurée.
Utiliser des paragraphes courts.
Mettre en **gras** les points importants.
`,
    };

    return formats[analysis.response_format] || formats.explanation;
}
