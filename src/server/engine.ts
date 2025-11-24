'use server';

import {
  addResourceBundles,
  clampResourceBundle,
  subtractResourceBundle,
  spendGenericResources,
} from '@/lib/rules';
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
    .select('resources, ideology_state')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();

  if (playerError) {
    throw new Error(playerError.message);
  }

  const gainedResources = addResourceBundles(playerRow.resources ?? {}, rewards);
  const { bundle: cappedResources, discarded, overflow } = clampResourceBundle(gainedResources);
  const updatedIdeologyState = incrementIdeologyState(
    (playerRow.ideology_state as Record<string, number> | null) ?? {},
    ideology,
  );

  const { error: updateError } = await supabase
    .from('session_players')
    .update({ resources: cappedResources, ideology_state: updatedIdeologyState })
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

  if (overflow > 0) {
    await supabase.from('actions').insert({
      session_id: sessionId,
      turn_id: turnId,
      actor_id: playerId,
      action_type: 'RESOURCE_CAP_DISCARD',
      payload: {
        source: 'ideology_answer',
        discarded,
        overflow,
      },
    });
  }

  return { resources: cappedResources };
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
    await triggerHeadline(sessionId, playerId, supabase);
  }

  await evaluateSessionEndState(supabase, sessionId);

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

export async function triggerHeadline(
  sessionId: string,
  playerId: string,
  existingClient?: ReturnType<typeof createServerSupabaseClient>,
) {
  const supabase = existingClient ?? createServerSupabaseClient();
  const [headline] = await peekDeckCards<HeadlineCardRow>(sessionId, 'headline', 1);
  if (!headline) return null;

  await drawDeckCards(sessionId, 'headline', 1);
  const result = await applyHeadlineEffect(supabase, sessionId, playerId, headline);

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
      result,
    },
  });

  await evaluateSessionEndState(supabase, sessionId);

  return headline;
}

async function applyHeadlineEffect(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  playerId: string,
  headline: HeadlineCardRow,
) {
  switch (headline.id) {
    case 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':
      await removeGenericResources(supabase, sessionId, playerId, 2);
      return { type: 'resources_removed', amount: 2 };
    case 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': {
      const zoneId = await grantBonusVoter(supabase, sessionId, playerId);
      return { type: 'bonus_voter', zone_id: zoneId };
    }
    case 'cccccccc-cccc-4ccc-8ccc-cccccccccccc':
      await removeSpecificResource(supabase, sessionId, playerId, 'media', 1);
      await setHeadlineFlag(supabase, sessionId, playerId, { skip_gerrymander: true });
      return { type: 'media_loss_and_skip' };
    case 'dddddddd-dddd-4ddd-8ddd-dddddddddddd': {
      const zoneId = (await convertOpponentVoter(supabase, sessionId, playerId)) ??
        (await grantBonusVoter(supabase, sessionId, playerId));
      return { type: 'convert_voter', zone_id: zoneId };
    }
    case 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee':
      await setHeadlineFlag(supabase, sessionId, playerId, { reveal_hand: true });
      return { type: 'reveal_hand' };
    default:
      return { type: 'logged_only' };
  }
}

async function removeGenericResources(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  playerId: string,
  amount: number,
) {
  const { data } = await supabase
    .from('session_players')
    .select('resources')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();
  const updated = spendGenericResources(data?.resources ?? {}, amount);
  await supabase
    .from('session_players')
    .update({ resources: updated })
    .match({ session_id: sessionId, profile_id: playerId });
}

async function removeSpecificResource(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  playerId: string,
  resource: string,
  amount: number,
) {
  const { data } = await supabase
    .from('session_players')
    .select('resources')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();
  const current = { ...(data?.resources ?? {}) };
  current[resource] = Math.max(0, (current[resource] ?? 0) - amount);
  await supabase
    .from('session_players')
    .update({ resources: current })
    .match({ session_id: sessionId, profile_id: playerId });
}

async function setHeadlineFlag(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  playerId: string,
  flag: Record<string, unknown>,
) {
  const { data } = await supabase
    .from('session_players')
    .select('headline_flags')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();
  const updated = { ...(data?.headline_flags ?? {}), ...flag };
  await supabase
    .from('session_players')
    .update({ headline_flags: updated })
    .match({ session_id: sessionId, profile_id: playerId });
}

async function grantBonusVoter(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  playerId: string,
) {
  const { data: zones } = await supabase.from('zones').select('*');
  const { data: controls } = await supabase
    .from('zone_control')
    .select('zone_id, voter_counts, majority_owner, gerrymander_uses')
    .eq('session_id', sessionId);

  for (const zone of zones ?? []) {
    const zoneControl = controls?.find((row) => row.zone_id === zone.id);
    const counts = normalizeVoterCounts(zoneControl?.voter_counts);
    const placed = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (placed >= zone.total_voters) continue;
    counts[playerId] = (counts[playerId] ?? 0) + 1;
    await supabase.from('zone_control').upsert({
      session_id: sessionId,
      zone_id: zone.id,
      voter_counts: counts,
      majority_owner: zoneControl?.majority_owner ?? null,
      gerrymander_uses: zoneControl?.gerrymander_uses ?? 0,
    });
    return zone.id;
  }
  return null;
}

async function convertOpponentVoter(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  playerId: string,
) {
  const { data: controls } = await supabase
    .from('zone_control')
    .select('zone_id, voter_counts')
    .eq('session_id', sessionId);

  for (const control of controls ?? []) {
    const counts = normalizeVoterCounts(control.voter_counts);
    const targetEntry = Object.entries(counts).find(
      ([id, count]) => id !== playerId && (count ?? 0) > 0,
    );
    if (!targetEntry) continue;

    const [opponentId] = targetEntry;
    counts[opponentId] = Math.max(0, counts[opponentId] - 1);
    counts[playerId] = (counts[playerId] ?? 0) + 1;

    await supabase.from('zone_control').upsert({
      session_id: sessionId,
      zone_id: control.zone_id,
      voter_counts: counts,
    });
    return control.zone_id;
  }
  return null;
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

function incrementIdeologyState(
  state: Record<string, number>,
  ideology?: string | null,
): Record<string, number> {
  if (!ideology) {
    return state;
  }

  const next = { ...state };
  next[ideology] = (next[ideology] ?? 0) + 1;
  return next;
}

export async function evaluateSessionEndState(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
) {
  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('status, host_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !sessionRow) {
    return;
  }

  if (['endgame', 'completed', 'cancelled'].includes(sessionRow.status)) {
    return;
  }

  const [{ data: zones }, { data: controls }] = await Promise.all([
    supabase.from('zones').select('id, total_voters, majority_required'),
    supabase
      .from('zone_control')
      .select('zone_id, voter_counts, majority_owner')
      .eq('session_id', sessionId),
  ]);

  if (!zones || zones.length === 0) {
    return;
  }

  const controlMap = new Map((controls ?? []).map((control) => [control.zone_id, control]));

  const allMajorities = zones.every((zone) => {
    const control = controlMap.get(zone.id);
    if (!control || !control.majority_owner) return false;
    const counts = normalizeVoterCounts(control.voter_counts);
    return (counts[control.majority_owner] ?? 0) >= zone.majority_required;
  });

  const boardFull = zones.every((zone) => {
    const control = controlMap.get(zone.id);
    if (!control) return false;
    const counts = normalizeVoterCounts(control.voter_counts);
    const placed = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return placed >= zone.total_voters;
  });

  if (!allMajorities && !boardFull) {
    return;
  }

  const reason = allMajorities ? 'all_majorities' : 'board_full';

  await supabase.from('sessions').update({ status: 'endgame' }).eq('id', sessionId);

  if (sessionRow.host_id) {
    await supabase.from('actions').insert({
      session_id: sessionId,
      turn_id: null,
      actor_id: sessionRow.host_id,
      action_type: 'SESSION_END_TRIGGERED',
      payload: { reason },
    });
  }
}

