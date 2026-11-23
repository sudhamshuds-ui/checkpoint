import { create } from 'zustand';

/** inbox = X bookmarks (unsorted). feed = My feed (everything sorted). */
export type View = { kind: 'inbox' } | { kind: 'feed' } | { kind: 'folder'; folderId: string };

interface UIState {
  view: View;
  query: string;
  /** Post open in the detail dialog. */
  openPostId: string | null;
  /** Which image of a carousel the post opened on. */
  openMediaIndex: number;
  /** Ids of the posts currently on screen, in order, for next/previous in the dialog. */
  visibleIds: string[];
  setView: (view: View) => void;
  setQuery: (query: string) => void;
  openPost: (id: string | null, mediaIndex?: number) => void;
  setVisibleIds: (ids: string[]) => void;
}

const savedView = (): View => {
  try {
    const raw = localStorage.getItem('checkpoint:view');
    const view = raw ? (JSON.parse(raw) as View) : null;
    if (view && ['inbox', 'feed', 'folder'].includes(view.kind)) return view;
  } catch {}
  return { kind: 'inbox' };
};

export const useUI = create<UIState>((set) => ({
  view: savedView(),
  query: '',
  openPostId: null,
  openMediaIndex: 0,
  visibleIds: [],
  setView: (view) => {
    try {
      localStorage.setItem('checkpoint:view', JSON.stringify(view));
    } catch {}
    set({ view, query: '' });
  },
  setQuery: (query) => set({ query }),
  openPost: (openPostId, openMediaIndex = 0) => set({ openPostId, openMediaIndex }),
  setVisibleIds: (visibleIds) => set({ visibleIds }),
}));
