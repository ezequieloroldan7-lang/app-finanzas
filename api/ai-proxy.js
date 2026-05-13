import { createClient } from '@supabase/supabase-js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Accept both VITE_ prefixed (browser build) and plain (server-only) env vars
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// For auth validation we can use the anon key (getUser only needs a valid JWT, not admin access)
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.APP_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  try {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).end();

    if (!GROQ_API_KEY) {
      console.error('ai-proxy: GROQ_API_KEY not configured');
      return res.status(503).json({ error: 'AI service not configured' });
    }

    // Validar JWT de Supabase (skip if supabase client couldn't be created)
    if (supabase) {
      const token = req.headers['authorization']?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });
      } catch (authErr) {
        console.error('ai-proxy: auth error:', authErr);
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { messages, max_tokens = 800, temperature = 0.7, type = 'chat' } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages' });
    }

    // Límite de tokens según tipo de request
    const maxTok = type === 'category' ? 20 : Math.min(max_tokens, 1000);

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: maxTok,
        temperature,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', groqRes.status, errText);
      return res.status(groqRes.status).json({ error: 'AI service error' });
    }

    const data = await groqRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('ai-proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
