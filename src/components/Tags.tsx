import { useState } from 'react';
import { Command } from 'cmdk';
import { Popover } from '@base-ui/react/popover';
import clsx from 'clsx';
import { Check, Plus, X } from 'lucide-react';
import { useTags, usePost } from '@/lib/hooks';
import { createTagOn, nextTagColor, toggleTag } from '@/lib/actions';
import { TAG_COLORS, type Post, type Tag, type TagColor } from '@/lib/types';

export const tagColor = (c: TagColor) => `var(--tag-${c})`;

/** A tag on a post. Clicking the name searches for it; × takes it off this post. */
export function TagChip({ tag, onSearch, onRemove }: { tag: Tag; onSearch?: () => void; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full pr-1 pl-2.5 text-xs font-medium text-white" style={{ background: tagColor(tag.color) }}>
      <button type="button" onClick={onSearch} className="outline-none hover:underline focus-visible:underline" title={`Show everything tagged ${tag.name}`}>
        {tag.name}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="ml-0.5 flex size-4 items-center justify-center rounded-full opacity-60 outline-none hover:bg-white/15 hover:opacity-100 focus-visible:opacity-100"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

export function AddTag({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="press inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-line pr-2.5 pl-2 text-xs text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent">
        <Plus size={12} strokeWidth={2.25} /> Add tag
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Popover.Popup className="w-60 origin-[var(--transform-origin)] rounded-xl border border-line bg-surface shadow-pop outline-none transition-[transform,opacity] duration-150 ease-[var(--ease-out)] data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[ending-style]:duration-100 data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0">
            <TagPicker postId={post.id} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TagPicker({ postId }: { postId: string }) {
  const post = usePost(postId);
  const tags = useTags();
  const [search, setSearch] = useState('');
  const [color, setColor] = useState<TagColor | null>(null);
  const name = search.trim();
  const exists = tags.some((t) => t.name.toLowerCase() === name.toLowerCase());
  const chosen = color ?? nextTagColor(tags);
  if (!post) return null;

  return (
    <Command loop className="flex flex-col">
      <Command.Input
        autoFocus
        value={search}
        onValueChange={setSearch}
        placeholder={tags.length ? 'Find or create a tag' : 'Name your first tag'}
        className="h-10 border-b border-line bg-transparent px-3 text-sm outline-none placeholder:text-faint"
      />
      <Command.List className="max-h-64 overflow-y-auto p-1">
        {tags.map((tag) => {
          const on = post.tagIds.includes(tag.id);
          return (
            <Command.Item key={tag.id} value={`${tag.name} ${tag.id}`} onSelect={() => toggleTag(post, tag.id)} className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm">
              <span className="size-2 shrink-0 rounded-full" style={{ background: tagColor(tag.color) }} />
              <span className="flex-1 truncate">{tag.name}</span>
              {on && <Check size={14} strokeWidth={2.25} className="text-accent" />}
            </Command.Item>
          );
        })}
        {!name && tags.length === 0 && <p className="px-2 py-3 text-[13px] text-muted">Tags describe a post, like Reference or Recreate later.</p>}
      </Command.List>
      {name && !exists && (
        <div className="border-t border-line p-1">
          <Command.Item
            forceMount
            value={`create ${name}`}
            onSelect={async () => {
              await createTagOn(post, name, chosen);
              setSearch('');
              setColor(null);
            }}
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm"
          >
            <Plus size={14} className="text-muted" />
            <span className="truncate">
              Create <span className="font-medium">“{name}”</span>
            </span>
          </Command.Item>
          <div className="flex gap-2 px-2 pt-1 pb-2" role="radiogroup" aria-label="Tag color">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={chosen === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={clsx('size-4 rounded-full outline-none', chosen === c && 'ring-2 ring-ink ring-offset-2 ring-offset-surface')}
                style={{ background: tagColor(c) }}
              />
            ))}
          </div>
        </div>
      )}
    </Command>
  );
}
