import { imageUrl } from './format';
import type { Media } from './types';

/* Copies a post image (or a frame from a video) to the clipboard as a PNG, ready to paste into Figma.
   The clipboard holds one image at a time, so a carousel copies the image being shown. */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed to load'));
    img.src = src;
  });
}

function videoFrame(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.onloadedmetadata = () => {
      // A random moment, away from the very start and end where frames are often black.
      const d = Number.isFinite(video.duration) ? video.duration : 1;
      video.currentTime = d * (0.15 + Math.random() * 0.7);
    };
    video.onseeked = () => resolve(video);
    video.onerror = () => reject(new Error('video failed to load'));
    video.src = src;
  });
}

async function toPng(source: HTMLImageElement | HTMLVideoElement): Promise<Blob> {
  const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(source, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'));
}

async function render(media: Media): Promise<Blob> {
  if (media.type !== 'photo' && media.videoUrl) {
    try {
      return await toPng(await videoFrame(media.videoUrl));
    } catch {
      // Fall back to the poster frame when the video can't be read.
    }
  }
  return toPng(await loadImage(imageUrl(media.url, 'orig')));
}

/** Must be called directly from a click so the browser allows clipboard access. */
export async function copyMedia(media: Media): Promise<'image' | 'frame'> {
  if (!('ClipboardItem' in window) || !navigator.clipboard?.write) throw new Error('Copying images is not supported in this browser.');
  // Passing the Promise keeps the click's permission while the image loads.
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': render(media) })]);
  return media.type === 'photo' ? 'image' : 'frame';
}
