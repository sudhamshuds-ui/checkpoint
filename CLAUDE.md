# Checkpoint

Chrome extension (WXT, MV3) that imports X bookmarks into a dashboard for sorting into folders.

## Layout

- `src/entrypoints/x-page.content.ts` runs in X's page world (`world: 'MAIN'`). It wraps `fetch` and XHR, reads GraphQL responses (`Bookmarks`, any timeline), and watches `CreateBookmark` / `DeleteBookmark` requests. It only reads; it never makes requests to X.
- `src/entrypoints/x.content.ts` bridges page messages to the background and runs the auto-scroll during a sync.
- `src/entrypoints/background.ts` writes to IndexedDB, keeps the toolbar badge (inbox count), and opens/closes the sync tab.
- `src/entrypoints/dashboard/` is the app (unlisted page, opened from the toolbar button).
- `src/lib/parse-x.ts` turns X's untyped GraphQL JSON into `ParsedPost`. X changes this shape often; keep parsing defensive and update `src/lib/__tests__/parse-x.test.ts` with real samples when fixing it.
- `src/lib/db.ts` is the Dexie schema. A post with no `folderIds` is in the Inbox.

## Conventions

- Library picks follow the `pick-ui-library` skill: base-ui, cmdk, Sonner, dnd kit, zustand, clsx.
- Colors are tokens in `src/assets/styles.css` (`bg`, `surface`, `sunken`, `ink`, `muted`, `faint`, `line`, `accent`), with dark values under `prefers-color-scheme`. Don't hardcode colors in components.
- Motion follows `emil-design-eng`: custom `--ease-out`, UI transitions under 300ms, `.press` for pressable elements, no animation on keyboard-driven actions (triage).
- Verify with `pnpm typecheck`, `pnpm test`, `pnpm build`.
