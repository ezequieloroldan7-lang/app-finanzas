import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CATEGORIES } from '../constants';

function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
  };
}

function toDb(cat, userId) {
  return {
    id: cat.id,
    user_id: userId,
    name: cat.name,
    emoji: cat.emoji,
    color: cat.color,
  };
}

export function useCategories(userId) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    load();

    const channel = supabase
      .channel(`categories-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCategories(prev =>
              prev.some(c => c.id === payload.new.id) ? prev : [...prev, fromDb(payload.new)],
            );
          } else if (payload.eventType === 'UPDATE') {
            setCategories(prev =>
              prev.map(c => c.id === payload.new.id ? fromDb(payload.new) : c),
            );
          } else if (payload.eventType === 'DELETE') {
            setCategories(prev => prev.filter(c => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function load() {
    const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId);
    if (error) { console.error('useCategories load:', error); setLoading(false); return; }
    if (!data || data.length === 0) {
      // Don't pass string IDs — let Postgres generate UUIDs
      const defaults = DEFAULT_CATEGORIES.map(c => ({
        user_id: userId,
        name: c.name,
        emoji: c.emoji,
        color: c.color,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from('categories')
        .insert(defaults)
        .select();
      if (insErr) console.error('useCategories seed:', insErr);
      setCategories((inserted || []).map(fromDb));
    } else {
      setCategories(data.map(fromDb));
    }
    setLoading(false);
  }

  async function save(nextCats) {
    const currentIds = new Set(categories.map(c => c.id));
    const nextIds = new Set(nextCats.map(c => c.id));
    const toAdd = nextCats.filter(c => !currentIds.has(c.id));
    const toUpdate = nextCats.filter(c => currentIds.has(c.id));
    const toRemove = categories.filter(c => !nextIds.has(c.id)).map(c => c.id);

    const ops = [];
    if (toAdd.length > 0)
      ops.push(supabase.from('categories').insert(toAdd.map(c => toDb(c, userId))));
    ops.push(...toUpdate.map(c =>
      supabase.from('categories').update(toDb(c, userId)).eq('id', c.id)
    ));
    if (toRemove.length > 0)
      ops.push(supabase.from('categories').delete().in('id', toRemove));

    await Promise.all(ops);
    setCategories(nextCats);
  }

  async function setAll(array) {
    await supabase.from('categories').delete().eq('user_id', userId);
    if (array.length > 0) {
      await supabase.from('categories').insert(array.map(c => toDb(c, userId)));
    }
    setCategories(array);
  }

  return { categories, loading, save, setAll };
}
