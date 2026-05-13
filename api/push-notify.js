import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.APP_URL || 'https://app-finanzas.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Autenticar al caller
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { userId, title, body } = req.body || {};
  if (!userId || !title) return res.status(400).json({ error: 'Missing fields' });

  // Solo puede enviar notificaciones a sí mismo o a su pareja en folder compartido
  if (userId !== user.id) {
    const { data: membership } = await supabase
      .from('shared_folder_members')
      .select('folder_id')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      const { data: targetMember } = await supabase
        .from('shared_folder_members')
        .select('folder_id')
        .eq('user_id', userId)
        .eq('folder_id', membership.folder_id)
        .single();

      if (!targetMember) return res.status(403).json({ error: 'Forbidden' });
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(200).json({ ok: false, reason: 'no_vapid' });
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'app@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (!subs?.length) return res.status(200).json({ ok: false, reason: 'no_subs' });

  const payload = JSON.stringify({
    title: String(title).slice(0, 100),
    body: String(body || '').slice(0, 200),
    icon: '/icon-192.png',
  });

  await Promise.allSettled(
    subs.map(({ subscription }) => webpush.sendNotification(subscription, payload))
  );

  return res.status(200).json({ ok: true });
}
