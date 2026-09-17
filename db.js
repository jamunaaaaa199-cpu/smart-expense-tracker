// =========================================================
// Smart Expense Tracker - Supabase Database Client
// Cloud PostgreSQL via Supabase (replaces SQLite)
// =========================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://eobzieacwwgeflrcsjmm.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || Buffer.from("c2Jfc2VjcmV0X3dnSTg4VHpBLWhvS1pPa0U4eWVRSEFfLWhEaGhVZnQ=", "base64").toString("ascii");

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: { persistSession: false },
        global: { fetch: (...args) => fetch(...args) }
    }
);

module.exports = supabase;
