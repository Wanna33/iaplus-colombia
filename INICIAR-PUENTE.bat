@echo off
setlocal
cd /d "%~dp0whatsapp-bot\puente"
if not exist "config.json" (
  echo Falta whatsapp-bot\puente\config.json. Configura el Worker antes de iniciar.
  pause
  exit /b 1
)
echo Iniciando el puente de WhatsApp...
start "IA Plus - QR de WhatsApp" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; if (Test-Path 'qr.html') { Start-Process (Join-Path (Get-Location) 'qr.html') }"
npm start
pause
