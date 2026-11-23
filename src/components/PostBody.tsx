import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ChevronLeft, ChevronRight, Copy, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { copyMedia } from '@/lib/clipboard';
import { setNote } from '@/lib/actions';
import { imageUrl, shortDate } from '@/lib/format';
import type { Media, Post } from '@/lib/types';
import { Avatar, MediaView } from './Media';

/** The post's media in the modal: square corners, Copy image, and arrows on the image for carousels. */
export function MediaStage({ post, startIndex = 0 }: { post: Post; startIndex?: number }) {
  const media: Media[] = post.media.length ? post.media : post.quote?.media ?? [];
  const [index, setIndex] = useState(startIndex);
  useEffect(() => setIndex(startIndex), [post.id, startIndex]);
  // Fetch the neighbouring images ahead of time so stepping through a carousel doesn't wait.
  useEffect(() => {
    for (const m of [media[index - 1], media[index + 1]]) if (m) new Image().src = imageUrl(m.url, 'large');
  }, [media, index]);

  if (!media.length) {
    if (post.link?.image) {
      return (
        <a href={post.link.url} target="_blank" rel="noreferrer" className="block w-full max-w-xl overflow-hidden border border-line bg-surface">
          <img src={post.link.image} alt="" className="aspect-[1.91/1] w-full object-cover" />
          <div className="p-4">
            <p className="text-xs text-faint">{post.link.domain}</p>
            {post.link.title && <p className="mt-1 text-[15px] font-medium">{post.link.title}</p>}
          </div>
        </a>
      );
    }
    return <p className="max-w-xl text-[22px] leading-[1.4] tracking-[-0.01em] whitespace-pre-line">{post.text}</p>;
  }

  const current = media[Math.min(index, media.length - 1)];
  // Size the frame from X's dimensions before the file arrives, so the Copy button sits in the
  // image's corner (not the middle) and a dark placeholder holds the space while it loads.
  const ratio = current.width > 0 && current.height > 0 ? current.width / current.height : null;
  const frame = ratio ? { aspectRatio: ratio, width: `min(100%, calc(min(560px, 100dvh - 224px) * ${ratio}))` } : undefined;

  async function copy() {
    try {
      const what = await copyMedia(current);
      toast(what === 'frame' ? 'Video frame copied' : 'Image copied', { description: 'Paste it into Figma or anywhere else.' });
    } catch (e) {
      toast.error("Couldn't copy this one", { description: e instanceof Error && e.message.includes('supported') ? e.message : 'X blocked the download. Open it on X and copy from there.' });
    }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className={clsx('relative', ratio && 'bg-sunken')} style={frame}>
        <MediaView
          key={current.url}
          media={current}
          mode="detail"
          fallbackHref={post.url}
          className={ratio ? undefined : 'max-h-[min(560px,calc(100dvh-224px))] !w-auto max-w-full'}
        />
        <button
          type="button"
          onClick={copy}
          aria-label="Copy image"
          title="Copy image"
          className="press absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/75"
        >
          <Copy size={14} strokeWidth={2} />
        </button>
        {/* Image arrows sit on the image, like on the tiles; the big arrows outside the window change post. */}
        {index > 0 && <StageButton side="left" onClick={() => setIndex((i) => i - 1)} />}
        {index < media.length - 1 && <StageButton side="right" onClick={() => setIndex((i) => i + 1)} />}
      </div>
      {media.length > 1 && (
        <>
          <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.url}
                type="button"
                aria-label={`Show image ${i + 1} of ${media.length}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={clsx('size-1.5 rounded-full transition-colors', i === index ? 'bg-ink' : 'bg-faint')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StageButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={clsx(
        'press absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/75',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon size={16} />
    </button>
  );
}

export function PostText({ post, showText = true }: { post: Post; showText?: boolean }) {
  return (
    <div>
      <a href={post.url} target="_blank" rel="noreferrer" className="group/author flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent" title="Open this post on X">
        <Avatar src={post.author.avatar} size={32} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">{post.author.name}</span>
          <span className="flex items-center gap-1 truncate text-[13px] text-faint group-hover/author:text-muted">
            @{post.author.handle} · {shortDate(post.createdAt)} <ArrowUpRight size={12} />
          </span>
        </span>
      </a>
      {showText && post.text && <p className="mt-4 text-[14.5px] leading-[1.55] whitespace-pre-line break-words">{post.text}</p>}
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
      className="field-sizing-content min-h-20 w-full resize-none rounded-xl bg-sunken px-3 py-2.5 text-[13.5px] leading-[1.5] outline-none placeholder:text-faint focus:ring-1 focus:ring-accent"
    />
  );
}
