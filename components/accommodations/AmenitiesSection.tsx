'use client'

import { useState } from 'react'
import {
  // Connectivité
  Wifi, WifiOff, Monitor, Plug, Cable,
  // Divertissement
  Tv, Speaker, Music, Gamepad2, Clapperboard,
  // Cuisine
  UtensilsCrossed, Utensils, Coffee, ChefHat, CookingPot, GlassWater, Wine, Beef,
  // Confort & Linge
  Shirt, Bath, ShowerHead, BedDouble, Sofa,
  // Climat
  Snowflake, Wind, Thermometer, Flame, Sun,
  // Sport & Bien-être
  Dumbbell, Waves, Bike, Footprints, Trophy, Fish, Sailboat,
  // Extérieur & Nature
  TreePine, Mountain, MountainSnow, Tent, Leaf, Umbrella, Anchor,
  // Services & Accès
  Car, ArrowUpDown, Shield, Lock, Key, Accessibility, Baby, PawPrint,
  // Vues & Ambiance
  Sunrise, Sunset, Sparkles, Star, Eye,
  // Travail
  Briefcase,
  // Divers
  Zap, Droplets, Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const AMENITY_ICONS: { keywords: string[]; icon: LucideIcon }[] = [
  // ─── Connectivité ────────────────────────────────────────────────
  { keywords: ['wifi', 'internet', 'fibre', 'haut débit', 'connexion'], icon: Wifi },
  { keywords: ['sans wifi', 'sans internet'], icon: WifiOff },
  { keywords: ['ethernet', 'câble réseau', 'rj45'], icon: Cable },
  { keywords: ['prise usb', 'recharge', 'chargeur', 'multiprise'], icon: Plug },

  // ─── Divertissement ──────────────────────────────────────────────
  { keywords: ['télé', 'tv', 'télévision', 'écran'], icon: Tv },
  { keywords: ['netflix', 'streaming', 'smart tv', 'disney', 'canal'], icon: Monitor },
  { keywords: ['système audio', 'enceinte', 'sonos', 'hi-fi', 'bluetooth'], icon: Speaker },
  { keywords: ['musique', 'platine', 'vinyle'], icon: Music },
  { keywords: ['jeux', 'console', 'playstation', 'xbox', 'nintendo'], icon: Gamepad2 },
  { keywords: ['home cinéma', 'projecteur', 'salle de projection'], icon: Clapperboard },

  // ─── Cuisine & Boissons ──────────────────────────────────────────
  { keywords: ['cuisine équipée', 'cuisine complète', 'cuisine aménagée'], icon: UtensilsCrossed },
  { keywords: ['cuisine', 'cuisinier', 'kitchenette', 'coin cuisine'], icon: Utensils },
  { keywords: ['café', 'machine à café', 'nespresso', 'expresso', 'cafetière'], icon: Coffee },
  { keywords: ['chef', 'chef à domicile', 'service traiteur'], icon: ChefHat },
  { keywords: ['plaque de cuisson', 'induction', 'four', 'cuisinière', 'micro-ondes'], icon: CookingPot },
  { keywords: ['eau potable', 'carafe', 'fontaine à eau'], icon: GlassWater },
  { keywords: ['cave à vin', 'vin', 'vinothèque', 'cellier'], icon: Wine },
  { keywords: ['barbecue', 'grill', 'plancha', 'cuisine extérieure'], icon: Beef },

  // ─── Salle de bain & Linge ───────────────────────────────────────
  { keywords: ['baignoire', 'bain', 'balnéo'], icon: Bath },
  { keywords: ['douche', 'douche italienne', "douche à l'italienne"], icon: ShowerHead },
  { keywords: ['lave-linge', 'machine à laver', 'linge', 'laverie', 'buanderie'], icon: Shirt },
  { keywords: ['lit double', 'king size', 'queen size', 'grand lit', 'lit queen', 'lit king'], icon: BedDouble },
  { keywords: ['salon', 'canapé', 'séjour', 'espace salon', 'living'], icon: Sofa },

  // ─── Climat & Énergie ────────────────────────────────────────────
  { keywords: ['climatisation', 'air conditionné', 'air cond', 'clim'], icon: Snowflake },
  { keywords: ['ventil', 'brasseur', 'ventilateur'], icon: Wind },
  { keywords: ['chauffage', 'radiateur', 'plancher chauffant'], icon: Thermometer },
  { keywords: ['cheminée', 'poêle à bois', 'feu de bois', 'insert'], icon: Flame },
  { keywords: ['sauna', 'hammam', 'spa', 'jacuzzi', 'bain à remous', 'bain nordique'], icon: Flame },
  { keywords: ['terrasse', 'balcon', 'patio', 'véranda', 'loggia'], icon: Sun },
  { keywords: ['générateur', 'groupe électrogène', 'solaire', 'panneaux solaires'], icon: Zap },
  { keywords: ['eau chaude', 'chauffe-eau', 'douche chaude', 'chaudière'], icon: Droplets },

  // ─── Sport & Bien-être ───────────────────────────────────────────
  { keywords: ['gym', 'fitness', 'musculation', 'salle de sport', 'salle de fitness'], icon: Dumbbell },
  { keywords: ['piscine', 'pool', 'natation', 'baignade', 'nage'], icon: Waves },
  { keywords: ['vélo', 'bicycle', 'deux-roues', 'vtt', 'vae', 'trottinette'], icon: Bike },
  { keywords: ['randonnée', 'trek', 'sentier', 'chemin de randonnée'], icon: Footprints },
  { keywords: ['tennis', 'padel', 'ping-pong', 'pétanque', 'sport collectif'], icon: Trophy },
  { keywords: ['pêche', 'ponton'], icon: Fish },
  { keywords: ['nautique', 'kayak', 'canoë', 'paddle', 'voile', 'bateau'], icon: Sailboat },

  // ─── Extérieur & Nature ──────────────────────────────────────────
  { keywords: ['jardin', 'verdure', 'parc', 'espace vert', 'potager'], icon: TreePine },
  { keywords: ['montagne', 'vue montagne', 'alpes', 'pyrénées', 'massif'], icon: Mountain },
  { keywords: ['ski', 'domaine skiable', 'pistes', 'station de ski'], icon: MountainSnow },
  { keywords: ['glamping', 'tente', 'cabane dans les arbres', 'yourte', 'tipi'], icon: Tent },
  { keywords: ['écologique', 'bio', 'durable', 'éco-responsable', 'zéro déchet'], icon: Leaf },
  { keywords: ['parasol', 'bain de soleil', 'transat', 'plage équipée'], icon: Umbrella },
  { keywords: ['accès plage', 'front de mer', 'bord de mer'], icon: Anchor },

  // ─── Services & Accès ────────────────────────────────────────────
  { keywords: ['parking', 'stationnement', 'garage', 'voiture', 'place de parking'], icon: Car },
  { keywords: ['ascenseur', 'élévateur'], icon: ArrowUpDown },
  { keywords: ['sécurité', 'gardien', 'alarme', 'caméra', 'badge', 'interphone'], icon: Shield },
  { keywords: ['coffre-fort', 'coffre', 'consigne sécurisée'], icon: Lock },
  { keywords: ['check-in autonome', 'boîte à clés', 'accès autonome', "code d'accès"], icon: Key },
  { keywords: ['accessible', 'pmr', 'handicapé', 'fauteuil roulant', 'mobilité réduite'], icon: Accessibility },
  { keywords: ['bébé', 'enfant', 'lit bébé', 'chaise haute', 'parc bébé'], icon: Baby },
  { keywords: ['animal', 'animaux', 'chien', 'chat', 'pet', 'accepte les animaux'], icon: PawPrint },

  // ─── Travail ─────────────────────────────────────────────────────
  { keywords: ['bureau', 'espace de travail', 'télétravail', 'workspace', 'coin bureau'], icon: Briefcase },

  // ─── Vues & Ambiance ─────────────────────────────────────────────
  { keywords: ['vue mer', 'vue sur la mer', 'vue océan'], icon: Sunrise },
  { keywords: ['coucher de soleil', 'vue sunset', 'vue panoramique', 'panorama'], icon: Sunset },
  { keywords: ['ménage', 'nettoyage', 'entretien', 'service de ménage'], icon: Sparkles },
  { keywords: ['service premium', 'conciergerie', 'service hôtelier', 'room service'], icon: Star },
  { keywords: ['vue dégagée', 'vue imprenable', 'belvedère'], icon: Eye },
]

function getAmenityIcon(amenity: string): LucideIcon {
  const lower = amenity.toLowerCase()
  for (const { keywords, icon } of AMENITY_ICONS) {
    if (keywords.some((k) => lower.includes(k))) return icon
  }
  return Check
}

interface Props {
  amenities: string[]
}

const PREVIEW_COUNT = 6

export default function AmenitiesSection({ amenities }: Props) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? amenities : amenities.slice(0, PREVIEW_COUNT)

  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-semibold text-dark mb-4">Pour votre confort</h2>
      <div className="gold-divider mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {displayed.map((amenity) => {
          const Icon = getAmenityIcon(amenity)
          return (
            <div key={amenity} className="flex items-center gap-4 py-3.5 border-b border-beige-100">
              <Icon size={20} className="text-dark flex-shrink-0" strokeWidth={1.5} />
              <span className="text-dark/80 text-sm">{amenity}</span>
            </div>
          )
        })}
      </div>
      {amenities.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-5 px-5 py-2.5 border border-dark/30 rounded-xl text-sm font-medium text-dark hover:bg-beige-50 transition-colors"
        >
          {showAll ? 'Afficher moins' : `Afficher les ${amenities.length} équipements`}
        </button>
      )}
    </div>
  )
}
