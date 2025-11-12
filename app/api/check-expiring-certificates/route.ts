import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 ===== Check expiring certificates =====')
    console.log('🏥 API Route aangeroepen - GET request ontvangen')
    
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
      
      // Verloopt binnen 3 dagen (0, 1, 2, of 3 dagen)
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 3
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
      const expiryDate = validUntil.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
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
      
      // Stuur e-mail via Gmail
      const gmailResult = await sendCertificateExpiryEmail({
        crewName,
        position: crewMember.position || 'Onbekend',
        expiryDate,
        daysUntilExpiry,
        startDate,
        shipName,
        recipientEmail: 'nautic@bamalite.com'
      })
      
      emailResults.push({
        recordId: record.id,
        crewName,
        daysUntilExpiry,
        emailSent: gmailResult.success,
        emailError: gmailResult.error
      })
      
      console.log(`📧 E-mail ${gmailResult.success ? 'verstuurd' : 'mislukt'} voor ${crewName}`)
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

// Helper functie om e-mail te versturen voor ziektebriefje waarschuwing
async function sendCertificateExpiryEmail(params: {
  crewName: string
  position: string
  expiryDate: string
  daysUntilExpiry: number
  startDate: string
  shipName: string
  recipientEmail: string
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

