import { NextRequest, NextResponse } from 'next/server'
import { sendTaskNotificationEmail } from '@/lib/email-service'
import { ASSIGNEE_EMAIL_MAP } from '@/utils/task-permissions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignedTo, title, description, priority, deadline, relatedShipName, relatedCrewName, createdBy } = body

    const assignedToLower = assignedTo?.toLowerCase().trim()
    const recipientEmail = ASSIGNEE_EMAIL_MAP[assignedToLower || '']
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Onbekende ontvanger', message: `Geen e-mailadres gevonden voor: ${assignedTo}` },
        { status: 400 }
      )
    }

    const result = await sendTaskNotificationEmail({
      assignedTo,
      title,
      description: description || '',
      priority,
      deadline: deadline || null,
      relatedShipName: relatedShipName || null,
      relatedCrewName: relatedCrewName || null,
      recipientEmails: [recipientEmail],
      createdBy: createdBy || null,
    })

    if (result.success) {
      return NextResponse.json(result)
    }

    return NextResponse.json(
      {
        error: result.error || 'E-mail verzending gefaald',
        message: result.message || 'E-mail kon niet worden verstuurd',
        hint: result.hint || null,
        results: result.results || [],
        provider: result.provider || null,
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error in send-task-email API:', error)
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
