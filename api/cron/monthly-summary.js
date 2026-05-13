import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Mis Finanzas <onboarding@resend.dev>';
const APP_URL = process.env.VITE_APP_URL || 'https://app-finanzas.vercel.app';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ ok: false, reason: 'no_api_key' });
  }

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = prevMonth.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  const { data: expenses } = await supabase
    .from('expenses')
    .select('user_id, amount, currency, exchange_rate, category_id, card_id, shared_folder_id')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .is('card_id', null)
    .is('shared_folder_id', null);

  if (!expenses?.length) return res.status(200).json({ ok: true, sent: 0 });

  const { data: categories } = await supabase.from('categories').select('id, name, emoji, user_id');

  const byUser = {};
  for (const exp of expenses) {
    if (!byUser[exp.user_id]) byUser[exp.user_id] = [];
    byUser[exp.user_id].push(exp);
  }

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const emailMap = {};
  for (const u of users || []) emailMap[u.id] = u.email;

  let sent = 0;
  for (const [userId, userExpenses] of Object.entries(byUser)) {
    const email = emailMap[userId];
    if (!email) continue;

    const userCats = categories?.filter(c => c.user_id === userId) || [];
    const catMap = Object.fromEntries(userCats.map(c => [c.id, c]));

    const byCat = {};
    let total = 0;
    for (const exp of userExpenses) {
      const ars = exp.currency === 'USD' ? exp.amount * (exp.exchange_rate || 1) : exp.amount;
      total += ars;
      const catId = exp.category_id || 'sin-categoria';
      byCat[catId] = (byCat[catId] || 0) + ars;
    }

    const rows = Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([catId, amt]) => {
        const cat = catMap[catId];
        const label = cat ? `${cat.emoji} ${cat.name}` : '📦 Sin categoría';
        return `<tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;">${label}</td><td style="padding:8px 0;color:#f4f4f5;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;">$ ${Math.round(amt).toLocaleString('es-AR')}</td></tr>`;
      })
      .join('');

    const html = buildEmail({ monthLabel, total, rows, appUrl: APP_URL });

    try {
      await resend.emails.send({ from: FROM, to: email, subject: `📊 Tu resumen de ${monthLabel}`, html });
      sent++;
    } catch (e) {
      console.error('monthly-summary send error:', e.message);
    }
  }

  return res.status(200).json({ ok: true, sent });
}

function buildEmail({ monthLabel, total, rows, appUrl }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <div style="display:inline-block;background:#bef26420;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:26px;text-align:center;">📊</div>
          <div style="color:#a1a1aa;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-top:16px;">Mis Finanzas</div>
        </td></tr>
        <tr><td style="background:#18181b;border-radius:20px;padding:32px;border:1px solid #27272a;">
          <h1 style="color:#f4f4f5;font-size:22px;font-weight:600;margin:0 0 4px;">Resumen de ${monthLabel}</h1>
          <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Acá está el detalle de tus gastos del mes.</p>
          <div style="background:#09090b;border-radius:14px;padding:20px;margin-bottom:24px;border:1px solid #27272a;">
            <div style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Total del mes</div>
            <div style="color:#bef264;font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;">$ ${Math.round(total).toLocaleString('es-AR')}</div>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${rows}</table>
          <a href="${appUrl}" style="display:block;background:#bef264;color:#09090b;text-align:center;padding:14px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
            Ver en Mis Finanzas
          </a>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="color:#3f3f46;font-size:12px;margin:0;">Recibís este resumen el primero de cada mes.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
