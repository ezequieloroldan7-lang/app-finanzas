import { supabase } from '../lib/supabase';
import { useSupabaseRealtimeSync } from './useSupabaseRealtimeSync';

function fromDb(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : null,
    categoryId: row.category_id,
    totalCuotas: row.total_cuotas,
    tna: row.tna ? Number(row.tna) : 0,
    sharedFolderId: row.shared_folder_id || null,
    paidBy: row.paid_by || null,
    receiptPath: row.receipt_path || null,
  };
}

function toDb(exp, userId) {
  return {
    id: exp.id,
    user_id: userId,
    card_id: exp.cardId,
    date: exp.date,
    description: exp.description,
    amount: exp.amount,
    currency: exp.currency || 'ARS',
    exchange_rate: exp.exchangeRate || null,
    category_id: exp.categoryId,
    total_cuotas: exp.totalCuotas || 1,
    tna: exp.tna || 0,
    shared_folder_id: exp.sharedFolderId || null,
    paid_by: exp.paidBy || null,
    receipt_path: exp.receiptPath || null,
  };
}

export function useExpenses(userId) {
  // Explicit user_id filter ensures RLS policy 1 (user_id = auth.uid()) is always
  // TRUE for returned rows, preventing the shared_folder subquery from being evaluated.
  const { data: expenses, loading, setData: setExpenses } = useSupabaseRealtimeSync(
    `expenses-${userId}`,
    'expenses',
    userId,
    {
      fromDb,
      buildQuery: (q) => q.order('date', { ascending: false }),
      prependInserts: true,
    },
  );

  async function upsertExpense(exp) {
    const { error } = await supabase.from('expenses').upsert(toDb(exp, userId));
    if (error) { console.error('upsertExpense:', error); throw error; }
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === exp.id);
      return idx >= 0 ? prev.map(e => e.id === exp.id ? exp : e) : [...prev, exp];
    });
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('deleteExpense:', error); throw error; }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function setAll(array) {
    const { error: delErr } = await supabase.from('expenses').delete().eq('user_id', userId);
    if (delErr) { console.error('setAll expenses delete:', delErr); throw delErr; }
    if (array.length > 0) {
      const { error: insErr } = await supabase
        .from('expenses')
        .insert(array.map(e => toDb(e, userId)));
      if (insErr) { console.error('setAll expenses insert:', insErr); throw insErr; }
    }
    setExpenses(array);
  }

  return { expenses, loading, upsertExpense, deleteExpense, setAll };
}
