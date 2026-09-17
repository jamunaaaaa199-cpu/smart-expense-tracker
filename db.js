// =========================================================
// Smart Expense Tracker - Supabase Database Client
// Cloud PostgreSQL via Supabase (replaces SQLite)
// =========================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY env vars not set. Database will not function.");
}

const supabase = createClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_KEY || "placeholder-key",
    {
        auth: { persistSession: false }
    }
);

module.exports = supabase;
