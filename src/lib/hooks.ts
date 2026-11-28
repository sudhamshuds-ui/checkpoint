import { useEffect, useMemo, useState } from 'react';
import { useData } from './data';
import { isInbox, isSorted } from './posts';
import type { Folder, Post, Tag } from './types';
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

export function useTags(): Tag[] {
  return useData((s) => s.tags);
}

export function useSyncState() {
  return useData((s) => s.sync);
}

export function useCounts(posts: Post[] | undefined) {
  return useMemo(() => {
    const byFolder = new Map<string, number>();
    let inbox = 0;
    let feed = 0;
    for (const p of posts ?? []) {
      if (isInbox(p)) inbox++;
      if (isSorted(p)) feed++;
      for (const id of p.folderIds) byFolder.set(id, (byFolder.get(id) ?? 0) + 1);
    }
    return { inbox, feed, byFolder };
  }, [posts]);
}

export function matches(post: Post, query: string, tagNames: Map<string, string> = new Map()) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [post.text, post.note, post.author.name, post.author.handle, post.quote?.text, post.link?.title, ...post.tagIds.map((id) => tagNames.get(id))]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}

/** The posts that belong to a view, before any search or tag filter. */
export function inView(posts: Post[], view: View) {
  return posts.filter((p) => {
    if (view.kind === 'inbox') return isInbox(p);
    if (view.kind === 'feed') return isSorted(p);
    return p.folderIds.includes(view.folderId);
  });
}

export function filterView(posts: Post[], view: View, query: string, tags: Tag[] = [], tagFilter: string[] = []) {
  const tagNames = new Map(tags.map((t) => [t.id, t.name]));
  return inView(posts, view).filter(
    (p) => view.kind === 'inbox' || (matches(p, query, tagNames) && tagFilter.every((id) => p.tagIds.includes(id))),
  );
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
