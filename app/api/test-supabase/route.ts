import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🧪 Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('ships')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: 'Failed to connect to Supabase'
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Supabase connection successful!')
    return NextResponse.json({
      success: true,
      message: 'Supabase connection working!',
      data: data
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Exception during Supabase test'
      },
      { status: 500 }
    )
  }
} 