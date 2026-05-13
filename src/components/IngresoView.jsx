import { useMemo, useState } from 'react';
import { Plus, Trash2, Search, X, UserCircle2 } from 'lucide-react';
import { formatARS, convertToARS } from '../lib/formatters';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { MONTH_NAMES_SHORT } from '../constants';
import MonthSwitcher from './MonthSwitcher';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from 'recharts';

function IngresoView({ income, incomeCategories, onAdd, onDelete, onOpenProfile, currentDate: currentDateProp = null, onDateChange }) {
  const localNav = useMonthNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [chartRange, setChartRange] = useState(6); // 6 or 12

  const year = currentDateProp ? currentDateProp.getFullYear() : localNav.year;
  const month = currentDateProp ? currentDateProp.getMonth() : localNav.month;
  const prevMonth = currentDateProp
    ? () => onDateChange?.(new Date(year, month - 1, 1))
    : localNav.prevMonth;
  const nextMonth = currentDateProp
    ? () => onDateChange?.(new Date(year, month + 1, 1))
    : localNav.nextMonth;

  const monthIncome = useMemo(() => {
    return income
      .filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date + 'T12:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [income, year, month]);

  const total = useMemo(() =>
    monthIncome.reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0),
    [monthIncome],
  );

  const filteredIncome = useMemo(() => {
    if (!searchQuery.trim()) return monthIncome;
    const q = searchQuery.toLowerCase().trim();
    return monthIncome.filter(e => e.description.toLowerCase().includes(q));
  }, [monthIncome, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const historyData = useMemo(() => {
    const out = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = income.reduce((sum, e) => {
        if (!e.date) return sum;
        const ed = new Date(e.date + 'T12:00:00');
        if (ed.getFullYear() !== y || ed.getMonth() !== m) return sum;
        return sum + convertToARS(e.amount, e.currency, e.exchangeRate);
      }, 0);
      out.push({
        label: MONTH_NAMES_SHORT[m] + (m === 0 ? ` ${String(y).slice(2)}` : ''),
        total,
        isCurrent: y === year && m === month,
      });
    }
    return out;
  }, [income, year, month, chartRange]);

  const avgIncome = useMemo(() => {
    const nonZero = historyData.filter(d => d.total > 0);
    if (!nonZero.length) return 0;
    return nonZero.reduce((s, d) => s + d.total, 0) / nonZero.length;
  }, [historyData]);

  const hasHistory = historyData.some(d => d.total > 0);

  const byCat = useMemo(() => {
    const map = {};
    for (const e of monthIncome) {
      map[e.categoryId] = (map[e.categoryId] || 0) + convertToARS(e.amount, e.currency, e.exchangeRate);
    }
    return Object.entries(map)
      .map(([catId, t]) => ({ cat: incomeCategories.find(c => c.id === catId), total: t }))
      .filter(x => x.cat)
      .sort((a, b) => b.total - a.total);
  }, [monthIncome, incomeCategories]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
            <h1 className="text-2xl text-zinc-50 font-serif-display italic mt-0.5">Ingresos</h1>
          </div>
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              aria-label="Mi perfil"
              className="p-2 -mr-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <UserCircle2 size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="px-5 pt-6 space-y-4">
        {/* Month switcher */}
        <MonthSwitcher
          year={year}
          month={month}
          onPrev={prevMonth}
          onNext={nextMonth}
          onToday={() => {
            const t = new Date();
            if (currentDateProp) {
              onDateChange?.(new Date(t.getFullYear(), t.getMonth(), 1));
            } else {
              localNav.goToToday();
            }
          }}
        />

        {/* History chart */}
        {hasHistory && (
          <div className="bg-zinc-900 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Ingresos por mes</div>
                <div className="text-sm text-zinc-300 mt-0.5">Promedio: <span className="tabular-nums text-emerald-400">{formatARS(avgIncome)}</span></div>
              </div>
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setChartRange(6)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    chartRange === 6 ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  6m
                </button>
                <button
                  onClick={() => setChartRange(12)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    chartRange === 12 ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  12m
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={historyData} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(63,63,70,0.3)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                        <div className="text-zinc-500 mb-0.5">{label}</div>
                        <div className="text-emerald-400 font-medium tabular-nums">{formatARS(payload[0].value)}</div>
                      </div>
                    );
                  }}
                />
                {avgIncome > 0 && (
                  <ReferenceLine y={avgIncome} stroke="#52525b" strokeDasharray="3 3" />
                )}
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {historyData.map((d, i) => (
                    <Cell key={i} fill={d.isCurrent ? '#34d399' : '#10b98155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary */}
        {monthIncome.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl px-5 py-4 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Total del mes</div>
              <div className="text-3xl font-serif-display text-emerald-400 tabular-nums mt-1">
                {formatARS(total)}
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">
                {monthIncome.length} {monthIncome.length === 1 ? 'ingreso' : 'ingresos'}
              </div>
            </div>
            {byCat.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                {byCat.map(({ cat, total: t }) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-sm text-zinc-400 flex-1">{cat.name}</span>
                    <span className="text-sm font-medium tabular-nums text-zinc-200">{formatARS(t)}</span>
                    <span className="text-xs text-zinc-600 w-10 text-right">
                      {total > 0 ? Math.round((t / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search bar */}
        {monthIncome.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar ingresos..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
            />
            {isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Income list */}
        {monthIncome.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 mb-1">No hay ingresos este mes</p>
            <p className="text-xs text-zinc-600">Registrá sueldos, freelance, alquileres, etc.</p>
          </div>
        ) : filteredIncome.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl px-5 py-10 text-center text-zinc-600 text-sm">
            Sin resultados para &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIncome.map(inc => {
              const cat = incomeCategories.find(c => c.id === inc.categoryId);

              const ars = convertToARS(inc.amount, inc.currency, inc.exchangeRate);
              return (
                <div
                  key={inc.id}
                  className="bg-zinc-900 rounded-2xl px-4 py-3.5 flex items-center gap-3"
                >
                  <span className="text-xl shrink-0">{cat?.emoji || '💰'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{inc.description}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">
                      {inc.date} · {cat?.name || 'Sin categoría'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium tabular-nums text-emerald-400">
                      +{formatARS(ars)}
                    </div>
                    {inc.currency === 'USD' && (
                      <div className="text-xs text-zinc-600">US$ {inc.amount}</div>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(inc.id)}
                    aria-label="Eliminar"
                    className="p-1.5 rounded-full text-zinc-700 hover:text-red-400 hover:bg-zinc-800 transition-colors ml-1 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button
        onClick={onAdd}
        aria-label="Agregar ingreso"
        className="fixed right-5 z-30 h-14 w-14 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center hover:bg-emerald-300 active:scale-95 transition-all"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
          boxShadow: '0 10px 30px -5px rgba(52, 211, 153, 0.4), 0 0 0 1px rgba(52, 211, 153, 0.1)',
        }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default IngresoView;
