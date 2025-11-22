'use server';

import { headers } from 'next/headers';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase';

function getSiteUrl(path = '/auth/callback') {
  const origin =
    headers().get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return `${origin.replace(/\/$/, '')}${path}`;
}

export async function requestMagicLink(email: string) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getSiteUrl('/auth/callback'),
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function signOut() {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  redirect('/auth/login');
}

