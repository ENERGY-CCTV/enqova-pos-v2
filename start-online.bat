@echo off
title ENQOVA POS - Online Launcher
echo ========================================================
echo   Starting ENQOVA POS Server and Cloudflare Online Tunnel
echo ========================================================
start "ENQOVA POS Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul
start "Cloudflare Tunnel (Public URL)" cmd /k "cloudflared.exe tunnel --url http://localhost:3000"
echo.
echo Server and Tunnel launched!
echo Check the 'Cloudflare Tunnel' window to see your public https link.
pause
