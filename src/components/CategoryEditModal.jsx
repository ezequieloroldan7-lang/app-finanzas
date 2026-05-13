import { Trash2 } from 'lucide-react';
import { COLOR_PALETTE, EMOJI_OPTIONS } from '../constants';

function CategoryEditModal({ cat, onChange, onSave, onDelete, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 fade-in flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h4 className="text-zinc-100 font-medium mb-5">
          {cat.isNew ? 'Nueva categoría' : 'Editar categoría'}
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Nombre</label>
            <input
              value={cat.name}
              onChange={e => onChange({ ...cat, name: e.target.value })}
              className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Emoji</label>
            <div className="grid grid-cols-8 gap-1.5 mt-2">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => onChange({ ...cat, emoji: em })}
                  className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${
                    cat.emoji === em
                      ? 'bg-lime-300/20 ring-1 ring-lime-300'
                      : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Color</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => onChange({ ...cat, color: c })}
                  className={`w-9 h-9 rounded-full transition-all ${
                    cat.color === c
                      ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            {!cat.isNew && (
              <button
                onClick={onDelete}
                className="px-3 py-3 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-950/60 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={!cat.name.trim()}
              className="flex-1 py-3 rounded-xl bg-lime-300 text-zinc-950 font-medium enabled:hover:bg-lime-200 disabled:opacity-30 transition-all"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryEditModal;
