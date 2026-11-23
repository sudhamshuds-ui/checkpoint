import { useState, type ReactElement } from 'react';
import { Command } from 'cmdk';
import { Popover } from '@base-ui/react/popover';
import { Check, Plus } from 'lucide-react';
import { useFolders, usePost } from '@/lib/hooks';
import { createFolder, toggleFolder } from '@/lib/actions';

interface PopoverProps {
  postId: string;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'bottom';
  align?: 'start' | 'end';
  /** Runs after the menu closes and before the post changes, e.g. to play the tile's exit. */
  beforePick?: (added: boolean) => Promise<void> | void;
  /** Called after a folder is picked; `added` is false when it was taken off. */
  onPicked?: (added: boolean) => void;
}

/* The menu sits just beside its trigger and simply fades, so the Sort button stays visible and
   clicking it again closes the menu. */
const FADE =
  'transition-opacity duration-150 ease-[var(--ease-out)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-100';

/** Popover with a searchable folder list. Picking a folder adds or removes the post. */
export function FolderPopover({ postId, trigger, open: controlled, onOpenChange, side = 'bottom', align = 'end', beforePick, onPicked }: PopoverProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner side={side} sideOffset={8} align={align} className="z-50">
          <Popover.Popup className={`w-64 rounded-xl border border-line bg-surface shadow-pop outline-none ${FADE}`} onClick={(e) => e.stopPropagation()}>
            <FolderPicker
                postId={postId}
                commit={async (toggle, added) => {
                  setOpen(false);
                  await beforePick?.(added);
                  await toggle();
                  onPicked?.(added);
                }}
              />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

type Commit = (toggle: () => Promise<void>, added: boolean) => void;

export function FolderPicker({ postId, commit = (toggle) => void toggle() }: { postId: string; commit?: Commit }) {
  const post = usePost(postId);
  const folders = useFolders();
  const [search, setSearch] = useState('');
  const name = search.trim();
  const exists = folders.some((f) => f.name.toLowerCase() === name.toLowerCase());

  if (!post) return null;

  return (
    <Command loop className="flex flex-col">
      <Command.Input
        autoFocus
        value={search}
        onValueChange={setSearch}
        placeholder={folders.length ? 'Find or create a folder' : 'Name your first folder'}
        className="h-10 border-b border-line bg-transparent px-3 text-sm outline-none placeholder:text-faint"
      />
      <Command.List className="max-h-72 overflow-y-auto p-1">
        {folders.map((folder) => {
          const checked = post.folderIds.includes(folder.id);
          return (
            <Command.Item
              key={folder.id}
              value={`${folder.name} ${folder.id}`}
              onSelect={() => commit(() => toggleFolder(post, folder.id, folder.name), !checked)}
              className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm"
            >
              <span className="flex size-4 items-center justify-center text-accent">
                {checked && <Check size={14} strokeWidth={2.25} />}
              </span>
              <span className="truncate">{folder.name}</span>
            </Command.Item>
          );
        })}
        {name && !exists && (
          <Command.Item
            forceMount
            value={`create ${name}`}
            onSelect={() => {
              setSearch('');
              commit(async () => {
                const id = await createFolder(name);
                await toggleFolder(post, id, name);
              }, true);
            }}
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm"
          >
            <Plus size={14} className="text-muted" />
            <span className="truncate">
              Create <span className="font-medium">“{name}”</span>
            </span>
          </Command.Item>
        )}
        {!name && folders.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-muted">Type a name, like Motion or Branding.</p>
        )}
      </Command.List>
    </Command>
  );
}
