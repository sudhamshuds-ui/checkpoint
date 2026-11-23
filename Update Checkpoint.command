#!/bin/bash
# Double-click to pull the latest Checkpoint from GitHub and rebuild it.
cd "$(dirname "$0")" || exit 1

fail() {
  echo
  echo "  Something went wrong. Take a screenshot of this window and send it to Claude."
  echo
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
}

echo
echo "  Getting the latest Checkpoint..."
git pull --ff-only origin main || fail

echo
echo "  Installing (the first run takes a minute)..."
npx --yes pnpm@10.28.0 install --frozen-lockfile || fail

echo
echo "  Building..."
npx --yes pnpm@10.28.0 build || fail

echo
echo "  ------------------------------------------------------------"
echo "   Checkpoint is up to date."
echo "   In Chrome, open chrome://extensions and click the reload"
echo "   arrow on the Checkpoint card (or just restart Chrome)."
echo "  ------------------------------------------------------------"
echo
read -n 1 -s -r -p "  Press any key to close."
