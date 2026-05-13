import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CARDS } from '../constants';

function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    closingDay: row.closing_day,
    closingDates: row.closing_dates || {},
    color: row.color,
  };
}

function toDb(card, userId) {
  return {
    id: card.id,
    user_id: userId,
    name: card.name,
    closing_day: card.closingDay,
    closing_dates: card.closingDates || {},
    color: card.color,
  };
}

export function useCards(userId) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    load();

    const channel = supabase
      .channel(`cards-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCards(prev =>
              prev.some(c => c.id === payload.new.id) ? prev : [...prev, fromDb(payload.new)],
            );
          } else if (payload.eventType === 'UPDATE') {
            setCards(prev =>
              prev.map(c => c.id === payload.new.id ? fromDb(payload.new) : c),
            );
          } else if (payload.eventType === 'DELETE') {
            setCards(prev => prev.filter(c => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function load() {
    const { data, error } = await supabase.from('cards').select('*').eq('user_id', userId);
    if (error) { console.error('useCards load:', error); setLoading(false); return; }
    if (!data || data.length === 0) {
      // Don't pass string IDs — let Postgres generate UUIDs
      const defaults = DEFAULT_CARDS.map(c => ({
        user_id: userId,
        name: c.name,
        closing_day: c.closingDay,
        color: c.color,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from('cards')
        .insert(defaults)
        .select();
      if (insErr) console.error('useCards seed:', insErr);
      setCards((inserted || []).map(fromDb));
    } else {
      setCards(data.map(fromDb));
    }
    setLoading(false);
  }

  async function save(nextCards) {
    const currentIds = new Set(cards.map(c => c.id));
    const nextIds = new Set(nextCards.map(c => c.id));
    const toAdd = nextCards.filter(c => !currentIds.has(c.id));
    const toUpdate = nextCards.filter(c => currentIds.has(c.id));
    const toRemove = cards.filter(c => !nextIds.has(c.id)).map(c => c.id);

    const ops = [];
    if (toAdd.length > 0)
      ops.push(supabase.from('cards').insert(toAdd.map(c => toDb(c, userId))));
    ops.push(...toUpdate.map(c =>
      supabase.from('cards').update(toDb(c, userId)).eq('id', c.id)
    ));
    if (toRemove.length > 0)
      ops.push(supabase.from('cards').delete().in('id', toRemove));

    await Promise.all(ops);
    setCards(nextCards);
  }

  async function setAll(array) {
    await supabase.from('cards').delete().eq('user_id', userId);
    if (array.length > 0) {
      await supabase.from('cards').insert(array.map(c => toDb(c, userId)));
    }
    setCards(array);
  }

  return { cards, loading, save, setAll };
}
