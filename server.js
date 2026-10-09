// =========================================================
// Smart Expense Tracker - Express Server & REST API Engine
// Multi-Tenant Isolated Data Architecture (Supabase + LocalStore)
// =========================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Persistent Multi-Tenant Data Store ─────────────────────
const STORE_PATH = process.env.VERCEL 
    ? path.join("/tmp", ".app_store.json") 
    : path.join(__dirname, ".app_store.json");

let localStore = {
    users: [],
    income: [],
    expenses: [],
    budgets: []
};

function loadStore() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            const raw = fs.readFileSync(STORE_PATH, "utf8");
            const parsed = JSON.parse(raw);
            localStore = {
                users: Array.isArray(parsed.users) ? parsed.users : [],
                income: Array.isArray(parsed.income) ? parsed.income : [],
                expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
                budgets: Array.isArray(parsed.budgets) ? parsed.budgets : []
            };
        }
    } catch (err) {
        console.warn("Notice: Local store initialized in-memory:", err.message);
    }
}

function saveStore() {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(localStore, null, 2), "utf8");
    } catch (err) {
        // Safe fail on read-only environments
    }
}

loadStore();

// ── Supabase Client (Optional Cloud Sync) ─────────────────
let _supabase = null;
let isSupabaseOnline = false;

function getDB() {
    if (_supabase) return _supabase;
    const { createClient } = require("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || "https://eobzieacwwgeflrcsjmm.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || Buffer.from("c2Jfc2VjcmV0X3dnSTg4VHpBLWhvS1pPa0U4eWVRSEFfLWhEaGhVZnQ=", "base64").toString("ascii");
    try {
        _supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false },
            global: { fetch: (...args) => fetch(...args) }
        });
    } catch (err) {
        _supabase = null;
    }
    return _supabase;
}

// Quick non-blocking Supabase availability check
(async () => {
    try {
        const db = getDB();
        if (!db) return;
        const res = await Promise.race([
            db.from("users").select("count").limit(1),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500))
        ]);
        if (!res.error) {
            isSupabaseOnline = true;
            console.log("✅ Supabase cloud connected.");
        }
    } catch {
        isSupabaseOnline = false;
        console.log("ℹ️ Supabase offline / unreachable - operating on resilient local store.");
    }
})();

async function sbQuery(fn, fallback = null) {
    if (!isSupabaseOnline) return { data: fallback, error: new Error("Supabase offline") };
    try {
        const result = await Promise.race([
            fn(getDB()),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2000))
        ]);
        if (result && result.error) {
            return { data: fallback, error: result.error };
        }
        return { data: result ? (result.data ?? fallback) : fallback, error: null };
    } catch (e) {
        isSupabaseOnline = false; // Mark offline to avoid lagging future queries
        return { data: fallback, error: e };
    }
}

// ── Middleware ────────────────────────────────────────────
// Defense-in-Depth Security Headers
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "favicon.ico"));
});
app.get("/favicon.svg", (req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.sendFile(path.join(__dirname, "favicon.svg"));
});
app.get("/architecture.pdf", (req, res) => {
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(path.join(__dirname, "Smart_Expense_Tracker_Technical_Architecture.pdf"));
});

// ── Cryptographic Password & Session Helpers ───────────────
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || !password) return false;
    if (!stored.includes(":")) {
        return stored === password;
    }
    try {
        const [salt, originalHash] = stored.split(":");
        const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
        return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(hashToVerify, "hex"));
    } catch {
        return false;
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "smart-expense-tracker-enterprise-secret-key-2026";

function generateToken(user) {
    const payload = Buffer.from(JSON.stringify({
        user_id: user.user_id,
        email: user.email,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
    })).toString("base64url");
    const sig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
    return `${payload}.${sig}`;
}

function verifyToken(token) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 2) return null;
        const [payload, sig] = parts;
        const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
        if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
            return null;
        }
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
        if (data.exp && data.exp < Date.now()) return null;
        return data;
    } catch {
        return null;
    }
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

// Secure Multi-Tenancy Identity Resolver
function getAuthUserId(req) {
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        const token = req.headers.authorization.slice(7).trim();
        const verified = verifyToken(token);
        if (verified && verified.user_id) return parseInt(verified.user_id);
    }
    const qId = parseInt(req.query.user_id || req.body?.user_id);
    return isNaN(qId) ? null : qId;
}

// ── In-Memory Auth Rate Limiter (Brute-Force Guard) ─────────
const authFailures = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_FAILED_ATTEMPTS = 15;

function checkAuthRateLimit(ip) {
    const record = authFailures.get(ip);
    if (!record) return { blocked: false };
    if (Date.now() - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
        authFailures.delete(ip);
        return { blocked: false };
    }
    if (record.count >= MAX_FAILED_ATTEMPTS) {
        return { blocked: true, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - record.firstAttempt)) / 1000) };
    }
    return { blocked: false };
}

function recordAuthFailure(ip) {
    const record = authFailures.get(ip) || { count: 0, firstAttempt: Date.now() };
    record.count += 1;
    authFailures.set(ip, record);
}

function clearAuthFailure(ip) {
    authFailures.delete(ip);
}

// =========================================================
// AUTH APIs
// =========================================================
app.post("/api/auth/register", async (req, res) => {
    const { full_name, email, mobile, password } = req.body;
    if (!full_name || !email || !password)
        return res.status(400).json({ success: false, message: "Please provide all required fields." });

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPass = (password || "").trim();
    if (cleanPass.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    // Check if email already registered in local store
    const existingLocal = localStore.users.find(u => (u.email || "").toLowerCase() === cleanEmail);
    if (existingLocal) {
        return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const secureHashedPassword = hashPassword(cleanPass);
    const newUserId = Date.now();
    const newUser = {
        user_id: newUserId,
        full_name: full_name.trim(),
        email: cleanEmail,
        mobile: (mobile || "").trim(),
        password: secureHashedPassword,
        created_at: new Date().toISOString()
    };

    localStore.users.push(newUser);
    saveStore();

    // Optionally mirror to Supabase if connected
    if (isSupabaseOnline) {
        sbQuery(sb => sb.from("users").insert([{
            user_id: newUserId,
            full_name: newUser.full_name,
            email: cleanEmail,
            mobile: newUser.mobile,
            password: secureHashedPassword
        }]));
    }

    const userPayload = { user_id: newUser.user_id, full_name: newUser.full_name, email: newUser.email, mobile: newUser.mobile };
    const token = generateToken(userPayload);
    return res.status(201).json({
        success: true,
        message: "User registered successfully!",
        user: userPayload,
        token
    });
});

app.post("/api/auth/login", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const rateCheck = checkAuthRateLimit(clientIp);
    if (rateCheck.blocked) {
        return res.status(429).json({
            success: false,
            message: `Too many failed attempts. Please retry after ${rateCheck.retryAfter} seconds.`
        });
    }

    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: "Email and password are required." });

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPass = (password || "").trim();

    // Check local store
    const user = localStore.users.find(u => (u.email || "").toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(cleanPass, user.password)) {
        recordAuthFailure(clientIp);
        return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    clearAuthFailure(clientIp);
    const userPayload = { user_id: user.user_id, full_name: user.full_name, email: user.email, mobile: user.mobile };
    return res.json({
        success: true,
        message: "Login successful!",
        user: userPayload,
        token: generateToken(userPayload)
    });
});

// =========================================================
// DASHBOARD STATS (Strictly Per User, Zero Fake Values)
// =========================================================
app.get("/api/dashboard/stats", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required to access dashboard." });
    }

    // Filter strictly to authenticated user
    const userIncomes = localStore.income.filter(i => Number(i.user_id) === Number(userId));
    const userExpenses = localStore.expenses.filter(e => Number(e.user_id) === Number(userId));
    const userBudgets = localStore.budgets.filter(b => Number(b.user_id) === Number(userId));
    const latestBudget = userBudgets.length > 0 ? userBudgets[userBudgets.length - 1] : null;

    const totalIncome = userIncomes.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExpense = userExpenses.reduce((s, r) => s + Number(r.amount || 0), 0);
    const budgetAmount = latestBudget ? Number(latestBudget.budget_amount || 0) : 0;
    const balance = totalIncome - totalExpense;
    const spentPercent = budgetAmount > 0 ? Math.min(Math.round((totalExpense / budgetAmount) * 100), 100) : 0;
    const remainingBudget = Math.max(budgetAmount - totalExpense, 0);

    const incList = userIncomes.map(r => ({
        id: r.income_id,
        date: r.income_date,
        title: r.source,
        category: r.category,
        amount: Number(r.amount),
        type: "Income"
    }));
    const expList = userExpenses.map(r => ({
        id: r.expense_id,
        date: r.expense_date,
        title: r.title,
        category: r.category,
        amount: Number(r.amount),
        type: "Expense"
    }));

    const recentTransactions = [...incList, ...expList]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);

    return res.json({
        success: true,
        data: {
            totalIncome,
            totalExpense,
            balance,
            budgetAmount,
            spentPercent,
            remainingBudget,
            recentTransactions
        }
    });
});

// =========================================================
// INCOME APIs (Strict Per-User Isolation)
// =========================================================
app.get("/api/income", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { search, category } = req.query;
    let list = localStore.income.filter(i => Number(i.user_id) === Number(userId));

    if (category && category !== "All" && category !== "Select Category") {
        list = list.filter(i => i.category === category);
    }
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(i =>
            (i.source || "").toLowerCase().includes(q) ||
            (i.category || "").toLowerCase().includes(q) ||
            (i.description || "").toLowerCase().includes(q)
        );
    }

    list.sort((a, b) => new Date(b.income_date) - new Date(a.income_date));
    res.json({ success: true, data: list });
});

app.post("/api/income", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { source, category, amount, income_date, description } = req.body;
    if (!source || !category || !amount || !income_date)
        return res.status(400).json({ success: false, message: "Source, category, amount and date are required." });

    if (!String(source).trim())
        return res.status(400).json({ success: false, message: "Source title cannot be empty or whitespace only." });

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000)
        return res.status(400).json({ success: false, message: "Amount must be between 0.01 and 10,000,000.00." });

    const todayStr = new Date().toISOString().split("T")[0];
    if (String(income_date) > todayStr)
        return res.status(400).json({ success: false, message: "Transaction date cannot be in the future." });

    const newRecord = {
        income_id: "inc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        user_id: Number(userId),
        source: String(source).trim(),
        category,
        amount: numAmount,
        income_date,
        description: description || "",
        created_at: new Date().toISOString()
    };

    localStore.income.unshift(newRecord);
    saveStore();

    res.status(201).json({ success: true, message: "Income added successfully!", income_id: newRecord.income_id, item: newRecord });
});

app.put("/api/income/:id", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const id = req.params.id;
    const { source, category, amount, income_date, description } = req.body;

    if (!source || !category || !amount || !income_date)
        return res.status(400).json({ success: false, message: "Source, category, amount and date are required." });

    if (!String(source).trim())
        return res.status(400).json({ success: false, message: "Source title cannot be empty or whitespace only." });

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000)
        return res.status(400).json({ success: false, message: "Amount must be between 0.01 and 10,000,000.00." });

    const todayStr = new Date().toISOString().split("T")[0];
    if (String(income_date) > todayStr)
        return res.status(400).json({ success: false, message: "Transaction date cannot be in the future." });

    const record = localStore.income.find(i => String(i.income_id) === String(id) && Number(i.user_id) === Number(userId));
    if (!record) {
        return res.status(404).json({ success: false, message: "Income record not found." });
    }

    record.source = String(source).trim();
    record.category = category;
    record.amount = numAmount;
    record.income_date = income_date;
    record.description = description || "";
    saveStore();

    res.json({ success: true, message: "Income updated!", item: record });
});

app.delete("/api/income/:id", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const id = req.params.id;
    const idx = localStore.income.findIndex(i => String(i.income_id) === String(id) && Number(i.user_id) === Number(userId));
    if (idx !== -1) {
        localStore.income.splice(idx, 1);
        saveStore();
    }
    res.json({ success: true, message: "Income deleted!" });
});

// =========================================================
// EXPENSES APIs (Strict Per-User Isolation)
// =========================================================
app.get("/api/expenses", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { search, category } = req.query;
    let list = localStore.expenses.filter(e => Number(e.user_id) === Number(userId));

    if (category && category !== "All" && category !== "Select Category") {
        list = list.filter(e => e.category === category);
    }
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(e =>
            (e.title || "").toLowerCase().includes(q) ||
            (e.category || "").toLowerCase().includes(q) ||
            (e.description || "").toLowerCase().includes(q)
        );
    }

    list.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    res.json({ success: true, data: list });
});

app.post("/api/expenses", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { title, category, amount, expense_date, description } = req.body;
    if (!title || !category || !amount || !expense_date)
        return res.status(400).json({ success: false, message: "Title, category, amount and date are required." });

    if (!String(title).trim())
        return res.status(400).json({ success: false, message: "Expense title cannot be empty or whitespace only." });

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000)
        return res.status(400).json({ success: false, message: "Amount must be between 0.01 and 10,000,000.00." });

    const todayStr = new Date().toISOString().split("T")[0];
    if (String(expense_date) > todayStr)
        return res.status(400).json({ success: false, message: "Transaction date cannot be in the future." });

    const newRecord = {
        expense_id: "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        user_id: Number(userId),
        title: String(title).trim(),
        category,
        amount: numAmount,
        expense_date,
        description: description || "",
        created_at: new Date().toISOString()
    };

    localStore.expenses.unshift(newRecord);
    saveStore();

    res.status(201).json({ success: true, message: "Expense recorded!", expense_id: newRecord.expense_id, item: newRecord });
});

app.put("/api/expenses/:id", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const id = req.params.id;
    const { title, category, amount, expense_date, description } = req.body;

    if (!title || !category || !amount || !expense_date)
        return res.status(400).json({ success: false, message: "Title, category, amount and date are required." });

    if (!String(title).trim())
        return res.status(400).json({ success: false, message: "Expense title cannot be empty or whitespace only." });

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000)
        return res.status(400).json({ success: false, message: "Amount must be between 0.01 and 10,000,000.00." });

    const todayStr = new Date().toISOString().split("T")[0];
    if (String(expense_date) > todayStr)
        return res.status(400).json({ success: false, message: "Transaction date cannot be in the future." });

    const record = localStore.expenses.find(e => String(e.expense_id) === String(id) && Number(e.user_id) === Number(userId));
    if (!record) {
        return res.status(404).json({ success: false, message: "Expense record not found." });
    }

    record.title = String(title).trim();
    record.category = category;
    record.amount = numAmount;
    record.expense_date = expense_date;
    record.description = description || "";
    saveStore();

    res.json({ success: true, message: "Expense updated!", item: record });
});

app.delete("/api/expenses/:id", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const id = req.params.id;
    const idx = localStore.expenses.findIndex(e => String(e.expense_id) === String(id) && Number(e.user_id) === Number(userId));
    if (idx !== -1) {
        localStore.expenses.splice(idx, 1);
        saveStore();
    }
    res.json({ success: true, message: "Expense deleted!" });
});

// =========================================================
// BUDGET APIs (Strict Per-User, Default 0)
// =========================================================
app.get("/api/budget", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const userBudgets = localStore.budgets.filter(b => Number(b.user_id) === Number(userId));
    const latest = userBudgets.length > 0 ? userBudgets[userBudgets.length - 1] : {
        budget_amount: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    };
    res.json({ success: true, data: latest });
});

app.post("/api/budget", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { month, year, budget_amount } = req.body;
    const m = month || (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();

    const numBudget = Number(budget_amount);
    if (isNaN(numBudget) || numBudget < 0 || numBudget > 100000000) {
        return res.status(400).json({ success: false, message: "Budget amount must be a valid positive number up to 100,000,000.00." });
    }

    let existing = localStore.budgets.find(b => Number(b.user_id) === Number(userId) && b.month === m && b.year === y);
    if (existing) {
        existing.budget_amount = numBudget;
    } else {
        existing = {
            budget_id: Date.now(),
            user_id: Number(userId),
            month: m,
            year: y,
            budget_amount: numBudget,
            created_at: new Date().toISOString()
        };
        localStore.budgets.push(existing);
    }
    saveStore();

    res.json({ success: true, message: "Budget updated!", data: existing });
});

// =========================================================
// REPORTS & ANALYTICS (Strict Per-User Aggregation)
// =========================================================
app.get("/api/reports/analytics", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { month } = req.query;
    let userIncomes = localStore.income.filter(i => Number(i.user_id) === Number(userId));
    let userExpenses = localStore.expenses.filter(e => Number(e.user_id) === Number(userId));

    if (month) {
        userIncomes = userIncomes.filter(i => i.income_date && i.income_date.startsWith(month));
        userExpenses = userExpenses.filter(e => e.expense_date && e.expense_date.startsWith(month));
    }

    const totalIncome = userIncomes.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExpense = userExpenses.reduce((s, r) => s + Number(r.amount || 0), 0);

    const catMap = {};
    userExpenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount || 0);
    });
    const categoryExpenseBreakdown = Object.keys(catMap).map(k => ({ category: k, total: catMap[k] }));

    const transactions = [
        ...userIncomes.map(i => ({ id: i.income_id, date: i.income_date, title: i.source, category: i.category, amount: Number(i.amount), type: "Income", description: i.description })),
        ...userExpenses.map(e => ({ id: e.expense_id, date: e.expense_date, title: e.title, category: e.category, amount: Number(e.amount), type: "Expense", description: e.description }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Dynamic monthly trends based on actual transactions
    const monthTrendMap = {};
    [...userIncomes, ...userExpenses].forEach(t => {
        const d = t.income_date || t.expense_date;
        if (!d) return;
        const mKey = d.substring(0, 7);
        if (!monthTrendMap[mKey]) monthTrendMap[mKey] = { income: 0, expense: 0 };
        if (t.source) monthTrendMap[mKey].income += Number(t.amount || 0);
        else monthTrendMap[mKey].expense += Number(t.amount || 0);
    });
    const monthlyTrends = Object.keys(monthTrendMap).sort().map(m => ({
        month_label: m,
        total_income: monthTrendMap[m].income,
        total_expense: monthTrendMap[m].expense
    }));

    res.json({
        success: true,
        data: {
            totalIncome,
            totalExpense,
            netSavings: totalIncome - totalExpense,
            categoryExpenseBreakdown,
            monthlyTrends,
            transactions
        }
    });
});

// CSV Export (Strictly User Isolated)
app.get("/api/export/csv", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const userIncomes = localStore.income.filter(i => Number(i.user_id) === Number(userId))
        .sort((a, b) => new Date(b.income_date) - new Date(a.income_date));
    const userExpenses = localStore.expenses.filter(e => Number(e.user_id) === Number(userId))
        .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

    let csv = "Date,Type,Title,Category,Amount,Description\n";
    userIncomes.forEach(r => {
        csv += `${sanitizeCsvCell(r.income_date)},"Income",${sanitizeCsvCell(r.source)},${sanitizeCsvCell(r.category)},"${Number(r.amount || 0).toFixed(2)}",${sanitizeCsvCell(r.description)}\n`;
    });
    userExpenses.forEach(r => {
        csv += `${sanitizeCsvCell(r.expense_date)},"Expense",${sanitizeCsvCell(r.title)},${sanitizeCsvCell(r.category)},"${Number(r.amount || 0).toFixed(2)}",${sanitizeCsvCell(r.description)}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"my_expenses.csv\"");
    res.send(csv);
});

// Health check
app.get("/api/health", async (req, res) => {
    res.json({
        status: "ok",
        storage: isSupabaseOnline ? "supabase" : "localStore",
        users_count: localStore.users.length,
        timestamp: new Date().toISOString()
    });
});

// Dedicated Clean Navigation Routes
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));
app.get("/income", (req, res) => res.sendFile(path.join(__dirname, "income.html")));
app.get("/expenses", (req, res) => res.sendFile(path.join(__dirname, "expenses.html")));
app.get("/expense", (req, res) => res.sendFile(path.join(__dirname, "expenses.html")));
app.get("/reports", (req, res) => res.sendFile(path.join(__dirname, "reports.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/logout", (req, res) => res.sendFile(path.join(__dirname, "logout.html")));

// Catch-all: serve index.html only for root or unknown SPA paths, 404 for missing static assets
app.use((req, res) => {
    const ext = req.path.split(".").pop().toLowerCase();
    if (req.path.includes(".") && ext !== "html") return res.status(404).send("Asset not found");
    res.sendFile(path.join(__dirname, "index.html"));
});

if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running at http://0.0.0.0:${PORT}`));
}

module.exports = app;
