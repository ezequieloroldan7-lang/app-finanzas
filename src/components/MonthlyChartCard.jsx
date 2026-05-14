import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { formatARS } from '../lib/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MONTH_NAMES_SHORT } from '../constants';

// Category colors for stacked bars (lime shades, matching the design)
const CAT_COLORS = ['#bef264', '#84cc16', '#65a30d', '#3f6212', '#52525b'];

function MonthlyChartCard({ momData = [], categories = [], currentYear, currentMonth }) {
  const [activeTab, setActiveTab] = useState('mes');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Build the active categories (those that have spend in any month)
  const activeCategories = useMemo(
    () => categories.filter(c => momData.some(d => (d[c.id] || 0) > 0)),
    [momData, categories],
  );

  // For the "Mes" tab: build per-month stacked data
  const mesData = useMemo(() =>
    momData.map((d, i) => {
      const date = new Date(currentYear, currentMonth - (momData.length - 1 - i), 1);
      return {
        label: MONTH_NAMES_SHORT[date.getMonth()],
        isCurrent: i === momData.length - 1,
        ...activeCategories.reduce((acc, c, ci) => {
          acc[c.id] = d[c.id] || 0;
          acc[`_color_${c.id}`] = CAT_COLORS[ci % CAT_COLORS.length];
          return acc;
        }, {}),
      };
    }),
    [momData, activeCategories, currentYear, currentMonth],
  );

  const pieData = useMemo(() => {
    const currentMonthData = momData[momData.length - 1] || {};
    const prevMonthData = momData[momData.length - 2] || {};
    return activeCategories
      .map((c, ci) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        color: CAT_COLORS[ci % CAT_COLORS.length],
        value: currentMonthData[c.id] || 0,
        prev: prevMonthData[c.id] || 0,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeCategories, momData]);

  const totalCurrent = pieData.reduce((s, d) => s + d.value, 0);

  if (momData.length === 0 || activeCategories.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[22px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-[18px] pt-[18px] pb-3">
        <div>
          <div className="font-serif italic text-zinc-100 text-[16px] leading-tight">
            Tus últimos
            <br />
            <span className="text-zinc-400">doce meses</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-800/60 rounded-xl p-0.5">
          <button
            onClick={() => setActiveTab('mes')}
            className={`px-3 py-1.5 rounded-[9px] font-mono text-[11px] font-medium transition-all duration-200 ${
              activeTab === 'mes'
                ? 'bg-lime-400 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setActiveTab('cat')}
            className={`px-3 py-1.5 rounded-[9px] font-mono text-[11px] font-medium transition-all duration-200 ${
              activeTab === 'cat'
                ? 'bg-lime-400 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Cat.
          </button>
        </div>
      </div>

      {/* Tab: Mes — stacked bar chart */}
      {activeTab === 'mes' && (
        <div className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={mesData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={18}>
              <XAxis
                dataKey="label"
                tick={({ x, y, payload, index }) => {
                  const d = mesData[index];
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="middle"
                      fill={d?.isCurrent ? '#a3e635' : '#71717a'}
                      fontSize={10}
                      fontWeight={d?.isCurrent ? 700 : 400}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v =>
                  v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v
                }
              />
              <Tooltip
                cursor={{ fill: 'rgba(63, 63, 70, 0.25)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs space-y-1">
                      <div className="text-zinc-400 font-mono text-[10px] uppercase tracking-wide mb-1">
                        {payload[0]?.payload?.label}
                      </div>
                      {payload.filter(p => p.value > 0).reverse().map(p => (
                        <div key={p.dataKey} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
                          <span className="text-zinc-300 tabular-nums">{formatARS(p.value)}</span>
                        </div>
                      ))}
                      <div className="border-t border-zinc-800 pt-1 font-semibold text-zinc-100 tabular-nums">
                        {formatARS(total)}
                      </div>
                    </div>
                  );
                }}
              />
              {activeCategories.map((c, ci) => (
                <Bar
                  key={c.id}
                  dataKey={c.id}
                  stackId="a"
                  fill={CAT_COLORS[ci % CAT_COLORS.length]}
                  radius={ci === activeCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Category legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 mt-1">
            {activeCategories.slice(0, 5).map((c, ci) => (
              <div key={c.id} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: CAT_COLORS[ci % CAT_COLORS.length] }}
                />
                <span className="font-mono text-[10px] text-zinc-500">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Cat. — donut + legend + delta */}
      {activeTab === 'cat' && (
        <div className="px-[18px] pb-[18px] space-y-4">
          {/* Donut + bars */}
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

            <div className="flex-1 space-y-2 min-w-0">
              {pieData.slice(0, 5).map(d => {
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

          {/* Delta vs prev month */}
          <div className="border-t border-zinc-800/70 pt-3 space-y-1.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600 mb-2">vs mes anterior</div>
            {pieData.map(d => {
              const delta = d.prev > 0 ? (d.value - d.prev) / d.prev : null;
              return (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="text-sm shrink-0">{d.emoji}</span>
                  <span className="text-xs text-zinc-400 flex-1 truncate">{d.name}</span>
                  <span className="text-xs tabular-nums text-zinc-300 shrink-0">{formatARS(d.value)}</span>
                  {delta !== null ? (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      delta > 0.05
                        ? 'text-red-400 bg-red-400/10'
                        : delta < -0.05
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : 'text-zinc-500 bg-zinc-800'
                    }`}>
                      {delta > 0.05 ? <TrendingUp size={9} /> : delta < -0.05 ? <TrendingDown size={9} /> : null}
                      {delta > 0 ? '+' : ''}{Math.round(delta * 100)}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-700 shrink-0">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthlyChartCard;
