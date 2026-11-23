import { useMemo } from 'react';
import { useElementWidth } from '@/lib/hooks';
import type { Folder, Post } from '@/lib/types';
import { PostCard } from './PostCard';
import { aspect, visualFor } from './visual';

const GAP = 20;
const MIN_COLUMN = 232;
const MIN_COLUMN_SMALL = 150;

/** Rough rendered height, used only to decide which column a card goes in. */
function estimateHeight(post: Post, width: number) {
  const visual = visualFor(post);
  const charsPerLine = width / 7.2;
  let height = 44; // author row and padding
  if (visual) {
    height += width * aspect(visual);
    if (post.text) height += Math.min(Math.ceil(post.text.length / charsPerLine), 3) * 19;
  } else {
    height += 32 + Math.min(Math.ceil(post.text.length / (width / 8.4)) + (post.text.match(/\n/g)?.length ?? 0), 9) * 22;
  }
  if (post.note) height += 8 + Math.min(Math.ceil(post.note.length / charsPerLine), 3) * 19;
  return height;
}

export function Masonry({ posts, folders, showFolders }: { posts: Post[]; folders: Folder[]; showFolders: boolean }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const min = width < 640 ? MIN_COLUMN_SMALL : MIN_COLUMN;
  const gap = width < 640 ? 12 : GAP;
  const count = Math.max(1, Math.floor((width + gap) / (min + gap)));
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
              <PostCard key={post.id} post={post} folders={folderMap} showFolders={showFolders} />
            ))}
          </div>
        ))}
    </div>
  );
}
