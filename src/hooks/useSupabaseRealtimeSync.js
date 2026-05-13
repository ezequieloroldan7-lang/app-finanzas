import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic Supabase real-time sync hook.
 * Handles initial load + INSERT/UPDATE/DELETE subscriptions.
 *
 * @param {string} channelName  - Unique channel name (e.g. `expenses-${userId}`)
 * @param {string} table        - Table name in Supabase
 * @param {string} userId       - Filters by user_id=eq.userId in real-time and initial load
 * @param {object} options
 * @param {function} options.fromDb      - Row → JS object transformer
 * @param {function} [options.buildQuery] - (query) => query — customize the initial select query
 * @param {boolean} [options.prependInserts] - If true, new INSERTs go to the front of the array
 */
export function useSupabaseRealtimeSync(channelName, table, userId, {
  fromDb = (row) => row,
  buildQuery = (q) => q,
  prependInserts = false,
} = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let unmounted = false;

    async function load() {
      const baseQuery = supabase.from(table).select('*').eq('user_id', userId);
      const { data: rows, error } = await buildQuery(baseQuery);
      if (error) console.error(`useSupabaseRealtimeSync [${table}] load:`, error);
      if (!unmounted) {
        setData((rows || []).map(fromDb));
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        (payload) => {
          if (unmounted) return;
          if (payload.eventType === 'INSERT') {
            const item = fromDb(payload.new);
            setData(prev =>
              prev.some(r => r.id === payload.new.id)
                ? prev
                : prependInserts ? [item, ...prev] : [...prev, item],
            );
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(r => r.id === payload.new.id ? fromDb(payload.new) : r));
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(r => r.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      unmounted = true;
      supabase.removeChannel(channel);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, setData };
}
