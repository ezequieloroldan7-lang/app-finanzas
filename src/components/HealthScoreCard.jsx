import { Heart } from 'lucide-react';

const componentColor = (pct) => {
  if (pct > 75) return { text: 'text-lime-400', bg: 'bg-lime-400/15 border-lime-400/25', bar: 'from-lime-400 to-lime-300' };
  if (pct > 50) return { text: 'text-lime-500', bg: 'bg-lime-500/10 border-lime-500/20', bar: 'from-lime-500 to-lime-400' };
  if (pct > 25) return { text: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', bar: 'from-amber-400 to-amber-300' };
  return { text: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', bar: 'from-red-400 to-red-300' };
};

function HealthScoreCard({ score }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score.total / 100) * circumference;
  const components = [
    { label: 'Tendencia',    value: score.components.trendScore,  max: 25 },
    { label: 'Compromiso',   value: score.components.commitScore, max: 25 },
    { label: 'Cuotas',       value: score.components.longScore,   max: 25 },
    { label: 'Presupuesto',  value: score.components.budgetScore, max: 25 },
  ];

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-3xl p-5 relative overflow-hidden shadow-lg shadow-black/20">
      {/* Subtle glow matching score color */}
      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
        style={{ background: score.color }}
      />

      <div className="relative flex items-start justify-between gap-4 mb-5">
        {/* Left: label */}
        <div className="flex-1 pt-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-1.5">
            Salud financiera
          </div>
          <div className="text-zinc-100 font-semibold flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full"
              style={{ background: score.color + '22', border: `1px solid ${score.color}44` }}
            >
              <Heart size={12} style={{ color: score.color }} />
            </span>
            {score.label}
          </div>
        </div>

        {/* Right: circular arc */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            {/* Track */}
            <circle cx="50" cy="50" r="40" stroke="#27272a" strokeWidth="8" fill="none" />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={score.color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.32, 0.72, 0, 1)', filter: `drop-shadow(0 0 4px ${score.color}80)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-label={`Puntaje: ${score.total} de 100`}>
            <div className="font-serif-display italic text-3xl text-zinc-50 leading-none tabular-nums" aria-hidden="true">
              {score.total}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5" aria-hidden="true">/ 100</div>
          </div>
        </div>
      </div>

      {/* Component pills */}
      <div className="flex flex-wrap gap-2">
        {components.map(c => {
          const pct = (c.value / c.max) * 100;
          const { text, bg } = componentColor(pct);
          return (
            <div
              key={c.label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${text} ${bg}`}
            >
              <span>{c.label}</span>
              <span className="opacity-70 tabular-nums">{c.value}/{c.max}</span>
            </div>
          );
        })}
      </div>

      {/* Detail bars */}
      <div className="space-y-2.5 mt-4 pt-4 border-t border-zinc-800/60">
        {components.map(c => {
          const pct = (c.value / c.max) * 100;
          const { bar } = componentColor(pct);
          return (
            <div key={c.label} className="flex items-center gap-3 text-xs">
              <span className="text-zinc-400 w-24 shrink-0">{c.label}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-zinc-500 tabular-nums w-8 text-right">{c.value}/{c.max}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HealthScoreCard;
