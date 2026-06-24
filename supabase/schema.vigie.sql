-- ============================================================
--  Vigie — schema canonique (source de vérité unique, AD-11)
--  Idempotent : ré-exécutable sans erreur (Dashboard → SQL Editor).
--  RLS : user_id default auth.uid() + 4 policies (select auth.uid())=user_id,
--  rôle authenticated, aucun anon.
-- ============================================================

drop table if exists public.todos cascade;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Enums --------------------------------------------------------
do $$ begin create type public.phase as enum
  ('cadrage','conception','developpement','tests','livraison','cloture');
exception when duplicate_object then null; end $$;
do $$ begin create type public.project_status as enum ('actif','en_pause','termine');
exception when duplicate_object then null; end $$;
do $$ begin create type public.deadline_status as enum ('a_venir','faite');
exception when duplicate_object then null; end $$;
do $$ begin create type public.wait_status as enum ('en_attente','relancee','resolue','abandonnee');
exception when duplicate_object then null; end $$;

-- profiles (Story 1.1) ----------------------------------------
create table if not exists public.profiles (
  user_id             uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  timezone            text     not null default 'Europe/Paris',
  digest_hour         smallint not null default 8 check (digest_hour between 0 and 23),
  digest_email        text,
  digest_last_sent_on date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "profiles_delete" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

-- clients (Story 2.1) -----------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom         text not null check (length(btrim(nom)) > 0),
  cadence_x   int  not null default 7 check (cadence_x >= 1),
  email       text,
  notes       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.clients enable row level security;
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;
create policy "clients_select" on public.clients for select to authenticated using ((select auth.uid()) = user_id);
create policy "clients_insert" on public.clients for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "clients_update" on public.clients for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "clients_delete" on public.clients for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at before update on public.clients for each row execute function public.touch_updated_at();
create index if not exists clients_active_idx on public.clients (user_id) where archived_at is null;

-- projects (Story 2.2 + budget 2.3) ---------------------------
create table if not exists public.projects (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id            uuid not null references public.clients (id) on delete cascade,
  nom                  text not null check (length(btrim(nom)) > 0),
  phase                public.phase not null default 'cadrage',
  statut               public.project_status not null default 'actif',
  date_dernier_contact date not null default current_date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.projects add column if not exists budget numeric check (budget >= 0);
alter table public.projects add column if not exists budget_consomme numeric check (budget_consomme >= 0);
alter table public.projects enable row level security;
drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_insert" on public.projects;
drop policy if exists "projects_update" on public.projects;
drop policy if exists "projects_delete" on public.projects;
create policy "projects_select" on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects_insert" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects_update" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_delete" on public.projects for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects for each row execute function public.touch_updated_at();
create index if not exists projects_client_idx on public.projects (client_id);
create index if not exists projects_active_idx on public.projects (user_id) where statut = 'actif';

-- deadlines (Story 2.4) ---------------------------------------
create table if not exists public.deadlines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  libelle    text,
  date       date not null,
  statut     public.deadline_status not null default 'a_venir',
  created_at timestamptz not null default now()
);
alter table public.deadlines enable row level security;
drop policy if exists "deadlines_select" on public.deadlines;
drop policy if exists "deadlines_insert" on public.deadlines;
drop policy if exists "deadlines_update" on public.deadlines;
drop policy if exists "deadlines_delete" on public.deadlines;
create policy "deadlines_select" on public.deadlines for select to authenticated using ((select auth.uid()) = user_id);
create policy "deadlines_insert" on public.deadlines for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "deadlines_update" on public.deadlines for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "deadlines_delete" on public.deadlines for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists deadlines_pending_idx on public.deadlines (project_id, date) where statut = 'a_venir';

-- client_waits (Story 2.5) ------------------------------------
create table if not exists public.client_waits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  libelle        text not null,
  date_reference date not null default current_date,
  statut         public.wait_status not null default 'en_attente',
  created_at     timestamptz not null default now()
);
alter table public.client_waits enable row level security;
drop policy if exists "client_waits_select" on public.client_waits;
drop policy if exists "client_waits_insert" on public.client_waits;
drop policy if exists "client_waits_update" on public.client_waits;
drop policy if exists "client_waits_delete" on public.client_waits;
create policy "client_waits_select" on public.client_waits for select to authenticated using ((select auth.uid()) = user_id);
create policy "client_waits_insert" on public.client_waits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "client_waits_update" on public.client_waits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "client_waits_delete" on public.client_waits for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists client_waits_open_idx on public.client_waits (project_id, date_reference) where statut in ('en_attente','relancee');

-- contacts (Story 2.6) ----------------------------------------
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  contacted_on date not null default current_date,
  created_at   timestamptz not null default now()
);
alter table public.contacts enable row level security;
drop policy if exists "contacts_select" on public.contacts;
drop policy if exists "contacts_insert" on public.contacts;
drop policy if exists "contacts_update" on public.contacts;
drop policy if exists "contacts_delete" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated using ((select auth.uid()) = user_id);
create policy "contacts_insert" on public.contacts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contacts_update" on public.contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contacts_delete" on public.contacts for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists contacts_project_idx on public.contacts (project_id, contacted_on desc);

-- phase_actions (Story 2.7 — template éditable) ---------------
create table if not exists public.phase_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  phase      public.phase not null,
  libelle    text not null,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, phase, libelle)
);
alter table public.phase_actions enable row level security;
drop policy if exists "phase_actions_select" on public.phase_actions;
drop policy if exists "phase_actions_insert" on public.phase_actions;
drop policy if exists "phase_actions_update" on public.phase_actions;
drop policy if exists "phase_actions_delete" on public.phase_actions;
create policy "phase_actions_select" on public.phase_actions for select to authenticated using ((select auth.uid()) = user_id);
create policy "phase_actions_insert" on public.phase_actions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "phase_actions_update" on public.phase_actions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "phase_actions_delete" on public.phase_actions for delete to authenticated using ((select auth.uid()) = user_id);

-- project_phase_action_status (Story 2.7 — présence = fait) ----
create table if not exists public.project_phase_action_status (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  phase_action_id uuid not null references public.phase_actions (id) on delete cascade,
  done_at         timestamptz not null default now(),
  unique (project_id, phase_action_id)
);
alter table public.project_phase_action_status enable row level security;
drop policy if exists "ppas_select" on public.project_phase_action_status;
drop policy if exists "ppas_insert" on public.project_phase_action_status;
drop policy if exists "ppas_update" on public.project_phase_action_status;
drop policy if exists "ppas_delete" on public.project_phase_action_status;
create policy "ppas_select" on public.project_phase_action_status for select to authenticated using ((select auth.uid()) = user_id);
create policy "ppas_insert" on public.project_phase_action_status for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ppas_update" on public.project_phase_action_status for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ppas_delete" on public.project_phase_action_status for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists ppas_project_idx on public.project_phase_action_status (project_id);

-- ============================================================
-- RPC transactionnels (AD-6) — security invoker (RLS s'applique)
-- ============================================================
-- « J'ai contacté » : insert contact + reset date_dernier_contact (atomique)
create or replace function public.mark_contacted(p_project_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_today date;
begin
  select (now() at time zone timezone)::date into v_today from public.profiles where user_id = auth.uid();
  v_today := coalesce(v_today, current_date);
  insert into public.contacts (project_id, contacted_on) values (p_project_id, v_today);
  update public.projects set date_dernier_contact = v_today where id = p_project_id;
end; $$;

-- « Relancé » : repositionne date_reference + statut relancee, sans fermer
create or replace function public.relancer_attente(p_wait_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_today date;
begin
  select (now() at time zone timezone)::date into v_today from public.profiles where user_id = auth.uid();
  v_today := coalesce(v_today, current_date);
  update public.client_waits set date_reference = v_today, statut = 'relancee' where id = p_wait_id;
end; $$;

-- ============================================================
-- Story 3.1 — v_active_signals : définition UNIQUE des 4 signaux (AD-3/4/5)
-- security_invoker => la RLS des tables sources s'applique au lecteur.
-- Lignes PLATES : 1 ligne par signal actif. today_local jamais current_date.
-- ============================================================
drop view if exists public.v_active_signals;
create view public.v_active_signals with (security_invoker = true) as
with live as (
  select p.id as project_id, p.user_id, p.client_id, p.phase,
         p.date_dernier_contact,
         c.cadence_x, c.nom as client_nom,
         (now() at time zone pr.timezone)::date as today_local
  from public.projects p
  join public.clients  c  on c.id = p.client_id and c.archived_at is null
  join public.profiles pr on pr.user_id = p.user_id
  where p.statut = 'actif'
)
-- 1) Silence trop long
select l.user_id, l.project_id, l.client_id,
       'silence'::text as signal,
       l.project_id    as ref_id,
       null::text      as palier,
       (l.today_local - l.date_dernier_contact)::int as age_days,
       l.cadence_x,
       l.client_nom    as libelle_metier,
       500             as urgency_rank
from live l
where (l.today_local - l.date_dernier_contact) > l.cadence_x

union all
-- 2) Échéance (dernier palier franchi)
select l.user_id, l.project_id, l.client_id,
       'echeance', d.id,
       case when d.date <  l.today_local     then 'depassee'
            when d.date =  l.today_local     then 'jour_j'
            when d.date =  l.today_local + 1 then 'j_1'
            else 'j_3' end,
       (l.today_local - d.date)::int,
       l.cadence_x,
       coalesce(d.libelle, 'Échéance'),
       case when d.date <  l.today_local     then 1000 + (l.today_local - d.date)
            when d.date =  l.today_local     then 800
            when d.date =  l.today_local + 1 then 700
            else 600 end
from live l
join public.deadlines d on d.project_id = l.project_id and d.statut = 'a_venir'
where d.date <= l.today_local + 3

union all
-- 3) Action client en attente (même seuil cadence_x que silence)
select l.user_id, l.project_id, l.client_id,
       'attente', w.id, null::text,
       (l.today_local - w.date_reference)::int,
       l.cadence_x, w.libelle, 400
from live l
join public.client_waits w on w.project_id = l.project_id and w.statut in ('en_attente','relancee')
where (l.today_local - w.date_reference) > l.cadence_x

union all
-- 4) Action de phase oubliée (immédiat, NOT EXISTS)
select l.user_id, l.project_id, l.client_id,
       'phase', pa.id, null::text,
       0, l.cadence_x, pa.libelle, 300
from live l
join public.phase_actions pa on pa.user_id = l.user_id and pa.phase = l.phase
where not exists (
  select 1 from public.project_phase_action_status s
  where s.project_id = l.project_id and s.phase_action_id = pa.id
);

-- ============================================================
-- Provisioning (Story 1.1 + 2.7 seed) — profiles + phase_actions
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, digest_email)
  values (new.id, new.email) on conflict (user_id) do nothing;
  insert into public.phase_actions (user_id, phase, libelle, position) values
    (new.id, 'tests',     'Organiser les tests',      0),
    (new.id, 'livraison', 'Livrer',                   0),
    (new.id, 'livraison', 'Poser un délai de retour', 1)
  on conflict (user_id, phase, libelle) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed rétroactif des phase_actions pour les comptes déjà créés (idempotent)
insert into public.phase_actions (user_id, phase, libelle, position)
select u.id, x.phase, x.libelle, x.position
from auth.users u
cross join (values
  ('tests'::public.phase,     'Organiser les tests',      0),
  ('livraison'::public.phase, 'Livrer',                   0),
  ('livraison'::public.phase, 'Poser un délai de retour', 1)
) as x(phase, libelle, position)
on conflict (user_id, phase, libelle) do nothing;

-- ============================================================
-- ENRICHISSEMENTS (vague d'amélioration — réf. Project Cockpit)
-- Planification réintroduite + champs riches + scoring risque + timeline.
-- ============================================================

-- Enums additionnels
do $$ begin create type public.project_health as enum ('on_track','a_risque','en_danger');
exception when duplicate_object then null; end $$;
do $$ begin create type public.contact_type as enum
  ('relance','email','appel','reunion','copil','livraison','decision','blocage','note');
exception when duplicate_object then null; end $$;

-- Projects : champs riches (type, code, santé, scoring risque, budget ETC, contact, MeP, snooze)
alter table public.projects add column if not exists code           text;
alter table public.projects add column if not exists type           text;
alter table public.projects add column if not exists sante          public.project_health not null default 'on_track';
alter table public.projects add column if not exists risk_type      text;
alter table public.projects add column if not exists risk_planning  smallint not null default 1 check (risk_planning between 1 and 3);
alter table public.projects add column if not exists risk_budget    smallint not null default 1 check (risk_budget between 1 and 3);
alter table public.projects add column if not exists risk_ressources smallint not null default 1 check (risk_ressources between 1 and 3);
alter table public.projects add column if not exists etc            numeric check (etc >= 0);
alter table public.projects add column if not exists contact_nom    text;
alter table public.projects add column if not exists contact_email  text;
alter table public.projects add column if not exists release_date   date;
alter table public.projects add column if not exists gantt_link     text;
alter table public.projects add column if not exists relance_snooze_until date;

-- Contacts : timeline typée (type + note)
alter table public.contacts add column if not exists type public.contact_type not null default 'relance';
alter table public.contacts add column if not exists note text;

-- COPIL (comités de pilotage datés)
create table if not exists public.copils (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  date       date not null,
  notes      text,
  created_at timestamptz not null default now()
);
alter table public.copils enable row level security;
drop policy if exists "copils_select" on public.copils;
drop policy if exists "copils_insert" on public.copils;
drop policy if exists "copils_update" on public.copils;
drop policy if exists "copils_delete" on public.copils;
create policy "copils_select" on public.copils for select to authenticated using ((select auth.uid()) = user_id);
create policy "copils_insert" on public.copils for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "copils_update" on public.copils for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "copils_delete" on public.copils for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists copils_project_idx on public.copils (project_id, date);

-- Réunions internes
create table if not exists public.meetings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  date       date not null,
  notes      text,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.meetings enable row level security;
drop policy if exists "meetings_select" on public.meetings;
drop policy if exists "meetings_insert" on public.meetings;
drop policy if exists "meetings_update" on public.meetings;
drop policy if exists "meetings_delete" on public.meetings;
create policy "meetings_select" on public.meetings for select to authenticated using ((select auth.uid()) = user_id);
create policy "meetings_insert" on public.meetings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meetings_update" on public.meetings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meetings_delete" on public.meetings for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists meetings_project_idx on public.meetings (project_id, date) where done = false;

-- ============================================================
-- v_active_signals — VERSION ENRICHIE (remplace la définition plus haut).
-- 9 types de signaux + snooze. Forme plate inchangée (AD-4).
-- ============================================================
drop view if exists public.v_active_signals;
create view public.v_active_signals with (security_invoker = true) as
with live as (
  select p.id as project_id, p.user_id, p.client_id, p.phase, p.nom as project_nom,
         p.date_dernier_contact, p.sante, p.budget, p.budget_consomme, p.etc,
         p.release_date, p.relance_snooze_until,
         c.cadence_x, c.nom as client_nom,
         (now() at time zone pr.timezone)::date as today_local
  from public.projects p
  join public.clients  c  on c.id = p.client_id and c.archived_at is null
  join public.profiles pr on pr.user_id = p.user_id
  where p.statut = 'actif'
)
-- Projet en danger (santé)
select user_id, project_id, client_id,
       'danger'::text as signal,
       project_id     as ref_id,
       null::text     as palier,
       0::int         as age_days,
       cadence_x,
       client_nom     as libelle_metier,
       1100           as urgency_rank
from live where sante = 'en_danger'
union all
-- Silence trop long (supprimé si snoozé)
select user_id, project_id, client_id, 'silence', project_id, null::text,
       (today_local - date_dernier_contact)::int, cadence_x, client_nom, 500
from live
where (today_local - date_dernier_contact) > cadence_x
  and (relance_snooze_until is null or relance_snooze_until < today_local)
union all
-- Échéance (dernier palier franchi)
select l.user_id, l.project_id, l.client_id, 'echeance', d.id,
       case when d.date <  l.today_local     then 'depassee'
            when d.date =  l.today_local     then 'jour_j'
            when d.date =  l.today_local + 1 then 'j_1'
            else 'j_3' end,
       (l.today_local - d.date)::int, l.cadence_x, coalesce(d.libelle, 'Échéance'),
       case when d.date <  l.today_local     then 1000 + (l.today_local - d.date)
            when d.date =  l.today_local     then 800
            when d.date =  l.today_local + 1 then 700 else 600 end
from live l join public.deadlines d on d.project_id = l.project_id and d.statut = 'a_venir'
where d.date <= l.today_local + 3
union all
-- Mise en production proche / dépassée (release_date)
select l.user_id, l.project_id, l.client_id, 'mep', l.project_id,
       case when l.release_date < l.today_local then 'depassee'
            when l.release_date = l.today_local then 'jour_j' else 'j_3' end,
       (l.today_local - l.release_date)::int, l.cadence_x, l.project_nom,
       case when l.release_date < l.today_local then 980 + (l.today_local - l.release_date) else 760 end
from live l where l.release_date is not null and l.release_date <= l.today_local + 14
union all
-- Action client en attente
select l.user_id, l.project_id, l.client_id, 'attente', w.id, null::text,
       (l.today_local - w.date_reference)::int, l.cadence_x, w.libelle, 400
from live l join public.client_waits w on w.project_id = l.project_id and w.statut in ('en_attente','relancee')
where (l.today_local - w.date_reference) > l.cadence_x
union all
-- Dépassement budget (consommé + ETC > budget)
select user_id, project_id, client_id, 'budget', project_id, null::text,
       0::int, cadence_x, project_nom, 450
from live where budget is not null and budget > 0 and (coalesce(budget_consomme,0) + coalesce(etc,0)) > budget
union all
-- COPIL à venir (≤ 14 j)
select l.user_id, l.project_id, l.client_id, 'copil', co.id, null::text,
       (co.date - l.today_local)::int, l.cadence_x, coalesce(nullif(co.notes,''), l.project_nom), 350
from live l join public.copils co on co.project_id = l.project_id
where co.date >= l.today_local and co.date <= l.today_local + 14
union all
-- Réunion interne à venir (≤ 14 j, non faite)
select l.user_id, l.project_id, l.client_id, 'reunion', m.id, null::text,
       (m.date - l.today_local)::int, l.cadence_x, coalesce(nullif(m.notes,''), l.project_nom), 320
from live l join public.meetings m on m.project_id = l.project_id and m.done = false
where m.date >= l.today_local and m.date <= l.today_local + 14
union all
-- Action de phase oubliée (immédiat)
select l.user_id, l.project_id, l.client_id, 'phase', pa.id, null::text,
       0, l.cadence_x, pa.libelle, 300
from live l join public.phase_actions pa on pa.user_id = l.user_id and pa.phase = l.phase
where not exists (
  select 1 from public.project_phase_action_status s
  where s.project_id = l.project_id and s.phase_action_id = pa.id
);
