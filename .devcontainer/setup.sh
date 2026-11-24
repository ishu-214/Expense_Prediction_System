#!/usr/bin/env bash
set -e

echo "=== Setting up FinanceAI Sandbox in Cloud ==="

# 1. Setup Backend
echo "-> Installing Backend dependencies..."
cd backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
cd ..

# 2. Setup Frontend
echo "-> Installing Frontend packages..."
cd frontend
npm install
cd ..

echo "=== Sandbox ready! ==="
echo "To launch everything in parallel, run: bash start_sandbox.sh"
