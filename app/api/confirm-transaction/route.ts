// app/api/confirm-transaction/route.ts
// GET /api/confirm-transaction?token=<nanoid>
// Confirme une transaction pending de façon atomique (Firestore transaction).
// Met à jour points client + provision partenaire en une seule opération.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getMembershipStatus } from '@/lib/loyaltyEngine'
import { getParametresPlateforme } from '@/actions/parametres'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token || token.length < 10) {
    return htmlResponse('Lien invalide', 0, 0, 0, 0, false, 'Ce lien de confirmation est invalide ou incomplet.')
  }

  try {
    // 1. Trouver la transaction pending par son token (usage unique)
    const snap = await db
      .collection('transactions_fidelite')
      .where('confirmation_token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (snap.empty) {
      return htmlResponse('Déjà confirmée', 0, 0, 0, 0, true, 'Cette transaction a déjà été confirmée ou le lien a expiré.')
    }

    const txDoc = snap.docs[0]
    const tx = txDoc.data()

    // 2. Vérifier expiration (max 1 heure)
    const expiresAt = new Date(tx.expires_at as string)
    if (new Date() > expiresAt) {
      await txDoc.ref.update({ status: 'cancelled' })
      return htmlResponse('Lien expiré', 0, 0, 0, 0, false, 'Ce lien a expiré (valable 1 heure).\nContactez le partenaire pour une nouvelle transaction.')
    }

    // 3. Paramètres pour recalcul du statut après attribution
    const params = await getParametresPlateforme()
    const thresholds = {
      seuil_novice: params.fidelite_seuil_novice,
      seuil_explorateur: params.fidelite_seuil_explorateur,
      seuil_ambassadeur: params.fidelite_seuil_ambassadeur,
      seuil_excellence: params.fidelite_seuil_excellence,
    }

    // 4. Transaction Firestore atomique
    let capturedNewStars = 0
    await db.runTransaction(async (fsTransaction) => {
      const clientRef = db.collection('clients_fidelite').doc(tx.client_id as string)
      const partenaireRef = db.collection('prescripteurs_partenaires').doc(tx.partenaire_id as string)

      const [clientSnap, partenaireSnap] = await Promise.all([
        fsTransaction.get(clientRef),
        fsTransaction.get(partenaireRef),
      ])

      if (!clientSnap.exists) throw new Error('Client introuvable')
      if (!partenaireSnap.exists) throw new Error('Partenaire introuvable')

      const clientData = clientSnap.data()!
      const partenaireData = partenaireSnap.data()!

      const starsGagnees = tx.stars_gagnees as number
      const valeurStarFcfa = tx.valeur_star_fcfa as number

      const newStars = ((clientData.points_stars as number) ?? 0) + starsGagnees
      capturedNewStars = newStars
      const newHistorique = ((clientData.total_stars_historique as number) ?? 0) + starsGagnees
      const newStatus = getMembershipStatus(newHistorique, thresholds)
      const provision = (partenaireData.solde_provision as number) ?? 0
      const deduction = starsGagnees * valeurStarFcfa

      // Mise à jour client — points + statut
      fsTransaction.update(clientRef, {
        points_stars: newStars,
        total_stars_historique: newHistorique,
        membership_status: newStatus,
        last_status_update: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })

      // Déduire provision partenaire + incrémenter CA Stars
      fsTransaction.update(partenaireRef, {
        solde_provision: Math.max(0, provision - deduction),
        total_ca_stars_fcfa: FieldValue.increment(tx.montant_net as number),
      })

      // Invalider la transaction (token à usage unique)
      fsTransaction.update(txDoc.ref, {
        status: 'confirmed',
        confirmed_at: FieldValue.serverTimestamp(),
        confirmation_token: FieldValue.delete(), // invalider le token
      })
    })

    const starsGagnees = tx.stars_gagnees as number
    const montantNet = tx.montant_net as number
    const remise = tx.remise_appliquee as number

    console.log(
      `[Fidelite] TX ${txDoc.id} confirmée — client=${tx.client_id}, +${starsGagnees}⭐`
    )

    return htmlResponse(
      `+${starsGagnees} Stars`,
      montantNet,
      remise,
      starsGagnees,
      capturedNewStars,
      true
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Fidelite] confirm-transaction erreur:', e)
    return htmlResponse('Erreur', 0, 0, 0, 0, false, `Une erreur est survenue : ${msg}`)
  }
}

// ─── Page de réponse HTML premium ─────────────────────────────

function htmlResponse(
  title: string,
  montantNet: number,
  remise: number,
  starsGagnees: number,
  newStars: number,
  success: boolean,
  errorMsg?: string
): NextResponse {
  const isSuccess = success && starsGagnees > 0

  const html = isSuccess
    ? `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>+${starsGagnees} Stars — L&amp;Lui Stars</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:Georgia,'Times New Roman',serif;
      background:linear-gradient(160deg,#1A1A1A 0%,#2D2410 60%,#1A1A1A 100%);
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;
    }
    .card{
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(201,168,76,0.3);
      border-radius:2rem;padding:2.5rem 2rem;max-width:380px;width:100%;text-align:center;
      box-shadow:0 0 60px rgba(201,168,76,0.12),0 4px 32px rgba(0,0,0,0.5);
      backdrop-filter:blur(12px);
    }
    .star-burst{font-size:4rem;margin-bottom:0.75rem;animation:pop .5s ease-out}
    @keyframes pop{0%{transform:scale(0.5);opacity:0}80%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
    .stars-gained{
      font-size:3.5rem;font-weight:bold;
      background:linear-gradient(135deg,#F0C040,#C9A84C,#F0C040);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      letter-spacing:-0.02em;line-height:1;margin-bottom:0.25rem;
    }
    .stars-label{font-size:0.75rem;color:rgba(201,168,76,0.6);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:1.75rem}
    .details{background:rgba(255,255,255,0.06);border-radius:1rem;padding:1rem 1.25rem;margin-bottom:1.5rem;text-align:left}
    .row{display:flex;justify-content:space-between;align-items:center;padding:0.35rem 0}
    .row+.row{border-top:1px solid rgba(255,255,255,0.06)}
    .row-label{font-size:0.8rem;color:rgba(255,255,255,0.45)}
    .row-val{font-size:0.85rem;color:rgba(255,255,255,0.85);font-weight:600}
    .row-val.gold{color:#C9A84C}
    .balance{
      background:linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08));
      border:1px solid rgba(201,168,76,0.35);border-radius:1.25rem;
      padding:1rem 1.25rem;margin-bottom:1.5rem;
    }
    .balance-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.18em;color:rgba(201,168,76,0.5);margin-bottom:0.35rem}
    .balance-val{font-size:2rem;font-weight:bold;color:#C9A84C;letter-spacing:-0.02em}
    .balance-unit{font-size:1rem;margin-left:0.25rem}
    .brand{font-size:0.7rem;color:rgba(201,168,76,0.5);font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:0.5rem}
    .footer{font-size:0.7rem;color:rgba(255,255,255,0.2)}
  </style>
</head>
<body>
  <div class="card">
    <div class="star-burst">⭐</div>
    <div class="stars-gained">+${starsGagnees}</div>
    <div class="stars-label">L&amp;Lui Stars ajoutées</div>
    <div class="details">
      <div class="row">
        <span class="row-label">Montant réglé</span>
        <span class="row-val">${montantNet.toLocaleString('fr-FR')} FCFA</span>
      </div>
      ${remise > 0 ? `<div class="row">
        <span class="row-label">Remise appliquée</span>
        <span class="row-val gold">−${remise.toLocaleString('fr-FR')} FCFA</span>
      </div>` : ''}
    </div>
    <div class="balance">
      <div class="balance-label">Nouveau solde Stars</div>
      <div class="balance-val">${newStars.toLocaleString('fr-FR')}<span class="balance-unit">⭐</span></div>
    </div>
    <div class="brand">L&amp;Lui Signature ✨</div>
    <div class="footer">Stars créditées. Vous pouvez fermer cette page.</div>
  </div>
</body>
</html>`
    : `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — L&amp;Lui Stars</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:Georgia,'Times New Roman',serif;
      background:#1A1A1A;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;
    }
    .card{
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
      border-radius:2rem;padding:2.5rem 2rem;max-width:380px;width:100%;text-align:center;
      box-shadow:0 4px 32px rgba(0,0,0,0.5);
    }
    .icon{font-size:3.5rem;margin-bottom:1rem}
    h1{font-size:1.5rem;color:rgba(255,255,255,0.85);margin-bottom:0.75rem;font-weight:bold}
    p{font-size:0.88rem;color:rgba(255,255,255,0.4);white-space:pre-line;line-height:1.7;margin-bottom:1.5rem}
    .badge{
      display:inline-block;padding:0.5rem 1.5rem;
      background:rgba(201,168,76,0.15);color:#C9A84C;
      border-radius:2rem;font-size:0.8rem;font-weight:bold;margin-bottom:1rem;
    }
    .footer{font-size:0.7rem;color:rgba(255,255,255,0.2)}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${escHtml(title)}</h1>
    ${errorMsg ? `<p>${escHtml(errorMsg)}</p>` : ''}
    <div class="badge">L&amp;Lui Stars ✨</div>
    <div class="footer">Vous pouvez fermer cette page.</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
