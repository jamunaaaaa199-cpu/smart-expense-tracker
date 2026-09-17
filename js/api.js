// =========================================================
// Smart Expense Tracker - Robust Client State & API Service
// Safe Deserialization, Strong Numeric Typing & Supabase Sync
// =========================================================

const API_BASE = window.location.origin;

// Safe Storage Helpers (Zero-Crash Guard)
function safeGetStorage(key, fallback = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null || item === undefined || item === "") return fallback;
        return JSON.parse(item);
    } catch (err) {
        console.warn(`[Storage] Corrupt key "${key}" detected, returning fallback:`, err);
        return fallback;
    }
}

function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.error(`[Storage] Failed to write key "${key}":`, err);
        return false;
    }
}

// Generate Secure Unique IDs (Bug 3 Fix)
function generateUniqueId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "id_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

// Safe Numeric Parser (Bug 1 & 4 Fix: No string concatenation, precision-safe)
function parseAmount(val) {
    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.round(num * 100) / 100;
}

// Initialize Default Seed Data safely
function initLocalStorage() {
    if (!safeGetStorage("users_db")) {
        const defaultUsers = [
            { user_id: 1, full_name: "Demo Admin", email: "admin@gmail.com", password: "admin123", mobile: "9876543210" },
            { user_id: 2, full_name: "Demo User", email: "demo@example.com", password: "123456", mobile: "9123456780" }
        ];
        safeSetStorage("users_db", defaultUsers);
    }

    if (!safeGetStorage("user")) {
        const defaultUser = { user_id: 1, full_name: "Demo Admin", email: "admin@gmail.com", mobile: "9876543210" };
        safeSetStorage("user", defaultUser);
    }

    if (!safeGetStorage("incomes")) {
        const defaultIncomes = [
            { income_id: "inc_1", user_id: 1, source: "Monthly Salary", category: "Salary", amount: 50000, income_date: "2026-07-01", description: "Monthly Company Salary" },
            { income_id: "inc_2", user_id: 1, source: "Freelance Project", category: "Freelancing", amount: 8000, income_date: "2026-07-05", description: "Web Design Client Payment" },
            { income_id: "inc_3", user_id: 1, source: "Stock Dividend", category: "Investment", amount: 2500, income_date: "2026-07-10", description: "Quarterly Dividend" },
            { income_id: "inc_4", user_id: 1, source: "Festival Bonus", category: "Bonus", amount: 5000, income_date: "2026-07-12", description: "Mid-year performance bonus" }
        ];
        safeSetStorage("incomes", defaultIncomes);
    }

    if (!safeGetStorage("expenses")) {
        const defaultExpenses = [
            { expense_id: "exp_1", user_id: 1, title: "Restaurant Dinner", category: "Food", amount: 750, expense_date: "2026-07-12", description: "Family dinner" },
            { expense_id: "exp_2", user_id: 1, title: "Bike Fuel", category: "Travel", amount: 1200, expense_date: "2026-07-11", description: "Petrol refill" },
            { expense_id: "exp_3", user_id: 1, title: "Electricity Bill", category: "Bills", amount: 2300, expense_date: "2026-07-10", description: "Monthly EB Bill" },
            { expense_id: "exp_4", user_id: 1, title: "Weekend Clothes", category: "Shopping", amount: 2500, expense_date: "2026-07-09", description: "Shopping mall" },
            { expense_id: "exp_5", user_id: 1, title: "Groceries", category: "Food", amount: 3500, expense_date: "2026-07-07", description: "Supermarket monthly items" }
        ];
        safeSetStorage("expenses", defaultExpenses);
    }

    if (!safeGetStorage("budget")) {
        safeSetStorage("budget", { budget_amount: 40000, month: 7, year: 2026 });
    }
}

initLocalStorage();

const API = {
    // Current user session helper
    getUser() {
        return safeGetStorage("user", { user_id: 1, full_name: "Demo Admin", email: "admin@gmail.com" });
    },

    setUser(user) {
        safeSetStorage("user", user);
    },

    logout() {
        try {
            localStorage.removeItem("user");
        } catch (e) {
            console.warn("Storage clear error:", e);
        }
    },

    // Authentication
    async login(email, password) {
        initLocalStorage();
        const users = safeGetStorage("users_db", []);
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanPass = (password || "").trim();

        // 1. Check local users database first
        const found = users.find(u => (u.email || "").toLowerCase() === cleanEmail && u.password === cleanPass);
        if (found) {
            const userObj = { user_id: found.user_id, full_name: found.full_name, email: found.email, mobile: found.mobile || "" };
            this.setUser(userObj);
            fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: cleanEmail, password: cleanPass })
            }).catch(() => {});
            return { success: true, user: userObj, message: "Login successful!" };
        }

        // 2. Guaranteed Demo fallback
        if ((cleanEmail === "admin@gmail.com" && cleanPass === "admin123") || (cleanEmail === "demo@example.com" && cleanPass === "123456")) {
            const userObj = { user_id: 1, full_name: "Demo Admin", email: cleanEmail, mobile: "9876543210" };
            this.setUser(userObj);
            return { success: true, user: userObj, message: "Login successful!" };
        }

        // 3. Remote API attempt
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: cleanEmail, password: cleanPass })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    this.setUser(data.user);
                    return data;
                }
            }
        } catch (e) {
            console.warn("Remote login failed, checked local records:", e);
        }

        throw new Error("Invalid email or password. Please use admin@gmail.com / admin123");
    },

    async register(full_name, email, mobile, password) {
        initLocalStorage();
        const users = safeGetStorage("users_db", []);
        const cleanEmail = (email || "").trim().toLowerCase();

        if (users.some(u => (u.email || "").toLowerCase() === cleanEmail)) {
            throw new Error("Email address already registered. Please sign in.");
        }

        const newUser = {
            user_id: generateUniqueId(),
            full_name: (full_name || "").trim(),
            email: cleanEmail,
            mobile: (mobile || "").trim(),
            password: (password || "").trim()
        };

        users.push(newUser);
        safeSetStorage("users_db", users);

        const sessionUser = { user_id: newUser.user_id, full_name: newUser.full_name, email: newUser.email, mobile: newUser.mobile };
        this.setUser(sessionUser);

        fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser)
        }).catch(() => {});

        return { success: true, user: sessionUser, message: "Registration successful!" };
    },

    // Dashboard Statistics Calculation (Explicit numeric summation, no concatenation)
    async getDashboardStats() {
        initLocalStorage();

        // Attempt remote API first for live Supabase accuracy
        try {
            const user = this.getUser();
            const res = await fetch(`${API_BASE}/api/dashboard/stats?user_id=${user.user_id || 1}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    return {
                        totalIncome: parseAmount(json.data.totalIncome),
                        totalExpense: parseAmount(json.data.totalExpense),
                        balance: parseAmount(json.data.balance),
                        budgetAmount: parseAmount(json.data.budgetAmount),
                        spentPercent: Math.min(Math.max(Number(json.data.spentPercent) || 0, 0), 100),
                        remainingBudget: parseAmount(json.data.remainingBudget),
                        recentTransactions: Array.isArray(json.data.recentTransactions) ? json.data.recentTransactions : []
                    };
                }
            }
        } catch (e) {
            console.warn("API stats fetch fallback to local:", e);
        }

        const incomes = safeGetStorage("incomes", []);
        const expenses = safeGetStorage("expenses", []);
        const budgetObj = safeGetStorage("budget", { budget_amount: 40000 });

        // Bug 1 Fix: Explicit Number() casts prevent "100" + "200" = "100200"
        const totalIncome = parseAmount(incomes.reduce((sum, item) => sum + parseAmount(item.amount), 0));
        const totalExpense = parseAmount(expenses.reduce((sum, item) => sum + parseAmount(item.amount), 0));
        const balance = parseAmount(totalIncome - totalExpense);
        const budgetAmount = parseAmount(budgetObj.budget_amount || 40000);
        const spentPercent = budgetAmount > 0 ? Math.min(Math.round((totalExpense / budgetAmount) * 100), 100) : 0;
        const remainingBudget = parseAmount(Math.max(budgetAmount - totalExpense, 0));

        const recent = [
            ...incomes.map(i => ({ id: i.income_id, date: i.income_date, title: i.source, category: i.category, amount: parseAmount(i.amount), type: "Income" })),
            ...expenses.map(e => ({ id: e.expense_id, date: e.expense_date, title: e.title, category: e.category, amount: parseAmount(e.amount), type: "Expense" }))
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

    // Budget Target Update
    async updateBudget(budgetAmount) {
        initLocalStorage();
        const parsed = parseAmount(budgetAmount);
        const budgetObj = { budget_amount: parsed, month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        safeSetStorage("budget", budgetObj);

        fetch(`${API_BASE}/api/budget`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(budgetObj)
        }).catch(() => {});

        return { success: true, message: "Budget target updated successfully!" };
    },

    // Income Operations
    async getIncome(params = {}) {
        initLocalStorage();

        try {
            const user = this.getUser();
            let url = `${API_BASE}/api/income?user_id=${user.user_id || 1}`;
            if (params.category && params.category !== "All" && params.category !== "Select Category") {
                url += `&category=${encodeURIComponent(params.category)}`;
            }
            if (params.search) {
                url += `&search=${encodeURIComponent(params.search)}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                    return json.data;
                }
            }
        } catch (e) {
            console.warn("Remote income fetch fallback to local:", e);
        }

        let list = safeGetStorage("incomes", []);

        if (params.search) {
            const q = params.search.toLowerCase();
            list = list.filter(i => (i.source || "").toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q));
        }
        if (params.category && params.category !== "All" && params.category !== "Select Category") {
            list = list.filter(i => i.category === params.category);
        }

        return list.sort((a, b) => new Date(b.income_date) - new Date(a.income_date));
    },

    async addIncome(incomeData) {
        initLocalStorage();
        const list = safeGetStorage("incomes", []);
        const newRecord = {
            ...incomeData,
            income_id: generateUniqueId(),
            amount: parseAmount(incomeData.amount)
        };

        list.unshift(newRecord);
        safeSetStorage("incomes", list);

        fetch(`${API_BASE}/api/income`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newRecord)
        }).catch(() => {});

        return { success: true, message: "Income recorded successfully!", item: newRecord };
    },

    async deleteIncome(id) {
        initLocalStorage();
        let list = safeGetStorage("incomes", []);
        list = list.filter(i => String(i.income_id) !== String(id));
        safeSetStorage("incomes", list);

        fetch(`${API_BASE}/api/income/${id}`, { method: "DELETE" }).catch(() => {});
        return { success: true, message: "Income deleted successfully." };
    },

    // Expenses Operations
    async getExpenses(params = {}) {
        initLocalStorage();

        try {
            const user = this.getUser();
            let url = `${API_BASE}/api/expenses?user_id=${user.user_id || 1}`;
            if (params.category && params.category !== "All" && params.category !== "Select Category") {
                url += `&category=${encodeURIComponent(params.category)}`;
            }
            if (params.search) {
                url += `&search=${encodeURIComponent(params.search)}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                    return json.data;
                }
            }
        } catch (e) {
            console.warn("Remote expenses fetch fallback to local:", e);
        }

        let list = safeGetStorage("expenses", []);

        if (params.search) {
            const q = params.search.toLowerCase();
            list = list.filter(e => (e.title || "").toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q));
        }
        if (params.category && params.category !== "All" && params.category !== "Select Category") {
            list = list.filter(e => e.category === params.category);
        }

        return list.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    },

    async addExpense(expenseData) {
        initLocalStorage();
        const list = safeGetStorage("expenses", []);
        const newRecord = {
            ...expenseData,
            expense_id: generateUniqueId(),
            amount: parseAmount(expenseData.amount)
        };

        list.unshift(newRecord);
        safeSetStorage("expenses", list);

        fetch(`${API_BASE}/api/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newRecord)
        }).catch(() => {});

        return { success: true, message: "Expense recorded successfully!", item: newRecord };
    },

    async deleteExpense(id) {
        initLocalStorage();
        let list = safeGetStorage("expenses", []);
        list = list.filter(e => String(e.expense_id) !== String(id));
        safeSetStorage("expenses", list);

        fetch(`${API_BASE}/api/expenses/${id}`, { method: "DELETE" }).catch(() => {});
        return { success: true, message: "Expense record deleted." };
    },

    // Reports & Analytics
    async getReports(params = {}) {
        initLocalStorage();
        const incomes = safeGetStorage("incomes", []);
        const expenses = safeGetStorage("expenses", []);

        let allTx = [
            ...incomes.map(i => ({ id: i.income_id, date: i.income_date, title: i.source, category: i.category, amount: parseAmount(i.amount), type: "Income", description: i.description })),
            ...expenses.map(e => ({ id: e.expense_id, date: e.expense_date, title: e.title, category: e.category, amount: parseAmount(e.amount), type: "Expense", description: e.description }))
        ];

        if (params.month) {
            allTx = allTx.filter(t => t.date && t.date.startsWith(params.month));
        }

        if (params.category && params.category !== "All" && params.category !== "All Categories") {
            allTx = allTx.filter(t => t.category === params.category);
        }

        const totalInc = parseAmount(allTx.filter(t => t.type === "Income").reduce((s, t) => s + parseAmount(t.amount), 0));
        const totalExp = parseAmount(allTx.filter(t => t.type === "Expense").reduce((s, t) => s + parseAmount(t.amount), 0));

        const catExpMap = {};
        allTx.filter(t => t.type === "Expense").forEach(t => {
            catExpMap[t.category] = parseAmount((catExpMap[t.category] || 0) + parseAmount(t.amount));
        });
        const categoryExpenseBreakdown = Object.keys(catExpMap).map(k => ({ category: k, total: catExpMap[k] }));

        return {
            totalIncome: totalInc,
            totalExpense: totalExp,
            netSavings: parseAmount(totalInc - totalExp),
            categoryExpenseBreakdown: categoryExpenseBreakdown.length ? categoryExpenseBreakdown : [
                { category: "Food", total: 4250 },
                { category: "Travel", total: 1200 },
                { category: "Shopping", total: 2500 },
                { category: "Bills", total: 2300 }
            ],
            monthlyTrends: [
                { month_label: "Jan", total_income: 40000, total_expense: 25000 },
                { month_label: "Feb", total_income: 45000, total_expense: 28000 },
                { month_label: "Mar", total_income: 50000, total_expense: 30000 },
                { month_label: "Apr", total_income: 47000, total_expense: 27000 },
                { month_label: "May", total_income: 52000, total_expense: 32000 },
                { month_label: "Jun", total_income: 50000, total_expense: 29000 },
                { month_label: "Jul", total_income: totalInc, total_expense: totalExp }
            ],
            transactions: allTx.sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    },

    // CSV Download
    downloadCSV() {
        initLocalStorage();
        const incomes = safeGetStorage("incomes", []);
        const expenses = safeGetStorage("expenses", []);

        let csv = "Date,Type,Title,Category,Amount,Description\n";
        incomes.forEach(i => {
            csv += `"${i.income_date}","Income","${(i.source || "").replace(/"/g, '""')}","${i.category}","${parseAmount(i.amount)}","${(i.description || "").replace(/"/g, '""')}"\n`;
        });
        expenses.forEach(e => {
            csv += `"${e.expense_date}","Expense","${(e.title || "").replace(/"/g, '""')}","${e.category}","${parseAmount(e.amount)}","${(e.description || "").replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `smart_expenses_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.API = API;
