import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function fromDb(row) {
  return {
    id: row.id,
    sharedFolderId: row.shared_folder_id,
    userId: row.user_id,
    paidBy: row.paid_by || null,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : null,
    categoryId: row.category_id,
    totalCuotas: row.total_cuotas || 1,
  };
}

function toDb(exp, userId, folderId) {
  return {
    id: exp.id,
    user_id: userId,
    shared_folder_id: folderId,
    paid_by: exp.paidBy || userId,
    date: exp.date,
    description: exp.description,
    amount: exp.amount,
    currency: exp.currency || 'ARS',
    exchange_rate: exp.exchangeRate || null,
    category_id: exp.categoryId,
    total_cuotas: exp.totalCuotas || 1,
    tna: 0,
    card_id: null,
  };
}

export function useSharedExpenses(folderId, userId, onPartnerExpense) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!folderId || !userId) {
      setLoading(false);
      return;
    }

    load();

    const channel = supabase
      .channel(`shared-expenses-${folderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `shared_folder_id=eq.${folderId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = fromDb(payload.new);
            setExpenses(prev =>
              prev.some(e => e.id === incoming.id) ? prev : [incoming, ...prev],
            );
            if (incoming.userId !== userId) onPartnerExpense?.(incoming);
          } else if (payload.eventType === 'UPDATE') {
            setExpenses(prev =>
              prev.map(e => e.id === payload.new.id ? fromDb(payload.new) : e),
            );
          } else if (payload.eventType === 'DELETE') {
            setExpenses(prev => prev.filter(e => e.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [folderId, userId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('shared_folder_id', folderId)
      .order('date', { ascending: false });
    if (!error) setExpenses((data || []).map(fromDb));
    setLoading(false);
  }

  async function upsertExpense(exp) {
    const row = toDb(exp, userId, folderId);
    const { error } = await supabase.from('expenses').upsert(row);
    if (error) { console.error('upsertSharedExpense:', error); throw error; }
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === exp.id);
      const mapped = fromDb({ ...row, id: exp.id });
      return idx >= 0 ? prev.map(e => e.id === exp.id ? mapped : e) : [mapped, ...prev];
    });
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('deleteSharedExpense:', error); throw error; }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  return { expenses, loading, upsertExpense, deleteExpense, reload: load };
}
