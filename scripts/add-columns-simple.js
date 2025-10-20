// Simple script to add columns using direct SQL execution
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addColumns() {
  try {
    console.log('Adding reason and notes columns...')
    
    // Since we can't use ALTER TABLE directly, let's try a different approach
    // We'll create a test record with the new fields to see if they work
    
    const testRecord = {
      id: 'test-' + Date.now(),
      crew_member_id: 'test-crew-id',
      start_date: '2025-01-01',
      end_date: '2025-01-02',
      days_count: 1,
      description: 'Test record',
      reason: 'school', // This will fail if column doesn't exist
      notes: 'Test notes',
      stand_back_days_required: 1,
      stand_back_days_completed: 0,
      stand_back_days_remaining: 1,
      stand_back_status: 'openstaand',
      stand_back_history: []
    }
    
    console.log('Testing with reason and notes fields...')
    const { data, error } = await supabase
      .from('stand_back_records')
      .insert([testRecord])
      .select()
    
    if (error) {
      console.log('❌ Error (expected if columns don\'t exist):', error.message)
      console.log('\n📋 MANUAL STEPS REQUIRED:')
      console.log('1. Go to https://supabase.com/dashboard')
      console.log('2. Select your project (ocwraavhrtpvbqlkwnlb)')
      console.log('3. Go to SQL Editor')
      console.log('4. Run this SQL:')
      console.log(`
ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'ziekte';

ALTER TABLE stand_back_records 
ADD COLUMN IF NOT EXISTS notes TEXT;
      `)
      console.log('5. Click "Run" to execute the SQL')
    } else {
      console.log('✅ Columns already exist! Test record created:', data)
      
      // Clean up test record
      await supabase
        .from('stand_back_records')
        .delete()
        .eq('id', testRecord.id)
      console.log('✅ Test record cleaned up')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

addColumns()

