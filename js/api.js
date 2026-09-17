// =========================================================
// Smart Expense Tracker - Client API Service (Dual-Mode)
// =========================================================

const API_BASE = ''; // Same origin

// Local storage seed defaults for offline/static mode
function initLocalStorage() {
    if (!localStorage.getItem('incomes')) {
        const defaultIncomes = [
            { income_id: 1, user_id: 1, source: 'Monthly Salary', category: 'Salary', amount: 50000, income_date: '2026-07-01', description: 'Monthly Company Salary' },
            { income_id: 2, user_id: 1, source: 'Freelance Project', category: 'Freelancing', amount: 8000, income_date: '2026-07-05', description: 'Web Design Client Payment' },
            { income_id: 3, user_id: 1, source: 'Stock Dividend', category: 'Investment', amount: 2500, income_date: '2026-07-10', description: 'Quarterly Dividend' },
            { income_id: 4, user_id: 1, source: 'Festival Bonus', category: 'Bonus', amount: 5000, income_date: '2026-07-12', description: 'Mid-year performance bonus' }
        ];
        localStorage.setItem('incomes', JSON.stringify(defaultIncomes));
    }

    if (!localStorage.getItem('expenses')) {
        const defaultExpenses = [
            { expense_id: 1, user_id: 1, title: 'Restaurant Dinner', category: 'Food', amount: 750, expense_date: '2026-07-12', description: 'Family dinner' },
            { expense_id: 2, user_id: 1, title: 'Bike Fuel', category: 'Travel', amount: 1200, expense_date: '2026-07-11', description: 'Petrol refill' },
            { expense_id: 3, user_id: 1, title: 'Electricity Bill', category: 'Bills', amount: 2300, expense_date: '2026-07-10', description: 'Monthly EB Bill' },
            { expense_id: 4, user_id: 1, title: 'Weekend Clothes', category: 'Shopping', amount: 2500, expense_date: '2026-07-09', description: 'Shopping mall' },
            { expense_id: 5, user_id: 1, title: 'Groceries', category: 'Food', amount: 3500, expense_date: '2026-07-07', description: 'Supermarket monthly items' }
        ];
        localStorage.setItem('expenses', JSON.stringify(defaultExpenses));
    }

    if (!localStorage.getItem('budget')) {
        localStorage.setItem('budget', JSON.stringify({ budget_amount: 40000, month: 7, year: 2026 }));
    }
}

initLocalStorage();

const API = {
    // Current user helper
    getUser() {
        try {
            return JSON.parse(localStorage.getItem('user')) || { user_id: 1, full_name: 'Demo User', email: 'admin@gmail.com' };
        } catch {
            return { user_id: 1, full_name: 'Demo User', email: 'admin@gmail.com' };
        }
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('user');
    },

    // Auth
    async login(email, password) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                this.setUser(data.user);
                return data;
            }
            throw new Error(data.message || 'Login failed');
        } catch (e) {
            // Local fallback
            if ((email === 'admin@gmail.com' && password === 'admin123') || (email === 'demo@example.com' && password === '123456')) {
                const user = { user_id: 1, full_name: 'Demo User', email: email };
                this.setUser(user);
                return { success: true, user, message: 'Login successful (Offline)' };
            }
            throw e;
        }
    },

    async register(full_name, email, mobile, password) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, email, mobile, password })
            });
            return await res.json();
        } catch (e) {
            const user = { user_id: Date.now(), full_name, email, mobile };
            this.setUser(user);
            return { success: true, user, message: 'Account registered locally!' };
        }
    },

    // Dashboard summary
    async getDashboardStats() {
        const user = this.getUser();
        try {
            const res = await fetch(`${API_BASE}/api/dashboard/stats?user_id=${user.user_id}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json.data;
            }
        } catch {}

        // Fallback calculation from localStorage
        const incomes = JSON.parse(localStorage.getItem('incomes')) || [];
        const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        const budgetObj = JSON.parse(localStorage.getItem('budget')) || { budget_amount: 40000 };

        const totalIncome = incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        const balance = totalIncome - totalExpense;
        const budgetAmount = Number(budgetObj.budget_amount || 40000);
        const spentPercent = budgetAmount > 0 ? Math.min(Math.round((totalExpense / budgetAmount) * 100), 100) : 0;
        const remainingBudget = Math.max(budgetAmount - totalExpense, 0);

        const recent = [
            ...incomes.map(i => ({ id: i.income_id, date: i.income_date, title: i.source, category: i.category, amount: i.amount, type: 'Income' })),
            ...expenses.map(e => ({ id: e.expense_id, date: e.expense_date, title: e.title, category: e.category, amount: e.amount, type: 'Expense' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

        return {
            totalIncome,
            totalExpense,
            balance,
            budgetAmount,
            spentPercent,
            remainingBudget,
            recentTransactions: recent
        };
    },

    // Budget Update
    async updateBudget(budgetAmount) {
        const user = this.getUser();
        try {
            const res = await fetch(`${API_BASE}/api/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.user_id, budget_amount: budgetAmount })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    localStorage.setItem('budget', JSON.stringify({ budget_amount: budgetAmount }));
                    return json;
                }
            }
        } catch {}

        localStorage.setItem('budget', JSON.stringify({ budget_amount: budgetAmount }));
        return { success: true, message: 'Budget updated successfully!' };
    },

    // Income
    async getIncome(params = {}) {
        const user = this.getUser();
        try {
            const query = new URLSearchParams({ user_id: user.user_id, ...params }).toString();
            const res = await fetch(`${API_BASE}/api/income?${query}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json.data;
            }
        } catch {}

        let list = JSON.parse(localStorage.getItem('incomes')) || [];
        if (params.search) {
            const q = params.search.toLowerCase();
            list = list.filter(i => (i.source || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
        }
        if (params.category && params.category !== 'All' && params.category !== 'Select Category') {
            list = list.filter(i => i.category === params.category);
        }
        return list;
    },

    async addIncome(incomeData) {
        const user = this.getUser();
        incomeData.user_id = user.user_id;

        try {
            const res = await fetch(`${API_BASE}/api/income`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(incomeData)
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json;
            }
        } catch {}

        const list = JSON.parse(localStorage.getItem('incomes')) || [];
        incomeData.income_id = Date.now();
        list.unshift(incomeData);
        localStorage.setItem('incomes', JSON.stringify(list));
        return { success: true, message: 'Income added successfully!' };
    },

    async deleteIncome(id) {
        try {
            const res = await fetch(`${API_BASE}/api/income/${id}`, { method: 'DELETE' });
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json;
            }
        } catch {}

        let list = JSON.parse(localStorage.getItem('incomes')) || [];
        list = list.filter(i => i.income_id != id);
        localStorage.setItem('incomes', JSON.stringify(list));
        return { success: true, message: 'Income deleted successfully!' };
    },

    // Expenses
    async getExpenses(params = {}) {
        const user = this.getUser();
        try {
            const query = new URLSearchParams({ user_id: user.user_id, ...params }).toString();
            const res = await fetch(`${API_BASE}/api/expenses?${query}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json.data;
            }
        } catch {}

        let list = JSON.parse(localStorage.getItem('expenses')) || [];
        if (params.search) {
            const q = params.search.toLowerCase();
            list = list.filter(e => (e.title || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q));
        }
        if (params.category && params.category !== 'All' && params.category !== 'Select Category') {
            list = list.filter(e => e.category === params.category);
        }
        return list;
    },

    async addExpense(expenseData) {
        const user = this.getUser();
        expenseData.user_id = user.user_id;

        try {
            const res = await fetch(`${API_BASE}/api/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json;
            }
        } catch {}

        const list = JSON.parse(localStorage.getItem('expenses')) || [];
        expenseData.expense_id = Date.now();
        list.unshift(expenseData);
        localStorage.setItem('expenses', JSON.stringify(list));
        return { success: true, message: 'Expense recorded successfully!' };
    },

    async deleteExpense(id) {
        try {
            const res = await fetch(`${API_BASE}/api/expenses/${id}`, { method: 'DELETE' });
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json;
            }
        } catch {}

        let list = JSON.parse(localStorage.getItem('expenses')) || [];
        list = list.filter(e => e.expense_id != id);
        localStorage.setItem('expenses', JSON.stringify(list));
        return { success: true, message: 'Expense deleted successfully!' };
    },

    // Reports Analytics
    async getReports(params = {}) {
        const user = this.getUser();
        try {
            const query = new URLSearchParams({ user_id: user.user_id, ...params }).toString();
            const res = await fetch(`${API_BASE}/api/reports/analytics?${query}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) return json.data;
            }
        } catch {}

        const incomes = JSON.parse(localStorage.getItem('incomes')) || [];
        const expenses = JSON.parse(localStorage.getItem('expenses')) || [];

        let allTx = [
            ...incomes.map(i => ({ id: i.income_id, date: i.income_date, title: i.source, category: i.category, amount: Number(i.amount), type: 'Income', description: i.description })),
            ...expenses.map(e => ({ id: e.expense_id, date: e.expense_date, title: e.title, category: e.category, amount: Number(e.amount), type: 'Expense', description: e.description }))
        ];

        if (params.month) {
            allTx = allTx.filter(t => t.date && t.date.startsWith(params.month));
        }

        if (params.category && params.category !== 'All' && params.category !== 'All Categories') {
            allTx = allTx.filter(t => t.category === params.category);
        }

        const totalInc = allTx.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
        const totalExp = allTx.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

        // Group category expense breakdown
        const catExpMap = {};
        allTx.filter(t => t.type === 'Expense').forEach(t => {
            catExpMap[t.category] = (catExpMap[t.category] || 0) + t.amount;
        });
        const categoryExpenseBreakdown = Object.keys(catExpMap).map(k => ({ category: k, total: catExpMap[k] }));

        return {
            totalIncome: totalInc,
            totalExpense: totalExp,
            netSavings: totalInc - totalExp,
            categoryExpenseBreakdown,
            monthlyTrends: [
                { month_label: 'Jan', total_income: 40000, total_expense: 25000 },
                { month_label: 'Feb', total_income: 45000, total_expense: 28000 },
                { month_label: 'Mar', total_income: 50000, total_expense: 30000 },
                { month_label: 'Apr', total_income: 47000, total_expense: 27000 },
                { month_label: 'May', total_income: 52000, total_expense: 32000 },
                { month_label: 'Jun', total_income: 50000, total_expense: 29000 }
            ],
            transactions: allTx.sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    },

    // CSV Download
    downloadCSV() {
        window.location.href = `${API_BASE}/api/export/csv`;
    }
};

window.API = API;
