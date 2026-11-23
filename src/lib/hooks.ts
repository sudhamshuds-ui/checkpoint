import { useEffect, useMemo, useState } from 'react';
import { useData } from './data';
import { isInbox } from './posts';
import type { Folder, Post } from './types';
import type { View } from './store';

export function usePosts(): Post[] | undefined {
  return useData((s) => s.posts);
}

export function usePost(id: string | null): Post | undefined {
  return useData((s) => (id ? s.posts?.find((p) => p.id === id) : undefined));
}

export function useFolders(): Folder[] {
  return useData((s) => s.folders);
}

export function useSyncState() {
  return useData((s) => s.sync);
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
