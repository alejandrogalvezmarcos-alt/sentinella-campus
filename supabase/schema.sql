-- Sentinella by Alpha · esquema de Supabase
-- Executa-ho un cop a Supabase → SQL Editor → New query → Run.

-- Perfils (un per usuari d'auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  sex text not null default 'm' check (sex in ('m', 'f')),
  exam_date date,
  lang text default 'ca',
  role text not null default 'alumne' check (role in ('alumne', 'docent', 'admin')),
  created_at timestamptz not null default now()
);

-- Progrés de cada alumne (tests, marques, pla, apunts…) en un sol JSON
create table if not exists public.user_data (
  id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Crea el perfil automàticament quan algú es registra (funciona encara que calgui confirmar el correu)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, sex, exam_date, lang)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'sex', ''), 'm'),
    nullif(new.raw_user_meta_data->>'exam_date', '')::date,
    coalesce(new.raw_user_meta_data->>'lang', 'ca')
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Qui és docent
create or replace function public.is_docent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('docent', 'admin'));
$$;

-- Qui és super admin
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Seguretat: cada alumne veu i edita només el seu; el professorat pot llegir tot l'alumnat
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "perfil propi o docent" on public.profiles;
create policy "perfil propi o docent" on public.profiles for select using (id = auth.uid() or public.is_docent());
drop policy if exists "editar perfil propi" on public.profiles;
create policy "editar perfil propi" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists "admin gestiona rols" on public.profiles;
create policy "admin gestiona rols" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "dades pròpies o docent" on public.user_data;
create policy "dades pròpies o docent" on public.user_data for select using (id = auth.uid() or public.is_docent());
drop policy if exists "inserir dades pròpies" on public.user_data;
create policy "inserir dades pròpies" on public.user_data for insert with check (id = auth.uid());
drop policy if exists "editar dades pròpies" on public.user_data;
create policy "editar dades pròpies" on public.user_data for update using (id = auth.uid());
drop policy if exists "esborrar dades pròpies" on public.user_data;
create policy "esborrar dades pròpies" on public.user_data for delete using (id = auth.uid() or public.is_admin());

-- Si ja havies executat una versió anterior d'aquest fitxer, actualitza la regla de rols:
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('alumne', 'docent', 'admin'));

-- Per fer super admin el compte de qui administra (registra't primer a l'app amb el teu correu):
-- update public.profiles set role = 'admin' where email = 'el.teu.correu@exemple.cat';
-- Per fer docent una persona (també ho pot fer el super admin des de l'app):
-- update public.profiles set role = 'docent' where email = 'correu.de.la.docent@exemple.cat';
