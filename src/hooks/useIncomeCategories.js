import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Sueldo', emoji: '💼', color: '#84cc16' },
  { name: 'Freelance', emoji: '💻', color: '#60a5fa' },
  { name: 'Alquiler', emoji: '🏠', color: '#fbbf24' },
  { name: 'Inversiones', emoji: '📈', color: '#34d399' },
  { name: 'Ventas', emoji: '🛒', color: '#fb923c' },
  { name: 'Otros', emoji: '💰', color: '#a78bfa' },
];

function fromDb(row) {
  return { id: row.id, name: row.name, emoji: row.emoji, color: row.color };
}

function toDb(cat, userId) {
  return { id: cat.id, user_id: userId, name: cat.name, emoji: cat.emoji, color: cat.color };
}

export function useIncomeCategories(userId) {
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`income_categories-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'income_categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncomeCategories(prev =>
              prev.some(c => c.id === payload.new.id) ? prev : [...prev, fromDb(payload.new)],
            );
          } else if (payload.eventType === 'UPDATE') {
            setIncomeCategories(prev =>
              prev.map(c => c.id === payload.new.id ? fromDb(payload.new) : c),
            );
          } else if (payload.eventType === 'DELETE') {
            setIncomeCategories(prev => prev.filter(c => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function load() {
    try {
      const { data, error } = await supabase.from('income_categories').select('*').eq('user_id', userId);
      if (error) throw error;
      if (data.length === 0) {
        const defaults = DEFAULT_INCOME_CATEGORIES.map(c => ({ user_id: userId, ...c }));
        const { data: inserted, error: insErr } = await supabase
          .from('income_categories').insert(defaults).select();
        if (insErr) throw insErr;
        setIncomeCategories((inserted || []).map(fromDb));
      } else {
        setIncomeCategories(data.map(fromDb));
      }
    } catch (err) {
      console.error('useIncomeCategories load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function save(nextCats) {
    const currentIds = new Set(incomeCategories.map(c => c.id));
    const nextIds = new Set(nextCats.map(c => c.id));
    const toAdd = nextCats.filter(c => !currentIds.has(c.id));
    const toUpdate = nextCats.filter(c => currentIds.has(c.id));
    const toRemove = incomeCategories.filter(c => !nextIds.has(c.id)).map(c => c.id);
    const ops = [];
    if (toAdd.length > 0)
      ops.push(supabase.from('income_categories').insert(toAdd.map(c => toDb(c, userId))));
    ops.push(...toUpdate.map(c =>
      supabase.from('income_categories').update(toDb(c, userId)).eq('id', c.id),
    ));
    if (toRemove.length > 0)
      ops.push(supabase.from('income_categories').delete().in('id', toRemove));
    await Promise.all(ops);
    setIncomeCategories(nextCats);
  }

  return { incomeCategories, loading, save };
}
