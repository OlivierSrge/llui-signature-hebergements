// lib/citations.ts
// Citations du jour — Portail L&Lui Signature

export const CITATIONS: string[] = [
  "L'amour ne se voit pas avec les yeux, mais avec le cœur. — Shakespeare",
  "Le mariage est la plus belle des aventures humaines. — Victor Hugo",
  "Deux âmes, une seule pensée ; deux cœurs, une seule pulsation. — John Keats",
  "Aimer, c'est trouver sa richesse hors de soi. — Alain",
  "Le bonheur est une fleur qu'il ne faut pas oublier d'arroser. — Proverbe africain",
  "Ce que nous avons une fois aimé, nous ne pouvons jamais le perdre. — Helen Keller",
  "L'amour véritable commence quand on n'attend rien en retour. — Antoine de Saint-Exupéry",
  "Un mariage réussi demande de tomber amoureux plusieurs fois, toujours de la même personne. — Mignon McLaughlin",
  "L'union fait la force. — Proverbe africain",
  "Le cœur a ses raisons que la raison ne connaît point. — Blaise Pascal",
  "Là où l'amour règne, il n'y a pas de désir de pouvoir. — Carl Jung",
  "Aimer quelqu'un, c'est lui dire : Tu ne mourras jamais. — Gabriel Marcel",
  "Le bonheur n'est pas au bout du chemin, il est dans la façon de marcher. — Proverbe africain",
  "L'amour est la poésie des sens. — Honoré de Balzac",
  "Être aimé de quelqu'un vous donne de la force ; aimer quelqu'un vous donne du courage. — Lao Tseu",
  "Le mariage est une longue conversation ponctuée de disputes. — Robert Louis Stevenson",
  "La vie est un rêve, et l'amour en est la clé. — Proverbe camerounais",
  "Chaque instant partagé est un trésor que le temps ne peut effacer. — Anonyme",
  "L'amour n'est pas de regarder l'un l'autre, mais de regarder ensemble dans la même direction. — Antoine de Saint-Exupéry",
  "Quand deux cœurs s'unissent, c'est toute une famille qui se retrouve. — Proverbe africain",
  "Le meilleur cadeau qu'un père puisse faire à ses enfants, c'est d'aimer leur mère. — Theodore Hesburgh",
  "Vivre, c'est aimer ; le reste n'est que du temps qui passe. — Alfred de Musset",
  "L'amour est la seule chose qui croît quand on la dépense. — Ricarda Huch",
  "Choisir un partenaire, c'est choisir un ensemble de problèmes. — Dan Wile",
  "La famille, c'est là où la vie commence et où l'amour ne finit jamais. — Anonyme",
  "Aime et fais ce que tu veux. — Saint Augustin",
  "Le jour de notre mariage est le premier jour du reste de notre vie. — Anonyme",
  "Le véritable amour grandit avec les obstacles. — Proverbe",
  "Ensemble, nous sommes plus forts. — Proverbe africain",
  "Le mariage unit deux histoires pour en écrire une nouvelle, plus belle encore. — Anonyme",
]

/**
 * Retourne la citation du jour basée sur le jour du mois (0-29)
 */
export function getCitationDuJour(): string {
  return CITATIONS[new Date().getDate() % 30]
}
