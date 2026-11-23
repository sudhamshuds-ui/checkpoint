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

/* The menu morphs out of its trigger. It is laid over the button and starts as a clear shape clipped to
   the button's own pill (the anchor size Base UI exposes), so the real button shows through. It then opens
   to its full rectangle while its background and border fill in. Closing runs the same path in reverse and
   melts back into the button. No opacity fade, and the button itself never changes, so nothing flashes.
   The settled clip reaches 32px past the edges (radius 12 + 32) so the drop shadow isn't cut off. */
// Class names are written out in full so Tailwind can find them.
const MORPH =
  'transition-[clip-path,background-color,border-color] duration-200 ease-[var(--ease-out)] ' +
  // Closing: the shape collapses first and the fill clears only at the very end, so it reads as one object shrinking back.
  'data-[ending-style]:[transition-duration:150ms,60ms,60ms] data-[ending-style]:[transition-delay:0ms,90ms,90ms] ' +
  '[clip-path:inset(-32px_round_44px)] ' +
  'data-[starting-style]:bg-transparent data-[ending-style]:bg-transparent data-[starting-style]:border-transparent data-[ending-style]:border-transparent ' +
  'data-[side=bottom]:data-[starting-style]:[clip-path:inset(0_0_calc(100%-var(--anchor-height))_calc(100%-var(--anchor-width))_round_999px)] data-[side=bottom]:data-[ending-style]:[clip-path:inset(0_0_calc(100%-var(--anchor-height))_calc(100%-var(--anchor-width))_round_999px)] ' +
  'data-[side=top]:data-[starting-style]:[clip-path:inset(calc(100%-var(--anchor-height))_0_0_calc(100%-var(--anchor-width))_round_999px)] data-[side=top]:data-[ending-style]:[clip-path:inset(calc(100%-var(--anchor-height))_0_0_calc(100%-var(--anchor-width))_round_999px)]';

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
        {/* Negative offset lays the menu over its trigger so the morph starts exactly on the button. */}
        <Popover.Positioner side={side} sideOffset={({ anchor }) => -anchor.height} align={align} className="z-50">
          <Popover.Popup className={`morph-popup w-64 rounded-xl border border-line bg-surface shadow-pop outline-none ${MORPH}`} onClick={(e) => e.stopPropagation()}>
            <div className="transition-opacity duration-150 in-data-[ending-style]:opacity-0 in-data-[ending-style]:duration-75 in-data-[starting-style]:opacity-0 [transition-delay:60ms] in-data-[ending-style]:[transition-delay:0ms]">
              <FolderPicker
                postId={postId}
                commit={async (toggle, added) => {
                  setOpen(false);
                  await beforePick?.(added);
                  await toggle();
                  onPicked?.(added);
                }}
              />
            </div>
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
