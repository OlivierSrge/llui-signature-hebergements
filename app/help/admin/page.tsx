import Link from 'next/link'

export const metadata = {
  title: 'Guide Administrateur — L&Lui Signature',
}

export default function HelpAdminPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-purple-300 text-sm font-medium mb-1">Documentation interne</p>
          <h1 className="text-3xl font-bold mb-2">Guide Administrateur</h1>
          <p className="text-purple-200 text-sm">L&amp;Lui Signature Hébergements — Version Juin 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Table des matières */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-purple-300">Table des matières</h2>
          <ol className="space-y-1 text-sm text-gray-300 list-decimal list-inside">
            <li><a href="#setup" className="hover:text-purple-300 transition-colors">Setup initial &amp; paramètres</a></li>
            <li><a href="#partenaires" className="hover:text-purple-300 transition-colors">Gestion partenaires</a></li>
            <li><a href="#fidelite" className="hover:text-purple-300 transition-colors">Programmes fidélité</a></li>
            <li><a href="#confirmations" className="hover:text-purple-300 transition-colors">Confirmations cartes</a></li>
            <li><a href="#qrflash" className="hover:text-purple-300 transition-colors">QR Flash &amp; quota</a></li>
            <li><a href="#webhook" className="hover:text-purple-300 transition-colors">Webhook Google Sheets → Stars</a></li>
            <li><a href="#unification" className="hover:text-purple-300 transition-colors">Unification identités</a></li>
            <li><a href="#faq" className="hover:text-purple-300 transition-colors">FAQ Admin</a></li>
            <li><a href="#troubleshooting" className="hover:text-purple-300 transition-colors">Troubleshooting</a></li>
          </ol>
        </div>

        {/* Accès rapide */}
        <div className="bg-indigo-950 border border-indigo-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-indigo-300 mb-3">Accès rapide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Dashboard Admin', href: '/admin' },
              { label: 'Confirmations cartes', href: '/admin/loyalty-confirmations' },
              { label: 'Programmes fidélité', href: '/admin/loyalty-programs' },
              { label: 'Créer programme', href: '/admin/loyalty-programs/create' },
              { label: 'Paramètres', href: '/admin/parametres' },
            ].map(({ label, href }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2 bg-indigo-900/50 hover:bg-indigo-800/60 px-4 py-2 rounded-lg text-indigo-200 transition-colors">
                <span className="text-indigo-400">→</span> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* 1. Setup */}
        <section id="setup">
          <h2 className="text-xl font-bold text-purple-300 mb-4">1. Setup initial &amp; paramètres</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4 text-sm text-gray-300">
            <p className="text-gray-400 italic">Collection Firestore : <code className="text-purple-300">parametres_plateforme/taux_et_forfaits</code></p>

            <div>
              <p className="font-semibold text-white mb-1">A. QUOTA QR FLASH</p>
              <p><code className="text-yellow-300">fidelite_qr_flash_quota_jours</code> = <code>30</code> (défaut)</p>
              <p>Un client peut flasher un code par N jours. Modifiable depuis le panel Admin → Paramètres.</p>
            </div>

            <div>
              <p className="font-semibold text-white mb-1">B. VALEUR STAR</p>
              <p><code className="text-yellow-300">fidelite_valeur_star_fcfa</code> = <code>1</code> (défaut)</p>
              <p>1 star = 1 FCFA dépensé en boutique. Exemple : 50 000 FCFA → 50 000 Stars.</p>
            </div>

            <div>
              <p className="font-semibold text-white mb-1">C. SEUILS PALIERS</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse mt-2">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="px-3 py-2 text-left text-gray-400">Palier</th>
                      <th className="px-3 py-2 text-left text-gray-400">Seuil</th>
                      <th className="px-3 py-2 text-left text-gray-400">Champ Firestore</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Novice', '0', 'fidelite_seuil_novice'],
                      ['Explorateur', '25 000', 'fidelite_seuil_explorateur'],
                      ['Ambassadeur', '75 000', 'fidelite_seuil_ambassadeur'],
                      ['Excellence', '150 000', 'fidelite_seuil_excellence'],
                    ].map(([p, s, c]) => (
                      <tr key={p} className="border-t border-gray-800">
                        <td className="px-3 py-2">{p}</td>
                        <td className="px-3 py-2">{s}</td>
                        <td className="px-3 py-2 text-yellow-300 font-mono">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Partenaires */}
        <section id="partenaires">
          <h2 className="text-xl font-bold text-purple-300 mb-4">2. Gestion partenaires</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <div>
              <p className="font-semibold text-white mb-1">Ajouter un prescripteur</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Aller sur <code className="text-purple-300">/admin/partners</code> → [+ Ajouter prescripteur]</li>
                <li>Remplir : Nom, type, contact, localisation, photo</li>
                <li>Cliquer [CRÉER]</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">QR Code partenaire</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Généré automatiquement à la création</li>
                <li>À imprimer et afficher en boutique</li>
                <li>Pointe vers <code className="text-purple-300">/promo/[partenaireId]</code></li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Programmes fidélité */}
        <section id="fidelite">
          <h2 className="text-xl font-bold text-purple-300 mb-4">3. Programmes fidélité</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <div>
              <p className="font-semibold text-white mb-1">Créer un programme</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Aller sur <code className="text-purple-300">/admin/loyalty-programs/create</code></li>
                <li>Choisir le partenaire</li>
                <li>Remplir : Nom, prix, durée, commission, taux points</li>
                <li>Ajouter 4 niveaux (BRONZE/ARGENT/OR/DIAMANT) avec prix par niveau</li>
                <li>Cliquer [CRÉER PROGRAMME]</li>
              </ol>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-3 py-2 text-left text-gray-400">Niveau</th>
                    <th className="px-3 py-2 text-left text-gray-400">Prix</th>
                    <th className="px-3 py-2 text-left text-gray-400">Réduction</th>
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
          </div>
        </section>

        {/* 4. Confirmations */}
        <section id="confirmations">
          <h2 className="text-xl font-bold text-purple-300 mb-4">4. Confirmations cartes fidélité</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <p>Flux : <span className="text-yellow-300">PENDING</span> → Admin confirme → <span className="text-green-400">ACTIVE</span></p>
            <p>Accéder : Sidebar → ✅ Cartes à confirmer (badge rouge) ou <code className="text-purple-300">/admin/loyalty-confirmations</code></p>
            <div>
              <p className="font-semibold text-white mb-1">Confirmer une carte</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Voir liste PENDING</li>
                <li>Cliquer sur la carte</li>
                <li>Vérifier les détails (nom, email, montant)</li>
                <li>[✅ CONFIRMER] → ACTIVE, carte liée aux Stars</li>
                <li>Ou [❌ REJETER] → REJECTED</li>
              </ol>
            </div>
          </div>
        </section>

        {/* 5. QR Flash */}
        <section id="qrflash">
          <h2 className="text-xl font-bold text-purple-300 mb-4">5. QR Flash &amp; Quota</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <div>
              <p className="font-semibold text-white mb-1">Flux client</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Scanne QR partenaire → <code>/promo/[id]</code></li>
                <li>Saisit numéro WhatsApp</li>
                <li>Reçoit code OTP 6 chiffres par WhatsApp</li>
                <li>Valide OTP</li>
                <li>Code session généré (48h, max 5 utilisations)</li>
                <li>Redirigé vers <code>/sejour/[code]</code></li>
              </ol>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-300 font-semibold text-xs">⚠️ QUOTA</p>
              <p className="text-xs mt-1">1 code par 30 jours par client (phone E.164). Configurable : <code>fidelite_qr_flash_quota_jours</code>.</p>
            </div>
          </div>
        </section>

        {/* 6. Webhook */}
        <section id="webhook">
          <h2 className="text-xl font-bold text-purple-300 mb-4">6. Webhook Google Sheets → Stars</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <p className="text-gray-400 italic">Flux automatique — aucune action admin requise.</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Partenaire remplit vente dans Google Sheets</li>
              <li>Col L (Statut) = "Payé" ou "Confirmé"</li>
              <li>Apps Script → <code>POST /api/sheets-webhook</code></li>
              <li>Stars calculées = montant ÷ <code>fidelite_valeur_star_fcfa</code></li>
              <li>Transaction créée dans <code>transactions_fidelite</code></li>
              <li><code>clients_fidelite[phone].points_stars</code> incrémenté</li>
              <li>Palier recalculé automatiquement</li>
            </ol>
            <p className="text-xs text-gray-500">Vérification : Firestore → <code>transactions_fidelite</code> ou <code>clients_fidelite</code></p>
          </div>
        </section>

        {/* 7. Unification */}
        <section id="unification">
          <h2 className="text-xl font-bold text-purple-300 mb-4">7. Unification identités</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3">
            <p>Une seule identité par client = numéro de téléphone E.164 (+237…)</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Client scanne QR + OTP → <code>clients_fidelite[+237...]</code> créé</li>
              <li>Client achète carte → <code>loyalty_card.client_phone = +237...</code></li>
              <li>Admin confirme carte → <code>loyalty_card.client_id</code> = phone E.164</li>
            </ol>
            <div>
              <p className="font-semibold text-white mb-1 text-xs">Vérification</p>
              <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                <li><code>loyalty_cards[id].client_id</code> = <code>+237690123456</code> (pas <code>guest_$&#123;ts&#125;</code>)</li>
                <li><code>clients_fidelite[+237690123456].phone_verified</code> = <code>true</code> (OTP) ou <code>false</code> (inféré)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 8. FAQ */}
        <section id="faq">
          <h2 className="text-xl font-bold text-purple-300 mb-4">8. FAQ Admin</h2>
          <div className="space-y-3">
            {[
              { q: 'Badge PENDING ne baisse pas ?', a: 'Rafraîchissez la page (F5).' },
              { q: 'Client ne reçoit pas WhatsApp OTP ?', a: 'Vérifiez variables Twilio (TWILIO_*) dans Vercel env vars.' },
              { q: 'Webhook ne déclenche pas ?', a: 'Vérifiez Col L valeur exacte ("Payé" pas "paye"). Vérifiez trigger onEdit dans Apps Script.' },
              { q: 'Stars comptés deux fois ?', a: 'Vérifiez transactions_fidelite — webhook a déduplication. Si doublon, supprimer un doc manuellement.' },
            ].map(({ q, a }) => (
              <div key={q} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="font-semibold text-white text-sm mb-1">Q : {q}</p>
                <p className="text-gray-300 text-sm">A : {a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Troubleshooting */}
        <section id="troubleshooting">
          <h2 className="text-xl font-bold text-purple-300 mb-4">9. Troubleshooting</h2>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4">
            <div>
              <p className="font-semibold text-white mb-1">Webhook ne déclenche pas</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Col L ≠ "Payé" exactement → Corriger la valeur dans Sheets</li>
                <li>Apps Script pas actif → Extensions → Apps Script → Vérifier trigger onEdit</li>
                <li><code>SHEETS_WEBHOOK_SECRET</code> incorrect → Vérifier Vercel env vars</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Client n'a pas de Stars après achat</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Pas identifié (pas de phone dans <code>codes_sessions</code>) → Client doit scanner QR d'abord</li>
                <li>Webhook pas déclenché → Voir ci-dessus</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contact */}
        <div className="bg-purple-950 border border-purple-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-purple-300 mb-3">Contact &amp; Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <div><span className="text-gray-500">Email</span><br /><span>admin@l-et-lui.com</span></div>
            <div><span className="text-gray-500">Téléphone</span><br /><span>+237 693 407 964</span></div>
            <div><span className="text-gray-500">Horaires</span><br /><span>Lun-Ven 9h-18h (Kribi)</span></div>
          </div>
        </div>

      </div>
    </div>
  )
}
