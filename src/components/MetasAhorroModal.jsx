import { useState } from 'react';
import { X, Target, Trash2 } from 'lucide-react';
import { formatARS, formatUSD } from '../lib/formatters';

function MetasAhorroModal({ goal, onSave, onClear, onClose }) {
  const [name, setName] = useState(goal?.name || '');
  const [amount, setAmount] = useState(goal?.amount?.toString() || '');
  const [currency, setCurrency] = useState(goal?.currency || 'ARS');
  const [deadline, setDeadline] = useState(goal?.deadline || '');

  const numAmount = parseFloat(amount) || 0;
  const valid = name.trim() && numAmount > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      name: name.trim(),
      amount: numAmount,
      currency,
      deadline: deadline || null,
      createdAt: goal?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[90vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-lime-400" />
            <h3 className="text-zinc-100 text-lg font-medium">Meta de ahorro</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">
              Nombre de la meta
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ej. Vacaciones, Auto, Colchón"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">
              Monto objetivo
            </label>
            <div className="flex gap-2 mb-3">
              {['ARS', 'USD'].map(cur => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    currency === cur
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
            <div className="flex items-baseline gap-2 border-b border-zinc-800 pb-2">
              <span className="text-zinc-500 text-2xl font-serif-display">
                {currency === 'USD' ? 'US$' : '$'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-zinc-50 text-3xl font-serif-display outline-none placeholder:text-zinc-700 min-w-0"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">
              Fecha límite <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!valid}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all bg-lime-300 text-zinc-950 hover:bg-lime-200 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {goal ? 'Actualizar meta' : 'Crear meta'}
          </button>

          {goal && (
            <button
              onClick={() => { onClear(); onClose(); }}
              className="w-full py-3 rounded-2xl font-medium text-sm text-red-400 hover:text-red-300 border border-zinc-800 hover:border-red-900/40 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={15} />
              Eliminar meta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetasAhorroModal;
