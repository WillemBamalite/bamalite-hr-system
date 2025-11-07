import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend only if API key is available
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(request: NextRequest) {
  try {
    console.log('📧 E-mail API route aangeroepen')
    const body = await request.json()
    console.log('📧 Request body:', body)
    const { assignedTo, title, description, priority, deadline, relatedShipName, relatedCrewName } = body

    // Map naam naar e-mailadres (kleine letters)
    const emailMap: { [key: string]: string } = {
      'Leo': 'leo@bamalite.com',
      'Willem': 'willem@bamalite.com',
      'Jos': 'jos@bamalite.com'
    }

    // Voor Nautic: stuur naar alle drie
    let recipientEmails: string[]
    if (assignedTo === 'Nautic') {
      recipientEmails = ['leo@bamalite.com', 'willem@bamalite.com', 'jos@bamalite.com']
      console.log('📧 Nautic taak -> verstuur naar alle drie:', recipientEmails)
    } else {
      const recipientEmail = emailMap[assignedTo]
      if (!recipientEmail) {
        console.error('📧 Onbekende ontvanger:', assignedTo)
        return NextResponse.json(
          { error: 'Onbekende ontvanger', message: `Geen e-mailadres gevonden voor: ${assignedTo}` },
          { status: 400 }
        )
      }
      recipientEmails = [recipientEmail]
      console.log('📧 Ontvanger:', assignedTo, '->', recipientEmail)
    }

    // Check if Resend is configured
    if (!resend || !resendApiKey) {
      console.error('📧 RESEND_API_KEY niet ingesteld')
      return NextResponse.json(
        { 
          error: 'E-mail service niet geconfigureerd',
          message: 'RESEND_API_KEY ontbreekt in environment variables. Zie EMAIL_SETUP.md voor instructies.'
        },
        { status: 503 }
      )
    }
    
    console.log('📧 Resend geconfigureerd, verstuur e-mail...')

    // Bepaal prioriteit badge kleur
    const priorityColors: { [key: string]: string } = {
      'urgent': '🔴 Urgent',
      'hoog': '🟠 Hoog',
      'normaal': '🔵 Normaal',
      'laag': '⚪ Laag'
    }

    const priorityText = priorityColors[priority] || priority

    // Format deadline
    let deadlineText = ''
    if (deadline) {
      const deadlineDate = new Date(deadline)
      deadlineText = deadlineDate.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    // Bouw e-mail body
    let emailBody = `
      <h2 style="color: #1e3a8a; font-size: 24px; margin-bottom: 20px;">Nieuwe taak toegewezen</h2>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #111827; font-size: 18px; margin-bottom: 10px;">${title}</h3>
        
        ${description ? `<p style="color: #4b5563; margin-bottom: 15px;">${description}</p>` : ''}
        
        <div style="margin-top: 15px;">
          <p style="color: #6b7280; margin: 5px 0;"><strong>Prioriteit:</strong> ${priorityText}</p>
          
          ${relatedShipName ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Schip:</strong> ${relatedShipName}</p>` : ''}
          
          ${relatedCrewName ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Bemanningslid:</strong> ${relatedCrewName}</p>` : ''}
          
          ${deadline ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Deadline:</strong> ${deadlineText}</p>` : ''}
        </div>
      </div>
      
      <p style="color: #4b5563; margin-top: 20px;">
        Je kunt deze taak bekijken en beheren in het <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://bamalite-hr-system.vercel.app'}/taken" style="color: #2563eb; text-decoration: underline;">taken overzicht</a>.
      </p>
    `

    // Verstuur e-mail(s)
    // Gebruik onboarding@resend.dev voor testen zonder domein verificatie
    // Voor productie: gebruik je eigen verified domein (bijv. noreply@bamalite.com)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    console.log('📧 Verstuur e-mail van:', fromEmail, 'naar:', recipientEmails)
    
    // Verstuur naar alle ontvangers
    const results = []
    for (const recipientEmail of recipientEmails) {
      try {
        const { data, error } = await resend.emails.send({
          from: `Bamalite HR <${fromEmail}>`,
          to: recipientEmail,
          subject: `Nieuwe taak: ${title}`,
          html: emailBody,
        })

        if (error) {
          console.error(`📧 Error sending email to ${recipientEmail}:`, error)
          results.push({ recipient: recipientEmail, success: false, error })
        } else {
          console.log(`📧 E-mail succesvol verstuurd naar ${recipientEmail}! Message ID:`, data?.id)
          results.push({ recipient: recipientEmail, success: true, messageId: data?.id })
        }
      } catch (err) {
        console.error(`📧 Exception sending email to ${recipientEmail}:`, err)
        results.push({ recipient: recipientEmail, success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

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

