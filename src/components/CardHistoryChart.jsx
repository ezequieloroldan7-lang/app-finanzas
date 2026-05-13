import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { formatARS, monthKey } from '../lib/formatters';
import { MONTH_NAMES_SHORT } from '../constants';
import { getMonthlyTotals } from '../lib/aggregations';

function CardHistoryChart({ expenses, recurring, cards, currentYear, currentMonth, months = 12 }) {
  const data = useMemo(() => {
    const fromDate = new Date(currentYear, currentMonth - (months - 1), 1);
    const fromY = fromDate.getFullYear();
    const fromM = fromDate.getMonth();
    const totals = getMonthlyTotals(expenses, recurring, cards, fromY, fromM, months, 'all');
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(fromY, fromM + i, 1);
      const k = monthKey(d.getFullYear(), d.getMonth());
      const isCurrent = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      return {
        label: MONTH_NAMES_SHORT[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
        amount: totals[k] || 0,
        isCurrent,
      };
    });
  }, [expenses, recurring, cards, currentYear, currentMonth, months]);

  const currentTotal = data.find(d => d.isCurrent)?.amount || 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 fade-in-up">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
            Resumen tarjetas · {months} meses
          </div>
          <div className="text-zinc-100 font-medium mt-0.5">Total mensual</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-600 uppercase tracking-wide">Este mes</div>
          <div className="text-lime-400 font-semibold tabular-nums text-sm mt-0.5">
            {formatARS(currentTotal)}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={({ x, y, payload, index }) => {
              const d = data[index];
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
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl">
                  <div className={`text-[10px] uppercase tracking-wider mb-1 ${d.isCurrent ? 'text-lime-400' : 'text-zinc-500'}`}>
                    {label}{d.isCurrent ? ' · actual' : ''}
                  </div>
                  <div className="text-sm text-zinc-100 font-semibold tabular-nums">
                    {formatARS(payload[0].value)}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="amount" radius={[5, 5, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isCurrent
                  ? 'url(#barGradientCurrent)'
                  : entry.amount > 0
                    ? '#3f3f46'
                    : '#27272a'
                }
              />
            ))}
          </Bar>
          <defs>
            <linearGradient id="barGradientCurrent" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#65a30d" />
              <stop offset="100%" stopColor="#bef264" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CardHistoryChart;
