insert into public.ideology_cards (id, prompt, answer_a, answer_b)
values
  (
    '10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Should the government subsidize green infrastructure despite budget constraints?',
    '{"text":"Prioritize rapid growth","resources":{"funds":2,"media":1},"ideologue":"capitalist"}'::jsonb,
    '{"text":"Focus on social equity","resources":{"trust":2,"clout":1},"ideologue":"idealist"}'::jsonb
  ),
  (
    '20202020-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Will you broadcast unfiltered speeches or tightly controlled messaging?',
    '{"text":"Livestream authenticity","resources":{"clout":2},"ideologue":"showman"}'::jsonb,
    '{"text":"Script every word","resources":{"media":2},"ideologue":"supremo"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.conspiracy_cards (id, title, cost, description)
values
  (
    '30303030-cccc-4ccc-8ccc-cccccccccccc',
    'Backroom Bargain',
    4,
    'Immediately trade any 2 resources with another player without consent.'
  ),
  (
    '40404040-dddd-4ddd-8ddd-dddddddddddd',
    'Media Smear',
    5,
    'Force an opponent to discard 1 media and skip their next Conspiracy play window.'
  )
on conflict (id) do nothing;

