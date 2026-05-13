@echo off
cd /d "C:\Users\asus\ai-companion\apps\desktop\src-tauri\target\release"
start /b "" ai-companion-desktop.exe > "C:\Users\asus\ai-companion-app.log" 2>&1
timeout /t 5 /nobreak >nul
type "C:\Users\asus\ai-companion-app.log"
