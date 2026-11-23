export type MediaType = 'photo' | 'video' | 'gif';

export interface Media {
  type: MediaType;
  /** Image URL for photos, poster frame for video and gifs. */
  url: string;
  /** Best mp4 for video and gifs. */
  videoUrl?: string;
  width: number;
  height: number;
  durationMs?: number;
  alt?: string;
}

export interface Author {
  name: string;
  handle: string;
  avatar: string;
}

export interface LinkCard {
  url: string;
  title?: string;
  domain?: string;
  image?: string;
}

/** A post as parsed from X, before it is stored. */
export interface ParsedPost {
  id: string;
  url: string;
  author: Author;
  text: string;
  createdAt: number;
  media: Media[];
  link?: LinkCard;
  quote?: Omit<ParsedPost, 'quote'>;
}

export interface Post extends ParsedPost {
  source: 'x';
  /**
   * Sort position in the X bookmark list, newest first when sorted descending.
   * Numeric keys come from X. Keys starting with "L" were captured live and sort above them.
   */
  sortKey: string;
  /** When Checkpoint first saw this bookmark. */
  savedAt: number;
  folderIds: string[];
  note: string;
  /** Set when the post was removed from X bookmarks but kept because it lives in a folder. */
  unbookmarked?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface IncomingBookmark {
  post: ParsedPost;
  sortIndex?: string;
}
