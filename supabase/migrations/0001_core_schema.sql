-- Enable extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Profiles ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_seed text default '' not null,
  reputation integer default 0 not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Sessions ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('lobby', 'active', 'endgame', 'completed', 'cancelled')),
  title text default 'Untitled Session' not null,
  ruleset jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create trigger sessions_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

-- Session Players --------------------------------------------------------------------
create table if not exists public.session_players (
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seat_order smallint not null,
  is_ready boolean default false not null,
  resources jsonb default '{}'::jsonb not null,
  ideology_state jsonb default '{}'::jsonb not null,
  ideologue_progress jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  primary key (session_id, profile_id)
);

create unique index if not exists session_players_session_seat_idx
  on public.session_players (session_id, seat_order);

create trigger session_players_updated_at
before update on public.session_players
for each row
execute function public.set_updated_at();

-- Zones (static metadata) ------------------------------------------------------------
create table if not exists public.zones (
  id text primary key,
  display_name text not null,
  total_voters integer not null check (total_voters > 0),
  majority_required integer not null check (majority_required > 0),
  volatile_slots integer default 0 not null,
  adjacency text[] default '{}'::text[] not null
);

-- Vote Bank Cards --------------------------------------------------------------------
create table if not exists public.vote_bank_cards (
  id uuid primary key default gen_random_uuid(),
  voters smallint not null check (voters in (1, 2, 3)),
  cost jsonb not null,
  marked_cost text check (marked_cost in ('funds', 'media', 'clout', 'trust')),
  created_at timestamptz default timezone('utc', now()) not null
);

-- Ideology Cards ---------------------------------------------------------------------
create table if not exists public.ideology_cards (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  answer_a jsonb not null,
  answer_b jsonb not null,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Conspiracy Cards -------------------------------------------------------------------
create table if not exists public.conspiracy_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cost smallint not null check (cost in (4, 5)),
  description text not null,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Headline Cards ---------------------------------------------------------------------
create table if not exists public.headline_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  effect text not null,
  sentiment text not null check (sentiment in ('positive', 'negative', 'neutral')),
  created_at timestamptz default timezone('utc', now()) not null
);

-- Zone Control -----------------------------------------------------------------------
create table if not exists public.zone_control (
  session_id uuid not null references public.sessions(id) on delete cascade,
  zone_id text not null references public.zones(id) on delete cascade,
  voter_counts jsonb default '{}'::jsonb not null,
  majority_owner uuid references public.profiles(id),
  coalition jsonb,
  gerrymander_uses smallint default 0 not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  primary key (session_id, zone_id)
);

create index if not exists zone_control_majority_owner_idx
  on public.zone_control (majority_owner);

-- Turns -------------------------------------------------------------------------------
create table if not exists public.turns (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  turn_index integer not null,
  active_player uuid not null references public.profiles(id),
  neighbor_reader uuid references public.profiles(id),
  state jsonb default '{}'::jsonb not null,
  started_at timestamptz default timezone('utc', now()) not null,
  ended_at timestamptz
);

create unique index if not exists turns_session_index_idx
  on public.turns (session_id, turn_index);

-- Actions -----------------------------------------------------------------------------
create table if not exists public.actions (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  turn_id bigint references public.turns(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action_type text not null,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc', now()) not null
);

create index if not exists actions_session_idx on public.actions (session_id);
create index if not exists actions_turn_idx on public.actions (turn_id);

-- Helper functions (dependent on tables) ---------------------------------------------
create or replace function public.is_session_participant(_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_players sp
    where sp.session_id = _session_id
      and sp.profile_id = auth.uid()
  );
$$;

create or replace function public.is_profile_owner(_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select _profile_id = auth.uid();
$$;

-- RLS Setup --------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.zones enable row level security;
alter table public.vote_bank_cards enable row level security;
alter table public.headline_cards enable row level security;
alter table public.ideology_cards enable row level security;
alter table public.conspiracy_cards enable row level security;
alter table public.zone_control enable row level security;
alter table public.turns enable row level security;
alter table public.actions enable row level security;

-- Profiles RLS
create policy "Profiles are readable by authenticated users"
  on public.profiles
  for select
  using (true);

create policy "Users may insert their profile row"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users may update their own profile"
  on public.profiles
  for update
  using (public.is_profile_owner(id));

-- Sessions RLS
create policy "Session readable by participants"
  on public.sessions
  for select
  using (public.is_session_participant(id));

create policy "Hosts can update their sessions"
  on public.sessions
  for update
  using (auth.uid() = host_id);

create policy "Hosts can insert sessions"
  on public.sessions
  for insert
  with check (auth.uid() = host_id);

-- Session players RLS
create policy "Participants read session players"
  on public.session_players
  for select
  using (public.is_session_participant(session_id));

create policy "Players manage their own session row"
  on public.session_players
  for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Zone control RLS
create policy "Participants read zone control"
  on public.zone_control
  for select
  using (public.is_session_participant(session_id));

create policy "Service role manages zone control"
  on public.zone_control
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Static data tables RLS
create policy "Zones readable by authenticated users"
  on public.zones
  for select
  using (true);

create policy "Vote bank readable by authenticated users"
  on public.vote_bank_cards
  for select
  using (true);

create policy "Headlines readable by authenticated users"
  on public.headline_cards
  for select
  using (true);

create policy "Ideology cards readable by authenticated users"
  on public.ideology_cards
  for select
  using (true);

create policy "Conspiracy cards readable by authenticated users"
  on public.conspiracy_cards
  for select
  using (true);

-- Turns RLS
create policy "Participants read turns"
  on public.turns
  for select
  using (public.is_session_participant(session_id));

create policy "Service role writes turns"
  on public.turns
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Actions RLS
create policy "Participants read actions"
  on public.actions
  for select
  using (public.is_session_participant(session_id));

create policy "Participants log actions they perform"
  on public.actions
  for insert
  with check (auth.uid() = actor_id);

create policy "Service role can manage actions"
  on public.actions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

