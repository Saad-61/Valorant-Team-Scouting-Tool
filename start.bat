@echo off
echo Starting VALORANT Scouting Tool...
echo.

:: Start backend in a new window
echo [1/2] Starting Backend API on port 8000...
start "Backend API" cmd /k "cd backend && python main.py"

:: Wait for backend to start
timeout /t 3 /nobreak > nul

:: Start frontend in a new window
echo [2/2] Starting Frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   Backend API: http://localhost:8000
echo   Frontend:    http://localhost:5173
echo   API Docs:    http://localhost:8000/docs
echo ============================================
echo.
echo Press any key to open the app in browser...
pause > nul
start http://localhost:5173
