import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MONTH_NAMES_SHORT } from '../constants';
import { formatARS } from '../lib/formatters';
import { getCuotasForMonth, getMonthlyTotals } from '../lib/aggregations';
import { monthKey } from '../lib/formatters';

function YearlyModal({ expenses, recurring, cards, categories, onClose }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = useMemo(() => {
    const totals = getMonthlyTotals(expenses, recurring, cards, year, 0, 12, 'all');
    return MONTH_NAMES_SHORT.map((label, i) => ({
      label,
      month: i,
      total: totals[monthKey(year, i)] || 0,
    }));
  }, [expenses, recurring, cards, year]);

  const yearTotal = monthlyData.reduce((s, m) => s + m.total, 0);
  const withData = monthlyData.filter(m => m.total > 0);
  const avgMonthly = withData.length > 0 ? yearTotal / withData.length : 0;
  const peak = monthlyData.reduce((a, b) => b.total > a.total ? b : a, monthlyData[0]);
  const maxTotal = Math.max(...monthlyData.map(m => m.total), 1);

  const categoryTotals = useMemo(() => {
    const by = {};
    for (let m = 0; m < 12; m++) {
      for (const c of getCuotasForMonth(expenses, recurring, cards, year, m, 'all')) {
        const id = c.expense.categoryId;
        by[id] = (by[id] || 0) + c.cuota.amount;
      }
    }
    return categories
      .map(cat => ({ ...cat, amount: by[cat.id] || 0 }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses, recurring, cards, categories, year]);

  return (
    <div className="fixed inset-0 z-40 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[92vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-zinc-100 text-lg font-medium">Resumen anual</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYear(y => y - 1)}
                disabled={year <= currentYear - 3}
                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-zinc-300 text-sm font-medium tabular-nums w-10 text-center">
                {year}
              </span>
              <button
                onClick={() => setYear(y => y + 1)}
                disabled={year >= currentYear}
                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {yearTotal === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-sm">
              Sin datos para {year}
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">
                  Total {year}
                </div>
                <div className="text-4xl font-serif-display italic text-zinc-50 tabular-nums">
                  {formatARS(yearTotal)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                    Promedio mensual
                  </div>
                  <div className="text-lg font-medium tabular-nums text-zinc-100">
                    {formatARS(avgMonthly)}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {withData.length} mes{withData.length !== 1 ? 'es' : ''} con datos
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                    Mes más caro
                  </div>
                  <div className="text-lg font-medium tabular-nums text-zinc-100">
                    {formatARS(peak.total)}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">{peak.label}</div>
                </div>
              </div>

              {/* Barras por mes */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">
                  Por mes
                </div>
                <div className="space-y-2">
                  {monthlyData.map(m => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-7 shrink-0">{m.label}</span>
                      <div className="flex-1 h-5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: m.total > 0 ? `${(m.total / maxTotal) * 100}%` : '0%',
                            background: m.month === peak.month && m.total > 0
                              ? '#bef264'
                              : '#3f3f46',
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-zinc-400 w-24 text-right shrink-0">
                        {m.total > 0 ? formatARS(m.total) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top categorías */}
              {categoryTotals.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">
                    Por categoría
                  </div>
                  <div className="space-y-2">
                    {categoryTotals.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: cat.color + '25' }}
                        >
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-300 truncate">{cat.name}</span>
                            <span className="text-xs tabular-nums text-zinc-400 ml-2 shrink-0">
                              {yearTotal > 0 ? Math.round((cat.amount / yearTotal) * 100) : 0}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(cat.amount / categoryTotals[0].amount) * 100}%`,
                                background: cat.color,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs tabular-nums text-zinc-300 w-24 text-right shrink-0">
                          {formatARS(cat.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

export default YearlyModal;
