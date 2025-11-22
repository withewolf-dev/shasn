alter table public.session_players
  add column if not exists conspiracy_hand jsonb default '[]'::jsonb not null;

