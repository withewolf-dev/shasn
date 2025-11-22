'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase';
import { influenceVoters, resolveIdeologyAnswer } from '@/server/engine';
import { drawDeckCards, peekDeckCards } from '@/server/decks';
import { completeTurn } from '@/server/turn-loop';
import type { IdeologyCardRow, ConspiracyCardRow } from '@/types/database';
import { spendGenericResources } from '@/lib/rules';

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
export async function playConspiracyCard(formData: FormData) {
  const sessionId = formData.get('sessionId')?.toString() ?? '';
  const turnId = Number(formData.get('turnId'));
  const cardId = formData.get('cardId')?.toString() ?? '';

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
    .select('conspiracy_hand')
    .match({ session_id: sessionId, profile_id: user.id })
    .single();

  if (playerError) throw new Error(playerError.message);
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
    payload: { card_id: cardData.id, title: cardData.title },
  });

  revalidatePath(`/game/${sessionId}`);
}
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

  const [card] = await peekDeckCards<ConspiracyCardRow>(sessionId, 'conspiracy', 1);
  if (!card) {
    throw new Error('No conspiracy cards remaining.');
  }

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

