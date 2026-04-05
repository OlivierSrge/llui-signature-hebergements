'use client'

import { useState, useTransition } from 'react'
import { Star, X, Send, Loader2 } from 'lucide-react'
import { noterPrescripteur } from '@/actions/notes-prescripteurs'

interface ReservationANoter {
  id: string
  prescripteur_id: string
  prescripteur_nom: string
  client_nom: string
  hebergement_nom: string
  commission_versee_at: string
}

interface Props {
  partenaireId: string
  partenaireNom: string
  reservations: ReservationANoter[]
}

function EtoilesSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform active:scale-110"
        >
          <Star
            size={28}
            className={`transition-colors ${
              n <= (hover || value)
                ? 'fill-[#C9A84C] text-[#C9A84C]'
                : 'fill-transparent text-dark/20'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function NotationSection({ partenaireId, partenaireNom, reservations }: Props) {
  const [liste, setListe] = useState<ReservationANoter[]>(reservations)
  const [current, setCurrent] = useState(0)
  const [note, setNote] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [isPending, startTransition] = useTransition()
  const [succes, setSucces] = useState(false)

  if (liste.length === 0) return null

  const resa = liste[current]
  if (!resa) return null

  const passer = () => {
    setNote(0); setCommentaire(''); setSucces(false)
    if (current < liste.length - 1) {
      setCurrent((c) => c + 1)
    } else {
      setListe([])
    }
  }

  const envoyer = () => {
    if (note === 0) return
    startTransition(async () => {
      const res = await noterPrescripteur({
        prescripteur_id: resa.prescripteur_id,
        partenaire_id: partenaireId,
        reservation_id: resa.id,
        note,
        commentaire,
        created_by: partenaireId,
        partenaire_nom: partenaireNom,
        hebergement_nom: resa.hebergement_nom,
      })
      if (res.success) {
        setSucces(true)
        setTimeout(() => {
          setNote(0); setCommentaire(''); setSucces(false)
          if (current < liste.length - 1) setCurrent((c) => c + 1)
          else setListe([])
        }, 1500)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#C9A84C]/40 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star size={18} className="fill-[#C9A84C] text-[#C9A84C]" />
          <h2 className="font-serif text-base font-semibold text-dark">Evaluez votre prescripteur</h2>
        </div>
        <button onClick={passer} className="text-dark/30 hover:text-dark transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Info réservation */}
      <div className="bg-beige-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-sm font-semibold text-dark">{resa.prescripteur_nom}</p>
        <p className="text-xs text-dark/50 mt-0.5">
          A amene <span className="font-medium text-dark">{resa.client_nom}</span>
          {resa.hebergement_nom ? ` — ${resa.hebergement_nom}` : ''}
        </p>
        <p className="text-xs text-[#C9A84C] mt-0.5">Commission versee</p>
      </div>

      {succes ? (
        <div className="flex items-center justify-center gap-2 py-4 text-green-600 font-medium">
          <Star size={18} className="fill-green-500 text-green-500" />
          Evaluation envoyee !
        </div>
      ) : (
        <>
          {/* Étoiles */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <EtoilesSelector value={note} onChange={setNote} />
            {note > 0 && (
              <p className="text-sm text-dark/50">
                {['', 'Mauvais', 'Passable', 'Bien', 'Tres bien', 'Excellent !'][note]}
              </p>
            )}
          </div>

          {/* Commentaire optionnel */}
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value.slice(0, 200))}
            placeholder="Commentaire optionnel (ponctuel, professionnel, a amene un bon client...)"
            rows={2}
            className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm text-dark resize-none focus:outline-none focus:border-[#C9A84C] mb-4"
          />

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={passer}
              className="flex-1 py-2.5 rounded-xl border border-beige-200 text-dark/50 text-sm font-medium hover:bg-beige-50 transition-all"
            >
              Passer
            </button>
            <button
              onClick={envoyer}
              disabled={note === 0 || isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] hover:bg-[#b8973f] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={14} />}
              Envoyer l'evaluation
            </button>
          </div>

          {liste.length > 1 && (
            <p className="text-center text-xs text-dark/30 mt-2">
              {current + 1} / {liste.length} a evaluer
            </p>
          )}
        </>
      )}
    </div>
  )
}
