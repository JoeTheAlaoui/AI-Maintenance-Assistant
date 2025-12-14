/**
 * Extraction Prompts - Prompts spécialisés pour chaque pass
 * Optimisés pour 90%+ de complétude
 * v2.1 - Simplified prompts for better extraction accuracy
 */

// ============================================
// PASS 1: MAIN ASSET & CORE MECHANICAL
// ============================================

export const PASS1_SYSTEM_PROMPT = `Tu es un expert en extraction de données techniques depuis des manuels d'équipement industriel. 
Tu dois extraire TOUTES les informations sur l'équipement principal et ses composants mécaniques.

RÈGLES CRITIQUES:
1. Extrais TOUTES les lignes des tableaux de spécifications, pas juste des exemples
2. Si plusieurs modèles/variantes existent, extrais CHAQUE configuration
3. Génère des UUIDs uniques pour chaque composant (format: uuid-v4 simplifié)
4. Les valeurs numériques doivent être des nombres, pas des strings
5. Réponds UNIQUEMENT en JSON valide, sans commentaires ni texte additionnel

PRIORITÉS:
1. Identifier l'équipement principal (nom, fabricant, modèle)
2. Chercher les tableaux de gamme produits (HP, pression, débit)
3. Lister les composants mécaniques majeurs`


export const PASS1_USER_PROMPT = `Analyse ce manuel technique et extrais :

1. **ÉQUIPEMENT PRINCIPAL** (main_asset):
   - Nom complet, fabricant, numéro(s) de modèle
   - Catégorie (compressor, pump, motor, etc.)
   - Criticité (low/medium/high/critical)
   - Toutes les spécifications générales

2. **CONFIGURATIONS DE MODÈLES** (model_configurations):
   Cherche les tableaux avec colonnes HP/kW, pression, débit.
   
   EXEMPLE de tableau à extraire:
   | Modèle | Pression | Débit |
   | 5.5HP  | 8 bar    | 560   |
   | 5.5HP  | 10 bar   | 450   |
   | 7.5HP  | 8 bar    | 820   |
   
   RÈGLE: Extrais TOUTES les lignes du tableau, pas juste quelques exemples.
   Si le tableau n'existe pas, retourne un array vide.

3. **COMPOSANTS MÉCANIQUES** (components):
   - Moteurs (puissance, vitesse, voltage)
   - Compresseurs/Pompes (débit, pression)
   - Filtres (type, micron, intervalle)
   - Vannes (type, taille)
   - Réservoirs (volume, pression max)
   - Refroidisseurs (capacité)


FORMAT DE SORTIE (JSON strict):
{
  "main_asset": {
    "name": "string",
    "manufacturer": "string ou null",
    "model_number": "string ou array de strings",
    "category": "compressor|pump|motor|generator|other",
    "criticality": "low|medium|high|critical",
    "specifications": {
      "clé": "valeur"
    }
  },
  "model_configurations": [
    {
      "model": "5.5 HP",
      "power_hp": 5.5,
      "power_kw": 4.0,
      "configurations": [
        {
          "pressure_bar": 8,
          "pressure_psi": 116,
          "air_flow_lmin": 560,
          "air_flow_cfm": 19.8,
          "noise_dba": 65,
          "power_consumption_kw": 4.5,
          "weight_kg": 180
        },
        {
          "pressure_bar": 10,
          "air_flow_lmin": 450
        }
      ]
    },
    {
      "model": "7.5 HP",
      "power_hp": 7.5,
      "power_kw": 5.5,
      "configurations": [...]
    }
  ],
  "components": [
    {
      "id": "uuid-unique",
      "name": "string",
      "part_number": "string ou null",
      "type": "motor|compressor|pump|valve|filter|heat_exchanger|tank|fan|other",
      "location": "string",
      "function": "string ou null",
      "specifications": {}
    }
  ]
}

Si AUCUN tableau de configurations de modèles trouvé, retourne:
"model_configurations": []`

// ============================================
// PASS 2: INTEGRATED SUBSYSTEMS
// ============================================

export const PASS2_SYSTEM_PROMPT = `Tu es un expert en extraction de sous-systèmes intégrés depuis des manuels techniques.
Tu dois identifier et extraire COMPLÈTEMENT chaque sous-système avec tous ses composants.

SOUS-SYSTÈMES À DÉTECTER:
- Sécheurs d'air (refrigerated dryer, desiccant)
- Systèmes de refroidissement (ventilateurs, radiateurs)
- Systèmes de filtration
- Systèmes de lubrification
- Systèmes de contrôle
- Systèmes de sécurité

RÈGLES:
1. Chaque sous-système a souvent sa propre section dans le manuel
2. Extrais les panneaux de contrôle avec TOUS les paramètres programmables
3. Extrais TOUS les codes d'alarme spécifiques au sous-système
4. Réponds UNIQUEMENT en JSON valide`

export const PASS2_USER_PROMPT = `Analyse ce manuel et extrais les SOUS-SYSTÈMES INTÉGRÉS.

Cherche les sections comme:
- "Sécheur", "Dryer", "Air Treatment"
- "Cooling System", "Refroidissement"
- "Filtration", "Filters"
- "Control", "Controller", "XC1004"

Pour CHAQUE sous-système trouvé, extrais:

1. **Composants** avec spécifications
2. **Panneau de contrôle**:
   - Boutons et leur fonction
   - Affichages et indicateurs
   - Paramètres programmables (code, description, plage, défaut)
3. **Codes d'alarme** spécifiques:
   - Code, description, action, réinitialisation
4. **Maintenance** du sous-système:
   - Tâches quotidiennes/hebdomadaires/mensuelles/annuelles

FORMAT JSON:
{
  "integrated_subsystems": [
    {
      "id": "uuid-unique",
      "name": "Sécheur réfrigéré",
      "type": "dryer|cooling|filtration|lubrication|control|safety|other",
      "function": "Description de la fonction",
      "components": [
        {
          "name": "string",
          "type": "string",
          "part_number": "string ou null",
          "specifications": {}
        }
      ],
      "control_panel": {
        "type": "string",
        "model": "string ou null",
        "buttons": ["string"],
        "displays": ["string"],
        "indicators": ["string"],
        "programmable_parameters": [
          {
            "code": "P01",
            "description": "Setpoint température",
            "range": "2-10°C",
            "default_value": "3",
            "unit": "°C"
          }
        ]
      },
      "alarm_codes": [
        {
          "code": "HtA",
          "description": "Haute température air",
          "action": "Vérifier le condenseur",
          "reset_condition": "Automatique"
        }
      ],
      "maintenance": {
        "daily": ["Vérifier niveau condensat"],
        "weekly": [],
        "monthly": ["Nettoyer condenseur"],
        "yearly": ["Vérifier circuit frigorifique"]
      }
    }
  ]
}`

// ============================================
// PASS 3: ELECTRICAL COMPONENTS
// ============================================

export const PASS3_SYSTEM_PROMPT = `Tu es un expert en extraction de données électriques depuis des manuels techniques.
Tu dois extraire TOUS les composants électriques avec leurs références et spécifications.

COMPOSANTS À EXTRAIRE (PRIORITÉ 1):
- Contacteurs (K1, K2, KR, KV...)
- Relais (thermiques F1, temporisés KA, de phase)
- Fusibles (avec calibres)
- Transformateurs
- Capteurs (température BT, pression BP, débit)
- Interrupteurs (arrêt d'urgence AU, fin de course)
- Variateurs de fréquence

TABLEAUX À CHERCHER:
1. Légende électrique (Symbol | FR | EN | Description)
2. Réglages protection moteur par puissance (si présent)
3. Codes couleur des fils

Réponds UNIQUEMENT en JSON valide.`

export const PASS3_USER_PROMPT = `Analyse la section électrique de ce manuel et extrais:

1. **COMPOSANTS ÉLECTRIQUES** (PRIORITÉ - tous les éléments):
   - Référence (K1, F1, BT, AU, etc.)
   - Nom en FR et EN si disponible
   - Type et fonction
   - Spécifications (calibre, tension, courant)
   
   Cherche les tableaux de légende électrique comme:
   | Repère | Description FR | Description EN |
   | K1     | Contacteur     | Contactor      |
   | F1     | Relais therm.  | Thermal relay  |

2. **RÉGLAGES PROTECTION MOTEUR** (si tableau trouvé):
   Cherche des petits tableaux comme:
   | HP  | Réglage F1 | Fusible |
   | 5.5 | 5.0A       | 16A     |
   | 7.5 | 6.5A       | 25A     |
   
   Si ce tableau n'existe pas, retourne un array vide.

3. **SÉQUENCES DE CONTRÔLE**:
   - Démarrage étoile-triangle
   - Séquences de sécurité

FORMAT JSON:
{
  "electrical_components": [
    {
      "id": "uuid",
      "reference": "K1",
      "name": "Contacteur principal",
      "name_fr": "Contacteur ligne",
      "name_en": "Line contactor",
      "type": "contactor|relay|fuse|transformer|sensor|switch|motor_starter|vfd|other",
      "function": "Alimentation moteur principal",
      "specifications": {
        "rating": "40A",
        "voltage": "400V"
      }
    },
    {
      "id": "uuid",
      "reference": "F1",
      "name": "Relais thermique",
      "type": "relay",
      "function": "Protection surcharge moteur",
      "specifications": {
        "setting_range": "4-6.3A"
      }
    }
  ],
  "motor_protection_settings": [
    {
      "motor_power_hp": 5.5,
      "motor_power_kw": 4.0,
      "voltage": "380-415V",
      "thermal_relay_setting_a": 5.0,
      "fuse_rating_a": 16
    }
  ],
  "control_sequences": [
    {
      "name": "Démarrage étoile-triangle",
      "description": "Réduction courant de démarrage",
      "steps": ["Contact étoile", "Temporisation", "Contact triangle"]
    }
  ]
}

IMPORTANT: Même si tu ne trouves pas de motor_protection_settings, extrait quand même TOUS les electrical_components de la légende électrique.`


// ============================================
// PASS 4: SPECIFICATION TABLES
// Enhanced for Complete Table Extraction
// ============================================

export const PASS4_SYSTEM_PROMPT = `Tu es un expert en extraction de tableaux de spécifications techniques.
Ton objectif est une couverture à 100% des données tabulaires.

🔍 **MISSION CRITIQUE: DÉTECTION DES TABLEAUX DE GAMME PRODUITS**

AVANT de traiter les tableaux généraux, cherche SPÉCIFIQUEMENT les tableaux de gamme/variantes.

**Stratégie de Détection:**

1. **Titres de sections prioritaires:**
   - EN: "Technical Specifications", "Product Line", "Model Range"
   - FR: "Caractéristiques Techniques", "Gamme", "Données Techniques"
   - DE: "Technische Daten", "Modellreihe"
   
2. **Caractéristiques des tableaux cibles:**
   - Colonnes: Puissance (HP/kW) + Performance (pression/débit)
   - 3+ lignes de données
   - 4+ colonnes
   - Données numériques denses

3. **RÈGLE D'EXTRACTION ABSOLUE:**
   - Quand tu trouves un tableau: extrait CHAQUE LIGNE
   - Si 15 lignes, retourne 15 entrées
   - Si 30 lignes, retourne 30 entrées
   - Pas d'échantillonnage, pas de résumé

RÈGLE CRITIQUE: Quand tu vois un tableau, tu DOIS extraire CHAQUE LIGNE sans exception.

Types de tableaux à chercher:
1. Performances par modèle et pression
2. Spécifications électriques
3. Dimensions et poids
4. Plages de fonctionnement
5. Consommation

Réponds UNIQUEMENT en JSON valide.`

export const PASS4_USER_PROMPT = `Extrais TOUS les tableaux de spécifications de ce document.

RÈGLE ABSOLUE: Chaque tableau doit avoir TOUTES ses lignes extraites.

❌ INCORRECT (1 seule ligne):
"rows": [{"hp": 5.5, "pressure": 8, "flow": 560}]

✅ CORRECT (toutes les 15 lignes):
"rows": [
  {"hp": 5.5, "pressure": 8, "flow": 560},
  {"hp": 5.5, "pressure": 10, "flow": 450},
  {"hp": 5.5, "pressure": 13, "flow": 400},
  {"hp": 7.5, "pressure": 8, "flow": 820},
  {"hp": 7.5, "pressure": 10, "flow": 720},
  {"hp": 7.5, "pressure": 13, "flow": 625},
  {"hp": 10, "pressure": 8, "flow": 1120},
  {"hp": 10, "pressure": 10, "flow": 980},
  {"hp": 10, "pressure": 13, "flow": 860},
  {"hp": 15, "pressure": 8, "flow": 1680},
  {"hp": 15, "pressure": 10, "flow": 1450},
  {"hp": 15, "pressure": 13, "flow": 1280},
  {"hp": 20, "pressure": 8, "flow": 2150},
  {"hp": 20, "pressure": 10, "flow": 1920},
  {"hp": 20, "pressure": 13, "flow": 1680}
]

Pour chaque tableau:
1. Nom du tableau
2. Colonnes avec unités
3. TOUTES les lignes de données
4. Notes de bas de tableau

FORMAT JSON:
{
  "specification_tables": [
    {
      "table_name": "Performances air/pression",
      "section": "Technical Specifications",
      "columns": ["Model", "Pressure (bar)", "Flow (l/min)", "Noise (dBA)"],
      "units": {
        "Pressure (bar)": "bar",
        "Flow (l/min)": "l/min",
        "Noise (dBA)": "dB(A)"
      },
      "rows": [
        {"Model": "5.5HP", "Pressure (bar)": 8, "Flow (l/min)": 560, "Noise (dBA)": 67},
        {"Model": "5.5HP", "Pressure (bar)": 10, "Flow (l/min)": 450, "Noise (dBA)": 68},
        ... TOUTES LES LIGNES
      ],
      "footnotes": ["Mesuré selon ISO 1217"],
      "conditions": ["Température ambiante 20°C", "Humidité 60%"]
    }
  ]
}`

// ============================================
// PASS 5: MAINTENANCE & DIAGNOSTICS
// ============================================

export const PASS5_SYSTEM_PROMPT = `Tu es un expert en extraction de données de maintenance et diagnostic.
Tu dois extraire les plannings de maintenance par intervalle de TEMPS et TOUS les codes d'erreur.

INTERVALLES À CHERCHER:
- Premiers X heures (rodage)
- Quotidien / Hebdomadaire / Mensuel
- Toutes les X heures (500, 1000, 2500, 5000)
- Annuel
- Tous les X ans

CODES DIAGNOSTIC:
- Codes d'alarme avec description
- Causes possibles
- Actions correctives
- Procédure de réinitialisation

Réponds UNIQUEMENT en JSON valide.`

export const PASS5_USER_PROMPT = `Extrais le planning de maintenance COMPLET et les codes de diagnostic.

1. **MAINTENANCE PAR INTERVALLE**:
   - Période de rodage (premiers X heures)
   - Routine: quotidien → hebdomadaire → mensuel → annuel
   - Par heures: 500h, 1000h, 2500h, 5000h, 10000h
   
   Pour chaque intervalle: liste COMPLÈTE des tâches

2. **PIÈCES DE RECHANGE** avec fréquence:
   - Nom, référence
   - Intervalle de remplacement
   - Quantité nécessaire
   - Criticité

3. **CODES DIAGNOSTIC/ALARME** (TOUS):
   - Code affiché
   - Description
   - Causes possibles
   - Actions correctives
   - Procédure reset
   - Sévérité

FORMAT JSON:
{
  "maintenance_schedule": {
    "break_in": {
      "interval": "Premiers 500 heures",
      "tasks": ["Vidange huile", "Vérification filtres"]
    },
    "daily": ["Vérifier niveau huile", "Purger condensat"],
    "weekly": ["Nettoyer préfiltre"],
    "monthly": ["Vérifier courroies"],
    "routine": [
      {
        "interval_hours": 500,
        "interval_description": "Toutes les 500 heures ou 3 mois",
        "tasks": [
          {
            "task": "Vidange huile compresseur",
            "component": "Carter huile",
            "procedure": "Vidanger à chaud",
            "estimated_time_minutes": 30
          }
        ]
      },
      {
        "interval_hours": 2500,
        "interval_description": "Toutes les 2500 heures ou 1 an",
        "tasks": [...]
      }
    ]
  },
  "spare_parts": [
    {
      "id": "uuid",
      "name": "Filtre à huile",
      "part_number": "1621-5426-00",
      "replacement_interval_hours": 2500,
      "replacement_interval_description": "Annuel ou 2500h",
      "quantity": 1,
      "unit": "pièce",
      "criticality": "critical|important|routine",
      "estimated_cost": 45
    }
  ],
  "diagnostic_codes": [
    {
      "id": "uuid",
      "code": "E01",
      "display": "E01 - High Temp",
      "description": "Température élément trop élevée",
      "possible_causes": ["Obstruction radiateur", "Niveau huile bas", "Thermostat défectueux"],
      "corrective_actions": ["Nettoyer radiateur", "Vérifier niveau huile", "Remplacer thermostat"],
      "reset_procedure": "Automatique après refroidissement",
      "severity": "warning|alarm|shutdown"
    }
  ]
}`

// ============================================
// MERGE PASS - FUSION DES RÉSULTATS
// ============================================

export const MERGE_SYSTEM_PROMPT = `Tu dois fusionner les résultats de plusieurs passes d'extraction en un seul document cohérent.
Élimine les doublons et résous les conflits en préférant les données les plus complètes.`

export const MERGE_USER_PROMPT = `Fusionne ces résultats d'extraction en un seul document JSON cohérent:

PASS 1 (Main Asset):
{pass1_result}

PASS 2 (Subsystems):
{pass2_result}

PASS 3 (Electrical):
{pass3_result}

PASS 4 (Spec Tables):
{pass4_result}

PASS 5 (Maintenance):
{pass5_result}

Règles de fusion:
1. Garde tous les éléments uniques
2. Pour les doublons, préfère la version la plus détaillée
3. Unifie les formats (dates, nombres, unités)
4. Vérifie la cohérence des références croisées`
