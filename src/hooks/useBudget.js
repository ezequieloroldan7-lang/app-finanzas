import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const INFLATION_LS_KEY = 'budget:monthlyInflation';

function readStoredInflation() {
  try { return parseFloat(localStorage.getItem(INFLATION_LS_KEY)) || 0; } catch { return 0; }
}

const DEFAULT_BUDGET = { monthly: 0, categoryLimits: {}, monthlyInflation: 0 };

function fromDb(row) {
  // monthly_inflation may not exist yet if migration hasn't run — fall back to localStorage
  const inflation = row.monthly_inflation != null
    ? Number(row.monthly_inflation)
    : readStoredInflation();
  return {
    monthly: row.monthly_limit ? Number(row.monthly_limit) : 0,
    categoryLimits: row.category_limits || {},
    monthlyInflation: inflation,
  };
}

export function useBudget(userId) {
  const [budget, setBudget] = useState(() => ({ ...DEFAULT_BUDGET, monthlyInflation: readStoredInflation() }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    load();

    const channel = supabase
      .channel(`budget-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) setBudget(fromDb(payload.new));
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function load() {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('useBudget load:', error);
    setBudget(data ? fromDb(data) : { ...DEFAULT_BUDGET, monthlyInflation: readStoredInflation() });
    setLoading(false);
  }

  async function saveBudget(next) {
    // Also persist inflation to localStorage as fallback for pre-migration environments
    try {
      if (next.monthlyInflation) localStorage.setItem(INFLATION_LS_KEY, String(next.monthlyInflation));
      else localStorage.removeItem(INFLATION_LS_KEY);
    } catch { /* noop */ }

    const upsertData = {
      user_id: userId,
      monthly_limit: next.monthly || 0,
      category_limits: next.categoryLimits || {},
      monthly_inflation: next.monthlyInflation || 0,
    };

    const { error } = await supabase.from('budgets').upsert(upsertData);
    if (error) {
      // If monthly_inflation column doesn't exist yet (migration not run), retry without it
      if (error.message?.includes('monthly_inflation')) {
        const { error: error2 } = await supabase.from('budgets').upsert({
          user_id: userId,
          monthly_limit: next.monthly || 0,
          category_limits: next.categoryLimits || {},
        });
        if (error2) { console.error('saveBudget fallback:', error2); return; }
      } else {
        console.error('saveBudget:', error);
        return;
      }
    }
    setBudget(next);
  }

  return { budget, loading, saveBudget };
}
