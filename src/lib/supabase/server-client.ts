import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import { env } from '@/lib/env';

export function createServerSupabaseClient() {
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      async getAll() {
        const cookieStore = await cookies();
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies();
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The cookies API can only be used in a Server Component or Route Handler
        }
      },
    },
  });
}

