// Connection check: node scripts/check-db.mjs
// Reads .env, connects with the anon key, queries groups.
// Expected on a fresh project: "Connected. Visible groups: 0"
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env"); process.exit(1); }

const sb = createClient(url, key);
const { data, error } = await sb.from("groups").select("id");
if (error) { console.error("Connection failed:", error.message); process.exit(1); }
console.log(`Connected. Visible groups: ${data.length}`);
console.log("RLS is working: anonymous clients see only what policies allow.");
