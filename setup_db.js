require("dotenv").config();
const { Client } = require("pg");

// Supabase direct postgres connection
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// We need to try the transaction pooler (port 6543) 
// Project ref: eobzieacwwgeflrcsjmm

// Try using the service key as password for the supabase API connection approach
const PROJECT_REF = "eobzieacwwgeflrcsjmm";

async function tryMgmtAPI(sql) {
    // Try Supabase's internal SQL endpoint (works with service key in some versions)
    const endpoints = [
        `https://${PROJECT_REF}.supabase.co/pg/query`,
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    ];
    
    for (const url of endpoints) {
        console.log("Trying:", url);
        const r = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_KEY,
                "apikey": process.env.SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ query: sql })
        }).catch(e => null);
        
        if (r) {
            const t = await r.text();
            console.log("Status:", r.status, "| Body:", t.slice(0, 200));
            if (r.status === 200 || r.status === 201) return true;
        }
    }
    return false;
}

tryMgmtAPI("SELECT 1 as test").then(ok => {
    if (!ok) console.log("\nNeed direct DB password. Cannot auto-create tables via API.");
}).catch(console.error);
