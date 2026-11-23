import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@/config';

export function createSupabase(storage?: SupportedStorage) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, ...(storage ? { storage } : {}) },
  });
}

export type Supabase = ReturnType<typeof createSupabase>;
