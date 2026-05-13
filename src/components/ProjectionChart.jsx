import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '../constants';
import { formatARS, monthKey } from '../lib/formatters';

function ProjectionChart({ monthlyTotals, currentYear, currentMonth, budget, onBarClick }) {
  const chartData = useMemo(() => {
    const arr = [];
    for (let i = -5; i <= 11; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const key = monthKey(d.getFullYear(), d.getMonth());
      arr.push({
        key,
        label: MONTH_NAMES_SHORT[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
        total: monthlyTotals[key] || 0,
        isCurrent: i === 0,
        isPast: i < 0,
      });
    }
    return arr;
  }, [monthlyTotals, currentYear, currentMonth]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Proyección</div>
          <div className="text-zinc-100 font-medium mt-0.5">17 meses</div>
        </div>
        <div className="flex gap-3 text-[9px] uppercase tracking-wider">
          <span className="text-zinc-500 inline-flex items-center">
            <span className="inline-block w-2 h-2 bg-zinc-600 rounded-full mr-1" />Pasado
          </span>
          <span className="text-zinc-500 inline-flex items-center">
            <span className="inline-block w-2 h-2 bg-lime-300 rounded-full mr-1" />Actual
          </span>
          <span className="text-zinc-500 inline-flex items-center">
            <span className="inline-block w-2 h-2 bg-lime-300/40 rounded-full mr-1" />Futuro
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
          onClick={(e) => {
            if (e && e.activePayload && e.activePayload[0]) onBarClick(e.activePayload[0].payload);
          }}
        >
          <defs>
            <linearGradient id="futureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bef264" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#bef264" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v =>
              v >= 1000000
                ? (v / 1000000).toFixed(1) + 'M'
                : v >= 1000
                  ? (v / 1000).toFixed(0) + 'k'
                  : v
            }
          />
          <Tooltip
            cursor={{ fill: 'rgba(63, 63, 70, 0.3)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
                    {MONTH_NAMES[d.month]} {d.year}
                  </div>
                  <div className="text-sm text-zinc-100 font-medium tabular-nums">
                    {formatARS(d.total)}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} cursor="pointer">
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.isCurrent ? '#bef264' : d.isPast ? '#52525b' : 'url(#futureGrad)'}
              />
            ))}
          </Bar>
          {budget > 0 && (
            <line x1="0" x2="100%" y1={0} y2={0} stroke="#fbbf24" strokeDasharray="3 3" />
          )}
        </BarChart>
      </ResponsiveContainer>
      {budget > 0 && (
        <div className="text-[10px] text-zinc-500 mt-1 text-center">
          <span className="inline-block w-2 h-0.5 bg-amber-400 mr-1 align-middle"></span>
          Línea de presupuesto: {formatARS(budget)}
        </div>
      )}
      <div className="text-[10px] text-zinc-600 mt-1 text-center">
        tocá una barra para ir a ese mes
      </div>
    </div>
  );
}

export default ProjectionChart;
