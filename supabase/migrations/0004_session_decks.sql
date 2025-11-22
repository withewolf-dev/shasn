create table if not exists public.session_decks (
  session_id uuid not null references public.sessions(id) on delete cascade,
  deck_type text not null check (deck_type in ('ideology', 'vote_bank', 'conspiracy', 'headline')),
  cards uuid[] not null default '{}'::uuid[],
  discard uuid[] not null default '{}'::uuid[],
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  primary key (session_id, deck_type)
);

create trigger session_decks_updated_at
before update on public.session_decks
for each row
execute function public.set_updated_at();

alter table public.session_decks enable row level security;

create policy "Participants read session decks"
  on public.session_decks
  for select
  using (public.is_session_participant(session_id));

create policy "Service role mutates session decks"
  on public.session_decks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

