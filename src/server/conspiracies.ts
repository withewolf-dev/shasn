'use server';

import type { ConspiracyCardRow } from '@/types/database';
import { CONSPIRACY_EFFECTS } from '@/lib/rules';
import { createServerSupabaseClient } from '@/lib/supabase';

interface ApplyConspiracyEffectInput {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  sessionId: string;
  actorId: string;
  card: ConspiracyCardRow;
  targetId?: string;
}

export async function applyConspiracyEffect({
  supabase,
  sessionId,
  actorId,
  card,
  targetId,
}: ApplyConspiracyEffectInput) {
  const config = CONSPIRACY_EFFECTS[card.id];

  if (!config) {
    throw new Error('This conspiracy card has no effect registered yet.');
  }

  if (!config.implemented) {
    throw new Error('This conspiracy card effect is coming soon.');
  }

  switch (config.slug) {
    case 'media_smear':
      return handleMediaSmear({
        supabase,
        sessionId,
        actorId,
        targetId,
      });
    default:
      throw new Error('This conspiracy card effect is coming soon.');
  }
}

async function handleMediaSmear({
  supabase,
  sessionId,
  actorId,
  targetId,
}: {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  sessionId: string;
  actorId: string;
  targetId?: string;
}) {
  if (!targetId) {
    throw new Error('Select a target to smear.');
  }
  if (targetId === actorId) {
    throw new Error('You cannot target yourself.');
  }

  const { data: targetRow, error } = await supabase
    .from('session_players')
    .select('resources, conspiracy_flags')
    .match({ session_id: sessionId, profile_id: targetId })
    .single();

  if (error || !targetRow) {
    throw new Error('Target player not found.');
  }

  const currentResources = { ...(targetRow.resources ?? {}) };
  const currentMedia = Number(currentResources.media ?? 0);
  const mediaRemoved = Math.min(1, currentMedia);

  if (mediaRemoved > 0) {
    currentResources.media = currentMedia - mediaRemoved;
  }

  const updatedFlags = {
    ...((targetRow.conspiracy_flags as Record<string, unknown> | null) ?? {}),
    skip_play_window: true,
  };

  await supabase
    .from('session_players')
    .update({ resources: currentResources, conspiracy_flags: updatedFlags })
    .match({ session_id: sessionId, profile_id: targetId });

  return {
    type: 'media_smear',
    target_id: targetId,
    media_removed: mediaRemoved,
  };
}

