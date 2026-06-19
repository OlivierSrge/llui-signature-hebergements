export const metadata = {
  title: 'Guide Prescripteur — L&Lui Signature',
}

export default function HelpPrescripteurPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-6 py-10" style={{ background: 'linear-gradient(to right, #1a1a1a, #2a2a2a)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-medium mb-1" style={{ color: '#C9A84C' }}>Guide prescripteur</p>
          <h1 className="text-3xl font-bold mb-2">Guide Prescripteur</h1>
          <p className="text-sm" style={{ color: '#C9A84C', opacity: 0.7 }}>
            Commissions moto-taxi — L&amp;Lui Signature Hébergements · Kribi
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Principe */}
        <div className="rounded-xl p-6 border border-gray-800" style={{ background: '#1a1a1a' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#C9A84C' }}>Comment gagner des commissions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { num: '1', icon: '🏨', title: 'Scanner le QR du partenaire', desc: 'Vous vous positionnez dans l\'établissement' },
              { num: '2', icon: '📋', title: 'Scanner le QR du client', desc: 'Le client vous montre son QR réservation' },
              { num: '3', icon: '💰', title: 'Commission créditée', desc: '1 500 FCFA automatiquement sur votre solde' },
            ].map(({ num, icon, title, desc }) => (
              <div key={num} className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <p className="font-semibold text-white text-sm">{title}</p>
                <p className="text-gray-400 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Connexion */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>1. Connexion</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3" style={{ background: '#1a1a1a' }}>
            <ol className="list-decimal list-inside space-y-1">
              <li>Accédez à <code className="text-yellow-300">llui-signature-hebergements.vercel.app/prescripteur</code></li>
              <li>Saisissez votre code PIN à 4 chiffres</li>
              <li>Vous arrivez sur votre tableau de bord</li>
            </ol>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-xs">
              <p className="text-yellow-300 font-semibold">⚠️ Code PIN oublié ?</p>
              <p className="mt-1">Contactez L&amp;Lui au +237 693 407 964 pour réinitialiser votre accès.</p>
            </div>
          </div>
        </section>

        {/* 2. Scanner le QR partenaire */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>2. Étape 1 — Scanner le QR du partenaire</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4" style={{ background: '#1a1a1a' }}>
            <p className="text-gray-400">Avant d'accueillir un client, vous devez vous positionner dans l'établissement partenaire.</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Cliquez sur <strong className="text-white">[Scanner le QR du partenaire]</strong></li>
              <li>Autorisez l'accès à la caméra si demandé</li>
              <li>Pointez vers le QR code affiché chez le partenaire</li>
              <li>L'écran vert <em>"Vous êtes positionné !"</em> s'affiche</li>
              <li>La session est valide <strong className="text-white">2 heures</strong></li>
            </ol>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-xs">
              <p className="text-blue-300 font-semibold">Pas de caméra ?</p>
              <p className="mt-1">Cliquez sur "Saisir le code manuellement" et entrez le code inscrit sous le QR partenaire.</p>
            </div>
            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-3 text-xs">
              <p className="text-gray-300 font-semibold">Partenaires proches (géolocalisation)</p>
              <p className="mt-1 text-gray-400">Une liste des partenaires à proximité s'affiche en bas — appuyez directement dessus pour vous positionner sans scanner.</p>
            </div>
          </div>
        </section>

        {/* 3. Scanner QR client */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>3. Étape 2 — Scanner le QR réservation du client</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4" style={{ background: '#1a1a1a' }}>
            <p className="text-gray-400">Une fois positionné chez le partenaire, attendez l'arrivée du client.</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Le client vous montre le QR code de sa réservation L&amp;Lui</li>
              <li>Cliquez sur <strong className="text-white">[Scanner le QR réservation client]</strong></li>
              <li>Scannez le QR code du client</li>
              <li>L'écran vert <em>"COMMISSION REÇUE !"</em> s'affiche avec le montant</li>
              <li>La commission est créditée automatiquement sur votre solde</li>
            </ol>
            <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>+1 500 FCFA</p>
              <p className="text-xs text-gray-400 mt-1">par réservation scannée</p>
            </div>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-xs">
              <p className="text-red-300 font-semibold">⚠️ QR invalide ?</p>
              <p className="mt-1">Si vous scannez le mauvais QR (QR d'arrivée LLS-XXXX au lieu du QR prescripteur), un message d'erreur s'affiche. Demandez au partenaire le QR prescripteur séparé affiché sur son écran.</p>
            </div>
          </div>
        </section>

        {/* 4. Mode hors-ligne */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>4. Mode hors-ligne</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3" style={{ background: '#1a1a1a' }}>
            <p>L'application fonctionne <strong className="text-white">même sans internet</strong>.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Un bandeau orange "Mode hors-ligne" s'affiche en haut</li>
              <li>Vos scans sont enregistrés localement dans une file d'attente</li>
              <li>Dès le retour du réseau, la synchronisation est automatique</li>
              <li>Un message "N scans synchronisés !" confirme la prise en compte</li>
            </ul>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-xs">
              <p className="text-yellow-300">Ne fermez pas l'application avant la synchronisation — restez connecté quelques secondes après le retour du réseau.</p>
            </div>
          </div>
        </section>

        {/* 5. Solde et retrait */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>5. Solde &amp; Retrait</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-4" style={{ background: '#1a1a1a' }}>
            <div>
              <p className="font-semibold text-white mb-1">Votre solde</p>
              <p>Affiché en or sur l'écran d'accueil. Mis à jour à chaque scan réussi.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Demander un retrait</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Cliquez sur <strong className="text-white">[Demander un retrait]</strong> (visible si solde &gt; 0)</li>
                <li>Choisissez l'opérateur : <strong>MTN</strong> ou <strong>Orange Money</strong></li>
                <li>Saisissez votre numéro mobile money</li>
                <li>Entrez le montant (minimum : 1 500 FCFA)</li>
                <li>Cliquez [DEMANDER LE RETRAIT]</li>
                <li>Le virement est effectué par L&amp;Lui sous 24-48h</li>
              </ol>
            </div>
          </div>
        </section>

        {/* 6. Rapport mensuel */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>6. Rapport mensuel</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3" style={{ background: '#1a1a1a' }}>
            <p>Accessible depuis le bouton <strong className="text-white">[Mon rapport du mois]</strong> sur l'accueil.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Nombre de scans dans le mois</li>
              <li>Total des commissions gagnées</li>
              <li>Détail de chaque réservation</li>
              <li>Téléchargeable en PDF (bouton en haut à droite)</li>
            </ul>
            <p className="text-xs text-gray-500">Naviguez entre les mois avec les flèches ← →</p>
          </div>
        </section>

        {/* 7. Badge confiance */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>7. Badge de confiance 🏆</h2>
          <div className="rounded-xl p-6 border border-gray-800 text-sm text-gray-300 space-y-3" style={{ background: '#1a1a1a' }}>
            <p>Le badge <strong className="text-white">🏆 De confiance</strong> est attribué aux prescripteurs les mieux notés.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Les clients peuvent noter votre service après chaque scan</li>
              <li>Note moyenne visible sous votre solde</li>
              <li>Le badge est accordé par L&amp;Lui selon votre historique</li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#C9A84C' }}>8. FAQ Prescripteur</h2>
          <div className="space-y-3">
            {[
              { q: 'Le QR ne scanne pas ?', a: 'Utilisez "Saisir le code manuellement" ou rapprochez-vous à 15-20 cm du QR. Vérifiez que l\'écran du client est bien lumineux.' },
              { q: 'Mon solde n\'a pas été mis à jour ?', a: 'Si vous étiez hors-ligne, attendez la synchronisation (bandeau vert). Si le problème persiste, contactez le support.' },
              { q: 'La session partenaire a expiré ?', a: 'Rescannez le QR du partenaire pour créer une nouvelle session de 2h. Une alerte s\'affiche à 15 min de l\'expiration.' },
              { q: 'Je n\'ai pas reçu mon virement ?', a: 'Les virements sont effectués sous 24-48h ouvrés. Vérifiez que votre numéro mobile money est correct dans la demande de retrait.' },
              { q: 'Comment récupérer mon PIN ?', a: 'Contactez L&Lui au +237 693 407 964 — WhatsApp ou appel.' },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl p-4 border border-gray-800" style={{ background: '#1a1a1a' }}>
                <p className="font-semibold text-white text-sm mb-1">Q : {q}</p>
                <p className="text-gray-300 text-sm">A : {a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div className="rounded-xl p-6 border" style={{ background: 'rgba(201,168,76,0.05)', borderColor: 'rgba(201,168,76,0.3)' }}>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#C9A84C' }}>Contact &amp; Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <div><span className="text-gray-500">WhatsApp / Appel</span><br /><span>+237 693 407 964</span></div>
            <div><span className="text-gray-500">Email</span><br /><span>support@l-et-lui.com</span></div>
            <div><span className="text-gray-500">Horaires</span><br /><span>Lun-Ven 9h-18h (Kribi)</span></div>
          </div>
        </div>

      </div>
    </div>
  )
}
