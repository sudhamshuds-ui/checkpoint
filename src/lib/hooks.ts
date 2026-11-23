import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, isInbox } from './db';
import type { SyncState } from './messages';
import type { Folder, Post } from './types';
import type { View } from './store';

export function usePosts(): Post[] | undefined {
  return useLiveQuery(() => db.posts.orderBy('sortKey').reverse().toArray(), []);
}

export function useFolders(): Folder[] {
  return useLiveQuery(() => db.folders.orderBy('order').toArray(), []) ?? [];
}

export function useCounts(posts: Post[] | undefined) {
  return useMemo(() => {
    const byFolder = new Map<string, number>();
    let inbox = 0;
    for (const p of posts ?? []) {
      if (isInbox(p)) inbox++;
      for (const id of p.folderIds) byFolder.set(id, (byFolder.get(id) ?? 0) + 1);
    }
    return { inbox, all: posts?.length ?? 0, byFolder };
  }, [posts]);
}

export function matches(post: Post, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [post.text, post.note, post.author.name, post.author.handle, post.quote?.text, post.link?.title]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}

export function filterView(posts: Post[], view: View, query: string) {
  return posts.filter((p) => {
    if (view.kind === 'inbox' && !isInbox(p)) return false;
    if (view.kind === 'folder' && !p.folderIds.includes(view.folderId)) return false;
    return matches(p, query);
  });
}

export function useSyncState(): SyncState | undefined {
  const [state, setState] = useState<SyncState>();
  useEffect(() => {
    browser.storage.local.get('sync').then(({ sync }) => setState(sync as SyncState | undefined));
    const listener = (changes: Record<string, Browser.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.sync) setState(changes.sync.newValue as SyncState);
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);
  return state;
}

export function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}
