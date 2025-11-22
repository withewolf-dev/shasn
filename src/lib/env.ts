type EnvKeys =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY';

function readEnv(key: EnvKeys) {
  const value = process.env[key];
  if (!value && key !== 'SUPABASE_SERVICE_ROLE_KEY') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const env = {
  supabaseUrl: () => readEnv('NEXT_PUBLIC_SUPABASE_URL')!,
  supabaseAnonKey: () => readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,
  supabaseServiceRoleKey: () => readEnv('SUPABASE_SERVICE_ROLE_KEY'),
};

