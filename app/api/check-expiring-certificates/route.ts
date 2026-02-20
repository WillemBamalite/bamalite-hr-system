import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

// Zorg dat deze route altijd op de Node.js runtime draait (nodemailer en fs werken niet in Edge)
export const runtime = 'nodejs'

// TEST MODE: Zet deze op false om e-mails daadwerkelijk te versturen
// Zet op true om alleen te testen zonder e-mails te versturen
const TEST_MODE = false

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 ===== Check expiring certificates =====')
    console.log('🏥 API Route aangeroepen - GET request ontvangen')
    
    if (TEST_MODE) {
      console.log('⚠️ ⚠️ ⚠️ TEST MODE ACTIEF - Geen e-mails worden verstuurd, alleen logging ⚠️ ⚠️ ⚠️')
    }
    
    // Test of de route werkt
    console.log('🏥 Route werkt, start Supabase query...')
    
    // Haal alle actieve ziekmeldingen op met crew informatie
    const { data: sickLeaveRecords, error: sickLeaveError } = await supabase
      .from('sick_leave')
      .select(`
        *,
        crew:crew_member_id(*)
      `)
      .in('status', ['actief', 'wacht-op-briefje'])
    
    console.log('🏥 Supabase query voltooid:', { 
      recordsCount: sickLeaveRecords?.length || 0, 
      hasError: !!sickLeaveError,
      error: sickLeaveError ? {
        message: sickLeaveError.message,
        code: sickLeaveError.code,
        details: sickLeaveError.details,
        hint: sickLeaveError.hint
      } : null
    })
    
    if (sickLeaveError) {
      console.error('❌ Error fetching sick leave records:', JSON.stringify(sickLeaveError, null, 2))
      return NextResponse.json(
        { 
          success: false,
          error: 'Fout bij ophalen ziekmeldingen', 
          details: sickLeaveError.message,
          code: sickLeaveError.code,
          hint: sickLeaveError.hint
        },
        { status: 500 }
      )
    }
    
    if (!sickLeaveRecords || sickLeaveRecords.length === 0) {
      console.log('✅ Geen actieve ziekmeldingen gevonden')
      return NextResponse.json({ 
        success: true,
        message: 'Geen actieve ziekmeldingen gevonden',
        expiringCertificates: [],
        emailResults: []
      })
    }
    
    console.log(`📋 ${sickLeaveRecords.length} actieve ziekmeldingen gevonden`)
    
    // Filter ziektebriefjes die binnen 3 dagen verlopen
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiringCertificates = sickLeaveRecords.filter((record: any) => {
      // Moet een certificate_valid_until hebben
      if (!record.certificate_valid_until) return false
      
      const validUntil = new Date(record.certificate_valid_until)
      validUntil.setHours(0, 0, 0, 0)
      
      // Bereken dagen tot expiratie
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // Verstuur mail precies 3 dagen van tevoren
      return daysUntilExpiry === 3
    })
    
    console.log(`⚠️ ${expiringCertificates.length} ziektebriefjes verlopen binnen 3 dagen`)
    
    if (expiringCertificates.length === 0) {
      return NextResponse.json({ 
        message: 'Geen ziektebriefjes verlopen binnen 3 dagen',
        expiringCertificates: []
      })
    }
    
    // Stuur e-mail voor elk expiring certificate
    const emailResults = []
    
    for (const record of expiringCertificates) {
      const crewMember = record.crew
      if (!crewMember) {
        console.warn(`⚠️ Geen crew member gevonden voor record ${record.id}`)
        continue
      }
      
      const validUntil = new Date(record.certificate_valid_until)
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      const crewName = `${crewMember.first_name} ${crewMember.last_name}`
      // Formatteer datum voor weergave in e-mail
      const expiryDateFormatted = validUntil.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      // Formatteer datum voor PDF (DD-MM-YYYY)
      const expiryDateForPDF = validUntil.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      
      const startDate = new Date(record.start_date).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      
      // Haal ship naam op via ship_id
      let shipName = 'Geen schip toegewezen'
      if (crewMember.ship_id) {
        const { data: ship, error: shipError } = await supabase
          .from('crew')
          .select('name')
          .eq('id', crewMember.ship_id)
          .single()
        
        if (!shipError && ship) {
          shipName = ship.name || 'Onbekend schip'
        }
      }
      
      if (TEST_MODE) {
        // In test mode: alleen loggen, geen e-mails versturen
        console.log('📧 [TEST MODE] Zou e-mail versturen naar nautic@bamalite.com voor:', crewName)
        console.log('📧 [TEST MODE] Details:', {
          crewName,
          position: crewMember.position || 'Onbekend',
          expiryDate: expiryDateFormatted,
          daysUntilExpiry,
          startDate,
          shipName
        })
        
        if (crewMember.email) {
          console.log('📧 [TEST MODE] Zou e-mail versturen naar werknemer:', crewMember.email)
          console.log('📧 [TEST MODE] Zou PDF genereren met:', {
            crewName,
            expiryDateForPDF
          })
          
          // Test PDF generatie (zonder te versturen)
          const testPdfBuffer = await generateFilledCertificatePDF(crewName, expiryDateForPDF)
          if (testPdfBuffer) {
            console.log('✅ [TEST MODE] PDF succesvol gegenereerd:', testPdfBuffer.length, 'bytes')
          } else {
            console.warn('⚠️ [TEST MODE] PDF generatie mislukt')
          }
        }
        
        emailResults.push({
          recordId: record.id,
          crewName,
          daysUntilExpiry,
          emailSent: false,
          emailError: 'TEST MODE - Geen e-mail verstuurd',
          testMode: true
        })
      } else {
        // Stuur e-mail naar nautic@bamalite.com (interne notificatie)
        const gmailResult = await sendCertificateExpiryEmail({
          crewName,
          position: crewMember.position || 'Onbekend',
          expiryDate: expiryDateFormatted,
          daysUntilExpiry,
          startDate,
          shipName,
          recipientEmail: 'nautic@bamalite.com',
          crewEmail: crewMember.email || null
        })

        // Stuur ook e-mail naar de werknemer zelf met ingevulde PDF
        if (crewMember.email) {
          const employeeEmailResult = await sendCertificateExpiryEmailToEmployee({
            crewName,
            expiryDate: expiryDateFormatted,
            expiryDateForPDF: expiryDateForPDF,
            daysUntilExpiry,
            recipientEmail: crewMember.email
          })
          
          console.log(`📧 E-mail naar werknemer ${employeeEmailResult.success ? 'verstuurd' : 'mislukt'} voor ${crewName}`)
        }
        
        emailResults.push({
          recordId: record.id,
          crewName,
          daysUntilExpiry,
          emailSent: gmailResult.success,
          emailError: gmailResult.error
        })
      }
      
      emailResults.push({
        recordId: record.id,
        crewName,
        daysUntilExpiry,
        emailSent: gmailResult.success,
        emailError: gmailResult.error
      })
      
      // Deze regel is verplaatst naar binnen de if/else block hierboven
    }
    
    return NextResponse.json({
      success: true,
      message: `${expiringCertificates.length} ziektebriefje(s) gecontroleerd`,
      expiringCertificates: expiringCertificates.map((r: any) => ({
        id: r.id,
        crewName: r.crew ? `${r.crew.first_name} ${r.crew.last_name}` : 'Onbekend',
        expiryDate: r.certificate_valid_until,
        daysUntilExpiry: Math.ceil((new Date(r.certificate_valid_until).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })),
      emailResults,
      totalRecords: sickLeaveRecords.length,
      expiringCount: expiringCertificates.length
    })
    
  } catch (error) {
    console.error('❌ Error in check-expiring-certificates:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        success: false,
        error: 'Server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

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
      // Deze posities zijn schattingen - moet mogelijk aangepast worden op basis van de PDF
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

// Helper functie om e-mail te versturen naar werknemer met ingevulde PDF
async function sendCertificateExpiryEmailToEmployee(params: {
  crewName: string
  expiryDate: string
  expiryDateForPDF: string
  daysUntilExpiry: number
  recipientEmail: string
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { crewName, expiryDate, expiryDateForPDF, daysUntilExpiry, recipientEmail } = params
  
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, '')
  
  if (!gmailUser || !gmailAppPassword) {
    return {
      success: false,
      error: 'Gmail credentials niet ingesteld'
    }
  }
  
  try {
    // Genereer ingevulde PDF
    const pdfBuffer = await generateFilledCertificatePDF(crewName, expiryDateForPDF)
    
    if (!pdfBuffer) {
      console.warn('⚠️ Kon PDF niet genereren, stuur e-mail zonder bijlage')
    }

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
    
    // Bepaal de tekst voor wanneer het verloopt (3 dagen van tevoren)
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
    
    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    console.error('❌ Error sending certificate expiry email to employee:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Helper functie om e-mail te versturen voor ziektebriefje waarschuwing
async function sendCertificateExpiryEmail(params: {
  crewName: string
  position: string
  expiryDate: string
  daysUntilExpiry: number
  startDate: string
  shipName: string
  recipientEmail: string
  crewEmail?: string | null
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { crewName, position, expiryDate, daysUntilExpiry, startDate, shipName, recipientEmail } = params
  
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, '')
  
  if (!gmailUser || !gmailAppPassword) {
    return {
      success: false,
      error: 'Gmail credentials niet ingesteld'
    }
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    })
    
    await transporter.verify()
    
    const urgencyText = daysUntilExpiry === 0 
      ? 'VERLOOPT VANDAAG ⚠️' 
      : daysUntilExpiry === 1 
      ? 'VERLOOPT MORGEN ⚠️' 
      : `Verloopt over ${daysUntilExpiry} dagen`
    
    const subject = daysUntilExpiry === 0
      ? `⚠️ URGENT: Ziektebriefje verloopt VANDAAG - ${crewName}`
      : daysUntilExpiry === 1
      ? `⚠️ URGENT: Ziektebriefje verloopt MORGEN - ${crewName}`
      : `⚠️ Waarschuwing: Ziektebriefje verloopt over ${daysUntilExpiry} dagen - ${crewName}`
    
    const htmlBody = buildCertificateExpiryEmailHTML({
      crewName,
      position,
      expiryDate,
      daysUntilExpiry,
      startDate,
      shipName,
      urgencyText
    })
    
    const textBody = `
WAARSCHUWING: Ziektebriefje verloopt binnenkort

Bemanningslid: ${crewName}
Functie: ${position}
Schip: ${shipName}

${urgencyText}
Verloopt op: ${expiryDate}
Startdatum ziekmelding: ${startDate}

⚠️ ACTIE VEREIST: Zorg ervoor dat er een nieuw ziektebriefje wordt aangeleverd voordat het huidige briefje verloopt.

Je kunt de ziekmelding bekijken in het systeem: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bamalite-hr-system.vercel.app'}/ziekte
    `.trim()
    
    const info = await transporter.sendMail({
      from: gmailUser,
      replyTo: gmailUser,
      to: recipientEmail,
      subject,
      html: htmlBody,
      text: textBody,
      headers: {
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@bamalite-hr-system>`,
        'Date': new Date().toUTCString(),
      },
      date: new Date(),
      encoding: 'utf8',
    })
    
    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    console.error('❌ Error sending certificate expiry email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Helper functie om HTML e-mail body te bouwen voor ziektebriefje waarschuwing
function buildCertificateExpiryEmailHTML(params: {
  crewName: string
  position: string
  expiryDate: string
  daysUntilExpiry: number
  startDate: string
  shipName: string
  urgencyText: string
}): string {
  const { crewName, position, expiryDate, daysUntilExpiry, startDate, shipName, urgencyText } = params
  
  const urgencyColor = daysUntilExpiry <= 1 ? '#dc2626' : '#ea580c'
  const bgColor = daysUntilExpiry <= 1 ? '#fee2e2' : '#fed7aa'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ziektebriefje verloopt</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${daysUntilExpiry <= 1 ? '#991b1b' : '#c2410c'} 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">⚠️ Ziektebriefje Waarschuwing</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">Bamalite HR System</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- Urgency Banner -->
                  <div style="background-color: ${bgColor}; padding: 20px; border-radius: 8px; border-left: 4px solid ${urgencyColor}; margin-bottom: 30px;">
                    <p style="margin: 0; color: ${urgencyColor}; font-size: 20px; font-weight: 600; text-align: center;">${urgencyText}</p>
                  </div>
                  
                  <!-- Details -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 600; color: #374151; font-size: 16px;">Bemanningslid:</span>
                        <span style="color: #1f2937; font-size: 18px; margin-left: 10px;">${crewName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 600; color: #374151; font-size: 16px;">Functie:</span>
                        <span style="color: #1f2937; font-size: 18px; margin-left: 10px;">${position}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 600; color: #374151; font-size: 16px;">Schip:</span>
                        <span style="color: #1f2937; font-size: 18px; margin-left: 10px;">${shipName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 600; color: #374151; font-size: 16px;">Verloopt op:</span>
                        <span style="color: ${urgencyColor}; font-size: 18px; margin-left: 10px; font-weight: 600;">${expiryDate}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0;">
                        <span style="font-weight: 600; color: #374151; font-size: 16px;">Startdatum ziekmelding:</span>
                        <span style="color: #1f2937; font-size: 18px; margin-left: 10px;">${startDate}</span>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Action Required -->
                  <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 30px;">
                    <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">⚠️ ACTIE VEREIST</p>
                    <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">Zorg ervoor dat er een nieuw ziektebriefje wordt aangeleverd voordat het huidige briefje verloopt.</p>
                  </div>
                  
                  <!-- Button -->
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://bamalite-hr-system.vercel.app'}/ziekte" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Bekijk Ziekmelding in Systeem</a>
                  </div>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">Bamalite HR System - Automatische notificatie</p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// Helper functie om e-mail body te bouwen voor ziektebriefje waarschuwing (voor backwards compatibility)
function buildCertificateExpiryEmailBody(params: {
  crewName: string
  position: string
  expiryDate: string
  daysUntilExpiry: number
  startDate: string
  shipName: string
}): string {
  const { crewName, position, expiryDate, daysUntilExpiry, startDate, shipName } = params
  
  const urgencyText = daysUntilExpiry === 0 
    ? 'VERLOOPT VANDAAG ⚠️' 
    : daysUntilExpiry === 1 
    ? 'VERLOOPT MORGEN ⚠️' 
    : `Verloopt over ${daysUntilExpiry} dagen`
  
  return `
WAARSCHUWING: Ziektebriefje verloopt binnenkort

Bemanningslid: ${crewName}
Functie: ${position}
Schip: ${shipName}

${urgencyText}
Verloopt op: ${expiryDate}
Startdatum ziekmelding: ${startDate}

⚠️ ACTIE VEREIST: Zorg ervoor dat er een nieuw ziektebriefje wordt aangeleverd voordat het huidige briefje verloopt.

Je kunt de ziekmelding bekijken in het systeem: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bamalite-hr-system.vercel.app'}/ziekte
  `.trim()
}

