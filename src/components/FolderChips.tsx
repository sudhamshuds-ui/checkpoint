import clsx from 'clsx';
import { Folder as FolderIcon } from 'lucide-react';
import { useFolders } from '@/lib/hooks';
import { createFolder, toggleFolder } from '@/lib/actions';
import type { Post } from '@/lib/types';
import { InlineAdd } from './Tags';

/**
 * Every folder as a chip in the post window: one click files the post, another takes it out.
 * Folders show a folder icon and turn purple when the post is in them, so they never read as tags.
 * `onPicked` gets `added`, so sorting from X bookmarks can move on to the next post.
 */
export function FolderChips({ post, onPicked }: { post: Post; onPicked?: (added: boolean) => void }) {
  const folders = useFolders();

  async function pick(id: string, name: string) {
    const added = !post.folderIds.includes(id);
    await toggleFolder(post, id, name);
    onPicked?.(added);
  }

  async function addByName(typed: string) {
    const existing = folders.find((f) => f.name.toLowerCase() === typed.toLowerCase());
    if (existing) {
      if (!post.folderIds.includes(existing.id)) await pick(existing.id, existing.name);
      return;
    }
    const id = await createFolder(typed);
    await toggleFolder(post, id, typed);
    onPicked?.(true);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {folders.map((folder) => {
        const on = post.folderIds.includes(folder.id);
        return (
          <button
            key={folder.id}
            type="button"
            aria-pressed={on}
            onClick={() => pick(folder.id, folder.name)}
            title={on ? `Take out of ${folder.name}` : `File in ${folder.name}`}
            className={clsx(
              'press inline-flex h-6 items-center gap-1.5 rounded-full border pr-2.5 pl-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:bg-sunken hover:text-ink',
            )}
          >
            <FolderIcon size={12} strokeWidth={2} />
            {folder.name}
          </button>
        );
      })}
      <InlineAdd label="New" placeholder="Folder name" onAdd={addByName} />
    </div>
  );
}
