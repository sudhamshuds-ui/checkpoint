import { toast } from 'sonner';
import { deletePost, insertFolder, insertTag, removeFolder, restorePost, updateFolderName, updatePost } from './data';
import { TAG_COLORS, type Post, type Tag, type TagColor } from './types';

export const createFolder = (name: string) => insertFolder(name);

export async function renameFolder(id: string, name: string) {
  if (name.trim()) await updateFolderName(id, name.trim());
}

export const deleteFolder = (id: string) => removeFolder(id);

async function setFolderIds(postId: string, folderIds: string[]) {
  await updatePost(postId, { folderIds: [...new Set(folderIds)] });
}

/** Changes a post's folders and offers an undo. */
async function changeFolders(post: Post, next: string[], message: string | null) {
  const previous = post.folderIds;
  await setFolderIds(post.id, next);
  if (message) {
    toast(message, { action: { label: 'Undo', onClick: () => setFolderIds(post.id, previous) } });
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

export const assignQuietly = setFolderIds;

export const setNote = (postId: string, note: string) => updatePost(postId, { note });

export async function removePost(post: Post) {
  await deletePost(post.id);
  toast('Removed from Checkpoint', {
    description: 'It stays bookmarked on X.',
    action: { label: 'Undo', onClick: () => restorePost(post) },
  });
}

/** Adds or removes a tag on a post. */
export async function toggleTag(post: Post, tagId: string) {
  const has = post.tagIds.includes(tagId);
  await updatePost(post.id, { tagIds: has ? post.tagIds.filter((t) => t !== tagId) : [...post.tagIds, tagId] });
}

export async function createTagOn(post: Post, name: string, color: TagColor) {
  const id = await insertTag(name, color);
  await updatePost(post.id, { tagIds: [...post.tagIds, id] });
}

/** The first color not used by an existing tag, so new tags stay easy to tell apart. */
