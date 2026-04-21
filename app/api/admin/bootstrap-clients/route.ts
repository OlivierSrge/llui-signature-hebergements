import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { generateMemberCode, generateBoutiquePromoCode } from '@/lib/loyalty'

export const dynamic = 'force-dynamic'

// Endpoint de bootstrap one-shot : crée tous les profils clients manquants
// Accessible via GET depuis le navigateur admin
export async function GET(request: NextRequest) {
  // Protection basique : token dans l'URL
  const token = request.nextUrl.searchParams.get('token')
  if (token !== 'llui-bootstrap-2026') {
    return NextResponse.json({ error: 'Token requis' }, { status: 401 })
  }

  try {
    const resSnap = await db.collection('reservations')
      .where('reservation_status', '==', 'confirmee')
      .get()

    // Regrouper par email
    const byEmail = new Map<string, { res: FirebaseFirestore.DocumentData; count: number }>()
    for (const doc of resSnap.docs) {
      const data = doc.data()
      const email = (data.guest_email || '').toLowerCase().trim()
      if (!email) continue
      const existing = byEmail.get(email)
      if (!existing) {
        byEmail.set(email, { res: data, count: 1 })
      } else {
        existing.count++
      }
    }

    let created = 0
    let updated = 0
    const details: string[] = []

    for (const [email, { res, count }] of Array.from(byEmail)) {
      const clientSnap = await db.collection('clients')
        .where('email', '==', email)
        .limit(1)
        .get()

      const now = new Date().toISOString()

      if (clientSnap.empty) {
        const id = db.collection('clients').doc().id
        await db.collection('clients').doc(id).set({
          firstName: res.guest_first_name || '',
          lastName: res.guest_last_name || '',
          email,
          phone: res.guest_phone || '',
          birthDate: null,
          memberCode: generateMemberCode(),
          joinedAt: res.confirmed_at || res.created_at || now,
          niveau: 'novice',
          totalSejours: count,
          totalPoints: 0,
          boutiqueDiscount: 5,
          boutiquePromoCode: generateBoutiquePromoCode(),
          boutiquePointsEarned: 0,
          boutiqueAchats: [],
          created_at: now,
          updated_at: now,
        })
        created++
        details.push(`CRÉÉ: ${email} (${res.guest_first_name} ${res.guest_last_name})`)
      } else {
        await clientSnap.docs[0].ref.update({ totalSejours: count, updated_at: now })
        updated++
        details.push(`MIS À JOUR: ${email}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: byEmail.size,
      details,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
