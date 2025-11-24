import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

// Service-role client for privileged operations (e.g., creating sessions).
// Do NOT expose this to the browser.
export function createServiceSupabaseClient() {
  const serviceRoleKey = env.supabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client operations.');
  }

  return createSupabaseClient(env.supabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

