alter table public.zone_control
  add column if not exists volatile_slots jsonb default '[]'::jsonb not null;

