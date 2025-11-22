import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

import { env } from '@/lib/env';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options });
      },
    },
  });
}

