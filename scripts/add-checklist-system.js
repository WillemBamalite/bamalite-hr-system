const { createClient } = require('@supabase/supabase-js');

// Supabase configuratie
const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3FqanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzQ3MzQsImV4cCI6MjA1MDMxMDczNH0.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addChecklistSystem() {
  try {
    console.log('Adding checklist system to crew table...');
    
    // Voeg de nieuwe kolommen toe
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE crew 
        ADD COLUMN IF NOT EXISTS in_dienst_vanaf DATE,
        ADD COLUMN IF NOT EXISTS arbeidsovereenkomst BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS ingeschreven_luxembourg BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verzekerd BOOLEAN DEFAULT FALSE;
      `
    });

    if (error) {
      console.error('Error adding columns:', error);
      return;
    }

    console.log('Columns added successfully');

    // Update bestaande records
    const { data: updateData, error: updateError } = await supabase.rpc('execute_sql', {
      sql: `
        UPDATE crew 
        SET in_dienst_vanaf = NULL,
            arbeidsovereenkomst = FALSE,
            ingeschreven_luxembourg = FALSE,
            verzekerd = FALSE
        WHERE in_dienst_vanaf IS NULL 
           OR arbeidsovereenkomst IS NULL 
           OR ingeschreven_luxembourg IS NULL 
           OR verzekerd IS NULL;
      `
    });

    if (updateError) {
      console.error('Error updating existing records:', updateError);
      return;
    }

    console.log('Existing records updated successfully');
    console.log('Checklist system added successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addChecklistSystem();
