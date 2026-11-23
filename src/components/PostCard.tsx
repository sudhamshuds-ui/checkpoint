import { memo, useState } from 'react';
import clsx from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { ArrowUpRight, FolderPlus, Layers, Link2 } from 'lucide-react';
import { duration, relativeTime } from '@/lib/format';
import type { Folder, Post } from '@/lib/types';
import { useUI } from '@/lib/store';
import { Avatar, MediaView } from './Media';
import { FolderPopover } from './FolderPicker';
import { aspect, visualFor } from './visual';

interface Props {
  post: Post;
  folders: Map<string, Folder>;
  showFolders: boolean;
}

export const PostCard = memo(function PostCard({ post, folders, showFolders }: Props) {
  const openPost = useUI((s) => s.openPost);
  const [hovered, setHovered] = useState(false);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: post.id });
  const visual = visualFor(post);
  const folderNames = showFolders ? post.folderIds.map((id) => folders.get(id)?.name).filter(Boolean) : [];

  const actions = (
    <div className="pointer-events-none absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100">
      <FolderPopover
        postId={post.id}
        trigger={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="press flex h-7 items-center gap-1.5 rounded-full bg-black/60 px-2.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/75"
          >
            <FolderPlus size={13} strokeWidth={2} />
            Folder
          </button>
        }
      />
      <a
        href={post.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Open on X"
        className="press flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/75"
      >
        <ArrowUpRight size={14} strokeWidth={2} />
      </a>
    </div>
  );

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Post by ${post.author.name}`}
      onClick={() => openPost(post.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openPost(post.id);
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={clsx(
        'group relative cursor-pointer rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg',
        isDragging && 'opacity-40',
      )}
    >
      {visual ? (
        <div className="relative overflow-hidden rounded-[14px] bg-sunken shadow-card" style={{ aspectRatio: `1 / ${aspect(visual)}` }}>
          {visual.kind === 'media' ? (
            <MediaView media={visual.media} mode="card" playing={hovered} />
          ) : (
            <img src={visual.image} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          )}
          <div className="absolute bottom-2 left-2 flex gap-1">
            {visual.kind === 'media' && visual.media.type === 'video' && <Chip>{duration(visual.media.durationMs) || 'Video'}</Chip>}
            {visual.kind === 'media' && visual.media.type === 'gif' && <Chip>GIF</Chip>}
            {visual.kind === 'media' && visual.count > 1 && (
              <Chip>
                <Layers size={11} strokeWidth={2.25} /> {visual.count}
              </Chip>
            )}
            {visual.kind === 'link' && (
              <Chip>
                <Link2 size={11} strokeWidth={2.25} /> {post.link?.domain ?? 'Link'}
              </Chip>
            )}
          </div>
          {actions}
        </div>
      ) : (
        <div className="relative rounded-[14px] bg-surface p-4 pr-5 shadow-card">
          <p className="line-clamp-[9] text-[15px] leading-[1.45] tracking-[-0.005em] whitespace-pre-line text-ink">{post.text}</p>
          {actions}
        </div>
      )}

      <div className="px-1 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5 text-[12.5px]">
          <Avatar src={post.author.avatar} />
          <span className="truncate font-medium text-ink">{post.author.name}</span>
          <span className="shrink-0 text-faint">· {relativeTime(post.createdAt)}</span>
        </div>
        {visual && post.text && (
          <p className="mt-1 line-clamp-3 text-[13px] leading-[1.45] whitespace-pre-line text-muted">{post.text}</p>
        )}
        {post.note && (
          <p className="mt-2 line-clamp-3 border-l-2 border-accent pl-2 text-[13px] leading-[1.45] text-ink">{post.note}</p>
        )}
        {folderNames.length > 0 && <p className="mt-1.5 truncate text-xs text-faint">{folderNames.join(' · ')}</p>}
      </div>
    </article>
  );
});

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="tabular flex h-5 items-center gap-1 rounded-full bg-black/60 px-1.5 text-[11px] font-medium text-white backdrop-blur-md">
      {children}
    </span>
  );
}

/** Compact copy of a card that follows the pointer while dragging. */
export function DragPreview({ post }: { post: Post }) {
  const visual = visualFor(post);
  return (
    <div className="w-28 -rotate-3 overflow-hidden rounded-[10px] bg-surface shadow-pop">
      {visual ? (
        <div className="bg-sunken" style={{ aspectRatio: `1 / ${Math.min(aspect(visual), 1.1)}` }}>
          {visual.kind === 'media' ? (
            <MediaView media={visual.media} mode="card" />
          ) : (
            <img src={visual.image} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      ) : (
        <p className="line-clamp-4 p-3 text-xs leading-snug">{post.text}</p>
      )}
    </div>
  );
}
