import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Menu } from '@base-ui/react/menu';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Dialog } from '@base-ui/react/dialog';
import { toast } from 'sonner';
import { Inbox, LayoutGrid, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { useUI, type View } from '@/lib/store';
import { useSyncState } from '@/lib/hooks';
import { createFolder, deleteFolder, renameFolder } from '@/lib/actions';
import { plural, relativeTime } from '@/lib/format';
import type { Folder } from '@/lib/types';
import { connectExtension, startSync, useExtension } from '@/lib/extension';
import { useData } from '@/lib/data';
import { supabase } from '@/web/client';

interface Props {
  folders: Folder[];
  counts: { inbox: number; feed: number; byFolder: Map<string, number> };
}

export function Sidebar({ folders, counts }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-bg md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Checkpoint</span>
      </div>

      <nav className="flex flex-col gap-px px-3" aria-label="Views">
        <NavRow view={{ kind: 'inbox' }} dropId="inbox" icon={<Inbox size={16} strokeWidth={1.75} />} label="X bookmarks" count={counts.inbox} highlight />
        <NavRow view={{ kind: 'feed' }} icon={<LayoutGrid size={16} strokeWidth={1.75} />} label="My feed" count={counts.feed} />
      </nav>

      <div className="mt-6 flex items-center justify-between pr-3 pl-5">
        <h2 className="text-xs font-medium text-faint">Folders</h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New folder"
          className="press flex size-6 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink"
        >
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-3 pb-4">
        {/* Drag a folder up or down to reorder; drop a post on one to file it. */}
        <SortableContext items={folders.map((f) => `folder:${f.id}`)} strategy={verticalListSortingStrategy}>
          {folders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} count={counts.byFolder.get(folder.id) ?? 0} />
          ))}
        </SortableContext>
        {creating ? (
          <NameInput
            placeholder="Folder name"
            onSubmit={async (name) => {
              const id = await createFolder(name);
              setCreating(false);
              useUI.getState().setView({ kind: 'folder', folderId: id });
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          folders.length === 0 && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-lg px-2 py-2 text-left text-[13px] leading-snug text-muted hover:bg-sunken"
            >
              Make folders like Motion, Interactions or Branding. Then sort posts into them from X bookmarks.
            </button>
          )
        )}
      </div>

      <SyncFooter />
    </aside>
  );
}

/** Phones: the views and folders as a scrolling row of chips above the board. */
export function MobileNav({ folders, counts }: Props) {
  const current = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const items: { view: View; label: string; count: number }[] = [
    { view: { kind: 'inbox' }, label: 'X bookmarks', count: counts.inbox },
    { view: { kind: 'feed' }, label: 'My feed', count: counts.feed },
    ...folders.map((f) => ({ view: { kind: 'folder', folderId: f.id } as View, label: f.name, count: counts.byFolder.get(f.id) ?? 0 })),
  ];
  return (
    <nav aria-label="Views" className="flex items-center gap-2 border-b border-line px-4 py-3 md:hidden">
      <Logo />
      <div className="-my-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
        {items.map((item) => {
          const active = isActive(current, item.view);
          return (
            <button
              key={item.label + (item.view.kind === 'folder' ? item.view.folderId : '')}
              type="button"
              onClick={() => setView(item.view)}
              aria-current={active ? 'page' : undefined}
              className={clsx('press flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px]', active ? 'bg-ink text-bg' : 'bg-sunken text-muted')}
            >
              {item.label}
              {item.count > 0 && <span className={clsx('tabular text-xs', active ? 'opacity-70' : 'text-faint')}>{item.count}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function isActive(current: View, view: View) {
  if (current.kind !== view.kind) return false;
  return current.kind !== 'folder' || (view.kind === 'folder' && current.folderId === view.folderId);
}

function NavRow({
  view,
  dropId,
  icon,
  label,
  count,
  highlight,
  trailing,
  sortable,
}: {
  view: View;
  dropId?: string;
  icon?: ReactNode;
  label: string;
  count: number;
  highlight?: boolean;
  trailing?: ReactNode;
  /** Folder rows are sortable: they bring their own node ref, drag handlers and transform. */
  sortable?: ReturnType<typeof useSortable>;
}) {
  const current = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const droppable = useDroppable({ id: dropId ?? `view:${label}`, disabled: !dropId || Boolean(sortable) });
  const active = isActive(current, view);
  const isOver = sortable ? sortable.isOver && !String(sortable.active?.id).startsWith('folder:') : droppable.isOver;

  return (
    <div
      ref={sortable ? sortable.setNodeRef : droppable.setNodeRef}
      {...(sortable ? { ...sortable.attributes, ...sortable.listeners, role: undefined, tabIndex: undefined } : {})}
      style={sortable ? { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition } : undefined}
      className={clsx(
        'group relative flex h-8 items-center rounded-lg transition-colors duration-100',
        active ? 'bg-sunken text-ink' : 'text-muted hover:bg-sunken/60 hover:text-ink',
        isOver && 'bg-accent-soft! text-accent-ink! ring-1 ring-accent/40',
        sortable?.isDragging && 'relative z-10 bg-sunken! text-ink! shadow-pop',
      )}
    >
      <button
        type="button"
        onClick={() => setView(view)}
        className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-current={active ? 'page' : undefined}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className={clsx('truncate', active && 'font-medium')}>{label}</span>
      </button>
      <span
        className={clsx(
          'tabular pointer-events-none mr-2 text-xs',
          trailing && 'group-hover:opacity-0',
          highlight && count > 0 ? 'rounded-full bg-accent px-1.5 py-px font-medium text-white' : 'text-faint',
        )}
      >
        {count > 0 ? count : ''}
      </span>
      {trailing}
    </div>
  );
}

function FolderRow({ folder, count }: { folder: Folder; count: number }) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const setView = useUI((s) => s.setView);
  const view = useUI((s) => s.view);
  const sortable = useSortable({ id: `folder:${folder.id}`, disabled: renaming });

  if (renaming) {
    return (
      <NameInput
        initial={folder.name}
        onSubmit={async (name) => {
          await renameFolder(folder.id, name);
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
    );
  }

  return (
    <>
      <NavRow
        view={{ kind: 'folder', folderId: folder.id }}
        dropId={`folder:${folder.id}`}
        label={folder.name}
        count={count}
        sortable={sortable}
        trailing={
          <Menu.Root>
            <Menu.Trigger
              aria-label={`${folder.name} options`}
              className="absolute right-1 flex size-6 items-center justify-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100 data-[popup-open]:opacity-100"
            >
              <MoreHorizontal size={15} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={4} align="start" className="z-50">
                <Menu.Popup className="min-w-36 origin-[var(--transform-origin)] rounded-xl bg-surface p-1 shadow-pop outline-none transition-[transform,opacity] duration-150 ease-[var(--ease-out)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
                  <MenuItem onClick={() => setRenaming(true)}>Rename</MenuItem>
                  <MenuItem onClick={() => setConfirming(true)} danger>
                    Delete folder
                  </MenuItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        }
      />
      <AlertDialog.Root open={confirming} onOpenChange={setConfirming}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-pop outline-none transition-[transform,opacity] duration-200 ease-[var(--ease-out)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
            <AlertDialog.Title className="text-[15px] font-semibold">Delete “{folder.name}”?</AlertDialog.Title>
            <AlertDialog.Description className="mt-1.5 text-sm leading-relaxed text-muted">
              {count > 0
                ? `The ${plural(count, 'post')} in it stay in Checkpoint. Any that aren't in another folder go back to your Inbox.`
                : 'This folder is empty.'}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Close className="press h-8 rounded-lg px-3 text-sm text-muted hover:bg-sunken hover:text-ink">Cancel</AlertDialog.Close>
              <button
                type="button"
                className="press h-8 rounded-lg bg-[#c2381a] px-3 text-sm font-medium text-white hover:bg-[#a92f14]"
                onClick={async () => {
                  await deleteFolder(folder.id);
                  setConfirming(false);
                  if (view.kind === 'folder' && view.folderId === folder.id) setView({ kind: 'feed' });
                }}
              >
                Delete folder
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <Menu.Item
      onClick={onClick}
      className={clsx(
        'flex h-8 cursor-default items-center rounded-lg px-2 text-sm outline-none data-[highlighted]:bg-sunken',
        danger && 'text-[#c2381a] dark:text-[#ff8a6a]',
      )}
    >
      {children}
    </Menu.Item>
  );
}

function NameInput({
  initial = '',
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value);
        else onCancel();
      }}
    >
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => (value.trim() && value !== initial ? onSubmit(value) : onCancel())}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="mt-px h-8 w-full rounded-lg border border-accent/70 bg-sunken px-[7px] text-sm text-ink outline-none placeholder:text-faint"
      />
    </form>
  );
}

function SyncFooter() {
  const sync = useSyncState();
  const { status, refresh } = useExtension();
  const [connecting, setConnecting] = useState(false);
  const running = sync?.status === 'running';

  async function onSync() {
    if (useData.getState().demo) {
      toast('This preview uses sample posts', { description: 'In the real app, Sync imports your X bookmarks through the Chrome extension.' });
      return;
    }
    if (!status?.installed) {
      toast('Import runs from the Chrome extension', {
        description: 'Open Checkpoint in Chrome on a computer with the Checkpoint extension installed.',
      });
      return;
    }
    if (!status.signedIn) return setConnecting(true);
    const result = await startSync();
    if (!result?.ok) toast.error("Couldn't start the import", { description: result?.error });
  }

  return (
    <div className="border-t border-line p-3">
      <button
        type="button"
        onClick={onSync}
        className="press flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-surface text-sm font-medium shadow-card hover:bg-sunken"
      >
        <RefreshCw size={14} strokeWidth={2} className={clsx(running && 'animate-spin [animation-duration:700ms]')} />
        {running ? 'Importing…' : status?.installed && !status.signedIn ? 'Connect extension' : 'Sync bookmarks'}
      </button>
      <p className="tabular mt-2 px-1 text-center text-xs text-faint">
        {running
          ? `${sync.found} found${sync.added ? `, ${sync.added} new` : ''}`
          : sync?.lastSyncAt
            ? `Synced ${relativeTime(sync.lastSyncAt)}${sync.lastAdded ? ` · ${sync.lastAdded} new` : ''}`
            : 'Not synced yet'}
      </p>
      <AccountRow />
      <ConnectDialog
        open={connecting}
        onOpenChange={setConnecting}
        onConnected={() => {
          refresh();
          toast('Extension connected', { description: 'Bookmarks you save on X now land here.' });
        }}
      />
    </div>
  );
}

function AccountRow() {
  const demo = useData((s) => s.demo);
  const [email, setEmail] = useState<string>();
  useEffect(() => {
    if (!demo) supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, [demo]);
  if (demo) {
    return <p className="mt-3 border-t border-line px-1 pt-3 text-center text-xs text-faint">Preview with sample posts</p>;
  }
  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-1 pt-3 text-xs text-faint">
      <span className="truncate">{email}</span>
      <button type="button" onClick={() => supabase.auth.signOut()} className="shrink-0 hover:text-ink">
        Sign out
      </button>
    </div>
  );
}

/** The extension keeps its own login. Asking for the password once lets it sign itself in. */
function ConnectDialog({ open, onOpenChange, onConnected }: { open: boolean; onOpenChange: (open: boolean) => void; onConnected: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const { data } = await supabase.auth.getUser();
    const result = await connectExtension(data.user?.email ?? '', password);
    setBusy(false);
    if (result?.ok) {
      setPassword('');
      onOpenChange(false);
      onConnected();
    } else setError(result?.error ?? 'The extension did not answer. Reload it in chrome://extensions and try again.');
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-pop outline-none transition-[transform,opacity] duration-200 ease-[var(--ease-out)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          <Dialog.Title className="text-[15px] font-semibold">Connect the extension</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-muted">
            Enter your Checkpoint password once so the extension in this Chrome can save bookmarks to your account.
          </Dialog.Description>
          <form onSubmit={submit} className="mt-4">
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-9 w-full rounded-lg bg-sunken px-3 text-sm outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
            />
            {error && <p className="mt-2 text-[13px] text-[#c2381a] dark:text-[#ff8a6a]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close className="press h-8 rounded-lg px-3 text-sm text-muted hover:bg-sunken hover:text-ink">Cancel</Dialog.Close>
              <button type="submit" disabled={!password || busy} className="press h-8 rounded-lg bg-ink px-3 text-sm font-medium text-bg disabled:opacity-50">
                {busy ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="text-accent">
      <path d="M4 2.5v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.9 3h8.6a.6.6 0 0 1 .45 1l-2.1 2.6 2.1 2.6a.6.6 0 0 1-.45 1H4.9z" fill="currentColor" />
    </svg>
  );
}
