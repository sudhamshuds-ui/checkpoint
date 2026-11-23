import { useEffect, useMemo, useRef } from 'react';
import { useElementWidth } from '@/lib/hooks';
import type { Folder, Post } from '@/lib/types';
import { PostCard, type TileAction } from './PostCard';
import { aspect, visualFor } from './visual';

/** Desktop: 3 columns with 16px gaps. Narrow screens: 2 columns with 8px gaps. */
function layout(width: number) {
  return width >= 880 ? { count: 3, gap: 16 } : { count: 2, gap: 8 };
}

/** Rendered height, used only to decide which column a tile goes in. Tiles are image-only. */
function estimateHeight(post: Post, width: number) {
  const visual = visualFor(post);
  if (visual) return width * aspect(visual);
  const lines = Math.min(Math.ceil(post.text.length / (width / 8.4)) + (post.text.match(/\n/g)?.length ?? 0), 10);
  return 96 + lines * 22;
}

export function Masonry({ posts, folders, action, viewKey }: { posts: Post[]; folders: Folder[]; action: TileAction; viewKey: string }) {
  // Animate only posts that weren't on screen a moment ago: a live bookmark, a sync, an Undo.
  // Opening a view (or switching views) renders still.
  const shown = useRef<{ key: string; ids: Set<string> } | null>(null);
  if (!shown.current || shown.current.key !== viewKey) shown.current = { key: viewKey, ids: new Set(posts.map((p) => p.id)) };
  const seen = shown.current.ids;
  useEffect(() => {
    if (shown.current) shown.current.ids = new Set(posts.map((p) => p.id));
  }, [posts]);

  const [ref, width] = useElementWidth<HTMLDivElement>();
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const { count, gap } = layout(width);
  const columnWidth = (width - gap * (count - 1)) / count;

  // Shortest-column placement keeps reading order roughly left to right, top to bottom.
  const columns = useMemo(() => {
    const cols: Post[][] = Array.from({ length: count }, () => []);
    const heights = new Array(count).fill(0);
    for (const post of posts) {
      const target = heights.indexOf(Math.min(...heights));
      cols[target].push(post);
      heights[target] += estimateHeight(post, columnWidth) + gap;
    }
    return cols;
  }, [posts, count, columnWidth, gap]);

  return (
    <div ref={ref} className="flex items-start" style={{ gap }}>
      {width > 0 &&
        columns.map((column, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
            {column.map((post) => (
              <PostCard key={post.id} post={post} folders={folderMap} action={action} entering={!seen.has(post.id)} />
            ))}
          </div>
        ))}
    </div>
  );
}
