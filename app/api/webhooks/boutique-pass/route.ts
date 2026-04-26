import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/webhooks/boutique-pass
 * 
 * Endpoint appelé par Apps Script lors d'une commande Pass VIP
 * Crée un document Firestore "pending" avec token de confirmation
 */
export async function POST(req: NextRequest) {
  try {
    // Vérification authentification
    const authHeader = req.headers.get('authorization');
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.SHEETS_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('[WEBHOOK PASS] Variable SHEETS_WEBHOOK_SECRET manquante');
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    // Vérifier au moins un des deux headers
    const authValid = authHeader === `Bearer ${expectedSecret}`;
    const secretValid = webhookSecret === expectedSecret;

    if (!authValid && !secretValid) {
      console.error('[WEBHOOK PASS] Auth échouée', {
        hasAuth: !!authHeader,
        hasSecret: !!webhookSecret,
        authMatch: authValid,
        secretMatch: secretValid
      });
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Parser le body
    const data = await req.json();
    const { nom, type_pass, montant, code_promo, nom_affilie, tel, email, 
date } = data;

    // Validation données requises
    if (!nom || !type_pass || !montant || !tel || !email) {
      return NextResponse.json(
        { error: 'Données manquantes', required: ['nom', 'type_pass', 
'montant', 'tel', 'email'] },
        { status: 400 }
      );
    }

    // Déterminer le grade du Pass
    let grade = 'START';
    const typeUpper = type_pass.toUpperCase();
    if (typeUpper.includes('ARGENT')) grade = 'ARGENT';
    else if (typeUpper.includes('OR')) grade = 'OR';
    else if (typeUpper.includes('SAPHIR')) grade = 'SAPHIR';
    else if (typeUpper.includes('DIAMANT')) grade = 'DIAMANT';

    // Générer token unique
    const token = uuidv4();

    // Créer document Firestore
    const passDoc = {
      nom_client: nom,
      tel_client: tel,
      email_client: email,
      type_pass,
      grade,
      montant,
      code_promo: code_promo || null,
      nom_affilie: nom_affilie || null,
      date_commande: date || new Date().toISOString(),
      token,
      statut: 'pending',
      createdAt: new Date(),
    };

    await getDb().collection('pass_vip_pending').doc(token).set(passDoc);

    console.log('[WEBHOOK PASS] Pass VIP créé', { token, grade, nom });

    // Retourner le token à Apps Script
    return NextResponse.json({
      success: true,
      token,
      grade,
      pass_url: `${process.env.NEXT_PUBLIC_APP_URL || 
'https://llui-signature-hebergements.vercel.app'}/pass/${token}`,
      ref_lisible: `PASS-${grade}-${token.slice(0, 8)}`,
      statut: 'pending',
      message: 'Pass VIP en attente de confirmation'
    });

  } catch (error: any) {
    console.error('[WEBHOOK PASS] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}

// Désactiver le cache pour cet endpoint
export const dynamic = 'force-dynamic';
