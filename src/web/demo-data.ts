import type { Folder, Media, Post, Tag } from '@/lib/types';
import { avatar } from './demo-art';
import calendar from './demo-images/01-calendar.webp';
import sketchbook from './demo-images/02-sketchbook.webp';
import voiceAi from './demo-images/03-voice-ai.webp';
import stamps from './demo-images/04-stamps.webp';
import alwaysByYourSide from './demo-images/05-always-by-your-side.webp';
import redacted from './demo-images/06-redacted.webp';
import utility from './demo-images/07-utility.webp';
import halftone from './demo-images/08-halftone.webp';
import stone from './demo-images/09-stone.webp';
import faceId from './demo-images/10-face-id.webp';

/* Sample posts for the preview, using the owner's mock images from Figma. Authors and captions are made up. */

const IMG = {
  calendar: [calendar, 672, 1194],
  sketchbook: [sketchbook, 1194, 1194],
  voiceAi: [voiceAi, 1194, 686],
  stamps: [stamps, 1080, 1350],
  always: [alwaysByYourSide, 1447, 2048],
  redacted: [redacted, 672, 1194],
  utility: [utility, 955, 1194],
  halftone: [halftone, 1194, 790],
  stone: [stone, 1194, 1194],
  faceId: [faceId, 1350, 1350],
} as const;
type ImageKey = keyof typeof IMG;

const PEOPLE = {
  kai: ['Kai Lindqvist', 'kailindqvist', '#3e5c9a'],
  mira: ['Mira Okafor', 'miraokafor', '#d2553a'],
  juno: ['Juno Park', 'junopark', '#8a4fb0'],
  fieldnotes: ['Field Notes Type', 'fieldnotestype', '#1d1c1a'],
  ola: ['Ola Mensah', 'olamensah', '#c8892b'],
  halden: ['Halden Studio', 'haldenstudio', '#2f4b3c'],
  pattern: ['Pattern Office', 'patternoffice', '#5b6b73'],
  leo: ['Leo Brandt', 'leobrandt', '#7a4b3a'],
} as const;

const F = { motion: 'f-motion', recreate: 'f-recreate', branding: 'f-branding', visual: 'f-visual', build: 'f-build' };

export const demoFolders: Folder[] = [
  { id: F.motion, name: 'Motion', order: 1, createdAt: 0 },
  { id: F.recreate, name: 'Interactions to recreate', order: 2, createdAt: 0 },
  { id: F.branding, name: 'Branding', order: 3, createdAt: 0 },
  { id: F.visual, name: 'Visual design', order: 4, createdAt: 0 },
  { id: F.build, name: 'Build ideas', order: 5, createdAt: 0 },
];

export const demoTags: Tag[] = [
  { id: 't-reference', name: 'Reference', color: 'teal', order: 1 },
  { id: 't-recreate', name: 'Recreate later', color: 'amber', order: 2 },
  { id: 't-type', name: 'Typography', color: 'purple', order: 3 },
  { id: 't-color', name: 'Color', color: 'rose', order: 4 },
  { id: 't-forage', name: 'Forage', color: 'magenta', order: 5 },
];

type Spec = {
  who: keyof typeof PEOPLE;
  hoursAgo: number;
  text: string;
  images?: ImageKey[];
  type?: 'video' | 'gif';
  seconds?: number;
  folders?: string[];
  tags?: string[];
  note?: string;
};

const SPECS: Spec[] = [
  { who: 'kai', hoursAgo: 2, images: ['voiceAi'], type: 'video', seconds: 18, text: 'Landing page for a voice AI product. Each card plays a sample when you hover it.' },
  { who: 'mira', hoursAgo: 5, images: ['always'], type: 'video', seconds: 42, folders: [F.motion], tags: ['t-recreate'], note: 'Recreate the schedule fade. Probably scroll-linked.', text: 'Brand film for a companion app. The schedule fades out as the scene paints in.' },
  { who: 'juno', hoursAgo: 9, text: 'A thread on empty states that actually help people start.\n\n1/ Start with the job the screen is doing, not the illustration.' },
  { who: 'juno', hoursAgo: 14, images: ['sketchbook', 'stone', 'halftone', 'calendar'], text: 'Gouache sketchbook from the trip. Painting fruit every morning before work.' },
  { who: 'fieldnotes', hoursAgo: 20, images: ['stamps', 'calendar'], folders: [F.branding], tags: ['t-reference', 't-forage'], note: 'Love the perforated edge as a frame. Try it on Checkpoint cards?', text: 'Stamp series for a national parks campaign. Every value is a different season.' },
  { who: 'ola', hoursAgo: 26, images: ['halftone'], folders: [F.visual], tags: ['t-color'], text: 'Halftone gradient study. Every dot is a vector, exported straight from a shader.' },
  { who: 'kai', hoursAgo: 31, images: ['faceId'], type: 'video', seconds: 8, folders: [F.recreate, F.build], tags: ['t-recreate'], note: 'Explain before asking. Use this pattern for the extension connect step.', text: 'A Face ID prompt that explains itself before asking. Small copy, big trust.' },
  { who: 'halden', hoursAgo: 46, images: ['calendar'], text: 'Risograph calendar for September. Two inks and one misregistration I decided to keep.' },
  { who: 'pattern', hoursAgo: 52, text: 'Hover states should whisper, not shout.' },
  { who: 'ola', hoursAgo: 70, images: ['stone'], type: 'gif', text: 'Daily painting #212. Light through leaves is all I want to paint now.' },
  { who: 'pattern', hoursAgo: 96, images: ['redacted'], text: 'Redaction as a design language: declassified PDFs turned into a type specimen.' },
  { who: 'leo', hoursAgo: 120, images: ['utility'], type: 'video', seconds: 12, folders: [F.motion, F.branding], tags: ['t-type'], text: 'Chrome type for a streetwear drop. Built in Blender, set in a custom grotesk.' },
  { who: 'mira', hoursAgo: 150, folders: [F.build], text: 'Idea: a “why did I save this” prompt every time you bookmark. Future you will thank you.' },
];

export function demoPosts(now = Date.now()): Post[] {
  return SPECS.map((s, i) => {
    const [name, handle, color] = PEOPLE[s.who];
    const id = String(1860000000000000000n + BigInt(SPECS.length - i));
    const media: Media[] = (s.images ?? []).map((key, n) => {
      const [url, width, height] = IMG[key];
      // Only the first item carries the video or GIF type; the rest of a carousel are photos.
      // Sample videos have no file: the preview shows their still frame and time badge.
      return n === 0 && s.type
        ? { type: s.type, url, width, height, durationMs: s.seconds ? s.seconds * 1000 : undefined }
        : { type: 'photo', url, width, height };
    });
    return {
      id,
      source: 'x',
      url: `https://x.com/${handle}`,
      author: { name, handle, avatar: avatar(color, name[0]) },
      text: s.text,
      createdAt: now - s.hoursAgo * 3_600_000,
      media,
      sortKey: id.padStart(24, '0'),
      savedAt: now - s.hoursAgo * 3_000_000,
      folderIds: s.folders ?? [],
      tagIds: s.tags ?? [],
      note: s.note ?? '',
    };
  });
}
