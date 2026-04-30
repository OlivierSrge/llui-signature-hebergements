/**
 * Envoi d'emails via Brevo (ex-Sendinblue)
 */

interface BrevoEmailParams {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export async function sendBrevoEmail(params: BrevoEmailParams): Promise<boolean> {
  const { to, toName, subject, htmlContent } = params;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: {
          name: 'L&Lui Signature',
          email: 'olivierfinestone@gmail.com'
        },
        to: [
          {
            email: to,
            name: toName
          }
        ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[BREVO] Erreur:', error);
      return false;
    }

    const result = await response.json();
    console.log('[BREVO] Email envoyé ✅:', result);
    return true;

  } catch (error) {
    console.error('[BREVO] Exception:', error);
    return false;
  }
}
