# Checkpoint

Personal inspiration hub for X bookmarks. Two parts share one codebase:

- **Website** (`src/web`, built with Vite, deployed on Vercel from `main`): the dashboard. Sign in, browse, sort into folders, notes, triage. Works on any computer, no install.
- **Chrome extension** (`src/entrypoints`, built with WXT, MV3): captures bookmarks from x.com and saves them to Supabase. Its toolbar button opens the website.
- **Supabase** holds all data (`supabase/schema.sql`). Row level security limits every row to its owner.

## Layout

- `src/components/` the dashboard UI, used by the website. Round 2 design: dark only, image-only tiles with square corners (PostCard), the post modal (PostDialog), tags (Tags), sidebar with sortable folders.
- Views: `inbox` is shown as **X bookmarks** (unsorted), `feed` as **My feed** (every post with a folder), `folder` is one folder. Tile hover action: Sort in X bookmarks, the post's folder in My feed, none on folder pages.
- Tags (colored, many per post) are separate from folders. `posts.tag_ids` + `tags` table.
- `src/lib/data.ts` the website's data store: loads from Supabase, applies changes optimistically, listens to realtime so other devices and the extension update the screen live.
- `src/lib/posts.ts` row mapping and the Supabase calls shared by website and extension.
- `src/lib/extension.ts` website -> extension messaging (`chrome.runtime.sendMessage(EXTENSION_ID, ...)`, allowed by `externally_connectable`).
- `src/entrypoints/x-page.content.ts` runs in X's page world. Wraps `fetch`/XHR and reads GraphQL responses (`Bookmarks`, timelines) and `CreateBookmark` / `DeleteBookmark` requests. Read-only; never calls X itself.
- `src/entrypoints/x.content.ts` bridges page messages to the background and runs the auto-scroll during a sync.
- `src/entrypoints/background.ts` keeps its own Supabase login (signed in from the website), saves bookmarks, queues them when offline, sets the inbox badge, runs the sync tab, and moves data from the old local-only version once.
- `src/lib/parse-x.ts` turns X's untyped GraphQL JSON into posts. X changes this often; keep it defensive and update `src/lib/__tests__/parse-x.test.ts` with real samples when fixing it.
- `src/config.ts` Supabase URL, publishable key, website URL, extension IDs. Public values; `VITE_*` env vars override them for local testing.

A post with no `folderIds` is in the Inbox.

Deleting a post from Checkpoint (`dismiss_post`) records it in `dismissed_posts`, and `upsert_bookmarks` skips those on later syncs. A live capture (bookmarking it again on X, sortKey `L…`) clears the record and brings it back.

## Conventions

- Library picks follow the `pick-ui-library` skill: base-ui, cmdk, Sonner, dnd kit, zustand, clsx.
- Colors are tokens in `src/assets/styles.css` (`bg` #090909, `surface`, `sunken`, `ink`, `muted`, `faint`, `line`, `accent` #915AEF, `danger`, `--tag-*`). Dark only. Don't hardcode colors in components.
- Spacing on a 4/8px grid. Post images and text tiles have square corners; containers (modal, popovers) and pills stay rounded.
- The Figma file is documentation. Only recreate screens in Figma when the owner asks.
- Motion follows `emil-design-eng`: custom `--ease-out`, UI transitions under 300ms, `.press` for pressable elements, no animation on keyboard-driven actions (triage).
- Schema changes go in `supabase/schema.sql` and must stay safe to re-run. Tell the owner to paste it into the Supabase SQL editor.
- Verify with `pnpm typecheck`, `pnpm test`, `pnpm build` (extension) and `pnpm build:web` (website).

## Workflow (read this every session)

Solo project, worked on from several machines (Windows, a work Mac that can't install anything, cloud sessions). GitHub `main` is the single source of truth.

- **Start of a session:** `git pull origin main` before changing anything.
- **End of a task:** verify, then commit and push to `main`. Vercel deploys the website from `main` automatically, so website changes need nothing else. Ask before pushing if the change is large or risky.
- If the push is rejected because `main` moved, pull with rebase, re-run the checks, and push again. Never force-push `main`.
- If the change touches the extension (`src/entrypoints`, `src/lib/parse-x.ts`, `src/lib/posts.ts`, `src/config.ts`, `wxt.config.ts`), tell the owner to run `Update Checkpoint.bat` on Windows and reload the extension. Website-only changes need no action from them.
