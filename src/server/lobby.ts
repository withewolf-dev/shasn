'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase';

export interface SetReadyStateInput {
  sessionId: string;
  isReady: boolean;
}

export async function setReadyState({ sessionId, isReady }: SetReadyStateInput) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to fetch user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('session_players')
    .update({ is_ready: isReady })
    .match({ session_id: sessionId, profile_id: user.id });

  if (error) {
    throw new Error(`Failed to update ready state: ${error.message}`);
  }

  revalidatePath(`/lobby/${sessionId}`);
}

export interface CreateLobbyInput {
  title: string;
  maxPlayers: number;
}

export async function createLobby({ title, maxPlayers }: CreateLobbyInput) {
  // Use the regular client to identify the current user
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to fetch user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Use a service-role client for privileged inserts that may be blocked by RLS.
  const serviceClient = createServiceSupabaseClient();

  const { data: session, error: sessionError } = await serviceClient
    .from('sessions')
    .insert({
      host_id: user.id,
      status: 'lobby',
      title: title || 'Untitled Session',
      ruleset: { max_players: maxPlayers },
    })
    .select('id')
    .single();

  if (sessionError) {
    throw new Error(`Failed to create lobby: ${sessionError.message}`);
  }

  const sessionId = session.id as string;

  const { error: playerError } = await serviceClient.from('session_players').insert({
    session_id: sessionId,
    profile_id: user.id,
    seat_order: 0,
  });

  if (playerError) {
    throw new Error(`Failed to register host in lobby: ${playerError.message}`);
  }

  revalidatePath(`/lobby/${sessionId}`);

  return { sessionId };
}

