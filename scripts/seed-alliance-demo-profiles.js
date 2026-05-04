/**
 * Seed — 20 profils membres de démo Alliance Privée
 * Dépend de : scripts/.alliance-partners-ids.json (généré par seed-alliance-partners.js)
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const path = require('path')
const fs = require('fs')

const PROFILS = [
  // ════════════════════════════════════════════════════════════════
  // HOMMES DIASPORA (10 profils)
  // ════════════════════════════════════════════════════════════════
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'EXCELLENCE',
    prenom: 'Amadou', nom_complet: 'Amadou DIALLO', age: 32,
    ville_residence: 'Paris', pays_residence: 'France',
    profession: 'Ingénieur Logiciel chez Google', niveau_etudes: 'Master INSA Lyon',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Famille', 'Loyauté', 'Ambition'],
    loisirs: ['Voyages', 'Photographie', 'Cuisine'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_MOYEN_TERME', style_vie: 'EQUILIBRE', valeurs_cle: 'FAMILLE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'Entre algorithmes et racines africaines',
    portrait: `Passionné de technologie et profondément ancré dans ma culture d'origine, je suis ingénieur senior chez Google à Paris depuis cinq ans. Mon parcours est celui d'un homme qui a choisi de construire une expertise internationale sans jamais perdre le fil de son identité.

Né à Douala dans une famille de commerçants, j'ai grandi dans un univers où la solidarité et l'ambition coexistaient naturellement. Mon père tenait une papeterie au marché central ; ma mère enseignait les mathématiques au lycée Général Leclerc. De cette dualité, j'ai hérité le sens du concret et l'amour des idées abstraites — une combinaison qui m'a conduit à l'ingénierie informatique.

Aujourd'hui, mon quotidien se partage entre des sprints de développement, des revues de code et des réunions de design system. J'ai contribué à des projets utilisés par des millions de personnes dans le monde. Cette dimension collective de mon travail — construire quelque chose qui dépasse l'individu — résonne profondément avec mes valeurs personnelles.

Mais je reste un homme de terrain. Chaque année, je rentre au Cameroun deux à trois fois. Je retrouve la chaleur, les odeurs du marché Sandaga, les longues conversations avec mon grand-père sur le sens de la vie. Ces retours me rappellent que la réussite professionnelle n'est qu'une face du prisme.

Je recherche une femme qui comprend cette tension fertile entre la modernité du monde global et l'ancrage dans nos traditions. Elle peut être au Cameroun ou en diaspora. Ce qui compte, c'est qu'elle partage une vision de la famille comme fondement — pas un frein, mais une force.

Je suis quelqu'un de direct, fidèle, et profondément attaché aux engagements pris. En amour comme au travail, je n'avance que si je suis sincèrement investi. Je crois que la complicité se construit dans les petits gestes du quotidien autant que dans les grands projets partagés.

Si vous êtes une femme ambitieuse, cultivée, qui a le courage de ses convictions et la douceur de ses émotions, je serais honoré de faire votre connaissance.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'ELITE',
    prenom: 'Jean-Pierre', nom_complet: 'Jean-Pierre FOTSO', age: 38,
    ville_residence: 'Lyon', pays_residence: 'France',
    profession: 'Entrepreneur (Import-Export Afrique-Europe)', niveau_etudes: 'École de Commerce Bordeaux',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Ambition', 'Famille', 'Stabilité'],
    loisirs: ['Gastronomie', 'Voyages', 'Sport'],
    piliers: { vision_geographique: 'CAMEROUN', engagement: 'MARIAGE_RAPIDE', style_vie: 'MODERNE', valeurs_cle: 'CARRIERE', ambition: 'ENTREPRENDRE' },
    titre_portrait: 'Le retour au pays comme projet de vie',
    portrait: `Entrepreneur établi dans l'import-export entre l'Europe et l'Afrique centrale depuis dix ans, j'ai bâti une entreprise qui emploie aujourd'hui vingt-deux personnes entre Lyon, Duala et Libreville. Ce chiffre n'est pas une fierté gratuite — il représente vingt-deux familles qui dépendent de décisions que je prends chaque jour avec soin.

Mon projet de vie a basculé il y a trois ans, lors d'un retour à Douala pour l'enterrement de mon oncle. En traversant la ville, j'ai vu avec des yeux nouveaux ce que j'avais quitté à vingt-deux ans : une métropole en pleine transformation, des opportunités que les autres ne voient pas encore, et une chaleur humaine que douze ans d'Europe n'ont jamais su remplacer.

Aujourd'hui, ma décision est prise : je reviens m'installer à Douala dans les dix-huit prochains mois. Mon infrastructure commerciale y est déjà partiellement installée. Il me manque la dernière pièce — la plus importante.

Je cherche une femme qui veut construire, pas seulement rêver. Une femme qui a une vision claire de ce qu'elle veut faire de sa vie et qui est prête à y associer quelqu'un d'aussi déterminé qu'elle. La complicité me semble plus précieuse que la passion instantanée — je crois en ce qui se construit, pas en ce qui s'emballe.

Je suis direct, parfois trop selon certains. J'aime les conversations substantielles plus que les mondanités. Le dimanche matin, je préfère le marché à l'hôtel cinq étoiles — bien que je sache apprécier les deux. Je suis généreux avec ceux que j'aime et exigeant avec moi-même.

Si vous êtes une femme ancrée dans ses valeurs, tournée vers l'avenir et prête pour une relation sérieuse avec un homme qui sait ce qu'il veut, je suis cet homme.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'ELITE',
    prenom: 'Marc', nom_complet: 'Marc ESSOMBA', age: 35,
    ville_residence: 'New York', pays_residence: 'USA',
    profession: 'Consultant Finance McKinsey', niveau_etudes: 'MBA Harvard Business School',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Ambition', 'Culture', 'Équilibre'],
    loisirs: ['Voyages', 'Lecture', 'Art'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'CONNAITRE_DABORD', style_vie: 'EQUILIBRE', valeurs_cle: 'EQUILIBRE', ambition: 'MULTIPLE' },
    titre_portrait: 'Stratège de carrière, chercheur de profondeur',
    portrait: `Consultant senior spécialisé en stratégie d'entreprise chez McKinsey à New York, je passe ma vie à analyser des situations complexes et à proposer des solutions. Cette capacité à voir les structures sous la surface, je l'ai développée sur des terrains professionnels exigeants — mais c'est dans mes relations humaines qu'elle m'est la plus précieuse.

Mon parcours a quelque chose d'atypique. Né à Bafoussam, fils d'un instituteur et d'une infirmière, j'ai obtenu une bourse pour étudier à Paris, puis enchaîné avec un MBA à Harvard. Des années à traverser des cultures, des codes, des univers — tout cela m'a appris une chose fondamentale : l'essentiel échappe aux grilles d'analyse.

À New York, ma vie est rythmée par des projets internationaux, des voyages permanents et une diversité culturelle qui m'enrichit chaque jour. Mais sous l'agitation de cette vie que beaucoup envient, je cherche quelque chose de simple et rare : une femme avec qui je peux être pleinement moi-même.

Je suis quelqu'un de discret en société, mais profondément expressif dans l'intimité d'une relation vraie. Je lis beaucoup, je voyage pour comprendre les peuples plutôt que pour collectionner les destinations. J'aime la peinture contemporaine africaine, la littérature en trois langues, et les conversations qui durent longtemps autour d'une bonne table.

Je ne cherche pas quelqu'un qui ressemble à mon agenda professionnel. Je cherche quelqu'un qui y soit le contrepoint lumineux. Une femme curieuse, stable dans ses valeurs, capable de rire avec la même intensité qu'elle pense. La géographie m'importe peu — l'âme qui l'habite, tout.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'PRESTIGE',
    prenom: 'David', nom_complet: 'David NGUEMA', age: 29,
    ville_residence: 'Marseille', pays_residence: 'France',
    profession: 'Médecin Urgentiste', niveau_etudes: 'Doctorat Médecine Montpellier',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Famille', 'Loyauté', 'Santé'],
    loisirs: ['Photographie', 'Sport', 'Cuisine'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_MOYEN_TERME', style_vie: 'TRADITIONNEL', valeurs_cle: 'FAMILLE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'Médecin de terrain, romantique discret',
    portrait: `Urgentiste à l'Hôpital de la Timone à Marseille, je travaille dans un monde où chaque décision compte et où la dignité humaine n'est jamais un concept abstrait. Ce métier m'a transformé en profondeur — il m'a appris la patience, le sens des priorités, et une forme de sérénité face à l'imprévu.

Je suis camerounais d'origine, né à Bafia, et français depuis cinq ans. Deux identités que je vis non comme une tension, mais comme une richesse. En cuisine, j'oscille entre le ndolé de ma mère et la bouillabaisse de mes collègues marseillais — et je réussis les deux.

Entre mes gardes, je photographie. Les visages principalement. Cette passion a quelque chose d'évident pour un médecin : c'est toujours dans les yeux que se révèle l'essentiel. Mon Instagram est confidentiel — la plupart de mes clichés dorment dans un disque dur et ne seront peut-être jamais publiés. L'important, c'est l'acte de regarder vraiment.

Je cherche une compagne avec qui construire quelque chose de durable. Pas nécessairement de suite — je crois que les bases solides se posent progressivement. Une femme qui a des convictions, qui aime sa famille, et qui sait rire sans prétexte. Le reste s'apprend ensemble.

Je suis disponible pour appeler, organiser, me déplacer. La géographie n'est pas un obstacle quand la personne en vaut le voyage.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'ELITE',
    prenom: 'Patrick', nom_complet: 'Patrick TCHOUA', age: 41,
    ville_residence: 'Atlanta', pays_residence: 'USA',
    profession: 'Avocat International (Cabinet Tchinda & Associates)', niveau_etudes: 'Droit International Columbia University',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Famille', 'Ambition', 'Loyauté'],
    loisirs: ['Gastronomie', 'Sport', 'Musique'],
    piliers: { vision_geographique: 'AMERIQUE', engagement: 'MARIAGE_RAPIDE', style_vie: 'EQUILIBRE', valeurs_cle: 'FAMILLE', ambition: 'ENTREPRENDRE' },
    titre_portrait: 'L\'avocat qui plaide pour la famille',
    portrait: `Avocat spécialisé en droit des affaires internationales à Atlanta depuis douze ans, j'ai fondé mon propre cabinet il y a quatre ans. Aujourd'hui, Tchinda & Associates accompagne des entreprises africaines et diasporiques dans leurs projets aux États-Unis et au Canada. Ce que je défends en salle d'audience, ce sont des rêves entrepreneuriaux — et cette responsabilité ne me quitte jamais.

À quarante et un ans, j'ai atteint ce que je m'étais fixé professionnellement. Ce qui manque est évident : une famille. Non par défaut ou par pression sociale, mais parce que je suis fondamentalement un homme de liens. Je suis proche de mes parents, de mes quatre frères, de mes nièces et neveux que je vois à chaque retour à Bafoussam.

Je suis direct dans mes intentions. Je ne cherche pas à fréquenter indéfiniment — j'aspire à construire. Une femme qui a la maturité de ses aspirations, la gentillesse de ses origines et la volonté de créer quelque chose de beau avec quelqu'un qui s'y engage pleinement.

Atlanta m'a appris la rigueur. Le Cameroun m'a appris l'humanité. Je navigue entre ces deux héritages avec une conscience aiguë de ce que je veux transmettre à des enfants un jour.

Je cuisine mal mais j'apprends. Je danse mieux que la plupart des avocats. Et je sais écouter — une compétence que douze ans de tribunal ont considérablement aiguisée.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'PRESTIGE',
    prenom: 'Franck', nom_complet: 'Franck MBOUH', age: 34,
    ville_residence: 'Montréal', pays_residence: 'Canada',
    profession: 'Architecte (Agence Fortin & Mbouh)', niveau_etudes: 'Master Architecture McGill University',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Créativité', 'Indépendance', 'Voyages'],
    loisirs: ['Art', 'Voyages', 'Photographie'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'CONNAITRE_DABORD', style_vie: 'MODERNE', valeurs_cle: 'EQUILIBRE', ambition: 'MULTIPLE' },
    titre_portrait: 'Bâtisseur d\'espaces, chercheur d\'âme',
    portrait: `Architecte associé à Montréal, je conçois des espaces qui habitent les gens autant qu'ils les habitent. Ce travail — penser la lumière, les circulations, les matières — m'a appris que la beauté n'est jamais ornementale. Elle est structurelle.

Originaire de Ngaoundéré, j'ai grandi dans un univers où l'espace extérieur et le ciel immense donnaient aux ambitions une dimension particulière. Cette influence, je la retrouve dans mes projets : je conçois souvent des bâtiments qui cherchent à intégrer le dehors plutôt qu'à l'exclure.

À Montréal depuis neuf ans, j'ai adopté le rythme de la ville — actif l'été, introspectif l'hiver. Je photographie beaucoup, surtout des architectures vernaculaires africaines lors de mes voyages de recherche. Un jour, j'aimerais écrire un livre sur l'habitat traditionnel camerouno-bamiléké.

Je cherche une femme avec qui partager ce regard sur le monde — curieuse, sensible à la beauté des choses ordinaires, à l'aise dans le silence autant que dans la conversation. Je ne suis pas pressé, mais je suis sérieux. Ces deux choses ne se contredisent pas.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'EXCELLENCE',
    prenom: 'Boris', nom_complet: 'Boris ONDOA', age: 36,
    ville_residence: 'Houston', pays_residence: 'USA',
    profession: 'Ingénieur Pétrole (Shell Energy)', niveau_etudes: 'Master Petroleum Engineering University of Texas',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Spiritualité', 'Famille', 'Loyauté'],
    loisirs: ['Sport', 'Lecture', 'Cuisine'],
    piliers: { vision_geographique: 'CAMEROUN', engagement: 'MARIAGE_MOYEN_TERME', style_vie: 'TRADITIONNEL', valeurs_cle: 'SPIRITUALITE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'L\'ingénieur aux valeurs d\'antan',
    portrait: `Ingénieur dans l'industrie pétrolière à Houston, je travaille sur des projets d'exploration offshore en Afrique de l'Ouest. Mon travail m'a amené à traverser des dizaines de pays, à vivre dans des environnements radicalement différents, et à comprendre une vérité simple : les valeurs fondamentales sont universelles, même si leurs expressions varient.

Je suis un homme de foi. Pas de façon ostentatoire, mais dans une conviction intime que la vie a un sens qui dépasse le visible. Cette dimension spirituelle oriente mes choix, dont celui de chercher une compagne dans un cadre sélectif et respectueux comme Alliance Privée.

Mon projet à terme est un retour au Cameroun. J'ai déjà investi dans une propriété à Kribi. Pas pour la spéculation — pour poser une ancre. Je veux que mes enfants grandissent en sachant d'où ils viennent.

Je cherche une femme qui partage ces fondements : foi, famille, fidélité. Une femme avec qui construire une vie qui ait du sens, pas seulement de l'éclat. Je suis patient, attentif, et profondément engagé quand je m'engage.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'EXCELLENCE',
    prenom: 'Samuel', nom_complet: 'Samuel EYINGA', age: 30,
    ville_residence: 'Paris', pays_residence: 'France',
    profession: 'CEO Fondateur (Lumia AI, startup intelligence artificielle)', niveau_etudes: 'École Polytechnique',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Ambition', 'Carrière', 'Créativité'],
    loisirs: ['Technologie', 'Musique', 'Sport'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_RAPIDE', style_vie: 'MODERNE', valeurs_cle: 'CARRIERE', ambition: 'ENTREPRENDRE' },
    titre_portrait: 'Le fondateur qui cherche son associée de vie',
    portrait: `J'ai fondé Lumia AI à vingt-six ans. Quatre ans plus tard, la startup compte trente-cinq collaborateurs et des clients dans douze pays africains. Nous développons des outils d'intelligence artificielle adaptés aux contextes économiques et linguistiques africains — des produits qui n'existaient pas et que nous avons dû inventer de zéro.

Cette expérience m'a beaucoup appris sur moi-même. Je suis quelqu'un qui construit. Qui voit un problème et cherche une solution, plutôt que de se lamenter de la situation. Cette posture, je la veux dans tous les domaines de ma vie.

À trente ans, je réalise que réussir professionnellement sans quelqu'un à côté de soi crée un vide particulier. Pas une solitude romantique — quelque chose de plus concret : le manque de quelqu'un à qui raconter la journée, avec qui projeter le futur.

Je cherche une femme ambitieuse, mais pas obsédée par l'ambition. Une femme qui a quelque chose à construire — que ce soit une carrière, une famille, un projet — et qui comprend que deux personnes qui construisent ensemble vont plus loin que chacun séparément.

Je suis direct, enthousiasmant selon certains, débordant selon d'autres. Je parle beaucoup mais j'écoute vraiment. Et je suis prêt à m'investir entièrement dans une relation qui en vaut la peine.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'PRESTIGE',
    prenom: 'Thomas', nom_complet: 'Thomas BEKONO', age: 42,
    ville_residence: 'Toronto', pays_residence: 'Canada',
    profession: 'Chercheur en Biotechnologie (University of Toronto)', niveau_etudes: 'PhD Biologie Moléculaire',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Équilibre', 'Culture', 'Créativité'],
    loisirs: ['Lecture', 'Nature', 'Musique'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'PAS_PRESSE', style_vie: 'EQUILIBRE', valeurs_cle: 'EQUILIBRE', ambition: 'MULTIPLE' },
    titre_portrait: 'Le chercheur qui cherche aussi la paix',
    portrait: `Chercheur en biotechnologie à l'Université de Toronto, je travaille sur des thérapies cellulaires contre les maladies tropicales négligées. C'est un travail lent, exigeant, souvent ingrat — et profondément signifiant. J'ai choisi cette voie parce qu'elle touche à quelque chose de réel : la santé de populations qui ont peu de défenseurs.

À quarante-deux ans, je suis un homme posé. Peut-être trop posé pour certaines. Je ne suis pas pressé parce que j'ai appris que la précipitation produit rarement les meilleures synthèses — que ce soit en laboratoire ou en amour.

Je suis passionné par la littérature africaine contemporaine, les randonnées dans les Rocheuses canadiennes, et la musique de chambre. Des univers apparemment disparates qui m'ont appris qu'il existe toujours un fil conducteur quand on regarde assez profondément.

Je cherche une femme avec qui la conversation ne s'épuise pas. Une femme qui a une vie intérieure riche, des passions qui lui appartiennent, et la douceur de les partager. La géographie est négociable. La profondeur, non.`,
  },
  {
    gender: 'HOMME', location: 'DIASPORA', tier: 'PRESTIGE',
    prenom: 'Éric', nom_complet: 'Éric ABANDA', age: 28,
    ville_residence: 'Paris', pays_residence: 'France',
    profession: 'Musicien Professionnel (fusion afro-jazz)', niveau_etudes: 'Conservatoire National Supérieur de Musique de Paris',
    genre: 'homme', genre_recherche: 'femme',
    valeurs: ['Créativité', 'Aventure', 'Indépendance'],
    loisirs: ['Musique', 'Art', 'Voyages'],
    piliers: { vision_geographique: 'EUROPE', engagement: 'CONNAITRE_DABORD', style_vie: 'LIBERAL', valeurs_cle: 'AVENTURE', ambition: 'FREELANCE' },
    titre_portrait: 'La mélodie cherche son harmonie',
    portrait: `Musicien professionnel spécialisé en fusion afro-jazz, je joue du piano et de la kora — un mariage qui dit beaucoup de qui je suis : enraciné dans la tradition africaine, ouvert aux influences du monde entier.

Mon parcours est atypique. Formé au Conservatoire National de Paris, j'ai refusé la voie classique pour créer mon propre groupe, Bassa Collective, avec lequel nous avons joué dans des festivals en France, en Allemagne et au Sénégal. La musique n'est pas mon métier — c'est mon langage premier.

Fils unique d'une mère institutrice de Bassa et d'un père ingénieur à Douala, j'ai grandi entre deux villes et deux cultures. Venu à Paris à dix-sept ans, j'ai appris à être de partout et de nulle part — une liberté qui peut ressembler à une fragilité, mais qui est en réalité une forme d'ouverture.

Je cherche une femme qui n'a pas peur de l'inattendu. Pas nécessairement musicienne — mais sensible à la beauté, curieuse de la différence, et capable de créer un espace de confiance dans un monde qui n'en manque pas.`,
  },

  // ════════════════════════════════════════════════════════════════
  // FEMMES CAMEROUN LOCAL (10 profils)
  // ════════════════════════════════════════════════════════════════
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'EXCELLENCE',
    prenom: 'Grace', nom_complet: 'Grace NJOYA', age: 28,
    ville_residence: 'Douala', pays_residence: 'Cameroun',
    profession: 'Créatrice de mode & Directrice artistique (Maison NJOYA)', niveau_etudes: 'Licence Design ESSEC Douala',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Créativité', 'Famille', 'Ambition'],
    loisirs: ['Mode', 'Art', 'Voyages'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_MOYEN_TERME', style_vie: 'MODERNE', valeurs_cle: 'FAMILLE', ambition: 'ENTREPRENDRE' },
    titre_portrait: 'La couturière de rêves qui cherche le sien',
    portrait: `À vingt-huit ans, j'ai lancé ma propre maison de couture à Douala. La Maison NJOYA crée des vêtements qui dialoguent entre le patrimoine textile camerounais et l'esthétique contemporaine. Chaque pièce est une histoire, chaque collection une réponse à une question que je me pose sur qui nous sommes et qui nous voulons devenir.

L'entrepreneuriat m'a appris une chose essentielle : on ne construit pas seul. Mon équipe est petite mais soudée — six personnes, dont quatre couturières que j'ai formées moi-même. Cette responsabilité, je la prends au sérieux. Elle a changé ma façon de voir les relations : je cherche des liens de même nature — où chacun apporte, où chacun grandit.

Je suis une femme moderne et ancrée à la fois. Moderne dans ma façon de travailler, de voyager pour m'inspirer, d'utiliser les outils numériques pour développer ma marque sur Instagram et dans des boutiques à Paris. Ancrée dans mes valeurs familiales — mes parents sont ma boussole, ma grand-mère ma source d'inspiration principale.

Je cherche un homme qui a construit quelque chose, qui respecte le travail des autres, et qui n'a pas peur de la femme ambitieuse que je suis. Ce n'est pas une menace — c'est une invitation à élever le niveau ensemble.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'EXCELLENCE',
    prenom: 'Vanessa', nom_complet: 'Vanessa EBOGO', age: 31,
    ville_residence: 'Yaoundé', pays_residence: 'Cameroun',
    profession: 'Médecin Pédiatre (Hôpital Central Yaoundé)', niveau_etudes: 'Doctorat Médecine Université Yaoundé I',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Famille', 'Santé', 'Loyauté'],
    loisirs: ['Lecture', 'Cuisine', 'Nature'],
    piliers: { vision_geographique: 'CAMEROUN', engagement: 'MARIAGE_RAPIDE', style_vie: 'EQUILIBRE', valeurs_cle: 'FAMILLE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'La docteure des enfants qui rêve de sa propre famille',
    portrait: `Pédiatre à l'Hôpital Central de Yaoundé depuis quatre ans, je soigne des enfants de la naissance à l'adolescence. Ce choix de spécialité n'était pas anodin — je crois fondamentalement que tout se joue dans les premières années de vie, et que contribuer à ce début est une forme de service qui me dépasse.

Mon quotidien est exigeant. Les gardes, les urgences, les parents inquiets que je dois rassurer avec précision et compassion. Mais j'ai trouvé dans ce rythme une forme de discipline qui structure aussi ma vie personnelle.

Je suis une femme directe. Je sais ce que je veux : fonder une famille, avec un homme présent et engagé. Je ne recherche pas la perfection — je recherche la cohérence. Un homme dont les actes rejoignent les paroles, qui soit aussi à l'aise dans la tendresse que dans la responsabilité.

J'aime cuisiner le soir, lire dans le calme du week-end, et marcher dans la nature quand l'hôpital m'a épuisée l'âme. Ce sont des petites choses — mais elles dessinent la vie que je veux partager.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'PRESTIGE',
    prenom: 'Sandra', nom_complet: 'Sandra ATEBA', age: 26,
    ville_residence: 'Kribi', pays_residence: 'Cameroun',
    profession: 'Avocate (Cabinet Juriscamer)', niveau_etudes: 'Master Droit des Affaires Université Yaoundé II',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Ambition', 'Carrière', 'Indépendance'],
    loisirs: ['Lecture', 'Voyages', 'Gastronomie'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'CONNAITRE_DABORD', style_vie: 'MODERNE', valeurs_cle: 'CARRIERE', ambition: 'MULTIPLE' },
    titre_portrait: 'Jeune avocate, grande ambition',
    portrait: `Avocate à vingt-six ans à Kribi, je travaille principalement sur des dossiers de droit des affaires et d'investissement étranger dans le secteur des ressources naturelles. C'est une niche pointue, mais stratégique dans une région côtière en plein développement.

J'ai grandi à Kribi, fille d'un pêcheur et d'une institutrice. Ma trajectoire a surpris tout le monde, à commencer par moi. L'université, puis le barreau — dans un milieu où peu de femmes de mon origine y parviennent si vite. Je n'en tire pas de fierté ostentatoire, seulement une conviction renforcée que le possible est souvent plus large qu'on ne l'imagine.

Je cherche un homme qui comprend que l'indépendance n'exclut pas le désir de partager. Je suis autonome par nécessité et par tempérament — mais je crois profondément en la complémentarité. Un homme intelligent, stable dans ses valeurs, qui me challenge intellectuellement et me respecte dans mon chemin.

La géographie n'est pas un obstacle. Je suis mobile, curieuse, et je sais que les meilleures histoires se construisent rarement dans le confort de ce qu'on connaît déjà.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'EXCELLENCE',
    prenom: 'Marie-Claire', nom_complet: 'Marie-Claire OMGBA', age: 33,
    ville_residence: 'Douala', pays_residence: 'Cameroun',
    profession: 'Architecte (Bureau d\'études BATIPRO Douala)', niveau_etudes: 'Master Architecture École Nationale Polytechnique Yaoundé',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Ambition', 'Équilibre', 'Loyauté'],
    loisirs: ['Art', 'Voyages', 'Nature'],
    piliers: { vision_geographique: 'CAMEROUN', engagement: 'MARIAGE_MOYEN_TERME', style_vie: 'EQUILIBRE', valeurs_cle: 'EQUILIBRE', ambition: 'ENTREPRENDRE' },
    titre_portrait: 'Architecte de l\'espace et de l\'avenir',
    portrait: `Architecte spécialisée en construction durable à Douala, je travaille sur des projets qui intègrent les matériaux locaux et les techniques passives pour réduire l'empreinte énergétique des bâtiments en zone tropicale. C'est une mission qui me tient à cœur — le Cameroun mérite une architecture à son image, pas une copie carbone de modèles importés.

Après mon master à l'École Polytechnique de Yaoundé, j'ai travaillé deux ans à Dakar avant de revenir à Douala. Ce passage par l'Afrique de l'Ouest m'a ouvert les yeux sur les dynamiques architecturales continentales et m'a donné la conviction que nous avons les solutions à nos propres défis.

Je suis une femme organisée, qui aime que les choses aient du sens. Dans mon travail comme dans ma vie personnelle, je cherche la cohérence entre les valeurs et les actes. Je ris facilement — la légèreté est une qualité que j'admire et que j'essaie de cultiver, même dans les moments complexes.

Je cherche un compagnon qui sait ce qu'il construit. Pas nécessairement dans ma profession — mais quelqu'un qui a un projet, une vision, et la ténacité de la réaliser. La complicité intellectuelle et la tendresse quotidienne me semblent aussi importantes l'une que l'autre.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'EXCELLENCE',
    prenom: 'Laure', nom_complet: 'Laure MBALLA', age: 29,
    ville_residence: 'Yaoundé', pays_residence: 'Cameroun',
    profession: 'Chef de Projet IT (Afritech Solutions)', niveau_etudes: 'Master Informatique ENSP Yaoundé',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Ambition', 'Équilibre', 'Famille'],
    loisirs: ['Technologie', 'Sport', 'Cuisine'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_RAPIDE', style_vie: 'MODERNE', valeurs_cle: 'EQUILIBRE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'La geek qui a les pieds sur terre',
    portrait: `Chef de projet dans une entreprise de technologie à Yaoundé, je coordonne le déploiement de solutions logicielles pour des clients dans cinq pays d'Afrique centrale. C'est un travail qui combine la technique, la gestion d'équipe et la relation client — exactement le type de défi multidimensionnel qui me convient.

Je suis quelqu'un de pratique. J'aime les problèmes concrets, les solutions testées, les résultats mesurables. Mais cette rigueur professionnelle coexiste avec une vraie chaleur humaine — mes collègues diraient que je suis à la fois la plus organisée et la plus drôle du bureau.

Sportive trois fois par semaine, cuisinière le week-end, passionnée par les séries technologiques et les podcasts d'entrepreneurs africains — voilà les contours de ma vie ordinaire. Une vie que j'aime, mais à laquelle il manque un compagnon solide.

Je cherche un homme avec qui la relation est simple, même quand c'est complexe. Un homme présent, honnête, et qui a envie de quelque chose de réel. La diaspora ne me fait pas peur — au contraire, la perspective de construire des ponts entre nos mondes m'attire.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'ELITE',
    prenom: 'Joëlle', nom_complet: 'Joëlle MVONDO', age: 35,
    ville_residence: 'Douala', pays_residence: 'Cameroun',
    profession: 'Maître de Conférences en Littérature (Université de Douala)', niveau_etudes: 'PhD Littérature Française et Francophone',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Culture', 'Spiritualité', 'Loyauté'],
    loisirs: ['Lecture', 'Musique', 'Art'],
    piliers: { vision_geographique: 'CAMEROUN', engagement: 'CONNAITRE_DABORD', style_vie: 'TRADITIONNEL', valeurs_cle: 'SPIRITUALITE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'La gardienne des mots qui cherche sa propre histoire',
    portrait: `Maître de conférences à l'Université de Douala, j'enseigne la littérature africaine francophone et je mène des recherches sur la représentation de la féminité dans le roman camerounais contemporain. Ce travail m'a appris que les mots sont des actes — qu'écrire et lire changent profondément qui l'on est.

Je suis née à Eséka, dans une famille de tradition orale. Mon grand-père était conteur — il réunissait le village autour de ses récits le soir. C'est de lui que j'ai hérité cette conviction que les histoires qu'on se raconte dessinent la réalité qu'on habite.

Ma vie à Douala est celle d'une intellectuelle engagée. J'enseigne, je publie, je participe à des conférences internationales. Mais au-delà de l'académique, je suis une femme simple dans ses besoins quotidiens : une bonne conversation, une musique qui touche l'âme, la chaleur de ceux que j'aime.

Je cherche un homme de substance. Pas nécessairement un intellectuel — mais quelqu'un qui pense, qui réfléchit, qui ne confond pas l'opinion et la connaissance. Un homme ancré dans ses valeurs, ouvert aux autres cultures, et qui sait ce que la profondeur d'une relation peut apporter que rien d'autre ne peut donner.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'PRESTIGE',
    prenom: 'Nadège', nom_complet: 'Nadège EKOTTO', age: 27,
    ville_residence: 'Kribi', pays_residence: 'Cameroun',
    profession: 'Pharmacienne (Officine Ekotto Santé)', niveau_etudes: 'Doctorat en Pharmacie FMSB Yaoundé',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Famille', 'Santé', 'Équilibre'],
    loisirs: ['Nature', 'Cuisine', 'Voyages'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_MOYEN_TERME', style_vie: 'EQUILIBRE', valeurs_cle: 'FAMILLE', ambition: 'MULTIPLE' },
    titre_portrait: 'La pharmacienne de l\'âme et du corps',
    portrait: `Pharmacienne à Kribi depuis deux ans, je gère ma propre officine au cœur de la ville. Ce choix d'installation dans ma ville natale après mes études à Yaoundé a surpris certains — mais j'avais envie de contribuer concrètement à la santé de ma communauté, pas de fuir vers une grande métropole.

Mon métier me met en contact chaque jour avec des réalités humaines très différentes. Les jeunes mères inquiètes, les personnes âgées qui gèrent des pathologies chroniques, les pêcheurs qui reviennent blessés de la mer. Cette diversité m'ancre dans une forme d'humilité que je chéris.

Kribi me ressemble : belle, tranquille en apparence, mais pleine de vie et de contradictions. J'aime la mer le matin avant l'ouverture de l'officine. J'aime cuisiner pour mes amis le dimanche. J'aime voyager deux ou trois fois par an pour rappeler à mes poumons ce que l'air du monde a de différent.

Je cherche un homme avec qui la vie prend de la saveur. Un homme gentil — pas au sens faible du terme, mais au sens profond : qui fait attention, qui protège, qui est là. La distance géographique peut se gérer. La distance d'âme, non.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'PRESTIGE',
    prenom: 'Brigitte', nom_complet: 'Brigitte NANGA', age: 32,
    ville_residence: 'Yaoundé', pays_residence: 'Cameroun',
    profession: 'Designer Graphique Freelance', niveau_etudes: 'Licence Arts Appliqués Institut des Beaux-Arts Foumban',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Créativité', 'Indépendance', 'Aventure'],
    loisirs: ['Art', 'Photographie', 'Musique'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'PAS_PRESSE', style_vie: 'LIBERAL', valeurs_cle: 'AVENTURE', ambition: 'FREELANCE' },
    titre_portrait: 'Couleurs libres, cœur ouvert',
    portrait: `Designer graphique freelance travaillant avec des clients en Europe, en Afrique et aux États-Unis depuis Yaoundé — ma vie ressemble à cette phrase : ancrée localement, connectée mondialement. Je crée des identités visuelles, des illustrations, des campagnes qui parlent à des gens très différents. Ce travail me fascine parce qu'il demande une vraie empathie culturelle.

Je suis originaire de Foumban, ville d'artisanat et de sultanat. Cet héritage imprègne mon travail : je suis obsédée par les motifs, les textures, les récits visuels que l'on peut tisser à partir de traditions ancestrales et de langage contemporain.

Ma vie est indépendante — dans tous les sens du terme. Je fixe mes horaires, je choisis mes projets, je voyage quand j'en ai besoin. Certains trouveront cela peu compatible avec une relation stable. Je pense l'inverse : cette liberté que je m'accorde me rend plus disponible là où ça compte vraiment.

Je cherche un homme qui ne cherche pas à me cadrer, mais qui trouve dans ma singularité quelque chose de précieux. Un homme créatif ou sensible à la créativité, curieux du monde, et capable de naviguer dans une relation qui ne ressemble pas à un manuel.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'EXCELLENCE',
    prenom: 'Christine', nom_complet: 'Christine BIWOLE', age: 30,
    ville_residence: 'Douala', pays_residence: 'Cameroun',
    profession: 'Journaliste d\'investigation (Éco Matin Cameroun)', niveau_etudes: 'Master Journalisme et Communication ESSTIC Yaoundé',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Loyauté', 'Équilibre', 'Culture'],
    loisirs: ['Lecture', 'Cinéma', 'Voyages'],
    piliers: { vision_geographique: 'CAMEROUN', engagement: 'CONNAITRE_DABORD', style_vie: 'MODERNE', valeurs_cle: 'EQUILIBRE', ambition: 'CARRIERE_SALARIE' },
    titre_portrait: 'La journaliste qui cherche la vérité en amour aussi',
    portrait: `Journaliste d'investigation couvrant l'actualité économique et politique camerounaise depuis cinq ans, j'ai enquêté sur des dossiers qui ont parfois demandé du courage. Ce métier m'a appris à ne pas accepter les apparences, à poser les bonnes questions, et à supporter l'incertitude — des qualités que je retrouve étrangement utiles en dehors de la rédaction.

Je suis une femme qui observe. Avant de parler, j'écoute. Avant de conclure, j'analyse. C'est une posture professionnelle qui est aussi devenue un trait de caractère. Certains la confondent avec de la froideur. C'est en réalité le contraire : je m'engage quand je suis certaine, et quand je m'engage, c'est profondément.

Je lis énormément — littérature africaine, essais politiques, romans français. Le cinéma est mon autre passion : j'ai une liste de films que je réclame depuis des années et que je regarde seule ou avec des amis très choisis.

Je cherche un homme transparent. Pas sans complexité — mais honnête dans sa complexité. Un homme qui a réfléchi à ce qu'il veut et qui dit ce qu'il pense. La sincérité est le seul fondement sur lequel j'accepte de construire quelque chose.`,
  },
  {
    gender: 'FEMME', location: 'LOCAL', tier: 'ELITE',
    prenom: 'Françoise', nom_complet: 'Françoise BILONG', age: 34,
    ville_residence: 'Yaoundé', pays_residence: 'Cameroun',
    profession: 'Consultante RH Indépendante (Cabinet Bilong Conseil)', niveau_etudes: 'Master Gestion des Ressources Humaines ESSEC Douala',
    genre: 'femme', genre_recherche: 'homme',
    valeurs: ['Famille', 'Ambition', 'Équilibre'],
    loisirs: ['Gastronomie', 'Voyages', 'Sport'],
    piliers: { vision_geographique: 'FLEXIBLE', engagement: 'MARIAGE_RAPIDE', style_vie: 'EQUILIBRE', valeurs_cle: 'FAMILLE', ambition: 'ENTREPRENDRE' },
    titre_portrait: 'L\'experte des relations humaines en quête de la sienne',
    portrait: `Consultante en ressources humaines indépendante, j'accompagne des entreprises dans leur transformation organisationnelle et le développement de leurs talents. En dix ans, j'ai travaillé avec plus de soixante-dix organisations, des PME familiales aux multinationales. Cette diversité m'a donné une compréhension assez fine de ce qui fait fonctionner les collectifs — et, par extension, les relations.

La conviction que j'ai développée : les relations solides se construisent sur la clarté des intentions, le respect mutuel et la capacité à traverser les désaccords sans se perdre. C'est valable dans les entreprises. C'est encore plus vrai en amour.

À trente-quatre ans, j'ai fondé mon propre cabinet et je l'ai rentabilisé en deux ans. Je suis fière de ce parcours, mais je refuse de le porter comme une armure. La réussite professionnelle ne remplace pas la chaleur humaine — elle ne lui ressemble même pas.

Je cherche un homme qui a trouvé sa voie et qui me laisse la mienne. Un homme qui considère le partage non comme une concession mais comme une richesse. Je suis prête pour une relation sérieuse, et je l'aborde avec la même rigueur bienveillante que je mets dans mon travail.`,
  },
]

async function main() {
  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌  Variables Firebase manquantes'); process.exit(1)
  }
  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) })
  }
  const db = getFirestore()

  // Lire les partenaires créés précédemment
  const idsFile = path.join(__dirname, '.alliance-partners-ids.json')
  if (!fs.existsSync(idsFile)) {
    console.error('❌  Fichier .alliance-partners-ids.json introuvable — exécutez d\'abord seed-alliance-partners.js')
    process.exit(1)
  }
  const partenaires = JSON.parse(fs.readFileSync(idsFile, 'utf8'))
  // Distribution circulaire des partenaires
  function getPid(i) { return partenaires[i % partenaires.length].id }

  console.log('\n👥  Insertion des 20 profils membres de démo...\n')
  const resultats = []

  const TIER_DIST = ['PRESTIGE','PRESTIGE','PRESTIGE','PRESTIGE','PRESTIGE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','EXCELLENCE','ELITE','ELITE','ELITE','ELITE','ELITE']

  for (let i = 0; i < PROFILS.length; i++) {
    const p = PROFILS[i]
    const ref = db.collection('alliance_privee_portraits_verified').doc()
    const now = new Date().toISOString()
    const tier = TIER_DIST[i]
    const pid = getPid(i)

    const photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.prenom)}&background=${p.gender === 'HOMME' ? '1a1a2e' : '2d1a00'}&color=C9A84C&size=400&bold=true&format=png`

    await ref.set({
      id: ref.id,
      application_id: 'DEMO',
      card_id: 'DEMO',
      partenaire_id: pid,
      tier,
      gender: p.gender,
      location: p.location,
      // Portrait
      prenom: p.prenom,
      nom_complet: p.nom_complet,
      age: p.age,
      ville: `${p.ville_residence}, ${p.pays_residence}`,
      ville_residence: p.ville_residence,
      pays_residence: p.pays_residence,
      profession: p.profession,
      niveau_etudes: p.niveau_etudes,
      titre_portrait: p.titre_portrait,
      bio: p.portrait,
      valeurs: p.valeurs,
      loisirs: p.loisirs,
      recherche: `Une relation sincère et durable avec quelqu'un de compatib.`,
      genre: p.genre,
      genre_recherche: p.genre_recherche,
      piliers: p.piliers,
      photo_url: null,
      photo_principale_floutee: photo,
      actif: true,
      is_demo: true,
      nombre_vues: Math.floor(Math.random() * 50),
      nombre_interets: Math.floor(Math.random() * 10),
      created_at: now,
      updated_at: now,
    })

    resultats.push({ nom: p.nom_complet, age: p.age, ville: p.ville_residence, profession: p.profession, tier, gender: p.gender })
    process.stdout.write(`  ✓ ${p.nom_complet} (${tier})\n`)
  }

  // Tableau
  console.log('\n')
  console.log('+' + '-'.repeat(30) + '+' + '-'.repeat(4) + '+' + '-'.repeat(12) + '+' + '-'.repeat(32) + '+' + '-'.repeat(12) + '+')
  console.log(`| ${'Nom'.padEnd(28)} | ${'Âge'.padEnd(2)} | ${'Ville'.padEnd(10)} | ${'Profession'.padEnd(30)} | ${'Tier'.padEnd(10)} |`)
  console.log('+' + '-'.repeat(30) + '+' + '-'.repeat(4) + '+' + '-'.repeat(12) + '+' + '-'.repeat(32) + '+' + '-'.repeat(12) + '+')
  for (const r of resultats) {
    console.log(`| ${r.nom.padEnd(28)} | ${String(r.age).padEnd(2)} | ${r.ville.padEnd(10)} | ${r.profession.slice(0,30).padEnd(30)} | ${r.tier.padEnd(10)} |`)
  }
  console.log('+' + '-'.repeat(30) + '+' + '-'.repeat(4) + '+' + '-'.repeat(12) + '+' + '-'.repeat(32) + '+' + '-'.repeat(12) + '+')
  console.log(`\n✅  ${resultats.length} profils membres insérés\n`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
