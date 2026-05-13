import { useEffect, useRef, useState } from 'react';
import { Repeat, Trash2, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { formatARS } from '../lib/formatters';
import ConfirmDialog from './ConfirmDialog';

const PAGE_SIZE = 30;

function SwipeableExpenseItem({ expense, cuota, categories, cards, onEdit, onDelete }) {
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef(null);

  const cat =
    categories.find(c => c.id === expense.categoryId) ||
    categories[categories.length - 1];
  const card = cards.find(c => c.id === expense.cardId);

  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Only activate swipe if horizontal movement is dominant
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx < 0) {
      e.preventDefault();
      setSwipeX(Math.max(-80, dx));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -50) {
      setSwipeX(-80);
    } else {
      setSwipeX(0);
    }
    touchStartRef.current = null;
  };

  const handleDeleteZone = () => {
    onDelete(expense.id);
    setSwipeX(0);
  };

  const isRevealed = swipeX <= -50;

  return (
    <div className="relative overflow-hidden">
      {/* Delete zone revealed behind the row */}
      <div
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-600"
        aria-hidden="true"
      >
        <button
          onClick={handleDeleteZone}
          className="w-full h-full flex items-center justify-center cursor-pointer"
          tabIndex={isRevealed ? 0 : -1}
          aria-label="Confirmar eliminación"
        >
          <Trash2 size={18} className="text-white" />
        </button>
      </div>

      {/* Main row */}
      <div
        className="px-4 py-2.5 flex items-center gap-2.5 bg-zinc-900 relative"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 || swipeX === -80 ? 'transform 0.2s ease' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ background: (cat?.color || '#52525b') + '25' }}
        >
          {cat?.emoji || '📦'}
        </div>
        <button
          onClick={() => onEdit(expense)}
          className="flex-1 text-left min-w-0 group"
        >
          <div className="text-zinc-100 text-xs font-medium truncate group-hover:text-lime-200 transition-colors flex items-center gap-1">
            {expense.description}
            {expense.isRecurring && (
              <Repeat size={10} className="text-zinc-500 shrink-0" />
            )}
          </div>
          <div className="text-zinc-500 text-[10px] flex items-center gap-1 mt-0.5">
            <span
              className="inline-block w-1 h-1 rounded-full shrink-0"
              style={{ background: card?.color || '#52525b' }}
            />
            <span>{card?.name || '—'}</span>
            {expense.totalCuotas > 1 && (
              <>
                <span>·</span>
                <span className="bg-zinc-800 px-1 py-0.5 rounded text-[9px] tabular-nums text-zinc-300">
                  {cuota.cuotaNum}/{cuota.totalCuotas}
                </span>
              </>
            )}
            {expense.tna > 0 && (
              <span className="text-amber-400 text-[9px]">· {expense.tna}% TNA</span>
            )}
          </div>
        </button>
        <div className="text-right shrink-0">
          <div className="text-zinc-100 text-xs font-medium tabular-nums">
            {formatARS(cuota.amount)}
          </div>
          {expense.totalCuotas > 1 && (
            <div className="text-zinc-600 text-[9px] tabular-nums">
              de {formatARS(expense.amount)}
            </div>
          )}
        </div>
        {!expense.isRecurring && (
          <button
            onClick={() => onDelete(expense.id)}
            aria-label="Eliminar"
            className="p-1 -mr-1 text-zinc-600 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function ExpenseList({ cuotas, categories, cards, onEdit, onDelete, defaultGrouped = false }) {
  const [grouped, setGrouped] = useState(defaultGrouped);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Reset pagination when the list changes significantly
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [cuotas.length]);

  if (cuotas.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-500 text-sm">
        Sin compras en este resumen
      </div>
    );
  }

  const sorted = [...cuotas].sort((a, b) => b.cuota.amount - a.cuota.amount);

  // Build groups keyed by normalized description
  const groupMap = new Map();
  for (const entry of sorted) {
    const key = entry.expense.description.toLowerCase().trim();
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        expense: entry.expense,
        cuota: entry.cuota,
        totalAmount: 0,
        count: 0,
        items: [],
      });
    }
    const g = groupMap.get(key);
    g.totalAmount += entry.cuota.amount;
    g.count++;
    g.items.push(entry);
  }
  const groups = [...groupMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  const hasGroups = groups.length < sorted.length;

  const visibleSorted = sorted.slice(0, visibleCount);
  const visibleGroups = groups.slice(0, visibleCount);

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Compras del mes
          </div>
          <div className="text-zinc-400 text-xs mt-0.5">
            {sorted.length} item{sorted.length !== 1 ? 's' : ''}
            {grouped && hasGroups && (
              <span className="text-zinc-600"> · {groups.length} grupos</span>
            )}
          </div>
        </div>
        {hasGroups && (
          <button
            onClick={() => {
              setGrouped(g => !g);
              setExpandedGroups(new Set());
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
              grouped
                ? 'border-lime-400/40 bg-lime-400/10 text-lime-300'
                : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <Layers size={12} />
            Agrupar
          </button>
        )}
      </div>

      <div className="divide-y divide-zinc-800">
        {grouped
          ? visibleGroups.map(({ expense, totalAmount, count, items }) => {
              const key = expense.description.toLowerCase().trim();
              const isExpanded = expandedGroups.has(key);
              const cat =
                categories.find(c => c.id === expense.categoryId) ||
                categories[categories.length - 1];
              const card = cards.find(c => c.id === expense.cardId);
              return (
                <div key={key}>
                  {/* Group header — click to expand */}
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-zinc-800/40 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0"
                      style={{ background: (cat?.color || '#52525b') + '25' }}
                    >
                      {cat?.emoji || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-100 text-sm font-medium truncate flex items-center gap-1.5">
                        {expense.description}
                        {count > 1 && (
                          <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums shrink-0">
                            {count}×
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-xs flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: card?.color || '#52525b' }}
                        />
                        <span>{card?.name || '—'}</span>
                      </div>
                    </div>
                    <div className="text-zinc-100 font-medium tabular-nums">
                      {formatARS(totalAmount)}
                    </div>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-zinc-500 shrink-0" />
                      : <ChevronRight size={14} className="text-zinc-500 shrink-0" />
                    }
                  </button>

                  {/* Expanded individual items */}
                  {isExpanded && items.map(({ expense: exp, cuota }) => {
                    const expCard = cards.find(c => c.id === exp.cardId);
                    return (
                      <div
                        key={exp.id + '-' + cuota.cuotaNum}
                        className="pl-16 pr-5 py-2.5 flex items-center gap-3 bg-zinc-800/30 border-t border-zinc-800"
                      >
                        <button
                          onClick={() => onEdit(exp)}
                          className="flex-1 text-left min-w-0 group"
                        >
                          <div className="text-zinc-300 text-xs font-medium truncate group-hover:text-lime-200 transition-colors">
                            {exp.date}
                          </div>
                          <div className="text-zinc-500 text-xs flex items-center gap-1.5 mt-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ background: expCard?.color || '#52525b' }}
                            />
                            <span>{expCard?.name || '—'}</span>
                            {exp.totalCuotas > 1 && (
                              <>
                                <span>·</span>
                                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] tabular-nums text-zinc-300">
                                  {cuota.cuotaNum}/{cuota.totalCuotas}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                        <div className="text-zinc-300 text-sm tabular-nums">
                          {formatARS(cuota.amount)}
                        </div>
                        {!exp.isRecurring && (
                          <button
                            onClick={() => setPendingDeleteId(exp.id)}
                            aria-label="Eliminar"
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          : visibleSorted.map(({ expense, cuota }) => (
              <SwipeableExpenseItem
                key={expense.id + '-' + cuota.cuotaNum}
                expense={expense}
                cuota={cuota}
                categories={categories}
                cards={cards}
                onEdit={onEdit}
                onDelete={(id) => setPendingDeleteId(id)}
              />
            ))}
      </div>
      {(grouped ? groups.length : sorted.length) > visibleCount && (
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="w-full py-3 text-zinc-500 text-sm hover:text-zinc-300 border border-dashed border-zinc-800 rounded-2xl transition-colors"
          >
            Ver {Math.min(PAGE_SIZE, (grouped ? groups.length : sorted.length) - visibleCount)} más ({(grouped ? groups.length : sorted.length) - visibleCount} restantes)
          </button>
        </div>
      )}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Eliminar gasto"
        message="¿Estás seguro que querés borrar este gasto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { onDelete(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

export default ExpenseList;
