import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { formatARS, convertToARS, monthKey } from '../lib/formatters';
import { MONTH_NAMES_SHORT } from '../constants';

function SharedBalanceChart({ sharedExpenses, userId, months = 6 }) {
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const k = monthKey(y, m);
      const monthExp = sharedExpenses.filter(e => {
        if (!e.date) return false;
        const ed = new Date(e.date + 'T12:00:00');
        return monthKey(ed.getFullYear(), ed.getMonth()) === k;
      });
      const myPaid = monthExp
        .filter(e => e.paidBy === userId || !e.paidBy)
        .reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0);
      const partnerPaid = monthExp
        .filter(e => e.paidBy && e.paidBy !== userId)
        .reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0);
      const total = myPaid + partnerPaid;
      const balance = total > 0 ? myPaid - total / 2 : 0;
      return { label: MONTH_NAMES_SHORT[m], balance };
    });
  }, [sharedExpenses, userId, months]);

  const hasData = data.some(d => d.balance !== 0);
  if (!hasData) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl px-4 pt-4 pb-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Balance compartido · {months} meses</div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
          <Tooltip
            cursor={{ fill: 'rgba(63, 63, 70, 0.3)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = payload[0].value;
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
                  {Math.abs(v) < 1 ? (
                    <div className="text-sm text-zinc-400">Al día</div>
                  ) : v > 0 ? (
                    <>
                      <div className="text-[10px] text-zinc-500">Pareja te debe</div>
                      <div className="text-sm text-emerald-400 font-medium tabular-nums">{formatARS(v)}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] text-zinc-500">Le debés a pareja</div>
                      <div className="text-sm text-red-400 font-medium tabular-nums">{formatARS(Math.abs(v))}</div>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.balance >= 0 ? '#34d399' : '#f87171'}
                fillOpacity={entry.balance === 0 ? 0.2 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SharedBalanceChart;
