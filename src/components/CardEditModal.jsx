import { useMemo, useState } from 'react';
import { COLOR_PALETTE } from '../constants';
import { MONTH_NAMES_SHORT } from '../constants';
import { getAdjustedClosingDate } from '../lib/cuotas';

function CardEditModal({ card, onChange, onSave, onClose }) {
  const [closingStr, setClosingStr] = useState(String(card.closingDay));
  // Parsed per-month overrides { "YYYY-MM": day }
  const [closingDates, setClosingDates] = useState(card.closingDates || {});
  // Raw input strings per month (for controlled editing before blur)
  const [monthInputs, setMonthInputs] = useState(() => {
    const init = {};
    Object.entries(card.closingDates || {}).forEach(([k, v]) => { init[k] = String(v); });
    return init;
  });

  function commitClosing(raw) {
    const clamped = Math.min(31, Math.max(1, parseInt(raw) || 1));
    setClosingStr(String(clamped));
    onChange({ ...card, closingDay: clamped, closingDates });
  }

  function commitMonthClosing(key, raw) {
    const val = raw.trim();
    if (!val) {
      clearMonthClosing(key);
      return;
    }
    const day = parseInt(val);
    if (isNaN(day)) {
      // Revert input to saved value or empty
      setMonthInputs(prev => ({ ...prev, [key]: closingDates[key] ? String(closingDates[key]) : '' }));
      return;
    }
    const clamped = Math.min(31, Math.max(1, day));
    const next = { ...closingDates, [key]: clamped };
    setClosingDates(next);
    setMonthInputs(prev => ({ ...prev, [key]: String(clamped) }));
    onChange({ ...card, closingDay: parseInt(closingStr) || card.closingDay, closingDates: next });
  }

  function clearMonthClosing(key) {
    const next = { ...closingDates };
    delete next[key];
    setClosingDates(next);
    setMonthInputs(prev => { const n = { ...prev }; delete n[key]; return n; });
    onChange({ ...card, closingDay: parseInt(closingStr) || card.closingDay, closingDates: next });
  }

  // Months to display: 12 past + current + 2 future, most recent first
  const monthRange = useMemo(() => {
    const today = new Date();
    const range = [];
    for (let i = 2; i >= -12; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      range.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return range;
  }, []);

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
          {card.isNew ? 'Nueva tarjeta' : 'Editar tarjeta'}
        </h4>
        <div className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Nombre
            </label>
            <input
              value={card.name}
              onChange={e => onChange({ ...card, name: e.target.value, closingDates })}
              className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Día de cierre nominal */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Día de cierre (por defecto)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={closingStr}
              onChange={e => setClosingStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => commitClosing(closingStr)}
              className="w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Cierre real por mes */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Cierre real por mes
            </label>
            <p className="text-[10px] text-zinc-600 mt-0.5 mb-2">
              Ingresá el día en que cerró cada resumen. Los meses sin valor usan el día por defecto ajustado por fin de semana.
            </p>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
              {monthRange.map(({ year, month }) => {
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                const hasOverride = closingDates[key] !== undefined;
                const nominalDay = parseInt(closingStr) || card.closingDay;
                const autoDay = getAdjustedClosingDate(year, month, nominalDay).getDate();
                const inputVal = monthInputs[key] ?? '';
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-16 shrink-0 tabular-nums">
                      {MONTH_NAMES_SHORT[month]} {year}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={inputVal}
                      placeholder={String(autoDay)}
                      onChange={e =>
                        setMonthInputs(prev => ({
                          ...prev,
                          [key]: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      onBlur={e => commitMonthClosing(key, e.target.value)}
                      className={`w-10 text-center rounded-lg px-1 py-1 text-sm outline-none transition-colors border ${
                        hasOverride
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-100 focus:border-lime-400/60'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-600 placeholder:text-zinc-700 focus:border-zinc-600 focus:text-zinc-100'
                      }`}
                    />
                    {hasOverride && (
                      <button
                        onClick={() => clearMonthClosing(key)}
                        className="text-zinc-600 hover:text-red-400 transition-colors leading-none text-base"
                        title="Eliminar override"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Color
            </label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => onChange({ ...card, color: c, closingDates })}
                  className={`w-9 h-9 rounded-full transition-all ${
                    card.color === c
                      ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={!card.name.trim()}
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

export default CardEditModal;
