import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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

  // When a post leaves (removed, sorted away) the tiles after it slide into the gap instead of jumping.
  const grid = useRef<HTMLDivElement>(null);
  const boxes = useRef<{ key: string; width: number; at: Map<string, { x: number; y: number }> }>({ key: '', width: 0, at: new Map() });
  const ids = posts.map((p) => p.id).join();
  useLayoutEffect(() => {
    const tiles = [...(grid.current?.querySelectorAll<HTMLElement>('[data-post-id]') ?? [])];
    // Positions relative to the grid, so scrolling between changes doesn't count as movement.
    const origin = grid.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const at = new Map(tiles.map((el) => {
      const r = el.getBoundingClientRect();
      return [el.dataset.postId!, { x: r.left - origin.left, y: r.top - origin.top }] as const;
    }));
    const before = boxes.current;
    boxes.current = { key: viewKey, width, at };
    if (before.key !== viewKey || before.width !== width || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const el of tiles) {
      const from = before.at.get(el.dataset.postId!);
      const to = at.get(el.dataset.postId!);
      if (!from || !to) continue;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      // Moves off at once and glides to a stop. Same 400ms and curve as the post window's next-post fade
      // (.post-enter, --ease-settle), so the two move together.
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
    }
  }, [ids, viewKey, width]);

  return (
    <div
      ref={(node) => {
        ref(node);
        grid.current = node;
      }}
      className="flex items-start"
      style={{ gap }}
    >
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
