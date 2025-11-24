alter table public.session_players
  add column if not exists headline_flags jsonb default '{}'::jsonb not null;

