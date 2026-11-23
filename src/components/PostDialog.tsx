import { useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowUpRight, Inbox, Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { useFolders, usePost } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { removePost, sendToInbox, toggleFolder } from '@/lib/actions';
import { FolderPopover } from './FolderPicker';
import { MediaStage, NoteField, PostText } from './PostBody';

export function PostDialog() {
  const openPostId = useUI((s) => s.openPostId);
  const openPost = useUI((s) => s.openPost);
  const post = usePost(openPostId);
  const folders = useFolders();

  // Arrow keys step through the posts on screen.
  useEffect(() => {
    if (!openPostId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('textarea, input, [role="dialog"] [cmdk-root]')) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const ids = useUI.getState().visibleIds;
      const next = ids[ids.indexOf(openPostId) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) openPost(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPostId, openPost]);

  return (
    <Dialog.Root open={Boolean(openPostId)} onOpenChange={(open) => !open && openPost(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 data-[ending-style]:duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-4 z-40 m-auto flex max-h-[860px] max-w-[1240px] overflow-hidden rounded-2xl bg-surface shadow-pop outline-none transition-[transform,opacity] duration-200 ease-[var(--ease-out)] data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
          {post && (
            <>
              <div className="flex min-w-0 flex-1 items-center justify-center bg-bg p-8">
                <MediaStage post={post} />
              </div>
              <div className="flex w-[380px] shrink-0 flex-col border-l border-line">
                <div className="flex items-center justify-end gap-1 p-3 pb-0">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noreferrer"
                    className="press flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted hover:bg-sunken hover:text-ink"
                  >
                    Open on X <ArrowUpRight size={14} />
                  </a>
                  <Dialog.Close aria-label="Close" className="press flex size-8 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
                    <X size={17} />
                  </Dialog.Close>
                </div>
                <Dialog.Title className="sr-only">Post by {post.author.name}</Dialog.Title>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">
                  <PostText post={post} />

                  <section className="mt-7">
                    <h3 className="mb-2 text-xs font-medium text-faint">Note</h3>
                    <NoteField post={post} />
                  </section>

                  <section className="mt-6">
                    <h3 className="mb-2 text-xs font-medium text-faint">Folders</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {folders.map((folder) => {
                        const on = post.folderIds.includes(folder.id);
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleFolder(post, folder.id, folder.name)}
                            className={clsx(
                              'press h-7 rounded-full px-3 text-[13px]',
                              on ? 'bg-ink text-bg' : 'bg-sunken text-muted hover:text-ink',
                            )}
                          >
                            {folder.name}
                          </button>
                        );
                      })}
                      <FolderPopover
                        postId={post.id}
                        trigger={
                          <button
                            type="button"
                            className="press flex h-7 items-center gap-1 rounded-full border border-dashed border-line px-2.5 text-[13px] text-muted hover:text-ink"
                          >
                            <Plus size={13} /> New
                          </button>
                        }
                      />
                    </div>
                  </section>
                </div>

                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  {post.folderIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => sendToInbox(post)}
                      className="press flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted hover:bg-sunken hover:text-ink"
                    >
                      <Inbox size={14} /> Back to Inbox
                    </button>
                  ) : (
                    <span className="px-2 text-[13px] text-faint">In your Inbox</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      openPost(null);
                      removePost(post);
                    }}
                    className="press flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted hover:bg-sunken hover:text-ink"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
