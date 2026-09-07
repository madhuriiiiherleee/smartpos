@echo off
title smartPOS Launcher
echo ==========================================
echo   smartPOS - Starting Backend + Frontend
echo ==========================================
echo.

start "smartPOS Backend (port 8002)" cmd /k "cd /d ""%~dp0backend"" && .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8002"
start "smartPOS Frontend (port 5174)" cmd /k "cd /d ""%~dp0front end"" && npm run dev"

echo Waiting for servers to boot...
timeout /t 6 /nobreak >nul
start "" http://localhost:5174
echo Done! Two console windows opened (Backend + Frontend).
echo Close them to stop the servers.
pause