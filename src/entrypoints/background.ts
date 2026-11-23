import { liveQuery } from 'dexie';
import { inboxCount, removeBookmark, upsertBookmarks, getMeta, setMeta } from '@/lib/db';
import type { RuntimeMessage, SyncMode, SyncState } from '@/lib/messages';

const DASHBOARD = '/dashboard.html';

export default defineBackground(() => {
  browser.action.setBadgeBackgroundColor({ color: '#E0582F' });
  if ('setBadgeTextColor' in browser.action) browser.action.setBadgeTextColor({ color: '#FFFFFF' });
  // Keeps the badge right when posts are sorted from the dashboard, which writes to the same database.
  liveQuery(() => inboxCount()).subscribe({ next: setBadge, error: () => undefined });

  browser.action.onClicked.addListener(() => openDashboard());

  browser.tabs.onRemoved.addListener(async (tabId) => {
    const { syncTabId } = await session();
    if (syncTabId === tabId) await endSync(false);
  });

  browser.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    handle(message, sender).then(sendResponse, (error) => {
      console.error('[checkpoint]', error);
      sendResponse(undefined);
    });
    return true; // reply asynchronously
  });
});

async function handle(message: RuntimeMessage, sender: Browser.runtime.MessageSender) {
  switch (message.type) {
    case 'bookmarks': {
      const added = await upsertBookmarks(message.items, message.live);
      refreshBadge();
      return { added };
    }
    case 'unbookmarked':
      await removeBookmark(message.id);
      refreshBadge();
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

interface SessionState {
  syncTabId?: number;
  syncMode?: SyncMode;
}

async function session(): Promise<SessionState> {
  return (await browser.storage.session.get(['syncTabId', 'syncMode'])) as SessionState;
}

async function startSync(requested?: SyncMode) {
  const fullDone = await getMeta<boolean>('fullSyncDone');
  const mode: SyncMode = requested ?? (fullDone ? 'quick' : 'full');
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
  const { sync } = await browser.storage.local.get('sync');
  await patchSyncState({ status: 'idle', lastSyncAt: Date.now(), lastAdded: (sync as SyncState | undefined)?.added ?? 0 });
  if (completed && syncMode === 'full') await setMeta('fullSyncDone', true);
  if (completed) {
    // Let the "Import finished" pill register before handing back to the dashboard.
    setTimeout(async () => {
      await browser.tabs.remove(syncTabId).catch(() => undefined);
      openDashboard();
    }, 900);
  }
}

async function patchSyncState(patch: Partial<SyncState>) {
  const { sync } = await browser.storage.local.get('sync');
  const next: SyncState = { status: 'idle', found: 0, added: 0, ...(sync as SyncState | undefined), ...patch };
  await browser.storage.local.set({ sync: next });
}

async function openDashboard() {
  const url = browser.runtime.getURL(DASHBOARD);
  const [existing] = await browser.tabs.query({ url });
  if (existing?.id !== undefined) {
    await browser.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) await browser.windows.update(existing.windowId, { focused: true });
  } else {
    await browser.tabs.create({ url });
  }
}

async function refreshBadge() {
  setBadge(await inboxCount());
}

function setBadge(count: number) {
  browser.action.setBadgeText({ text: count === 0 ? '' : count > 999 ? '999+' : String(count) });
}

