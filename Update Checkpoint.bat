@echo off
setlocal
title Update Checkpoint
cd /d "%~dp0"

echo.
echo  Getting the latest Checkpoint...
git pull --ff-only origin main || goto :failed

echo.
echo  Installing (the first run takes a minute)...
call npx --yes pnpm@10.28.0 install --frozen-lockfile || goto :failed

echo.
echo  Building...
call npx --yes pnpm@10.28.0 build || goto :failed

echo.
echo  ------------------------------------------------------------
echo   Checkpoint is up to date.
echo   In Chrome, open chrome://extensions and click the reload
echo   arrow on the Checkpoint card (or just restart Chrome).
echo  ------------------------------------------------------------
echo.
pause
exit /b 0

:failed
echo.
echo  Something went wrong. Take a screenshot of this window and send it to Claude.
echo.
pause
exit /b 1
