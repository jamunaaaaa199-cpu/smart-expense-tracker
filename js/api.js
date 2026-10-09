// =========================================================
// Smart Expense Tracker - Robust Client State & API Service
// Safe Deserialization, Strong Numeric Typing & Supabase Sync
// =========================================================

const API_BASE = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
    ? window.location.origin 
    : ((typeof window !== "undefined" && window.location.origin.includes("vercel.app")) 
        ? window.location.origin 
        : "https://expenseflow-app-alpha.vercel.app");

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

// Generate Secure Unique IDs (Point 3 Fix)
function generateUniqueId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "id_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

// Integer Paise Math Helpers (Zero Floating-Point IEEE 754 Drift)
function toPaise(val) {
    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.round(num * 100);
}

function fromPaise(paise) {
    return Number((paise / 100).toFixed(2));
}

const MAX_TRANSACTION_AMOUNT = 10000000.00; // ₹10,000,000.00 maximum boundary

// Safe Numeric Parser with Double-Decimal Paise Precision & Max Bound
function parseAmount(val) {
    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num)) return 0;
    const clamped = Math.max(0, Math.min(num, MAX_TRANSACTION_AMOUNT));
    return fromPaise(toPaise(clamped));
}

// Disarm CSV Formula Injection
function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    return `"${str}"`;
}

// // Clean Storage Initializer (Zero Fake Data)
function initLocalStorage() {
    if (!safeGetStorage("users_db")) {
        safeSetStorage("users_db", []);
    }
    if (!safeGetStorage("incomes")) {
        safeSetStorage("incomes", []);
    }
    if (!safeGetStorage("expenses")) {
        safeSetStorage("expenses", []);
    }
}

initLocalStorage();

const API = {
    getUser() {
        return safeGetStorage("user", null);
    },

    setUser(user) {
        if (user) {
            safeSetStorage("user", user);
        } else {
            try { localStorage.removeItem("user"); } catch (e) {}
        }
    },

    getToken() {
        return safeGetStorage("auth_token", null);
    },

    setToken(token) {
        if (token) {
            safeSetStorage("auth_token", token);
        } else {
            try { localStorage.removeItem("auth_token"); } catch (e) {}
        }
    },

    getAuthHeaders() {
        const token = this.getToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return headers;
    },

    logout() {
        try {
            localStorage.removeItem("user");
            localStorage.removeItem("auth_token");
        } catch (e) {
            console.warn("Storage clear error:", e);
        }
    },

    async login(email, password) {
        initLocalStorage();
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanPass = (password || "").trim();

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: cleanEmail, password: cleanPass })
            });
            const data = await res.json();
            if (res.ok && data.success && data.user) {
                this.setUser(data.user);
                if (data.token) this.setToken(data.token);
                return data;
            } else {
                throw new Error(data.message || "Invalid email or password.");
            }
        } catch (e) {
            // Local fallback if server unreachable
            const users = safeGetStorage("users_db", []);
            const found = users.find(u => (u.email || "").toLowerCase() === cleanEmail && u.password === cleanPass);
            if (found) {
                const userObj = { user_id: found.user_id, full_name: found.full_name, email: found.email, mobile: found.mobile || "" };
                this.setUser(userObj);
                return { success: true, user: userObj, message: "Login successful!" };
            }
            throw new Error(e.message || "Invalid email or password.");
        }
    },

    async register(full_name, email, mobile, password) {
        initLocalStorage();
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanPass = (password || "").trim();
        const cleanName = (full_name || "").trim();
        const cleanMobile = (mobile || "").trim();

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: cleanName,
                    email: cleanEmail,
                    mobile: cleanMobile,
                    password: cleanPass
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.user) {
                this.setUser(data.user);
                if (data.token) this.setToken(data.token);
                const users = safeGetStorage("users_db", []);
                users.push({ ...data.user, password: cleanPass });
                safeSetStorage("users_db", users);
                return data;
            } else {
                throw new Error(data.message || "Registration failed.");
            }
        } catch (e) {
            const users = safeGetStorage("users_db", []);
            if (users.some(u => (u.email || "").toLowerCase() === cleanEmail)) {
                throw new Error("Email address already registered. Please sign in.");
            }
            const newUser = {
                user_id: Date.now(),
                full_name: cleanName,
                email: cleanEmail,
                mobile: cleanMobile,
                password: cleanPass
            };
            users.push(newUser);
            safeSetStorage("users_db", users);
            const sessionUser = { user_id: newUser.user_id, full_name: newUser.full_name, email: newUser.email, mobile: newUser.mobile };
            this.setUser(sessionUser);
            return { success: true, user: sessionUser, message: "Registration successful!" };
        }
    },

    async getDashboardStats() {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) {
            return {
                totalIncome: 0,
                totalExpense: 0,
                balance: 0,
                budgetAmount: 0,
                spentPercent: 0,
                remainingBudget: 0,
                recentTransactions: []
            };
        }

        try {
            const res = await fetch(`${API_BASE}/api/dashboard/stats?user_id=${user.user_id}`, {
                headers: this.getAuthHeaders()
            });
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

        // Offline fallback: ONLY this user's records!
        const allIncomes = safeGetStorage("incomes", []);
        const allExpenses = safeGetStorage("expenses", []);
        const incomes = allIncomes.filter(i => String(i.user_id) === String(user.user_id));
        const expenses = allExpenses.filter(e => String(e.user_id) === String(user.user_id));
        const userBudget = safeGetStorage(`budget_${user.user_id}`, safeGetStorage("budget", { budget_amount: 0 }));

        const totalIncome = parseAmount(incomes.reduce((sum, item) => sum + parseAmount(item.amount), 0));
        const totalExpense = parseAmount(expenses.reduce((sum, item) => sum + parseAmount(item.amount), 0));
        const balance = parseAmount(totalIncome - totalExpense);
        const budgetAmount = parseAmount(userBudget.budget_amount || 0);
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

    async updateBudget(budgetAmount) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        const parsed = parseAmount(budgetAmount);
        const budgetObj = { user_id: user.user_id, budget_amount: parsed, month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        safeSetStorage(`budget_${user.user_id}`, budgetObj);
        safeSetStorage("budget", budgetObj);

        fetch(`${API_BASE}/api/budget`, {
            method: "POST",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(budgetObj)
        }).catch(() => {});

        return { success: true, message: "Budget target updated successfully!" };
    },

    async getIncome(params = {}) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) return [];

        try {
            let url = `${API_BASE}/api/income?user_id=${user.user_id}`;
            if (params.category && params.category !== "All" && params.category !== "Select Category") {
                url += `&category=${encodeURIComponent(params.category)}`;
            }
            if (params.search) {
                url += `&search=${encodeURIComponent(params.search)}`;
            }
            const res = await fetch(url, { headers: this.getAuthHeaders() });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    return json.data;
                }
            }
        } catch (e) {
            console.warn("Remote income fetch fallback to local:", e);
        }

        // Local fallback: strictly this user's records
        let list = safeGetStorage("incomes", []).filter(i => String(i.user_id) === String(user.user_id));

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
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        const list = safeGetStorage("incomes", []);
        const newRecord = {
            ...incomeData,
            user_id: user.user_id,
            income_id: generateUniqueId(),
            amount: parseAmount(incomeData.amount)
        };

        list.unshift(newRecord);
        safeSetStorage("incomes", list);

        fetch(`${API_BASE}/api/income`, {
            method: "POST",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(newRecord)
        }).catch(() => {});

        return { success: true, message: "Income recorded successfully!", item: newRecord };
    },

    async updateIncome(id, updatedData) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        let list = safeGetStorage("incomes", []);
        const idx = list.findIndex(i => String(i.income_id) === String(id) && String(i.user_id) === String(user.user_id));
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updatedData, amount: parseAmount(updatedData.amount) };
            safeSetStorage("incomes", list);
        }

        fetch(`${API_BASE}/api/income/${id}`, {
            method: "PUT",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(updatedData)
        }).catch(() => {});

        return { success: true, message: "Income updated successfully!" };
    },

    async deleteIncome(id) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        let list = safeGetStorage("incomes", []);
        list = list.filter(i => !(String(i.income_id) === String(id) && String(i.user_id) === String(user.user_id)));
        safeSetStorage("incomes", list);

        fetch(`${API_BASE}/api/income/${id}`, {
            method: "DELETE",
            headers: this.getAuthHeaders()
        }).catch(() => {});

        return { success: true, message: "Income deleted successfully." };
    },

    async getExpenses(params = {}) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) return [];

        try {
            let url = `${API_BASE}/api/expenses?user_id=${user.user_id}`;
            if (params.category && params.category !== "All" && params.category !== "Select Category") {
                url += `&category=${encodeURIComponent(params.category)}`;
            }
            if (params.search) {
                url += `&search=${encodeURIComponent(params.search)}`;
            }
            const res = await fetch(url, { headers: this.getAuthHeaders() });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    return json.data;
                }
            }
        } catch (e) {
            console.warn("Remote expenses fetch fallback to local:", e);
        }

        // Local fallback: strictly this user's records
        let list = safeGetStorage("expenses", []).filter(e => String(e.user_id) === String(user.user_id));

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
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        const list = safeGetStorage("expenses", []);
        const newRecord = {
            ...expenseData,
            user_id: user.user_id,
            expense_id: generateUniqueId(),
            amount: parseAmount(expenseData.amount)
        };

        list.unshift(newRecord);
        safeSetStorage("expenses", list);

        fetch(`${API_BASE}/api/expenses`, {
            method: "POST",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(newRecord)
        }).catch(() => {});

        return { success: true, message: "Expense recorded successfully!", item: newRecord };
    },

    async updateExpense(id, updatedData) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        let list = safeGetStorage("expenses", []);
        const idx = list.findIndex(e => String(e.expense_id) === String(id) && String(e.user_id) === String(user.user_id));
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updatedData, amount: parseAmount(updatedData.amount) };
            safeSetStorage("expenses", list);
        }

        fetch(`${API_BASE}/api/expenses/${id}`, {
            method: "PUT",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(updatedData)
        }).catch(() => {});

        return { success: true, message: "Expense updated successfully!" };
    },

    async deleteExpense(id) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) throw new Error("Please sign in first.");

        let list = safeGetStorage("expenses", []);
        list = list.filter(e => !(String(e.expense_id) === String(id) && String(e.user_id) === String(user.user_id)));
        safeSetStorage("expenses", list);

        fetch(`${API_BASE}/api/expenses/${id}`, {
            method: "DELETE",
            headers: this.getAuthHeaders()
        }).catch(() => {});

        return { success: true, message: "Expense record deleted." };
    },

    // Reports & Analytics
    async getReports(params = {}) {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) {
            return {
                totalIncome: 0,
                totalExpense: 0,
                netSavings: 0,
                categoryExpenseBreakdown: [],
                monthlyTrends: [],
                transactions: []
            };
        }

        try {
            let url = `${API_BASE}/api/reports/analytics?user_id=${user.user_id}`;
            if (params.month) url += `&month=${encodeURIComponent(params.month)}`;
            const res = await fetch(url, { headers: this.getAuthHeaders() });
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    return json.data;
                }
            }
        } catch (e) {
            console.warn("API reports fetch fallback to local:", e);
        }

        const allIncomes = safeGetStorage("incomes", []);
        const allExpenses = safeGetStorage("expenses", []);
        let incomes = allIncomes.filter(i => String(i.user_id) === String(user.user_id));
        let expenses = allExpenses.filter(e => String(e.user_id) === String(user.user_id));

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
            categoryExpenseBreakdown,
            monthlyTrends: [],
            transactions: allTx.sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    },

    // CSV Data Export (Filtered Strictly to Active User)
    downloadCSV() {
        initLocalStorage();
        const user = this.getUser();
        if (!user || !user.user_id) {
            alert("Please sign in to export your transactions.");
            return;
        }

        const incomes = safeGetStorage("incomes", []).filter(i => String(i.user_id) === String(user.user_id));
        const expenses = safeGetStorage("expenses", []).filter(e => String(e.user_id) === String(user.user_id));

        let csv = "Date,Type,Title,Category,Amount,Description\n";
        incomes.forEach(i => {
            csv += `${sanitizeCsvCell(i.income_date)},"Income",${sanitizeCsvCell(i.source)},${sanitizeCsvCell(i.category)},"${parseAmount(i.amount).toFixed(2)}",${sanitizeCsvCell(i.description)}\n`;
        });
        expenses.forEach(e => {
            csv += `${sanitizeCsvCell(e.expense_date)},"Expense",${sanitizeCsvCell(e.title)},${sanitizeCsvCell(e.category)},"${parseAmount(e.amount).toFixed(2)}",${sanitizeCsvCell(e.description)}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `my_expenses_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.API = API;
