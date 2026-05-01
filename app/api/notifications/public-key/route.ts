import { NextResponse } from "next/server"

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
  const testModeRaw = (process.env.NOTIFICATIONS_TEST_MODE || "").toLowerCase().trim()
  const testMode = testModeRaw === "true" || testModeRaw === "1" || testModeRaw === "yes"
  return NextResponse.json({ publicKey: key, testMode })
}
