@echo off
setlocal
cd /d "%~dp0"

echo Starting ShootSpine Desktop Agent on http://127.0.0.1:17865 ...
start "ShootSpine Desktop Agent" /MIN cmd /c "node src\server.mjs"
echo.
echo Agent window started (minimized). You can close this window.
timeout /t 2 >nul
endlocal
