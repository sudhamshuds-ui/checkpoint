import { toast } from 'sonner';
import { db } from './db';
import type { Post } from './types';

export async function createFolder(name: string): Promise<string> {
  const id = crypto.randomUUID();
  const last = await db.folders.orderBy('order').last();
  await db.folders.add({ id, name: name.trim(), order: (last?.order ?? 0) + 1, createdAt: Date.now() });
  return id;
}

export async function renameFolder(id: string, name: string) {
  if (name.trim()) await db.folders.update(id, { name: name.trim() });
}

export async function deleteFolder(id: string) {
  await db.transaction('rw', db.posts, db.folders, async () => {
    await db.posts
      .where('folderIds')
      .equals(id)
      .modify((p) => {
        p.folderIds = p.folderIds.filter((f) => f !== id);
      });
    await db.folders.delete(id);
  });
}

async function setFolderIds(postId: string, folderIds: string[]) {
  await db.posts.update(postId, { folderIds: [...new Set(folderIds)] });
}

/** Changes a post's folders and offers an undo. */
async function changeFolders(post: Post, next: string[], message: string | null) {
  const previous = post.folderIds;
  await setFolderIds(post.id, next);
  if (message) {
    toast(message, {
      action: { label: 'Undo', onClick: () => setFolderIds(post.id, previous) },
    });
  }
}

export async function toggleFolder(post: Post, folderId: string, folderName: string) {
  const has = post.folderIds.includes(folderId);
  const next = has ? post.folderIds.filter((f) => f !== folderId) : [...post.folderIds, folderId];
  await changeFolders(post, next, has ? `Removed from ${folderName}` : `Added to ${folderName}`);
}

/** Drag and drop: move out of the folder being viewed and into the target. */
export async function moveToFolder(post: Post, toId: string, toName: string, fromId?: string) {
  if (post.folderIds.includes(toId) && (!fromId || fromId === toId)) return;
  const next = [...post.folderIds.filter((f) => f !== fromId), toId];
  await changeFolders(post, next, `Moved to ${toName}`);
}

export async function sendToInbox(post: Post) {
  if (post.folderIds.length === 0) return;
  await changeFolders(post, [], 'Moved back to Inbox');
}

export async function assignQuietly(postId: string, folderIds: string[]) {
  await setFolderIds(postId, folderIds);
}

export async function setNote(postId: string, note: string) {
  await db.posts.update(postId, { note });
}

export async function removePost(post: Post) {
  await db.posts.delete(post.id);
  toast('Removed from Checkpoint', {
    description: 'It stays bookmarked on X.',
    action: { label: 'Undo', onClick: () => db.posts.put(post) },
  });
}
