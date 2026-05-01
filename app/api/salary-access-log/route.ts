import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { requireApiAccess } from "@/lib/api-security"
import { sendPushToRecipients, shouldDispatch } from "@/lib/notifications/push-server"

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || ""
  if (!auth.toLowerCase().startsWith("bearer ")) return null
  return auth.slice(7).trim() || null
}

async function getUserEmailFromToken(token: string | null): Promise<string> {
  if (!token) return ""
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://ocwraavhrtpvbqlkwnlb.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04"

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await supabase.auth.getUser(token)
  return String(data?.user?.email || "").toLowerCase()
}

function nameFromEmail(email: string): string {
  const local = (email || "").split("@")[0] || "Onbekend"
  return local.charAt(0).toUpperCase() + local.slice(1)
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for") || ""
  if (xff) return xff.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  return realIp || "onbekend"
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const callerEmail = await getUserEmailFromToken(token)
    if (!callerEmail) {
      return NextResponse.json({ success: false, error: "Geen gebruiker gevonden" }, { status: 401 })
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Mailconfig ontbreekt",
          message: "Controleer RESEND_API_KEY in .env.local",
        },
        { status: 500 }
      )
    }

    const ip = getClientIp(request)
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, "0")
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const yy = String(now.getFullYear()).slice(-2)
    const hh = String(now.getHours()).padStart(2, "0")
    const mi = String(now.getMinutes()).padStart(2, "0")
    const when = `${dd}/${mm}/${yy} om ${hh}:${mi}`

    const displayName = nameFromEmail(callerEmail)
    const subject = `Salarislijst login: ${displayName}`
    const text =
      `${displayName} is zojuist ingelogd in de salarislijst op ${when} via IP-adres ${ip}.\n` +
      `Gebruiker: ${callerEmail}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #fff; font-size: 20px;">Salarislijst loginmelding</h1>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
          <p style="margin: 0 0 14px; color: #111827; font-size: 15px;">
            <strong>${displayName}</strong> is zojuist ingelogd in de salarislijst.
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Datum/tijd</td><td style="padding: 8px 0; font-weight: 600;">${when}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">IP-adres</td><td style="padding: 8px 0; font-weight: 600;">${ip}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Gebruiker</td><td style="padding: 8px 0; font-weight: 600;">${callerEmail}</td></tr>
          </table>
        </div>
      </div>
    `

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "auth@bamalite-login.com"
    const { error: sendError } = await resend.emails.send({
      from: `Bemanningslijst <${fromEmail}>`,
      to: ["leo@bamalite.com", "willem@bamalite.com"],
      subject,
      html,
      text,
    })
    if (sendError) {
      return NextResponse.json(
        { success: false, error: sendError.message || "Resend verzenden mislukt" },
        { status: 500 }
      )
    }

    const eventKey = `salary-login:${callerEmail}:${now.toISOString().slice(0, 16)}`
    if (shouldDispatch(eventKey)) {
      try {
        await sendPushToRecipients({
          title: "Salarislijst login",
          body: `${displayName} is ingelogd in de salarislijst (${when}).`,
          url: "/meldingen",
          eventKey,
        })
      } catch (pushErr) {
        console.error("Push salary login mislukt:", pushErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

