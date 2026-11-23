# Checkpoint

A personal inspiration hub. A Chrome extension that imports your X (Twitter) bookmarks into a calm, Pinterest-style dashboard where you sort posts into folders, triage an unsorted inbox, and leave notes on why you saved something.

No X API key or paid plan needed. Everything stays in your browser.

## Install (Windows, one time)

1. Install [Git](https://git-scm.com/download/win) and [Node.js LTS](https://nodejs.org) with their default options.
2. Open **Command Prompt** and run:
   ```bat
   cd %USERPROFILE%\Documents
   git clone https://github.com/sudhamshuds-ui/checkpoint
   ```
3. Open `Documents\checkpoint` and double-click **Update Checkpoint.bat**.
4. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `Documents\checkpoint\.output\chrome-mv3`.

## Install (Mac, one time)

1. Install [Node.js LTS](https://nodejs.org). Git comes with macOS (accept the prompt to install the developer tools if it appears).
2. In **Terminal**:
   ```bash
   cd ~/Documents && git clone https://github.com/sudhamshuds-ui/checkpoint
   ```
3. Open `Documents/checkpoint` in Finder and double-click **Update Checkpoint.command**.
4. Load `Documents/checkpoint/.output/chrome-mv3` in `chrome://extensions` the same way as on Windows.

## Updating

Double-click **Update Checkpoint.bat** (Windows) or **Update Checkpoint.command** (Mac), then click the reload arrow on Checkpoint in `chrome://extensions` (or restart Chrome). Your posts, folders and notes are kept.

## Development

`pnpm dev` launches a separate Chrome with the extension and hot reload.

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
