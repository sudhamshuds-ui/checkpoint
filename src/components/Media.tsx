import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ImageOff } from 'lucide-react';
import { imageUrl } from '@/lib/format';
import type { Media } from '@/lib/types';

interface Props {
  media: Media;
  /** Cards play video only while hovered; the detail view shows controls. */
  mode: 'card' | 'detail';
  playing?: boolean;
  className?: string;
}

export function MediaView({ media, mode, playing = false, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const isVideo = media.type !== 'photo' && media.videoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== 'card') return;
    if (playing) video.play().catch(() => undefined);
    else video.pause();
  }, [playing, mode]);

  if (failed) {
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
        className={clsx('block h-full w-full', mode === 'card' ? 'object-cover' : 'object-contain', className)}
        src={media.videoUrl}
        poster={imageUrl(media.url, mode === 'card' ? 'small' : 'large')}
        muted={mode === 'card' || media.type === 'gif'}
        loop={mode === 'card' || media.type === 'gif'}
        autoPlay={mode === 'detail' && media.type === 'gif'}
        controls={mode === 'detail' && media.type === 'video'}
        playsInline
        preload={mode === 'card' ? 'none' : 'metadata'}
        onError={() => setFailed(true)}
        aria-label={media.alt}
      />
    );
  }

  return (
    <img
      className={clsx('block h-full w-full', mode === 'card' ? 'object-cover' : 'object-contain', className)}
      src={imageUrl(media.url, mode === 'card' ? 'small' : 'large')}
      alt={media.alt ?? ''}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
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
