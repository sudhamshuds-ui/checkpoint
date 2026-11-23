import { PAGE_TAG, type PageMessage, type RuntimeMessage, type SyncMode } from '@/lib/messages';

/* Bridges the page-world capture script to the extension, and drives the auto-scroll during a sync. */
export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_start',
  main() {
    const send = (message: RuntimeMessage) => browser.runtime.sendMessage(message).catch(() => undefined);
    const sync = createSyncRunner(send);

    window.addEventListener('message', async (event) => {
      if (event.source !== window || event.data?.tag !== PAGE_TAG) return;
      const data = event.data as PageMessage;
      if (data.type === 'bookmarks') {
        const reply = (await send({ type: 'bookmarks', items: data.items })) as { added: number } | undefined;
        sync.onBatch(data.items.length, reply?.added ?? 0, data.hasMore);
      } else if (data.type === 'bookmarked' && data.items.length) {
        send({ type: 'bookmarks', items: data.items, live: true });
      } else if (data.type === 'unbookmarked') {
        send({ type: 'unbookmarked', id: data.id });
      }
    });

    send({ type: 'sync:hello' }).then((reply) => {
      const mode = (reply as { mode?: SyncMode } | undefined)?.mode;
      if (mode) sync.start(mode);
    });
  },
});

function createSyncRunner(send: (m: RuntimeMessage) => Promise<unknown>) {
  let mode: SyncMode | null = null;
  let found = 0;
  let added = 0;
  let unchangedBatches = 0;
  let lastBatchAt = Date.now();
  let timer: number | undefined;
  let overlay: ReturnType<typeof createOverlay> | undefined;

  function finish(stopped = false) {
    if (!mode) return;
    mode = null;
    window.clearInterval(timer);
    overlay?.done(found, added, stopped);
    send({ type: 'sync:done', found, added, stopped });
  }

  return {
    start(next: SyncMode) {
      mode = next;
      lastBatchAt = Date.now();
      overlay = createOverlay(() => finish(true));
      overlay.update(found, added);
      timer = window.setInterval(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior });
        // No new page of bookmarks for a while means X has nothing more to give.
        if (Date.now() - lastBatchAt > 12_000) finish();
      }, 1200);
    },
    onBatch(count: number, newCount: number, hasMore: boolean) {
      found += count;
      added += newCount;
      lastBatchAt = Date.now();
      unchangedBatches = newCount === 0 ? unchangedBatches + 1 : 0;
      if (!mode) return;
      overlay?.update(found, added);
      send({ type: 'sync:progress', found, added });
      if (!hasMore) finish();
      // A quick sync stops once it reaches bookmarks it already has.
      else if (mode === 'quick' && unchangedBatches >= 2) finish();
    },
  };
}

function createOverlay(onStop: () => void) {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .pill {
        position: fixed; left: 50%; bottom: 24px; z-index: 2147483647;
        transform: translateX(-50%);
        display: flex; align-items: center; gap: 12px;
        padding: 8px 8px 8px 16px; border-radius: 999px;
        background: #1a1a18; color: #edece8;
        font: 500 13px/1.2 ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-variant-numeric: tabular-nums;
        box-shadow: 0 0 0 1px rgba(255,255,255,.06), 0 8px 24px -6px rgba(0,0,0,.4);
      }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: #f06a45; }
      .muted { color: #9a988f; }
      button {
        all: unset; cursor: pointer; padding: 6px 12px; border-radius: 999px;
        background: rgba(255,255,255,.08); color: inherit; font: inherit;
      }
      button:hover { background: rgba(255,255,255,.14); }
    </style>
    <div class="pill" role="status">
      <span class="dot"></span>
      <span><span class="label">Checkpoint is importing</span> <span class="muted count"></span></span>
      <button type="button">Stop</button>
    </div>`;
  const count = root.querySelector('.count')!;
  const label = root.querySelector('.label')!;
  const button = root.querySelector('button')!;
  button.addEventListener('click', onStop);
  const mount = () => document.documentElement.appendChild(host);
  if (document.documentElement) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  return {
    update(found: number, added: number) {
      count.textContent = `· ${found} found${added ? `, ${added} new` : ''}`;
    },
    done(found: number, added: number, stopped: boolean) {
      label.textContent = stopped ? 'Import stopped' : 'Import finished';
      count.textContent = `· ${added} new of ${found}`;
      button.remove();
    },
  };
}
