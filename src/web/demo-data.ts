import type { Folder, Media, Post } from '@/lib/types';
import { ART, avatar, type ArtKind } from './demo-art';

/* Sample posts for the preview page. Authors and captions are made up. */

const PEOPLE = [
  ['Mira Okafor', 'miraokafor', '#d2553a'],
  ['Halden Studio', 'haldenstudio', '#2f4b3c'],
  ['Kai Lindqvist', 'kailindqvist', '#3e5c9a'],
  ['Juno Park', 'junopark', '#8a4fb0'],
  ['Field Notes Type', 'fieldnotestype', '#1d1c1a'],
  ['Ola Mensah', 'olamensah', '#c8892b'],
  ['Pattern Office', 'patternoffice', '#5b6b73'],
] as const;

const F = {
  motion: 'f-motion',
  recreate: 'f-recreate',
  branding: 'f-branding',
  visual: 'f-visual',
  build: 'f-build',
};

export const demoFolders: Folder[] = [
  { id: F.motion, name: 'Motion', order: 1, createdAt: 0 },
  { id: F.recreate, name: 'Interactions to recreate', order: 2, createdAt: 0 },
  { id: F.branding, name: 'Branding', order: 3, createdAt: 0 },
  { id: F.visual, name: 'Visual design', order: 4, createdAt: 0 },
  { id: F.build, name: 'Build ideas', order: 5, createdAt: 0 },
];

type Spec = {
  who: number;
  text: string;
  art?: [ArtKind, number, number, string, string, string, string];
  extra?: [ArtKind, string, string, string, string][];
  type?: 'video' | 'gif';
  seconds?: number;
  folders?: string[];
  note?: string;
  hoursAgo: number;
  link?: { title: string; domain: string; art: [ArtKind, string, string, string, string] };
};

const SPECS: Spec[] = [
  { who: 0, hoursAgo: 2, text: 'Spent the weekend rebuilding our onboarding. The trick was letting the illustration carry the motion so the UI could stay still.', art: ['mesh', 1200, 900, '#2b2a6b', '#ff7a59', '#4cc3ff', 'Onboarding v3'], type: 'video', seconds: 24 },
  { who: 1, hoursAgo: 5, text: 'New identity for a small coffee roaster in Gothenburg. Warm, a little odd, very tactile.', art: ['brand', 1080, 1350, '#ead9c4', '#3a2a20', '#b5532d', 'Rost & Co'], extra: [['palette', '#3a2a20', '#b5532d', '#d9a35b', 'Rost palette'], ['specimen', '#ead9c4', '#3a2a20', '#b5532d', 'Rost Grotesk']], folders: [F.branding], note: 'Love how the mark works at 16px. Steal the stamp idea for the Checkpoint logo.' },
  { who: 2, hoursAgo: 9, text: 'Hover states should whisper, not shout.', art: ['ui', 1000, 1000, '#dfe7ef', '#1f6feb', '#0f2b4c', 'Projects'], type: 'gif' },
  { who: 3, hoursAgo: 14, text: 'A thread on empty states that actually help people start.\n\n1/ Start with the job the screen is doing, not the illustration.' },
  { who: 4, hoursAgo: 20, text: 'Our new serif is out. Sharp at display sizes, calm in paragraphs.', art: ['specimen', 1200, 800, '#f4efe6', '#1d1c1a', '#a33b2c', 'Lowell Serif'], folders: [F.visual] },
  { who: 5, hoursAgo: 26, text: 'Easing study: same 300ms, five curves. Only one feels like it respects your time.', art: ['motion', 1600, 900, '#111214', '#7cf2c4', '#7cf2c4', 'cubic-bezier(0.23, 1, 0.32, 1)'], type: 'video', seconds: 12, folders: [F.motion, F.recreate], note: 'Use this curve for card enter. Exit should be faster, ~200ms.' },
  { who: 6, hoursAgo: 31, text: 'Grid systems are a love language.', art: ['swiss', 900, 1200, '#f2efe8', '#d4361f', '#1d1c1a', 'Neue Grafik'], folders: [F.visual] },
  { who: 0, hoursAgo: 40, text: 'Shipped dark mode. The hard part was shadows, not colors.', art: ['ui', 1080, 1350, '#1b1d22', '#8b7cf6', '#2a2550', 'Dark mode'] },
  { who: 1, hoursAgo: 46, text: 'Packaging system for a skincare line. Every SKU gets one color and one sentence.', art: ['palette', 1200, 900, '#e7c7c0', '#7d8f7a', '#2f3a33', 'Skincare system'], folders: [F.branding] },
  { who: 2, hoursAgo: 52, text: 'Built a tiny tool that turns your bookmarks into a moodboard. Might open source it.', link: { title: 'moodboard.dev: bookmarks to boards', domain: 'moodboard.dev', art: ['mesh', '#1a2a24', '#c9f05a', '#2bb3a3', 'moodboard.dev'] }, folders: [F.build], note: 'Basically what Checkpoint is. Check how they handle tags.' },
  { who: 3, hoursAgo: 60, text: 'Drag to reorder, but the item you drag tilts 2° and the others make room with a spring. Small thing, feels great.', art: ['ui', 1000, 1250, '#f3e9dc', '#e0582f', '#3b2f2a', 'Reorder'], type: 'gif', folders: [F.recreate, F.motion] },
  { who: 4, hoursAgo: 70, text: 'Specimen poster for the variable release.', art: ['swiss', 1080, 1350, '#14213d', '#fca311', '#e5e5e5', 'Variable 2.0'] },
  { who: 5, hoursAgo: 80, text: 'Clay renders for a fintech onboarding. Soft, friendly, not childish.', art: ['blob', 1200, 1200, '#efe6dc', '#ff8a5b', '#ffd166', 'render 04/12'], folders: [F.visual] },
  { who: 6, hoursAgo: 96, text: 'The best interfaces feel inevitable. Once you have used them you cannot imagine them any other way.' },
  { who: 0, hoursAgo: 110, text: 'Scroll-linked type reveal. Each line unmasks as it crosses the middle of the screen.', art: ['motion', 1200, 900, '#f5f2ec', '#1d1c1a', '#e0582f', 'scroll-timeline: view()'], type: 'video', seconds: 18, folders: [F.recreate] },
  { who: 1, hoursAgo: 130, text: 'Rebrand for a cycling club. The wordmark is drawn from the shape of their old jersey stripe.', art: ['brand', 1200, 900, '#0f3d2e', '#f2e8cf', '#e76f51', 'Velo Norte'], folders: [F.branding] },
  { who: 3, hoursAgo: 150, text: 'Idea: a "why did I save this" prompt every time you bookmark. Future you will thank you.', folders: [F.build] },
  { who: 2, hoursAgo: 170, text: 'Gradient study for a music app. Each playlist gets a mood.', art: ['mesh', 1080, 1350, '#0d0d1a', '#ff4f9a', '#6a5cff', 'Late Night'], extra: [['mesh', '#0b1f17', '#3ddc97', '#f9c80e', 'Morning Run'], ['mesh', '#1c1208', '#ff9f1c', '#e71d36', 'Focus']] },
  { who: 5, hoursAgo: 200, text: 'Command palette with inline previews. Arrow through results and the right pane updates instantly, no animation.', art: ['ui', 1600, 1000, '#e9eef2', '#111827', '#374151', 'Command K'], folders: [F.recreate, F.build] },
  { who: 4, hoursAgo: 230, text: 'Type in motion for a festival trailer. 6 weeks, 1 typeface, 400 keyframes.', art: ['specimen', 1600, 900, '#0e0e0e', '#f1f1f1', '#ff5a36', 'Festival Mono'], type: 'video', seconds: 41, folders: [F.motion] },
  { who: 6, hoursAgo: 260, text: 'Poster series for a lecture program. Same grid, different temperature every month.', art: ['swiss', 900, 1200, '#e8e1d5', '#2a6f97', '#f4a259', 'Lecture 07'] },
  { who: 0, hoursAgo: 300, text: 'A loading state that tells you what it is doing beats a spinner every time.', art: ['ui', 1000, 1000, '#ece7f6', '#6d4bd8', '#2d1f63', 'Importing…'] },
];

const sizeOf = (kind: ArtKind): [number, number] => (kind === 'specimen' ? [1200, 800] : kind === 'palette' ? [1200, 900] : [1080, 1350]);

export function demoPosts(now = Date.now()): Post[] {
  return SPECS.map((s, i) => {
    const [name, handle, color] = PEOPLE[s.who];
    const id = String(1860000000000000000n + BigInt(SPECS.length - i));
    const media: Media[] = [];
    if (s.art) {
      const [kind, w, h, a, b, c, label] = s.art;
      media.push({
        type: s.type ?? 'photo',
        url: ART[kind](w, h, a, b, c, label),
        width: w,
        height: h,
        durationMs: s.seconds ? s.seconds * 1000 : undefined,
      });
      for (const [k, ea, eb, ec, el] of s.extra ?? []) {
        const [ew, eh] = sizeOf(k);
        media.push({ type: 'photo', url: ART[k](ew, eh, ea, eb, ec, el), width: ew, height: eh });
      }
    }
    const post: Post = {
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
      note: s.note ?? '',
    };
    if (s.link) {
      const [kind, a, b, c, label] = s.link.art;
      post.link = { url: `https://${s.link.domain}`, title: s.link.title, domain: s.link.domain, image: ART[kind](1200, 628, a, b, c, label) };
    }
    return post;
  });
}
