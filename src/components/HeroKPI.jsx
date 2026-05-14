import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatARS } from '../lib/formatters';

const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_NAMES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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

function HeroKPI({ total, delta, budget, monthlyInflation = 0, currentMonth = 0, displayYear, displayMonth }) {
  const animatedTotal = useCountUp(total);

  const adjustedBudget = budget > 0 && monthlyInflation > 0
    ? Math.round(budget * Math.pow(1 + monthlyInflation / 100, currentMonth))
    : budget;
  const budgetPct = adjustedBudget > 0 ? Math.min(100, (total / adjustedBudget) * 100) : 0;
  const overBudget = adjustedBudget > 0 && total > adjustedBudget;
  const hasDelta = delta !== 0 && !isNaN(delta) && isFinite(delta);
  const deltaUp = delta > 0;

  const totalStr = animatedTotal.toFixed(2);
  const [intPart, decPart] = totalStr.split('.');
  const formattedInt = Number(intPart).toLocaleString('es-AR');

  // Use displayYear/displayMonth if provided, else fallback to today
  const now = new Date();
  const refYear = displayYear ?? now.getFullYear();
  const refMonth = displayMonth ?? now.getMonth();
  const isCurrentMonth = refYear === now.getFullYear() && refMonth === now.getMonth();

  const monthFullLabel = MONTH_NAMES_FULL[refMonth];
  const prevMonthIdx = refMonth === 0 ? 11 : refMonth - 1;
  const prevMonthLabel = MONTH_NAMES_SHORT[prevMonthIdx];

  // Date display: "26 May" (today if current month, else last day of month)
  const dateDisplay = isCurrentMonth
    ? `${now.getDate()} ${MONTH_NAMES_SHORT[now.getMonth()]}`
    : `${new Date(refYear, refMonth + 1, 0).getDate()} ${MONTH_NAMES_SHORT[refMonth]}`;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[22px] p-[18px] mx-0 space-y-4">
      {/* Header row: kicker + date */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-zinc-500">
          Gastaste en {monthFullLabel}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-600">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {dateDisplay}
        </div>
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
            <span className="font-mono text-[10px] text-zinc-500">
              de {formatARS(adjustedBudget)} <span className="uppercase tracking-[1px]">Presupuesto</span>
            </span>
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
    </div>
  );
}

export default HeroKPI;
