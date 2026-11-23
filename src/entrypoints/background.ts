import { APP_URL } from '@/config';
import { createSupabase } from '@/lib/supabase';
import { inboxCount, postToRow, removeBookmark, upsertBookmarks } from '@/lib/posts';
import type { ExternalMessage, RuntimeMessage, SyncMode, SyncState } from '@/lib/messages';
import type { IncomingBookmark, Post } from '@/lib/types';

/* Supabase keeps the extension's own login in extension storage, separate from the website's. */
const supabase = createSupabase({
  getItem: async (key) => ((await browser.storage.local.get(key))[key] as string | undefined) ?? null,
  setItem: (key, value) => browser.storage.local.set({ [key]: value }),
  removeItem: (key) => browser.storage.local.remove(key),
});

const APP_ORIGIN = new URL(APP_URL).origin;

export default defineBackground(() => {
  browser.action.setBadgeBackgroundColor({ color: '#E0582F' });
  if ('setBadgeTextColor' in browser.action) browser.action.setBadgeTextColor({ color: '#FFFFFF' });

  browser.action.onClicked.addListener(() => openApp());

  browser.tabs.onRemoved.addListener(async (tabId) => {
    const { syncTabId } = await session();
    if (syncTabId === tabId) await endSync(false);
  });

  browser.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    handle(message, sender).then(sendResponse, (error) => {
      console.error('[checkpoint]', error);
      sendResponse(undefined);
    });
    return true;
  });

  browser.runtime.onMessageExternal.addListener((message: ExternalMessage, sender, sendResponse) => {
    if (!sender.url || new URL(sender.url).origin !== APP_ORIGIN) return false;
    handleExternal(message).then(sendResponse, (error) => sendResponse({ ok: false, error: String(error?.message ?? error) }));
    return true;
  });

  // Retry anything captured while offline or signed out, and keep the badge fresh.
  browser.alarms.create('tick', { periodInMinutes: 15 });
  browser.alarms.onAlarm.addListener(() => flushQueue().then(refreshBadge));
  flushQueue().then(refreshBadge);
});

async function signedIn() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/* ---- Saving, with a queue for when we can't reach Supabase ---- */

interface Queue {
  pending?: IncomingBookmark[];
  pendingRemovals?: string[];
}

async function queue(patch: (q: Required<Queue>) => void) {
  const stored = (await browser.storage.local.get(['pending', 'pendingRemovals'])) as Queue;
  const q = { pending: stored.pending ?? [], pendingRemovals: stored.pendingRemovals ?? [] };
  patch(q);
  await browser.storage.local.set(q);
}

async function saveBookmarks(items: IncomingBookmark[]): Promise<number> {
  try {
    if (!(await signedIn())) throw new Error('signed out');
    const added = await upsertBookmarks(supabase, items);
    refreshBadge();
    return added;
  } catch {
    await queue((q) => q.pending.push(...items));
    return 0;
  }
}

async function unbookmark(id: string) {
  try {
    if (!(await signedIn())) throw new Error('signed out');
    await removeBookmark(supabase, id);
    refreshBadge();
  } catch {
    await queue((q) => q.pendingRemovals.push(id));
  }
}

async function flushQueue() {
  if (!(await signedIn())) return;
  const { pending = [], pendingRemovals = [] } = (await browser.storage.local.get(['pending', 'pendingRemovals'])) as Queue;
  if (!pending.length && !pendingRemovals.length) return;
  await browser.storage.local.set({ pending: [], pendingRemovals: [] });
  try {
    for (let i = 0; i < pending.length; i += 100) await upsertBookmarks(supabase, pending.slice(i, i + 100));
    for (const id of pendingRemovals) await removeBookmark(supabase, id);
  } catch {
    await queue((q) => {
      q.pending.push(...pending);
      q.pendingRemovals.push(...pendingRemovals);
    });
  }
}

/* ---- Messages ---- */

async function handle(message: RuntimeMessage, sender: Browser.runtime.MessageSender) {
  switch (message.type) {
    case 'bookmarks':
      return { added: await saveBookmarks(message.items) };
    case 'unbookmarked':
      await unbookmark(message.id);
      return {};
    case 'sync:start':
      return startSync(message.mode);
    case 'sync:hello': {
      const { syncTabId, syncMode } = await session();
      return sender.tab?.id !== undefined && sender.tab.id === syncTabId ? { mode: syncMode } : {};
    }
    case 'sync:progress':
      await patchSyncState({ status: 'running', found: message.found, added: message.added });
      return {};
    case 'sync:done':
      await patchSyncState({ found: message.found, added: message.added });
      await endSync(true);
      return {};
  }
}

async function handleExternal(message: ExternalMessage) {
  switch (message.type) {
    case 'status': {
      const current = await signedIn();
      return { installed: true, signedIn: Boolean(current), email: current?.user.email };
    }
    case 'connect': {
      const { error } = await supabase.auth.signInWithPassword({ email: message.email, password: message.password });
      if (error) return { ok: false, error: error.message };
      await migrateLocalData().catch((e) => console.error('[checkpoint] migration failed', e));
      await flushQueue();
      refreshBadge();
      return { ok: true };
    }
    case 'disconnect':
      await supabase.auth.signOut();
      await browser.action.setBadgeText({ text: '' });
      return { ok: true };
    case 'sync:start':
      if (!(await signedIn())) return { ok: false, error: 'Connect the extension first.' };
      await startSync();
      return { ok: true };
  }
}

/* ---- Sync tab ---- */

interface SessionState {
  syncTabId?: number;
  syncMode?: SyncMode;
}

async function session(): Promise<SessionState> {
  return (await browser.storage.session.get(['syncTabId', 'syncMode'])) as SessionState;
}

async function startSync(requested?: SyncMode) {
  const { fullSyncDone } = (await browser.storage.local.get('fullSyncDone')) as { fullSyncDone?: boolean };
  const mode: SyncMode = requested ?? (fullSyncDone ? 'quick' : 'full');
  const { syncTabId } = await session();
  if (syncTabId !== undefined) {
    const tab = await browser.tabs.get(syncTabId).catch(() => undefined);
    if (tab) {
      await browser.tabs.update(syncTabId, { active: true });
      return { mode };
    }
  }
  const tab = await browser.tabs.create({ url: 'https://x.com/i/bookmarks', active: true });
  await browser.storage.session.set({ syncTabId: tab.id, syncMode: mode });
  await patchSyncState({ status: 'running', found: 0, added: 0 });
  return { mode };
}

async function endSync(completed: boolean) {
  const { syncTabId, syncMode } = await session();
  if (syncTabId === undefined) return;
  await browser.storage.session.remove(['syncTabId', 'syncMode']);
  const { sync } = (await browser.storage.local.get('sync')) as { sync?: SyncState };
  await patchSyncState({ status: 'idle', lastSyncAt: Date.now(), lastAdded: sync?.added ?? 0 });
  if (completed && syncMode === 'full') await browser.storage.local.set({ fullSyncDone: true });
  if (completed) {
    // Let the "Import finished" pill register before handing back to the dashboard.
    setTimeout(async () => {
      await browser.tabs.remove(syncTabId).catch(() => undefined);
      openApp();
    }, 900);
  }
}

/** Kept locally for the sync tab, and in Supabase so every device shows the latest sync. */
async function patchSyncState(patch: Partial<SyncState>) {
  const { sync } = (await browser.storage.local.get('sync')) as { sync?: SyncState };
  const next: SyncState = { status: 'idle', found: 0, added: 0, ...sync, ...patch };
  await browser.storage.local.set({ sync: next });
  const current = await signedIn();
  if (current) await supabase.from('profiles').upsert({ user_id: current.user.id, sync: next, updated_at: new Date().toISOString() });
}

async function openApp() {
  const tabs = await browser.tabs.query({});
  const existing = tabs.find((t) => t.url?.startsWith(APP_ORIGIN));
  if (existing?.id !== undefined) {
    await browser.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) await browser.windows.update(existing.windowId, { focused: true });
  } else {
    await browser.tabs.create({ url: APP_URL });
  }
}

async function refreshBadge() {
  try {
    const count = (await signedIn()) ? await inboxCount(supabase) : 0;
    await browser.action.setBadgeText({ text: count === 0 ? '' : count > 999 ? '999+' : String(count) });
  } catch {
    // Offline: leave the badge as it was.
  }
}

/* ---- One-time move from the local-only version ---- */

async function migrateLocalData() {
  const { legacyMigrated } = (await browser.storage.local.get('legacyMigrated')) as { legacyMigrated?: boolean };
  if (legacyMigrated) return;
  const legacy = await readLegacyDatabase();
  if (legacy) {
    const { posts, folders } = legacy;
    if (folders.length) {
      const { error } = await supabase
        .from('folders')
        .upsert(folders.map((f) => ({ id: f.id, name: f.name, position: f.order })));
      if (error) throw error;
    }
    for (let i = 0; i < posts.length; i += 300) {
      const { error } = await supabase.from('posts').upsert(posts.slice(i, i + 300).map(postToRow));
      if (error) throw error;
    }
  }
  await browser.storage.local.set({ legacyMigrated: true });
}

function readLegacyDatabase(): Promise<{ posts: Post[]; folders: { id: string; name: string; order: number }[] } | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('checkpoint');
    request.onupgradeneeded = () => {
      // The database didn't exist: nothing to move. Abort so we don't leave an empty one behind.
      request.transaction?.abort();
      resolve(null);
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const stores = ['posts', 'folders'].filter((s) => db.objectStoreNames.contains(s));
      if (stores.length < 2) return resolve(null);
      const tx = db.transaction(stores, 'readonly');
      const posts = tx.objectStore('posts').getAll();
      const folders = tx.objectStore('folders').getAll();
      tx.oncomplete = () => {
        db.close();
        resolve({ posts: posts.result, folders: folders.result });
      };
      tx.onerror = () => resolve(null);
    };
  });
}
