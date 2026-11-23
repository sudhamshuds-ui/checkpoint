import type { Media, Post } from '@/lib/types';

export type Visual =
  | { kind: 'media'; media: Media; count: number; fromQuote: boolean }
  | { kind: 'link'; image: string; width: number; height: number };

/** What a card shows as its picture: the post's media, a quoted post's media, or a link preview image. */
export function visualFor(post: Post): Visual | null {
  if (post.media.length) return { kind: 'media', media: post.media[0], count: post.media.length, fromQuote: false };
  if (post.quote?.media.length)
    return { kind: 'media', media: post.quote.media[0], count: post.quote.media.length, fromQuote: true };
  if (post.link?.image) return { kind: 'link', image: post.link.image, width: 1200, height: 628 };
  return null;
}

/** Height over width, clamped so panoramas and very tall screenshots stay readable in a column. */
export function aspect(visual: Visual) {
  const [w, h] = visual.kind === 'media' ? [visual.media.width, visual.media.height] : [visual.width, visual.height];
  return Math.min(Math.max(h / Math.max(w, 1), 0.5), 1.5);
}
