import type { IncomingBookmark } from './types';

/** Page world -> content script, over window.postMessage. */
export const PAGE_TAG = '__checkpoint_page__';
export type PageMessage =
  | { tag: typeof PAGE_TAG; type: 'bookmarks'; items: IncomingBookmark[]; hasMore: boolean }
  | { tag: typeof PAGE_TAG; type: 'bookmarked'; items: IncomingBookmark[]; id: string }
  | { tag: typeof PAGE_TAG; type: 'unbookmarked'; id: string };

/** Content script and dashboard -> background, over runtime messaging. */
export type RuntimeMessage =
  | { type: 'bookmarks'; items: IncomingBookmark[]; live?: boolean }
  | { type: 'unbookmarked'; id: string }
  | { type: 'sync:start'; mode?: SyncMode }
  | { type: 'sync:hello' }
  | { type: 'sync:progress'; found: number; added: number }
  | { type: 'sync:done'; found: number; added: number; stopped?: boolean };

export const SYNC_PARAM = 'checkpoint-sync';
export type SyncMode = 'full' | 'quick';

export interface SyncState {
  status: 'idle' | 'running';
  found: number;
  added: number;
  lastSyncAt?: number;
  lastAdded?: number;
}

/** Website -> extension, over chrome.runtime.sendMessage(extensionId, ...). */
export type ExternalMessage =
  | { type: 'status' }
  | { type: 'connect'; email: string; password: string }
  | { type: 'disconnect' }
  | { type: 'sync:start' };

export interface ExtensionStatus {
  installed: boolean;
  signedIn: boolean;
  email?: string;
}
