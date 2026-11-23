import { create } from 'zustand';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Folder, Post } from './types';
import type { SyncState } from './messages';
import type { Supabase } from './supabase';
import { byNewest, fetchAllPosts, folderFromRow, postFromRow, postToRow, type FolderRow, type PostRow } from './posts';

interface DataState {
  /** Undefined until the first load finishes. */
  posts?: Post[];
  folders: Folder[];
  sync?: SyncState;
  error?: string;
}

export const useData = create<DataState>(() => ({ folders: [] }));

let client: Supabase;
let channel: RealtimeChannel | undefined;

const setPosts = (fn: (posts: Post[]) => Post[]) => useData.setState((s) => ({ posts: fn(s.posts ?? []) }));
const setFolders = (fn: (folders: Folder[]) => Folder[]) =>
  useData.setState((s) => ({ folders: fn(s.folders).sort((a, b) => a.order - b.order) }));

function upsertLocal(post: Post) {
  setPosts((posts) => {
    const i = posts.findIndex((p) => p.id === post.id);
    if (i === -1) return [...posts, post].sort(byNewest);
    const next = posts.slice();
    next[i] = post;
    return posts[i].sortKey === post.sortKey ? next : next.sort(byNewest);
  });
}

/** Loads everything and keeps it live. Returns a function that stops listening. */
export async function startData(supabase: Supabase) {
  client = supabase;
  try {
    const [posts, folders, profile] = await Promise.all([
      fetchAllPosts(supabase),
      supabase.from('folders').select('*').order('position'),
      supabase.from('profiles').select('sync').maybeSingle(),
    ]);
    if (folders.error) throw folders.error;
    useData.setState({
      posts,
      folders: (folders.data as FolderRow[]).map(folderFromRow),
      sync: (profile.data?.sync as SyncState | undefined) ?? undefined,
      error: undefined,
    });
  } catch (error) {
    useData.setState({ error: (error as Error).message ?? 'Could not load your saves.' });
  }

  // Changes made on other devices, and bookmarks the extension saves, arrive here.
  channel = supabase
    .channel('checkpoint')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (change) => {
      if (change.eventType === 'DELETE') {
        const id = (change.old as Partial<PostRow>).id;
        if (id) setPosts((posts) => posts.filter((p) => p.id !== id));
      } else upsertLocal(postFromRow(change.new as PostRow));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (change) => {
      if (change.eventType === 'DELETE') {
        const id = (change.old as Partial<FolderRow>).id;
        setFolders((folders) => folders.filter((f) => f.id !== id));
      } else {
        const folder = folderFromRow(change.new as FolderRow);
        setFolders((folders) => [...folders.filter((f) => f.id !== folder.id), folder]);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (change) => {
      if (change.eventType !== 'DELETE') useData.setState({ sync: (change.new as { sync: SyncState }).sync });
    })
    .subscribe();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}

/** Saving failed: say so and reload, so the screen never shows changes that weren't saved. */
async function check<T extends { error: unknown }>(request: PromiseLike<T>) {
  const result = await request;
  if (result.error) {
    console.error('[checkpoint]', result.error);
    toast.error("Couldn't save that change", { description: 'Check your connection. Your saves were reloaded.' });
    if (client) startData(client);
  }
  return result;
}

/* ---- Posts ---- */

export function getPost(id: string) {
  return useData.getState().posts?.find((p) => p.id === id);
}

export async function updatePost(id: string, patch: Partial<Pick<Post, 'folderIds' | 'note'>>) {
  const post = getPost(id);
  if (!post) return;
  upsertLocal({ ...post, ...patch });
  const row: Partial<PostRow> & { updated_at: string } = { updated_at: new Date().toISOString() };
  if (patch.folderIds) row.folder_ids = patch.folderIds;
  if (patch.note !== undefined) row.note = patch.note;
  await check(client.from('posts').update(row).eq('id', id));
}

export async function deletePost(id: string) {
  setPosts((posts) => posts.filter((p) => p.id !== id));
  await check(client.from('posts').delete().eq('id', id));
}

export async function restorePost(post: Post) {
  upsertLocal(post);
  await check(client.from('posts').upsert(postToRow(post)));
}

/* ---- Folders ---- */

export async function insertFolder(name: string) {
  const folders = useData.getState().folders;
  const folder: Folder = {
    id: crypto.randomUUID(),
    name: name.trim(),
    order: (folders[folders.length - 1]?.order ?? 0) + 1,
    createdAt: Date.now(),
  };
  setFolders((list) => [...list, folder]);
  await check(client.from('folders').insert({ id: folder.id, name: folder.name, position: folder.order }));
  return folder.id;
}

export async function updateFolderName(id: string, name: string) {
  setFolders((folders) => folders.map((f) => (f.id === id ? { ...f, name } : f)));
  await check(client.from('folders').update({ name }).eq('id', id));
}

export async function removeFolder(id: string) {
  setFolders((folders) => folders.filter((f) => f.id !== id));
  setPosts((posts) => posts.map((p) => (p.folderIds.includes(id) ? { ...p, folderIds: p.folderIds.filter((f) => f !== id) } : p)));
  await check(client.rpc('delete_folder', { folder: id }));
}
