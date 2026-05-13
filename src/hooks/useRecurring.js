import { supabase } from '../lib/supabase';
import { useSupabaseRealtimeSync } from './useSupabaseRealtimeSync';

function fromDb(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : null,
    categoryId: row.category_id,
    cardId: row.card_id,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date || null,
  };
}

function toDb(r, userId) {
  return {
    id: r.id,
    user_id: userId,
    description: r.description,
    amount: r.amount,
    currency: r.currency || 'ARS',
    exchange_rate: r.exchangeRate || null,
    category_id: r.categoryId,
    card_id: r.cardId,
    day_of_month: r.dayOfMonth,
    start_date: r.startDate,
    end_date: r.endDate || null,
  };
}

export function useRecurring(userId) {
  const { data: recurring, loading, setData: setRecurring } = useSupabaseRealtimeSync(
    `recurring-${userId}`,
    'recurring_expenses',
    userId,
    { fromDb },
  );

  async function save(nextRecurring) {
    const currentIds = new Set(recurring.map(r => r.id));
    const nextIds = new Set(nextRecurring.map(r => r.id));
    const toAdd = nextRecurring.filter(r => !currentIds.has(r.id));
    const toUpdate = nextRecurring.filter(r => currentIds.has(r.id));
    const toRemove = recurring.filter(r => !nextIds.has(r.id)).map(r => r.id);

    const ops = [];
    if (toAdd.length > 0)
      ops.push(supabase.from('recurring_expenses').insert(toAdd.map(r => toDb(r, userId))));
    ops.push(...toUpdate.map(r =>
      supabase.from('recurring_expenses').update(toDb(r, userId)).eq('id', r.id)
    ));
    if (toRemove.length > 0)
      ops.push(supabase.from('recurring_expenses').delete().in('id', toRemove));

    await Promise.all(ops);
    setRecurring(nextRecurring);
  }

  async function setAll(array) {
    await supabase.from('recurring_expenses').delete().eq('user_id', userId);
    if (array.length > 0) {
      await supabase.from('recurring_expenses').insert(array.map(r => toDb(r, userId)));
    }
    setRecurring(array);
  }

  return { recurring, loading, save, setAll };
}
