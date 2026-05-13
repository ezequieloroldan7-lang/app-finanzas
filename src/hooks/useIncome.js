import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function fromDb(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : null,
    categoryId: row.category_id,
  };
}

function toDb(inc, userId) {
  return {
    id: inc.id,
    user_id: userId,
    date: inc.date,
    description: inc.description,
    amount: inc.amount,
    currency: inc.currency || 'ARS',
    exchange_rate: inc.exchangeRate || null,
    category_id: inc.categoryId,
  };
}

export function useIncome(userId) {
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`income-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'income', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncome(prev =>
              prev.some(e => e.id === payload.new.id) ? prev : [fromDb(payload.new), ...prev],
            );
          } else if (payload.eventType === 'UPDATE') {
            setIncome(prev => prev.map(e => e.id === payload.new.id ? fromDb(payload.new) : e));
          } else if (payload.eventType === 'DELETE') {
            setIncome(prev => prev.filter(e => e.id !== payload.old.id));
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function load() {
    try {
      const { data, error } = await supabase
        .from('income').select('*').eq('user_id', userId).order('date', { ascending: false });
      if (error) throw error;
      setIncome(data.map(fromDb));
    } catch (err) {
      console.error('useIncome load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function upsertIncome(inc) {
    const { error } = await supabase.from('income').upsert(toDb(inc, userId));
    if (error) { console.error('upsertIncome:', error); throw error; }
    setIncome(prev => {
      const idx = prev.findIndex(e => e.id === inc.id);
      return idx >= 0 ? prev.map(e => e.id === inc.id ? inc : e) : [inc, ...prev];
    });
  }

  async function deleteIncome(id) {
    const { error } = await supabase.from('income').delete().eq('id', id);
    if (error) { console.error('deleteIncome:', error); return; }
    setIncome(prev => prev.filter(e => e.id !== id));
  }

  return { income, loading, upsertIncome, deleteIncome };
}
