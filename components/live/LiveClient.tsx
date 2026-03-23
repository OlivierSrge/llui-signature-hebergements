'use client'
// components/live/LiveClient.tsx — #176 Livestream cérémonie YouTube Live

import { useState, useEffect } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  youtube_live_id: string
  youtube_video_id: string
  live_actif: boolean
}

function formatDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export default function LiveClient({ noms_maries, date_mariage, youtube_live_id, youtube_video_id, live_actif }: Props) {
  const [viewerCount] = useState(() => Math.floor(Math.random() * 180) + 20)
  const [messages, setMessages] = useState([
    { auteur: 'Tante Agnès', texte: '💛 Félicitations aux mariés ! On vous voit depuis Paris !', time: '10:32' },
    { auteur: 'Oncle Bernard', texte: 'Quelle belle cérémonie ! Kribi est magnifique 🌊', time: '10:35' },
    { auteur: 'Sophie (témoin)', texte: "Je suis tellement fière de vous ! 😭💍", time: '10:38' },
  ])
  const [newMsg, setNewMsg] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [msgSent, setMsgSent] = useState(false)

  const videoId = youtube_live_id || youtube_video_id
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : null

  function sendMessage() {
    if (!newMsg.trim() || !pseudo.trim()) return
    const now = new Date()
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { auteur: pseudo, texte: newMsg, time }])
    setNewMsg('')
    setMsgSent(true)
    setTimeout(() => setMsgSent(false), 2000)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
        <div>
          <div className="flex items-center gap-2">
            {live_actif && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: live_actif ? '#FF4444' : '#888' }}>
              {live_actif ? '🔴 EN DIRECT' : 'REDIFFUSION'}
            </p>
          </div>
          <h1 className="text-base font-serif text-white mt-0.5">Mariage de {noms_maries}</h1>
          <p className="text-[10px] text-[#555]">{formatDate(date_mariage)}</p>
        </div>
        {live_actif && (
          <div className="text-right">
            <p className="text-lg font-bold text-white">{viewerCount}</p>
            <p className="text-[10px] text-[#555]">spectateurs</p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 72px)' }}>
        {/* Vidéo */}
        <div className="flex-1">
          {embedUrl ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Mariage de ${noms_maries}`}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center bg-[#111]" style={{ aspectRatio: '16/9' }}>
              <div className="text-center px-6">
                <div className="text-6xl mb-4">📺</div>
                <p className="text-white font-semibold mb-2">Le livestream n'est pas encore configuré</p>
                <p className="text-[#555] text-sm">L'équipe L&Lui activera le lien YouTube Live avant la cérémonie</p>
              </div>
            </div>
          )}

          {/* Infos sous la vidéo */}
          <div className="p-4">
            <h2 className="text-white font-semibold">{live_actif ? '🔴 En direct' : '▶️'} Mariage de {noms_maries}</h2>
            <p className="text-[#888] text-sm mt-1">{formatDate(date_mariage)}</p>
            {live_actif && (
              <div className="mt-3 flex gap-3">
                <a href={`https://youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#FF0000' }}>
                  ▶ Voir sur YouTube
                </a>
                <button onClick={() => navigator.share?.({ title: `Mariage de ${noms_maries}`, url: window.location.href }).catch(() => navigator.clipboard.writeText(window.location.href))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: '#2A2A2A', color: '#C9A84C' }}>
                  🔗 Partager le lien
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat en direct */}
        <div className="w-full lg:w-80 flex flex-col" style={{ background: '#111', borderLeft: '1px solid #2A2A2A' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #2A2A2A' }}>
            <p className="text-xs font-bold text-white">💬 Chat des invités</p>
            <p className="text-[10px] text-[#555] mt-0.5">Partagez votre joie avec les mariés !</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ maxHeight: 400 }}>
            {messages.map((m, i) => (
              <div key={i}>
                <p className="text-[10px] font-bold" style={{ color: '#C9A84C' }}>{m.auteur} <span className="text-[#555] font-normal">{m.time}</span></p>
                <p className="text-xs text-[#DDD] mt-0.5">{m.texte}</p>
              </div>
            ))}
          </div>

          {/* Input message */}
          <div className="p-3 space-y-2" style={{ borderTop: '1px solid #2A2A2A' }}>
            <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Votre prénom"
              className="w-full rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              style={{ background: '#1A1A1A', border: '1px solid #333' }} />
            <div className="flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Votre message…"
                className="flex-1 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                style={{ background: '#1A1A1A', border: '1px solid #333' }} />
              <button onClick={sendMessage} disabled={!newMsg.trim() || !pseudo.trim()}
                className="px-3 rounded-xl text-xs font-bold disabled:opacity-30 transition-all"
                style={{ background: '#C9A84C', color: '#1A1A1A' }}>
                {msgSent ? '✓' : '→'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
