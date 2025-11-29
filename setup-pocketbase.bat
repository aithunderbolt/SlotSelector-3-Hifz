@echo off
REM PocketBase Setup Script for Windows
REM This script automates the setup of PocketBase collections and data
REM 
REM Usage: setup-pocketbase.bat

echo.
echo ========================================
echo   PocketBase Setup Script (Windows)
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%
echo.

REM Install PocketBase SDK
echo [INFO] Installing PocketBase SDK...
call npm install pocketbase
echo.

REM Check if scripts exist
if not exist "pocketbase-setup.js" (
    echo [ERROR] pocketbase-setup.js not found in current directory
    pause
    exit /b 1
)

if not exist "pocketbase-seed.js" (
    echo [ERROR] pocketbase-seed.js not found in current directory
    pause
    exit /b 1
)

echo.
echo ========================================
echo   IMPORTANT: Configuration Check
echo ========================================
echo.
echo Before running this script, make sure you have:
echo   1. Updated POCKETBASE_URL in both scripts
echo   2. Updated ADMIN_EMAIL in both scripts
echo   3. Updated ADMIN_PASSWORD in both scripts
echo.
set /p CONFIRM="Have you updated the configuration? (Y/N): "

if /i not "%CONFIRM%"=="Y" (
    echo.
    echo [ERROR] Please update the configuration first
    echo.
    echo Edit these lines in pocketbase-setup.js and pocketbase-seed.js:
    echo   const POCKETBASE_URL = 'http://your-pocketbase-url';
    echo   const ADMIN_EMAIL = 'your-admin-email';
    echo   const ADMIN_PASSWORD = 'your-admin-password';
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Step 1: Creating Collections
echo ========================================
echo.
node pocketbase-setup.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to create collections. Please check the error above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Step 2: Seeding Initial Data
echo ========================================
echo.
node pocketbase-seed.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to seed data. Please check the error above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo [OK] Collections created
echo [OK] Initial data added
echo.
echo ========================================
echo   IMPORTANT: Enable Realtime
echo ========================================
echo.
echo Don't forget to enable realtime on all collections!
echo.
echo To enable realtime:
echo   1. Go to: http://your-pocketbase-url/_/
echo   2. For each collection (slots, registrations, users, settings):
echo      - Click on the collection
echo      - Go to 'Options' tab
echo      - Check 'Enable realtime'
echo      - Click 'Save'
echo.
echo ========================================
echo   Next Steps
echo ========================================
echo.
echo   1. Enable realtime (see above)
echo   2. Run: npm run dev
echo   3. Test your app!
echo.
pause
