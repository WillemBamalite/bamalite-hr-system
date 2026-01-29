import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

// Zorg dat deze route altijd op de Node.js runtime draait (nodemailer werkt niet in Edge)
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("📧 [send-sick-instructions] API route aangeroepen")
    const body = await request.json()
    const { to, name } = body as { to?: string; name?: string }

    console.log("📧 [send-sick-instructions] Request body:", { to, name })

    if (!to) {
      console.error("📧 [send-sick-instructions] ❌ Geen e-mailadres opgegeven")
      return NextResponse.json(
        { error: "Geen e-mailadres opgegeven" },
        { status: 400 }
      )
    }

    const gmailUser = process.env.GMAIL_USER?.trim()
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")

    console.log("📧 [send-sick-instructions] Gmail user:", gmailUser ? `${gmailUser.substring(0, 3)}***` : "NIET INGESTELD")
    console.log("📧 [send-sick-instructions] Gmail app password:", gmailAppPassword ? "***INGESTELD***" : "NIET INGESTELD")

    if (!gmailUser || !gmailAppPassword) {
      console.error("📧 [send-sick-instructions] ❌ Gmail credentials ontbreken")
      return NextResponse.json(
        { error: "Gmail credentials niet ingesteld", message: "GMAIL_USER en/of GMAIL_APP_PASSWORD ontbreken in environment variables" },
        { status: 500 }
      )
    }

    // Zoek de beschikbare ziekteprocedure-PDF's via publieke URL (werkt ook op Vercel)
    // Gebruik altijd de actuele origin van de request als basis, tenzij expliciet NEXT_PUBLIC_APP_URL is gezet
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    console.log("📧 [send-sick-instructions] Gebruik base URL voor attachments:", baseUrl)

    const possibleFiles = [
      "Ziekmelding_procedures_nl.pdf",
      "Ziekmelding_procedures_de.pdf",
      "Ziekmelding_procedures_en.pdf",
      "Ziekmelding_procedure_nl.pdf",
      "Ziekmelding_procedure_de.pdf",
      "Ziekmelding_procedure_en.pdf",
      "Ziekmelding_procedures.pdf",
      "Ziekmelding_procedure.pdf",
    ]

    const attachments: { filename: string; path: string }[] = []

    for (const fileName of possibleFiles) {
      const url = `${baseUrl}/contracts/${fileName}`
      try {
        const head = await fetch(url, { method: "HEAD" })
        if (head.ok) {
          attachments.push({
            filename: fileName,
            path: url,
          })
          console.log("📧 [send-sick-instructions] ✅ PDF gevonden (via URL):", url)
        } else {
          console.log("📧 [send-sick-instructions] PDF niet gevonden (status", head.status, "):", url)
        }
      } catch (fileError) {
        console.warn("📧 [send-sick-instructions] ⚠️ Fout bij controleren van", url, ":", fileError)
      }
    }

    if (attachments.length === 0) {
      console.error("📧 [send-sick-instructions] ❌ Geen ziekteprocedure-PDF gevonden via publieke URL")
      console.error("📧 [send-sick-instructions] Geprobeerde bestanden:", possibleFiles)

      return NextResponse.json(
        { error: "Geen ziekteprocedure-PDF gevonden op de server", message: "Zorg ervoor dat de PDF bestanden in public/contracts staan" },
        { status: 500 }
      )
    }

    console.log("📧 [send-sick-instructions] Maak transporter aan...")
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    console.log("📧 [send-sick-instructions] Verifieer transporter verbinding...")
    await transporter.verify()
    console.log("📧 [send-sick-instructions] ✅ Transporter verbinding succesvol!")

    const displayName = name || "bemanningslid"

    console.log("📧 [send-sick-instructions] Verstuur e-mail naar:", to)
    console.log("📧 [send-sick-instructions] Aantal attachments:", attachments.length)

    const info = await transporter.sendMail({
      from: gmailUser,
      replyTo: gmailUser,
      to,
      subject: "Ziekmelding - belangrijke informatie en procedures",
      text: [
        `Beste ${displayName},`,
        "",
        "Hierbij ontvang je de documenten met de afspraken en procedures rondom ziekmelding.",
        "Lees deze instructies zorgvuldig door.",
        "",
        "Met vriendelijke groet,",
        "Bamalite HR",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Beste ${displayName},</p>
          <p>Hierbij ontvang je de documenten met de afspraken en procedures rondom ziekmelding.</p>
          <p>Lees deze instructies zorgvuldig door.</p>
          <p>Met vriendelijke groet,<br>Bamalite HR</p>
        </div>
      `,
      attachments,
    })

    console.log("📧 [send-sick-instructions] ✅ E-mail succesvol verstuurd!")
    console.log("📧 [send-sick-instructions] Message ID:", info.messageId)
    console.log("📧 [send-sick-instructions] Response:", info.response)

    return NextResponse.json({ 
      success: true, 
      message: `E-mail verstuurd naar ${to} met ${attachments.length} bijlage(n)`,
      messageId: info.messageId 
    })
  } catch (error) {
    console.error("📧 [send-sick-instructions] ❌ Fout bij versturen e-mail:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("📧 [send-sick-instructions] Error details:", JSON.stringify(error, null, 2))
    
    return NextResponse.json(
      { 
        error: "Serverfout bij versturen ziekte-instructie e-mail",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


