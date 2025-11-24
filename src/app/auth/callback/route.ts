import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('next') ?? '/profile';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

