// Test script to check if reason and notes columns exist
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testColumns() {
  try {
    console.log('Testing if reason and notes columns exist...')
    
    // Try to select reason and notes columns
    const { data, error } = await supabase
      .from('stand_back_records')
      .select('id, reason, notes')
      .limit(1)
    
    if (error) {
      console.log('❌ Columns do not exist:', error.message)
      console.log('Need to add reason and notes columns to the database')
    } else {
      console.log('✅ Columns exist:', data)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testColumns()

