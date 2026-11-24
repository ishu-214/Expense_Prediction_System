# 🚀 FinanceAI Sandbox Execution Guide

This document explains how anyone can run the **AI-Powered Personal Finance Management and Expense Prediction System** from **anywhere in the world**, without encountering local machine path issues or dependency mismatches.

---

## 🌐 Method 1: Cloud Sandbox (Zero Installation, 100% in Browser)

Anyone can open and run this entire full-stack project inside a web browser using **GitHub Codespaces** or **Gitpod**. No Python, Node.js, or PostgreSQL needs to be installed on their device!

### Via GitHub Codespaces:
1. Push this repository to GitHub.
2. Click the green **Code** button -> Select the **Codespaces** tab.
3. Click **Create codespace on main**.
4. GitHub automatically:
   - Provisions a cloud sandbox container.
   - Installs Python 3.11, Node.js 20, and all dependencies via `.devcontainer/devcontainer.json`.
   - Forwards ports `5173` (Frontend) and `8000` (Backend).
5. Run in the Codespaces terminal:
   ```bash
   bash start_sandbox.sh
   ```
6. Click the popup **"Open in Browser"** to interact with the live application!

---

## 🐳 Method 2: Docker Container Sandbox (Isolated & Portable)

For anyone running Docker on Windows, macOS, or Linux:

```bash
# 1. Build and start all 3 sandbox containers (Database, Backend, Frontend)
docker compose up --build

# 2. To stop the sandbox containers
docker compose down
```

### URLs when running in Docker:
- **Frontend App**: `http://localhost:3000` (or `http://localhost:5173`)
- **Backend API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **PostgreSQL Database**: Port `5432` (`finance_db`)

---

## ⚡ Method 3: 1-Click Portable Local Sandbox

If someone clones the project to their laptop/PC:

### On Windows:
Double-click:
```cmd
start_sandbox.bat
```
*What it does:*
- Automatically detects the user's Python.
- Creates an isolated local virtual environment for that specific machine (fixing the `pyvenv.cfg` path issue).
- Installs all backend and frontend packages.
- Opens both servers in two separate windows and launches your browser!

### On Linux / macOS:
```bash
chmod +x start_sandbox.sh
./start_sandbox.sh
```

---

## 🔑 Why `pyvenv.cfg` Caused an Issue & How We Fixed It

- **The Problem:** Python virtual environments store the absolute system path where Python was installed (`C:\Users\kaviy\AppData\...`). If the `venv` folder is copied or committed, it breaks on any other computer.
- **The Fix:**
  1. Added `.gitignore` to prevent committing `venv/`, `node_modules/`, and local paths.
  2. Created automated sandbox launchers that generate clean, machine-independent environments dynamically.
  3. Added full Docker & Cloud DevContainer sandbox support for instant 1-click execution anywhere.
