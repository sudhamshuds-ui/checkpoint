import { useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DropAnimation,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Lenis from 'lenis';
import { Toaster, toast } from 'sonner';
import { ArrowRight, Search, X } from 'lucide-react';
import { filterView, inView, useCounts, useFolders, usePosts, useTags } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { reorderFolders, useData } from '@/lib/data';
import { moveToFolder, sendToInbox } from '@/lib/actions';
import { plural } from '@/lib/format';
import { startSync, useExtension } from '@/lib/extension';
import type { Folder, Post, Tag } from '@/lib/types';
import clsx from 'clsx';
import { tagColor } from './Tags';
import { MobileNav, Sidebar } from './Sidebar';
import { Masonry } from './Masonry';
import { DragPreview, type TileAction } from './PostCard';
import { PostDialog } from './PostDialog';

/** Pins the drag preview just below and right of the cursor, so the folder under the pointer stays visible. */
const besideCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!(activatorEvent instanceof PointerEvent) || !draggingNodeRect) return transform;
  return {
    ...transform,
    x: transform.x + activatorEvent.clientX - draggingNodeRect.left + 14,
    y: transform.y + activatorEvent.clientY - draggingNodeRect.top + 14,
  };
};

/* Posts drop onto whatever folder is under the pointer; folders being reordered snap to the closest slot. */
const collision: CollisionDetection = (args) =>
  String(args.active.id).startsWith('folder:')
    ? closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => String(c.id).startsWith('folder:')) })
    : pointerWithin(args);

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const posts = usePosts();
  const folders = useFolders();
  const counts = useCounts(posts);
  const view = useUI((s) => s.view);
  const loadError = useData((s) => s.error);
  const [dragging, setDragging] = useState<Post | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const mainRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  // Where a dragged post was dropped, so the preview can shrink into that folder.
  const dropTarget = useRef<DOMRect | null>(null);
  const dropAnimation: DropAnimation = ({ dragOverlay }) => {
    const target = dropTarget.current;
    const node = dragOverlay.node.firstElementChild as HTMLElement | null;
    if (!target || !node) return;
    const from = node.getBoundingClientRect();
    const dx = target.left + 28 - (from.left + from.width / 2);
    const dy = target.top + target.height / 2 - (from.top + from.height / 2);
    const end = reducedMotion() ? { opacity: 0 } : { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.2)` };
    return node.animate([{ opacity: 1, transform: 'translate(0, 0) scale(1)' }, end], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' }).finished.then(() => undefined);
  };

  // Smooth, eased scrolling on the board. Skipped when the system asks for reduced motion.
  useEffect(() => {
    if (!mainRef.current || !contentRef.current || reducedMotion()) return;
    const lenis = new Lenis({ wrapper: mainRef.current, content: contentRef.current, autoRaf: true, lerp: 0.12 });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // A new view starts at the top.
  useEffect(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
    else mainRef.current?.scrollTo({ top: 0 });
  }, [view]);

  // A folder that no longer exists (deleted elsewhere) falls back to My feed.
  useEffect(() => {
    if (view.kind === 'folder' && folders.length && !folders.some((f) => f.id === view.folderId)) {
      useUI.getState().setView({ kind: 'feed' });
    }
  }, [view, folders]);

  function onDragStart(id: string) {
    if (id.startsWith('post:')) setDragging(posts?.find((p) => `post:${p.id}` === id) ?? null);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    // The preview stays rendered through the drop animation; the next drag replaces it.
    const overId = over ? String(over.id) : '';
    dropTarget.current = String(active.id).startsWith('post:') && (overId === 'inbox' || overId.startsWith('folder:')) && over ? new DOMRect(over.rect.left, over.rect.top, over.rect.width, over.rect.height) : null;
    const activeId = String(active.id);
    const target = over ? String(over.id) : null;
    if (!target) return;
    if (activeId.startsWith('folder:')) {
      const ids = folders.map((f) => `folder:${f.id}`);
      const from = ids.indexOf(activeId), to = ids.indexOf(target);
      if (from !== -1 && to !== -1 && from !== to) reorderFolders(arrayMove(folders, from, to).map((f) => f.id));
      return;
    }
    const post = posts?.find((p) => `post:${p.id}` === activeId);
    if (!post) return;
    const commit = () => {
      if (target === 'inbox') sendToInbox(post);
      else if (target.startsWith('folder:')) {
        const folder = folders.find((f) => `folder:${f.id}` === target);
        if (folder) moveToFolder(post, folder.id, folder.name, view.kind === 'folder' ? view.folderId : undefined);
      }
    };
    // The drop animation needs the original tile on the page, so file the post once the preview has shrunk away.
    if (dropTarget.current) setTimeout(commit, 200);
    else commit();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => onDragStart(String(active.id))}
      onDragCancel={() => setDragging(null)}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-dvh overflow-hidden">
        <Sidebar folders={folders} counts={counts} />
        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <div ref={contentRef}>
            <MobileNav folders={folders} counts={counts} />
            {loadError ? (
              <p className="py-24 text-center text-sm text-muted">Couldn't load your saves: {loadError}</p>
            ) : (
              posts && <MainView posts={posts} folders={folders} />
            )}
          </div>
        </main>
      </div>
      <DragOverlay dropAnimation={dropAnimation} modifiers={[besideCursor]} className="pointer-events-none">
        {dragging && <DragPreview post={dragging} />}
      </DragOverlay>
      <PostDialog />
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: '!bg-ink !text-bg !border-0 !rounded-xl !shadow-pop !font-sans',
          actionButtonStyle: { background: 'var(--accent)', color: '#fff', borderRadius: 8 },
        }}
      />
    </DndContext>
  );
}

function MainView({ posts, folders }: { posts: Post[]; folders: Folder[] }) {
  const view = useUI((s) => s.view);
  const query = useUI((s) => s.query);
  const setQuery = useUI((s) => s.setQuery);
  const setVisibleIds = useUI((s) => s.setVisibleIds);
  const tags = useTags();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = view.kind !== 'inbox';

  const tagFilter = useUI((s) => s.tagFilter);
  const visible = useMemo(() => filterView(posts, view, query, tags, tagFilter), [posts, view, query, tags, tagFilter]);
  // Only the tags used on this view's posts, in your tag order. A picked tag stays listed even if nothing matches.
  const viewTags = useMemo(() => {
    if (view.kind === 'inbox') return [];
    const used = new Set(inView(posts, view).flatMap((p) => p.tagIds));
    return tags.filter((t) => used.has(t.id) || tagFilter.includes(t.id));
  }, [posts, view, tags, tagFilter]);
  useEffect(() => setVisibleIds(visible.map((p) => p.id)), [visible, setVisibleIds]);

  // "/" jumps to search where there is one.
  useEffect(() => {
    if (!searchable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, [role="dialog"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchable]);

  if (posts.length === 0) return <Welcome />;

  const folder = view.kind === 'folder' ? folders.find((f) => f.id === view.folderId) : undefined;
  const title = view.kind === 'inbox' ? 'X bookmarks' : view.kind === 'feed' ? 'My feed' : folder?.name ?? '';
  const unsorted = view.kind === 'inbox' ? visible.length : 0;
  const action: TileAction = view.kind === 'inbox' ? 'sort' : view.kind === 'feed' ? 'folder' : 'none';

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 bg-bg/80 px-4 pt-6 pb-6 backdrop-blur-xl md:px-14 md:pt-10">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          {view.kind === 'inbox' && (
            <p className="tabular mt-1 text-sm text-muted">{unsorted ? `${plural(unsorted, 'post')} waiting to be sorted` : 'Everything is sorted'}</p>
          )}
        </div>
        {searchable && (
          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
          {viewTags.length > 0 && <TagFilter tags={viewTags} />}
          <label className="relative flex w-full shrink-0 items-center sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-2.5 text-faint" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
              placeholder="Search tags, notes, people"
              className="h-9 w-full rounded-lg border border-line bg-surface pr-8 pl-8 text-sm outline-none placeholder:text-faint focus:ring-1 focus:ring-accent [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              // Our own clear button: the browser's one ignores the field's padding and colours.
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                className="press absolute right-1.5 flex size-6 items-center justify-center rounded-md text-faint hover:bg-sunken hover:text-ink"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
            {!query && <kbd className="pointer-events-none absolute right-2 rounded border border-line px-1 font-mono text-[11px] text-faint">/</kbd>}
          </label>
          </div>
        )}
      </header>

      <section className="px-4 pb-20 md:px-14">
        {visible.length > 0 ? (
          <Masonry posts={visible} folders={folders} action={action} viewKey={view.kind === 'folder' ? `folder:${view.folderId}` : view.kind} />
        ) : (
          <Empty>
            {(query || tagFilter.length) && searchable
              ? query
                ? `Nothing matches “${query}”${tagFilter.length ? ' with those tags' : ''}.`
                : 'No posts here have all of those tags.'
              : view.kind === 'inbox'
                ? 'All sorted. New bookmarks from X land here.'
                : view.kind === 'feed'
                  ? 'Nothing sorted yet. Hover a post in X bookmarks and press Sort.'
                  : 'Drag posts onto this folder, or pick it from Sort on any post.'}
          </Empty>
        )}
      </section>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-24 text-center text-sm text-muted">{children}</p>;
}

function Welcome() {
  const { status } = useExtension();
  const ready = status?.installed && status.signedIn;

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="max-w-md">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">Bring in your bookmarks</h1>
        {status === undefined ? null : ready ? (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Checkpoint opens your X bookmarks in a new tab and scrolls through them to import everything. Keep that
              tab open until it says it's finished. It closes itself and brings you back here.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              After that, anything you bookmark on X in this Chrome shows up here on its own, on every device you sign
              in on.
            </p>
            <button
              type="button"
              onClick={async () => {
                const result = await startSync();
                if (!result?.ok) toast.error("Couldn't start the import", { description: result?.error });
              }}
              className="press mt-7 flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:brightness-105"
            >
              Import from X <ArrowRight size={16} />
            </button>
          </>
        ) : status.installed ? (
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            The Checkpoint extension is installed in this Chrome but isn't signed in yet. Click{' '}
            <span className="font-medium text-ink">Connect extension</span> at the bottom left, then come back here to
            import.
          </p>
        ) : (
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Bookmarks are imported by the Checkpoint extension for Chrome. Open this page in Chrome on a computer that
            has it installed. Everything you import shows up here on any device you sign in on.
          </p>
        )}
      </div>
    </div>
  );
}

/** The tags used in this view, beside the search. Click to show only posts with that tag; click again to clear. */
function TagFilter({ tags }: { tags: Tag[] }) {
  const picked = useUI((s) => s.tagFilter);
  const toggle = useUI((s) => s.toggleTagFilter);
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2" role="group" aria-label="Filter by tag">
      {tags.map((tag) => {
        const on = picked.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(tag.id)}
            title={on ? `Stop filtering by ${tag.name}` : `Show only posts tagged ${tag.name}`}
            className={clsx(
              'press inline-flex h-7 items-center rounded-full px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'text-white' : 'bg-surface text-muted hover:text-ink',
            )}
            style={on ? { background: tagColor(tag.color) } : undefined}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
