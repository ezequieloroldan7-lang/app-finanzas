import { useMemo, useState } from 'react';
import { Plus, Settings, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { getAdjustedClosingDate } from '../lib/cuotas';
import { formatARS, monthKey } from '../lib/formatters';
import { getCuotasForMonth, getMonthlyTotals, getMoMByCategory } from '../lib/aggregations';
import { MONTH_NAMES_SHORT } from '../constants';
import CardComparisonChart from './CardComparisonChart';
import CategoryStackedChart from './CategoryStackedChart';
import MonthSwitcher from './MonthSwitcher';
import ExpenseList from './ExpenseList';
import EmptyState from './EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function getNextClosingDate(card) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);
  const thisMonth = getAdjustedClosingDate(y, m, card.closingDay, card.closingDates || {});
  if (thisMonth.toISOString().slice(0, 10) >= todayStr) return thisMonth;
  const next = new Date(y, m + 1, 1);
  return getAdjustedClosingDate(next.getFullYear(), next.getMonth(), card.closingDay, card.closingDates || {});
}

function CardTile({ card, monthTotal, cuotasCount, cuotas, expenses, recurring, cards, categories, onEdit, onEditExpense, onDeleteExpense }) {
  const nextClosing = getNextClosingDate(card);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((nextClosing - today) / (1000 * 60 * 60 * 24));
  const closingStr = nextClosing.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const [expanded, setExpanded] = useState(false);

  const todayFull = new Date();
  const currentYear = todayFull.getFullYear();
  const currentMonth = todayFull.getMonth();

  const historyData = useMemo(() => {
    if (!expanded) return [];
    const months = 12;
    const fromDate = new Date(currentYear, currentMonth - (months - 1), 1);
    const fromY = fromDate.getFullYear();
    const fromM = fromDate.getMonth();
    const totals = getMonthlyTotals(expenses, recurring, cards, fromY, fromM, months, card.id);
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(fromY, fromM + i, 1);
      const k = monthKey(d.getFullYear(), d.getMonth());
      return { label: MONTH_NAMES_SHORT[d.getMonth()], amount: totals[k] || 0 };
    });
  }, [expanded, card.id, expenses, recurring, cards, currentYear, currentMonth]);

  const catData = useMemo(() => {
    if (!expanded) return [];
    return getMoMByCategory(expenses, recurring, cards, categories, currentYear, currentMonth, card.id);
  }, [expanded, card.id, expenses, recurring, cards, categories, currentYear, currentMonth]);

  return (
    <div
      className="relative rounded-3xl p-5 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${card.color}18 0%, ${card.color}06 100%)`,
        border: `1px solid ${card.color}28`,
      }}
    >
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Tarjeta de crédito</div>
          <div className="text-xl font-medium text-zinc-100 mt-0.5">{card.name}</div>
        </div>
        <button
          onClick={onEdit}
          aria-label="Configuración"
          className="p-2 rounded-full text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Este mes</div>
          <div className="text-2xl font-serif-display text-zinc-100 tabular-nums mt-0.5">
            {formatARS(monthTotal)}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">
            {cuotasCount} {cuotasCount === 1 ? 'pago' : 'pagos'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Próx. cierre</div>
          <div className="text-sm font-medium text-zinc-300 mt-0.5">{closingStr}</div>
          <div className={`text-xs mt-0.5 ${daysUntil <= 3 ? 'text-amber-400' : 'text-zinc-600'}`}>
            {daysUntil === 0 ? '¡Hoy!' : daysUntil === 1 ? 'Mañana' : `en ${daysUntil} días`}
          </div>
        </div>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-4 w-full flex items-center justify-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
      >
        {expanded ? <><ChevronUp size={14} /> Ocultar detalle</> : <><ChevronDown size={14} /> Ver compras y historial</>}
      </button>

      {/* Expanded: expense list + 12-month history + categories */}
      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Compras del mes seleccionado */}
          <ExpenseList
            cuotas={cuotas}
            categories={categories}
            cards={cards}
            onEdit={onEditExpense || (() => {})}
            onDelete={onDeleteExpense || (() => {})}
          />

          {historyData.length > 0 && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mb-2">Últimos 12 meses</div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={historyData} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
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
                            <div className="text-zinc-100 font-medium">{formatARS(payload[0].value)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="amount" fill={card.color} radius={[3, 3, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {catData.some(d => categories.some(c => d[c.id] > 0)) && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mb-2">Por categoría · 6 meses</div>
                  <CategoryStackedChart data={catData} categories={categories} months={6} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Decorative circle */}
      <div
        className="absolute bottom-0 right-0 w-36 h-36 rounded-full opacity-[0.06] translate-x-12 translate-y-12 pointer-events-none"
        style={{ background: card.color }}
      />
      <div
        className="absolute top-5 right-14 w-3 h-3 rounded-full opacity-60"
        style={{ background: card.color }}
      />
    </div>
  );
}

function TarjetasView({ cards, expenses, recurring, categories, onOpenSettings, onEditExpense, onDeleteExpense, currentDate: currentDateProp = null, onDateChange }) {
  const todayInit = new Date();
  const [localDate, setLocalDate] = useState(
    () => new Date(todayInit.getFullYear(), todayInit.getMonth(), 1)
  );
  const [searchQuery, setSearchQuery] = useState('');

  const currentDate = currentDateProp ?? localDate;
  const setCurrentDate = (d) => { onDateChange ? onDateChange(d) : setLocalDate(d); };
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const allCuotas = useMemo(
    () => getCuotasForMonth(expenses, recurring, cards, year, month, 'all'),
    [expenses, recurring, cards, year, month],
  );

  const filteredCuotas = useMemo(() => {
    if (!searchQuery.trim()) return allCuotas;
    const q = searchQuery.toLowerCase().trim();
    return allCuotas.filter(({ expense }) =>
      expense.description.toLowerCase().includes(q)
    );
  }, [allCuotas, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const totalMes = allCuotas.reduce((s, c) => s + c.cuota.amount, 0);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">Mis finanzas</div>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-2xl text-zinc-50 font-serif-display italic">Tarjetas</h1>
          <button
            onClick={onOpenSettings}
            aria-label="Configuración"
            className="p-2 -mr-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="px-5 pt-6 space-y-4">
        <MonthSwitcher
          year={year}
          month={month}
          onPrev={() => setCurrentDate(new Date(year, month - 1, 1))}
          onNext={() => setCurrentDate(new Date(year, month + 1, 1))}
          onToday={() => {
            const n = new Date();
            setCurrentDate(new Date(n.getFullYear(), n.getMonth(), 1));
          }}
        />

        {/* Search bar */}
        {cards.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar compras..."
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

        {/* Search results */}
        {isSearching ? (
          <div>
            <div className="text-xs text-zinc-500 mb-2 px-1">
              {filteredCuotas.length} resultado{filteredCuotas.length !== 1 ? 's' : ''} para &ldquo;{searchQuery}&rdquo;
            </div>
            {filteredCuotas.length === 0 ? (
              <div className="bg-zinc-900 rounded-2xl px-5 py-10 text-center text-zinc-600 text-sm">
                Sin resultados
              </div>
            ) : (
              <ExpenseList
                cuotas={filteredCuotas}
                categories={categories}
                cards={cards}
                onEdit={onEditExpense || (() => {})}
                onDelete={onDeleteExpense || (() => {})}
              />
            )}
          </div>
        ) : (
          <>
            {cards.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl px-5 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Total tarjetas</div>
                <div className="text-3xl font-serif-display text-zinc-100 tabular-nums mt-1">
                  {formatARS(totalMes)}
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">{allCuotas.length} pago{allCuotas.length !== 1 ? 's' : ''} · {cards.length} tarjeta{cards.length !== 1 ? 's' : ''}</div>
              </div>
            )}

            {cards.length === 0 ? (
              <EmptyState
                onAdd={() => onOpenSettings('tarjetas')}
                onImport={() => onOpenSettings('tarjetas')}
              />
            ) : (
              <>
                {/* Comparison chart — only if 2+ cards */}
                {cards.length >= 2 && (
                  <CardComparisonChart
                    cards={cards}
                    expenses={expenses}
                    recurring={recurring}
                    currentYear={year}
                    currentMonth={month}
                    months={12}
                  />
                )}

                {/* Individual cards */}
                {cards.map(card => {
                  const cardCuotas = allCuotas.filter(c => c.expense.cardId === card.id);
                  const monthTotal = cardCuotas.reduce((s, c) => s + c.cuota.amount, 0);
                  return (
                    <CardTile
                      key={card.id}
                      card={card}
                      monthTotal={monthTotal}
                      cuotasCount={cardCuotas.length}
                      cuotas={cardCuotas}
                      expenses={expenses}
                      recurring={recurring}
                      cards={cards}
                      categories={categories}
                      onEdit={onOpenSettings}
                      onEditExpense={onEditExpense}
                      onDeleteExpense={onDeleteExpense}
                    />
                  );
                })}

                <button
                  onClick={onOpenSettings}
                  className="w-full py-4 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Agregar tarjeta
                </button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default TarjetasView;
