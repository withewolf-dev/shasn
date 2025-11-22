insert into public.zones (id, display_name, total_voters, majority_required, volatile_slots, adjacency)
values
  ('capital', 'Capital City', 11, 6, 2, array['heartland', 'harbor', 'industrial']),
  ('heartland', 'Heartland', 9, 5, 1, array['capital', 'industrial']),
  ('harbor', 'Harbor District', 7, 4, 1, array['capital', 'fringe']),
  ('industrial', 'Industrial Belt', 10, 6, 2, array['capital', 'heartland', 'fringe']),
  ('fringe', 'Frontier Fringe', 8, 5, 1, array['harbor', 'industrial'])
on conflict (id) do nothing;

insert into public.vote_bank_cards (id, voters, cost, marked_cost)
values
  ('11111111-1111-4111-8111-111111111111', 1, '{"funds":1,"media":1}'::jsonb, 'funds'),
  ('22222222-2222-4222-8222-222222222222', 2, '{"funds":2,"clout":1}'::jsonb, 'clout'),
  ('33333333-3333-4333-8333-333333333333', 3, '{"funds":3,"trust":1}'::jsonb, 'trust'),
  ('44444444-4444-4444-8444-444444444444', 1, '{"media":2}'::jsonb, 'media'),
  ('55555555-5555-4555-8555-555555555555', 2, '{"clout":2,"trust":1}'::jsonb, 'trust'),
  ('66666666-6666-4666-8666-666666666666', 3, '{"funds":2,"media":1,"clout":1}'::jsonb, 'media')
on conflict (id) do nothing;

insert into public.headline_cards (id, title, effect, sentiment)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Scandal Uncovered', 'Lose 2 resources of your choice.', 'negative'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Grassroots Surge', 'Gain 1 voter in any zone.', 'positive'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Media Blitz Backfires', 'Discard one media resource and skip next gerrymander.', 'negative'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Unexpected Endorsement', 'Convert one neutral voter to your color.', 'positive'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Cyber Leak', 'Reveal your hand of conspiracy cards.', 'negative')
on conflict (id) do nothing;
