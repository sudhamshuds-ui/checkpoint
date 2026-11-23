import type { Folder, IncomingBookmark, Post } from './types';
import type { Supabase } from './supabase';

export const isInbox = (post: Post) => post.folderIds.length === 0 && !post.unbookmarked;

/** X sort indexes are numeric strings. Pad them so they compare correctly as text. */
export const numericSortKey = (sortIndex: string) => sortIndex.padStart(24, '0');
/** Captured live, before X has given it a position. Sorts above every numeric key. */
export const liveSortKey = (time: number) => `L${String(time).padStart(16, '0')}`;

export const byNewest = (a: Post, b: Post) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0);

/* Rows as stored in Supabase. */
export interface PostRow {
  id: string;
  url: string;
  author: Post['author'];
  text: string;
  posted_at: string | null;
  media: Post['media'];
  link: Post['link'] | null;
  quote: Post['quote'] | null;
  sort_key: string;
  saved_at: string;
  folder_ids: string[];
  note: string;
  unbookmarked: boolean;
}

export interface FolderRow {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export function postFromRow(r: PostRow): Post {
  return {
    id: r.id,
    source: 'x',
    url: r.url,
    author: r.author,
    text: r.text,
    createdAt: r.posted_at ? Date.parse(r.posted_at) : 0,
    media: r.media ?? [],
    ...(r.link ? { link: r.link } : {}),
    ...(r.quote ? { quote: r.quote } : {}),
    sortKey: r.sort_key,
    savedAt: Date.parse(r.saved_at),
    folderIds: r.folder_ids ?? [],
    note: r.note ?? '',
    unbookmarked: r.unbookmarked,
  };
}

export function postToRow(p: Post): PostRow {
  return {
    id: p.id,
    url: p.url,
    author: p.author,
    text: p.text,
    posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    media: p.media,
    link: p.link ?? null,
    quote: p.quote ?? null,
    sort_key: p.sortKey,
    saved_at: new Date(p.savedAt).toISOString(),
    folder_ids: p.folderIds,
    note: p.note,
    unbookmarked: Boolean(p.unbookmarked),
  };
}

export const folderFromRow = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  order: r.position,
  createdAt: Date.parse(r.created_at),
});

const PAGE = 1000;

export async function fetchAllPosts(supabase: Supabase): Promise<Post[]> {
  const posts: Post[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('sort_key', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    posts.push(...(data as PostRow[]).map(postFromRow));
    if (data.length < PAGE) return posts;
  }
}

/** Saves bookmarks from X, keeping folders and notes of posts already saved. Returns how many were new. */
export async function upsertBookmarks(supabase: Supabase, items: IncomingBookmark[]): Promise<number> {
  if (items.length === 0) return 0;
  const now = Date.now();
  const payload = items.map(({ post, sortIndex }) => ({
    ...post,
    sortKey: sortIndex ? numericSortKey(sortIndex) : liveSortKey(now),
  }));
  const { data, error } = await supabase.rpc('upsert_bookmarks', { items: payload });
  if (error) throw error;
  return data as number;
}

export async function removeBookmark(supabase: Supabase, id: string) {
  const { error } = await supabase.rpc('remove_bookmark', { post_id: id });
  if (error) throw error;
}

export async function inboxCount(supabase: Supabase): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('unbookmarked', false)
    .eq('folder_ids', '{}');
  if (error) throw error;
  return count ?? 0;
}
