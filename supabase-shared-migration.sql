-- =============================================
-- Migration: Gastos en pareja (shared expenses)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================

-- 1. shared_folders
-- -----------------------------------------------
create table if not exists public.shared_folders (
  id         uuid primary key,
  name       text not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null
);

alter table public.shared_folders enable row level security;

drop policy if exists "sf_creator"  on public.shared_folders;
drop policy if exists "sf_member"   on public.shared_folders;
drop policy if exists "sf_invitee"  on public.shared_folders;

-- El creador puede hacer cualquier operación
create policy "sf_creator" on public.shared_folders
  for all using (created_by = auth.uid());

-- Los miembros pueden leer las carpetas en las que participan
create policy "sf_member" on public.shared_folders
  for select using (
    id in (
      select folder_id from public.shared_folder_members where user_id = auth.uid()
    )
  );

-- Los invitados pendientes pueden leer la carpeta a la que fueron invitados
create policy "sf_invitee" on public.shared_folders
  for select using (
    id in (
      select folder_id from public.shared_folder_invites where invited_email = auth.email()
    )
  );

-- 2. shared_folder_members
-- -----------------------------------------------
create table if not exists public.shared_folder_members (
  folder_id    uuid references public.shared_folders(id) on delete cascade not null,
  user_id      uuid references auth.users(id) not null,
  email        text not null,
  display_name text,
  role         text not null default 'member',
  primary key (folder_id, user_id)
);

alter table public.shared_folder_members enable row level security;

drop policy if exists "sfm_self"                   on public.shared_folder_members;
drop policy if exists "sfm_owner_all"              on public.shared_folder_members;
drop policy if exists "sfm_self_insert_via_invite" on public.shared_folder_members;
drop policy if exists "sfm_co_member_select"       on public.shared_folder_members;
drop policy if exists "sfm_invitee_select"         on public.shared_folder_members;

-- Cada usuario puede ver y gestionar su propia fila de membresía
create policy "sfm_self" on public.shared_folder_members
  for all using (user_id = auth.uid());

-- El creador de la carpeta puede gestionar todos los miembros
-- (referencia shared_folders, no hay recursión)
create policy "sfm_owner_all" on public.shared_folder_members
  for all using (
    folder_id in (
      select id from public.shared_folders where created_by = auth.uid()
    )
  );

-- Un usuario con invitación pendiente puede insertarse como miembro
create policy "sfm_self_insert_via_invite" on public.shared_folder_members
  for insert with check (
    user_id = auth.uid() and
    folder_id in (
      select folder_id from public.shared_folder_invites where invited_email = auth.email()
    )
  );

-- El invitado puede ver a todos los miembros de la carpeta a la que fue invitado
-- (referencia shared_folder_invites, no shared_folder_members → sin recursión)
create policy "sfm_invitee_select" on public.shared_folder_members
  for select using (
    folder_id in (
      select folder_id from public.shared_folder_invites where invited_email = auth.email()
    )
  );

-- 3. shared_folder_invites
-- -----------------------------------------------
create table if not exists public.shared_folder_invites (
  id             uuid primary key default gen_random_uuid(),
  folder_id      uuid references public.shared_folders(id) on delete cascade not null,
  invited_email  text not null,
  invited_by     uuid references auth.users(id) not null,
  created_at     timestamptz default now() not null,
  unique (folder_id, invited_email)
);

alter table public.shared_folder_invites enable row level security;

drop policy if exists "sfi_inviter"         on public.shared_folder_invites;
drop policy if exists "sfi_invitee_select"  on public.shared_folder_invites;

-- El invitante puede ver, crear y eliminar sus invitaciones
create policy "sfi_inviter" on public.shared_folder_invites
  for all using (invited_by = auth.uid());

-- El invitado puede leer la invitación que recibió
create policy "sfi_invitee_select" on public.shared_folder_invites
  for select using (invited_email = auth.email());
