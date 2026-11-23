import { useState } from 'react';
import { connectExtension, extensionStatus } from '@/lib/extension';
import { supabase } from './client';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError(error.message === 'Invalid login credentials' ? "That email and password don't match." : error.message);
      return;
    }
    // If this Chrome has the extension and it isn't signed in yet, sign it in too.
    const status = await extensionStatus();
    if (status.installed && !status.signedIn) await connectExtension(email.trim(), password);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-[320px]">
        <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden className="text-accent">
          <path d="M4 2.5v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.9 3h8.6a.6.6 0 0 1 .45 1l-2.1 2.6 2.1 2.6a.6.6 0 0 1-.45 1H4.9z" fill="currentColor" />
        </svg>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">Sign in to Checkpoint</h1>
        <div className="mt-6 flex flex-col gap-2">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-10 rounded-lg bg-surface px-3 text-sm shadow-card outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-10 rounded-lg bg-surface px-3 text-sm shadow-card outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
          />
        </div>
        {error && <p className="mt-3 text-[13px] text-[#c2381a] dark:text-[#ff8a6a]">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="press mt-4 h-10 w-full rounded-lg bg-ink text-sm font-medium text-bg disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
