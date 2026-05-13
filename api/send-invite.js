import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Mis Finanzas <onboarding@resend.dev>';
const APP_URL = process.env.VITE_APP_URL || 'https://app-finanzas.vercel.app';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Autenticar
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { toEmail, inviterEmail } = req.body || {};

  if (!toEmail || typeof toEmail !== 'string' || !toEmail.includes('@')) {
    return res.status(400).json({ error: 'Missing or invalid toEmail' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ ok: false, reason: 'no_api_key' });
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: '💜 Te invitaron a compartir gastos',
      html: buildEmail(toEmail, inviterEmail || user.email, APP_URL),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-invite error:', err.message);
    return res.status(500).json({ ok: false, error: 'No se pudo enviar la invitación' });
  }
}

function buildEmail(recipientEmail, inviterEmail, appUrl) {
  const inviterLabel = escapeHtml(inviterEmail || 'Tu pareja');
  const recipientSafe = escapeHtml(recipientEmail);
  const appUrlSafe = escapeHtml(appUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <div style="display:inline-block;background:#c4b5fd1a;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:26px;text-align:center;">💜</div>
              <div style="color:#a1a1aa;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-top:16px;">Mis Finanzas</div>
            </td>
          </tr>
          <tr>
            <td style="background:#18181b;border-radius:20px;padding:32px;border:1px solid #27272a;">
              <h1 style="color:#f4f4f5;font-size:22px;font-weight:600;margin:0 0 8px;">
                Te invitaron a compartir gastos
              </h1>
              <p style="color:#71717a;font-size:14px;margin:0 0 24px;line-height:1.6;">
                <strong style="color:#a1a1aa;">${inviterLabel}</strong> te invitó a llevar los gastos en pareja en <strong style="color:#a1a1aa;">Mis Finanzas</strong>.
              </p>
              <div style="background:#09090b;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #27272a;">
                <p style="color:#71717a;font-size:13px;margin:0 0 8px;">¿Cómo unirte?</p>
                <ol style="color:#a1a1aa;font-size:13px;margin:0;padding-left:18px;line-height:2.2;">
                  <li>Abrí la app con <strong style="color:#f4f4f5;">${recipientSafe}</strong></li>
                  <li>Iniciá sesión o creá tu cuenta</li>
                  <li>Los gastos compartidos aparecen automáticamente</li>
                </ol>
              </div>
              <a href="${appUrlSafe}" style="display:block;background:#c084fc;color:#09090b;text-align:center;padding:14px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
                Abrir Mis Finanzas
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="color:#3f3f46;font-size:12px;margin:0;">
                Si no conocés a ${inviterLabel}, podés ignorar este mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
