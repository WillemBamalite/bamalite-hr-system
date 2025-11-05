const { createClient } = require('@supabase/supabase-js');

// Supabase configuratie - gebruik je echte credentials
const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3FqanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzQ3MzQsImV4cCI6MjA1MDMxMDczNH0.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addChecklistFields() {
  try {
    console.log('Adding checklist fields to crew table...');
    
    // Test of de velden al bestaan door een test query
    const { data: testData, error: testError } = await supabase
      .from('crew')
      .select('arbeidsovereenkomst')
      .limit(1);
    
    if (testError && testError.code === 'PGRST204') {
      console.log('Fields do not exist, adding them...');
      
      // Voeg de velden toe via directe SQL
      const { data, error } = await supabase
        .from('crew')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error accessing crew table:', error);
        return;
      }
      
      console.log('Crew table accessible, but fields need to be added via SQL editor');
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log(`
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS in_dienst_vanaf DATE,
ADD COLUMN IF NOT EXISTS arbeidsovereenkomst BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ingeschreven_luxembourg BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verzekerd BOOLEAN DEFAULT FALSE;
      `);
      
    } else if (testError) {
      console.error('Unexpected error:', testError);
    } else {
      console.log('Fields already exist!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addChecklistFields();
