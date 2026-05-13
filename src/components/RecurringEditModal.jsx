import { useState } from 'react';

function RecurringEditModal({ item, cards, categories, onChange, onSave, onClose }) {
  const [dayStr, setDayStr] = useState(String(item.dayOfMonth));

  const valid =
    item.description.trim() &&
    parseFloat(item.amount) > 0 &&
    item.cardId &&
    item.categoryId;

  function commitDay(raw) {
    const clamped = Math.min(31, Math.max(1, parseInt(raw) || 1));
    setDayStr(String(clamped));
    onChange({ ...item, dayOfMonth: clamped });
  }

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
          {item.isNew ? 'Nuevo recurrente' : 'Editar recurrente'}
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Descripción
            </label>
            <input
              value={item.description}
              onChange={e => onChange({ ...item, description: e.target.value })}
              placeholder="ej. Spotify"
              className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Moneda</label>
              <select
                value={item.currency}
                onChange={e => onChange({ ...item, currency: e.target.value })}
                className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2.5 text-zinc-100 outline-none"
              >
                <option>ARS</option>
                <option>USD</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Monto</label>
              <input
                type="number"
                inputMode="decimal"
                value={item.amount}
                onChange={e => onChange({ ...item, amount: e.target.value })}
                className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors tabular-nums"
              />
            </div>
          </div>
          {item.currency === 'USD' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Tipo de cambio
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={item.exchangeRate || ''}
                onChange={e => onChange({ ...item, exchangeRate: e.target.value })}
                placeholder="ej. 1100"
                className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Tarjeta</label>
            <div className="flex gap-2 flex-wrap mt-1.5">
              {cards.map(c => (
                <button
                  key={c.id}
                  onClick={() => onChange({ ...item, cardId: c.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    item.cardId === c.id
                      ? 'bg-lime-300/10 border-lime-300 text-lime-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Categoría</label>
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => onChange({ ...item, categoryId: c.id })}
                  className={`px-2.5 py-1 rounded-full text-xs border ${
                    item.categoryId === c.id
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Día del mes (1-31)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={dayStr}
              onChange={e => setDayStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => commitDay(dayStr)}
              className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Desde</label>
              <input
                type="date"
                value={item.startDate}
                onChange={e => onChange({ ...item, startDate: e.target.value })}
                className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Hasta (opt)
              </label>
              <input
                type="date"
                value={item.endDate || ''}
                onChange={e => onChange({ ...item, endDate: e.target.value })}
                className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={!valid}
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

export default RecurringEditModal;
