// ─── Structure d'un type d'hébergement ────────────────────────────────────────
export interface AccommodationTypeInfo {
  id: string
  label: string
  icon: string
  category: 'classique' | 'evasion' | 'unique'
  categoryLabel: string
  categoryIcon: string
  prestige: 1 | 2 | 3 | 4 | 5
  description: string
  tags: string[]
  active: boolean
}

// ─── Liste complète des types ─────────────────────────────────────────────────
export const ACCOMMODATION_TYPES: AccommodationTypeInfo[] = [
  // ═══════════════════════════════════
  // CATÉGORIE 1 — CLASSIQUES DE PRESTIGE
  // ═══════════════════════════════════
  {
    id: 'villa_exception',
    label: "Villa d'Exception",
    icon: '🏰',
    category: 'classique',
    categoryLabel: 'Classiques de Prestige',
    categoryIcon: '🏛️',
    prestige: 5,
    description: 'Grande propriété privée avec piscine et services',
    tags: ['piscine', 'jardin', 'privatif', 'luxe'],
    active: true,
  },
  {
    id: 'appartement_luxe',
    label: 'Appartement de Luxe',
    icon: '🏙️',
    category: 'classique',
    categoryLabel: 'Classiques de Prestige',
    categoryIcon: '🏛️',
    prestige: 4,
    description: 'Résidence haut de gamme en centre ou bord de mer',
    tags: ['moderne', 'vue mer', 'centre-ville'],
    active: true,
  },
  {
    id: 'suite_privee',
    label: 'Suite Privée',
    icon: '🛎️',
    category: 'classique',
    categoryLabel: 'Classiques de Prestige',
    categoryIcon: '🏛️',
    prestige: 4,
    description: 'Espace salon + chambre avec services personnalisés',
    tags: ['salon', 'services', 'intimité'],
    active: true,
  },
  {
    id: 'penthouse',
    label: 'Penthouse',
    icon: '🌆',
    category: 'classique',
    categoryLabel: 'Classiques de Prestige',
    categoryIcon: '🏛️',
    prestige: 5,
    description: 'Dernier étage de prestige avec terrasse panoramique',
    tags: ['terrasse', 'vue panoramique', 'hauteur'],
    active: true,
  },

  // ═══════════════════════════════════
  // CATÉGORIE 2 — ÉVASION & CARACTÈRE
  // ═══════════════════════════════════
  {
    id: 'lodge_charme',
    label: 'Lodge de Charme',
    icon: '🌲',
    category: 'evasion',
    categoryLabel: 'Évasion & Caractère',
    categoryIcon: '🌿',
    prestige: 4,
    description: 'Architecture bois, nature et services hôteliers',
    tags: ['bois', 'nature', 'charme', 'forêt'],
    active: true,
  },
  {
    id: 'cottage_signature',
    label: 'Cottage Signature',
    icon: '🏡',
    category: 'evasion',
    categoryLabel: 'Évasion & Caractère',
    categoryIcon: '🌿',
    prestige: 4,
    description: 'Maison de caractère en bord de mer ou campagne',
    tags: ['bord de mer', 'campagne', 'authenticité'],
    active: true,
  },
  {
    id: 'domaine_prive',
    label: 'Domaine Privé',
    icon: '🌳',
    category: 'evasion',
    categoryLabel: 'Évasion & Caractère',
    categoryIcon: '🌿',
    prestige: 5,
    description: 'Propriété avec parc, dépendances et accès exclusif',
    tags: ['parc', 'dépendances', 'exclusif', 'grand espace'],
    active: true,
  },
  {
    id: 'manoir_chateau',
    label: 'Manoir & Château',
    icon: '🏯',
    category: 'evasion',
    categoryLabel: 'Évasion & Caractère',
    categoryIcon: '🌿',
    prestige: 5,
    description: "Immobilier historique d'exception",
    tags: ['historique', 'patrimoine', 'rare'],
    active: true,
  },

  // ═══════════════════════════════════
  // CATÉGORIE 3 — EXPÉRIENCES UNIQUES
  // ═══════════════════════════════════
  {
    id: 'loft_industriel',
    label: 'Loft Industriel',
    icon: '🏗️',
    category: 'unique',
    categoryLabel: 'Expériences Uniques',
    categoryIcon: '✨',
    prestige: 4,
    description: 'Grand volume réhabilité, design contemporain',
    tags: ['design', 'volume', 'urbain', 'contemporain'],
    active: true,
  },
  {
    id: 'ecolodge_luxe',
    label: 'Éco-Lodge de Luxe',
    icon: '🌱',
    category: 'unique',
    categoryLabel: 'Expériences Uniques',
    categoryIcon: '✨',
    prestige: 4,
    description: 'Durabilité et confort premium en harmonie',
    tags: ['écologique', 'nature', 'durable', 'confort'],
    active: true,
  },
  {
    id: 'villa_waterfront',
    label: 'Villa Waterfront',
    icon: '🌊',
    category: 'unique',
    categoryLabel: 'Expériences Uniques',
    categoryIcon: '✨',
    prestige: 5,
    description: 'Accès direct plage ou ponton privé',
    tags: ['plage', 'ponton', 'vue mer', 'accès direct'],
    active: true,
  },
  {
    id: 'cabane_prestige',
    label: 'Cabane de Prestige',
    icon: '🌟',
    category: 'unique',
    categoryLabel: 'Expériences Uniques',
    categoryIcon: '✨',
    prestige: 5,
    description: 'Glamping haut de gamme avec jacuzzi ou spa',
    tags: ['glamping', 'jacuzzi', 'spa', 'insolite'],
    active: true,
  },
]

export const ACCOMMODATION_CATEGORIES = [
  { id: 'classique', label: 'Classiques de Prestige', icon: '🏛️' },
  { id: 'evasion', label: 'Évasion & Caractère', icon: '🌿' },
  { id: 'unique', label: 'Expériences Uniques', icon: '✨' },
]

// ─── Lookup par id ────────────────────────────────────────────────────────────
export function getAccommodationTypeById(id: string): AccommodationTypeInfo | null {
  return ACCOMMODATION_TYPES.find((t) => t.id === id) ?? null
}

// ─── Migration : ancien texte → nouvel id ─────────────────────────────────────
const LEGACY_MAP: Record<string, string> = {
  villa: 'villa_exception',
  Villa: 'villa_exception',
  appartement: 'appartement_luxe',
  Appartement: 'appartement_luxe',
  chambre: 'suite_privee',
  Chambre: 'suite_privee',
  suite: 'suite_privee',
  Suite: 'suite_privee',
  loft: 'loft_industriel',
  lodge: 'lodge_charme',
  cottage: 'cottage_signature',
  domaine: 'domaine_prive',
  manoir: 'manoir_chateau',
  château: 'manoir_chateau',
  waterfront: 'villa_waterfront',
  ecolodge: 'ecolodge_luxe',
  cabane: 'cabane_prestige',
  penthouse: 'penthouse',
}

/**
 * Tente de résoudre un type (ancien ou nouveau) vers un id connu.
 * Retourne null si aucun mapping n'est trouvé → afficher comme "Type personnalisé".
 */
export function resolveAccommodationTypeId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const known = getAccommodationTypeById(raw)
  if (known) return raw
  const mapped = LEGACY_MAP[raw] ?? LEGACY_MAP[raw.toLowerCase()]
  return mapped ?? null
}

/**
 * Retourne le label d'affichage pour n'importe quelle valeur de type
 * (nouveau id, ancien texte, valeur inconnue).
 */
export function getTypeLabelFromId(raw: string | null | undefined): string {
  if (!raw) return 'Type inconnu'
  const resolved = resolveAccommodationTypeId(raw)
  if (resolved) {
    return getAccommodationTypeById(resolved)?.label ?? raw
  }
  // Valeur inconnue : capitaliser proprement
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/**
 * Retourne l'icône d'un type, ou '🏠' si inconnu.
 */
export function getTypeIcon(raw: string | null | undefined): string {
  if (!raw) return '🏠'
  const resolved = resolveAccommodationTypeId(raw)
  if (resolved) return getAccommodationTypeById(resolved)?.icon ?? '🏠'
  return '🏠'
}
