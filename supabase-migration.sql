-- Agrega la columna closing_dates a la tabla cards.
-- Ejecutar en el SQL Editor de Supabase (una sola vez).

alter table public.cards
  add column if not exists closing_dates jsonb not null default '{}';
