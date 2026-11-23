import { createSupabase } from '@/lib/supabase';

/** The website's Supabase client. The session is kept in this browser's local storage. */
export const supabase = createSupabase();
