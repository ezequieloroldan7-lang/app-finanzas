import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Reemplaza todos los confirm() nativos.
 * Props:
 *   open         — boolean
 *   title        — string
 *   description  — string (consecuencias de la acción)
 *   confirmLabel — string (default "Confirmar")
 *   danger       — boolean (si es true, botón rojo; si no, zinc)
 *   onConfirm    — () => void
 *   onCancel     — () => void
 */
function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
      const handleKey = (e) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${danger ? 'bg-red-950/50 border border-red-900/50' : 'bg-zinc-800 border border-zinc-700'}`}>
            {danger ? <Trash2 size={24} className="text-red-400" /> : <AlertTriangle size={24} className="text-amber-400" />}
          </div>

          <div>
            <h3 id="confirm-dialog-title" className="text-zinc-100 font-medium text-lg mb-1">{title}</h3>
            {description && (
              <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
            )}
          </div>

          <div className="flex gap-3 w-full pt-1">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-200 font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 rounded-2xl font-medium transition-colors ${
                danger
                  ? 'bg-red-500 text-white hover:bg-red-400'
                  : 'bg-zinc-100 text-zinc-950 hover:bg-white'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
