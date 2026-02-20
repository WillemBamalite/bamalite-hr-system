import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

// Zorg dat deze route altijd op de Node.js runtime draait
export const runtime = 'nodejs'

// Helper functie om ingevulde PDF te genereren
async function generateFilledCertificatePDF(crewName: string, expiryDate: string): Promise<Buffer | null> {
  try {
    // Laad de PDF template
    const templatePath = path.join(process.cwd(), 'public', 'contracts', 'Ziekmelding_Verlenging.pdf')
    
    // Check of het bestand bestaat
    if (!fs.existsSync(templatePath)) {
      console.error('❌ PDF template niet gevonden:', templatePath)
      return null
    }

    const templateBytes = fs.readFileSync(templatePath)
    const pdfDoc = await PDFDocument.load(templateBytes)

    let formFieldsFilled = false

    // Probeer form fields te vinden en in te vullen
    try {
      const form = pdfDoc.getForm()
      const fields = form.getFields()
      
      console.log(`📄 PDF heeft ${fields.length} form fields`)
      
      // Log alle veldnamen voor debugging
      const fieldNames = fields.map(f => f.getName())
      console.log('📄 Beschikbare form fields:', fieldNames.join(', '))
      
      // Mogelijke veldnamen voor naam
      const nameFieldPatterns = ['naam', 'name', 'werknemer', 'employee', 'persoon', 'person']
      // Mogelijke veldnamen voor datum
      const dateFieldPatterns = ['datum', 'date', 'verloopt', 'expires', 'geldig', 'valid']
      
      // Zoek en vul naam veld in
      for (const field of fields) {
        const fieldName = field.getName().toLowerCase()
        
        // Probeer naam veld te vinden
        if (nameFieldPatterns.some(pattern => fieldName.includes(pattern))) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              (field as any).setText(crewName)
              console.log(`✅ Naam ingevuld in veld: ${field.getName()}`)
              formFieldsFilled = true
            }
          } catch (e) {
            console.warn(`⚠️ Kon naam niet invullen in form field ${field.getName()}:`, e)
          }
        }
      }
      
      // Zoek en vul datum veld in
      for (const field of fields) {
        const fieldName = field.getName().toLowerCase()
        
        // Probeer datum veld te vinden
        if (dateFieldPatterns.some(pattern => fieldName.includes(pattern))) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              (field as any).setText(expiryDate)
              console.log(`✅ Datum ingevuld in veld: ${field.getName()}`)
              formFieldsFilled = true
            }
          } catch (e) {
            console.warn(`⚠️ Kon datum niet invullen in form field ${field.getName()}:`, e)
          }
        }
      }
      
      // Als we geen matches vonden, probeer de eerste twee tekstvelden
      if (!formFieldsFilled && fields.length >= 2) {
        try {
          const textFields = fields.filter(f => f.constructor.name === 'PDFTextField')
          if (textFields.length >= 2) {
            (textFields[0] as any).setText(crewName)
            (textFields[1] as any).setText(expiryDate)
            console.log('✅ Naam en datum ingevuld in eerste twee tekstvelden')
            formFieldsFilled = true
          }
        } catch (e) {
          console.warn('⚠️ Kon niet invullen in eerste twee velden:', e)
        }
      }
      
    } catch (formError) {
      console.log('⚠️ Form fields niet beschikbaar of fout:', formError)
    }

    // Als form fields niet werken, probeer tekst te tekenen
    if (!formFieldsFilled) {
      console.log('⚠️ Form fields niet ingevuld, probeer tekst te tekenen...')
      
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width, height } = firstPage.getSize()
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontSize = 12
      
      // Probeer tekst te plaatsen op typische posities
      try {
        // Naam op ongeveer x=100, y=height-200
        firstPage.drawText(crewName, {
          x: 100,
          y: height - 200,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        
        // Datum op ongeveer x=100, y=height-250
        firstPage.drawText(expiryDate, {
          x: 100,
          y: height - 250,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        
        console.log('✅ Tekst getekend op PDF (geschatte posities)')
      } catch (drawError) {
        console.warn('⚠️ Kon tekst niet tekenen op PDF:', drawError)
      }
    }

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
  } catch (error) {
    console.error('❌ Fout bij genereren PDF:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { crewName, expiryDate, expiryDateForPDF, daysUntilExpiry, recipientEmail } = body

    if (!crewName || !expiryDate || !recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Ontbrekende gegevens' },
        { status: 400 }
      )
    }

    const gmailUser = process.env.GMAIL_USER?.trim()
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, '')
    
    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json(
        { success: false, error: 'Gmail credentials niet ingesteld' },
        { status: 500 }
      )
    }

    // Genereer ingevulde PDF
    const pdfBuffer = await generateFilledCertificatePDF(crewName, expiryDateForPDF || expiryDate)

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    })
    
    await transporter.verify()
    
    // Haal alleen voornaam uit volledige naam
    const firstName = crewName.split(' ')[0]
    
    // Bepaal de tekst voor wanneer het verloopt
    const expiryText = daysUntilExpiry === 3 
      ? 'over 3 dagen verloopt ⚠️'
      : daysUntilExpiry === 2
      ? 'over 2 dagen verloopt ⚠️'
      : daysUntilExpiry === 1
      ? 'morgen verloopt ⚠️'
      : 'vandaag verloopt ⚠️'
    
    const subject = `⚠️ Herinnering: Uw ziektebriefje ${expiryText.replace('⚠️', '').trim()}`
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Beste ${firstName},</p>
        <p>Hierbij even een herinnering dat jouw ziektebriefje ${expiryText}</p>
        <p><strong>Verloopt op: ${expiryDate}</strong></p>
        <p>Ben je daarna nog ziek? Stuur ons dan op tijd een nieuw ziektebriefje, zodat alles administratief in orde blijft.</p>
        ${pdfBuffer ? '<p>In de bijlage vind je een document met extra info over het verlengen van je ziektebriefje.</p>' : ''}
        <p>Alvast bedankt 👍</p>
        <p>Met vriendelijke groet,<br>Team Nautic Bamalite</p>
      </div>
    `
    
    const textBody = `
Beste ${firstName},

Hierbij even een herinnering dat jouw ziektebriefje ${expiryText}

Verloopt op: ${expiryDate}

Ben je daarna nog ziek? Stuur ons dan op tijd een nieuw ziektebriefje, zodat alles administratief in orde blijft.
${pdfBuffer ? 'In de bijlage vind je een document met extra info over het verlengen van je ziektebriefje.' : ''}

Alvast bedankt 👍

Met vriendelijke groet,
Team Nautic Bamalite
    `.trim()
    
    const attachments = pdfBuffer ? [{
      filename: `Ziekmelding_Verlenging_${crewName.replace(/\s+/g, '_')}.pdf`,
      content: pdfBuffer
    }] : []
    
    const info = await transporter.sendMail({
      from: gmailUser,
      replyTo: gmailUser,
      to: recipientEmail,
      subject,
      html: htmlBody,
      text: textBody,
      attachments,
      headers: {
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@bamalite-hr-system>`,
        'Date': new Date().toUTCString(),
      },
      date: new Date(),
      encoding: 'utf8',
    })
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId
    })
  } catch (error) {
    console.error('❌ Error sending certificate expiry email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
