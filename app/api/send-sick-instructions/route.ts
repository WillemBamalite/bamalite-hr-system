import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import path from "path"
import fs from "fs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, name } = body as { to?: string; name?: string }

    if (!to) {
      return NextResponse.json(
        { error: "Geen e-mailadres opgegeven" },
        { status: 400 }
      )
    }

    const gmailUser = process.env.GMAIL_USER?.trim()
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")

    if (!gmailUser || !gmailAppPassword) {
      console.error("[send-sick-instructions] Gmail credentials ontbreken")
      return NextResponse.json(
        { error: "Gmail credentials niet ingesteld" },
        { status: 500 }
      )
    }

    // Zoek de beschikbare ziekteprocedure-PDF's in /public/contracts
    const contractsDir = path.join(process.cwd(), "public", "contracts")
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

    const attachments = possibleFiles
      .map((fileName) => {
        const fullPath = path.join(contractsDir, fileName)
        if (fs.existsSync(fullPath)) {
          return {
            filename: fileName,
            path: fullPath,
          }
        }
        return null
      })
      .filter(Boolean) as { filename: string; path: string }[]

    if (attachments.length === 0) {
      console.error("[send-sick-instructions] Geen ziekteprocedure-PDF gevonden in public/contracts")
      return NextResponse.json(
        { error: "Geen ziekteprocedure-PDF gevonden op de server" },
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

    const displayName = name || "bemanningslid"

    await transporter.sendMail({
      from: gmailUser,
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
      attachments,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[send-sick-instructions] Fout bij versturen e-mail:", error)
    return NextResponse.json(
      { error: "Serverfout bij versturen ziekte-instructie e-mail" },
      { status: 500 }
    )
  }
}


