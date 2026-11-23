import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { setNote } from '@/lib/actions';
import { shortDate } from '@/lib/format';
import type { Media, Post } from '@/lib/types';
import { Avatar, MediaView } from './Media';

/** Large media area with simple paging for multi-image posts. */
export function MediaStage({ post }: { post: Post }) {
  const media: Media[] = post.media.length ? post.media : post.quote?.media ?? [];
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [post.id]);

  if (!media.length) {
    if (post.link?.image) {
      return (
        <a href={post.link.url} target="_blank" rel="noreferrer" className="block w-full max-w-xl overflow-hidden rounded-xl bg-surface shadow-card">
          <img src={post.link.image} alt="" className="aspect-[1.91/1] w-full object-cover" />
          <div className="p-4">
            <p className="text-xs text-faint">{post.link.domain}</p>
            {post.link.title && <p className="mt-0.5 text-[15px] font-medium">{post.link.title}</p>}
          </div>
        </a>
      );
    }
    return <p className="max-w-xl text-[22px] leading-[1.4] tracking-[-0.01em] whitespace-pre-line">{post.text}</p>;
  }

  const current = media[Math.min(index, media.length - 1)];
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <MediaView key={current.url} media={current} mode="detail" className="max-h-full rounded-lg" />
      {media.length > 1 && (
        <>
          <StageButton side="left" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} />
          <StageButton side="right" disabled={index === media.length - 1} onClick={() => setIndex((i) => i + 1)} />
          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.url}
                type="button"
                aria-label={`Show item ${i + 1}`}
                onClick={() => setIndex(i)}
                className={clsx('size-1.5 rounded-full transition-colors', i === index ? 'bg-ink' : 'bg-faint/50')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StageButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={clsx(
        'press absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink shadow-pop disabled:opacity-0',
        side === 'left' ? 'left-0' : 'right-0',
      )}
    >
      <Icon size={18} />
    </button>
  );
}

export function PostText({ post }: { post: Post }) {
  return (
    <div>
      <a href={`https://x.com/${post.author.handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5">
        <Avatar src={post.author.avatar} size={32} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">{post.author.name}</span>
          <span className="block truncate text-[13px] text-faint">
            @{post.author.handle} · {shortDate(post.createdAt)}
          </span>
        </span>
      </a>
      {post.text && <p className="mt-4 text-[14.5px] leading-[1.55] whitespace-pre-line break-words">{post.text}</p>}
      {post.quote && (
        <a href={post.quote.url} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl border border-line p-3 hover:bg-sunken/50">
          <span className="flex items-center gap-1.5 text-[12.5px]">
            <Avatar src={post.quote.author.avatar} />
            <span className="font-medium">{post.quote.author.name}</span>
            <span className="text-faint">@{post.quote.author.handle}</span>
          </span>
          <p className="mt-1.5 line-clamp-6 text-[13.5px] leading-[1.5] whitespace-pre-line text-muted">{post.quote.text}</p>
        </a>
      )}
      {post.link && (post.media.length > 0 || !post.link.image) && (
        <a href={post.link.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 rounded-xl border border-line p-3 text-[13px] hover:bg-sunken/50">
          <Link2 size={14} className="shrink-0 text-faint" />
          <span className="truncate">{post.link.title ?? post.link.domain ?? post.link.url}</span>
        </a>
      )}
    </div>
  );
}

/** Note field that saves as you type. */
export function NoteField({ post, autoFocus, placeholder }: { post: Post; autoFocus?: boolean; placeholder?: string }) {
  const [value, setValue] = useState(post.note);
  const timer = useRef<number>(undefined);
  const latest = useRef({ id: post.id, value: post.note, dirty: false });

  // Flush the pending save when switching posts or closing.
  useEffect(() => {
    setValue(post.note);
    latest.current = { id: post.id, value: post.note, dirty: false };
    return () => {
      window.clearTimeout(timer.current);
      if (latest.current.dirty) setNote(latest.current.id, latest.current.value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  return (
    <textarea
      autoFocus={autoFocus}
      value={value}
      rows={3}
      placeholder={placeholder ?? 'Why did you save this?'}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        latest.current = { id: post.id, value: next, dirty: true };
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          setNote(post.id, next);
          latest.current.dirty = false;
        }, 400);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.currentTarget.blur();
        }
      }}
      className="field-sizing-content min-h-20 w-full resize-none rounded-xl bg-sunken px-3 py-2.5 text-[13.5px] leading-[1.5] outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
    />
  );
}
