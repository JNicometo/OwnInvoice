@echo off
REM ========================================
REM Build OwnInvoice Windows Installer
REM One-click: creates the .exe installer
REM No prerequisites needed - handles everything
REM ========================================

REM Request admin privileges for symlink creation
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

title Building OwnInvoice Desktop Installer

echo.
echo   ========================================
echo     Building OwnInvoice Desktop v1.0.0
echo           Windows Installer (.exe)
echo   ========================================
echo.

set "ORIGINAL_DIR=%~dp0"
set "SAFE_DIR=C:\OwnInvoice-Build"

REM Skip code signing (no certificate)
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=

REM Copy project to a path without spaces to avoid node-gyp issues
echo Preparing build environment...
echo   From: %ORIGINAL_DIR%
echo   To:   %SAFE_DIR%
echo.

if exist "%SAFE_DIR%" rmdir /s /q "%SAFE_DIR%" 2>nul
mkdir "%SAFE_DIR%" 2>nul
xcopy "%ORIGINAL_DIR%*" "%SAFE_DIR%\" /E /I /Q /Y /EXCLUDE:%ORIGINAL_DIR%build-exclude.txt 2>nul
if %errorlevel% neq 0 (
    REM If exclude file doesn't exist, copy without it
    xcopy "%ORIGINAL_DIR%*" "%SAFE_DIR%\" /E /I /Q /Y >nul
)

cd /d "%SAFE_DIR%"

REM Remove old node_modules and dist if they exist
if exist "node_modules" rmdir /s /q "node_modules" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Found Node.js installed on system.
    for /f "tokens=*" %%v in ('node -v') do echo Version: %%v
    echo.
    goto :BUILD
)

REM Check if portable Node.js already downloaded in original dir
if exist "%ORIGINAL_DIR%_node\node.exe" (
    echo Found portable Node.js.
    set "PATH=%ORIGINAL_DIR%_node;%PATH%"
    goto :BUILD
)

REM Download portable Node.js
echo Node.js not found. Downloading portable version...
echo This only happens once.
echo.

powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip' -OutFile '%ORIGINAL_DIR%_node.zip' }"

if not exist "%ORIGINAL_DIR%_node.zip" (
    echo [ERROR] Failed to download Node.js.
    echo         Please install from https://nodejs.org
    pause
    exit /b 1
)

echo Extracting Node.js...
powershell -Command "Expand-Archive -Path '%ORIGINAL_DIR%_node.zip' -DestinationPath '%ORIGINAL_DIR%_node_temp' -Force"
move "%ORIGINAL_DIR%_node_temp\node-v20.11.1-win-x64" "%ORIGINAL_DIR%_node" >nul 2>nul
rmdir "%ORIGINAL_DIR%_node_temp" /s /q 2>nul
del "%ORIGINAL_DIR%_node.zip" 2>nul

if not exist "%ORIGINAL_DIR%_node\node.exe" (
    echo [ERROR] Failed to extract Node.js.
    pause
    exit /b 1
)

echo [OK] Portable Node.js ready
echo.
set "PATH=%ORIGINAL_DIR%_node;%PATH%"

:BUILD

for /f "tokens=*" %%v in ('node -v') do echo Using Node.js %%v
echo.

REM Step 1: Install dependencies
echo [1/3] Installing dependencies (this may take a few minutes)...
call npm ci
if %errorlevel% neq 0 (
    echo      Trying npm install instead...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed
echo.

REM Step 2: Build React
echo [2/3] Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to build React app.
    pause
    exit /b 1
)
echo [OK] React app built
echo.

REM Step 3: Build Windows installer
echo [3/3] Building Windows installer (this may take a few minutes)...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to build installer.
    pause
    exit /b 1
)

REM Copy the installer back to original location
echo.
echo Copying installer to your folder...
if not exist "%ORIGINAL_DIR%dist" mkdir "%ORIGINAL_DIR%dist"
copy "%SAFE_DIR%\dist\*.exe" "%ORIGINAL_DIR%dist\" /Y >nul 2>nul
copy "%SAFE_DIR%\dist\*.blockmap" "%ORIGINAL_DIR%dist\" /Y >nul 2>nul
copy "%SAFE_DIR%\dist\*.yml" "%ORIGINAL_DIR%dist\" /Y >nul 2>nul

REM Clean up build folder
echo Cleaning up...
cd /d "%ORIGINAL_DIR%"
rmdir /s /q "%SAFE_DIR%" 2>nul

echo.
echo   ========================================
echo     Build complete!
echo     Installer is in the dist\ folder
echo   ========================================
echo.

REM Open the dist folder
explorer "%ORIGINAL_DIR%dist"

pause
