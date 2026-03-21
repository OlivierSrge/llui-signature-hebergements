// app/api/admin/export/csv/route.ts
// GET /api/admin/export/csv?type=transactions|commissions|utilisateurs|fast_start|retraits|wallet_operations|maries|commandes_boutique

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function row(cells: (string | number | null | undefined)[]) {
  return cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
}
function dateStr(ts: { toDate?: () => Date } | undefined) {
  return ts?.toDate?.()?.toLocaleString('fr-FR') ?? ''
}

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') ?? 'transactions'
  const db = getDb()
  const bom = '\uFEFF'
  let csv = bom

  if (type === 'transactions') {
    csv += 'Date,Source,Type,Montant HT (FCFA),Statut\n'
    const snap = await db.collectionGroup('transactions').orderBy('created_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([dateStr(o.created_at), o.source, o.type, o.amount_ht, o.status]) + '\n'
    })
  } else if (type === 'commissions') {
    csv += 'Date,User ID,Transaction ID,Cash (FCFA),Crédits (FCFA),REV,Niveau,Source\n'
    const snap = await db.collection('commissions').orderBy('created_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([dateStr(o.created_at), o.user_id, o.transaction_id, o.cash, o.credits, o.rev, o.level, o.source]) + '\n'
    })
  } else if (type === 'utilisateurs') {
    csv += 'Nom,Rôle,Grade,REV,Cash (FCFA),Crédits (FCFA),Téléphone,Inscrit le\n'
    const snap = await db.collection('portail_users').orderBy('rev_lifetime', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([o.displayName, o.role, o.grade, o.rev_lifetime, o.wallets?.cash, o.wallets?.credits_services, o.phone, dateStr(o.created_at)]) + '\n'
    })
  } else if (type === 'fast_start') {
    csv += 'Date,Nom,Téléphone OM,Palier (j),Montant (FCFA),Statut,Référence OM\n'
    const snap = await db.collection('fast_start_demandes').orderBy('atteint_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([dateStr(o.atteint_at), o.nom_complet, o.telephone_om, o.palier, o.montant_prime, o.statut, o.reference_om]) + '\n'
    })
  } else if (type === 'retraits') {
    csv += 'Date,UID,Wallet,Montant (FCFA),Téléphone OM,Statut\n'
    const snap = await db.collection('retraits_demandes').orderBy('created_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([dateStr(o.created_at), o.uid, o.wallet_type, o.montant, o.telephone_om, o.statut]) + '\n'
    })
  } else if (type === 'wallet_operations') {
    csv += 'Date,UID,Type,Cash (FCFA),Crédits (FCFA),REV,Source\n'
    const snap = await db.collectionGroup('wallet_operations').orderBy('created_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([dateStr(o.created_at), o.uid, o.type, o.amount_cash, o.amount_credits, o.rev_attribues, o.source]) + '\n'
    })
  } else if (type === 'maries') {
    csv += 'UID,Noms Mariés,WhatsApp,Date Mariage,Lieu,Code Promo,Grade,REV,Cash (FCFA),Actif,Inscrit le\n'
    const snap = await db.collection('portail_users').where('role', '==', 'MARIÉ').orderBy('created_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([o.uid, o.noms_maries, o.whatsapp, o.projet?.date_evenement?.toDate?.()?.toLocaleDateString('fr-FR') ?? '', o.projet?.lieu, o.code_promo, o.grade, o.rev_lifetime, o.wallets?.cash, o.actif ? 'OUI' : 'NON', dateStr(o.created_at)]) + '\n'
    })
  } else if (type === 'commandes_boutique') {
    csv += 'Date,Mariage UID,Code Promo,Client,Tel,Produit,Montant (FCFA),Statut,Notes\n'
    const snap = await db.collectionGroup('transactions').where('type', '==', 'BOUTIQUE').orderBy('created_at', 'desc').limit(500).get()
    snap.docs.forEach(d => {
      const o = d.data()
      csv += row([dateStr(o.created_at), d.ref.parent.parent?.id, o.code_promo, o.client_nom, o.client_tel, o.produit, o.amount_ht, o.status, o.notes]) + '\n'
    })
  } else {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="llui-${type}-${today}.csv"`,
    },
  })
}
