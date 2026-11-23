import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ImageOff, Play } from 'lucide-react';
import { imageUrl } from '@/lib/format';
import type { Media } from '@/lib/types';

interface Props {
  media: Media;
  /** Cards play video only while hovered; the detail view shows controls. */
  mode: 'card' | 'detail';
  playing?: boolean;
  className?: string;
  /** Where to watch it if the video can't play here (the post on X). */
  fallbackHref?: string;
}

export function MediaView({ media, mode, playing = false, className, fallbackHref }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const isVideo = media.type !== 'photo' && media.videoUrl && !videoFailed;
  const fit = mode === 'card' ? 'object-cover' : 'object-contain';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== 'card') return;
    if (playing) video.play().catch(() => undefined);
    else video.pause();
  }, [playing, mode]);

  if (imageFailed) {
    return (
      <div className={clsx('flex h-full w-full flex-col items-center justify-center gap-2 text-faint', className)}>
        <ImageOff size={18} strokeWidth={1.75} />
        <span className="text-xs">Media unavailable</span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        className={clsx('block h-full w-full', fit, className)}
        src={media.videoUrl}
        poster={imageUrl(media.url, mode === 'card' ? 'small' : 'large')}
        muted={mode === 'card' || media.type === 'gif'}
        loop={mode === 'card' || media.type === 'gif'}
        autoPlay={mode === 'detail' && media.type === 'gif'}
        controls={mode === 'detail' && media.type === 'video'}
        playsInline
        preload={mode === 'card' ? 'none' : 'metadata'}
        // If X won't serve the video here, fall back to its still frame instead of an error.
        onError={() => setVideoFailed(true)}
        aria-label={media.alt}
      />
    );
  }

  const image = (
    <img
      className={clsx('block h-full w-full', fit, className)}
      src={imageUrl(media.url, mode === 'card' ? 'small' : 'large')}
      alt={media.alt ?? ''}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setImageFailed(true)}
    />
  );

  if (videoFailed && mode === 'detail' && fallbackHref) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        {image}
        <a
          href={fallbackHref}
          target="_blank"
          rel="noreferrer"
          className="press absolute flex h-10 items-center gap-2 rounded-full bg-black/70 px-4 text-sm font-medium text-white backdrop-blur-md hover:bg-black/80"
        >
          <Play size={15} fill="currentColor" /> Play on X
        </a>
      </div>
    );
  }
  return image;
}

export function Avatar({ src, size = 16 }: { src: string; size?: number }) {
  const [failed, setFailed] = useState(!src);
  return failed ? (
    <span className="inline-block shrink-0 rounded-full bg-sunken" style={{ width: size, height: size }} />
  ) : (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-sunken"
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
