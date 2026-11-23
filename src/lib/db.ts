import Dexie, { type EntityTable } from 'dexie';
import type { Folder, IncomingBookmark, Post } from './types';

export const db = new Dexie('checkpoint') as Dexie & {
  posts: EntityTable<Post, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  meta: EntityTable<{ key: string; value: unknown }, 'key'>;
};

db.version(1).stores({
  posts: 'id, sortKey, savedAt, *folderIds',
  folders: 'id, order',
  meta: 'key',
});

/** X sort indexes are numeric strings. Pad them so they compare correctly as text. */
export const numericSortKey = (sortIndex: string) => sortIndex.padStart(24, '0');
export const liveSortKey = (time: number) => `L${String(time).padStart(16, '0')}`;

export const isInbox = (post: Post) => post.folderIds.length === 0 && !post.unbookmarked;

/** Insert new bookmarks and refresh the content of known ones, keeping folders and notes. Returns how many were new. */
export async function upsertBookmarks(items: IncomingBookmark[], live = false): Promise<number> {
  if (items.length === 0) return 0;
  return db.transaction('rw', db.posts, async () => {
    const existing = await db.posts.bulkGet(items.map((i) => i.post.id));
    const now = Date.now();
    let added = 0;
    const rows: Post[] = items.map(({ post, sortIndex }, index) => {
      const prev = existing[index];
      // Live captures have no X sort index yet; later syncs replace the key with the real one.
      const sortKey = sortIndex ? numericSortKey(sortIndex) : prev?.sortKey ?? liveSortKey(now);
      if (!prev) added++;
      return {
        ...post,
        source: 'x',
        sortKey: live && prev ? prev.sortKey : sortKey,
        savedAt: prev?.savedAt ?? now - index, // keep batch order stable
        folderIds: prev?.folderIds ?? [],
        note: prev?.note ?? '',
        unbookmarked: false,
      };
    });
    await db.posts.bulkPut(rows);
    return added;
  });
}

/** The post was unbookmarked on X. Drop it if it was never sorted, keep it if it lives in a folder. */
export async function removeBookmark(id: string) {
  const post = await db.posts.get(id);
  if (!post) return;
  if (post.folderIds.length === 0 && !post.note) await db.posts.delete(id);
  else await db.posts.update(id, { unbookmarked: true });
}

export async function inboxCount() {
  return db.posts.filter(isInbox).count();
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}
