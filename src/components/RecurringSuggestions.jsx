import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { formatARS, formatUSD, uid } from '../lib/formatters';
import RecurringEditModal from './RecurringEditModal';

function RecurringSuggestions({ suggestions, categories, cards, onConvert, onDismiss }) {
  const [editing, setEditing] = useState(null);

  if (suggestions.length === 0) return null;

  const handleConvert = (s) => {
    setEditing({
      id: uid(),
      description: s.description,
      amount: s.amount,
      currency: s.currency,
      exchangeRate: null,
      cardId: s.cardId,
      categoryId: s.categoryId,
      dayOfMonth: s.dayOfMonth,
      startDate: s.startDate,
      endDate: '',
      isNew: true,
      _suggestionId: s.id,
    });
  };

  const handleSave = () => {
    if (!editing) return;
    onConvert(editing);
    onDismiss(editing._suggestionId);
    setEditing(null);
  };

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-zinc-800">
          <Sparkles size={14} className="text-lime-300 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
            Gastos que se repiten
          </span>
        </div>
        <div className="divide-y divide-zinc-800">
          {suggestions.map(s => {
            const cat = categories.find(c => c.id === s.categoryId);
            const card = cards.find(c => c.id === s.cardId);
            return (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: (cat?.color || '#52525b') + '25' }}
                >
                  {cat?.emoji || '🔁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-100 font-medium truncate">
                    {s.description}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: card?.color || '#52525b' }}
                    />
                    <span>{card?.name}</span>
                    <span>·</span>
                    <span>{s.monthCount} meses seguidos</span>
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums text-zinc-200 shrink-0">
                  {s.currency === 'USD' ? formatUSD(s.amount) : formatARS(s.amount)}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleConvert(s)}
                    className="text-xs text-lime-300 hover:text-lime-200 font-medium px-2.5 py-1.5 rounded-lg bg-lime-300/10 hover:bg-lime-300/20 transition-colors"
                  >
                    Convertir
                  </button>
                  <button
                    onClick={() => onDismiss(s.id)}
                    className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <RecurringEditModal
          item={editing}
          cards={cards}
          categories={categories}
          onChange={setEditing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export default RecurringSuggestions;
