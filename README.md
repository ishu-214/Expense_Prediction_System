# AI-Powered Personal Finance Management & Expense Prediction System

A production-grade, advanced full-stack personal finance platform engineered with **React.js**, **FastAPI**, **PostgreSQL / SQLAlchemy**, and **Scikit-Learn**. 

The system leverages genuine Machine Learning models to automatically categorize financial transactions, forecast next-month and weekly expenses, detect anomalous transactions with Isolation Forests, and generate personalized, data-backed saving recommendations.

---

## 🌟 Key Capabilities & System Features

1. **Automatic Transaction Categorization (NLP Model 1)**: TF-IDF vectorization and Logistic Regression accurately classify merchant descriptions into 12 standardized financial categories with alternative class probabilities and active learning feedback loops.
2. **Predictive Expense Forecasting (Time-Series Model 2)**: Chronologically validated Random Forest Regressors and rolling lag pipelines predict upcoming monthly outflows, 4-week forecasts, and category distributions with confidence metrics (MAE, RMSE, MAPE).
3. **Unsupervised Anomaly Detection (Model 3)**: Isolation Forests and category Z-score heuristics spot spending deviations and outliers with transparent, non-alarmist explanations.
4. **Intelligent Saving Recommendation Engine (Model 4)**: Automatically detects recurring subscriptions, runaway food delivery expenses, budget overspends, and discretionary spending creep.
5. **Bank Statement CSV Import**: Drag-and-drop CSV parser with automatic column mapping, duplicate transaction detection, and user category confirmation.
6. **Budget Management**: Category-wise monthly budgets with real-time utilization progress bars and threshold warnings.
7. **Savings Goals Tracker**: Set target dates, milestones, and monitor accumulated savings with 1-click fund logging.
8. **Audit-Ready Analytics & Export**: Interactive Recharts visualizations with instant CSV and PDF executive summary downloads.
9. **Role-Based Access Control (RBAC)**: Dedicated User and Administrator portals with model performance telemetry and system analytics.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["React Frontend (Tailwind CSS + Recharts)"]
    API["FastAPI Backend (REST API + Uvicorn)"]
    DB[(PostgreSQL / SQLite Database)]
    ML1["Model 1: NLP Categorizer (TF-IDF + LogReg)"]
    ML2["Model 2: Expense Forecasting (Random Forest)"]
    ML3["Model 3: Anomaly Detection (Isolation Forest)"]
    ML4["Model 4: Recommendation Engine"]

    Client -->|HTTPS REST + JWT| API
    API --> DB
    API --> ML1
    API --> ML2
    API --> ML3
    API --> ML4
```

---

## 🚀 Quick Start & Local Setup Instructions

### Prerequisites
- **Python 3.10+** (Tested on Python 3.10 - 3.14)
- **Node.js 18+** & **npm**

---

### Step 1: Clone and Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI server (creates database & seeds demo data automatically)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The REST API and interactive Swagger documentation will be live at:
- **Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Root**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

### Step 2: Set Up and Start Frontend

In a separate terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```

The web application dashboard will be live at:
- **Application URL**: [http://localhost:3000/](http://localhost:3000/) (or [http://localhost:5173/](http://localhost:5173/))

---

---

## 🐳 Docker Container Deployment

Run isolated database, backend, and frontend containers with Docker Compose:

```bash
docker compose up --build
```
- **Frontend Web UI**: `http://localhost:3000`
- **Backend API & Swagger**: `http://localhost:8000/docs`

---

## 🔑 Default Credentials

| Role | Email | Password | Scope |
|---|---|---|---|
| **Super Administrator** | `admin@financeai.com` | `Admin@123` | System Analytics, Model Telemetry, User Directory |
| **New User Registration** | Any email | Any password | Clean personal finance tracker (starts with ₹0.00) |

*(On the Login page, clicking **Super Admin** automatically prefills the admin email address).*

---

## 🧪 Running Automated Tests

Run the comprehensive Pytest suite covering authentication, JWT security, database CRUD, and all Machine Learning pipelines:

```bash
cd backend
.\venv\Scripts\python -m pytest tests/test_api.py -v
```

All 7 test suites will execute and pass:
- `test_password_hashing`: PASSED
- `test_jwt_token_creation_and_decoding`: PASSED
- `test_ml_categorizer_predictions`: PASSED
- `test_anomaly_detector`: PASSED
- `test_ml_expense_predictor`: PASSED
- `test_recommendation_engine`: PASSED
- `test_user_and_budget_crud`: PASSED

---

## 🧠 Machine Learning Training & Evaluation Scripts

To independently benchmark and train each individual ML model from the command line:

```bash
# Model 1: NLP Expense Categorizer (TF-IDF + Logistic Regression)
python ml/training/train_categorizer.py

# Model 2: Chronological Expense Predictor (Random Forest Regressor)
python ml/training/train_predictor.py

# Model 3: Unsupervised Financial Anomaly Detector (Isolation Forest)
python ml/training/train_anomaly_detector.py
```

---

## 🌐 Production Deployment

### Backend Deployment (Render / Railway)
1. **Build Command**: `pip install -r backend/requirements.txt`
2. **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Environment Variables**:
   - `DATABASE_URL`: Your managed PostgreSQL connection URI (e.g. `postgresql://user:pass@host:5432/db`)
   - `SECRET_KEY`: Long cryptographic string for signing JWT tokens

### Frontend Deployment (Vercel / Netlify)
1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_BASE_URL`: Your deployed backend API URL (e.g. `https://your-backend.onrender.com/api`)

---

## 📁 Repository Structure

```
Expense_Prediction_System/
├── backend/
│   ├── app/
│   │   ├── api/             # REST API routers (auth, transactions, budgets, etc.)
│   │   ├── core/            # Config, security, JWT helpers
│   │   ├── database/        # SQLAlchemy engine, session
│   │   ├── ml/              # Scikit-learn pipelines & engines
│   │   ├── models/          # SQLAlchemy database entities
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── utils/           # Demo dataset seeder
│   ├── datasets/            # Sample bank statement CSV
│   ├── tests/               # Pytest test suite
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/      # Modals, StatCards, Skeletons
│   │   ├── context/         # AuthContext & ThemeContext
│   │   ├── layouts/         # Dashboard & Auth layouts
│   │   ├── pages/           # All 10 application views
│   │   ├── services/        # Axios API client
│   │   └── utils/           # Formatters
│   ├── package.json
│   └── vite.config.js
├── ml/
│   ├── saved_models/        # Trained .joblib artifacts
│   └── training/            # Standalone training & benchmark CLI scripts
└── docs/
    ├── system_architecture.md
    ├── database_design.md
    ├── api_documentation.md
    └── ml_documentation.md
```

---

## 📜 License & IEEE Project Notice

Engineered as a complete capstone project demonstration for **AI-Powered Personal Finance Management and Expense Prediction Systems**. Developed with production-ready full-stack architecture, mathematical forecasting validation, and rigorous software testing standards.
