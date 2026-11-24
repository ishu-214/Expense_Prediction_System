-- ====================================================================
-- FinanceAI System - PostgreSQL Table Schema & Default Categories
-- Paste and run this script inside pgAdmin 4 (Query Tool on finance_db)
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    preferred_currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category_type VARCHAR(20) DEFAULT 'expense' NOT NULL,
    description VARCHAR(255),
    color VARCHAR(20) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'Tag'
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI' NOT NULL,
    description TEXT,
    notes TEXT,
    is_anomaly BOOLEAN DEFAULT FALSE NOT NULL,
    anomaly_score DOUBLE PRECISION DEFAULT 0.0,
    anomaly_reason VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    monthly_limit DOUBLE PRECISION NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Financial Goals Table
CREATE TABLE IF NOT EXISTS financial_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_name VARCHAR(150) NOT NULL,
    target_amount DOUBLE PRECISION NOT NULL,
    current_amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    target_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'in_progress' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_period VARCHAR(50) NOT NULL,
    predicted_amount DOUBLE PRECISION NOT NULL,
    prediction_type VARCHAR(50) DEFAULT 'monthly_total' NOT NULL,
    model_name VARCHAR(100) DEFAULT 'RandomForestRegressor' NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    confidence_score DOUBLE PRECISION DEFAULT 0.85,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    estimated_savings DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    supporting_data TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'system' NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. User Category Corrections Table
CREATE TABLE IF NOT EXISTS user_category_corrections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_title VARCHAR(150) NOT NULL,
    description TEXT,
    amount DOUBLE PRECISION NOT NULL,
    predicted_category_id INTEGER,
    corrected_category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ====================================================================
-- Default Seed Categories
-- ====================================================================
INSERT INTO categories (name, category_type, description, color, icon)
VALUES
    ('Food', 'expense', 'Groceries, restaurants, snacks, cafe', '#f97316', 'Utensils'),
    ('Shopping', 'expense', 'Clothing, gadgets, retail goods', '#ec4899', 'ShoppingBag'),
    ('Transportation', 'expense', 'Fuel, cabs, public transit, flights', '#3b82f6', 'Car'),
    ('Healthcare', 'expense', 'Medicine, doctor visits, hospital', '#ef4444', 'HeartPulse'),
    ('Entertainment', 'expense', 'Movies, streaming, games, outings', '#8b5cf6', 'Film'),
    ('Education', 'expense', 'Courses, books, tuition, school fees', '#06b6d4', 'GraduationCap'),
    ('Utilities', 'expense', 'Electricity, water, internet, phone', '#eab308', 'Zap'),
    ('Rent', 'expense', 'House rent, office lease, PG fee', '#14b8a6', 'Home'),
    ('Travel', 'expense', 'Hotels, vacations, flights, holiday', '#6366f1', 'Plane'),
    ('Investment', 'expense', 'Stocks, mutual funds, gold, crypto', '#10b981', 'TrendingUp'),
    ('Salary', 'income', 'Monthly paycheck, stipend, wages', '#22c55e', 'Wallet'),
    ('Other', 'expense', 'Miscellaneous or unclassified transactions', '#64748b', 'Tag')
ON CONFLICT (name) DO NOTHING;

-- Default Super Admin User (admin@financeai.com / Admin@123)
INSERT INTO users (full_name, email, password_hash, role, preferred_currency)
VALUES (
    'System Administrator',
    'admin@financeai.com',
    '$2b$12$Z0m08Q4k7zY.aW5jO5sPZOUr48/j1dY6oT293m8X9.Zt5.zF4BzyS',
    'admin',
    'INR'
)
ON CONFLICT (email) DO NOTHING;
