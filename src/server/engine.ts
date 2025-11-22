'use server';

import { addResourceBundles, subtractResourceBundle } from '@/lib/rules';
import type { ResourceBundle } from '@/lib/rules';
import { createServerSupabaseClient } from '@/lib/supabase';
import { drawDeckCards, peekDeckCards } from '@/server/decks';
import type { HeadlineCardRow } from '@/types/database';

interface IdeologyAnswerInput {
  sessionId: string;
  turnId: number;
  playerId: string;
  cardId: string;
  choice: 'answer_a' | 'answer_b';
  rewards: ResourceBundle;
  ideology: string;
}

export async function resolveIdeologyAnswer({
  sessionId,
  turnId,
  playerId,
  cardId,
  choice,
  rewards,
  ideology,
}: IdeologyAnswerInput) {
  const supabase = createServerSupabaseClient();

  const { data: playerRow, error: playerError } = await supabase
    .from('session_players')
    .select('resources')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();

  if (playerError) {
    throw new Error(playerError.message);
  }

  const updatedResources = addResourceBundles(playerRow.resources ?? {}, rewards);

  const { error: updateError } = await supabase
    .from('session_players')
    .update({ resources: updatedResources })
    .match({ session_id: sessionId, profile_id: playerId });

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: turnId,
    actor_id: playerId,
    action_type: 'IDEOLOGY_ANSWER',
    payload: { card_id: cardId, choice, rewards, ideology },
  });

  return { resources: updatedResources };
}

interface InfluenceVotersInput {
  sessionId: string;
  turnId: number;
  playerId: string;
  voteBankCardId: string;
  zoneId: string;
}

export async function influenceVoters({
  sessionId,
  turnId,
  playerId,
  voteBankCardId,
  zoneId,
}: InfluenceVotersInput) {
  const supabase = createServerSupabaseClient();

  const [{ data: card, error: cardError }, { data: zoneMeta, error: zoneError }] = await Promise.all([
    supabase.from('vote_bank_cards').select('id, voters, cost').eq('id', voteBankCardId).single(),
    supabase.from('zones').select('id, majority_required').eq('id', zoneId).single(),
  ]);

  if (cardError) throw new Error(cardError.message);
  if (zoneError) throw new Error(zoneError.message);

  const { data: playerRow, error: playerError } = await supabase
    .from('session_players')
    .select('resources')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();

  if (playerError) throw new Error(playerError.message);

  const updatedResources = subtractResourceBundle(playerRow.resources ?? {}, card.cost ?? {});

  const { error: resourceUpdateError } = await supabase
    .from('session_players')
    .update({ resources: updatedResources })
    .match({ session_id: sessionId, profile_id: playerId });

  if (resourceUpdateError) {
    throw new Error(resourceUpdateError.message);
  }

  const { data: zoneControlRow } = await supabase
    .from('zone_control')
    .select('voter_counts, majority_owner, gerrymander_uses, volatile_slots')
    .match({ session_id: sessionId, zone_id: zoneId })
    .maybeSingle();

  const voterCounts = normalizeVoterCounts(zoneControlRow?.voter_counts);
  voterCounts[playerId] = (voterCounts[playerId] ?? 0) + card.voters;

  const hasMajority = voterCounts[playerId] >= zoneMeta.majority_required;
  const coalitionEligible =
    voterCounts[playerId] < zoneMeta.majority_required &&
    zoneControlRow?.majority_owner &&
    zoneControlRow.majority_owner !== playerId &&
    (voterCounts[playerId] ?? 0) + (voterCounts[zoneControlRow.majority_owner] ?? 0) >= zoneMeta.majority_required;
  const isNewMajority = hasMajority && zoneControlRow?.majority_owner !== playerId;

  const {
    updatedVolatileSlots,
    headlineTriggered,
  } = fillVolatileSlots({
    maxSlots: zoneMeta.volatile_slots ?? 0,
    existing: (zoneControlRow?.volatile_slots as VolatileSlot[] | undefined) ?? [],
    cardVoters: card.voters,
    playerId,
  });

  const { error: upsertError } = await supabase.from('zone_control').upsert(
    {
      session_id: sessionId,
      zone_id: zoneId,
      voter_counts: voterCounts,
      majority_owner: hasMajority ? playerId : zoneControlRow?.majority_owner ?? null,
      coalition: coalitionEligible
        ? {
            players: [playerId, zoneControlRow?.majority_owner].filter(Boolean),
            split: {
              [playerId]: voterCounts[playerId],
              [zoneControlRow?.majority_owner ?? '']: voterCounts[zoneControlRow?.majority_owner ?? ''] ?? 0,
            },
          }
        : zoneControlRow?.coalition ?? null,
      gerrymander_uses: hasMajority
        ? Math.max(1, zoneControlRow?.gerrymander_uses ?? 1)
        : zoneControlRow?.gerrymander_uses ?? 0,
      volatile_slots: updatedVolatileSlots,
    },
    {
      onConflict: 'session_id,zone_id',
    },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: turnId,
    actor_id: playerId,
    action_type: 'INFLUENCE_VOTERS',
    payload: {
      vote_bank_card_id: voteBankCardId,
      zone_id: zoneId,
      voters_added: card.voters,
      resources_spent: card.cost,
    },
  });

  if (headlineTriggered) {
    await triggerHeadline(sessionId, playerId);
  }

  return {
    resources: updatedResources,
    voterCounts,
    majorityOwner: hasMajority ? playerId : zoneControlRow?.majority_owner ?? null,
    majorityClaimed: isNewMajority,
    coalitionFormed: coalitionEligible,
    headlineTriggered,
  };
}

function normalizeVoterCounts(
  counts?: Record<string, number | null> | null,
): Record<string, number> {
  if (!counts) return {};
  return Object.entries(counts).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = typeof value === 'number' ? value : 0;
    return acc;
  }, {});
}

type VolatileSlot = { slot: number; player_id: string };

function fillVolatileSlots({
  maxSlots,
  existing,
  cardVoters,
  playerId,
}: {
  maxSlots: number;
  existing: VolatileSlot[];
  cardVoters: number;
  playerId: string;
}) {
  if (maxSlots <= 0) return { updatedVolatileSlots: existing, headlineTriggered: false };

  const filled = [...existing];
  let available = maxSlots - filled.length;
  let votersRemaining = cardVoters;
  let triggered = false;

  while (available > 0 && votersRemaining > 0) {
    const nextSlotIndex = maxSlots - available;
    filled.push({ slot: nextSlotIndex, player_id: playerId });
    available -= 1;
    votersRemaining -= 1;
    triggered = true;
  }

  return { updatedVolatileSlots: filled, headlineTriggered: triggered };
}

export async function triggerHeadline(sessionId: string, playerId: string) {
  const supabase = createServerSupabaseClient();
  const [headline] = await peekDeckCards<HeadlineCardRow>(sessionId, 'headline', 1);
  if (!headline) return null;

  await drawDeckCards(sessionId, 'headline', 1);

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: null,
    actor_id: playerId,
    action_type: 'HEADLINE_TRIGGERED',
    payload: {
      headline_id: headline.id,
      title: headline.title,
      effect: headline.effect,
      sentiment: headline.sentiment,
    },
  });

  return headline;
}

export async function formCoalition(sessionId: string, zoneId: string, playerA: string, playerB: string) {
  const supabase = createServerSupabaseClient();
  const { data: zone } = await supabase
    .from('zone_control')
    .select('voter_counts')
    .match({ session_id: sessionId, zone_id: zoneId })
    .single();

  if (!zone?.voter_counts) {
    throw new Error('Zone state missing.');
  }

  const split = {
    [playerA]: zone.voter_counts[playerA] ?? 0,
    [playerB]: zone.voter_counts[playerB] ?? 0,
  };

  await supabase
    .from('zone_control')
    .update({
      coalition: { players: [playerA, playerB], split },
    })
    .match({ session_id: sessionId, zone_id: zoneId });
}

