// =========================================================
// Smart Expense Tracker - Express Server & REST API
// =========================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(__dirname));

// =========================================================
// AUTHENTICATION APIs
// =========================================================

// Register
app.post('/api/auth/register', (req, res) => {
    const { full_name, email, mobile, password } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const checkSql = 'SELECT user_id FROM users WHERE email = ?';
    db.get(checkSql, [email], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (row) return res.status(400).json({ success: false, message: 'Email already registered.' });

        const insertSql = 'INSERT INTO users (full_name, email, mobile, password) VALUES (?, ?, ?, ?)';
        db.run(insertSql, [full_name, email, mobile || '', password], function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            return res.status(201).json({
                success: true,
                message: 'User registered successfully!',
                user: { user_id: this.lastID, full_name, email, mobile }
            });
        });
    });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const sql = 'SELECT user_id, full_name, email, mobile, password FROM users WHERE email = ?';
    db.get(sql, [email], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        return res.json({
            success: true,
            message: 'Login successful!',
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                mobile: user.mobile
            }
        });
    });
});

// =========================================================
// DASHBOARD STATS API
// =========================================================
app.get('/api/dashboard/stats', (req, res) => {
    const userId = req.query.user_id || 1;

    const queries = {
        totalIncome: 'SELECT IFNULL(SUM(amount), 0) as total FROM income WHERE user_id = ?',
        totalExpense: 'SELECT IFNULL(SUM(amount), 0) as total FROM expenses WHERE user_id = ?',
        budget: 'SELECT budget_amount FROM budgets WHERE user_id = ? ORDER BY budget_id DESC LIMIT 1',
        recentTransactions: `
            SELECT income_id as id, income_date as date, source as title, category, amount, 'Income' as type
            FROM income WHERE user_id = ?
            UNION ALL
            SELECT expense_id as id, expense_date as date, title, category, amount, 'Expense' as type
            FROM expenses WHERE user_id = ?
            ORDER BY date DESC LIMIT 6
        `
    };

    db.get(queries.totalIncome, [userId], (err, incRow) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const totalIncome = incRow.total;

        db.get(queries.totalExpense, [userId], (err, expRow) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            const totalExpense = expRow.total;
            const balance = totalIncome - totalExpense;

            db.get(queries.budget, [userId], (err, bgtRow) => {
                const budgetAmount = bgtRow ? bgtRow.budget_amount : 40000;
                const spentPercent = budgetAmount > 0 ? Math.min(Math.round((totalExpense / budgetAmount) * 100), 100) : 0;
                const remainingBudget = Math.max(budgetAmount - totalExpense, 0);

                db.all(queries.recentTransactions, [userId, userId], (err, txRows) => {
                    if (err) return res.status(500).json({ success: false, message: err.message });

                    return res.json({
                        success: true,
                        data: {
                            totalIncome,
                            totalExpense,
                            balance,
                            budgetAmount,
                            spentPercent,
                            remainingBudget,
                            recentTransactions: txRows || []
                        }
                    });
                });
            });
        });
    });
});

// =========================================================
// INCOME APIs
// =========================================================

// Get all income
app.get('/api/income', (req, res) => {
    const userId = req.query.user_id || 1;
    const { search, category } = req.query;

    let sql = 'SELECT * FROM income WHERE user_id = ?';
    const params = [userId];

    if (category && category !== 'All' && category !== 'Select Category') {
        sql += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        sql += ' AND (source LIKE ? OR description LIKE ? OR category LIKE ?)';
        const queryTerm = `%${search}%`;
        params.push(queryTerm, queryTerm, queryTerm);
    }

    sql += ' ORDER BY income_date DESC, income_id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// Create income
app.post('/api/income', (req, res) => {
    const { user_id, source, category, amount, income_date, description } = req.body;
    const uid = user_id || 1;

    if (!source || !category || !amount || !income_date) {
        return res.status(400).json({ success: false, message: 'Source, category, amount and date are required.' });
    }

    const sql = `INSERT INTO income (user_id, source, category, amount, income_date, description) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [uid, source, category, Number(amount), income_date, description || ''], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({
            success: true,
            message: 'Income added successfully!',
            income_id: this.lastID
        });
    });
});

// Update income
app.put('/api/income/:id', (req, res) => {
    const incomeId = req.params.id;
    const { source, category, amount, income_date, description } = req.body;

    const sql = `
        UPDATE income
        SET source = ?, category = ?, amount = ?, income_date = ?, description = ?
        WHERE income_id = ?
    `;

    db.run(sql, [source, category, Number(amount), income_date, description || '', incomeId], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Income updated successfully!' });
    });
});

// Delete income
app.delete('/api/income/:id', (req, res) => {
    const incomeId = req.params.id;
    db.run('DELETE FROM income WHERE income_id = ?', [incomeId], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Income deleted successfully!' });
    });
});

// =========================================================
// EXPENSES APIs
// =========================================================

// Get all expenses
app.get('/api/expenses', (req, res) => {
    const userId = req.query.user_id || 1;
    const { search, category } = req.query;

    let sql = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [userId];

    if (category && category !== 'All' && category !== 'Select Category') {
        sql += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        sql += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
        const queryTerm = `%${search}%`;
        params.push(queryTerm, queryTerm, queryTerm);
    }

    sql += ' ORDER BY expense_date DESC, expense_id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// Create expense
app.post('/api/expenses', (req, res) => {
    const { user_id, title, category, amount, expense_date, description } = req.body;
    const uid = user_id || 1;

    if (!title || !category || !amount || !expense_date) {
        return res.status(400).json({ success: false, message: 'Title, category, amount and date are required.' });
    }

    const sql = `INSERT INTO expenses (user_id, title, category, amount, expense_date, description) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [uid, title, category, Number(amount), expense_date, description || ''], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({
            success: true,
            message: 'Expense recorded successfully!',
            expense_id: this.lastID
        });
    });
});

// Update expense
app.put('/api/expenses/:id', (req, res) => {
    const expenseId = req.params.id;
    const { title, category, amount, expense_date, description } = req.body;

    const sql = `
        UPDATE expenses
        SET title = ?, category = ?, amount = ?, expense_date = ?, description = ?
        WHERE expense_id = ?
    `;

    db.run(sql, [title, category, Number(amount), expense_date, description || '', expenseId], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Expense updated successfully!' });
    });
});

// Delete expense
app.delete('/api/expenses/:id', (req, res) => {
    const expenseId = req.params.id;
    db.run('DELETE FROM expenses WHERE expense_id = ?', [expenseId], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Expense deleted successfully!' });
    });
});

// =========================================================
// BUDGET APIs
// =========================================================
app.get('/api/budget', (req, res) => {
    const userId = req.query.user_id || 1;
    db.get('SELECT * FROM budgets WHERE user_id = ? ORDER BY budget_id DESC LIMIT 1', [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: row || { budget_amount: 40000, month: new Date().getMonth() + 1, year: new Date().getFullYear() } });
    });
});

app.post('/api/budget', (req, res) => {
    const { user_id, month, year, budget_amount } = req.body;
    const uid = user_id || 1;
    const m = month || (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();

    const sql = `
        INSERT INTO budgets (user_id, month, year, budget_amount)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, month, year)
        DO UPDATE SET budget_amount = excluded.budget_amount
    `;

    db.run(sql, [uid, m, y, Number(budget_amount)], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Budget updated successfully!' });
    });
});

// =========================================================
// REPORTS & ANALYTICS APIs
// =========================================================
app.get('/api/reports/analytics', (req, res) => {
    const userId = req.query.user_id || 1;
    const { month, category } = req.query;

    let incomeFilter = 'WHERE user_id = ?';
    let expenseFilter = 'WHERE user_id = ?';
    const incParams = [userId];
    const expParams = [userId];

    if (month) {
        incomeFilter += ' AND strftime("%Y-%m", income_date) = ?';
        expenseFilter += ' AND strftime("%Y-%m", expense_date) = ?';
        incParams.push(month);
        expParams.push(month);
    }

    if (category && category !== 'All' && category !== 'All Categories') {
        incomeFilter += ' AND category = ?';
        expenseFilter += ' AND category = ?';
        incParams.push(category);
        expParams.push(category);
    }

    const expCategorySql = `
        SELECT category, SUM(amount) as total
        FROM expenses ${expenseFilter}
        GROUP BY category
    `;

    const incCategorySql = `
        SELECT category, SUM(amount) as total
        FROM income ${incomeFilter}
        GROUP BY category
    `;

    const monthlyTrendSql = `
        SELECT strftime("%Y-%m", date) as month_label,
               SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as total_income,
               SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as total_expense
        FROM (
            SELECT income_date as date, amount, 'Income' as type FROM income WHERE user_id = ?
            UNION ALL
            SELECT expense_date as date, amount, 'Expense' as type FROM expenses WHERE user_id = ?
        )
        GROUP BY month_label
        ORDER BY month_label ASC
        LIMIT 6
    `;

    const transactionsSql = `
        SELECT income_id as id, income_date as date, source as title, category, amount, 'Income' as type, description
        FROM income ${incomeFilter}
        UNION ALL
        SELECT expense_id as id, expense_date as date, title, category, amount, 'Expense' as type, description
        FROM expenses ${expenseFilter}
        ORDER BY date DESC
    `;

    db.all(expCategorySql, expParams, (err, expCategories) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.all(incCategorySql, incParams, (err, incCategories) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            db.all(monthlyTrendSql, [userId, userId], (err, trends) => {
                if (err) return res.status(500).json({ success: false, message: err.message });

                db.all(transactionsSql, [...incParams, ...expParams], (err, transactions) => {
                    if (err) return res.status(500).json({ success: false, message: err.message });

                    const totalInc = (transactions || []).filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
                    const totalExp = (transactions || []).filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

                    res.json({
                        success: true,
                        data: {
                            totalIncome: totalInc,
                            totalExpense: totalExp,
                            netSavings: totalInc - totalExp,
                            categoryExpenseBreakdown: expCategories || [],
                            categoryIncomeBreakdown: incCategories || [],
                            monthlyTrends: trends || [],
                            transactions: transactions || []
                        }
                    });
                });
            });
        });
    });
});

// CSV Export API
app.get('/api/export/csv', (req, res) => {
    const userId = req.query.user_id || 1;

    const sql = `
        SELECT income_date as Date, 'Income' as Type, source as Title, category as Category, amount as Amount, description as Description
        FROM income WHERE user_id = ?
        UNION ALL
        SELECT expense_date as Date, 'Expense' as Type, title as Title, category as Category, amount as Amount, description as Description
        FROM expenses WHERE user_id = ?
        ORDER BY Date DESC
    `;

    db.all(sql, [userId, userId], (err, rows) => {
        if (err) return res.status(500).send('Error generating export');

        let csv = 'Date,Type,Title,Category,Amount,Description\n';
        rows.forEach(r => {
            csv += `"${r.Date}","${r.Type}","${(r.Title || '').replace(/"/g, '""')}","${r.Category}","${r.Amount}","${(r.Description || '').replace(/"/g, '""')}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="expense_tracker_export.csv"');
        res.send(csv);
    });
});

// Catch-all route to serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Smart Expense Tracker Server running at http://localhost:${PORT}`);
});
