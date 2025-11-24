'use server';

import {
  addResourceBundles,
  clampResourceBundle,
  computeIdeologuePassiveIncome,
} from '@/lib/rules';
import type { ResourceBundle } from '@/lib/rules';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ensureSessionDecks, peekDeckCards } from '@/server/decks';

export interface StartTurnInput {
  sessionId: string;
  activePlayerId: string;
  neighborReaderId?: string;
  turnIndex: number;
}

export async function startTurn(input: StartTurnInput) {
  const supabase = createServerSupabaseClient();

  const { data: turn, error } = await supabase
    .from('turns')
    .insert({
      session_id: input.sessionId,
      turn_index: input.turnIndex,
      active_player: input.activePlayerId,
      neighbor_reader: input.neighborReaderId ?? null,
      state: { status: 'awaiting-ideology-answer' },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start turn: ${error.message}`);
  }

  await supabase.from('actions').insert({
    session_id: input.sessionId,
    turn_id: turn.id,
    actor_id: input.activePlayerId,
    action_type: 'TURN_START',
    payload: { turn_index: input.turnIndex },
  });

  await grantIdeologuePassiveIncome({
    supabase,
    sessionId: input.sessionId,
    playerId: input.activePlayerId,
    turnId: turn.id,
  });

  return turn;
}

async function grantIdeologuePassiveIncome({
  supabase,
  sessionId,
  playerId,
  turnId,
}: {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  sessionId: string;
  playerId: string;
  turnId: number;
}) {
  const { data: playerRow, error } = await supabase
    .from('session_players')
    .select('resources, ideology_state')
    .match({ session_id: sessionId, profile_id: playerId })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const passiveIncome = computeIdeologuePassiveIncome(
    (playerRow.ideology_state as Record<string, number> | null) ?? {},
  );

  if (Object.keys(passiveIncome).length === 0) {
    return;
  }

  const incrementedResources = addResourceBundles(playerRow.resources ?? {}, passiveIncome);
  const { bundle: cappedResources, discarded, overflow } = clampResourceBundle(incrementedResources);
  const appliedIncome = Object.entries(passiveIncome).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      const typedKey = key as keyof ResourceBundle;
      const discardedAmount = discarded[typedKey] ?? 0;
      const applied = Math.max(0, (value ?? 0) - discardedAmount);
      if (applied > 0) {
        acc[typedKey] = applied;
      }
      return acc;
    },
    {},
  );

  await supabase
    .from('session_players')
    .update({ resources: cappedResources })
    .match({ session_id: sessionId, profile_id: playerId });

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: turnId,
    actor_id: playerId,
    action_type: 'IDEOLOGUE_PASSIVE_GAIN',
    payload: {
      passive_income: passiveIncome,
      applied_income: appliedIncome,
      discarded,
    },
  });

  if (overflow > 0) {
    await supabase.from('actions').insert({
      session_id: sessionId,
      turn_id: turnId,
      actor_id: playerId,
      action_type: 'RESOURCE_CAP_DISCARD',
      payload: {
        source: 'passive_income',
        discarded,
        overflow,
      },
    });
  }
}

export interface CompleteTurnInput {
  turnId: number;
  sessionId: string;
  actorId: string;
}

export async function completeTurn({ turnId, sessionId, actorId }: CompleteTurnInput) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('turns')
    .update({ ended_at: new Date().toISOString(), state: { status: 'completed' } })
    .eq('id', turnId);

  if (error) {
    throw new Error(`Failed to complete turn: ${error.message}`);
  }

  await supabase.from('actions').insert({
    session_id: sessionId,
    turn_id: turnId,
    actor_id: actorId,
    action_type: 'TURN_END',
    payload: {},
  });

  await supabase
    .from('session_players')
    .update({ headline_flags: { skip_gerrymander: false } })
    .match({ session_id: sessionId, profile_id: actorId });

  await startNextTurn(supabase, sessionId, turnId);
}

async function startNextTurn(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sessionId: string,
  previousTurnId: number,
) {
  const { data: players, error: playersError } = await supabase
    .from('session_players')
    .select('profile_id, seat_order')
    .eq('session_id', sessionId)
    .order('seat_order');

  if (playersError) throw new Error(playersError.message);
  if (!players || players.length === 0) return;

  const { data: previousTurn, error: previousTurnError } = await supabase
    .from('turns')
    .select('*')
    .eq('id', previousTurnId)
    .single();
  if (previousTurnError) throw new Error(previousTurnError.message);

  const currentIndex = players.findIndex((player) => player.profile_id === previousTurn.active_player);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % players.length : 0;
  const nextPlayer = players[nextIndex];
  const neighbor = players[(nextIndex - 1 + players.length) % players.length];

  await ensureSessionDecks(sessionId);
  const [ideologyPreview, votePreview] = await Promise.all([
    peekDeckCards(sessionId, 'ideology', 1),
    peekDeckCards(sessionId, 'vote_bank', 3),
  ]);

  await startTurn({
    sessionId,
    activePlayerId: nextPlayer.profile_id,
    neighborReaderId: neighbor.profile_id,
    turnIndex: previousTurn.turn_index + 1,
  });

  await supabase
    .from('turns')
    .update({
      state: {
        status: 'awaiting-ideology-answer',
        ideology_preview: ideologyPreview,
        vote_bank_preview: votePreview,
      },
    })
    .eq('session_id', sessionId)
    .eq('turn_index', previousTurn.turn_index + 1);
}

