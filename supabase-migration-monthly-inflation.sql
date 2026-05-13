-- Migration: Add monthly_inflation column to budgets table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ecvngmtuawvmsiytmumk/sql

-- Add monthly_inflation column if it doesn't exist
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS monthly_inflation numeric NOT NULL DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.budgets.monthly_inflation IS 'Monthly inflation rate percentage (e.g. 3.5 = 3.5%). Previously stored in localStorage.';
