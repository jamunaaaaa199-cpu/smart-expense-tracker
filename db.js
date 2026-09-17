// =========================================================
// Smart Expense Tracker - Database Controller (SQLite3)
// =========================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'expense_tracker.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error connecting to SQLite database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database:', DB_PATH);
    }
});

// Initialize Schema and Seed Data
function initDb() {
    db.serialize(() => {
        // Enable Foreign Keys
        db.run('PRAGMA foreign_keys = ON');

        // Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                mobile TEXT,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Income Table
        db.run(`
            CREATE TABLE IF NOT EXISTS income (
                income_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                source TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                income_date TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);

        // Expenses Table
        db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                expense_date TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);

        // Budgets Table
        db.run(`
            CREATE TABLE IF NOT EXISTS budgets (
                budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                budget_amount REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, month, year),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);

        // Seed Default Demo User & Transactions if table is empty
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) {
                console.error('Error querying users:', err);
                return;
            }
            if (row.count === 0) {
                console.log('🌱 Seeding default user & financial records...');
                db.run(
                    `INSERT INTO users (user_id, full_name, email, mobile, password) VALUES (?, ?, ?, ?, ?)`,
                    [1, 'Demo User', 'admin@gmail.com', '9876543210', 'admin123'],
                    function (err) {
                        if (err) return console.error('Seed user error:', err);

                        // Seed Income
                        const insertIncome = db.prepare(
                            `INSERT INTO income (user_id, source, category, amount, income_date, description) VALUES (?, ?, ?, ?, ?, ?)`
                        );
                        insertIncome.run(1, 'Monthly Salary', 'Salary', 50000, '2026-07-01', 'Monthly Company Salary');
                        insertIncome.run(1, 'Freelance Project', 'Freelancing', 8000, '2026-07-05', 'Web Design Client Payment');
                        insertIncome.run(1, 'Stock Dividend', 'Investment', 2500, '2026-07-10', 'Quarterly Dividend');
                        insertIncome.run(1, 'Festival Bonus', 'Bonus', 5000, '2026-07-12', 'Mid-year performance bonus');
                        insertIncome.finalize();

                        // Seed Expenses
                        const insertExpense = db.prepare(
                            `INSERT INTO expenses (user_id, title, category, amount, expense_date, description) VALUES (?, ?, ?, ?, ?, ?)`
                        );
                        insertExpense.run(1, 'Restaurant Dinner', 'Food', 750, '2026-07-12', 'Family dinner');
                        insertExpense.run(1, 'Bike Fuel', 'Travel', 1200, '2026-07-11', 'Petrol refill');
                        insertExpense.run(1, 'Electricity Bill', 'Bills', 2300, '2026-07-10', 'Monthly EB Bill');
                        insertExpense.run(1, 'Weekend Clothes', 'Shopping', 2500, '2026-07-09', 'Shopping mall');
                        insertExpense.run(1, 'Groceries', 'Food', 3500, '2026-07-07', 'Supermarket monthly items');
                        insertExpense.finalize();

                        // Seed Monthly Budget (July 2026)
                        db.run(
                            `INSERT INTO budgets (user_id, month, year, budget_amount) VALUES (?, ?, ?, ?)`,
                            [1, 7, 2026, 40000]
                        );

                        console.log('✅ Default demo data successfully seeded!');
                    }
                );
            }
        });
    });
}

initDb();

module.exports = db;
