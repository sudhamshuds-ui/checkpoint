import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { usePost } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { removePost } from '@/lib/actions';
import { FolderChips } from './FolderChips';
import { MediaStage, NoteField, PostText } from './PostBody';
import { PostTags } from './Tags';

export function PostDialog() {
  const openPostId = useUI((s) => s.openPostId);
  const openMediaIndex = useUI((s) => s.openMediaIndex);
  const openPost = useUI((s) => s.openPost);
  const visibleIds = useUI((s) => s.visibleIds);
  const post = usePost(openPostId);

  const view = useUI((s) => s.view);
  // Remember where the open post sat on the board. Once it's sorted out of the current view it no longer
  // appears there, and its neighbours close the gap: the next post now sits at the same index.
  const lastIndex = useRef(-1);
  // Changing post by click fades the new one in; with the arrow keys it's instant, so stepping stays fast.
  const byKeyboard = useRef(false);
  const shownId = useRef<string | null>(null);
  // The post that should fade in. Kept per post so a re-render mid-fade doesn't drop the class.
  const fadeId = useRef<string | null>(null);
  if (openPostId !== shownId.current) fadeId.current = shownId.current !== null && !byKeyboard.current ? openPostId : null;
  // Removing fades the post out first, then the next one fades in.
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    shownId.current = openPostId;
    byKeyboard.current = false;
    setLeaving(false);
  }, [openPostId]);
  const fade = leaving ? 'post-leaving' : fadeId.current === openPostId ? 'post-enter' : '';
  const found = openPostId ? visibleIds.indexOf(openPostId) : -1;
  if (found !== -1) lastIndex.current = found;
  const inView = found !== -1;
  const at = inView ? found : lastIndex.current;
  const prevId = at > 0 ? visibleIds[at - 1] : undefined;
  const nextId = inView ? visibleIds[at + 1] : at >= 0 ? visibleIds[at] : undefined;

  // Arrow keys step through the posts on the board, like the arrows beside the modal.
  useEffect(() => {
    if (!openPostId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('textarea, input, [cmdk-root], [role=slider]')) return;
      if (e.key === 'ArrowLeft' && prevId) (byKeyboard.current = true), openPost(prevId);
      if (e.key === 'ArrowRight' && nextId) (byKeyboard.current = true), openPost(nextId);
    };
    // Capture phase: the dialog stops arrow keys before they bubble up to the window.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [openPostId, prevId, nextId, openPost]);


  /** Sorting an unsorted post from X bookmarks moves straight on to the next one. */
  function afterSort(added: boolean) {
    if (!added || view.kind !== 'inbox' || !post || post.folderIds.length > 0) return;
    const following = visibleIds[at + 1] ?? (at > 0 ? visibleIds[at - 1] : undefined);
    openPost(following ?? null);
  }

  return (
    <Dialog.Root open={Boolean(openPostId)} onOpenChange={(open) => !open && openPost(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/95 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-2 z-40 outline-none transition-[scale,opacity] duration-200 ease-[var(--ease-out)] data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(720px,calc(100dvh-64px))] md:w-[min(1040px,calc(100vw-176px))] md:-translate-x-1/2 md:-translate-y-1/2">
          {post && (
            <>
              <div className="flex h-full flex-col overflow-y-auto rounded-2xl border border-line bg-surface shadow-pop md:flex-row md:overflow-hidden">
                <div className="relative flex min-h-[45vh] shrink-0 items-center justify-center bg-bg px-16 pt-16 pb-20 md:min-h-0 md:flex-1 md:shrink">
                  <div key={post.id} className={`flex h-full w-full items-center justify-center ${fade}`}>
                    <MediaStage post={post} startIndex={openMediaIndex} />
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col border-line md:w-80 md:border-l">
                  <div className="flex justify-end p-4 pb-0">
                    <Dialog.Close aria-label="Close" className="press flex size-8 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
                      <X size={16} />
                    </Dialog.Close>
                  </div>
                  <Dialog.Title className="sr-only">Post by {post.author.name}</Dialog.Title>

                  <div key={post.id} className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6 ${fade}`}>
                    <PostText post={post} />
                    <PostTags post={post} />
                    <NoteField post={post} />
                    <section className="mt-2">
                      <h3 className="mb-2 text-xs font-medium text-faint">Folder</h3>
                      <FolderChips post={post} onPicked={afterSort} />
                    </section>
                  </div>

                  <div className="flex items-center justify-end border-t border-line px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (leaving) return;
                        // Stay in the window: fade this post out, show the next one (or the previous one at the end), then remove.
                        const following = (inView ? visibleIds[at + 1] : visibleIds[at]) ?? (at > 0 ? visibleIds[at - 1] : undefined) ?? null;
                        setLeaving(true);
                        window.setTimeout(() => {
                          openPost(following);
                          void removePost(post); // same frame as the next post, so the grid and the window move together
                        }, 120);
                      }}
                      className="press flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-danger hover:bg-sunken"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>

              {prevId && <PostArrow side="left" onClick={() => openPost(prevId)} />}
              {nextId && <PostArrow side="right" onClick={() => openPost(nextId)} />}
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Steps to the previous or next post on the board. Sits outside the card so it never covers the image. */
function PostArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous post' : 'Next post'}
      className={`press absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-sunken text-ink hover:bg-line md:flex ${side === 'left' ? '-left-16' : '-right-16'}`}
    >
      <Icon size={20} />
    </button>
  );
}
