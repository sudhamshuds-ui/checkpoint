import { DEFAULT_APP_URL } from './app-url';

/* Public settings. The Supabase key here is the publishable (anon) key: it is meant to ship in
   client code. Row level security in supabase/schema.sql is what keeps the data private. */

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY || 'YOUR-PUBLISHABLE-KEY';

/** Where the dashboard website lives. The extension opens it and only accepts messages from it. */
export const APP_URL: string = import.meta.env.VITE_APP_URL || DEFAULT_APP_URL;

/** Extension IDs the website talks to: the pinned unpacked build, plus a Web Store ID later. */
export const EXTENSION_IDS = ['klocjbiofnokeaajpoheiohdpdheclng'];

export const isConfigured = !SUPABASE_URL.includes('YOUR-PROJECT');
