import { AlertTriangle } from 'lucide-react';
import { formatARS } from '../lib/formatters';

function CategoryBreakdown({ breakdown, total, budget }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-3xl p-5 shadow-lg shadow-black/20">
      <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-5">
        Por categoría
      </div>
      <div className="space-y-4">
        {breakdown.map(c => {
          const pct = total > 0 ? (c.amount / total) * 100 : 0;
          const limit = budget?.categoryLimits?.[c.id] || 0;
          const overLimit = limit > 0 && c.amount > limit;
          const limitPct = limit > 0 ? Math.min(100, (c.amount / limit) * 100) : 0;

          return (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-200 text-sm inline-flex items-center gap-2">
                  <span className="text-base leading-none">{c.emoji}</span>
                  <span>{c.name}</span>
                  {overLimit && (
                    <AlertTriangle size={11} className="text-red-400 shrink-0" />
                  )}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-zinc-600 text-xs tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                  <span className={`font-semibold tabular-nums text-sm ${overLimit ? 'text-red-400' : 'text-zinc-100'}`}>
                    {formatARS(c.amount)}
                  </span>
                </div>
              </div>

              {/* Progress bar with gradient */}
              <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: overLimit
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : `linear-gradient(90deg, ${c.color}cc, ${c.color})`,
                    boxShadow: `0 0 6px ${c.color}40`,
                  }}
                />
              </div>

              {/* Category budget indicator */}
              {limit > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-0.5 bg-zinc-800/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${overLimit ? 'bg-red-400/50' : 'bg-zinc-600/60'}`}
                      style={{ width: `${limitPct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] tabular-nums shrink-0 ${overLimit ? 'text-red-400' : 'text-zinc-600'}`}>
                    tope {formatARS(limit)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryBreakdown;
