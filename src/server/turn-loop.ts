'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

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

  return turn;
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
}

