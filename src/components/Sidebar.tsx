import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useDroppable } from '@dnd-kit/core';
import { Menu } from '@base-ui/react/menu';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Inbox, LayoutGrid, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { useUI, type View } from '@/lib/store';
import { useSyncState } from '@/lib/hooks';
import { createFolder, deleteFolder, renameFolder } from '@/lib/actions';
import { plural, relativeTime } from '@/lib/format';
import type { Folder } from '@/lib/types';
import type { RuntimeMessage } from '@/lib/messages';

interface Props {
  folders: Folder[];
  counts: { inbox: number; all: number; byFolder: Map<string, number> };
}

export function Sidebar({ folders, counts }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-bg">
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Checkpoint</span>
      </div>

      <nav className="flex flex-col gap-px px-3" aria-label="Views">
        <NavRow view={{ kind: 'inbox' }} dropId="inbox" icon={<Inbox size={16} strokeWidth={1.75} />} label="Inbox" count={counts.inbox} highlight />
        <NavRow view={{ kind: 'all' }} icon={<LayoutGrid size={16} strokeWidth={1.75} />} label="All saves" count={counts.all} />
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
        {folders.map((folder) => (
          <FolderRow key={folder.id} folder={folder} count={counts.byFolder.get(folder.id) ?? 0} />
        ))}
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
              Make folders like Motion, Interactions or Branding, then drag posts onto them.
            </button>
          )
        )}
      </div>

      <SyncFooter />
    </aside>
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
}: {
  view: View;
  dropId?: string;
  icon?: ReactNode;
  label: string;
  count: number;
  highlight?: boolean;
  trailing?: ReactNode;
}) {
  const current = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const { setNodeRef, isOver } = useDroppable({ id: dropId ?? `view:${label}`, disabled: !dropId });
  const active = isActive(current, view);

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'group relative flex h-8 items-center rounded-lg transition-colors duration-100',
        active ? 'bg-sunken text-ink' : 'text-muted hover:bg-sunken/60 hover:text-ink',
        isOver && 'bg-accent-soft! text-accent-ink! ring-1 ring-accent/40',
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
                  if (view.kind === 'folder' && view.folderId === folder.id) setView({ kind: 'all' });
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
        className="h-8 w-full rounded-lg bg-surface px-2 text-sm shadow-card outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/50"
      />
    </form>
  );
}

export function startSync() {
  return browser.runtime.sendMessage({ type: 'sync:start' } satisfies RuntimeMessage);
}

function SyncFooter() {
  const sync = useSyncState();
  const running = sync?.status === 'running';

  return (
    <div className="border-t border-line p-3">
      <button
        type="button"
        onClick={startSync}
        className="press flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-surface text-sm font-medium shadow-card hover:bg-sunken"
      >
        <RefreshCw size={14} strokeWidth={2} className={clsx(running && 'animate-spin [animation-duration:700ms]')} />
        {running ? 'Importing…' : 'Sync bookmarks'}
      </button>
      <p className="tabular mt-2 px-1 text-center text-xs text-faint">
        {running
          ? `${sync.found} found${sync.added ? `, ${sync.added} new` : ''}`
          : sync?.lastSyncAt
            ? `Synced ${relativeTime(sync.lastSyncAt)}${sync.lastAdded ? ` · ${sync.lastAdded} new` : ''}`
            : 'Not synced yet'}
      </p>
    </div>
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
