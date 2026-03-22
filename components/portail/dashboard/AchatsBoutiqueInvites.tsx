'use client'
// BLOC Achats Boutique Invités — Transactions BOUTIQUE depuis Google Sheets sync

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(s: string) {
  if (!s) return ''
  // Format attendu depuis Google Sheets : "DD/MM/YYYY" ou ISO
  const parts = s.split('/')
  if (parts.length === 3) {
    return `${parts[0]} ${['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][parseInt(parts[1]) - 1] ?? parts[1]} ${parts[2]}`
  }
  try { return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return s }
}

const STATUT_COLORS: Record<string, string> = {
  'CONFIRMÉ': '#7C9A7E', 'CONFIRMEE': '#7C9A7E', 'PAYÉ': '#3B82F6',
  'PAYEE': '#3B82F6', 'OK': '#7C9A7E', 'EN ATTENTE': '#C9A84C',
}
function statutColor(s: string) { return STATUT_COLORS[s?.toUpperCase()] ?? '#888' }

export interface BoutiqueTransaction {
  id: string
  date: string
  client_nom: string
  produit: string
  montant_final: number
  statut: string
  rev_generes: number
  cagnotte_cash: number
  cagnotte_credits: number
}

interface Props { transactions: BoutiqueTransaction[] }

export default function AchatsBoutiqueInvites({ transactions }: Props) {
  if (transactions.length === 0) return null

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">🛍️ Achats de mes invités</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: '#C9A84C' }}>{transactions.length}</span>
      </div>

      <div className="space-y-2">
        {transactions.map(t => (
          <div key={t.id} className="rounded-xl p-3" style={{ background: '#F9F7F2' }}>
            {/* Ligne 1 : invité + statut */}
            <div className="flex justify-between items-start mb-1">
              <p className="text-xs font-semibold text-[#1A1A1A] truncate flex-1 mr-2">{t.client_nom || 'Invité'}</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ background: statutColor(t.statut) + '22', color: statutColor(t.statut) }}>
                {t.statut || '—'}
              </span>
            </div>
            {/* Ligne 2 : produit + date */}
            <p className="text-[11px] text-[#888] mb-1.5 truncate">{t.produit} · {formatDate(t.date)}</p>
            {/* Ligne 3 : montant + commissions */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-[#888]">{formatFCFA(t.montant_final)}</p>
                {t.rev_generes > 0 && <p className="text-[10px] text-[#C9A84C]">{t.rev_generes} REV</p>}
              </div>
              {(t.cagnotte_cash + t.cagnotte_credits) > 0 && (
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: '#C9A84C' }}>+{formatFCFA(t.cagnotte_cash)} cash</p>
                  {t.cagnotte_credits > 0 && <p className="text-[10px] text-[#888]">+{formatFCFA(t.cagnotte_credits)} crédits</p>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
