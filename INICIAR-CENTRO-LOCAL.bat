@echo off
cd /d "%~dp0bot-local"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js 20 o superior para abrir el asistente.
  pause
  exit /b 1
)
start "Centro local IA Plus" http://127.0.0.1:3111/centro
node --env-file-if-exists=.env server.mjs
pause
