import { NextResponse } from 'next/server'
import { migrateDataToSupabase } from '@/scripts/migrate-to-supabase'

export async function GET() {
  try {
    console.log('🚀 Starting migration via API...')
    
    await migrateDataToSupabase()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data migration completed successfully!' 
    })
  } catch (error) {
    console.error('❌ Migration failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 