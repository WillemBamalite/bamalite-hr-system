import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireApiAccess } from "@/lib/api-security"
import nodemailer from "nodemailer"

const KARINA_EMAIL = "karina@bamalite.com"

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

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const callerEmail = await getUserEmailFromToken(token)
    if (callerEmail !== KARINA_EMAIL) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const monthKey = String(body?.monthKey || "")
    const company = String(body?.company || "")
    const readableScope = company ? `${company} (${monthKey})` : monthKey

    const gmailUser = process.env.GMAIL_USER?.trim()
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Mailconfig ontbreekt",
          message:
            "Controleer GMAIL_USER en GMAIL_APP_PASSWORD in .env.local en herstart de server.",
        },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    await transporter.verify()

    const subject = `Salarissen klaar voor controle - ${readableScope || "onbekende maand"}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 21px;">Salarissen klaar voor controle</h1>
          <p style="color: #dbeafe; margin: 8px 0 0; font-size: 13px;">Bamalite HR System</p>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
          <p style="margin: 0 0 14px; color: #1f2937; font-size: 15px;">
            Karina heeft de salarissen klaargezet voor controle.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Maand:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${monthKey || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Firma:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${company || "Alle firmas / niet gespecificeerd"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Ingediend door:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${callerEmail || "onbekend"}</td>
            </tr>
          </table>
          <a href="${appUrl}/bemanning/loon-bemerkingen" style="display: inline-block; background-color: #2563eb; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Ga naar Bemanningslijst
          </a>
        </div>
      </div>
    `

    const text = [
      "Salarissen klaar voor controle",
      "",
      "Karina heeft de salarissen klaargezet.",
      `Maand: ${monthKey || "-"}`,
      `Firma: ${company || "Alle firmas / niet gespecificeerd"}`,
      `Ingediend door: ${callerEmail || "onbekend"}`,
      "",
      `Ga naar Bemanningslijst: ${appUrl}/bemanning/loon-bemerkingen`,
    ].join("\n")

    await transporter.sendMail({
      from: `"Bemanningslijst" <${gmailUser}>`,
      to: "willem@bamalite.com",
      subject,
      html,
      text,
      headers: {
        "Message-ID": `<${Date.now()}-salary-ready@bamalite-hr-system>`,
        Date: new Date().toUTCString(),
      },
      date: new Date(),
      encoding: "utf8",
    })

    return NextResponse.json({
      success: true,
      message: "Testmail succesvol verstuurd naar willem@bamalite.com",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

