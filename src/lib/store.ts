import { create } from 'zustand';

export type View = { kind: 'inbox' } | { kind: 'all' } | { kind: 'folder'; folderId: string };

interface UIState {
  view: View;
  query: string;
  /** Post open in the detail dialog. */
  openPostId: string | null;
  /** Ids of the posts currently on screen, in order, for next/previous in the dialog. */
  visibleIds: string[];
  triageOpen: boolean;
  setView: (view: View) => void;
  setQuery: (query: string) => void;
  openPost: (id: string | null) => void;
  setVisibleIds: (ids: string[]) => void;
  setTriageOpen: (open: boolean) => void;
}

const savedView = (): View => {
  try {
    const raw = localStorage.getItem('checkpoint:view');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { kind: 'inbox' };
};

export const useUI = create<UIState>((set) => ({
  view: savedView(),
  query: '',
  openPostId: null,
  visibleIds: [],
  triageOpen: false,
  setView: (view) => {
    try {
      localStorage.setItem('checkpoint:view', JSON.stringify(view));
    } catch {}
    set({ view, query: '' });
  },
  setQuery: (query) => set({ query }),
  openPost: (openPostId) => set({ openPostId }),
  setVisibleIds: (visibleIds) => set({ visibleIds }),
  setTriageOpen: (triageOpen) => set({ triageOpen }),
}));
