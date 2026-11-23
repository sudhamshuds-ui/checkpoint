import type { IncomingBookmark, LinkCard, Media, ParsedPost } from './types';

/* X's internal GraphQL responses are untyped and change shape over time,
   so everything here reads defensively and returns null rather than throwing. */
type Json = any;

export function graphqlOperation(url: string): string | null {
  const match = /\/graphql\/[^/]+\/([A-Za-z]+)/.exec(url);
  return match ? match[1] : null;
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);

function unwrap(result: Json): Json {
  if (!result) return null;
  if (result.__typename === 'TweetWithVisibilityResults') return result.tweet;
  if (result.__typename === 'TweetTombstone' || result.__typename === 'TweetUnavailable') return null;
  return result;
}

function bestMp4(variants: Json[] | undefined): string | undefined {
  const mp4 = (variants ?? []).filter((v) => v?.content_type === 'video/mp4' && v.url);
  mp4.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return mp4[0]?.url;
}

function parseMedia(items: Json[] | undefined): Media[] {
  const out: Media[] = [];
  for (const m of items ?? []) {
    if (!m?.media_url_https) continue;
    const width = m.original_info?.width ?? m.sizes?.large?.w ?? 1;
    const height = m.original_info?.height ?? m.sizes?.large?.h ?? 1;
    const alt: string | undefined = m.ext_alt_text || undefined;
    if (m.type === 'photo') {
      out.push({ type: 'photo', url: m.media_url_https, width, height, alt });
    } else if (m.type === 'video' || m.type === 'animated_gif') {
      out.push({
        type: m.type === 'video' ? 'video' : 'gif',
        url: m.media_url_https,
        videoUrl: bestMp4(m.video_info?.variants),
        width,
        height,
        durationMs: m.video_info?.duration_millis,
        alt,
      });
    }
  }
  return out;
}

function parseCard(card: Json): LinkCard | undefined {
  const legacy = card?.legacy;
  if (!legacy?.binding_values) return undefined;
  const values: Record<string, Json> = {};
  for (const b of legacy.binding_values) if (b?.key) values[b.key] = b.value;
  const str = (k: string) => values[k]?.string_value as string | undefined;
  const img = (k: string) => values[k]?.image_value?.url as string | undefined;
  const url = str('card_url') ?? legacy.url;
  if (!url) return undefined;
  return {
    url,
    title: str('title'),
    domain: str('vanity_url') ?? str('domain'),
    image: img('photo_image_full_size_large') ?? img('thumbnail_image_large') ?? img('summary_photo_image_large'),
  };
}

function cleanText(result: Json, media: Json[]): string {
  const legacy = result.legacy;
  const note = result.note_tweet?.note_tweet_results?.result;
  let text: string;
  let urls: Json[];
  if (note?.text) {
    text = note.text;
    urls = note.entity_set?.urls ?? [];
  } else {
    text = legacy.full_text ?? '';
    urls = legacy.entities?.urls ?? [];
    // display_text_range hides leading @replies and trailing media links. It counts code points.
    const range = legacy.display_text_range;
    if (Array.isArray(range) && range.length === 2) {
      text = Array.from(text).slice(range[0], range[1]).join('');
    }
  }
  for (const u of urls) {
    if (u?.url && u.expanded_url) text = text.split(u.url).join(u.expanded_url);
  }
  for (const m of media) {
    if (m?.url) text = text.split(m.url).join('');
  }
  return decode(text).trim();
}

export function parseTweet(raw: Json, depth = 0): ParsedPost | null {
  const result = unwrap(raw);
  const legacy = result?.legacy;
  if (!result?.rest_id || !legacy) return null;

  const user = result.core?.user_results?.result;
  const handle: string = user?.core?.screen_name ?? user?.legacy?.screen_name ?? 'i';
  const rawMedia: Json[] = legacy.extended_entities?.media ?? legacy.entities?.media ?? [];

  const post: ParsedPost = {
    id: String(result.rest_id),
    url: `https://x.com/${handle}/status/${result.rest_id}`,
    author: {
      name: user?.core?.name ?? user?.legacy?.name ?? handle,
      handle,
      avatar: user?.avatar?.image_url ?? user?.legacy?.profile_image_url_https ?? '',
    },
    text: cleanText(result, rawMedia),
    createdAt: Date.parse(legacy.created_at) || 0,
    media: parseMedia(rawMedia),
  };

  const link = parseCard(result.card);
  if (link) post.link = link;

  if (depth === 0) {
    const quote = parseTweet(result.quoted_status_result?.result, 1);
    if (quote) post.quote = quote;
  }
  return post;
}

function* walk(node: Json): Generator<Json> {
  if (!node || typeof node !== 'object') return;
  yield node;
  for (const value of Array.isArray(node) ? node : Object.values(node)) {
    if (value && typeof value === 'object') yield* walk(value);
  }
}

/** Every tweet anywhere in a response. Used to remember posts the user has scrolled past. */
export function collectTweets(json: Json): ParsedPost[] {
  const seen = new Map<string, ParsedPost>();
  for (const node of walk(json)) {
    const result = node?.tweet_results?.result;
    if (!result) continue;
    const post = parseTweet(result);
    if (post && !seen.has(post.id)) seen.set(post.id, post);
  }
  return [...seen.values()];
}

/** The bookmarks in a Bookmarks timeline response, in the order X returns them. */
export function parseBookmarkTimeline(json: Json): { items: IncomingBookmark[]; bottomCursor?: string } {
  const items: IncomingBookmark[] = [];
  let bottomCursor: string | undefined;
  for (const node of walk(json)) {
    if (!Array.isArray(node?.instructions)) continue;
    for (const instruction of node.instructions) {
      const entries: Json[] = instruction?.entries ?? (instruction?.entry ? [instruction.entry] : []);
      for (const entry of entries) {
        const content = entry?.content;
        if (content?.cursorType === 'Bottom') bottomCursor = content.value;
        const post = parseTweet(content?.itemContent?.tweet_results?.result);
        if (post) items.push({ post, sortIndex: entry.sortIndex ? String(entry.sortIndex) : undefined });
      }
    }
  }
  return { items, bottomCursor };
}

export function bookmarkedTweetId(body: unknown): string | null {
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    const id = (parsed as Json)?.variables?.tweet_id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}
