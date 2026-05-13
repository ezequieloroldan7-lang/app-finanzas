import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatARS } from '../lib/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';

function CategoryStackedChart({ data, categories, months = 6 }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const activeCategories = useMemo(
    () => categories.filter(c => data.some(d => (d[c.id] || 0) > 0)),
    [data, categories],
  );

  const currentMonth = data[data.length - 1] || {};
  const prevMonth = data[data.length - 2] || {};

  const pieData = useMemo(() =>
    activeCategories
      .map(c => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, value: currentMonth[c.id] || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value),
    [activeCategories, currentMonth],
  );

  const totalCurrent = pieData.reduce((s, d) => s + d.value, 0);

  const rows = useMemo(() =>
    pieData.map(d => {
      const prev = prevMonth[d.id] || 0;
      const delta = prev > 0 ? (d.value - prev) / prev : null;
      return { ...d, prev, delta };
    }),
    [pieData, prevMonth],
  );

  if (pieData.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 fade-in-up">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
          Por categoría · {months} meses
        </div>
        <div className="text-zinc-100 font-medium mt-0.5">Este mes</div>
      </div>

      {/* Donut + Legend */}
      <div className="flex items-center gap-4">
        <div className="shrink-0 relative" style={{ width: 110, height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={50}
                dataKey="value"
                strokeWidth={0}
                paddingAngle={2}
              >
                {pieData.map(d => (
                  <Cell key={d.id} fill={d.color} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pct = totalCurrent > 0 ? Math.round((d.value / totalCurrent) * 100) : 0;
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                      <div className="text-zinc-400">{d.emoji} {d.name}</div>
                      <div className="text-zinc-100 font-semibold">{formatARS(d.value)}</div>
                      <div className="text-zinc-500">{pct}%</div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[9px] text-zinc-600 uppercase tracking-wide">total</div>
            <div className="text-[11px] text-zinc-300 font-semibold tabular-nums leading-tight">
              {totalCurrent >= 1000000
                ? (totalCurrent / 1000000).toFixed(1) + 'M'
                : totalCurrent >= 1000
                  ? (totalCurrent / 1000).toFixed(0) + 'k'
                  : formatARS(totalCurrent)
              }
            </div>
          </div>
        </div>

        {/* Legend with animated bars */}
        <div className="flex-1 space-y-2 min-w-0">
          {rows.slice(0, 5).map(d => {
            const pct = totalCurrent > 0 ? (d.value / totalCurrent) * 100 : 0;
            return (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1 min-w-0 truncate">
                    <span>{d.emoji}</span>
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="text-[10px] tabular-nums text-zinc-300 shrink-0 ml-1 font-medium">
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: animated ? `${pct}%` : '0%',
                      background: d.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delta list vs prev month */}
      <div className="border-t border-zinc-800/70 pt-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mb-2">vs mes anterior</div>
        {rows.map(d => (
          <div key={d.id} className="flex items-center gap-2">
            <span className="text-sm shrink-0">{d.emoji}</span>
            <span className="text-xs text-zinc-400 flex-1 truncate">{d.name}</span>
            <span className="text-xs tabular-nums text-zinc-300 shrink-0">{formatARS(d.value)}</span>
            {d.delta !== null ? (
              <span className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                d.delta > 0.05
                  ? 'text-red-400 bg-red-400/10'
                  : d.delta < -0.05
                    ? 'text-emerald-400 bg-emerald-400/10'
                    : 'text-zinc-500 bg-zinc-800'
              }`}>
                {d.delta > 0.05 ? <TrendingUp size={9} /> : d.delta < -0.05 ? <TrendingDown size={9} /> : null}
                {d.delta > 0 ? '+' : ''}{Math.round(d.delta * 100)}%
              </span>
            ) : (
              <span className="text-[10px] text-zinc-700 shrink-0">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryStackedChart;
