const { createClient } = require('@supabase/supabase-js');

// Supabase configuratie
const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoyMDE1NTc1OTk5fQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addStudentFields() {
  try {
    console.log('Adding student fields to crew table...');
    
    // Voeg de velden toe via een SQL query
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        -- Add student fields to crew table
        ALTER TABLE crew
        ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS education_type TEXT,
        ADD COLUMN IF NOT EXISTS education_end_date DATE,
        ADD COLUMN IF NOT EXISTS school_periods JSONB DEFAULT '[]';

        -- Update existing records to have default values
        UPDATE crew
        SET is_student = false, school_periods = '[]'
        WHERE is_student IS NULL OR school_periods IS NULL;
      `
    });

    if (error) {
      console.error('Error adding student fields:', error);
      return;
    }

    console.log('✅ Student fields added successfully!');
    console.log('Added fields:');
    console.log('- is_student (BOOLEAN)');
    console.log('- education_type (TEXT)');
    console.log('- education_end_date (DATE)');
    console.log('- school_periods (JSONB)');

  } catch (err) {
    console.error('Error:', err);
  }
}

addStudentFields();
