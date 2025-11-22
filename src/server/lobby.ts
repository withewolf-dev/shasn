'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase';

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

