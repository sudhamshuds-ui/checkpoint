import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { App } from '@/components/App';
import { startData, useData } from '@/lib/data';
import { isConfigured } from '@/config';
import { supabase } from './client';
import { Login } from './Login';
import '@/assets/styles.css';

function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      useData.setState({ posts: undefined, folders: [], sync: undefined });
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    startData(supabase).then((fn) => (cancelled ? fn() : (stop = fn)));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [userId]);

  if (!isConfigured) {
    return <p className="p-10 text-sm text-muted">Add your Supabase URL and key in src/config.ts to get started.</p>;
  }
  if (session === undefined) return null;
  return session ? <App /> : <Login />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
