# REST API Documentation

The backend exposes fully documented RESTful APIs conforming to OpenAPI 3.0 / Swagger standards. Interactive Swagger documentation is available at `/docs` when the backend is running.

All authenticated endpoints require an `Authorization` HTTP header formatted as:
```http
Authorization: Bearer <your_jwt_access_token>
```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new user account and returns an access token.
- **Request Body**:
  ```json
  {
    "full_name": "Kaviyan Sharma",
    "email": "kaviyan@financeai.com",
    "password": "SecurePassword@123",
    "preferred_currency": "INR"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "full_name": "Kaviyan Sharma",
      "email": "kaviyan@financeai.com",
      "role": "user",
      "preferred_currency": "INR",
      "created_at": "2026-11-17T10:00:00"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user credentials and issues a JWT token.
- **Request Body**:
  ```json
  {
    "email": "demo@financeai.com",
    "password": "Demo@123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": { ... }
  }
  ```

### `GET /api/auth/me`
Retrieves currently authenticated user profile.

### `PUT /api/auth/profile`
Updates user's display name and preferred currency.

### `POST /api/auth/change-password`
Updates password with verification of current password.

---

## 2. Transactions Endpoints (`/api/transactions`)

### `GET /api/transactions`
Lists transactions for the authenticated user with filtering, sorting, and pagination.
- **Query Parameters**:
  - `page` (default 1): Page number.
  - `limit` (default 20): Items per page.
  - `search`: Search substring matching title or description.
  - `category_id`: Integer filter by category.
  - `transaction_type`: 'expense' or 'income'.
  - `start_date` / `end_date`: Format `YYYY-MM-DD`.
  - `sort_by`: 'date' or 'amount'.
  - `sort_order`: 'desc' or 'asc'.

### `POST /api/transactions`
Logs a new transaction with automatic real-time NLP categorization and anomaly inspection.
- **Request Body**:
  ```json
  {
    "title": "Starbucks Coffee & Caramel Latte",
    "amount": 480.0,
    "transaction_type": "expense",
    "category_id": null,
    "transaction_date": "2026-11-17",
    "payment_method": "UPI",
    "description": "Afternoon cafe order"
  }
  ```

### `POST /api/transactions/upload-csv`
Uploads a bank statement CSV (`multipart/form-data`), extracts columns, detects duplicates, and predicts categories.

### `POST /api/transactions/confirm-csv`
Bulk saves confirmed parsed transactions.

### `POST /api/transactions/correct-category`
Logs user classification corrections and updates model feedback data.

---

## 3. Budgets Endpoints (`/api/budgets`)

### `GET /api/budgets`
Lists monthly category budgets with calculated spent amounts, remaining margin, and utilization percentages.
- **Query Parameters**: `month` (1-12), `year`.

### `POST /api/budgets`
Creates a budget limit for a category in a specific month and year.

### `PUT /api/budgets/{id}` & `DELETE /api/budgets/{id}`
Updates or removes a budget limit.

---

## 4. Predictions Endpoints (`/api/predictions`)

### `GET /api/predictions/expenses`
Returns next month's predicted total outflow, model name, MAE/RMSE metrics, 4-week forecasts, category distributions, and historical vs. predicted timeline.

### `GET /api/predictions/categories`
Returns predicted expenses partitioned by category.

### `GET /api/predictions/savings`
Returns anticipated net savings and savings rate for upcoming billing cycle.

---

## 5. Recommendations Endpoints (`/api/recommendations`)

### `GET /api/recommendations`
Returns active AI recommendations with priority levels, estimated savings, and supporting transaction evidence.

### `POST /api/recommendations/generate`
Re-runs behavioral spending analysis and generates updated recommendations.

### `PUT /api/recommendations/{id}/status`
Marks recommendation as 'applied' or 'dismissed'.

---

## 6. Analytics & Export Endpoints (`/api/analytics`)

### `GET /api/analytics/dashboard`
Returns dashboard KPIs: balance, income, expenses, savings rate, budget utilization, 6-month historical trend, category breakdown, and AI insights.

### `GET /api/analytics/reports`
Returns longitudinal financial summaries partitioned by `daily`, `weekly`, `monthly`, or `annual` periods.

### `GET /api/analytics/export/csv`
Streams CSV file download of user's transactions.

### `GET /api/analytics/export/pdf`
Generates and downloads an executive PDF analytics summary using ReportLab.

---

## 7. Administrator Endpoints (`/api/admin`)
*(Restricted to users with role="admin")*

### `GET /api/admin/users`
Lists all registered users with transaction counts and spent totals without leaking private details.

### `GET /api/admin/analytics`
System-wide metrics: total users, active users, total transactions, total volume processed, anomalies detected.

### `GET /api/admin/model-performance`
Real-time evaluation telemetry for Model 1 (accuracy, precision, recall, F1), Model 2 (MAE, RMSE, MAPE, R²), and Model 3 (contamination, heuristic thresholds).
