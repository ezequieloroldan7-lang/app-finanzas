import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { formatARS, formatUSD } from '../lib/formatters';

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    const start = 0;
    const diff = target - start;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * ease));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [target, duration]);

  return value;
}

function HeroKPI({ total, nextMonth, delta, cuotasCount, budget, monthlyInflation = 0, currentMonth = 0, goal, onOpenGoal }) {
  const animatedTotal = useCountUp(total);

  const adjustedBudget = budget > 0 && monthlyInflation > 0
    ? Math.round(budget * Math.pow(1 + monthlyInflation / 100, currentMonth))
    : budget;
  const budgetPct = adjustedBudget > 0 ? Math.min(100, (total / adjustedBudget) * 100) : 0;
  const overBudget = adjustedBudget > 0 && total > adjustedBudget;
  const hasDelta = delta !== 0 && !isNaN(delta) && isFinite(delta);
  const deltaUp = delta > 0;

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/60 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-black/30 transition-all duration-300 hover:border-zinc-700/60 fade-in-up">
      {/* Decorative glow */}
      <div className="absolute -top-28 -right-28 w-80 h-80 bg-lime-400/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-400/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        {/* Label */}
        <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-3">
          Total a pagar
        </div>

        {/* Main KPI number with count-up */}
        <div className="font-serif-display italic text-5xl text-zinc-50 leading-none tracking-tight tabular-nums count-up">
          {formatARS(animatedTotal)}
        </div>

        {/* Delta badge */}
        <div className="mt-3 flex items-center gap-2.5">
          {hasDelta ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                deltaUp
                  ? 'text-red-400 bg-red-400/10 border-red-400/20'
                  : 'text-lime-400 bg-lime-400/10 border-lime-400/20'
              }`}
            >
              {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {(deltaUp ? '+' : '') + (delta * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border text-zinc-600 border-zinc-800 bg-zinc-900/50">
              — sin cambio
            </span>
          )}
          <span className="text-zinc-500 text-xs">vs. mes anterior</span>
        </div>

        {/* Budget bar */}
        {budget > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-zinc-500">
                Presupuesto{monthlyInflation > 0 ? ` (ajustado ${monthlyInflation}%/mes)` : ''}
              </span>
              <span className={`font-medium tabular-nums ${overBudget ? 'text-red-400' : 'text-zinc-400'}`}>
                {formatARS(total)} / {formatARS(adjustedBudget)}
              </span>
            </div>
            <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
              <div
                role="progressbar"
                aria-valuenow={Math.round(budgetPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Uso del presupuesto"
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${budgetPct}%`,
                  background: overBudget
                    ? 'linear-gradient(90deg, #f87171, #ef4444)'
                    : budgetPct > 85
                      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(90deg, #bef264, #84cc16)',
                }}
              />
            </div>
            {overBudget && (
              <div className="text-[10px] text-red-400 mt-1.5 font-medium">
                Superaste el presupuesto en {formatARS(total - adjustedBudget)}
              </div>
            )}
            {!overBudget && budgetPct > 85 && (
              <div className="text-[10px] text-amber-400 mt-1.5 font-medium">⚠ Cerca del límite de presupuesto</div>
            )}
          </div>
        )}

        {/* Footer stats */}
        <div className="mt-5 pt-5 border-t border-zinc-800/60 grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 rounded-2xl px-3 py-2.5 border border-zinc-800/40 transition-colors hover:border-zinc-700/60">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-1">Próximo mes</div>
            <div className="text-zinc-100 font-semibold tabular-nums text-sm">
              {formatARS(nextMonth)}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-2xl px-3 py-2.5 border border-zinc-800/40 transition-colors hover:border-zinc-700/60">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-1">Items</div>
            <div className="text-zinc-100 font-semibold tabular-nums text-sm">
              {cuotasCount}
            </div>
          </div>
        </div>

        {/* Savings goal */}
        <GoalCard goal={goal} onOpen={onOpenGoal} />
      </div>
    </div>
  );
}

function GoalCard({ goal, onOpen }) {
  if (!goal) {
    return (
      <button
        onClick={onOpen}
        className="mt-4 w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all duration-200 text-xs cursor-pointer active:scale-[0.98]"
      >
        <Target size={14} />
        Agregar meta de ahorro
      </button>
    );
  }

  const fmt = goal.currency === 'USD' ? formatUSD : formatARS;
  const deadlineDate = goal.deadline ? new Date(goal.deadline + 'T12:00:00') : null;
  const now = new Date();

  let monthsLeft = null;
  let monthlyNeeded = null;
  if (deadlineDate && deadlineDate > now) {
    monthsLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24 * 30));
    monthlyNeeded = goal.amount / monthsLeft;
  }

  return (
    <button
      onClick={onOpen}
      className="mt-4 w-full text-left bg-lime-400/5 border border-lime-400/20 rounded-2xl px-3 py-3 hover:bg-lime-400/10 hover:border-lime-400/30 transition-all duration-200 cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-lime-400 font-semibold">
          <Target size={12} />
          {goal.name}
        </div>
        <span className="text-xs text-zinc-400 font-semibold tabular-nums">{fmt(goal.amount)}</span>
      </div>
      {monthlyNeeded && (
        <div className="text-[10px] text-zinc-500">
          {fmt(monthlyNeeded)}/mes durante {monthsLeft} {monthsLeft === 1 ? 'mes' : 'meses'}
        </div>
      )}
      {!deadlineDate && (
        <div className="text-[10px] text-zinc-500">Sin fecha límite</div>
      )}
    </button>
  );
}

export default HeroKPI;
