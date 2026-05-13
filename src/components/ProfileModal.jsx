import { useState, useRef, useEffect } from 'react';
import { X, Camera, User, Mail, LogOut, Settings, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const EXCHANGE_OPTIONS = [
  { value: 'blue', label: 'Blue' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'oficial', label: 'Oficial' },
];

export default function ProfileModal({ userId, userEmail, onClose, onSignOut, onOpenSettings }) {
  const [displayName, setDisplayName] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState(
    () => { try { return localStorage.getItem(`pref_currency_${userId}`) || 'ARS'; } catch { return 'ARS'; } },
  );
  const [defaultExchange, setDefaultExchange] = useState(
    () => { try { return localStorage.getItem(`pref_exchange_${userId}`) || 'tarjeta'; } catch { return 'tarjeta'; } },
  );
  const fileRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      const meta = data.user.user_metadata || {};
      setDisplayName(meta.full_name || meta.name || '');
      // Auth metadata is the primary source; localStorage is a fallback for
      // sessions where the Supabase update succeeded but auth state is stale.
      const photo = meta.avatar_url
        || ((() => { try { return localStorage.getItem(`avatar_${userId}`); } catch { return null; } })())
        || null;
      setPhotoPreview(photo);
    });
  }, [userId]);

  // Resize image to max 256x256 and return data URL — keeps user_metadata small.
  const resizeToDataURL = (file, maxSize = 256, quality = 0.85) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (ev) => { img.src = ev.target.result; };
      reader.onerror = reject;
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      reader.readAsDataURL(file);
    });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('La foto no puede superar los 10 MB'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let avatarUrl = photoPreview && !photoFile ? photoPreview : undefined;

      if (photoFile) {
        // Try Supabase Storage first (preferred — supports large originals).
        let storageOk = false;
        try {
          const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${userId}/avatar.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
            avatarUrl = `${urlData?.publicUrl}?t=${Date.now()}`;
            storageOk = true;
          }
        } catch {
          // fall through to data URL fallback
        }
        // Fallback: resize + store as data URL inside auth user_metadata.
        if (!storageOk) {
          try {
            avatarUrl = await resizeToDataURL(photoFile, 256, 0.85);
          } catch {
            avatarUrl = photoPreview; // last resort
          }
        }
      }

      const metaUpdate = { full_name: displayName.trim() };
      if (avatarUrl !== undefined) metaUpdate.avatar_url = avatarUrl;

      const { error: updateErr } = await supabase.auth.updateUser({ data: metaUpdate });
      if (updateErr) throw updateErr;
      if (avatarUrl) {
        setPhotoPreview(avatarUrl);
        try { localStorage.setItem(`avatar_${userId}`, avatarUrl); } catch {}
      }

      try {
        localStorage.setItem(`pref_currency_${userId}`, preferredCurrency);
        localStorage.setItem(`pref_exchange_${userId}`, defaultExchange);
      } catch {}

      setPhotoFile(null);
      setSuccess('¡Perfil actualizado!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('No se pudo actualizar: ' + (e?.message || 'error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const initials = (displayName || userEmail || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-sm bg-zinc-900 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">Mi perfil</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 -mr-2 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative group focus:outline-none"
              aria-label="Cambiar foto de perfil"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-violet-500 transition-all"
                  onError={() => setPhotoPreview(null)}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-zinc-800 ring-2 ring-zinc-700 group-hover:ring-violet-500 flex items-center justify-center text-3xl font-medium text-zinc-300 transition-all">
                  {initials}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-violet-400 rounded-full flex items-center justify-center border-2 border-zinc-900 group-hover:bg-violet-300 transition-colors">
                <Camera size={14} className="text-zinc-950" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <span className="text-[11px] text-zinc-600">Tocá para cambiar la foto</span>
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 block mb-1.5">
              Nombre
            </label>
            <div className="flex items-center gap-2.5 bg-zinc-800 border border-zinc-700 focus-within:border-violet-500 rounded-2xl px-3.5 py-2.5 transition-colors">
              <User size={15} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 block mb-1.5">
              Email
            </label>
            <div className="flex items-center gap-2.5 bg-zinc-800/40 border border-zinc-800 rounded-2xl px-3.5 py-2.5">
              <Mail size={15} className="text-zinc-600 shrink-0" />
              <span className="text-sm text-zinc-500 select-none">{userEmail}</span>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 pt-1">Preferencias</p>

            <div>
              <p className="text-xs text-zinc-400 mb-2">Moneda preferida</p>
              <div className="flex gap-2">
                {['ARS', 'USD'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPreferredCurrency(c)}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all border ${
                      preferredCurrency === c
                        ? 'bg-violet-400/15 border-violet-400/40 text-violet-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-400 mb-2">Tipo de cambio por defecto</p>
              <div className="flex gap-2">
                {EXCHANGE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDefaultExchange(value)}
                    className={`flex-1 py-2.5 rounded-2xl text-xs font-medium transition-all border ${
                      defaultExchange === value
                        ? 'bg-violet-400/15 border-violet-400/40 text-violet-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-400">
              {success}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-violet-400 text-zinc-950 font-semibold rounded-2xl hover:bg-violet-300 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {/* Ajustes shortcut group */}
          {onOpenSettings && (
            <div className="pt-3 border-t border-zinc-800 space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Ajustes</p>
              {[
                { id: 'tarjetas', label: 'Tarjetas' },
                { id: 'categorias', label: 'Categorías' },
                { id: 'recurrentes', label: 'Gastos recurrentes' },
                { id: 'presupuesto', label: 'Presupuesto' },
                { id: 'datos', label: 'Datos e importación' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => onOpenSettings(item.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-200 transition-colors text-left"
                >
                  <Settings size={14} className="text-zinc-500" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={14} className="text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-zinc-500 hover:text-red-400 text-sm transition-colors rounded-2xl hover:bg-zinc-800"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>

          {/* Bottom padding for mobile */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
