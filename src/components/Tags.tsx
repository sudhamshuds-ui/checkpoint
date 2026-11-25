import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTags } from '@/lib/hooks';
import { createTagOn, toggleTag } from '@/lib/actions';
import { TAG_COLORS, type Post, type Tag, type TagColor } from '@/lib/types';

export const tagColor = (c: TagColor) => `var(--tag-${c})`;

/**
 * Every tag you've made, in one row. Tags on this post show in colour; the rest are greyed out and
 * a click adds them. They keep their places, so nothing jumps around as you tag. Ends with a field
 * for a new tag.
 */
export function PostTags({ post, onSearch }: { post: Post; onSearch: (name: string) => void }) {
  const tags = useTags();
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) =>
        post.tagIds.includes(tag.id) ? (
          <TagChip key={tag.id} tag={tag} onSearch={() => onSearch(tag.name)} onRemove={() => toggleTag(post, tag.id)} />
        ) : (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(post, tag.id)}
            title={`Add ${tag.name}`}
            className="press inline-flex h-6 items-center rounded-full bg-sunken px-2.5 text-xs font-medium text-faint outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            {tag.name}
          </button>
        ),
      )}
      <NewTag post={post} tags={tags} />
    </div>
  );
}

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

/** A random colour, avoiding the newest tag's so two new tags in a row look different. */
function randomTagColor(tags: Tag[]): TagColor {
  const last = tags[tags.length - 1]?.color;
  const pool = TAG_COLORS.filter((c) => c !== last);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Adds the typed tag: an existing one with that name, otherwise a new one in a random colour. */
function addByName(post: Post, tags: Tag[], typed: string) {
  const name = typed.trim();
  if (!name) return;
  const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (!existing) void createTagOn(post, name, randomTagColor(tags));
  else if (!post.tagIds.includes(existing.id)) void toggleTag(post, existing.id);
}

/**
 * "Add tag" turns into a text field in place. Enter adds the tag and stays ready for another;
 * clicking anywhere else adds it and closes; Escape closes without adding.
 */
function NewTag({ post, tags }: { post: Post; tags: Tag[] }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="press inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-line pr-2.5 pl-2 text-xs text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plus size={12} strokeWidth={2.25} /> {tags.length ? 'New tag' : 'Add tag'}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          addByName(post, tags, value);
          setValue('');
        }
        if (e.key === 'Escape') {
          e.stopPropagation(); // close the field, not the post
          setValue('');
          setEditing(false);
        }
      }}
      onBlur={() => {
        addByName(post, tags, value);
        setValue('');
        setEditing(false);
      }}
      placeholder="Tag name"
      aria-label="New tag name"
      size={Math.max(value.length, 8)}
      className="h-6 rounded-full border border-accent bg-sunken px-2.5 text-xs text-ink outline-none placeholder:text-faint"
    />
  );
}
