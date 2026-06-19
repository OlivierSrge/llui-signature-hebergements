export const metadata = {
  title: 'Guide Client — L&Lui Signature',
}

export default function HelpClientPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 to-yellow-800 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-amber-300 text-sm font-medium mb-1">Guide utilisateur</p>
          <h1 className="text-3xl font-bold mb-2">Guide Client</h1>
          <p className="text-amber-200 text-sm">Cartes Fidélité &amp; Points Stars — L&amp;Lui Signature Hébergements</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Intro */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-base font-semibold text-amber-300 mb-4">Les 3 façons d'accumuler des points</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { icon: '🎯', title: 'Scanner QR partenaire', desc: 'Gratuit • 1 fois par 30 jours • Saisie numéro uniquement', pts: 'Stars L&Lui' },
              { icon: '🛍️', title: 'Acheter en boutique', desc: 'Prix produit • Illimité', pts: 'Stars L&Lui' },
              { icon: '🎫', title: 'Acheter carte fidélité', desc: '25k–150k FCFA • 1 par partenaire', pts: 'Points partenaire' },
            ].map(({ icon, title, desc, pts }) => (
              <div key={title} className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <p className="font-semibold text-white text-sm">{title}</p>
                <p className="text-gray-400 text-xs mt-1">{desc}</p>
                <p className="text-amber-300 text-xs mt-2 font-medium">{pts}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Scanner QR */}
        <section>
          <h2 className="text-xl font-bold text-amber-300 mb-4">1. Scanner QR Partenaire</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div>
              <p className="font-semibold text-white mb-1">Comment ça marche</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Scannez le QR code affiché chez le partenaire</li>
                <li>Un formulaire s'affiche automatiquement</li>
                <li>Saisissez votre numéro de téléphone (ex : 690 123 456)</li>
                <li>Cliquez [OBTENIR MON CODE →]</li>
                <li>Vous êtes redirigé vers la page de la boutique</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Votre code session</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Valable <strong className="text-white">48 heures</strong></li>
                <li>Usage limité (5 utilisations max)</li>
                <li>Lié à votre numéro pour cumuler des Stars</li>
              </ul>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-300 font-semibold text-xs">⚠️ QUOTA</p>
              <p className="text-xs mt-1">1 code par 30 jours par numéro de téléphone. Si vous réessayez avant 30 jours, la date de disponibilité s'affiche.</p>
            </div>
          </div>
        </section>

        {/* 2. Acheter en boutique */}
        <section>
          <h2 className="text-xl font-bold text-amber-300 mb-4">2. Acheter en Boutique</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <p>Après avoir généré votre code session, vous arrivez sur <code className="text-amber-300">/sejour/[code]</code>.</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Parcourez les produits disponibles</li>
              <li>Ajoutez au panier</li>
              <li>Procédez au paiement (Orange Money)</li>
              <li><strong className="text-white">Points Stars crédités automatiquement</strong> après confirmation</li>
            </ol>
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3 text-xs">
              <p className="text-amber-300">Exemple : 50 000 FCFA dépensés = 50 000 Stars (avec taux défaut 1:1)</p>
            </div>
          </div>
        </section>

        {/* 3. Carte fidélité */}
        <section>
          <h2 className="text-xl font-bold text-amber-300 mb-4">3. Acheter une Carte Fidélité</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-3 py-2 text-left text-gray-400">Niveau</th>
                    <th className="px-3 py-2 text-left text-gray-400">Prix</th>
                    <th className="px-3 py-2 text-left text-gray-400">Réduction achats</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['BRONZE 🤍', '25 000 FCFA', '5%'],
                    ['ARGENT 🩶', '50 000 FCFA', '10%'],
                    ['OR 💛', '100 000 FCFA', '15%'],
                    ['DIAMANT 💎', '150 000 FCFA', '20%'],
                  ].map(([n, p, r]) => (
                    <tr key={n} className="border-t border-gray-800">
                      <td className="px-3 py-2">{n}</td>
                      <td className="px-3 py-2">{p}</td>
                      <td className="px-3 py-2 text-green-400">{r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Comment acheter</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Demandez au partenaire "Je veux une carte fidélité"</li>
                <li>Choisissez votre niveau (BRONZE/ARGENT/OR/DIAMANT)</li>
                <li>Remplissez : Prénom, Nom, Email, Téléphone</li>
                <li>Payez par Orange Money</li>
                <li>Attendez la confirmation de l'admin (1-2h)</li>
                <li>Recevez votre lien de carte par email</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Utiliser votre carte</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Présentez la carte (votre lien personnel) à chaque visite</li>
                <li>Le partenaire scanne votre QR code</li>
                <li>Entrez le montant de l'achat → Points crédités instantanément</li>
                <li className="text-yellow-300">Gardez précieusement votre lien — c'est votre seul accès</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Paliers Stars */}
        <section>
          <h2 className="text-xl font-bold text-amber-300 mb-4">4. Paliers Stars L&amp;Lui</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <p className="text-sm text-gray-400 mb-4">La progression est <strong className="text-white">automatique</strong> selon vos Stars cumulées à vie.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '🌱', palier: 'Novice', seuil: '0 – 24 999 Stars', avantage: 'Accès boutique standard' },
                { icon: '🌟', palier: 'Explorateur', seuil: '25 000 – 74 999 Stars', avantage: 'Réductions boutique 5%' },
                { icon: '🏆', palier: 'Ambassadeur', seuil: '75 000 – 149 999 Stars', avantage: 'Réductions 10% + accès lounge' },
                { icon: '💎', palier: 'Excellence', seuil: '150 000+ Stars', avantage: 'Réductions 20% + avantages VIP' },
              ].map(({ icon, palier, seuil, avantage }) => (
                <div key={palier} className="bg-gray-800 rounded-lg p-4">
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="font-bold text-white">{palier}</p>
                  <p className="text-amber-300 text-xs mt-1">{seuil}</p>
                  <p className="text-gray-400 text-xs mt-1">{avantage}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold text-amber-300 mb-4">5. FAQ Client</h2>
          <div className="space-y-3">
            {[
              { q: "Je n'ai pas été redirigé après avoir saisi mon numéro ?", a: "Vérifiez votre connexion internet et réessayez. Si le problème persiste, contactez le partenaire." },
              { q: "Mes points expirent-ils ?", a: "Non. Vos points restent à vie." },
              { q: "Je peux utiliser ma carte chez plusieurs partenaires ?", a: "Non. Chaque carte est liée à un seul partenaire." },
              { q: "J'ai perdu mon lien de carte ?", a: "Contactez le partenaire ou écrivez à contact@l-et-lui.com avec votre email d'achat." },
              { q: "Combien de temps la confirmation prend ?", a: "1 à 2 heures en journée (Lun-Ven 9h-18h)." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="font-semibold text-white text-sm mb-1">Q : {q}</p>
                <p className="text-gray-300 text-sm">A : {a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div className="bg-amber-950 border border-amber-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-amber-300 mb-3">Contact &amp; Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-300">
            <div><span className="text-gray-500">Email</span><br /><span>contact@l-et-lui.com</span></div>
            <div><span className="text-gray-500">WhatsApp</span><br /><span>+237 693 407 964</span></div>
            <div><span className="text-gray-500">Horaires</span><br /><span>Lun-Ven 9h-18h (Kribi)</span></div>
          </div>
        </div>

      </div>
    </div>
  )
}
