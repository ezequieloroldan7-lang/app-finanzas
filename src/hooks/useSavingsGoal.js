import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const LS_KEY = 'savings_goal';

// localStorage helpers for backward-compat migration
function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function lsClear() {
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    currency: row.currency || 'ARS',
    deadline: row.deadline || null,
  };
}

export function useSavingsGoal(userId) {
  const [goal, setGoalState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // No user — fall back to localStorage (logged-out preview)
      setGoalState(lsLoad());
      setLoading(false);
      return;
    }
    load();
  }, [userId]);

  async function load() {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGoalState(fromDb(data));
        lsClear(); // migrate: clear old localStorage data once Supabase has it
      } else {
        // Check localStorage for migration: if there's a goal there, migrate it
        const lsGoal = lsLoad();
        if (lsGoal) {
          // Silently migrate to Supabase
          await saveGoalToDb(lsGoal);
          lsClear();
        } else {
          setGoalState(null);
        }
      }
    } catch (err) {
      // 42P01 = table doesn't exist yet (migration pending) — degrade silently
      if (err?.code !== '42P01') console.error('useSavingsGoal load:', err);
      // Fallback to localStorage on error
      setGoalState(lsLoad());
    } finally {
      setLoading(false);
    }
  }

  async function saveGoalToDb(newGoal) {
    const existing = goal;
    const row = {
      user_id: userId,
      name: newGoal.name,
      amount: newGoal.amount,
      currency: newGoal.currency || 'ARS',
      deadline: newGoal.deadline || null,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      setGoalState(fromDb(data));
    } else {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      setGoalState(fromDb(data));
    }
  }

  const setGoal = useCallback(async (newGoal) => {
    if (!userId) {
      // No user — fall back to localStorage
      try { localStorage.setItem(LS_KEY, JSON.stringify(newGoal)); } catch { /* noop */ }
      setGoalState(newGoal);
      return;
    }
    try {
      await saveGoalToDb(newGoal);
    } catch (err) {
      console.error('useSavingsGoal setGoal:', err);
      // Fallback: update state anyway so UI doesn't break
      setGoalState(newGoal);
    }
  }, [userId, goal]);

  const clearGoal = useCallback(async () => {
    lsClear();
    if (!userId || !goal?.id) {
      setGoalState(null);
      return;
    }
    try {
      await supabase.from('savings_goals').delete().eq('id', goal.id);
      setGoalState(null);
    } catch (err) {
      console.error('useSavingsGoal clearGoal:', err);
      setGoalState(null);
    }
  }, [userId, goal]);

  return { goal, loading, setGoal, clearGoal };
}
