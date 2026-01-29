import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import path from "path"
import fs from "fs"

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

    // Zoek de beschikbare ziekteprocedure-PDF's in /public/contracts
    const contractsDir = path.join(process.cwd(), "public", "contracts")
    console.log("📧 [send-sick-instructions] Zoek PDF's in:", contractsDir)
    
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

    const attachments: { filename: string; content: Buffer }[] = []
    
    for (const fileName of possibleFiles) {
      const fullPath = path.join(contractsDir, fileName)
      try {
        if (fs.existsSync(fullPath)) {
          const fileContent = fs.readFileSync(fullPath)
          attachments.push({
            filename: fileName,
            content: fileContent,
          })
          console.log("📧 [send-sick-instructions] ✅ PDF gevonden:", fileName)
        }
      } catch (fileError) {
        console.warn("📧 [send-sick-instructions] ⚠️ Fout bij lezen van", fileName, ":", fileError)
      }
    }

    if (attachments.length === 0) {
      console.error("📧 [send-sick-instructions] ❌ Geen ziekteprocedure-PDF gevonden in public/contracts")
      console.error("📧 [send-sick-instructions] Gezochte bestanden:", possibleFiles)
      console.error("📧 [send-sick-instructions] Contracts directory:", contractsDir)
      console.error("📧 [send-sick-instructions] Directory exists:", fs.existsSync(contractsDir))
      
      // Probeer directory listing
      try {
        const files = fs.readdirSync(contractsDir)
        console.error("📧 [send-sick-instructions] Bestanden in contracts directory:", files)
      } catch (dirError) {
        console.error("📧 [send-sick-instructions] Kan directory niet lezen:", dirError)
      }
      
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


