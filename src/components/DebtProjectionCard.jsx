import { useMemo } from 'react';
import { CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { formatARS, monthKey } from '../lib/formatters';
import { getCuotasDistribution } from '../lib/cuotas';
import { MONTH_NAMES_SHORT } from '../constants';

const MONTH_NAMES_ES = [
  'ene','feb','mar','abr','may','jun',
  'jul','ago','sep','oct','nov','dic',
];

function DebtProjectionCard({ expenses, cards, currentYear, currentMonth }) {
  const projections = useMemo(() => {
    if (!cards.length || !expenses.length) return [];

    return cards.map(card => {
      const cardExpenses = expenses.filter(e => e.cardId === card.id && e.totalCuotas > 1);

      let totalRemaining = 0;
      let lastYear = currentYear;
      let lastMonth = currentMonth;

      for (const exp of cardExpenses) {
        const dist = getCuotasDistribution(exp, cards);
        for (const c of dist) {
          const isAfterNow =
            c.year > currentYear || (c.year === currentYear && c.month >= currentMonth);
          if (isAfterNow) {
            totalRemaining += c.amount;
            if (c.year > lastYear || (c.year === lastYear && c.month > lastMonth)) {
              lastYear = c.year;
              lastMonth = c.month;
            }
          }
        }
      }

      const monthsUntilFree =
        (lastYear - currentYear) * 12 + (lastMonth - currentMonth);

      return {
        card,
        totalRemaining,
        lastYear,
        lastMonth,
        monthsUntilFree,
        hasDebt: totalRemaining > 0,
      };
    }).filter(p => p.hasDebt).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [expenses, cards, currentYear, currentMonth]);

  if (projections.length === 0) return null;

  const maxMonths = Math.max(...projections.map(p => p.monthsUntilFree), 1);
  const maxDebt = Math.max(...projections.map(p => p.totalRemaining), 1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 fade-in-up">
      {/* Header */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
          Proyección de deuda
        </div>
        <div className="text-zinc-100 font-medium mt-0.5">Cuotas pendientes por tarjeta</div>
      </div>

      <div className="space-y-4">
        {projections.map(({ card, totalRemaining, lastYear, lastMonth, monthsUntilFree }) => {
          const barPct = Math.round((totalRemaining / maxDebt) * 100);
          const isSoon = monthsUntilFree <= 3;
          const freeLabel = monthsUntilFree === 0
            ? 'Este mes'
            : `${MONTH_NAMES_ES[lastMonth]} ${lastYear}`;

          return (
            <div key={card.id}>
              {/* Card name + debt-free date */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: card.color || '#52525b' }}
                  />
                  <span className="text-xs text-zinc-300 font-medium">{card.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isSoon ? (
                    <CheckCircle2 size={11} className="text-emerald-400" />
                  ) : (
                    <Clock size={11} className="text-zinc-500" />
                  )}
                  <span className={`text-[10px] font-medium tabular-nums ${isSoon ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    libre en {freeLabel}
                  </span>
                </div>
              </div>

              {/* Debt amount + bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${barPct}%`,
                      background: isSoon
                        ? 'linear-gradient(90deg, #34d399, #10b981)'
                        : `linear-gradient(90deg, ${card.color || '#84cc16'}99, ${card.color || '#84cc16'})`,
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums text-zinc-300 font-medium shrink-0 w-24 text-right">
                  {formatARS(totalRemaining)}
                </span>
              </div>

              {/* Months remaining pill */}
              <div className="mt-1">
                <span className={`text-[10px] ${isSoon ? 'text-emerald-400/70' : 'text-zinc-600'}`}>
                  {monthsUntilFree === 0 ? 'Última cuota este mes' : `${monthsUntilFree} ${monthsUntilFree === 1 ? 'mes' : 'meses'} restantes`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Deuda total en cuotas</span>
        <span className="text-sm font-semibold tabular-nums text-zinc-100">
          {formatARS(projections.reduce((s, p) => s + p.totalRemaining, 0))}
        </span>
      </div>
    </div>
  );
}

export default DebtProjectionCard;
