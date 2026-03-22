'use client'
// components/portail/dashboard/AdminBandeau.tsx
// Bandeau fixe affiché quand l'admin accède à un espace marié via impersonation

interface Props {
  nomsMaries: string
}

export default function AdminBandeau({ nomsMaries }: Props) {
  if (!nomsMaries) return null
  return (
    <>
      {/* Bandeau fixe en haut de page */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 shadow-md"
        style={{ background: '#C9A84C' }}
      >
        <p className="text-white text-sm font-semibold truncate">
          👁 Mode admin — Espace de {nomsMaries}
        </p>
        <a
          href="/admin/ecosysteme"
          className="flex-shrink-0 ml-3 text-white/90 text-xs font-medium hover:text-white underline underline-offset-2"
        >
          Retour à l&apos;admin →
        </a>
      </div>
      {/* Spacer pour compenser la hauteur du bandeau fixe */}
      <div className="h-12" />
    </>
  )
}
