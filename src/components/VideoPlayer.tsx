import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { Media } from '@/lib/types';

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/**
 * The post window's video player, in X's style: a thin scrubbable line, then play and time on the
 * left and sound and fullscreen on the right, over a soft fade. Starts playing muted. The controls
 * hide while it plays and come back when the pointer moves.
 */
export function VideoPlayer({ media, poster, className, onError }: { media: Media; poster: string; className?: string; onError: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(media.durationMs ? media.durationMs / 1000 : 0);
  const [scrubbing, setScrubbing] = useState(false);
  const [awake, setAwake] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const idle = useRef<number>(undefined);

  // Starts as soon as the post opens, muted.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => undefined);
  }, []);

  // timeupdate only fires about 4 times a second; follow the frames while playing so the line moves smoothly.
  useEffect(() => {
    if (!playing || scrubbing) return;
    let frame = 0;
    const tick = () => {
      if (videoRef.current) setTime(videoRef.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, scrubbing]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.clearTimeout(idle.current);
    };
  }, []);

  function wake() {
    setAwake(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setAwake(false), 2000);
  }

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(() => undefined);
    else video.pause();
  }

  function seekTo(clientX: number) {
    const bar = barRef.current;
    const video = videoRef.current;
    if (!bar || !video || !length) return;
    const box = bar.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * length;
    video.currentTime = t;
    setTime(t);
  }

  const onScrubStart = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    seekTo(e.clientX);
  };

  const shown = !playing || awake || scrubbing;
  const progress = length ? Math.min(1, time / length) : 0;

  return (
    <div
      ref={rootRef}
      className={clsx('group/player relative h-full w-full bg-black', !shown && 'cursor-none', className)}
      onPointerMove={wake}
      onPointerLeave={() => setAwake(false)}
    >
      <video
        ref={videoRef}
        className="block h-full w-full object-contain"
        src={media.videoUrl}
        poster={poster}
        muted
        playsInline
        preload="auto"
        onClick={toggle}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => setPlaying(false)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
        onError={onError}
        aria-label={media.alt}
      />

      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-200',
          shown ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {/* Scrub line: a tall invisible hit area around a 2px line that thickens on hover. */}
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(length)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${clock(time)} of ${clock(length)}`}
          className="group/bar relative flex h-4 cursor-pointer items-center outline-none"
          onPointerDown={onScrubStart}
          onPointerMove={(e) => scrubbing && seekTo(e.clientX)}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          onKeyDown={(e) => {
            const video = videoRef.current;
            if (!video || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
            e.stopPropagation(); // arrows here seek, rather than change post
            video.currentTime = Math.min(length, Math.max(0, video.currentTime + (e.key === 'ArrowRight' ? 5 : -5)));
            setTime(video.currentTime);
          }}
        >
          <div className={clsx('relative w-full rounded-full bg-white/30 transition-[height] duration-150 ease-[var(--ease-out)] group-hover/bar:h-1 group-focus-visible/bar:h-1', scrubbing ? 'h-1' : 'h-0.5')}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1">
          <ControlButton label={playing ? 'Pause' : 'Play'} onClick={toggle}>
            {playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
          </ControlButton>
          <span className="tabular ml-1 text-xs font-medium">
            {clock(time)} / {clock(length)}
          </span>
          <span className="flex-1" />
          <ControlButton
            label={muted ? 'Unmute' : 'Mute'}
            onClick={() => {
              const video = videoRef.current;
              if (video) video.muted = !video.muted;
            }}
          >
            {muted ? <VolumeX size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
          </ControlButton>
          <ControlButton
            label={fullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void rootRef.current?.requestFullscreen();
            }}
          >
            {fullscreen ? <Minimize2 size={17} strokeWidth={2} /> : <Maximize2 size={17} strokeWidth={2} />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="press flex size-8 items-center justify-center rounded-full outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {children}
    </button>
  );
}
