const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const STALE_TTL = 24 * 60 * 60 * 1000; // 24 horas máximo
const LS_KEY = 'cotizaciones_fallback';
let _cache = null;
let _cacheTime = 0;

export async function fetchRates() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res;
  try {
    res = await fetch('https://dolarapi.com/v1/dolares', { signal: controller.signal });
  } catch {
    clearTimeout(timeout);
    return _loadFallback();
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) return _loadFallback();
  const data = await res.json();

  const get = (casa) => {
    const found = data.find(d => d.casa === casa);
    return found?.venta ? Math.round(found.venta) : null;
  };

  _cache = {
    tarjeta: get('tarjeta'),
    blue: get('blue'),
    oficial: get('oficial'),
    fetchedAt: Date.now(),
    stale: false,
  };
  _cacheTime = Date.now();

  try { localStorage.setItem(LS_KEY, JSON.stringify(_cache)); } catch { /* noop */ }

  return _cache;
}

function _loadFallback() {
  if (_cache) return { ..._cache, stale: true };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) {
      const age = Date.now() - (saved.fetchedAt || 0);
      if (age < STALE_TTL) {
        _cache = { ...saved, stale: true };
        return _cache;
      }
    }
  } catch { /* noop */ }
  return { tarjeta: null, blue: null, oficial: null, stale: true };
}
