export const metadata = {
  title: 'Guide Partenaire — L&Lui Signature',
}

export default function HelpPartenairePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-emerald-300 text-sm font-medium mb-1">Guide partenaire</p>
          <h1 className="text-3xl font-bold mb-2">Guide Partenaire</h1>
          <p className="text-emerald-200 text-sm">Dashboard &amp; Commissions — L&amp;Lui Signature Hébergements</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Bienvenue */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-base font-semibold text-emerald-300 mb-4">Vous gagnez de l'argent par 3 canaux</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { num: '1', title: 'Cartes fidélité', desc: '65% de commission sur les ventes', icon: '🎫' },
              { num: '2', title: 'Boutique Canal 2', desc: '65% des achats boutique via votre code', icon: '🛍️' },
              { num: '3', title: 'Abonnement', desc: 'Accès aux outils et analytics', icon: '📊' },
            ].map(({ num, title, desc, icon }) => (
              <div key={num} className="bg-gray-800 rounded-lg p-4">
                <div className="text-3xl mb-2">{icon}</div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-gray-400 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Accès dashboard */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">1. Accès Dashboard</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div className="bg-gray-800 rounded-lg p-3 text-xs font-mono text-emerald-300">
              https://llui-signature-hebergements.vercel.app/partenaire/[votre-id]
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-3 py-2 text-left text-gray-400">Onglet</th>
                    <th className="px-3 py-2 text-left text-gray-400">Contenu</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['📊 Stats', 'Vue d\'ensemble, KPIs'],
                    ['👥 Clients', 'Clients avec votre carte'],
                    ['📱 Scanner', 'Créditer des points en boutique'],
                    ['⭐ Stars', 'Terminal Stars + statistiques fidélité'],
                    ['💰 Paiements', 'Commissions et revenus'],
                    ['📋 Historique', 'Toutes les transactions'],
                    ['🛍️ Boutique', 'Canal 2 — ventes et QR Flash'],
                  ].map(([o, c]) => (
                    <tr key={o} className="border-t border-gray-800">
                      <td className="px-3 py-2 text-white">{o}</td>
                      <td className="px-3 py-2 text-gray-400">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 2. Fidélité */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">2. Fidélité (Cartes)</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div>
              <p className="font-semibold text-white mb-1">Créer un programme</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Dashboard → [+ Créer programme]</li>
                <li>Remplir : Nom, prix, durée, taux de points</li>
                <li>Ajouter 4 niveaux (BRONZE/ARGENT/OR/DIAMANT) avec prix et avantages</li>
                <li>Cliquer [CRÉER]</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Vendre des cartes</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Client choisit son niveau</li>
                <li>Client remplit le formulaire (nom, email, phone)</li>
                <li>Client paie par Orange Money</li>
                <li>Attendez confirmation admin → Carte ACTIVE automatiquement</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Vos commissions cartes (65%)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse mt-2">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="px-3 py-2 text-left text-gray-400">Niveau</th>
                      <th className="px-3 py-2 text-left text-gray-400">Prix carte</th>
                      <th className="px-3 py-2 text-left text-gray-400">Votre commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['BRONZE', '25 000 FCFA', '~16 250 FCFA'],
                      ['ARGENT', '50 000 FCFA', '~32 500 FCFA'],
                      ['OR', '100 000 FCFA', '~65 000 FCFA'],
                      ['DIAMANT', '150 000 FCFA', '~97 500 FCFA'],
                    ].map(([n, p, c]) => (
                      <tr key={n} className="border-t border-gray-800">
                        <td className="px-3 py-2 text-white">{n}</td>
                        <td className="px-3 py-2">{p}</td>
                        <td className="px-3 py-2 text-emerald-400 font-semibold">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Scanner fidélité */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">3. Scanner Fidélité (en boutique)</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <p className="text-gray-400">Quand un client achète chez vous avec sa carte :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Allez sur l'onglet 📱 Scanner du dashboard</li>
              <li>Client présente son QR code (sur son téléphone)</li>
              <li>Scannez le QR ou saisissez l'ID manuellement</li>
              <li>Entrez le montant de l'achat</li>
              <li>Cliquez [AJOUTER LES POINTS]</li>
              <li><strong className="text-white">Le reçu visuel s'affiche</strong> → retournez l'écran vers le client</li>
              <li>Client voit : points crédités + nouveau total + QR de sa carte</li>
            </ol>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-xs text-blue-200">
              Le client voit ses points mis à jour en temps réel sur sa page — pas d'email/WhatsApp.
            </div>
          </div>
        </section>

        {/* 4. Stars Terminal */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">4. Terminal Stars (Onglet ⭐ Stars)</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <p className="text-gray-400">Le terminal Stars vous permet de créditer des points directement à un client fidèle lors d'un achat chez vous.</p>
            <div>
              <p className="font-semibold text-white mb-1">Créditer des Stars à un client</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Dashboard → Onglet ⭐ Stars</li>
                <li>Saisissez le numéro de téléphone du client (ou son ID)</li>
                <li>Entrez le montant de l'achat en FCFA</li>
                <li>Les Stars calculées s'affichent en temps réel</li>
                <li>Cliquez [CRÉDITER LES STARS]</li>
                <li>Le client reçoit un lien de confirmation par WhatsApp</li>
                <li>Il clique sur le lien → Stars créditées instantanément</li>
              </ol>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-xs space-y-1">
              <p className="text-emerald-300 font-semibold">Taux de conversion</p>
              <p className="text-gray-400">1 FCFA dépensé = 1 Star (taux configurable par l'admin)</p>
              <p className="text-gray-400">Exemple : achat 10 000 FCFA → 10 000 Stars créditées</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Statistiques Stars</p>
              <p className="text-gray-400">En haut de l'onglet Stars : total Stars distribuées, nombre de clients actifs, transactions du mois.</p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-xs">
              <p className="text-yellow-300 font-semibold">⚠️ Provision nécessaire</p>
              <p className="mt-1">Votre compte doit avoir une provision suffisante pour créditer des Stars. Contactez l'admin si le bouton est désactivé.</p>
            </div>
          </div>
        </section>

        {/* 5. Canal 2 */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">5. Canal 2 (Boutique QR Flash)</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div>
              <p className="font-semibold text-white mb-1">Comment ça fonctionne</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Client scanne votre QR code</li>
                <li>Saisit son numéro WhatsApp → reçoit OTP</li>
                <li>Valide OTP → code session généré (48h)</li>
                <li>Achète en boutique L&amp;Lui avec ce code</li>
                <li>Paiement confirmé → commission automatiquement créée dans votre dashboard</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Votre QR code</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Visible dans votre dashboard → Onglet 🛍️ Boutique</li>
                <li>À imprimer et afficher en établissement</li>
                <li>Pointe vers <code className="text-emerald-300">/promo/[votre-id]</code></li>
              </ul>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-300 font-semibold text-xs">⚠️ QUOTA CLIENT</p>
              <p className="text-xs mt-1">Un client = 1 code par 30 jours</p>
            </div>
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-3 text-xs text-emerald-200">
              Exemple : Client dépense 50 000 FCFA → Vous gagnez <strong>~32 500 FCFA</strong> (65%)
            </div>
          </div>
        </section>

        {/* 5. Statistiques */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">6. Statistiques &amp; Revenus</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div>
              <p className="font-semibold text-white mb-2">Onglet 💰 Paiements</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>CA Fidélité (cartes vendues)</li>
                <li>CA Boutique (QR Flash ventes)</li>
                <li>CA Total (Fidélité + Boutique)</li>
                <li>Commissions gagnées</li>
                <li>Historique des paiements reçus</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Onglet 🛍️ Boutique</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li><code className="text-yellow-300">total_ca_boutique_fcfa</code> — CA boutique cumulé</li>
                <li><code className="text-yellow-300">total_commissions_fcfa</code> — Commissions cumulées</li>
                <li><code className="text-yellow-300">total_utilisations</code> — Nombre de ventes</li>
                <li>Dernières 20 ventes avec statuts (En cours / En attente / Versé)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold text-emerald-300 mb-4">7. FAQ Partenaire</h2>
          <div className="space-y-3">
            {[
              { q: "Combien je gagne par carte ?", a: "65% du prix. ARGENT (50k) = 32 500 FCFA." },
              { q: "Combien par vente boutique ?", a: "65% du montant. 50 000 FCFA boutique = 32 500 FCFA." },
              { q: "Quand je reçois mes commissions ?", a: "Mensuellement par virement. Statut \"Versé\" dans le dashboard." },
              { q: "Un client a perdu sa carte ?", a: "Renvoyez-lui le lien permanent (disponible dans Clients → chercher par nom)." },
              { q: "Comment changer les avantages de ma carte ?", a: "Dashboard → Onglet Fidélité → Modifier le programme." },
              { q: "Que faire si le QR ne scanne pas ?", a: "Essayez d'entrer l'ID manuellement dans le scanner. Si persistant, contactez le support." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="font-semibold text-white text-sm mb-1">Q : {q}</p>
                <p className="text-gray-300 text-sm">A : {a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-emerald-300 mb-3">Contact &amp; Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <div><span className="text-gray-500">Support technique</span><br /><span>support@l-et-lui.com</span></div>
            <div><span className="text-gray-500">Commercial</span><br /><span>commercial@l-et-lui.com</span></div>
            <div><span className="text-gray-500">Téléphone / WhatsApp</span><br /><span>+237 693 407 964</span></div>
            <div><span className="text-gray-500">Horaires</span><br /><span>Lun-Ven 9h-18h (Kribi)</span></div>
          </div>
        </div>

      </div>
    </div>
  )
}
