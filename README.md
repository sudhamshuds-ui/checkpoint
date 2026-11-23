# Checkpoint

A personal inspiration hub for X (Twitter) bookmarks. A calm, Pinterest-style board where you sort posts into folders, triage an unsorted inbox, and leave notes on why you saved something.

- **Website** (Vercel): the board. Open it on any computer and sign in.
- **Chrome extension**: imports your X bookmarks and catches new ones as you save them.
- **Supabase**: stores everything, so every device shows the same board. Only your account can read it.

No X API key or paid plan needed.

## Setup (one time)

1. **Supabase:** create a project, open **SQL Editor**, paste all of `supabase/schema.sql` and run it.
2. **Your login:** in Supabase, **Authentication → Users → Add user → Create new user**, enter your email and a password, and tick **Auto Confirm User**. Then in **Authentication → Sign In / Providers**, turn off **Allow new users to sign up** so nobody else can make an account.
3. **Config:** put the Project URL and publishable (anon) key in `src/config.ts`.
4. **Vercel:** import the GitHub repo. The settings come from `vercel.json`. Put the site address in `src/app-url.ts` so the extension knows where the website lives.
5. **Extension (Windows):** see below, then open the website in that Chrome and sign in. The extension signs itself in too.

### Extension on Windows

1. Install [Git](https://git-scm.com/download/win) and [Node.js LTS](https://nodejs.org) with their default options.
2. Open **Command Prompt** and run:
   ```bat
   cd %USERPROFILE%\Documents
   git clone https://github.com/sudhamshuds-ui/checkpoint
   ```
3. Open `Documents\checkpoint` and double-click **Update Checkpoint.bat**.
4. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `Documents\checkpoint\.output\chrome-mv3`.

To update the extension later: double-click **Update Checkpoint.bat**, then click the reload arrow on Checkpoint in `chrome://extensions`. The website updates itself on every push to `main`.

## How importing works

- **Sync** opens `x.com/i/bookmarks` and scrolls it. X's own page loads your bookmarks; the extension reads those responses as they arrive. The first sync goes to the end of your list; later syncs stop once they reach posts you already have.
- **Live capture:** bookmarking a post on X in that Chrome saves it right away. Removing a bookmark on X removes it from your Inbox, but never from a folder.
- **Phone and other computers:** bookmarks you make there are in your X account, so they arrive on the next sync.

## Using it

| Where | What |
| --- | --- |
| X bookmarks | Everything not sorted yet. The toolbar badge shows how many. Images only, three columns. |
| Hover a post | Sort opens the folder picker; the bin removes it from Checkpoint (Undo in the toast). Videos play; carousels show arrows. |
| Click a post | Big view: note, tags, Copy image (pastes into Figma; videos copy a frame), Sort, Remove. Arrows beside it, or arrow keys, step through posts. |
| My feed | Every sorted post. Hover shows its folder; click it to move the post. Search covers tags, notes and people. |
| Folders | Drag to reorder. Drop a post on one to file it. |
| Tags | Colored, many per post, separate from folders. Click a tag to see everything with it. |

## Stack

Vite + React 19 website, WXT (Manifest V3) extension, Supabase (Postgres, auth, realtime), Tailwind CSS 4, base-ui, cmdk, dnd kit, Sonner, zustand.

```bash
pnpm dev
```

```bash
pnpm build:web
```

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
