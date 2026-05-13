import { Repeat } from 'lucide-react';
import { formatARS, formatUSD } from '../lib/formatters';

function RecurringPreview({ recurring, categories }) {
  const sorted = [...recurring].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Recurrentes</div>
          <div className="text-zinc-100 font-medium mt-0.5">
            {recurring.length} pago{recurring.length !== 1 ? 's' : ''} mensual
            {recurring.length !== 1 ? 'es' : ''}
          </div>
        </div>
        <Repeat size={18} className="text-zinc-400" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {sorted.map(r => {
          const cat = categories.find(c => c.id === r.categoryId);
          return (
            <div
              key={r.id}
              className="shrink-0 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 w-40"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{cat?.emoji}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  día {r.dayOfMonth}
                </span>
              </div>
              <div className="text-sm text-zinc-100 font-medium truncate">{r.description}</div>
              <div className="text-zinc-300 tabular-nums text-sm mt-1">
                {r.currency === 'USD' ? formatUSD(r.amount) : formatARS(r.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecurringPreview;
