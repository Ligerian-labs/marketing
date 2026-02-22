import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY); // USE process.env, NOT import.meta.env

export async function sendPasswordSetupEmail(to: string, name: string, token: string) {
  const setupUrl = `https://ligerianlabs.fr/auth/setup-password?token=${token}`;
  
  await resend.emails.send({
    from: "Ligerian Labs <bonjour@ligerianlabs.fr>",
    to,
    subject: "Configurez votre accès — Ligerian Labs",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Ligerian Labs</h1>
          <p style="color: #666; margin: 8px 0 0 0;">Votre formation IA vous attend !</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
          <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px;">Bonjour ${name},</h2>
          <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
            Merci pour votre achat ! Votre formation est maintenant disponible.
          </p>
          <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
            Pour accéder à votre contenu, vous devez d'abord configurer votre mot de passe :
          </p>
          
          <div style="text-align: center;">
            <a href="${setupUrl}" 
               style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
              Configurer mon mot de passe
            </a>
          </div>
        </div>
        
        <div style="border-left: 4px solid #fbbf24; background: #fffbeb; padding: 16px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Important :</strong> Ce lien expire dans 48 heures pour votre sécurité.
          </p>
        </div>
        
        <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          <p>Si vous n'arrivez pas à cliquer sur le bouton, copiez ce lien dans votre navigateur :</p>
          <p style="background: #f3f4f6; padding: 8px; border-radius: 4px; word-break: break-all; font-family: monospace;">
            ${setupUrl}
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p>Des questions ? Répondez à cet email ou contactez-nous sur bonjour@ligerianlabs.fr</p>
          <p style="margin-top: 16px;">
            Ligerian Labs<br>
            <a href="https://ligerianlabs.fr" style="color: #3b82f6; text-decoration: none;">ligerianlabs.fr</a>
          </p>
        </div>
      </div>
    `
  });
}