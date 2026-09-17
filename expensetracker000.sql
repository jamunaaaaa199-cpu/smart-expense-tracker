-- ===========================================
-- Smart Expense Tracker Database
-- ===========================================

CREATE DATABASE IF NOT EXISTS expense_tracker;

USE expense_tracker;

-- ===========================================
-- Users Table
-- ===========================================

CREATE TABLE users (

    user_id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,

    password VARCHAR(255) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ===========================================
-- Income Table
-- ===========================================

CREATE TABLE income (

    income_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    source VARCHAR(100) NOT NULL,

    category VARCHAR(50),

    amount DECIMAL(10,2) NOT NULL,

    income_date DATE NOT NULL,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE

);

-- ===========================================
-- Expense Table
-- ===========================================

CREATE TABLE expenses (

    expense_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    title VARCHAR(100) NOT NULL,

    category VARCHAR(50),

    amount DECIMAL(10,2) NOT NULL,

    expense_date DATE NOT NULL,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE

);

-- ===========================================
-- Budget Table
-- ===========================================

CREATE TABLE budgets (

    budget_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    month INT NOT NULL,

    year INT NOT NULL,

    budget_amount DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE

);

-- ===========================================
-- Sample User
-- ===========================================

INSERT INTO users
(full_name, email, password)
VALUES
('Demo User', 'demo@example.com', '123456');

-- ===========================================
-- Sample Income
-- ===========================================

INSERT INTO income
(user_id, source, category, amount, income_date, description)
VALUES
(1, 'Monthly Salary', 'Salary', 50000, '2026-07-01', 'July Salary'),

(1, 'Freelance Project', 'Freelancing', 8000, '2026-07-10', 'Website Project');

-- ===========================================
-- Sample Expenses
-- ===========================================

INSERT INTO expenses
(user_id, title, category, amount, expense_date, description)
VALUES
(1, 'Restaurant', 'Food', 750, '2026-07-12', 'Dinner'),

(1, 'Fuel', 'Travel', 1200, '2026-07-11', 'Bike Fuel'),

(1, 'Electricity Bill', 'Bills', 2300, '2026-07-09', 'Monthly Bill'),

(1, 'Shopping', 'Shopping', 1800, '2026-07-08', 'Clothes');

-- ===========================================
-- Sample Budget
-- ===========================================

INSERT INTO budgets
(user_id, month, year, budget_amount)
VALUES
(1, 7, 2026, 40000);

-- ===========================================
-- ===========================================
-- Useful Queries
-- ===========================================

-- Total Income
SELECT SUM(amount) AS TotalIncome
FROM income
WHERE user_id = 1;

-- Total Expense
SELECT SUM(amount) AS TotalExpense
FROM expenses
WHERE user_id = 1;

-- Current Balance
SELECT
(
    (SELECT IFNULL(SUM(amount),0) FROM income WHERE user_id=1)
    -
    (SELECT IFNULL(SUM(amount),0) FROM expenses WHERE user_id=1)
) AS CurrentBalance;

-- Monthly Expenses
SELECT category,
SUM(amount) AS Total
FROM expenses
WHERE MONTH(expense_date)=7
GROUP BY category;

-- Monthly Income
SELECT category,
SUM(amount) AS Total
FROM income
WHERE MONTH(income_date)=7
GROUP BY category;

-- Recent Transactions
SELECT
income_date AS Date,
source AS Title,
amount,
'Income' AS Type
FROM income

UNION ALL

SELECT
expense_date,
title,
amount,
'Expense'
FROM expenses

ORDER BY Date DESC;