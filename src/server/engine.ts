'use server';

import { addResourceBundles, subtractResourceBundle } from '@/lib/rules';
import type { ResourceBundle } from '@/lib/rules';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    .select('voter_counts, majority_owner, gerrymander_uses')
    .match({ session_id: sessionId, zone_id: zoneId })
    .maybeSingle();

  const voterCounts = normalizeVoterCounts(zoneControlRow?.voter_counts);
  voterCounts[playerId] = (voterCounts[playerId] ?? 0) + card.voters;

  const hasMajority = voterCounts[playerId] >= zoneMeta.majority_required;
  const isNewMajority = hasMajority && zoneControlRow?.majority_owner !== playerId;

  const { error: upsertError } = await supabase.from('zone_control').upsert(
    {
      session_id: sessionId,
      zone_id: zoneId,
      voter_counts: voterCounts,
      majority_owner: hasMajority ? playerId : zoneControlRow?.majority_owner ?? null,
      gerrymander_uses: hasMajority
        ? Math.max(1, zoneControlRow?.gerrymander_uses ?? 1)
        : zoneControlRow?.gerrymander_uses ?? 0,
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

  return {
    resources: updatedResources,
    voterCounts,
    majorityOwner: hasMajority ? playerId : zoneControlRow?.majority_owner ?? null,
    majorityClaimed: isNewMajority,
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

