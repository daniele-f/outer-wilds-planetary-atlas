@echo off
setlocal
cd /d "%~dp0"
title Outer Wilds Planetary Atlas

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required to run the atlas.
  echo Install the current Node.js LTS release from https://nodejs.org/
  goto :failed
)

if not exist "node_modules\.bin\vite.cmd" (
  where npm >nul 2>&1
  if errorlevel 1 (
    echo npm is required to install the atlas dependencies.
    goto :failed
  )

  echo Installing dependencies...
  call npm ci
  if errorlevel 1 goto :failed
)

echo Starting the Outer Wilds Planetary Atlas...
echo Press Ctrl+C to stop the server.
set "atlas_open=--open"
if /i "%~1"=="--no-open" set "atlas_open="
call "node_modules\.bin\vite.cmd" --host localhost %atlas_open%
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo The atlas could not be started. Review the message above for details.
pause
exit /b 1
