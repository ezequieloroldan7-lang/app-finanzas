import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { formatARS, formatUSD } from '../lib/formatters';

const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    const diff = target;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(diff * ease));
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

  // Format the animated total as parts: integer and decimals
  const totalStr = animatedTotal.toFixed(2);
  const [intPart, decPart] = totalStr.split('.');
  const formattedInt = Number(intPart).toLocaleString('es-AR');

  // Month label (currentMonth is 0-indexed month number or actual month index)
  const now = new Date();
  const monthLabel = MONTH_NAMES_SHORT[now.getMonth()];

  // Previous month label
  const prevMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthLabel = MONTH_NAMES_SHORT[prevMonthIdx];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[22px] p-[18px] mx-0 space-y-4">
      {/* Kicker */}
      <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-zinc-500">
        Gastaste en {monthLabel}
      </div>

      {/* Main amount */}
      <div className="flex items-baseline gap-0.5 leading-none">
        <span className="font-mono text-[16px] text-zinc-400 self-end mb-[6px]">$</span>
        <span className="font-mono text-[44px] font-medium text-zinc-100 tracking-[-1.5px] leading-none">
          {formattedInt}
        </span>
        <span className="font-mono text-[16px] text-zinc-500 self-end mb-[6px]">,{decPart}</span>
      </div>

      {/* Delta pill + vs label */}
      <div className="flex items-center gap-2">
        {hasDelta ? (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-[11px] ${
            deltaUp
              ? 'bg-red-400/10 border border-red-400/25 text-red-400'
              : 'bg-lime-400/10 border border-lime-400/25 text-lime-400'
          }`}>
            {deltaUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {(deltaUp ? '+' : '') + (delta * 100).toFixed(0)}%
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 font-mono text-[11px]">
            — sin cambio
          </span>
        )}
        <span className="font-mono text-[11px] text-zinc-500">vs {prevMonthLabel}</span>
      </div>

      {/* Budget bar */}
      {adjustedBudget > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-zinc-500">Presupuesto</span>
            <span className={`font-mono text-[10px] ${overBudget ? 'text-red-400' : 'text-zinc-500'}`}>
              {Math.round(budgetPct)}% usado
            </span>
          </div>
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
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
                    : '#bef264',
              }}
            />
          </div>
          {overBudget && (
            <div className="font-mono text-[10px] text-red-400">
              Superaste el presupuesto en {formatARS(total - adjustedBudget)}
            </div>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/40 rounded-xl px-3 py-2.5 border border-zinc-800">
          <div className="font-mono text-[10px] uppercase tracking-[1px] text-zinc-500 mb-1">Próximo mes</div>
          <div className="font-mono text-sm font-medium text-zinc-100">{formatARS(nextMonth)}</div>
        </div>
        <div className="bg-zinc-800/40 rounded-xl px-3 py-2.5 border border-zinc-800">
          <div className="font-mono text-[10px] uppercase tracking-[1px] text-zinc-500 mb-1">Items</div>
          <div className="font-mono text-sm font-medium text-zinc-100">{cuotasCount}</div>
        </div>
      </div>

      {/* Savings goal */}
      <GoalCard goal={goal} onOpen={onOpenGoal} />
    </div>
  );
}

function GoalCard({ goal, onOpen }) {
  if (!goal) {
    return (
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all duration-200 font-mono text-[11px] cursor-pointer active:scale-[0.98]"
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
      className="w-full text-left bg-lime-400/5 border border-lime-400/20 rounded-2xl px-3 py-3 hover:bg-lime-400/10 hover:border-lime-400/30 transition-all duration-200 cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-lime-400 font-medium">
          <Target size={12} />
          {goal.name}
        </div>
        <span className="font-mono text-[11px] text-zinc-400">{fmt(goal.amount)}</span>
      </div>
      {monthlyNeeded && (
        <div className="font-mono text-[10px] text-zinc-500">
          {fmt(monthlyNeeded)}/mes durante {monthsLeft} {monthsLeft === 1 ? 'mes' : 'meses'}
        </div>
      )}
      {!deadlineDate && (
        <div className="font-mono text-[10px] text-zinc-500">Sin fecha límite</div>
      )}
    </button>
  );
}

export default HeroKPI;
