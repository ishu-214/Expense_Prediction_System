#!/usr/bin/env bash
set -e

echo "====================================================================="
echo "      AI Personal Finance Management & Expense Prediction System"
echo "                       Linux / Cloud Sandbox Launcher"
echo "====================================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Setup Backend
cd "$SCRIPT_DIR/backend"
if [ ! -f "venv/bin/python" ]; then
    echo "[1/3] Creating isolated Python venv..."
    python3 -m venv venv
    venv/bin/pip install --upgrade pip
    venv/bin/pip install -r requirements.txt
else
    echo "[1/3] Python venv verified."
fi

# 2. Setup Frontend
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "[2/3] Installing Frontend packages..."
    npm install
else
    echo "[2/3] Frontend packages verified."
fi

# 3. Run Backend in background
echo "[3/3] Starting Backend API on http://127.0.0.1:8000 ..."
cd "$SCRIPT_DIR/backend"
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Trap Ctrl+C to kill background processes
trap "echo 'Stopping sandbox...'; kill $BACKEND_PID; exit" INT TERM EXIT

# 4. Run Frontend
echo "Starting Frontend App on http://localhost:5173 ..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host 0.0.0.0
