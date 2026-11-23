import { bookmarkedTweetId, collectTweets, graphqlOperation, parseBookmarkTimeline } from '@/lib/parse-x';
import { PAGE_TAG, type PageMessage } from '@/lib/messages';
import type { ParsedPost } from '@/lib/types';

/* Runs in X's own page context so it can see the GraphQL responses X fetches for itself.
   It only reads responses; it never sends requests of its own. */
export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    // Posts the user has scrolled past, so a bookmark tapped anywhere can be saved with its content.
    const recent = new Map<string, ParsedPost>();
    const remember = (posts: ParsedPost[]) => {
      for (const p of posts) {
        recent.delete(p.id);
        recent.set(p.id, p);
      }
      while (recent.size > 3000) recent.delete(recent.keys().next().value!);
    };

    const post = (message: PageMessage extends infer M ? (M extends PageMessage ? Omit<M, 'tag'> : never) : never) =>
      window.postMessage({ tag: PAGE_TAG, ...message }, window.location.origin);

    function onRequest(operation: string, body: unknown) {
      const id = bookmarkedTweetId(body);
      if (!id) return;
      if (operation === 'CreateBookmark') {
        // The timeline holding this post may still be parsing, so give it a moment before giving up.
        let tries = 0;
        const attempt = () => {
          const cached = recent.get(id);
          if (cached || tries++ >= 10) post({ type: 'bookmarked', id, items: cached ? [{ post: cached }] : [] });
          else setTimeout(attempt, 150);
        };
        attempt();
      } else if (operation === 'DeleteBookmark') {
        post({ type: 'unbookmarked', id });
      }
    }

    function onResponse(operation: string, json: unknown) {
      if (operation === 'Bookmarks') {
        const { items, bottomCursor } = parseBookmarkTimeline(json);
        remember(items.map((i) => i.post));
        post({ type: 'bookmarks', items, hasMore: Boolean(bottomCursor) && items.length > 0 });
      } else {
        remember(collectTweets(json));
      }
    }

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const operation = graphqlOperation(url);
      if (operation) {
        try {
          onRequest(operation, init?.body);
        } catch {}
      }
      const response = await originalFetch.call(this, input, init);
      if (operation) {
        response
          .clone()
          .json()
          .then((json) => onResponse(operation, json))
          .catch(() => {});
      }
      return response;
    };

    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __cpOp?: string | null }, method: string, url: string | URL, ...rest: any[]) {
      this.__cpOp = graphqlOperation(String(url));
      return (open as any).call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __cpOp?: string | null }, body?: any) {
      const operation = this.__cpOp;
      if (operation) {
        try {
          onRequest(operation, body);
        } catch {}
        this.addEventListener('load', () => {
          try {
            const json = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
            onResponse(operation, json);
          } catch {}
        });
      }
      return send.call(this, body);
    };
  },
});
