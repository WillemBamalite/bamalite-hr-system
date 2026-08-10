import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const envRaw = fs.readFileSync(path.join(root, ".env.local"), "utf8")
const env = {}
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://ocwraavhrtpvbqlkwnlb.supabase.co"
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const BUCKET = "schepen-klad"
const admin = createClient(url, key, { auth: { persistSession: false } })

const { data: buckets, error: listError } = await admin.storage.listBuckets()
if (listError) {
  console.error("listBuckets:", listError.message)
  process.exit(1)
}

const exists = (buckets || []).some((b) => b.name === BUCKET)
if (!exists) {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024,
  })
  if (error) {
    console.error("createBucket:", error.message)
    process.exit(1)
  }
  console.log("Created bucket", BUCKET)
} else {
  console.log("Bucket already exists:", BUCKET)
}

const empty = {
  placements: {},
  originals: {},
  onBoardFromDates: {},
  healthOverrides: {},
  kladDate: null,
  updatedAt: new Date().toISOString(),
  updatedBy: null,
}

const { data: existing } = await admin.storage.from(BUCKET).list("", { search: "shared.json" })
const hasFile = (existing || []).some((f) => f.name === "shared.json")
if (!hasFile) {
  const { error } = await admin.storage.from(BUCKET).upload(
    "shared.json",
    JSON.stringify(empty),
    { contentType: "application/json", upsert: true }
  )
  if (error) {
    console.error("upload shared.json:", error.message)
    process.exit(1)
  }
  console.log("Seeded shared.json")
} else {
  console.log("shared.json already present")
}
