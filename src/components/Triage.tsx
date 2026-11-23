import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { assignQuietly, createFolder } from '@/lib/actions';
import { isInbox } from '@/lib/db';
import { useFolders } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import type { Post } from '@/lib/types';
import { plural } from '@/lib/format';
import { MediaStage, NoteField, PostText } from './PostBody';

/* Keyboard-first sorting. Nothing here animates between posts: it is driven by key presses
   that repeat dozens of times in a row, where motion would only slow the user down. */
export function Triage({ posts }: { posts: Post[] }) {
  const open = useUI((s) => s.triageOpen);
  const setOpen = useUI((s) => s.setTriageOpen);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-40 flex flex-col bg-bg outline-none transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          <Dialog.Title className="sr-only">Sort inbox</Dialog.Title>
          {open && <TriageSession posts={posts} onClose={() => setOpen(false)} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface Step {
  id: string;
  previous: string[];
  index: number;
}

function TriageSession({ posts, onClose }: { posts: Post[]; onClose: () => void }) {
  const folders = useFolders();
  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  // The queue is fixed when the session starts, so sorted posts don't shift the order mid-session.
  const [queue] = useState(() => posts.filter(isInbox).map((p) => p.id));
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Step[]>([]);
  const [naming, setNaming] = useState(false);
  const [sorted, setSorted] = useState(0);
  const noteRef = useRef<HTMLDivElement>(null);

  const post = byId.get(queue[index]);
  const done = index >= queue.length;

  async function assign(folderId: string, advance: boolean) {
    if (!post) return;
    const has = post.folderIds.includes(folderId);
    const next = has ? post.folderIds.filter((f) => f !== folderId) : [...post.folderIds, folderId];
    setHistory((h) => [...h, { id: post.id, previous: post.folderIds, index }]);
    await assignQuietly(post.id, next);
    if (advance && next.length > 0) {
      setSorted((n) => n + (post.folderIds.length === 0 ? 1 : 0));
      setIndex((i) => i + 1);
    }
  }

  async function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    await assignQuietly(last.id, last.previous);
    if (last.index !== index) setSorted((n) => Math.max(0, n - (last.previous.length === 0 ? 1 : 0)));
    setIndex(last.index);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit && !done) {
        const folder = folders[Number(digit[1]) - 1];
        if (folder) {
          e.preventDefault();
          assign(folder.id, !e.shiftKey);
        }
        return;
      }
      switch (e.key.toLowerCase()) {
        case 'arrowright':
        case 's':
          setIndex((i) => Math.min(i + 1, queue.length));
          break;
        case 'arrowleft':
          setIndex((i) => Math.max(i - 1, 0));
          break;
        case 'z':
          undo();
          break;
        case 'n':
          if (!done) {
            e.preventDefault();
            setNaming(true);
          }
          break;
        case 'enter':
          if (!done) {
            e.preventDefault();
            noteRef.current?.querySelector('textarea')?.focus();
          }
          break;
        case 'e':
          if (post) window.open(post.url, '_blank', 'noreferrer');
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-5">
        <span className="text-sm font-medium">Sort inbox</span>
        <div className="flex flex-1 items-center gap-3">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-[var(--ease-out)]"
              style={{ width: `${queue.length ? (Math.min(index, queue.length) / queue.length) * 100 : 100}%` }}
            />
          </div>
          <span className="tabular text-xs text-faint">
            {Math.min(index + 1, queue.length)} of {queue.length}
          </span>
        </div>
        <Dialog.Close aria-label="Close" className="press flex size-8 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
          <X size={17} />
        </Dialog.Close>
      </header>

      {done || !post ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-xl font-semibold tracking-[-0.01em]">{queue.length === 0 ? 'Nothing to sort' : 'Inbox sorted'}</p>
          <p className="text-sm text-muted">
            {queue.length === 0 ? 'New bookmarks will show up here.' : `You filed ${plural(sorted, 'post')}. Skipped ones stay in your Inbox.`}
          </p>
          <button type="button" onClick={onClose} className="press mt-4 h-9 rounded-lg bg-ink px-4 text-sm font-medium text-bg">
            Done
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 items-center justify-center p-10">
            <MediaStage post={post} />
          </div>
          <aside className="flex w-[400px] shrink-0 flex-col border-l border-line bg-surface">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <PostText post={post} />
              <div ref={noteRef} className="mt-6">
                <NoteField post={post} placeholder="Why did you save this? (Enter)" />
              </div>
              <h3 className="mt-6 mb-2 flex justify-between text-xs text-faint">
                <span className="font-medium">File into</span>
                <span>Hold ⇧ to pick several</span>
              </h3>
              <ul className="flex flex-col gap-px">
                {folders.map((folder, i) => {
                  const on = post.folderIds.includes(folder.id);
                  return (
                    <li key={folder.id}>
                      <button
                        type="button"
                        onClick={(e) => assign(folder.id, !e.shiftKey)}
                        className={clsx('flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-sm', on ? 'bg-accent-soft text-accent-ink' : 'hover:bg-sunken')}
                      >
                        <Kbd>{i < 9 ? i + 1 : ''}</Kbd>
                        <span className="flex-1 truncate">{folder.name}</span>
                        {on && <Check size={15} />}
                      </button>
                    </li>
                  );
                })}
                <li>
                  {naming ? (
                    <NewFolderInput
                      onDone={async (name) => {
                        setNaming(false);
                        if (name) assign(await createFolder(name), true);
                      }}
                    />
                  ) : (
                    <button type="button" onClick={() => setNaming(true)} className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-sm text-muted hover:bg-sunken">
                      <Kbd>N</Kbd> New folder
                    </button>
                  )}
                </li>
              </ul>
            </div>
            <footer className="flex items-center gap-4 border-t border-line px-6 py-3 text-xs whitespace-nowrap text-faint">
              <span>
                <Kbd>1–9</Kbd> file
              </span>
              <span>
                <Kbd>S</Kbd> skip
              </span>
              <span>
                <Kbd>←</Kbd> back
              </span>
              <span>
                <Kbd>Z</Kbd> undo
              </span>
              <a href={post.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 hover:text-ink">
                <Kbd>E</Kbd> Open on X
              </a>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}

function NewFolderInput({ onDone }: { onDone: (name: string) => void }) {
  const [value, setValue] = useState('');
  const finished = useRef(false);
  const finish = (name: string) => {
    if (finished.current) return;
    finished.current = true;
    onDone(name);
  };
  return (
    <input
      autoFocus
      value={value}
      placeholder="Folder name, then Enter"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value.trim());
        if (e.key === 'Escape') {
          e.stopPropagation();
          finish('');
        }
      }}
      onBlur={() => finish('')}
      className="h-9 w-full rounded-lg bg-sunken px-2 text-sm outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-bg px-1 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}
