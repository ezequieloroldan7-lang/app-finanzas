function getScoreMessage(total) {
  if (total >= 85) return 'Excelente';
  if (total >= 70) return 'Vas bien';
  if (total >= 50) return 'Puede mejorar';
  if (total >= 30) return 'Con cuidado';
  return 'Atención';
}

function HealthScoreCard({ score }) {
  const radius = 38;
  const strokeWidth = 6;
  const size = 108;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score.total / 100) * circumference;

  const message = getScoreMessage(score.total);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[22px] p-[18px] grid grid-cols-[108px_1fr] gap-4 items-center">
      {/* Left: circular ring with score */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#27272a"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#bef264"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.7s cubic-bezier(0.32, 0.72, 0, 1)',
              filter: 'drop-shadow(0 0 4px rgba(190,242,100,0.5))',
            }}
          />
        </svg>
        {/* Score centered in ring */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          aria-label={`Puntaje: ${score.total} de 100`}
        >
          <div className="font-mono text-[30px] font-medium text-zinc-100 tracking-[-0.5px] leading-none" aria-hidden="true">
            {score.total}
          </div>
          <div className="font-mono text-[9px] text-zinc-500 tracking-[1.5px] mt-0.5 uppercase" aria-hidden="true">
            / 100
          </div>
        </div>
      </div>

      {/* Right: label + heading + delta */}
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-zinc-500 mb-1">
          Salud financiera
        </div>
        <div className="font-serif italic text-[22px] text-zinc-100 leading-tight">
          {message}
        </div>
        {score.delta !== undefined && score.delta !== null && !isNaN(score.delta) && (
          <div className={`font-mono text-[11px] mt-1.5 ${score.delta >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
            {score.delta >= 0 ? '+' : ''}{score.delta} vs el mes pasado
          </div>
        )}
        <div className="mt-2 space-y-1">
          {[
            { label: 'Tendencia',   value: score.components.trendScore,  max: 25 },
            { label: 'Compromiso',  value: score.components.commitScore, max: 25 },
            { label: 'Cuotas',      value: score.components.longScore,   max: 25 },
            { label: 'Presupuesto', value: score.components.budgetScore, max: 25 },
          ].map(c => {
            const pct = (c.value / c.max) * 100;
            return (
              <div key={c.label} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-zinc-600 w-20 shrink-0 truncate">{c.label}</span>
                <div className="flex-1 h-[3px] rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: pct > 75 ? '#bef264' : pct > 50 ? '#84cc16' : pct > 25 ? '#fbbf24' : '#f87171',
                    }}
                  />
                </div>
                <span className="font-mono text-[9px] text-zinc-600 tabular-nums">{c.value}/{c.max}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default HealthScoreCard;
