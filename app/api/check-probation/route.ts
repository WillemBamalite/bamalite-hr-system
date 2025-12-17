import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function GET() {
  try {
    // Fetch all crew members with in_dienst_vanaf
    const { data: crewMembers, error } = await supabase
      .from('crew')
      .select('id, first_name, last_name, in_dienst_vanaf, position, ship_id')
      .not('in_dienst_vanaf', 'is', null)
      .eq('is_dummy', false)

    if (error) {
      console.error('Error fetching crew:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const emailsSent: string[] = []

    for (const member of crewMembers || []) {
      if (!member.in_dienst_vanaf) continue

      const startDate = new Date(member.in_dienst_vanaf)
      startDate.setHours(0, 0, 0, 0)
      
      // Calculate days since start
      const diffTime = today.getTime() - startDate.getTime()
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      // Check if exactly 70 days (20 days until probation ends)
      if (daysSinceStart === 70) {
        const fullName = `${member.first_name} ${member.last_name}`
        
        // Send email
        const mailOptions = {
          from: `"Bemanningslijst" <${process.env.GMAIL_USER}>`,
          to: 'nautic@bamalite.com',
          subject: `⚠️ Proeftijd verloopt over 20 dagen: ${fullName}`,
          text: `Let op! De proefperiode van ${fullName} verloopt over 20 dagen.\n\nDatum in dienst: ${new Date(member.in_dienst_vanaf).toLocaleDateString('nl-NL')}\nFunctie: ${member.position || 'Onbekend'}\n\nNeem contact op om de werkzaamheden te evalueren.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Proeftijd verloopt over 20 dagen</h1>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                  Let op! De proefperiode van <strong>${fullName}</strong> verloopt over 20 dagen.
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Datum in dienst:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${new Date(member.in_dienst_vanaf).toLocaleDateString('nl-NL')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Functie:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${member.position || 'Onbekend'}</td>
                  </tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    📋 Neem contact op om de werkzaamheden te evalueren voordat de proeftijd afloopt.
                  </p>
                </div>
              </div>
            </div>
          `,
        }

        try {
          await transporter.sendMail(mailOptions)
          emailsSent.push(fullName)
          console.log(`Probation email sent for: ${fullName}`)
        } catch (emailError) {
          console.error(`Failed to send email for ${fullName}:`, emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      message: `Checked ${crewMembers?.length || 0} crew members, sent ${emailsSent.length} probation emails`
    })

  } catch (error) {
    console.error('Error in check-probation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

