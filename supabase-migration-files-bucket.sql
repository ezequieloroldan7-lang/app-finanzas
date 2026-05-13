-- ════════════════════════════════════════════════════════════════════
-- Bucket de Storage para resúmenes/facturas + políticas RLS
-- Ejecutar en Supabase → SQL editor si subir archivos da "Failed to fetch"
-- o si la tabla/bucket todavía no existen.
-- ════════════════════════════════════════════════════════════════════

-- 1) Bucket privado "user-files" (idempotente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-files',
  'user-files',
  false,
  20 * 1024 * 1024, -- 20 MB
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Políticas RLS sobre storage.objects para el bucket user-files
--    Los archivos viven en path "<user_id>/<filename>"
drop policy if exists "user-files: read own" on storage.objects;
drop policy if exists "user-files: insert own" on storage.objects;
drop policy if exists "user-files: update own" on storage.objects;
drop policy if exists "user-files: delete own" on storage.objects;

create policy "user-files: read own" on storage.objects
  for select using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "user-files: insert own" on storage.objects
  for insert with check (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "user-files: update own" on storage.objects
  for update using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "user-files: delete own" on storage.objects
  for delete using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3) Tabla "files" (metadatos) — idempotente
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('resumen','factura')),
  name text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  month text,        -- "YYYY-MM"
  card_id uuid references public.cards(id) on delete set null,
  amount numeric,
  notes text
);

create index if not exists files_user_id_idx on public.files(user_id);
create index if not exists files_user_uploaded_idx on public.files(user_id, uploaded_at desc);

alter table public.files enable row level security;

drop policy if exists "files: read own" on public.files;
drop policy if exists "files: insert own" on public.files;
drop policy if exists "files: update own" on public.files;
drop policy if exists "files: delete own" on public.files;

create policy "files: read own" on public.files
  for select using (auth.uid() = user_id);

create policy "files: insert own" on public.files
  for insert with check (auth.uid() = user_id);

create policy "files: update own" on public.files
  for update using (auth.uid() = user_id);

create policy "files: delete own" on public.files
  for delete using (auth.uid() = user_id);

-- 4) Habilitar realtime para la tabla
alter publication supabase_realtime add table public.files;
