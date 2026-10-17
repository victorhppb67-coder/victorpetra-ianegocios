-- Apply this file in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.vp_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.vp_leads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid unique,
  legacy_id bigint unique,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  empresa text not null check (char_length(btrim(empresa)) between 1 and 160),
  wh text not null check (char_length(btrim(wh)) between 5 and 40),
  seg text not null default '' check (char_length(seg) <= 100),
  size text not null default '' check (char_length(size) <= 40),
  pain text[] not null default '{}' check (cardinality(pain) <= 3),
  info text[] not null default '{}' check (cardinality(info) <= 30),
  doc text not null default '' check (doc in ('', '0', '1', '2', '3')),
  dec text not null default '' check (dec in ('', '0', '1', '2', '3')),
  nivel smallint not null default 0 check (nivel between 0 and 5),
  nome_nivel text not null default '' check (char_length(nome_nivel) <= 40),
  created_at timestamptz not null default now(),
  data_original text,
  hora_original text,
  coluna text not null default 'novo' check (coluna in ('novo', 'conversa', 'proposta', 'cliente')),
  notas text not null default '' check (char_length(notas) <= 5000),
  origem text not null default 'diagnostico' check (origem in ('diagnostico', 'manual'))
);

create index if not exists vp_leads_created_at_idx on public.vp_leads (created_at desc);
create index if not exists vp_leads_coluna_idx on public.vp_leads (coluna);

alter table public.vp_admins enable row level security;
alter table public.vp_leads enable row level security;

revoke all on public.vp_admins from anon, authenticated;
grant select on public.vp_admins to authenticated;
revoke all on public.vp_leads from anon, authenticated;
grant insert (submission_id, nome, empresa, wh, seg, size, pain, info, doc, dec, nivel, nome_nivel, coluna, notas, origem) on public.vp_leads to anon;
grant insert on public.vp_leads to authenticated;
grant select, update, delete on public.vp_leads to authenticated;

drop policy if exists "vp_admins_read_own_membership" on public.vp_admins;
create policy "vp_admins_read_own_membership"
  on public.vp_admins for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vp_leads_public_diagnostic_insert" on public.vp_leads;
create policy "vp_leads_public_diagnostic_insert"
  on public.vp_leads for insert to anon
  with check (
    submission_id is not null
    and origem = 'diagnostico'
    and coluna = 'novo'
    and notas = ''
    and legacy_id is null
  );

drop policy if exists "vp_leads_admin_insert" on public.vp_leads;
create policy "vp_leads_admin_insert"
  on public.vp_leads for insert to authenticated
  with check (
    exists (select 1 from public.vp_admins a where a.user_id = (select auth.uid()))
  );

drop policy if exists "vp_leads_admin_select" on public.vp_leads;
create policy "vp_leads_admin_select"
  on public.vp_leads for select to authenticated
  using (
    exists (select 1 from public.vp_admins a where a.user_id = (select auth.uid()))
  );

drop policy if exists "vp_leads_admin_update" on public.vp_leads;
create policy "vp_leads_admin_update"
  on public.vp_leads for update to authenticated
  using (
    exists (select 1 from public.vp_admins a where a.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.vp_admins a where a.user_id = (select auth.uid()))
  );

drop policy if exists "vp_leads_admin_delete" on public.vp_leads;
create policy "vp_leads_admin_delete"
  on public.vp_leads for delete to authenticated
  using (
    exists (select 1 from public.vp_admins a where a.user_id = (select auth.uid()))
  );

-- After creating the owner account in Supabase Auth, add only its UUID here:
-- insert into public.vp_admins (user_id) values ('OWNER_AUTH_USER_UUID');
