import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sendViaGmail } from '@/lib/email-service'

// Initialize Resend only if API key is available
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(request: NextRequest) {
  try {
    console.log('📧 ===== E-mail API route aangeroepen =====')
    const body = await request.json()
    console.log('📧 Request body:', JSON.stringify(body, null, 2))
    const { assignedTo, title, description, priority, deadline, relatedShipName, relatedCrewName, createdBy } = body
    
    // Log de assignedTo waarde expliciet
    console.log('📧 assignedTo waarde:', assignedTo)
    console.log('📧 assignedTo type:', typeof assignedTo)
    console.log('📧 assignedTo === "Nautic":', assignedTo === 'Nautic')

    // Map naam naar e-mailadres (case-insensitive)
    const emailMap: { [key: string]: string } = {
      'leo': 'leo@bamalite.com',
      'willem': 'willem@bamalite.com',
      'jos': 'jos@bamalite.com'
    }

    // Normaliseer assignedTo naar lowercase voor case-insensitive matching
    const assignedToLower = assignedTo?.toLowerCase().trim()

    // Voor Nautic: stuur naar alle vier (willem, leo, jos en bart)
    // Check ook op "nautic@bamalite.com" voor het geval dat een e-mailadres wordt doorgegeven
    let recipientEmails: string[]
    if (assignedToLower === 'nautic' || assignedToLower === 'nautic@bamalite.com') {
      recipientEmails = ['willem@bamalite.com', 'leo@bamalite.com', 'jos@bamalite.com', 'bart@bamalite.com']
      console.log('📧 ✅ NAUTIC TAAK GEDETECTEERD -> verstuur naar alle vier:', recipientEmails)
      console.log('📧 ✅ Original assignedTo:', assignedTo, '-> normalized:', assignedToLower)
    } else {
      const recipientEmail = emailMap[assignedToLower || '']
      if (!recipientEmail) {
        console.error('📧 ❌ Onbekende ontvanger:', assignedTo, '(normalized:', assignedToLower, ')')
        console.error('📧 Beschikbare opties:', Object.keys(emailMap).join(', '), 'of Nautic')
        return NextResponse.json(
          { error: 'Onbekende ontvanger', message: `Geen e-mailadres gevonden voor: ${assignedTo}` },
          { status: 400 }
        )
      }
      recipientEmails = [recipientEmail]
      console.log('📧 Enkele ontvanger:', assignedTo, '(normalized:', assignedToLower, ') ->', recipientEmail)
    }
    
    console.log('📧 Finale recipientEmails array:', recipientEmails)
    console.log('📧 Aantal ontvangers:', recipientEmails.length)

    // Kies tussen Resend en Gmail op basis van environment variable
    // Standaard: Resend (oude functionaliteit blijft werken)
    // Als USE_GMAIL_EMAIL=true, gebruik Gmail in plaats van Resend
    const useGmail = process.env.USE_GMAIL_EMAIL === 'true'
    console.log('📧 Environment check:')
    console.log('📧   USE_GMAIL_EMAIL:', process.env.USE_GMAIL_EMAIL)
    console.log('📧   useGmail (boolean):', useGmail)
    console.log('📧   GMAIL_USER:', process.env.GMAIL_USER ? `${process.env.GMAIL_USER.substring(0, 3)}***` : 'NIET INGESTELD')
    console.log('📧   GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***INGESTELD***' : 'NIET INGESTELD')
    
    if (useGmail) {
      // Gebruik Gmail SMTP
      console.log('📧 ✅ Gmail mode geactiveerd, verstuur via Gmail SMTP...')
      const gmailResult = await sendViaGmail({
        assignedTo,
        title,
        description: description || '',
        priority,
        deadline: deadline || null,
        relatedShipName: relatedShipName || null,
        relatedCrewName: relatedCrewName || null,
        recipientEmails,
        createdBy: createdBy || null
      })
      
      console.log('📧 Gmail result:', JSON.stringify(gmailResult, null, 2))
      
      if (gmailResult.success) {
        return NextResponse.json(gmailResult)
      } else {
        console.error('📧 ❌ Gmail sending failed:', gmailResult.error)
        return NextResponse.json(
          { error: gmailResult.error, message: gmailResult.message, results: gmailResult.results },
          { status: 500 }
        )
      }
    } else {
      console.log('📧 ⚠️ Gmail mode NIET geactiveerd, gebruik Resend...')
    }
    
    // Standaard: Resend (oude code blijft intact - NIETS GEWIJZIGD)
    // Check if Resend is configured
    if (!resend || !resendApiKey) {
      console.error('📧 RESEND_API_KEY niet ingesteld')
      console.error('📧 Environment check:', {
        hasResend: !!resend,
        hasApiKey: !!resendApiKey,
        apiKeyLength: resendApiKey?.length || 0,
        useGmail: useGmail,
        nodeEnv: process.env.NODE_ENV
      })
      return NextResponse.json(
        { 
          error: 'E-mail service niet geconfigureerd',
          message: 'RESEND_API_KEY ontbreekt in environment variables. Voeg deze toe in Vercel Settings → Environment Variables. Zie EMAIL_SETUP.md voor instructies.',
          hint: 'Voor Vercel: Ga naar Project Settings → Environment Variables en voeg RESEND_API_KEY toe. OF: Zet USE_GMAIL_EMAIL=true voor Gmail.'
        },
        { status: 503 }
      )
    }
    
    console.log('📧 Resend geconfigureerd, verstuur e-mail...')

    // Gebruik gedeelde functie voor e-mail body (Resend code blijft intact)
    const { buildEmailBody } = await import('@/lib/email-service')
    const emailBody = buildEmailBody({
      assignedTo,
      title,
      description: description || '',
      priority,
      deadline: deadline || null,
      relatedShipName: relatedShipName || null,
      relatedCrewName: relatedCrewName || null,
      recipientEmails,
      createdBy: createdBy || null
    })

    // Verstuur e-mail(s)
    // Gebruik onboarding@resend.dev voor testen zonder domein verificatie
    // Voor productie: gebruik je eigen verified domein (bijv. noreply@bamalite.com)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    console.log('📧 Verstuur e-mail van:', fromEmail, 'naar:', recipientEmails)
    
    // Verstuur naar alle ontvangers
    console.log(`📧 Gaat ${recipientEmails.length} e-mail(s) versturen naar:`, recipientEmails.join(', '))
    const results = []
    
    for (const recipientEmail of recipientEmails) {
      try {
        console.log(`📧 Verstuur nu naar: ${recipientEmail}`)
        const { data, error } = await resend.emails.send({
          from: `Bamalite HR <${fromEmail}>`,
          to: recipientEmail,
          subject: `Nieuwe taak: ${title}`,
          html: emailBody,
        })

        if (error) {
          console.error(`❌ Error sending email to ${recipientEmail}:`, JSON.stringify(error, null, 2))
          results.push({ recipient: recipientEmail, success: false, error: error })
        } else {
          console.log(`✅ E-mail succesvol verstuurd naar ${recipientEmail}! Message ID:`, data?.id)
          results.push({ recipient: recipientEmail, success: true, messageId: data?.id })
        }
      } catch (err) {
        console.error(`❌ Exception sending email to ${recipientEmail}:`, err)
        const errorMsg = err instanceof Error ? err.message : String(err)
        results.push({ recipient: recipientEmail, success: false, error: errorMsg })
      }
    }
    
    console.log(`📧 Verstuur resultaten:`, JSON.stringify(results, null, 2))

    // Check of alle e-mails zijn verstuurd
    const allSuccess = results.every(r => r.success)
    const someSuccess = results.some(r => r.success)

    if (allSuccess) {
      return NextResponse.json({ 
        success: true, 
        message: `E-mails verstuurd naar ${results.length} ontvanger(s)`,
        results 
      })
    } else if (someSuccess) {
      return NextResponse.json({ 
        success: true, 
        message: `E-mails gedeeltelijk verstuurd (${results.filter(r => r.success).length}/${results.length})`,
        results 
      }, { status: 207 }) // 207 Multi-Status
    } else {
      return NextResponse.json(
        { 
          error: 'Fout bij versturen e-mails', 
          message: 'Geen e-mails konden worden verstuurd',
          results
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in send-task-email API:', error)
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

