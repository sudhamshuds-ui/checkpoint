import { useLayoutEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTags } from '@/lib/hooks';
import { createTagOn, toggleTag } from '@/lib/actions';
import { TAG_COLORS, type Post, type Tag, type TagColor } from '@/lib/types';

export const tagColor = (c: TagColor) => `var(--tag-${c})`;

/**
 * Every tag you've made, in one row: the post's tags first in colour, then the rest greyed out,
 * where a click adds one. Ends with a field for a new tag.
 */
export function PostTags({ post }: { post: Post }) {
  const tags = useTags();
  const ordered = [...tags.filter((t) => post.tagIds.includes(t.id)), ...tags.filter((t) => !post.tagIds.includes(t.id))];
  const rowRef = useSlideOnReorder(post.id, ordered.map((t) => t.id).join());
  return (
    <div ref={rowRef} className="flex flex-wrap gap-2">
      {ordered.map((tag) =>
        post.tagIds.includes(tag.id) ? (
          <TagChip key={tag.id} id={tag.id} tag={tag} onRemove={() => toggleTag(post, tag.id)} />
        ) : (
          <button
            key={tag.id}
            data-slide={tag.id}
            type="button"
            onClick={() => toggleTag(post, tag.id)}
            title={`Add ${tag.name}`}
            aria-pressed={false}
            className="press inline-flex h-6 items-center rounded-full bg-sunken px-2.5 text-xs font-medium text-faint outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            {tag.name}
          </button>
        ),
      )}
      <InlineAdd label="New tag" placeholder="Tag name" onAdd={(name) => addByName(post, tags, name)} />
    </div>
  );
}

/**
 * When a tag moves (added tags go first), every chip slides from where it was to where it is now,
 * so your eye can follow the one you clicked. Not when switching posts, and not with reduced motion.
 */
function useSlideOnReorder(postId: string, order: string) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<{ postId: string; boxes: Map<string, DOMRect> }>({ postId: '', boxes: new Map() });
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const chips = [...row.querySelectorAll<HTMLElement>('[data-slide]')];
    const boxes = new Map(chips.map((el) => [el.dataset.slide!, el.getBoundingClientRect()]));
    const before = last.current;
    last.current = { postId, boxes };
    if (before.postId !== postId || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const el of chips) {
      const from = before.boxes.get(el.dataset.slide!);
      const to = boxes.get(el.dataset.slide!);
      if (!from || !to) continue;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
    }
  }, [postId, order]);
  return ref;
}

/** A tag on a post. Clicking it takes it off again. */
export function TagChip({ tag, onRemove, id }: { tag: Tag; onRemove?: () => void; id?: string }) {
  return (
    <button
      data-slide={id}
      type="button"
      onClick={onRemove}
      title={`Remove ${tag.name}`}
      aria-pressed
      className="press inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ background: tagColor(tag.color) }}
    >
      {tag.name}
    </button>
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
 * A dashed "+ New" pill that turns into a text field in place. Enter adds and stays ready for another;
 * clicking anywhere else adds and closes; Escape closes without adding.
 */
export function InlineAdd({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const commit = () => {
    if (value.trim()) onAdd(value.trim());
    setValue('');
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="press inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-line pr-2.5 pl-2 text-xs text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plus size={12} strokeWidth={2.25} /> {label}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          e.stopPropagation(); // close the field, not the post
          setValue('');
          setEditing(false);
        }
      }}
      onBlur={() => {
        commit();
        setEditing(false);
      }}
      placeholder={placeholder}
      aria-label={placeholder}
      size={Math.max(value.length, 8)}
      className="h-6 rounded-full border border-accent bg-sunken px-2.5 text-xs text-ink outline-none placeholder:text-faint"
    />
  );
}
