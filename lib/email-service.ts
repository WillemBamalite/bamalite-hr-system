import nodemailer from 'nodemailer'
import { Resend } from 'resend'

interface EmailParams {
  assignedTo: string
  title: string
  description: string
  priority: string
  deadline: string | null
  relatedShipName: string | null
  relatedCrewName: string | null
  recipientEmails: string[]
  createdBy: string | null
}

interface EmailResult {
  success: boolean
  message?: string
  results?: Array<{ recipient: string; success: boolean; messageId?: string; error?: any }>
  error?: string
}

// Gedeelde functie om e-mail body te bouwen
export function buildEmailBody(params: EmailParams): string {
  const { title, description, priority, relatedShipName, relatedCrewName, deadline, createdBy, assignedTo } = params
  
  const priorityColors: { [key: string]: { emoji: string; text: string; bgColor: string; textColor: string } } = {
    'urgent': { emoji: '🔴', text: 'Urgent', bgColor: '#fee2e2', textColor: '#991b1b' },
    'hoog': { emoji: '🟠', text: 'Hoog', bgColor: '#fed7aa', textColor: '#9a3412' },
    'normaal': { emoji: '🔵', text: 'Normaal', bgColor: '#dbeafe', textColor: '#1e40af' },
    'laag': { emoji: '⚪', text: 'Laag', bgColor: '#f3f4f6', textColor: '#374151' }
  }

  const priorityInfo = priorityColors[priority] || { emoji: '', text: priority, bgColor: '#f3f4f6', textColor: '#374151' }
  const priorityText = `${priorityInfo.emoji} ${priorityInfo.text}`

  let deadlineText = ''
  if (deadline) {
    const deadlineDate = new Date(deadline)
    deadlineText = deadlineDate.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Haal alleen de naam uit het e-mailadres (alles voor @)
  const getCreatorName = (email: string | null): string => {
    if (!email) return 'Onbekend'
    const name = email.split('@')[0]
    // Capitalize eerste letter
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const creatorName = getCreatorName(createdBy)

  // Overzichtelijke e-mail template in de gewenste volgorde
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nieuwe taak: ${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #1f2937;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Nieuwe Taak Toegewezen</h1>
                  <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">Bamalite HR System</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- 1. Taak Titel bovenaan -->
                  <h2 style="margin: 0 0 25px 0; color: #111827; font-size: 28px; font-weight: 600; line-height: 1.3; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">${title}</h2>
                  
                  <!-- 2. Omschrijving van de taak (groter) -->
                  ${description ? `
                  <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 30px;">
                    <p style="margin: 0; color: #374151; font-size: 18px; line-height: 1.8; white-space: pre-wrap; font-weight: 400;">${description.replace(/\n/g, '<br>')}</p>
                  </div>
                  ` : ''}
                  
                  <!-- Details in gewenste volgorde -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <!-- 3. Naam schip -->
                          ${relatedShipName ? `
                          <tr>
                            <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151; font-size: 16px; font-weight: 600; display: block; margin-bottom: 5px;">Naam schip</strong>
                              <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 500;">${relatedShipName}</p>
                            </td>
                          </tr>
                          ` : ''}
                          
                          <!-- 4. Toegewezen aan -->
                          <tr>
                            <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151; font-size: 16px; font-weight: 600; display: block; margin-bottom: 5px;">Toegewezen aan</strong>
                              <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 500;">${assignedTo}</p>
                            </td>
                          </tr>
                          
                          <!-- 5. Deadline -->
                          ${deadline ? `
                          <tr>
                            <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151; font-size: 16px; font-weight: 600; display: block; margin-bottom: 5px;">Deadline</strong>
                              <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 500;">${deadlineText}</p>
                            </td>
                          </tr>
                          ` : ''}
                          
                          <!-- 6. Taak aangemaakt door -->
                          ${createdBy ? `
                          <tr>
                            <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151; font-size: 16px; font-weight: 600; display: block; margin-bottom: 5px;">Taak aangemaakt door</strong>
                              <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 500;">${creatorName}</p>
                            </td>
                          </tr>
                          ` : ''}
                          
                          <!-- 7. Prioriteit (onderaan) -->
                          <tr>
                            <td style="padding: 15px 0;">
                              <strong style="color: #374151; font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px;">Prioriteit</strong>
                              <div style="display: inline-block; background-color: ${priorityInfo.bgColor}; color: ${priorityInfo.textColor}; padding: 8px 16px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                ${priorityText}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Call to Action -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 30px 0 20px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://bamalite-hr-system.vercel.app'}/taken" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">Bekijk Taak in Systeem</a>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                    Deze e-mail is automatisch verzonden door het <strong>Bamalite HR System</strong>.<br>
                    Als je vragen hebt, neem dan contact op met je beheerder.
                  </p>
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

// Gmail SMTP functie
export async function sendViaGmail(params: EmailParams): Promise<EmailResult> {
  const { recipientEmails, title, description, priority, relatedShipName, relatedCrewName, deadline, assignedTo, createdBy } = params
  const gmailUser = process.env.GMAIL_USER?.trim()
  // App-wachtwoord kan met of zonder spaties komen, verwijder alle spaties
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, '')
  
  // Bereid prioriteit tekst voor (voor plain text versie)
  const priorityColors: { [key: string]: string } = {
    'urgent': '🔴 Urgent',
    'hoog': '🟠 Hoog',
    'normaal': '🔵 Normaal',
    'laag': '⚪ Laag'
  }
  const priorityText = priorityColors[priority] || priority
  
  // Bereid deadline tekst voor
  let deadlineText = ''
  if (deadline) {
    const deadlineDate = new Date(deadline)
    deadlineText = deadlineDate.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }
  
  // Bereid plain text versie van description voor (zonder HTML tags)
  const descriptionText = description ? description.replace(/<[^>]*>/g, '').replace(/\n/g, ' ') : 'Geen beschrijving'

  console.log('📧 [sendViaGmail] Functie aangeroepen')
  console.log('📧 [sendViaGmail] Gmail user:', gmailUser ? `${gmailUser.substring(0, 3)}***` : 'NIET INGESTELD')
  console.log('📧 [sendViaGmail] Gmail app password:', gmailAppPassword ? `***INGESTELD (${gmailAppPassword.length} chars)***` : 'NIET INGESTELD')
  console.log('📧 [sendViaGmail] USE_GMAIL_EMAIL:', process.env.USE_GMAIL_EMAIL)
  console.log('📧 [sendViaGmail] Recipients:', recipientEmails)

  if (!gmailUser || !gmailAppPassword) {
    console.error('📧 [sendViaGmail] ❌ Gmail credentials ontbreken!')
    console.error('📧 [sendViaGmail] GMAIL_USER:', gmailUser || 'LEEG')
    console.error('📧 [sendViaGmail] GMAIL_APP_PASSWORD:', gmailAppPassword ? 'INGESTELD' : 'LEEG')
    return {
      success: false,
      error: 'Gmail credentials niet ingesteld',
      message: 'GMAIL_USER en GMAIL_APP_PASSWORD ontbreken in environment variables.'
    }
  }

  try {
    console.log('📧 [sendViaGmail] Maak Nodemailer transporter aan...')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    })

    // Test de transporter verbinding
    console.log('📧 [sendViaGmail] Test transporter verbinding...')
    try {
      await transporter.verify()
      console.log('📧 [sendViaGmail] ✅ Transporter verbinding succesvol!')
    } catch (verifyError) {
      console.error('📧 [sendViaGmail] ❌ Transporter verificatie gefaald:', verifyError)
      return {
        success: false,
        error: 'Gmail verbinding gefaald',
        message: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        results: []
      }
    }

    const emailBody = buildEmailBody(params)
    const results = []

    // Stuur e-mails één voor één met een kleine delay om rate limiting te voorkomen
    // En om betere deliverability te krijgen
    for (let i = 0; i < recipientEmails.length; i++) {
      const recipientEmail = recipientEmails[i]
      try {
        console.log(`📧 [sendViaGmail] [${i + 1}/${recipientEmails.length}] Verstuur e-mail naar: ${recipientEmail}`)
        console.log(`📧 [sendViaGmail] From: ${gmailUser}`)
        console.log(`📧 [sendViaGmail] To: ${recipientEmail}`)
        
        // Unieke Message-ID voor elke e-mail
        const messageId = `<${Date.now()}-${i}-${Math.random().toString(36).substring(7)}@bamalite-hr-system>`
        
        // Gebruik een eenvoudigere "from" header voor betere deliverability
        // Geen display naam, alleen het e-mailadres (dit kan helpen bij spam filters)
        const info = await transporter.sendMail({
          from: gmailUser, // Geen display naam - dit kan spam triggers voorkomen
          replyTo: gmailUser,
          to: recipientEmail,
          subject: `Nieuwe taak: ${title}`,
          html: emailBody,
          text: `Nieuwe taak: ${title}\n\n${descriptionText}\n\nPrioriteit: ${priorityText}\nToegewezen aan: ${assignedTo}${relatedShipName ? `\nSchip: ${relatedShipName}` : ''}${relatedCrewName ? `\nBemanningslid: ${relatedCrewName}` : ''}${deadline ? `\nDeadline: ${deadlineText}` : ''}${createdBy ? `\n\nTaak aangemaakt door: ${createdBy.split('@')[0]}` : ''}\n\nJe kunt deze taak bekijken in het taken overzicht: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bamalite-hr-system.vercel.app'}/taken`,
          // Minimaliseer headers - verwijder verdachte headers die spam kunnen triggeren
          headers: {
            'Message-ID': messageId,
            'Date': new Date().toUTCString(),
            // Verwijder Precedence: bulk - dit kan spam triggers activeren
            // Verwijder X-Priority - dit kan spam filters activeren
            // Verwijder X-MSMail-Priority - dit kan spam filters activeren
          },
          date: new Date(),
          encoding: 'utf8',
        })

        console.log(`📧 [sendViaGmail] ✅ E-mail succesvol verstuurd naar ${recipientEmail}!`)
        console.log(`📧 [sendViaGmail] Message ID: ${info.messageId}`)
        console.log(`📧 [sendViaGmail] Response: ${info.response}`)
        console.log(`📧 [sendViaGmail] Accepted: ${info.accepted?.join(', ')}`)
        console.log(`📧 [sendViaGmail] Rejected: ${info.rejected?.join(', ')}`)
        
        results.push({ recipient: recipientEmail, success: true, messageId: info.messageId })
        
        // Voeg een kleine delay toe tussen e-mails (behalve voor de laatste)
        // Dit helpt om rate limiting te voorkomen en geeft betere deliverability
        if (i < recipientEmails.length - 1) {
          console.log(`📧 [sendViaGmail] Wacht 2 seconden voordat volgende e-mail wordt verstuurd...`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconden delay
        }
      } catch (err) {
        console.error(`📧 [sendViaGmail] ❌ Fout bij versturen naar ${recipientEmail}:`, err)
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`📧 [sendViaGmail] Error details:`, JSON.stringify(err, null, 2))
        results.push({ recipient: recipientEmail, success: false, error: errorMsg })
        
        // Bij een fout, wacht ook even voordat we doorgaan
        if (i < recipientEmails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    const allSuccess = results.every(r => r.success)
    const someSuccess = results.some(r => r.success)

    if (allSuccess) {
      return {
        success: true,
        message: `E-mails verstuurd naar ${results.length} ontvanger(s)`,
        results
      }
    } else if (someSuccess) {
      return {
        success: true,
        message: `E-mails gedeeltelijk verstuurd (${results.filter(r => r.success).length}/${results.length})`,
        results
      }
    } else {
      return {
        success: false,
        error: 'Geen e-mails konden worden verstuurd',
        results
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Fout bij versturen e-mails via Gmail'
    }
  }
}

// Resend functie (voor referentie - blijft intact)
export async function sendViaResend(params: EmailParams, resend: Resend, fromEmail: string): Promise<EmailResult> {
  const { recipientEmails, title } = params
  const emailBody = buildEmailBody(params)
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
        results.push({ recipient: recipientEmail, success: false, error: error })
      } else {
        results.push({ recipient: recipientEmail, success: true, messageId: data?.id })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      results.push({ recipient: recipientEmail, success: false, error: errorMsg })
    }
  }

  const allSuccess = results.every(r => r.success)
  const someSuccess = results.some(r => r.success)

  if (allSuccess) {
    return {
      success: true,
      message: `E-mails verstuurd naar ${results.length} ontvanger(s)`,
      results
    }
  } else if (someSuccess) {
    return {
      success: true,
      message: `E-mails gedeeltelijk verstuurd (${results.filter(r => r.success).length}/${results.length})`,
      results
    }
  } else {
    return {
      success: false,
      error: 'Geen e-mails konden worden verstuurd',
      results
    }
  }
}

