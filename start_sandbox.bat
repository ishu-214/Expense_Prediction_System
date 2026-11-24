@echo off
title FinanceAI Sandbox Launcher
cls
echo =====================================================================
echo       AI Personal Finance Management ^& Expense Prediction System
echo                       One-Click Sandbox Launcher
echo =====================================================================
echo.

:: 1. Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in system PATH.
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    pause
    exit /b 1
)

:: 2. Setup isolated Virtual Environment for Backend
cd /d "%~dp0backend"
if not exist "venv\Scripts\python.exe" (
    echo [1/3] Creating fresh isolated virtual environment...
    python -m venv venv
    echo [2/3] Installing backend dependencies (FastAPI, Scikit-Learn, PyTorch/Numpy)...
    venv\Scripts\python.exe -m pip install --upgrade pip
    venv\Scripts\python.exe -m pip install -r requirements.txt
) else (
    echo [1/3] Virtual environment verified.
)

:: 3. Setup Frontend dependencies
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [2/3] Installing frontend dependencies (React, Vite, Tailwind CSS)...
    call npm install
) else (
    echo [2/3] Frontend modules verified.
)

:: 4. Launch Backend API in background/new window
echo [3/3] Launching servers...
cd /d "%~dp0backend"
start "FinanceAI Backend (FastAPI)" cmd /k "title FinanceAI Backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

:: 5. Launch Frontend in background/new window
cd /d "%~dp0frontend"
start "FinanceAI Frontend (React)" cmd /k "title FinanceAI Frontend && npm run dev"

echo.
echo =====================================================================
echo   SANDBOX IS RUNNING!
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://127.0.0.1:8000
echo   - Swagger API Docs: http://127.0.0.1:8000/docs
echo =====================================================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:5173
