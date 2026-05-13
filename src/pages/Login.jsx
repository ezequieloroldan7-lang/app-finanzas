import { useState } from 'react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login({ onSignIn, onSignUp, onSignInWithGoogle }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const valid = email.trim() && password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const fn = mode === 'signin' ? onSignIn : onSignUp;
    const { error: err, data } = await fn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (mode === 'signup' && !data.session) {
      setInfo('Te mandamos un mail para confirmar la cuenta.');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: err } = await onSignInWithGoogle();
    if (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
    // On success, Supabase redirects to Google — page will navigate away
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-5 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-lime-400/[0.05] rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 bg-sky-400/[0.04] rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime-400/[0.025] rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative z-10 fade-in">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/20 mb-5 mx-auto">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {/* Bar chart going up */}
              <rect x="3" y="16" width="5" height="9" rx="1.5" fill="#a3e635" opacity="0.5"/>
              <rect x="11" y="10" width="5" height="15" rx="1.5" fill="#a3e635" opacity="0.75"/>
              <rect x="19" y="4" width="5" height="21" rx="1.5" fill="#a3e635"/>
              {/* Trend line */}
              <path d="M5.5 17L14 8.5L22 3" stroke="#bef264" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            </svg>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-1.5">
            Mis Finanzas
          </div>
          <h1 className="font-serif-display italic text-4xl text-zinc-50 leading-tight">
            {mode === 'signin' ? 'Bienvenido' : 'Crear cuenta'}
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            {mode === 'signin'
              ? 'Ingresá para ver tus finanzas'
              : 'Empezá a trackear tus gastos'}
          </p>
        </div>

        {/* Glass card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/70 rounded-3xl p-6 shadow-2xl shadow-black/40">
          {/* Google OAuth button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-3.5 rounded-2xl disabled:opacity-50 transition-all duration-200 border border-zinc-700/60 hover:border-zinc-600 active:scale-[0.98] mb-5"
          >
            {googleLoading ? (
              <span className="text-sm text-zinc-400">Redirigiendo…</span>
            ) : (
              <>
                <GoogleIcon />
                <span className="text-sm">Continuar con Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-zinc-800" />
            <span className="text-[11px] text-zinc-600 font-medium tracking-wide uppercase">o con email</span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vos@ejemplo.com"
                disabled={submitting || googleLoading}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-lime-400/60 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition-all duration-200 focus:ring-2 focus:ring-lime-400/10 text-sm disabled:opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                disabled={submitting || googleLoading}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-lime-400/60 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition-all duration-200 focus:ring-2 focus:ring-lime-400/10 text-sm disabled:opacity-50"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-lime-300 bg-lime-950/40 border border-lime-900/50 rounded-xl px-4 py-2.5">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={!valid || submitting}
              className="w-full bg-gradient-to-r from-lime-400 to-lime-300 text-zinc-950 font-semibold py-3.5 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:from-lime-300 enabled:hover:to-lime-200 enabled:active:scale-[0.98] transition-all duration-200 text-sm tracking-wide shadow-lg shadow-lime-400/20 mt-1"
            >
              {submitting
                ? 'Procesando…'
                : mode === 'signin'
                  ? 'Entrar'
                  : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-sm text-zinc-500">
          {mode === 'signin' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
            className="text-lime-400 hover:text-lime-300 font-semibold transition-colors"
          >
            {mode === 'signin' ? 'Crear una' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
