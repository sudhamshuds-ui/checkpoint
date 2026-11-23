import { memo, useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import type React from 'react';
import clsx from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Layers, Link2, Trash2 } from 'lucide-react';
import { duration } from '@/lib/format';
import { removePost } from '@/lib/actions';
import type { Folder, Post } from '@/lib/types';
import { useUI } from '@/lib/store';
import { MediaView } from './Media';
import { FolderPopover } from './FolderPicker';
import { aspect, visualFor } from './visual';

/** What the top-right button does: Sort (X bookmarks), change folder (My feed), nothing (a folder page). */
export type TileAction = 'sort' | 'folder' | 'none';

interface Props {
  post: Post;
  folders: Map<string, Folder>;
  action: TileAction;
  /** True for posts that arrived while this view was open (a live bookmark, a sync, an Undo). */
  entering?: boolean;
}

// Controls on a tile must not start a drag or open the post.
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

export { Pill };

export const PostCard = memo(function PostCard({ post, folders, action, entering }: Props) {
  const openPost = useUI((s) => s.openPost);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // Plays the tile's exit, then lets the change through, so a sorted or removed post visibly leaves.
  const leave = async () => {
    setLeaving(true);
    await new Promise((r) => setTimeout(r, 160));
  };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `post:${post.id}` });

  const visual = visualFor(post);
  const media = post.media.length ? post.media : post.quote?.media ?? [];
  const current = media[Math.min(index, Math.max(media.length - 1, 0))];
  // The hover look stays while the folder menu is open, so moving the pointer into the menu keeps context.
  const active = hovered || menuOpen;
  const names = post.folderIds.map((id) => folders.get(id)?.name).filter(Boolean) as string[];
  const actionLabel = action === 'sort' ? 'Sort' : names.length ? `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}` : 'Sort';

  const onPointerEnter = (e: PointerEvent) => e.pointerType === 'mouse' && setHovered(true);
  /* Controls follow real hover (which stays correct while the page scrolls under a still pointer),
     keyboard focus (focus-visible, so a mouse click doesn't pin them), or an open folder menu. */
  const reveal = menuOpen
    ? 'opacity-100'
    : 'pointer-events-none opacity-0 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100 group-has-focus-visible:pointer-events-auto group-has-focus-visible:opacity-100';
  const onPointerLeave = () => setHovered(false);
  useEffect(() => {
    if (!hovered) return;
    const clear = () => setHovered(false);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [hovered]);

  const controls = (
    <>
      {action !== 'none' && (
        <div className={clsx('absolute top-2 right-2 transition-opacity duration-150', reveal)}>
          <FolderPopover
            postId={post.id}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            beforePick={async (added) => {
              // Sorting from X bookmarks takes the post out of this view; changing folders in My feed doesn't.
              if (added && action === 'sort' && post.folderIds.length === 0) await leave();
            }}
            trigger={
              <Pill selected={menuOpen} label={action === 'sort' ? 'Sort into a folder' : `In ${names.join(', ')}. Change folder`}>
                {actionLabel}
              </Pill>
            }
          />
        </div>
      )}
      <div className={clsx('absolute right-2 bottom-2 transition-opacity duration-150', reveal)}>
        <Pill
          icon
          danger
          label="Remove from Checkpoint"
          onClick={async () => {
            await leave();
            removePost(post);
          }}
        >
          <Trash2 size={14} strokeWidth={2} />
        </Pill>
      </div>
    </>
  );

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Post by ${post.author.name}`}
      onClick={() => openPost(post.id, index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openPost(post.id, index);
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={clsx(
        'group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        isDragging && 'opacity-40',
        leaving && 'tile-leaving',
        entering && 'tile-enter',
      )}
    >
      {visual ? (
        <div className="relative overflow-hidden bg-sunken" style={{ aspectRatio: `1 / ${aspect(visual)}` }}>
          {visual.kind === 'media' && current ? (
            <MediaView key={current.url} media={current} mode="card" playing={active} />
          ) : visual.kind === 'link' ? (
            <img src={visual.image} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          ) : null}

          <div className="absolute bottom-2 left-2 flex gap-1">
            {current?.type === 'video' && (
              <Badge className={clsx('transition-opacity duration-150 [@media(hover:hover)]:group-hover:opacity-0', menuOpen && 'opacity-0')}>{duration(current.durationMs) || 'Video'}</Badge>
            )}
            {current?.type === 'gif' && <Badge>GIF</Badge>}
            {media.length > 1 && (
              <Badge>
                <Layers size={11} strokeWidth={2.25} /> {media.length > 1 && active ? `${index + 1}/${media.length}` : media.length}
              </Badge>
            )}
            {visual.kind === 'link' && (
              <Badge>
                <Link2 size={11} strokeWidth={2.25} /> {post.link?.domain ?? 'Link'}
              </Badge>
            )}
          </div>

          {media.length > 1 && (
            <div className={clsx('transition-opacity duration-150', reveal)}>
              {index > 0 && (
                <ImageArrow side="left" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeft size={16} />
                </ImageArrow>
              )}
              {index < media.length - 1 && (
                <ImageArrow side="right" onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}>
                  <ChevronRight size={16} />
                </ImageArrow>
              )}
            </div>
          )}
          {controls}
        </div>
      ) : (
        <div className="relative border border-line bg-surface px-4 py-12">
          <p className="line-clamp-[10] text-[15px] leading-[1.45] whitespace-pre-line text-ink">{post.text}</p>
          {controls}
        </div>
      )}
    </article>
  );
});

type PillProps = Omit<React.ComponentPropsWithRef<'button'>, 'children'> & { children: ReactNode; label: string; icon?: boolean; danger?: boolean; selected?: boolean };

/* Popover triggers pass their own handlers and ref through these props, so compose rather than replace them. */
function Pill({ children, label, icon, danger, selected, onClick, onPointerDown, className, ...rest }: PillProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={clsx(
        'press flex h-7 items-center justify-center rounded-full text-xs font-medium',
        icon ? 'w-7' : 'max-w-44 px-3',
        // Selected = its menu is open. .press eases the colour change (140ms) so it never flashes.
        selected ? 'bg-ink text-bg' : danger ? 'bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 ring-inset hover:bg-danger-strong' : 'bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 ring-inset hover:bg-black/75',
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

function ImageArrow({ side, onClick, children }: { side: 'left' | 'right'; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'press absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 ring-inset hover:bg-black/75',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx(className, 'tabular flex h-5 items-center gap-1 rounded-full bg-black/60 px-1.5 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/20 ring-inset')}>
      {children}
    </span>
  );
}

/** Compact copy of a tile that follows the pointer while dragging onto a folder. */
export function DragPreview({ post }: { post: Post }) {
  const visual = visualFor(post);
  return (
    <div className="w-28 -rotate-3 overflow-hidden bg-surface shadow-pop">
      {visual ? (
        <div className="bg-sunken" style={{ aspectRatio: `1 / ${Math.min(aspect(visual), 1.1)}` }}>
          {visual.kind === 'media' ? <MediaView media={visual.media} mode="card" /> : <img src={visual.image} alt="" className="h-full w-full object-cover" />}
        </div>
      ) : (
        <p className="line-clamp-4 p-3 text-xs leading-snug">{post.text}</p>
      )}
    </div>
  );
}
