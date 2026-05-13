import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { formatARS, monthKey } from '../lib/formatters';
import { MONTH_NAMES_SHORT } from '../constants';
import { getMonthlyTotals } from '../lib/aggregations';

function CardComparisonChart({ cards, expenses, recurring, currentYear, currentMonth, months = 12 }) {
  const data = useMemo(() => {
    if (cards.length === 0) return [];
    const fromDate = new Date(currentYear, currentMonth - (months - 1), 1);
    const fromY = fromDate.getFullYear();
    const fromM = fromDate.getMonth();

    const cardTotals = cards.map(card => ({
      card,
      totals: getMonthlyTotals(expenses, recurring, cards, fromY, fromM, months, card.id),
    }));

    return Array.from({ length: months }, (_, i) => {
      const d = new Date(fromY, fromM + i, 1);
      const k = monthKey(d.getFullYear(), d.getMonth());
      const row = { label: MONTH_NAMES_SHORT[d.getMonth()], year: d.getFullYear(), month: d.getMonth() };
      for (const { card, totals } of cardTotals) {
        row[card.id] = totals[k] || 0;
      }
      return row;
    });
  }, [cards, expenses, recurring, currentYear, currentMonth, months]);

  if (cards.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">
        Comparación · {months} meses
      </div>
      <div className="text-zinc-100 font-medium mb-3">Tarjeta por tarjeta</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#71717a', fontSize: 10 }}
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
            cursor={{ stroke: '#3f3f46' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
                  {payload.map(p => {
                    const card = cards.find(c => c.id === p.dataKey);
                    return (
                      <div key={p.dataKey} className="flex items-center gap-2 text-[11px]">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-zinc-400 flex-1">{card?.name}</span>
                        <span className="text-zinc-200 tabular-nums">{formatARS(p.value)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          {cards.map(card => (
            <Line
              key={card.id}
              type="monotone"
              dataKey={card.id}
              stroke={card.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: card.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {cards.map(card => (
          <div key={card.id} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: card.color }} />
            {card.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardComparisonChart;
