import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local")
  const raw = fs.readFileSync(envPath, "utf8")
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "")
  }
  return out
}

const env = loadEnvLocal()
const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://ocwraavhrtpvbqlkwnlb.supabase.co"
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const sql = fs.readFileSync(path.join(__dirname, "create-newsletter-editions.sql"), "utf8")
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const probe = await admin.from("newsletter_editions").select("id").limit(1)
if (!probe.error) {
  console.log("newsletter_editions already exists")
  process.exit(0)
}

console.log("Table missing:", probe.error.message)

const attempts = [{ sql }, { query: sql }, { sql_query: sql }]
let created = false
for (const args of attempts) {
  const { error } = await admin.rpc("exec_sql", args)
  if (!error) {
    created = true
    console.log("Created via exec_sql", Object.keys(args)[0])
    break
  }
  console.log("exec_sql failed with", Object.keys(args)[0], error.message)
}

if (!created) {
  console.error("Run scripts/create-newsletter-editions.sql in the Supabase SQL Editor.")
  process.exit(2)
}

const check = await admin.from("newsletter_editions").select("id").limit(1)
if (check.error) {
  console.error("Table still missing:", check.error.message)
  process.exit(2)
}
console.log("newsletter_editions ready")
