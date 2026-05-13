import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'user-files';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Path, X-File-Type, X-Metadata',
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Servidor no configurado (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Verificar JWT del usuario
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No auth token' });

  let user;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida' });
    user = data.user;
  } catch {
    return res.status(401).json({ error: 'Error al verificar sesión' });
  }

  // Leer metadata de headers
  const filePath = req.headers['x-file-path'];
  const fileType = req.headers['x-file-type'] || 'application/octet-stream';
  let metadata = {};
  try { metadata = JSON.parse(req.headers['x-metadata'] || '{}'); } catch {}

  if (!filePath) return res.status(400).json({ error: 'Falta X-File-Path' });
  if (!filePath.startsWith(user.id + '/')) return res.status(403).json({ error: 'Path inválido' });

  // Leer el cuerpo binario del request
  const chunks = [];
  try {
    await new Promise((resolve, reject) => {
      req.on('data', c => chunks.push(c));
      req.on('end', resolve);
      req.on('error', reject);
    });
  } catch {
    return res.status(500).json({ error: 'Error al leer el archivo' });
  }

  const buffer = Buffer.concat(chunks);
  if (buffer.length === 0) return res.status(400).json({ error: 'Archivo vacío' });

  // Subir al Storage usando admin (sin CORS ni RLS desde el servidor)
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: fileType, upsert: false });

  if (uploadErr) {
    const m = uploadErr.message || '';
    if (/duplicate|already exists/i.test(m)) {
      return res.status(409).json({ error: 'Ya existe un archivo con ese nombre. Intentá de nuevo.' });
    }
    return res.status(500).json({ error: 'Error al subir: ' + m });
  }

  // Insertar metadata en la tabla files
  const row = {
    user_id: user.id,
    type: metadata.type || 'factura',
    name: metadata.name || filePath.split('/').pop(),
    storage_path: filePath,
    month: metadata.month || null,
    card_id: metadata.cardId || null,
    amount: metadata.amount != null ? Number(metadata.amount) : null,
    notes: metadata.notes || null,
  };

  const { data: fileRow, error: dbErr } = await admin.from('files').insert(row).select().single();

  if (dbErr) {
    await admin.storage.from(BUCKET).remove([filePath]).catch(() => {});
    return res.status(500).json({ error: 'Error al registrar: ' + dbErr.message });
  }

  return res.status(200).json(fileRow);
}
