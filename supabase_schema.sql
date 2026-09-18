-- =========================================================
-- Smart Expense Tracker - Supabase Database Schema
-- Run this SQL in: Supabase Dashboard -> SQL Editor -> Run
-- =========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id   SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email     TEXT UNIQUE NOT NULL,
    mobile    TEXT DEFAULT '',
    password  TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INCOME TABLE
CREATE TABLE IF NOT EXISTS income (
    income_id   SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    source      TEXT NOT NULL,
    category    TEXT NOT NULL,
    amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    income_date DATE NOT NULL,
    description TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    expense_id   SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    category     TEXT NOT NULL,
    amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL,
    description  TEXT DEFAULT '',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
    budget_id     SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    month         INTEGER NOT NULL,
    year          INTEGER NOT NULL,
    budget_amount NUMERIC(12,2) NOT NULL DEFAULT 40000,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- =========================================================
-- SEED DEMO DATA (demo@example.com / admin123)
-- =========================================================

INSERT INTO users (user_id, full_name, email, mobile, password)
VALUES (1, 'Demo Admin', 'demo@example.com', '9876543210', 'admin123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (user_id, full_name, email, mobile, password)
VALUES (2, 'Demo User', 'demo@example.com', '9123456780', '123456')
ON CONFLICT (email) DO NOTHING;

INSERT INTO income (user_id, source, category, amount, income_date, description) VALUES
(1, 'Monthly Salary',    'Salary',      50000, '2026-07-01', 'Monthly Company Salary'),
(1, 'Freelance Project', 'Freelancing',  8000, '2026-07-05', 'Web Design Client Payment'),
(1, 'Stock Dividend',    'Investment',   2500, '2026-07-10', 'Quarterly Dividend'),
(1, 'Festival Bonus',    'Bonus',        5000, '2026-07-12', 'Mid-year performance bonus')
ON CONFLICT DO NOTHING;

INSERT INTO expenses (user_id, title, category, amount, expense_date, description) VALUES
(1, 'Restaurant Dinner', 'Food',      750,  '2026-07-12', 'Family dinner'),
(1, 'Bike Fuel',         'Travel',    1200, '2026-07-11', 'Petrol refill'),
(1, 'Electricity Bill',  'Bills',     2300, '2026-07-10', 'Monthly EB Bill'),
(1, 'Weekend Clothes',   'Shopping',  2500, '2026-07-09', 'Shopping mall'),
(1, 'Groceries',         'Food',      3500, '2026-07-07', 'Supermarket monthly items')
ON CONFLICT DO NOTHING;

INSERT INTO budgets (user_id, month, year, budget_amount)
VALUES (1, 7, 2026, 40000)
ON CONFLICT (user_id, month, year) DO NOTHING;

-- Disable RLS (Row Level Security) for service_role access
-- (Server uses service_role key, so RLS won't block it)
ALTER TABLE users   DISABLE ROW LEVEL SECURITY;
ALTER TABLE income  DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Grant sequence permission for serial columns
SELECT setval(pg_get_serial_sequence('users','user_id'), GREATEST(2, (SELECT MAX(user_id) FROM users)));
SELECT setval(pg_get_serial_sequence('income','income_id'), GREATEST(4, (SELECT MAX(income_id) FROM income)));
SELECT setval(pg_get_serial_sequence('expenses','expense_id'), GREATEST(5, (SELECT MAX(expense_id) FROM expenses)));
SELECT setval(pg_get_serial_sequence('budgets','budget_id'), GREATEST(1, (SELECT MAX(budget_id) FROM budgets)));
