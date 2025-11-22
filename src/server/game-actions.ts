'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase';
import { influenceVoters, resolveIdeologyAnswer } from '@/server/engine';
import type { IdeologyCardRow } from '@/types/database';

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

  await influenceVoters({
    sessionId,
    turnId,
    playerId: user.id,
    voteBankCardId: cardId,
    zoneId,
  });

  revalidatePath(`/game/${sessionId}`);
}

