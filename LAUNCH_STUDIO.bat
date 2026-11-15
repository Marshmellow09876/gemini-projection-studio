@echo off
title Marshall Projection Studio - LUMEN-MAP AI v3.5
cd /d "%~dp0"

:: Detect Chrome or Edge executable for Standalone App Window Mode
set "APP_EXE="
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "APP_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "APP_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "APP_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "APP_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "APP_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
)

set APP_ARGS=--app=http://localhost:5173/ --window-size=1600,950

:: 1. Check if Vite dev server is already running on port 5173
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) -ne $null" | findstr "True" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Marshall Projection Studio is already online!
    echo [INFO] Opening standalone application window...
    if defined APP_EXE (
        start "" "%APP_EXE%" %APP_ARGS%
    ) else (
        start "" http://localhost:5173/
    )
    ping 127.0.0.1 -n 2 >nul
    exit /b 0
)

:: 2. Check if FastAPI backend is already running on port 8000
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) -ne $null" | findstr "True" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] FastAPI backend already running on http://127.0.0.1:8000
) else (
    where python >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [INFO] Starting Python FastAPI + OpenCV backend on http://127.0.0.1:8000 ...
        start "LUMEN-MAP AI Backend (FastAPI + OpenCV)" /min python -m uvicorn --app-dir "%~dp0backend" main:app --host 127.0.0.1 --port 8000
    )
)

echo [INFO] Starting Vite Frontend Server on port 5173...
start "LUMEN-MAP AI Vite Server" /min npm.cmd run dev -- --port 5173

:: Wait a brief moment for server to come up
ping 127.0.0.1 -n 4 >nul

echo [INFO] Launching Marshall Projection Studio standalone app window...
if defined APP_EXE (
    start "" "%APP_EXE%" %APP_ARGS%
) else (
    start "" http://localhost:5173/
)

ping 127.0.0.1 -n 2 >nul
exit /b 0
