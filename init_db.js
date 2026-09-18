// =========================================================
// Smart Expense Tracker - Supabase Auto Table Setup
// Called automatically when server starts
// =========================================================
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_KEY || "placeholder",
    { auth: { persistSession: false } }
);

const DEMO_USER = {
    user_id: 1,
    full_name: "Demo Admin",
    email: "demo@example.com",
    mobile: "9876543210",
    password: "admin123"
};

// Seed demo data - tables must exist first
async function seedData() {
    // Insert demo user
    const { error: ue } = await supabase.from("users").upsert([DEMO_USER], { onConflict: "email", ignoreDuplicates: true });
    if (ue) console.log("Users seed:", ue.message); else console.log("✅ Demo user seeded");

    // Insert demo income
    const { error: ie } = await supabase.from("income").upsert([
        { user_id: 1, source: "Monthly Salary",    category: "Salary",      amount: 50000, income_date: "2026-07-01", description: "Monthly Company Salary" },
        { user_id: 1, source: "Freelance Project", category: "Freelancing", amount: 8000,  income_date: "2026-07-05", description: "Web Design Client Payment" },
        { user_id: 1, source: "Stock Dividend",    category: "Investment",  amount: 2500,  income_date: "2026-07-10", description: "Quarterly Dividend" },
        { user_id: 1, source: "Festival Bonus",    category: "Bonus",       amount: 5000,  income_date: "2026-07-12", description: "Mid-year performance bonus" }
    ], { ignoreDuplicates: true });
    if (ie) console.log("Income seed:", ie.message); else console.log("✅ Demo income seeded");

    // Insert demo expenses
    const { error: ee } = await supabase.from("expenses").upsert([
        { user_id: 1, title: "Restaurant Dinner", category: "Food",     amount: 750,  expense_date: "2026-07-12", description: "Family dinner" },
        { user_id: 1, title: "Bike Fuel",         category: "Travel",   amount: 1200, expense_date: "2026-07-11", description: "Petrol refill" },
        { user_id: 1, title: "Electricity Bill",  category: "Bills",    amount: 2300, expense_date: "2026-07-10", description: "Monthly EB Bill" },
        { user_id: 1, title: "Weekend Clothes",   category: "Shopping", amount: 2500, expense_date: "2026-07-09", description: "Shopping mall" },
        { user_id: 1, title: "Groceries",         category: "Food",     amount: 3500, expense_date: "2026-07-07", description: "Supermarket monthly items" }
    ], { ignoreDuplicates: true });
    if (ee) console.log("Expenses seed:", ee.message); else console.log("✅ Demo expenses seeded");

    // Insert budget
    const { error: be } = await supabase.from("budgets").upsert([
        { user_id: 1, month: 7, year: 2026, budget_amount: 40000 }
    ], { onConflict: "user_id,month,year", ignoreDuplicates: true });
    if (be) console.log("Budget seed:", be.message); else console.log("✅ Budget seeded");
}

module.exports = { seedData };

// Run directly if called as main
if (require.main === module) {
    seedData().then(() => {
        console.log("✅ Seed complete");
        process.exit(0);
    }).catch(e => {
        console.error("Seed failed:", e.message);
        process.exit(1);
    });
}
