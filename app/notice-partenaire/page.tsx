// app/notice-partenaire/page.tsx — Guide complet partenaire prescripteur L&Lui Signature
// Server Component statique — pas de 'use client'

export const metadata = {
  title: 'Guide Partenaire Prescripteur — L&Lui Signature',
  description: 'Tout ce qu\'il faut savoir pour tirer le maximum de votre partenariat L&Lui Signature : Stars, commissions, dashboard, visibilité.',
}

const GOLD = '#C9A84C'
const DARK = '#1A1A1A'
const BEIGE = '#F5F0E8'

export default function NoticePartenairePage() {
  return (
    <div style={{ background: BEIGE, minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* ───── HEADER ───── */}
      <div style={{ background: DARK, color: 'white', padding: '40px 24px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>
          L&amp;Lui Signature · Kribi
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
          📘 Guide Partenaire Prescripteur
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Tout ce qu&apos;il faut savoir pour maximiser votre partenariat
        </p>
      </div>

      {/* ───── TABLE DES MATIÈRES ───── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px' }}>
            Table des matières
          </p>
          <div style={{ display: 'grid', gap: 4 }}>
            {[
              ['1', "L'écosystème L&Lui"],
              ['2', 'Votre rôle de prescripteur'],
              ['3', 'Le programme Stars : mécanique'],
              ['4', 'Votre tableau de bord'],
              ['5', 'Configurer vos avantages Stars'],
              ['6', 'Votre visibilité digitale'],
              ['7', 'Revenus & commissions'],
              ['8', 'Programme Fast Start'],
              ['9', 'Bonnes pratiques'],
              ['10', 'Sécurité'],
              ['11', 'Support'],
            ].map(([num, label]) => (
              <a key={num} href={`#s${num}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '6px 8px', borderRadius: 8, color: DARK }}>
                <span style={{ width: 24, height: 24, background: GOLD, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {num}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>

        {/* ───── SECTION 1 ───── */}
        <section id="s1" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="1" title="L'écosystème L&Lui" emoji="🌍" />
          <p style={bodyText}>
            L&amp;Lui Signature est une plateforme de conciergerie nuptiale basée à Kribi. Trois canaux composent l&apos;écosystème :
          </p>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <InfoCard
              icon="💍"
              title="Portail couples"
              desc="Les futurs mariés réservent hébergements, navettes, séjours et accèdent à leur espace personnalisé."
            />
            <InfoCard
              icon="🛍️"
              title="Boutique Netlify"
              desc="Site e-commerce externe. Les clients utilisent un code affilié pour bénéficier de réductions sur des produits L&Lui."
            />
            <InfoCard
              icon="⭐"
              title="Programme L&Lui Stars"
              desc="Programme de fidélité universel : les clients accumulent des étoiles chez tous les partenaires et les dépensent en remises ou cadeaux."
            />
          </div>
        </section>

        {/* ───── SECTION 2 ───── */}
        <section id="s2" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="2" title="Votre rôle de prescripteur" emoji="🤝" />
          <p style={bodyText}>
            En tant que partenaire prescripteur, vous jouez trois rôles complémentaires :
          </p>
          <ol style={{ paddingLeft: 20, marginTop: 12, display: 'grid', gap: 12 }}>
            <li style={bodyText}>
              <strong>Recommander</strong> — Orientez vos clients vers les services L&amp;Lui (hébergements, boutique). Chaque recommandation génère une commission traçable.
            </li>
            <li style={bodyText}>
              <strong>Encaisser les Stars</strong> — Via votre terminal Stars (onglet ⭐ de votre dashboard), vous validez les transactions de vos clients. Ils gagnent des étoiles, vous gagnez une commission.
            </li>
            <li style={bodyText}>
              <strong>Visibilité digitale</strong> — Votre établissement apparaît sur la carte interactive L&amp;Lui Stars, visible par tous les clients de la plateforme.
            </li>
          </ol>
        </section>

        {/* ───── SECTION 3 ───── */}
        <section id="s3" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="3" title="Le programme Stars : mécanique" emoji="⭐" />

          <div style={{ background: '#FFFBF0', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #C9A84C33' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: GOLD, margin: 0, textAlign: 'center' }}>
              1 ⭐ = 100 FCFA dépensé
            </p>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0', textAlign: 'center' }}>
              Le client gagne 1 étoile pour chaque tranche de 100 FCFA
            </p>
          </div>

          <p style={{ ...bodyText, marginBottom: 12 }}>Les 6 grades du programme :</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: DARK, color: 'white' }}>
                  <th style={th}>Grade</th>
                  <th style={th}>Seuil ⭐ historique</th>
                  <th style={th}>Remise min.</th>
                  <th style={th}>Multiplicateur</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['🌱 START', '0 – 999', '2%', '×1.0'],
                  ['🔵 BRONZE', '1 000 – 4 999', '3%', '×1.0'],
                  ['⚪ ARGENT', '5 000 – 14 999', '5%', '×1.2'],
                  ['🟡 OR', '15 000 – 49 999', '8%', '×1.5'],
                  ['💎 PLATINE', '50 000 – 149 999', '12%', '×2.0'],
                  ['👑 DIAMANT', '≥ 150 000', '15%', '×3.0'],
                ].map(([grade, seuil, remise, mult], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#FAFAFA' : 'white' }}>
                    <td style={td}>{grade}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{seuil}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#16A34A', fontWeight: 700 }}>{remise}</td>
                    <td style={{ ...td, textAlign: 'center', color: GOLD, fontWeight: 700 }}>{mult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#F0FFF4', borderRadius: 10, padding: 12, marginTop: 16, border: '1px solid #86EFAC' }}>
            <p style={{ fontSize: 13, color: '#15803D', margin: 0 }}>
              <strong>Planchers de remise</strong> — Même si votre remise configurée est inférieure, le client bénéficie toujours du plancher de son grade. Exemple : un client OR reçoit au minimum 8% même si votre remise par défaut est de 5%.
            </p>
          </div>
        </section>

        {/* ───── SECTION 4 ───── */}
        <section id="s4" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="4" title="Votre tableau de bord" emoji="📊" />
          <p style={bodyText}>Votre dashboard est accessible sur votre lien personnel. Il contient 6 onglets :</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {[
              ['📊 Stats', 'Scans, codes générés, clients uniques, CA boutique, CA hébergements, commissions totales. Bouton Actualiser pour données en temps réel.'],
              ['⭐ Stars', 'Terminal d\'encaissement mobile. Recherchez un client par téléphone, calculez sa remise, validez la transaction. Solde provision visible en temps réel.'],
              ['🎁 Réduction', 'Configurez le taux de remise Stars proposé à vos clients (dans les limites de votre grade).'],
              ['📱 Scan QR', 'Scannez le QR code d\'un client Stars pour initier une transaction rapidement.'],
              ['🖼️ Vitrine', 'Gérez votre photo d\'établissement et votre carrousel d\'images (plan Premium).'],
              ['🔑 Forfait', 'Détails de votre abonnement (dates, montant, jours restants). Lien de renouvellement WhatsApp.'],
            ].map(([tab, desc]) => (
              <div key={tab as string} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #F5F0E8' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: DARK, minWidth: 110 }}>{tab}</span>
                <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ───── SECTION 5 ───── */}
        <section id="s5" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="5" title="Configurer vos avantages Stars" emoji="🎁" />
          <p style={bodyText}>
            Depuis l&apos;interface admin (bouton ⭐ dans le tableau de bord admin), configurez jusqu&apos;à 20 avantages actifs. Ces avantages s&apos;affichent dans la carte interactive et sur les QR codes de vos clients.
          </p>
          <p style={{ ...bodyText, marginTop: 12 }}>Les 7 catégories disponibles :</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 12 }}>
            {[
              ['🍽️', 'Restauration', 'Boissons offertes, dessert, café…'],
              ['🏨', 'Hébergement', 'Surclassement, check-out tardif…'],
              ['💆', 'Bien-être', 'Massage, accès spa, soins…'],
              ['🎉', 'Événements', 'Anniversaire, dégustation privée…'],
              ['🚌', 'Transport', 'Navette offerte, parking…'],
              ['🛍️', 'Shopping', 'Remise boutique, cadeau…'],
              ['⭐', 'Stars Premium', 'Bonus étoiles, accès prioritaire…'],
            ].map(([emoji, cat, ex]) => (
              <div key={cat} style={{ background: BEIGE, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 18, margin: '0 0 4px' }}>{emoji}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: DARK, margin: '0 0 2px' }}>{cat}</p>
                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{ex}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFBF0', borderRadius: 10, padding: 12, marginTop: 16, border: '1px solid #C9A84C33' }}>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
              <strong>Astuce</strong> — Chaque avantage peut être limité à un grade minimum. Exemple : réservez votre meilleure table aux clients OR et plus.
            </p>
          </div>
        </section>

        {/* ───── SECTION 6 ───── */}
        <section id="s6" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="6" title="Votre visibilité digitale" emoji="🗺️" />
          <div style={{ display: 'grid', gap: 12 }}>
            <InfoCard
              icon="🗺️"
              title="Carte interactive L&Lui Stars"
              desc="Votre établissement est épinglé sur la carte visible sur /sejour/[code]. Les clients peuvent cliquer pour voir vos avantages et initier un scan QR."
            />
            <InfoCard
              icon="📱"
              title="QR Code partenaire"
              desc="Votre QR code unique est disponible en téléchargement depuis votre dashboard. Imprimez-le en A4, A5 ou format carte de visite et affichez-le à l'entrée."
            />
            <InfoCard
              icon="🌐"
              title="Profil réseau"
              desc="Votre photo d'établissement et vos avantages Stars apparaissent sur tous les supports numériques L&Lui (pages séjour, cartes, fiches partenaires)."
            />
          </div>
        </section>

        {/* ───── SECTION 7 ───── */}
        <section id="s7" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="7" title="Revenus & commissions" emoji="💰" />

          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            {[
              { source: '🛍️ Boutique (affilié actif)', taux: '10%', base: 'Montant de la vente', note: '5% si remise > 15%' },
              { source: '💍 Mariages (recommandé)', taux: '1,2%', base: 'CA hébergements', note: '0,5% si remise > 15%' },
              { source: '🏨 Hébergements L&Lui', taux: '2%', base: 'CA réservation', note: 'Canal 1 direct' },
            ].map((row) => (
              <div key={row.source} style={{ background: BEIGE, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: DARK, margin: '0 0 2px' }}>{row.source}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{row.base} · {row.note}</p>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 800, color: GOLD, flexShrink: 0 }}>{row.taux}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: DARK, borderRadius: 12, padding: 16, color: 'white' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: '0 0 8px' }}>💼 Votre portefeuille de commissions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: GOLD, margin: 0 }}>70%</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Versement cash</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#60A5FA', margin: 0 }}>30%</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Crédits Stars</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '10px 0 0', textAlign: 'center' }}>
              Les crédits Stars alimentent votre solde provision pour les remises clients
            </p>
          </div>
        </section>

        {/* ───── SECTION 8 ───── */}
        <section id="s8" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="8" title="Programme Fast Start" emoji="🚀" />
          <p style={bodyText}>
            Atteignez ces objectifs dans les 90 premiers jours pour débloquer des bonus de démarrage :
          </p>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {[
              { day: 'J30', target: '80 recommandations', reward: '30 000 FCFA', color: '#16A34A' },
              { day: 'J60', target: '200 recommandations', reward: '80 000 FCFA', color: GOLD },
              { day: 'J90', target: '450 recommandations', reward: '200 000 FCFA', color: '#7C3AED' },
            ].map((item) => (
              <div key={item.day} style={{ display: 'flex', alignItems: 'center', gap: 14, background: BEIGE, borderRadius: 12, padding: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{item.day}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: DARK, margin: 0 }}>{item.target}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Bonus : {item.reward}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.reward}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
            * Le comptage est basé sur les transactions Stars validées + codes boutique utilisés.
          </p>
        </section>

        {/* ───── SECTION 9 ───── */}
        <section id="s9" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="9" title="Bonnes pratiques" emoji="💡" />
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['📍', 'Affichez votre QR code à l\'entrée et à l\'accueil', 'Un client qui voit le QR est 3× plus susceptible d\'adhérer au programme Stars.'],
              ['📸', 'Maintenez votre photo et votre carrousel à jour', 'Les profils avec photo reçoivent 5× plus de clics sur la carte interactive.'],
              ['🎁', 'Configurez au moins 5 avantages actifs', 'Les établissements avec 5+ avantages sont mis en avant dans les résultats de recherche.'],
              ['💬', 'Parlez de L&Lui Stars à chaque client', 'Un mot à la fin du service suffit : "Avez-vous votre pass Stars ? Scannez ici pour gagner des étoiles."'],
              ['🔄', 'Actualisez vos stats quotidiennement', 'Le suivi régulier vous permet d\'identifier vos clients les plus fidèles et d\'optimiser vos avantages.'],
            ].map(([icon, title, desc]) => (
              <div key={title as string} style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: DARK, margin: '0 0 2px' }}>{title}</p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───── SECTION 10 ───── */}
        <section id="s10" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="10" title="Sécurité" emoji="🔐" />
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              ['⏱️ Expiration 5 minutes', 'Chaque QR client expire 5 minutes après génération. Validez la transaction immédiatement.'],
              ['🔑 Usage unique', 'Un token QR ne peut être utilisé qu\'une seule fois. Après validation, il est automatiquement invalidé.'],
              ['✅ Validation active', 'Seuls les tokens générés par des clients actifs sont acceptés. Les tokens expirés sont rejetés automatiquement.'],
              ['🚦 Limite 3 tx/jour', 'Un client ne peut valider que 3 transactions Stars par jour chez le même partenaire. Limite anti-abus.'],
            ].map(([title, desc]) => (
              <div key={title as string} style={{ display: 'flex', gap: 12, padding: 12, background: BEIGE, borderRadius: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: DARK, minWidth: 140 }}>{title}</span>
                <span style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ───── SECTION 11 ───── */}
        <section id="s11" style={{ background: DARK, borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SectionHeader num="11" title="Support" emoji="💬" color="white" goldNum />
          <p style={{ ...bodyText, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
            L&apos;équipe L&amp;Lui Signature est disponible 7j/7 pour vous accompagner :
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <a
              href="https://wa.me/237000000000"
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#25D366', borderRadius: 12, padding: 14, textDecoration: 'none' }}
            >
              <span style={{ fontSize: 24 }}>💬</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>WhatsApp Support</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Réponse sous 2h en journée</p>
              </div>
            </a>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: '0 0 4px' }}>📋 Ressources utiles</p>
              <div style={{ display: 'grid', gap: 6 }}>
                <a href="/stars/notice" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                  ⭐ Guide client — Programme Stars →
                </a>
                <a href="/sejour" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                  🏨 Tester la page séjour client →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ───── FOOTER ───── */}
        <div style={{ textAlign: 'center', paddingBottom: 32 }}>
          <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
            © 2026 L&amp;Lui Signature · Kribi, Cameroun
          </p>
          <p style={{ fontSize: 11, color: '#BBB', margin: '4px 0 0' }}>
            Ce guide est mis à jour régulièrement. Dernière révision : avril 2026.
          </p>
        </div>

      </div>
    </div>
  )
}

// ─── Composants utilitaires ───────────────────────────────────────────

function SectionHeader({ num, title, emoji, color = DARK, goldNum = false }: {
  num: string; title: string; emoji: string; color?: string; goldNum?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{
        width: 32, height: 32, background: goldNum ? GOLD : GOLD,
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0,
      }}>
        {num}
      </span>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <h2 style={{ fontSize: 18, fontWeight: 800, color, margin: 0, lineHeight: 1.2 }}>{title}</h2>
    </div>
  )
}

function InfoCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, background: BEIGE, borderRadius: 12, padding: 14 }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: '0 0 4px' }}>{title}</p>
        <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )
}

const bodyText: React.CSSProperties = {
  fontSize: 14,
  color: '#444',
  lineHeight: 1.6,
  margin: 0,
}

const th: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  borderBottom: '1px solid #F0F0F0',
}
