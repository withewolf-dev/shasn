'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase';
import {
  evaluateSessionEndState,
  formCoalition,
  influenceVoters,
  resolveIdeologyAnswer,
} from '@/server/engine';
import { applyConspiracyEffect } from '@/server/conspiracies';
import { drawDeckCards, peekDeckCards } from '@/server/decks';
import { completeTurn } from '@/server/turn-loop';
import type { ConspiracyCardRow, IdeologyCardRow } from '@/types/database';
import { getConspiracyEffectConfig, spendGenericResources } from '@/lib/rules';

export async function submitIdeologyAnswer(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const turnId = Number(formData.get('turnId'));
  const cardId = formData.get('cardId')?.toString() ?? '';
  const choice = formData.get('choice')?.toString() as 'answer_a' | 'answer_b';

  if (!sessionId || !turnId || !cardId || !choice) {
    throw new Error('Missing fields for ideology answer.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  const turn = await assertTurnState(supabase, sessionId, turnId, user.id, 'awaiting-ideology-answer');

  const { data: cardData, error: cardError } = await supabase
    .from('ideology_cards')
    .select('id, answer_a, answer_b')
    .eq('id', cardId)
    .single();
  if (cardError) throw new Error(cardError.message);

  const card = cardData as IdeologyCardRow;
  const selectedAnswer = choice === 'answer_a' ? card.answer_a : card.answer_b;

  await resolveIdeologyAnswer({
    sessionId,
    turnId,
    playerId: user.id,
    cardId,
    choice,
    rewards: selectedAnswer.resources ?? {},
    ideology: selectedAnswer.ideologue,
  });

  await supabase
    .from('turns')
    .update({
      state: {
        ...turn.state,
        status: 'awaiting-influence',
        ideology_card_id: cardId,
        ideology_choice: choice,
      },
    })
    .eq('id', turnId);

  await drawDeckCards(sessionId, 'ideology', 1);
  revalidatePath(`/game/${sessionId}`);
}

export async function submitInfluenceAction(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const turnId = Number(formData.get('turnId'));
  const cardId = formData.get('voteBankCardId')?.toString() ?? '';
  const zoneId = formData.get('zoneId')?.toString() ?? '';

  if (!sessionId || !turnId || !cardId || !zoneId) {
    throw new Error('Missing fields for influence action.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  await assertTurnState(supabase, sessionId, turnId, user.id, 'awaiting-influence');

  const result = await influenceVoters({
    sessionId,
    turnId,
    playerId: user.id,
    voteBankCardId: cardId,
    zoneId,
  });

  if (result.majorityClaimed) {
    await supabase.from('actions').insert({
      session_id: sessionId,
      turn_id: turnId,
      actor_id: user.id,
      action_type: 'MAJORITY_FORMED',
      payload: { zone_id: zoneId, player_id: user.id },
    });
  }

  await drawDeckCards(sessionId, 'vote_bank', 1);
  await completeTurn({ turnId, sessionId, actorId: user.id });
  revalidatePath(`/game/${sessionId}`);
}

export async function buyConspiracyCard(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const turnId = Number(formData.get('turnId'));

  if (!sessionId || !turnId) {
    throw new Error('Missing fields for conspiracy purchase.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  await assertTurnState(supabase, sessionId, turnId, user.id, [
    'awaiting-ideology-answer',
    'awaiting-influence',
  ]);

  let card: ConspiracyCardRow | null = null;
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const [candidate] = await peekDeckCards<ConspiracyCardRow>(sessionId, 'conspiracy', 1);
    if (!candidate) break;
    const config = getConspiracyEffectConfig(candidate.id);
    if (config?.implemented) {
      card = candidate;
      break;
    }
    await drawDeckCards(sessionId, 'conspiracy', 1);
  }
  if (!card) throw new Error('No playable conspiracy cards remaining.');

  const { data: playerRow, error: playerError } = await supabase
    .from('session_players')
    .select('resources, conspiracy_hand')
    .match({ session_id: sessionId, profile_id: user.id })
    .single();
  if (playerError) throw new Error(playerError.message);

  const updatedResources = spendGenericResources(playerRow.resources ?? {}, card.cost ?? 4);
  const updatedHand = [...((playerRow.conspiracy_hand as string[] | undefined) ?? []), card.id];

  const { error: updateError } = await supabase
    .from('session_players')
    .update({ resources: updatedResources, conspiracy_hand: updatedHand })
    .match({ session_id: sessionId, profile_id: user.id });
  if (updateError) throw new Error(updateError.message);

  await drawDeckCards(sessionId, 'conspiracy', 1);

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: turnId,
    actor_id: user.id,
    action_type: 'BUY_CONSPIRACY',
    payload: { card_id: card.id, title: card.title, cost: card.cost },
  });

  revalidatePath(`/game/${sessionId}`);
}

export async function playConspiracyCard(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const turnId = Number(formData.get('turnId'));
  const cardId = formData.get('cardId')?.toString() ?? '';
  const rawTargetId = formData.get('targetId');
  const targetId =
    typeof rawTargetId === 'string' && rawTargetId.length > 0
      ? rawTargetId
      : undefined;

  if (!sessionId || !turnId || !cardId) {
    throw new Error('Missing fields for conspiracy play.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  await assertTurnState(supabase, sessionId, turnId, user.id, [
    'awaiting-ideology-answer',
    'awaiting-influence',
  ]);

  const { data: playerRow, error: playerError } = await supabase
    .from('session_players')
    .select('conspiracy_hand, conspiracy_flags')
    .match({ session_id: sessionId, profile_id: user.id })
    .single();
  if (playerError) throw new Error(playerError.message);

  const skipPlayWindow = Boolean(
    (playerRow.conspiracy_flags as Record<string, unknown> | undefined)?.skip_play_window,
  );
  if (skipPlayWindow) {
    await supabase
      .from('session_players')
      .update({
        conspiracy_flags: { ...(playerRow.conspiracy_flags ?? {}), skip_play_window: false },
      })
      .match({ session_id: sessionId, profile_id: user.id });
    throw new Error('You are silenced and must skip this conspiracy play window.');
  }

  const hand = (playerRow.conspiracy_hand as string[] | undefined) ?? [];
  if (!hand.includes(cardId)) {
    throw new Error('Card not in hand.');
  }

  const { data: cardData, error: cardError } = await supabase
    .from('conspiracy_cards')
    .select('*')
    .eq('id', cardId)
    .single();
  if (cardError) throw new Error(cardError.message);

  const effectResult = await applyConspiracyEffect({
    supabase,
    sessionId,
    actorId: user.id,
    card: cardData as ConspiracyCardRow,
    targetId,
  });

  const updatedHand = hand.filter((id) => id !== cardId);
  await supabase
    .from('session_players')
    .update({ conspiracy_hand: updatedHand })
    .match({ session_id: sessionId, profile_id: user.id });

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: turnId,
    actor_id: user.id,
    action_type: 'PLAY_CONSPIRACY',
    payload: {
      card_id: cardData.id,
      title: cardData.title,
      target_id: targetId ?? null,
      effect: effectResult,
    },
  });

  revalidatePath(`/game/${sessionId}`);
}

export async function forceCompleteSession(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const summary = formData.get('summary')?.toString()?.slice(0, 500) ?? '';

  if (!sessionId) {
    throw new Error('Missing session ID.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('host_id, status')
    .eq('id', sessionId)
    .single();
  if (sessionError || !sessionRow) throw new Error('Session not found.');
  if (sessionRow.host_id !== user.id) {
    throw new Error('Only the host can complete the session.');
  }

  await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: null,
    actor_id: user.id,
    action_type: 'SESSION_COMPLETED',
    payload: { summary },
  });

  revalidatePath(`/game/${sessionId}`);
}

export async function requestCoalition(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const zoneId = formData.get('zoneId')?.toString() ?? '';
  const partnerId = formData.get('partnerId')?.toString() ?? '';

  if (!sessionId || !zoneId || !partnerId) {
    throw new Error('Missing fields for coalition.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  if (partnerId === user.id) {
    throw new Error('Choose a different partner.');
  }

  const [{ data: zone }, { data: zoneMeta }] = await Promise.all([
    supabase
      .from('zone_control')
      .select('voter_counts, majority_owner, coalition')
      .match({ session_id: sessionId, zone_id: zoneId })
      .maybeSingle(),
    supabase.from('zones').select('majority_required').eq('id', zoneId).maybeSingle(),
  ]);

  if (!zone || !zoneMeta) {
    throw new Error('Zone not found.');
  }
  if (zone.coalition) {
    throw new Error('Coalition already active in this zone.');
  }
  if (zone.majority_owner !== partnerId) {
    throw new Error('Partner must currently own the majority.');
  }

  const voterCounts = zone.voter_counts ?? {};
  const selfVotes = voterCounts[user.id] ?? 0;
  if (selfVotes <= 0) {
    throw new Error('You must have votes in the zone to propose a coalition.');
  }
  const combined = selfVotes + (voterCounts[partnerId] ?? 0);
  if (combined < zoneMeta.majority_required) {
    throw new Error('Combined votes do not meet the majority requirement.');
  }

  const { data: players, error: playerError } = await supabase
    .from('session_players')
    .select('profile_id, ideology_state')
    .in('profile_id', [user.id, partnerId])
    .eq('session_id', sessionId);
  if (playerError) throw new Error(playerError.message);

  const selfState = players?.find((row) => row.profile_id === user.id)?.ideology_state ?? {};
  const partnerState = players?.find((row) => row.profile_id === partnerId)?.ideology_state ?? {};

  const selfIdeology = dominantIdeology(selfState);
  const partnerIdeology = dominantIdeology(partnerState);

  if (!selfIdeology || !partnerIdeology) {
    throw new Error('Both players must have an ideology card to trade.');
  }

  await Promise.all([
    updateIdeologyState(supabase, sessionId, user.id, selfState, selfIdeology),
    updateIdeologyState(supabase, sessionId, partnerId, partnerState, partnerIdeology),
  ]);

  await formCoalition(sessionId, zoneId, user.id, partnerId);

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: null,
    actor_id: user.id,
    action_type: 'COALITION_FORMED',
    payload: {
      zone_id: zoneId,
      players: [user.id, partnerId],
      ideologies_traded: {
        [user.id]: selfIdeology,
        [partnerId]: partnerIdeology,
      },
    },
  });

  revalidatePath(`/game/${sessionId}`);
}

export async function useGerrymander(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const turnId = Number(formData.get('turnId'));
  const sourceZoneId = formData.get('sourceZoneId')?.toString() ?? '';
  const targetZoneId = formData.get('targetZoneId')?.toString() ?? '';

  if (!sessionId || !turnId || !sourceZoneId || !targetZoneId) {
    throw new Error('Missing fields for gerrymander.');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Not authenticated');

  await assertTurnState(supabase, sessionId, turnId, user.id, [
    'awaiting-ideology-answer',
    'awaiting-influence',
  ]);

  const [{ data: sourceZone }, { data: targetZone }, { data: zonesMeta }, { data: playerRow }] =
    await Promise.all([
      supabase
        .from('zone_control')
        .select('voter_counts, majority_owner, coalition')
        .match({ session_id: sessionId, zone_id: sourceZoneId })
        .maybeSingle(),
      supabase
        .from('zone_control')
        .select('voter_counts')
        .match({ session_id: sessionId, zone_id: targetZoneId })
        .maybeSingle(),
      supabase.from('zones').select('*'),
      supabase
        .from('session_players')
        .select('headline_flags, ideology_state')
        .match({ session_id: sessionId, profile_id: user.id })
        .maybeSingle(),
    ]);

  if (!sourceZone) {
    throw new Error('Source zone missing.');
  }

  if (sourceZone.coalition) {
    throw new Error('Coalition zones cannot gerrymander.');
  }

  if ((sourceZone.majority_owner ?? '') !== user.id) {
    throw new Error('You must control the source zone majority.');
  }

  const skipFlag = (playerRow?.headline_flags as Record<string, unknown> | undefined)?.skip_gerrymander;
  if (skipFlag) {
    throw new Error('Headline penalty: you must skip your next gerrymander.');
  }

  const sourceMeta = zonesMeta?.find((zone) => zone.id === sourceZoneId);
  const targetMeta = zonesMeta?.find((zone) => zone.id === targetZoneId);

  if (!sourceMeta || !targetMeta) {
    throw new Error('Zone metadata missing.');
  }

  const adjacency =
    sourceMeta.adjacency.includes(targetZoneId) || targetMeta.adjacency.includes(sourceZoneId);
  if (!adjacency) {
    throw new Error('Zones must share a border to gerrymander.');
  }

  const sourceCounts = normalizeCounts(sourceZone.voter_counts);
  const targetCounts = normalizeCounts(targetZone?.voter_counts);

  const majorityRequired = sourceMeta.majority_required;
  if ((sourceCounts[user.id] ?? 0) - 1 < majorityRequired) {
    throw new Error('You cannot move locked majority voters.');
  }

  const targetTotal =
    Object.values(targetCounts).reduce((sum, val) => sum + val, 0) + 1;
  if (targetTotal > targetMeta.total_voters) {
    throw new Error('Target zone is full.');
  }

  sourceCounts[user.id] -= 1;
  targetCounts[user.id] = (targetCounts[user.id] ?? 0) + 1;

  await Promise.all([
    supabase
      .from('zone_control')
      .upsert({
        session_id: sessionId,
        zone_id: sourceZoneId,
        voter_counts: sourceCounts,
        majority_owner: user.id,
      }),
    supabase
      .from('zone_control')
      .upsert({
        session_id: sessionId,
        zone_id: targetZoneId,
        voter_counts: targetCounts,
      }),
    supabase
      .from('session_players')
      .update({ headline_flags: { ...(playerRow?.headline_flags ?? {}), skip_gerrymander: false } })
      .match({ session_id: sessionId, profile_id: user.id }),
    supabase.from('actions').insert({
      session_id: sessionId,
      turn_id: turnId,
      actor_id: user.id,
      action_type: 'GERRYMANDER',
      payload: {
        from: sourceZoneId,
        to: targetZoneId,
      },
    }),
  ]);

  await evaluateSessionEndState(supabase, sessionId);

  revalidatePath(`/game/${sessionId}`);
}

async function assertTurnState(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  turnId: number,
  playerId: string,
  expectedStatus: string | string[],
) {
  const { data: turn, error } = await supabase
    .from('turns')
    .select('*')
    .eq('id', turnId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!turn) throw new Error('Active turn not found.');
  if (turn.session_id !== sessionId) throw new Error('Turn/session mismatch.');
  if (turn.active_player !== playerId) throw new Error('Not your turn.');
  if (turn.ended_at) throw new Error('Turn already completed.');

  const currentStatus = ((turn.state as Record<string, unknown>)?.status as string) ?? 'awaiting-ideology-answer';
  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  if (!allowed.includes(currentStatus)) {
    throw new Error(`Turn is not ready for this action (current: ${currentStatus}).`);
  }

  return turn;
}

function dominantIdeology(state?: Record<string, number> | null) {
  if (!state) return null;
  let maxKey: string | null = null;
  let maxValue = 0;
  for (const [key, value] of Object.entries(state)) {
    if ((value ?? 0) > maxValue) {
      maxKey = key;
      maxValue = value ?? 0;
    }
  }
  return maxValue > 0 ? maxKey : null;
}

async function updateIdeologyState(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  profileId: string,
  state: Record<string, number>,
  ideology: string,
) {
  const updated = { ...state, [ideology]: Math.max(0, (state[ideology] ?? 0) - 1) };
  await supabase
    .from('session_players')
    .update({ ideology_state: updated })
    .match({ session_id: sessionId, profile_id: profileId });
}

// export async function requestCoalition(formData: FormData) {
//   const sessionId = formData.get('sessionId')?.toString() ?? '';
//   const zoneId = formData.get('zoneId')?.toString() ?? '';
//   const partnerId = formData.get('partnerId')?.toString() ?? '';

//   if (!sessionId || !zoneId || !partnerId) {
//     throw new Error('Missing fields for coalition.');
//   }

//   const supabase = createServerSupabaseClient();
//   const {
//     data: { user },
//     error: userError,
//   } = await supabase.auth.getUser();
//   if (userError) throw new Error(userError.message);
//   if (!user) throw new Error('Not authenticated');

//   if (partnerId === user.id) {
//     throw new Error('Choose a different partner.');
//   }

//   const [{ data: zone }, { data: zoneMeta }] = await Promise.all([
//     supabase
//       .from('zone_control')
//       .select('voter_counts, majority_owner, coalition')
//       .match({ session_id: sessionId, zone_id: zoneId })
//       .maybeSingle(),
//     supabase.from('zones').select('majority_required').eq('id', zoneId).maybeSingle(),
//   ]);

//   if (!zone || !zoneMeta) {
//     throw new Error('Zone not found.');
//   }
//   if (zone.coalition) {
//     throw new Error('Coalition already active in this zone.');
//   }
//   if (zone.majority_owner !== partnerId) {
//     throw new Error('Partner must currently own the majority.');
//   }
//   const voterCounts = zone.voter_counts ?? {};
//   const selfVotes = voterCounts[user.id] ?? 0;
//   if (selfVotes <= 0) {
//     throw new Error('You must have votes in the zone to propose a coalition.');
//   }
//   const combined = selfVotes + (voterCounts[partnerId] ?? 0);
//   if (combined < zoneMeta.majority_required) {
//     throw new Error('Combined votes do not meet the majority requirement.');
//   }

//   const { data: players, error: playerError } = await supabase
//     .from('session_players')
//     .select('profile_id, ideology_state')
//     .in('profile_id', [user.id, partnerId])
//     .eq('session_id', sessionId);
//   if (playerError) throw new Error(playerError.message);

//   const selfState = players?.find((row) => row.profile_id === user.id)?.ideology_state ?? {};
//   const partnerState = players?.find((row) => row.profile_id === partnerId)?.ideology_state ?? {};

//   const selfIdeology = dominantIdeology(selfState);
//   const partnerIdeology = dominantIdeology(partnerState);

//   if (!selfIdeology || !partnerIdeology) {
//     throw new Error('Both players must have an ideology card to trade.');
//   }

//   await Promise.all([
//     updateIdeologyState(supabase, sessionId, user.id, selfState, selfIdeology),
//     updateIdeologyState(supabase, sessionId, partnerId, partnerState, partnerIdeology),
//   ]);

//   await formCoalition(sessionId, zoneId, user.id, partnerId);

//   await supabase.from('actions').insert({
//     session_id: sessionId,
//     turn_id: null,
//     actor_id: user.id,
//     action_type: 'COALITION_FORMED',
//     payload: {
//       zone_id: zoneId,
//       players: [user.id, partnerId],
//       ideologies_traded: {
//         [user.id]: selfIdeology,
//         [partnerId]: partnerIdeology,
//       },
//     },
//   });
// }