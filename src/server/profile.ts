'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase';

export interface UpsertProfileInput {
  displayName: string;
  avatarSeed?: string;
}

export async function upsertProfile({ displayName, avatarSeed = '' }: UpsertProfileInput) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: displayName,
    avatar_seed: avatarSeed,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/profile');
  return { ok: true };
}

