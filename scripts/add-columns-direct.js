// Direct script to add reason and notes columns to stand_back_records table
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addColumns() {
  try {
    console.log('Adding reason and notes columns to stand_back_records table...')
    
    // Add reason column
    const { data: reasonResult, error: reasonError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE stand_back_records 
        ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'ziekte';
      `
    })
    
    if (reasonError) {
      console.error('Error adding reason column:', reasonError)
    } else {
      console.log('✅ Reason column added successfully')
    }
    
    // Add notes column
    const { data: notesResult, error: notesError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE stand_back_records 
        ADD COLUMN IF NOT EXISTS notes TEXT;
      `
    })
    
    if (notesError) {
      console.error('Error adding notes column:', notesError)
    } else {
      console.log('✅ Notes column added successfully')
    }
    
    console.log('✅ All columns added successfully!')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

addColumns()
