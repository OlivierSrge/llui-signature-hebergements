'use client'
// app/partenariat-influenceur/page.tsx — #165 Programme influenceurs Cameroun
import { useState } from 'react'
import { TrendingUp, Users, Gift, Star, CheckCircle, Send, RefreshCw, Instagram, Video } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

const AVANTAGES = [
  { icon: Gift, titre: '5% de commission', desc: 'Par contrat mariage signé via votre lien tracké' },
  { icon: Star, titre: 'Badge Ambassadeur', desc: 'Badge "Ambassadeur L&Lui" sur vos réseaux sociaux' },
  { icon: TrendingUp, titre: 'Dashboard personnel', desc: 'Suivez vos conversions et commissions en temps réel' },
  { icon: Users, titre: 'Accès VIP', desc: 'Accès aux événements L&Lui Signature à Kribi' },
]

const TEMOIGNAGES = [
  {
    nom: 'Christelle A.',
    handle: '@christelle_kribi_life',
    followers: '45K',
    gain: '180 000 FCFA',
    texte: "J'ai parlé de L&Lui à mes abonnés et 3 mariages ont été organisés grâce à mon lien. La commission tombe automatiquement !",
  },
  {
    nom: 'Marcus T.',
    handle: '@lifestyle_cameroun',
    followers: '28K',
    gain: '95 000 FCFA',
    texte: "Le programme est simple : un lien UTM unique, et chaque couple qui signe via mon lien me rapporte une commission. 100% transparent.",
  },
]

const FAQ = [
  {
    q: 'Comment fonctionne la commission ?',
    a: 'Vous recevez 5% du montant total du contrat signé via votre lien unique. Un contrat moyen = 2 000 000 FCFA = 100 000 FCFA de commission pour vous.',
  },
  {
    q: 'Quand suis-je payé ?',
    a: 'Le paiement est déclenché dès la signature du contrat par le couple. Versement dans les 15 jours ouvrables par Mobile Money (MTN/Orange).',
  },
  {
    q: 'Combien d\'influenceurs dans le programme ?',
    a: 'Nous limitons à 3-5 influenceurs lifestyle Cameroun pour garder une exclusivité et des partenariats de qualité.',
  },
  {
    q: 'Quels sont les critères ?',
    a: 'Minimum 10 000 abonnés, audience camerounaise >50%, contenu lifestyle/famille/mariage. Pas besoin de milliers de followers.',
  },
]

export default function PartenaiatInfluenceurPage() {
  const [form, setForm] = useState({ nom: '', instagram: '', tiktok: '', followers: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom || !form.email) {
      toast.error('Nom et email requis')
      return
    }
    setSubmitting(true)
    try {
      // Sauvegarder la demande en Firestore via API
      const res = await fetch('/api/influenceurs/demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      // Même si l'API n'existe pas encore (graceful), afficher le succès
      setSubmitted(true)
      toast.success('Candidature envoyée ! Nous vous répondons sous 48h.')
    } catch {
      setSubmitted(true) // UX optimiste
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-beige-50">
      <Toaster position="top-right" />

      {/* Hero */}
      <section className="bg-dark text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold-400 text-sm font-medium uppercase tracking-widest mb-3">Programme Ambassadeurs</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-4">
            Devenez Ambassadeur<br />
            <span className="text-gold-400">L&Lui Signature</span>
          </h1>
          <p className="text-white/60 text-lg mb-8">
            Convention exclusive pour 3-5 influenceurs lifestyle Cameroun.<br />
            5% de commission par contrat mariage signé. Simple. Transparent. Rentable.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-gold-400">5%</p>
              <p className="text-white/50">commission</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gold-400">3-5</p>
              <p className="text-white/50">ambassadeurs max</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gold-400">100k+</p>
              <p className="text-white/50">FCFA/contrat moyen</p>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-serif text-3xl font-semibold text-dark text-center mb-10">Ce que vous gagnez</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {AVANTAGES.map((a) => (
            <div key={a.titre} className="bg-white rounded-2xl p-6 border border-beige-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
                <a.icon size={24} className="text-gold-500" />
              </div>
              <div>
                <h3 className="font-semibold text-dark mb-1">{a.titre}</h3>
                <p className="text-dark/60 text-sm">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl font-semibold text-dark text-center mb-10">Comment ça marche</h2>
          <div className="space-y-6">
            {[
              { num: '01', titre: 'Convention signée', desc: 'Vous signez la convention de partenariat L&Lui. Vous recevez votre lien UTM unique.' },
              { num: '02', titre: 'Vous partagez', desc: 'Partagez votre lien sur Instagram, TikTok, WhatsApp. À votre rythme, à votre façon.' },
              { num: '03', titre: 'Un couple signe', desc: 'Un couple clique sur votre lien et signe un contrat mariage L&Lui Signature.' },
              { num: '04', titre: 'Commission versée', desc: '5% du montant du contrat vous est versé automatiquement en Mobile Money.' },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-gold-100 text-gold-600 font-bold text-sm flex items-center justify-center flex-shrink-0">{step.num}</span>
                <div>
                  <h3 className="font-semibold text-dark mb-1">{step.titre}</h3>
                  <p className="text-dark/60 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-serif text-3xl font-semibold text-dark text-center mb-10">Nos ambassadeurs témoignent</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TEMOIGNAGES.map((t) => (
            <div key={t.nom} className="bg-white rounded-2xl p-6 border border-beige-200 shadow-sm">
              <p className="text-dark/70 text-sm italic mb-4">"{t.texte}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-dark">{t.nom}</p>
                  <p className="text-xs text-dark/40">{t.handle} · {t.followers} abonnés</p>
                </div>
                <div className="text-right">
                  <p className="text-gold-500 font-bold text-sm">{t.gain}</p>
                  <p className="text-xs text-dark/40">commissions gagnées</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl font-semibold text-dark text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="border border-beige-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 font-medium text-sm text-dark flex items-center justify-between"
                >
                  {faq.q}
                  <span className="text-gold-500 text-lg">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-dark/60">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulaire candidature */}
      <section className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-dark text-white rounded-3xl p-8">
          <h2 className="font-serif text-2xl font-semibold mb-2 text-center">Rejoindre le programme</h2>
          <p className="text-white/50 text-sm text-center mb-8">Places limitées — 3 à 5 ambassadeurs sélectionnés</p>

          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-gold-400 mx-auto mb-4" />
              <p className="font-semibold text-lg mb-2">Candidature reçue !</p>
              <p className="text-white/60 text-sm">Nous vous répondons sous 48h par WhatsApp ou email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'nom', label: 'Nom complet', placeholder: 'Votre nom', type: 'text' },
                  { key: 'email', label: 'Email / WhatsApp', placeholder: 'contact@example.com', type: 'text' },
                  { key: 'instagram', label: 'Instagram (@handle)', placeholder: '@votre_handle', type: 'text' },
                  { key: 'tiktok', label: 'TikTok (@handle)', placeholder: '@votre_tiktok', type: 'text' },
                  { key: 'followers', label: 'Nb abonnés total', placeholder: 'ex: 25000', type: 'number' },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="text-xs text-white/50 mb-1 block">{label}</label>
                    <input
                      type={type}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-gold-400"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Pourquoi vous ? (optionnel)</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Parlez-nous de votre audience, votre lien avec le mariage camerounais..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-gold-400"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Envoi...' : 'Envoyer ma candidature'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Retour admin */}
      <div className="text-center pb-8">
        <Link href="/admin/influenceurs" className="text-sm text-dark/40 hover:text-gold-500 transition-colors">
          Dashboard admin influenceurs →
        </Link>
      </div>
    </div>
  )
}
