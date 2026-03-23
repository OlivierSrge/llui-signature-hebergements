// app/portail/parrainage/page.tsx — #150 L&Lui Stars étendu DIAMANT
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import StarsParrainage from '@/components/portail/stars/StarsParrainage'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Parrainage DIAMANT — L&Lui Stars' }

async function getData() {
  const cookieStore = cookies()
  const uid = cookieStore.get('portail_uid')?.value
  if (!uid) redirect('/portail/login')
  const db = getDb()
  const snap = await db.collection('portail_users').doc(uid).get()
  if (!snap.exists) redirect('/portail/login')
  const d = snap.data()!
  // Filleuls
  const filleulsSnap = await db.collection('portail_users')
    .where('parraine_par', '==', uid).get()
  const filleuls = filleulsSnap.docs.map(doc => {
    const fd = doc.data()
    const ts = fd.parrainage_at
    return {
      uid: doc.id,
      noms_maries: (fd.noms_maries as string) || 'Couple',
      date_parrainage: ts?.toDate ? ts.toDate().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      commission_fcfa: (fd.commission_parrainage as number) || 50000,
      statut: (fd.statut_commission as 'en_attente' | 'validee' | 'payee') || 'en_attente',
    }
  })
  const total_commissions = filleuls.reduce((s, f) => s + f.commission_fcfa, 0)
  return {
    marie_uid: uid,
    grade: (d.grade as string) || 'START',
    rev_lifetime: (d.rev_lifetime as number) || 0,
    code_parrainage: (d.code_parrainage as string) || uid.slice(0, 8).toUpperCase(),
    filleuls,
    total_commissions,
  }
}

export default async function ParrainagePage() {
  const data = await getData()
  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">L&LUI STARS</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">Programme DIAMANT</h1>
          <p className="text-sm text-[#888] mt-1">Parrainage & avantages exclusifs</p>
        </div>
        <StarsParrainage {...data} />
      </div>
    </div>
  )
}
