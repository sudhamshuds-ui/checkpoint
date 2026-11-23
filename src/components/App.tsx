import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { Toaster } from 'sonner';
import { ArrowRight, Search } from 'lucide-react';
import { filterView, useCounts, useFolders, usePosts } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { useData } from '@/lib/data';
import { moveToFolder, sendToInbox } from '@/lib/actions';
import { plural } from '@/lib/format';
import type { Post } from '@/lib/types';
import { Sidebar } from './Sidebar';
import { startSync, useExtension } from '@/lib/extension';
import { toast } from 'sonner';
import { Masonry } from './Masonry';
import { DragPreview } from './PostCard';
import { PostDialog } from './PostDialog';
import { Triage } from './Triage';

/** Pins the drag preview just below and right of the cursor, so the folder under the pointer stays visible. */
const besideCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!(activatorEvent instanceof PointerEvent) || !draggingNodeRect) return transform;
  return {
    ...transform,
    x: transform.x + activatorEvent.clientX - draggingNodeRect.left + 14,
    y: transform.y + activatorEvent.clientY - draggingNodeRect.top + 14,
  };
};

export function App() {
  const posts = usePosts();
  const folders = useFolders();
  const counts = useCounts(posts);
  const view = useUI((s) => s.view);
  const loadError = useData((s) => s.error);
  const [dragging, setDragging] = useState<Post | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // A folder that no longer exists (deleted elsewhere) falls back to All saves.
  useEffect(() => {
    if (view.kind === 'folder' && folders.length && !folders.some((f) => f.id === view.folderId)) {
      useUI.getState().setView({ kind: 'all' });
    }
  }, [view, folders]);

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const post = posts?.find((p) => p.id === active.id);
    if (!post || !over) return;
    const target = String(over.id);
    if (target === 'inbox') sendToInbox(post);
    else if (target.startsWith('folder:')) {
      const folder = folders.find((f) => `folder:${f.id}` === target);
      if (folder) moveToFolder(post, folder.id, folder.name, view.kind === 'folder' ? view.folderId : undefined);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => setDragging(posts?.find((p) => p.id === active.id) ?? null)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-screen overflow-hidden">
        <Sidebar folders={folders} counts={counts} />
        <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {loadError ? (
            <p className="py-24 text-center text-sm text-muted">Couldn't load your saves: {loadError}</p>
          ) : (
            posts && <MainView posts={posts} folders={folders} inboxCount={counts.inbox} />
          )}
        </main>
      </div>
      <DragOverlay dropAnimation={null} modifiers={[besideCursor]} className="pointer-events-none">{dragging && <DragPreview post={dragging} />}</DragOverlay>
      <PostDialog />
      <Triage posts={posts ?? []} />
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

function MainView({ posts, folders, inboxCount }: { posts: Post[]; folders: ReturnType<typeof useFolders>; inboxCount: number }) {
  const view = useUI((s) => s.view);
  const query = useUI((s) => s.query);
  const setQuery = useUI((s) => s.setQuery);
  const setVisibleIds = useUI((s) => s.setVisibleIds);
  const setTriageOpen = useUI((s) => s.setTriageOpen);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterView(posts, view, query), [posts, view, query]);
  useEffect(() => setVisibleIds(visible.map((p) => p.id)), [visible, setVisibleIds]);

  // "/" jumps to search, like most tools people already use.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, [role="dialog"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const folder = view.kind === 'folder' ? folders.find((f) => f.id === view.folderId) : undefined;
  const title = view.kind === 'inbox' ? 'Inbox' : view.kind === 'all' ? 'All saves' : folder?.name ?? '';
  const total = filterView(posts, view, '').length;
  const subtitle =
    view.kind === 'inbox'
      ? total
        ? `${plural(total, 'post')} waiting to be sorted`
        : 'Everything is sorted'
      : plural(total, 'post');

  if (posts.length === 0) return <Welcome />;

  return (
    <>
      <header className="sticky top-0 z-10 flex items-end justify-between gap-6 bg-bg/85 px-8 pt-8 pb-5 backdrop-blur-lg">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="tabular mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="relative flex items-center">
            <Search size={15} className="pointer-events-none absolute left-2.5 text-faint" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
              placeholder="Search captions, notes, people"
              className="h-9 w-72 rounded-lg bg-surface pr-8 pl-8 text-sm shadow-card outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
            />
            {!query && (
              <kbd className="pointer-events-none absolute right-2 rounded border border-line px-1 font-mono text-[11px] text-faint">/</kbd>
            )}
          </label>
          {view.kind === 'inbox' && inboxCount > 0 && (
            <button
              type="button"
              onClick={() => setTriageOpen(true)}
              className="press flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white hover:brightness-105"
            >
              Sort inbox <ArrowRight size={15} />
            </button>
          )}
        </div>
      </header>

      <section className="px-8 pt-1 pb-20">
        {visible.length > 0 ? (
          <Masonry posts={visible} folders={folders} showFolders={view.kind === 'all'} />
        ) : (
          <Empty>
            {query
              ? `Nothing matches “${query}”.`
              : view.kind === 'inbox'
                ? 'Inbox clear. New bookmarks land here until you file them.'
                : 'Drag posts onto this folder in the sidebar, or use Folder on any post.'}
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
