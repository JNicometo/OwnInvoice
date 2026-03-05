@echo off
REM ========================================
REM OwnInvoice Desktop Launcher (Windows)
REM by Grit Software
REM ========================================

title OwnInvoice Desktop

echo.
echo   ========================================
echo        OwnInvoice Desktop v1.0.0
echo            by Grit Software
echo   ========================================
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed.
    echo Please install it from https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies (first time only)...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
    echo.
)

REM Rebuild native modules if needed (better-sqlite3)
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo Building native modules...
    call npx electron-rebuild -f
    echo.
)

echo Launching OwnInvoice Desktop...
echo.
echo The app will open in a new window.
echo To stop: Close this window or press Ctrl+C
echo.

call npm run electron:dev

pause
