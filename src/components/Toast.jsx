import { useEffect, useState } from 'react';
import { Heart, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function dismissToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return { toasts, showToast, dismissToast };
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))', left: 0, right: 0 }}
    >
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

const TOAST_STYLES = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-lime-400',
    bg: 'bg-lime-400/10',
    border: 'border-lime-400/20',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-red-400',
    bg: 'bg-red-950/40',
    border: 'border-red-900/40',
  },
  partner: {
    icon: Heart,
    iconClass: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    bg: 'bg-blue-950/40',
    border: 'border-blue-900/40',
  },
};

function Toast({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  const Icon = style.icon;

  return (
    <div className={`pointer-events-auto flex items-center gap-3 bg-zinc-800 border ${style.border} rounded-2xl px-4 py-3 shadow-xl transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className={`w-7 h-7 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
        <Icon size={14} className={style.iconClass} aria-hidden="true" />
      </div>
      <span className="text-sm text-zinc-100 flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
