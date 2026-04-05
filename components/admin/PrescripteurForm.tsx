'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Eye, EyeOff, Bike, RefreshCw, CheckCircle2, Copy } from 'lucide-react'
import { creerPrescripteur, modifierPrescripteur } from '@/actions/prescripteurs'
import type { Prescripteur, PrescripteurType } from '@/actions/prescripteurs'

interface Accommodation {
  id: string
  name: string
}

interface Props {
  prescripteur?: Prescripteur
  types: PrescripteurType[]
  hebergements: Accommodation[]
}

const genererPin = () => Math.floor(1000 + Math.random() * 9000).toString()

export default function PrescripteurForm({ prescripteur, types, hebergements }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(true) // visible par défaut pour que l'admin puisse lire le PIN

  const isEdit = !!prescripteur

  const defaultType = types[0]?.id ?? 'moto-taxi'
  const defaultCommission = types[0]?.commission_fcfa ?? 1500

  const [selectedType, setSelectedType] = useState(prescripteur?.type ?? defaultType)
  const [commission, setCommission] = useState(prescripteur?.commission_fcfa ?? defaultCommission)
  const [assignes, setAssignes] = useState<string[]>(prescripteur?.hebergements_assignes ?? [])
  // PIN : auto-généré pour la création, vide pour la modification
  const [pinValue, setPinValue] = useState<string>(() => isEdit ? '' : genererPin())
  // Après création réussie : afficher l'écran de confirmation avec le PIN
  const [createdInfo, setCreatedInfo] = useState<{ nom: string; pin: string } | null>(null)
  const [pinCopied, setPinCopied] = useState(false)

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId)
    const t = types.find((t) => t.id === typeId)
    if (t && !isEdit) setCommission(t.commission_fcfa)
  }

  const toggleAssigne = (id: string) => {
    setAssignes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const copyPin = async () => {
    if (!createdInfo) return
    await navigator.clipboard.writeText(createdInfo.pin).catch(() => {})
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    const nom_complet = (fd.get('nom_complet') as string).trim()
    const telephone   = (fd.get('telephone') as string).trim()
    const statut      = (fd.get('statut') as 'actif' | 'suspendu')
    const pin         = pinValue.trim()

    if (!nom_complet) { setError('Le nom complet est requis'); return }
    if (!telephone)   { setError('Le téléphone est requis'); return }
    if (!isEdit && pin.length !== 4) { setError('Le PIN doit avoir 4 chiffres'); return }
    if (!isEdit && !/^\d{4}$/.test(pin)) { setError('Le PIN doit être composé de 4 chiffres'); return }

    const telClean = telephone.replace(/[\s\-().]/g, '')
    if (!/^(\+237|237)?[26]\d{8}$/.test(telClean)) {
      setError('Format téléphone invalide (ex: +237 612345678)')
      return
    }

    startTransition(async () => {
      if (isEdit) {
        const updateData: Record<string, unknown> = {
          nom_complet, telephone, type: selectedType,
          commission_fcfa: commission, hebergements_assignes: assignes, statut,
        }
        if (pin && pin.length === 4) updateData.pin = pin
        const res = await modifierPrescripteur(prescripteur!.uid, updateData as any)
        if (!res.success) { setError(res.error ?? 'Erreur'); return }
        router.push(`/admin/prescripteurs/${prescripteur!.uid}`)
      } else {
        const res = await creerPrescripteur({
          nom_complet, telephone, type: selectedType,
          pin, commission_fcfa: commission,
          hebergements_assignes: assignes, statut, created_by: 'admin',
        })
        if (!res.success) { setError(res.error ?? 'Erreur'); return }
        // Afficher l'écran de confirmation avec le PIN en clair
        setCreatedInfo({ nom: nom_complet, pin })
      }
    })
  }

  // ── Écran de confirmation post-création ──────────────────────────────────
  if (createdInfo) {
    return (
      <div className="max-w-md space-y-6">
        <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
          <CheckCircle2 size={28} className="shrink-0 text-green-500" />
          <div>
            <p className="font-semibold text-base">Prescripteur créé !</p>
            <p className="text-sm text-green-600">{createdInfo.nom} — SMS WhatsApp envoyé</p>
          </div>
        </div>

        {/* Encart PIN à communiquer */}
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            📋 Communiquez ce PIN au prescripteur
          </p>
          <div className="flex items-center justify-center gap-3">
            <p className="font-mono text-5xl font-bold text-amber-900 tracking-[0.3em]">
              {createdInfo.pin}
            </p>
            <button
              onClick={copyPin}
              className="p-2 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800 transition-colors"
              title="Copier le PIN"
            >
              <Copy size={18} />
            </button>
          </div>
          {pinCopied && <p className="text-xs text-amber-600">PIN copié !</p>}
          <p className="text-xs text-amber-700 mt-1">
            Ce PIN NE sera plus affiché après cette page.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/prescripteurs')}
            className="btn-primary flex-1"
          >
            Voir tous les prescripteurs
          </button>
          <button
            onClick={() => {
              setCreatedInfo(null)
              setPinValue(genererPin())
              setAssignes([])
              setSelectedType(defaultType)
              setCommission(defaultCommission)
            }}
            className="px-4 py-2.5 rounded-xl border border-dark/20 text-sm text-dark/60 hover:bg-dark/5 transition-colors"
          >
            Nouveau prescripteur
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Nom complet */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">
          Nom complet <span className="text-red-500">*</span>
        </label>
        <input
          name="nom_complet"
          type="text"
          defaultValue={prescripteur?.nom_complet}
          required
          placeholder="ex: Jean-Pierre Mbarga"
          className="w-full border border-dark/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
      </div>

      {/* Téléphone */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">
          Téléphone <span className="text-red-500">*</span>
        </label>
        <input
          name="telephone"
          type="tel"
          defaultValue={prescripteur?.telephone}
          required
          placeholder="+237 612 345 678"
          className="w-full border border-dark/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        <p className="text-xs text-dark/40 mt-1">Format : +237 6XXXXXXXX — reçoit le SMS WhatsApp d&apos;activation</p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">
          Type de prescripteur <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTypeChange(t.id)}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                selectedType === t.id
                  ? 'text-white border-transparent'
                  : 'border-dark/20 text-dark/60 hover:border-dark/40'
              }`}
              style={selectedType === t.id ? { backgroundColor: t.couleur_badge, borderColor: t.couleur_badge } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* PIN */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">
          PIN 4 chiffres {!isEdit && <span className="text-red-500">*</span>}
          {isEdit && <span className="text-dark/40 font-normal"> (laisser vide pour ne pas changer)</span>}
        </label>
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1">
            <input
              name="pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4 chiffres"
              required={!isEdit}
              className="w-full border border-dark/20 rounded-xl px-4 py-3 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono tracking-[0.4em] text-lg"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 hover:text-dark transition-colors"
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!isEdit && (
            <button
              type="button"
              onClick={() => setPinValue(genererPin())}
              className="px-4 py-2.5 rounded-xl border border-dark/20 text-sm text-dark/60 hover:bg-dark/5 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Générer un nouveau PIN"
            >
              <RefreshCw size={14} />
              Régénérer
            </button>
          )}
        </div>
        <p className="text-xs text-dark/40 mt-1">
          {isEdit
            ? 'Stocké en SHA-256 — jamais visible après validation'
            : 'PIN auto-généré — affiché une seule fois après création'}
        </p>
      </div>

      {/* Commission */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">
          Commission FCFA par client confirmé
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            min={0}
            step={100}
            className="w-40 border border-dark/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
          <span className="text-sm text-dark/50">FCFA</span>
          {types.find((t) => t.id === selectedType)?.commission_fcfa !== commission && (
            <button
              type="button"
              onClick={() => {
                const t = types.find((t) => t.id === selectedType)
                if (t) setCommission(t.commission_fcfa)
              }}
              className="text-xs text-gold-600 underline"
            >
              Remettre par défaut ({types.find((t) => t.id === selectedType)?.commission_fcfa} F)
            </button>
          )}
        </div>
      </div>

      {/* Résidences assignées */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">
          Résidences assignées
        </label>
        {hebergements.length === 0 ? (
          <p className="text-sm text-dark/40 italic">Aucune résidence disponible dans Firestore.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-dark/10 rounded-xl p-3">
            {hebergements.map((h) => (
              <label
                key={h.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  assignes.includes(h.id) ? 'bg-gold-50 text-gold-800' : 'hover:bg-cream/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={assignes.includes(h.id)}
                  onChange={() => toggleAssigne(h.id)}
                  className="accent-gold-500"
                />
                <span className="text-sm">{h.name}</span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-dark/40 mt-1">
          {assignes.length} résidence{assignes.length !== 1 ? 's' : ''} sélectionnée{assignes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Statut */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1.5">Statut</label>
        <div className="flex gap-3">
          {(['actif', 'suspendu'] as const).map((s) => (
            <label
              key={s}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                s === 'actif'
                  ? 'has-[:checked]:border-green-400 has-[:checked]:bg-green-50 has-[:checked]:text-green-700'
                  : 'has-[:checked]:border-red-400 has-[:checked]:bg-red-50 has-[:checked]:text-red-700'
              } border-dark/20`}
            >
              <input
                type="radio"
                name="statut"
                value={s}
                defaultChecked={prescripteur ? prescripteur.statut === s : s === 'actif'}
                className="sr-only"
              />
              <span className="text-sm font-medium capitalize">{s === 'actif' ? 'Actif' : 'Suspendu'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> En cours...</>
          ) : (
            <><Save size={16} /> {isEdit ? 'Enregistrer' : 'Créer le prescripteur'}</>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-dark/20 text-sm text-dark/60 hover:bg-dark/5 transition-colors"
        >
          Annuler
        </button>
      </div>

      {!isEdit && (
        <p className="text-xs text-dark/40 flex items-center gap-1.5">
          <Bike size={13} />
          Un SMS WhatsApp d&apos;activation sera envoyé automatiquement au prescripteur.
        </p>
      )}
    </form>
  )
}
