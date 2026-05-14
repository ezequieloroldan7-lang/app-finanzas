import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatARS } from '../lib/formatters';

const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function relativeDate(dateStr) {
  const today = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dNorm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((todayNorm - dNorm) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
}

function MovimientosCard({ expenses = [], income = [], categories = [], incomeCategories = [], onVerGastos }) {
  const items = useMemo(() => {
    const expItems = expenses
      .filter(e => e.date)
      .map(e => {
        const cat = categories.find(c => c.id === e.categoryId);
        return {
          key: 'exp-' + e.id,
          description: e.description || 'Gasto',
          emoji: cat?.emoji || '💳',
          catName: cat?.name || 'Sin categoría',
          date: e.date,
          amount: -(e.amount || 0),
          isIncome: false,
        };
      });

    const incItems = income
      .filter(i => i.date)
      .map(i => {
        const cat = incomeCategories.find(c => c.id === i.categoryId);
        return {
          key: 'inc-' + i.id,
          description: i.description || 'Ingreso',
          emoji: cat?.emoji || '💰',
          catName: cat?.name || 'Ingreso',
          date: i.date,
          amount: i.amount || 0,
          isIncome: true,
        };
      });

    return [...expItems, ...incItems]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);
  }, [expenses, income, categories, incomeCategories]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="font-serif italic text-zinc-100 text-[18px]">Movimientos</div>
        <button
          onClick={onVerGastos}
          className="flex items-center gap-0.5 font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Ver todo
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Transactions list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[22px] divide-y divide-zinc-800/60 overflow-hidden">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-3 px-4 py-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-base shrink-0 select-none">
              {item.emoji}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[13px] text-zinc-100 truncate">{item.description}</div>
              <div className="font-mono text-[11px] text-zinc-500 truncate">
                {item.catName} · {relativeDate(item.date)}
              </div>
            </div>

            {/* Amount */}
            <div className={`font-mono text-[13px] font-medium shrink-0 tabular-nums ${
              item.isIncome ? 'text-lime-400' : 'text-zinc-100'
            }`}>
              {item.isIncome ? '+' : ''}
              {formatARS(Math.abs(item.amount))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MovimientosCard;
