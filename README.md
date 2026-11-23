# Checkpoint

A personal inspiration hub. A Chrome extension that imports your X (Twitter) bookmarks into a calm, Pinterest-style dashboard where you sort posts into folders, triage an unsorted inbox, and leave notes on why you saved something.

No X API key or paid plan needed. Everything stays in your browser.

## Install (Chrome)

```bash
pnpm install
```

```bash
pnpm build
```

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick the `.output/chrome-mv3` folder.
3. Pin Checkpoint to the toolbar. Click it (or press `Ctrl/Cmd + Shift + O`) to open the dashboard.
4. Click **Import from X**. Make sure you are logged in to x.com in this Chrome profile.

After a rebuild, press the reload icon on the Checkpoint card in `chrome://extensions`.

For development with hot reload, `pnpm dev` launches a separate Chrome with the extension loaded.

## How it works

- **Import:** Sync opens `x.com/i/bookmarks` and scrolls it. X's own page loads your bookmarks; Checkpoint reads those responses as they arrive. The first sync goes to the end of your list. Later syncs stop once they reach bookmarks you already have. The tab closes itself when done.
- **Live capture:** while you browse X on desktop, bookmarking a post saves it to Checkpoint right away. Removing a bookmark on X removes it from your Inbox, but never from a folder.
- **Phone bookmarks** sync to your X account, so they arrive on your next sync.
- **Storage:** IndexedDB inside the extension. Nothing is sent anywhere.

## Using it

| Where | What |
| --- | --- |
| Inbox | Everything not in a folder yet. The toolbar badge shows how many. |
| Drag a post onto a folder | Files it. Dragging out of a folder moves it. Drop on Inbox to unsort. |
| Folder button on a card | Add to or remove from folders, or create one by typing a name. |
| Click a post | Big view with the note field, folders and a link to X. Arrow keys step through posts. |
| Sort inbox | One post at a time. `1`–`9` files and moves on, hold `⇧` to pick several, `N` new folder, `Enter` writes a note, `S` skip, `←` back, `Z` undo, `E` open on X. |
| `/` | Search captions, notes and people. |

## Stack

WXT (Manifest V3), React 19, Tailwind CSS 4, Dexie, base-ui, cmdk, dnd kit, Sonner, zustand.

```bash
pnpm test
```

```bash
pnpm typecheck
```

## Design skills

`.claude/skills/` holds design and motion skills used while building this project, from
[emilkowalski/skills](https://github.com/emilkowalski/skills),
[jakubkrehel/skills](https://github.com/jakubkrehel/skills) and
[mengto/skills](https://github.com/mengto/skills) (UI subset). See each repo for its license.
