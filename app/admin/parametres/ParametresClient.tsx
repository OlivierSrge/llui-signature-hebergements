'use client'

import { useState } from 'react'
import { updateParametresPlateforme, type ParametresPlateforme } from '@/actions/parametres'
import { toast } from 'react-hot-toast'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function fmt(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

type Historique = { id: string; modifie_par: string; modifie_at: string; differences: string[] }

interface Props {
  params: ParametresPlateforme
  historique: Historique[]
}

export default function ParametresClient({ params, historique }: Props) {
  const [form, setForm] = useState({
    commission_partenaire_pct: params.commission_partenaire_pct,
    forfait_prescripteur_mensuel_fcfa: params.forfait_prescripteur_mensuel_fcfa,
    forfait_prescripteur_annuel_fcfa: params.forfait_prescripteur_annuel_fcfa,
    premium_prix_mensuel_fcfa: params.premium_prix_mensuel_fcfa ?? 10000,
    premium_prix_annuel_fcfa: params.premium_prix_annuel_fcfa ?? 100000,
    premium_nb_images: params.premium_nb_images ?? 5,
    premium_duree_jours: params.premium_duree_jours ?? 365,
    forfait_hotel_reservation_fcfa: params.forfait_hotel_reservation_fcfa ?? 2000,
    commission_mototaxi_fcfa: params.commission_mototaxi_fcfa,
    commission_commerciaux_pct: params.commission_commerciaux_pct,
    partage_llui_pct: params.partage_llui_pct,
    partage_commercial_pct: params.partage_commercial_pct,
    // Fidélité Stars
    fidelite_duree_pass_jours: params.fidelite_duree_pass_jours ?? 365,
    fidelite_remise_argent_pct: params.fidelite_remise_argent_pct ?? 5,
    fidelite_remise_or_pct: params.fidelite_remise_or_pct ?? 10,
    fidelite_remise_platine_pct: params.fidelite_remise_platine_pct ?? 20,
    fidelite_multiplicateur_argent: params.fidelite_multiplicateur_argent ?? 1.0,
    fidelite_multiplicateur_or: params.fidelite_multiplicateur_or ?? 1.5,
    fidelite_multiplicateur_platine: params.fidelite_multiplicateur_platine ?? 2.0,
    fidelite_seuil_novice: params.fidelite_seuil_novice ?? 0,
    fidelite_seuil_explorateur: params.fidelite_seuil_explorateur ?? 25000,
    fidelite_seuil_ambassadeur: params.fidelite_seuil_ambassadeur ?? 75000,
    fidelite_seuil_excellence: params.fidelite_seuil_excellence ?? 150000,
    fidelite_valeur_star_fcfa: params.fidelite_valeur_star_fcfa ?? 1,
  })
  const [otpTemplate, setOtpTemplate] = useState(params.fidelite_otp_template ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  function set(k: keyof typeof form, v: string) {
    const n = parseFloat(v) || 0
    setForm((f) => ({ ...f, [k]: n }))
  }

  function validate(): string[] {
    const e: string[] = []
    if (form.commission_partenaire_pct < 1 || form.commission_partenaire_pct > 30)
      e.push('Commission partenaire doit être entre 1 et 30 %')
    if (form.commission_mototaxi_fcfa <= 0)
      e.push('Commission moto-taxi doit être > 0 FCFA')
    if (form.forfait_prescripteur_mensuel_fcfa <= 0)
      e.push('Forfait mensuel doit être > 0 FCFA')
    if (form.forfait_prescripteur_annuel_fcfa <= 0)
      e.push('Forfait annuel doit être > 0 FCFA')
    if (form.commission_commerciaux_pct < 1 || form.commission_commerciaux_pct > 30)
      e.push('Commission commerciaux doit être entre 1 et 30 %')
    if (form.partage_llui_pct + form.partage_commercial_pct !== 100)
      e.push(`Part L&Lui (${form.partage_llui_pct}%) + Part commercial (${form.partage_commercial_pct}%) doit égaler 100%`)
    return e
  }

  async function handleSave() {
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    const res = await updateParametresPlateforme({ ...form, fidelite_otp_template: otpTemplate })
    setSaving(false)
    if (res.success) toast.success('✅ Paramètres enregistrés avec succès')
    else toast.error(res.error ?? 'Erreur lors de la sauvegarde')
  }

  const APERCU = 45000
  const moisAnnuel = form.forfait_prescripteur_mensuel_fcfa > 0
    ? (form.forfait_prescripteur_annuel_fcfa / form.forfait_prescripteur_mensuel_fcfa).toFixed(1)
    : '0'
  const economieMois = form.forfait_prescripteur_mensuel_fcfa > 0
    ? Math.round(12 - form.forfait_prescripteur_annuel_fcfa / form.forfait_prescripteur_mensuel_fcfa)
    : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Entête */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8]">
        <h1 className="text-2xl font-serif font-semibold text-[#1A1A1A]">⚙️ Paramètres Globaux</h1>
        <p className="text-sm text-[#1A1A1A]/50 mt-1">L&Lui Signature Hébergements</p>
        {params.modifie_at && (
          <p className="text-xs text-[#1A1A1A]/40 mt-2">
            Dernière modification : {fmt(params.modifie_at)} — par {params.modifie_par}
          </p>
        )}
      </div>

      {/* Canal 1 */}
      <Section title="Canal 1 — Partenaires Hébergeurs">
        <Label>Commission sur chaque réservation</Label>
        <InputRow>
          <Input value={form.commission_partenaire_pct} onChange={(v) => set('commission_partenaire_pct', v)} suffix="%" />
        </InputRow>
        <Apercu label={`Aperçu sur séjour ${formatFCFA(APERCU)}`}
          lines={[`→ L&Lui reçoit : ${formatFCFA(APERCU * form.commission_partenaire_pct / 100)}`]} />
      </Section>

      {/* Canal 2 */}
      <Section title="Canal 2 — Prescripteurs Partenaires">
        <p className="text-xs text-[#1A1A1A]/50 -mt-1 mb-3">Hôtels, restaurants, lieux publics</p>
        <Label>Forfait mensuel</Label>
        <InputRow>
          <Input value={form.forfait_prescripteur_mensuel_fcfa} onChange={(v) => set('forfait_prescripteur_mensuel_fcfa', v)} suffix="FCFA/mois" />
        </InputRow>
        <Label>Forfait annuel</Label>
        <InputRow>
          <Input value={form.forfait_prescripteur_annuel_fcfa} onChange={(v) => set('forfait_prescripteur_annuel_fcfa', v)} suffix="FCFA/an" />
        </InputRow>
        <Apercu label="Rapport annuel / mensuel"
          lines={[`→ Forfait annuel = ${moisAnnuel} mois — économie de ${economieMois} mois`]} />

        <div className="border-t border-[#F5F0E8] mt-4 pt-4">
          <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest mb-3">― Hôtels &amp; Résidences partenaires ―</p>
          <Label>Commission si client réserve un hébergement L&amp;Lui</Label>
          <InputRow>
            <Input value={form.forfait_hotel_reservation_fcfa} onChange={(v) => set('forfait_hotel_reservation_fcfa', v)} suffix="FCFA par réservation confirmée" />
          </InputRow>
          <p className="text-xs text-[#1A1A1A]/40 -mt-1">Le client a scanné le QR de l&apos;hôtel et réserve ensuite un hébergement L&amp;Lui.</p>
        </div>
      </Section>

      {/* Premium Vitrine */}
      <Section title="⭐ Abonnement Premium Vitrine (Canal 2)">
        <p className="text-xs text-[#1A1A1A]/50 -mt-1 mb-3">Conditions de souscription pour l&apos;abonnement Premium (carrousel publicitaire)</p>
        <Label>Prix mensuel Premium</Label>
        <InputRow>
          <Input value={form.premium_prix_mensuel_fcfa} onChange={(v) => set('premium_prix_mensuel_fcfa', v)} suffix="FCFA/mois" />
        </InputRow>
        <Label>Prix annuel Premium</Label>
        <InputRow>
          <Input value={form.premium_prix_annuel_fcfa} onChange={(v) => set('premium_prix_annuel_fcfa', v)} suffix="FCFA/an" />
        </InputRow>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nb images autorisées (Premium)</Label>
            <InputRow>
              <Input value={form.premium_nb_images} onChange={(v) => set('premium_nb_images', v)} suffix="images" />
            </InputRow>
          </div>
          <div>
            <Label>Durée abonnement</Label>
            <InputRow>
              <Input value={form.premium_duree_jours} onChange={(v) => set('premium_duree_jours', v)} suffix="jours" />
            </InputRow>
          </div>
        </div>
        <Apercu label="Récapitulatif offre Premium"
          lines={[
            `Free : 1 image enseigne uniquement`,
            `Premium : ${form.premium_nb_images} visuels carrousel pendant ${form.premium_duree_jours} jours`,
            `Tarif : ${formatFCFA(form.premium_prix_mensuel_fcfa)}/mois ou ${formatFCFA(form.premium_prix_annuel_fcfa)}/an`,
          ]} />
      </Section>

      {/* Canal 3 */}
      <Section title="Canal 3 — Moto-taxis Prescripteurs">
        <Label>Commission par course confirmée</Label>
        <InputRow>
          <Input value={form.commission_mototaxi_fcfa} onChange={(v) => set('commission_mototaxi_fcfa', v)} suffix="FCFA/client" />
        </InputRow>
        <Apercu label="Aperçu sur 10 courses"
          lines={[`→ Moto-taxi reçoit : ${formatFCFA(form.commission_mototaxi_fcfa * 10)}`]} />
      </Section>

      {/* Canal 4 */}
      <Section title="Canal 4 — Commerciaux Partenaires">
        <Label>Commission sur séjour apporté</Label>
        <InputRow>
          <Input value={form.commission_commerciaux_pct} onChange={(v) => set('commission_commerciaux_pct', v)} suffix="%" />
        </InputRow>
        <Label>Répartition de cette commission</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <p className="text-xs text-[#1A1A1A]/60 mb-1">Part L&Lui Signature</p>
            <Input value={form.partage_llui_pct} onChange={(v) => {
              const n = parseFloat(v) || 0
              setForm((f) => ({ ...f, partage_llui_pct: n, partage_commercial_pct: 100 - n }))
            }} suffix="%" />
          </div>
          <div>
            <p className="text-xs text-[#1A1A1A]/60 mb-1">Part Commercial</p>
            <Input value={form.partage_commercial_pct} onChange={(v) => {
              const n = parseFloat(v) || 0
              setForm((f) => ({ ...f, partage_commercial_pct: n, partage_llui_pct: 100 - n }))
            }} suffix="%" />
          </div>
        </div>
        <p className={`text-xs mt-2 font-medium ${form.partage_llui_pct + form.partage_commercial_pct === 100 ? 'text-green-600' : 'text-red-500'}`}>
          Total : {form.partage_llui_pct + form.partage_commercial_pct}%
          {form.partage_llui_pct + form.partage_commercial_pct === 100 ? ' ✅' : ' ❌ — doit égaler 100%'}
        </p>
        <Apercu label={`Aperçu sur séjour ${formatFCFA(APERCU)}`} lines={[
          `Commission totale  : ${formatFCFA(APERCU * form.commission_commerciaux_pct / 100)}`,
          `→ L&Lui reçoit     : ${formatFCFA(APERCU * form.commission_commerciaux_pct / 100 * form.partage_llui_pct / 100)}`,
          `→ Commercial reçoit: ${formatFCFA(APERCU * form.commission_commerciaux_pct / 100 * form.partage_commercial_pct / 100)}`,
        ]} />
      </Section>

      {/* ─── Moteur de fidélité L&Lui Stars ─── */}
      <Section title="⭐ Moteur de fidélité L&Lui Stars">
        <p className="text-xs text-[#1A1A1A]/50 -mt-1 mb-4">
          Programme de points pour les clients des partenaires prescripteurs Canal 2.
        </p>

        {/* Statuts — Seuils */}
        <p className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Seuils de statut (stars cumulées à vie)</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {([
            ['Novice (départ)', 'fidelite_seuil_novice'],
            ['Explorateur', 'fidelite_seuil_explorateur'],
            ['Ambassadeur', 'fidelite_seuil_ambassadeur'],
            ['Excellence', 'fidelite_seuil_excellence'],
          ] as [string, keyof typeof form][]).map(([label, key]) => (
            <div key={key}>
              <p className="text-xs text-[#1A1A1A]/60 mb-1">{label}</p>
              <Input value={form[key]} onChange={(v) => set(key, v)} suffix="stars" />
            </div>
          ))}
        </div>

        {/* Remises */}
        <p className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Remises boutique par niveau</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            ['Pass Argent', 'fidelite_remise_argent_pct'],
            ['Pass Or', 'fidelite_remise_or_pct'],
            ['Pass Platine', 'fidelite_remise_platine_pct'],
          ] as [string, keyof typeof form][]).map(([label, key]) => (
            <div key={key}>
              <p className="text-xs text-[#1A1A1A]/60 mb-1">{label}</p>
              <Input value={form[key]} onChange={(v) => set(key, v)} suffix="%" />
            </div>
          ))}
        </div>

        {/* Multiplicateurs */}
        <p className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Multiplicateurs de stars</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            ['Argent', 'fidelite_multiplicateur_argent'],
            ['Or', 'fidelite_multiplicateur_or'],
            ['Platine', 'fidelite_multiplicateur_platine'],
          ] as [string, keyof typeof form][]).map(([label, key]) => (
            <div key={key}>
              <p className="text-xs text-[#1A1A1A]/60 mb-1">{label}</p>
              <Input value={form[key]} onChange={(v) => set(key, v)} suffix="×" />
            </div>
          ))}
        </div>

        {/* Valeur star + durée pass */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label>Valeur d&apos;1 star (provision partenaire)</Label>
            <InputRow>
              <Input value={form.fidelite_valeur_star_fcfa} onChange={(v) => set('fidelite_valeur_star_fcfa', v)} suffix="FCFA/star" />
            </InputRow>
          </div>
          <div>
            <Label>Durée de validité du pass</Label>
            <InputRow>
              <Input value={form.fidelite_duree_pass_jours} onChange={(v) => set('fidelite_duree_pass_jours', v)} suffix="jours" />
            </InputRow>
          </div>
        </div>

        {/* Aperçu calcul */}
        <Apercu label="Aperçu — achat 5 000 FCFA (Pass Or)" lines={[
          `Remise : -${formatFCFA(5000 * form.fidelite_remise_or_pct / 100)} (${form.fidelite_remise_or_pct}%)`,
          `Montant net : ${formatFCFA(5000 - 5000 * form.fidelite_remise_or_pct / 100)}`,
          `Stars : ${Math.round((5000 * (1 - form.fidelite_remise_or_pct / 100) / 100) * form.fidelite_multiplicateur_or)} ⭐ (${form.fidelite_multiplicateur_or}×)`,
        ]} />

        {/* Template OTP */}
        <div className="mt-4">
          <Label>Template message OTP WhatsApp</Label>
          <p className="text-[10px] text-[#1A1A1A]/40 mb-2">
            Placeholders : <code>{'{otp}'}</code> (code), <code>{'{minutes}'}</code> (durée validité). Laisser vide pour utiliser le message par défaut.
          </p>
          <textarea
            value={otpTemplate}
            onChange={(e) => setOtpTemplate(e.target.value)}
            rows={4}
            placeholder="🔐 Votre code L&Lui Stars : {otp} — Valide {minutes} minutes."
            className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C] bg-[#F5F0E8]/30 resize-none"
          />
        </div>
      </Section>

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          {errors.map((e, i) => <p key={i} className="text-sm text-red-600">• {e}</p>)}
        </div>
      )}

      {/* Bouton save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 bg-[#C9A84C] text-white font-semibold rounded-xl hover:bg-[#b8963e] transition-colors disabled:opacity-60 text-base">
        {saving ? 'Enregistrement...' : '💾 Enregistrer tous les paramètres'}
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700">
          ⚠️ Ces taux s'appliquent immédiatement à toutes les nouvelles transactions.
          Les transactions passées ne sont pas affectées.
        </p>
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <Section title="📋 Historique des modifications">
          <div className="space-y-3">
            {historique.map((h) => (
              <div key={h.id} className="border-l-2 border-[#C9A84C] pl-3 py-1">
                <p className="text-xs font-medium text-[#1A1A1A]">{fmt(h.modifie_at)} — {h.modifie_par}</p>
                {h.differences.map((d, i) => (
                  <p key={i} className="text-xs text-[#1A1A1A]/60">• {d}</p>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8]">
      <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4 pb-2 border-b border-[#F5F0E8]">{title}</h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#1A1A1A]/70 mb-1">{children}</p>
}

function InputRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-3">{children}</div>
}

function Input({ value, onChange, suffix }: { value: number; onChange: (v: string) => void; suffix: string }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-32 border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm font-medium text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C] bg-[#F5F0E8]/30" />
      <span className="text-sm text-[#1A1A1A]/60">{suffix}</span>
    </div>
  )
}

function Apercu({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="bg-[#F5F0E8]/50 rounded-lg p-3 mt-2">
      <p className="text-xs text-[#1A1A1A]/50 mb-1">{label} :</p>
      {lines.map((l, i) => <p key={i} className="text-sm font-medium text-[#C9A84C]">{l}</p>)}
      <p className="text-[10px] text-[#1A1A1A]/30 mt-1">(mis à jour en temps réel)</p>
    </div>
  )
}
