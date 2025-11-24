alter table public.session_players
  add column if not exists conspiracy_flags jsonb default '{}'::jsonb not null;


