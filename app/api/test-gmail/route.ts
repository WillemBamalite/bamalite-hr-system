import { NextRequest, NextResponse } from 'next/server'
import { sendViaGmail } from '@/lib/email-service'

// Test route om Gmail SMTP direct te testen
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 ===== TEST GMAIL ROUTE =====')
    console.log('🧪 USE_GMAIL_EMAIL:', process.env.USE_GMAIL_EMAIL)
    console.log('🧪 GMAIL_USER:', process.env.GMAIL_USER ? `${process.env.GMAIL_USER.substring(0, 3)}***` : 'NIET INGESTELD')
    console.log('🧪 GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***INGESTELD***' : 'NIET INGESTELD')
    
    // Test met een eenvoudige e-mail - test naar meerdere adressen
    // Test 1: Naar bamalite.com (origineel)
    // Test 2: Naar Gmail account zelf (om te testen of Gmail werkt)
    // Test 3: Optioneel naar een ander e-mailadres
    const testResult = await sendViaGmail({
      assignedTo: 'Willem',
      title: 'Test E-mail van Bamalite HR System',
      description: 'Dit is een test e-mail om te controleren of Gmail SMTP werkt. Als je deze e-mail ontvangt, werkt Gmail SMTP correct!',
      priority: 'normaal',
      deadline: null,
      relatedShipName: null,
      relatedCrewName: null,
      recipientEmails: [
        'willem@bamalite.com', // Origineel adres
        process.env.GMAIL_USER || 'bamalite.hr@gmail.com' // Test naar Gmail account zelf
      ],
      createdBy: 'test@bamalite.com'
    })
    
    console.log('🧪 Test result:', JSON.stringify(testResult, null, 2))
    
    return NextResponse.json({
      success: testResult.success,
      message: testResult.message || testResult.error,
      details: testResult,
      environment: {
        USE_GMAIL_EMAIL: process.env.USE_GMAIL_EMAIL,
        GMAIL_USER: process.env.GMAIL_USER ? `${process.env.GMAIL_USER.substring(0, 3)}***` : 'NIET INGESTELD',
        GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? '***INGESTELD***' : 'NIET INGESTELD'
      }
    })
  } catch (error) {
    console.error('🧪 ❌ Test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}

