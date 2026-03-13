export interface HelpItem {
  id: string
  question: string
  answer: string
}

export interface HelpCategory {
  id: string
  title: string
  emoji: string
  items: HelpItem[]
}

export const DEFAULT_HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'reservations',
    title: 'Mes réservations',
    emoji: '📋',
    items: [
      {
        id: 'create',
        question: 'Comment créer une réservation ?',
        answer: 'Depuis votre tableau de bord, cliquez sur "Nouvelle réservation". Remplissez le formulaire : choisissez l\'hébergement, les dates d\'arrivée/départ, le nombre de voyageurs, et les informations du client. Validez pour générer la réservation.',
      },
      {
        id: 'whatsapp4',
        question: 'Comment utiliser les 4 boutons WhatsApp ?',
        answer: '1) Envoyer proposition → envoie les détails et le prix au client. 2) Demander paiement → envoie le montant et le numéro Orange Money. 3) Confirmer paiement → valide la réservation après réception des fonds. 4) Envoyer fiche → transmet le QR code et les instructions d\'arrivée au client.',
      },
      {
        id: 'payment_confirm',
        question: 'Comment confirmer un paiement reçu ?',
        answer: 'Ouvrez la réservation concernée, puis cliquez sur le bouton "Confirmer paiement reçu". La réservation passe automatiquement en statut "Confirmée" et les dates sont bloquées dans le calendrier.',
      },
      {
        id: 'no_payment',
        question: 'Que faire si un client ne paie pas ?',
        answer: 'Attendez 24 à 48h après l\'envoi de la demande de paiement. Si aucun retour, relancez via WhatsApp. Sans réponse après 72h, vous pouvez annuler la réservation depuis la fiche et libérer les dates.',
      },
      {
        id: 'cancel',
        question: 'Comment annuler une réservation ?',
        answer: 'Ouvrez la réservation, faites défiler jusqu\'en bas, et utilisez le bouton "Annuler". Indiquez le motif. Les dates seront automatiquement libérées dans votre calendrier.',
      },
    ],
  },
  {
    id: 'calendrier',
    title: 'Mon calendrier',
    emoji: '📅',
    items: [
      {
        id: 'block',
        question: 'Comment bloquer une date ?',
        answer: 'Dans votre tableau de bord, cliquez directement sur une date disponible dans le calendrier de l\'hébergement concerné. La date devient rouge = bloquée. Utile pour les nettoyages, travaux ou séjours personnels.',
      },
      {
        id: 'unblock',
        question: 'Comment débloquer une date ?',
        answer: 'Cliquez à nouveau sur la date rouge bloquée. Elle redevient verte = disponible. Attention : les dates des réservations confirmées ne peuvent pas être débloquées depuis le calendrier.',
      },
      {
        id: 'colors',
        question: 'Quelle est la signification des couleurs ?',
        answer: 'Vert = disponible. Rouge/gris = bloqué manuellement. Orange = réservation en attente. Bleu foncé = réservation confirmée. Jaune = demande de disponibilité non traitée.',
      },
      {
        id: 'double',
        question: 'Comment éviter les doubles réservations ?',
        answer: 'Confirmez toujours le paiement avant de communiquer les dates. Le système bloque automatiquement les dates à la confirmation. En cas de doute, bloquez la date manuellement le temps de valider.',
      },
    ],
  },
  {
    id: 'scanner',
    title: 'Scanner QR Code',
    emoji: '📷',
    items: [
      {
        id: 'activate',
        question: 'Comment activer le scanner ?',
        answer: 'Dans votre espace partenaire, appuyez sur l\'onglet "Scanner" dans la barre de navigation. Autorisez l\'accès à la caméra quand le navigateur le demande. Pointez vers le QR code du client.',
      },
      {
        id: 'badge_rouge',
        question: 'Pourquoi mon badge de paiement est rouge ?',
        answer: 'Le badge rouge signifie que le paiement de cette réservation n\'a pas encore été confirmé dans le système. Vérifiez que vous avez bien cliqué sur "Confirmer paiement reçu" dans la fiche réservation.',
      },
      {
        id: 'confirm_arrival',
        question: 'Comment confirmer l\'arrivée d\'un client ?',
        answer: 'Scannez le QR code que le client a reçu sur son téléphone. Si le code est valide et le paiement confirmé, un écran vert "Bienvenue" s\'affiche. L\'arrivée est enregistrée automatiquement.',
      },
    ],
  },
  {
    id: 'logements',
    title: 'Mes logements et QR Codes',
    emoji: '🏠',
    items: [
      {
        id: 'qr_chambre',
        question: 'Comment générer le QR Code chambre ?',
        answer: 'Dans votre tableau de bord, cliquez sur "Historique & QR" à côté du logement concerné. Dans la page logement, cliquez sur "QR Code chambre". Téléchargez l\'image et imprimez-la en A4.',
      },
      {
        id: 'qr_place',
        question: 'Où placer les QR Codes ?',
        answer: 'QR Code chambre : à placer dans chaque logement (entrée, bureau, table de nuit). QR Code réception : à placer à l\'accueil de votre établissement. Les clients scannent pour accéder aux informations et demander une réservation.',
      },
      {
        id: 'new_logement',
        question: 'Comment proposer un nouveau logement ?',
        answer: 'Contactez l\'équipe L&Lui via la messagerie (icône message dans votre espace). Précisez le nom, la localisation, la capacité et les équipements. L\'équipe créera la fiche et l\'associera à votre compte.',
      },
    ],
  },
  {
    id: 'abonnement',
    title: 'Mon abonnement',
    emoji: '💎',
    items: [
      {
        id: 'upgrade',
        question: 'Comment upgrader mon abonnement ?',
        answer: 'Dans votre espace partenaire, cliquez sur "Mettre à niveau" dans le bandeau de votre plan actuel. Choisissez la formule souhaitée et envoyez votre demande via WhatsApp. L\'équipe L&Lui activera votre nouveau plan dans les 24h.',
      },
      {
        id: 'expiration',
        question: 'Comment connaître ma date d\'expiration ?',
        answer: 'La date d\'expiration est indiquée dans le bandeau de votre plan actuel sur le tableau de bord. Vous recevrez également un message WhatsApp de rappel 7 jours avant l\'échéance.',
      },
      {
        id: 'expiration_consequence',
        question: 'Que se passe-t-il si mon abonnement expire ?',
        answer: 'À l\'expiration, l\'accès à votre espace partenaire est suspendu. Vos logements restent en ligne mais aucune nouvelle réservation ne peut être créée. Contactez L&Lui pour renouveler et retrouver l\'accès complet.',
      },
    ],
  },
  {
    id: 'paiements',
    title: 'Paiements et revenus',
    emoji: '💰',
    items: [
      {
        id: 'configure_om',
        question: 'Comment configurer mon numéro Orange Money ?',
        answer: 'Depuis votre tableau de bord, cliquez sur "Paramètres de paiement". Renseignez votre numéro Orange Money (format : 6XXXXXXXX). Ce numéro sera affiché automatiquement dans les messages WhatsApp de demande de paiement.',
      },
      {
        id: 'reversement',
        question: 'Quel est le délai de reversement ?',
        answer: 'Les conditions de reversement sont définies dans votre contrat de partenariat. Pour toute question sur un reversement spécifique, contactez l\'équipe L&Lui via la messagerie.',
      },
      {
        id: 'read_revenue',
        question: 'Comment lire mon tableau de bord revenus ?',
        answer: 'Cliquez sur "Mes revenus" dans le tableau de bord. Vous y trouverez : les revenus encaissés (réservations payées), le graphique mensuel, et le détail de vos réservations confirmées. Les montants sont en FCFA.',
      },
    ],
  },
  {
    id: 'contrat',
    title: 'Mon contrat',
    emoji: '📝',
    items: [
      {
        id: 'sign',
        question: 'Comment signer mon contrat ?',
        answer: 'Depuis votre espace partenaire, cliquez sur la bannière orange "Signer maintenant" ou sur l\'onglet "Contrat". Lisez intégralement le contrat (scroll jusqu\'en bas), renseignez vos informations, puis validez avec le code OTP reçu par WhatsApp.',
      },
      {
        id: 'download_signed',
        question: 'Comment télécharger mon contrat signé ?',
        answer: 'Une fois le contrat signé, un PDF est généré automatiquement. Vous pouvez le télécharger depuis la page Contrat de votre espace partenaire. Un exemplaire est également conservé dans le système L&Lui.',
      },
      {
        id: 'modify_signataire',
        question: 'Comment modifier les informations du signataire ?',
        answer: 'Contactez l\'équipe L&Lui via la messagerie. Un nouveau contrat vous sera envoyé pour une nouvelle signature avec les informations corrigées.',
      },
    ],
  },
]
