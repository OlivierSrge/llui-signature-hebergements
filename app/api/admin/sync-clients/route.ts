import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { generateMemberCode, generateBoutiquePromoCode } from '@/lib/loyalty'
import { cookies } from 'next/headers'

export async function POST() {
  // Vérification session admin
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const resSnap = await db.collection('reservations')
      .where('reservation_status', '==', 'confirmee')
      .get()

    // Regrouper par email (dédoublonnage)
    const byEmail = new Map<string, { res: FirebaseFirestore.DocumentData; count: number }>()
    for (const doc of resSnap.docs) {
      const data = doc.data()
      const email = (data.guest_email || '').toLowerCase().trim()
      if (!email) continue
      if (!byEmail.has(email)) {
        byEmail.set(email, { res: data, count: 1 })
      } else {
        byEmail.get(email)!.count++
      }
    }

    let created = 0
    let updated = 0

    for (const [email, { res, count }] of Array.from(byEmail)) {
      // Vérifier si le profil existe déjà
      const clientSnap = await db.collection('clients')
        .where('email', '==', email)
        .limit(1)
        .get()

      const now = new Date().toISOString()

      if (clientSnap.empty) {
        // Créer le profil
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
      } else {
        // Mettre à jour le nombre de séjours
        await clientSnap.docs[0].ref.update({
          totalSejours: count,
          updated_at: now,
        })
        updated++
      }
    }

    return NextResponse.json({ success: true, created, updated, total: byEmail.size })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
