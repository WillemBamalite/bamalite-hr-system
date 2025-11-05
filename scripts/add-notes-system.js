const { createClient } = require('@supabase/supabase-js');

// You'll need to manually set these values or get them from your .env.local file
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Check your .env.local file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addNotesColumns() {
    try {
        // Add active_notes column
        let { error: activeNotesError } = await supabase.rpc('execute_sql', {
            sql_query: `ALTER TABLE crew ADD COLUMN IF NOT EXISTS active_notes JSONB DEFAULT '[]';`
        });
        if (activeNotesError) throw activeNotesError;
        console.log('active_notes column added or already exists.');

        // Add archived_notes column
        let { error: archivedNotesError } = await supabase.rpc('execute_sql', {
            sql_query: `ALTER TABLE crew ADD COLUMN IF NOT EXISTS archived_notes JSONB DEFAULT '[]';`
        });
        if (archivedNotesError) throw archivedNotesError;
        console.log('archived_notes column added or already exists.');

        // Update existing records to have default values
        let { error: updateError } = await supabase.rpc('execute_sql', {
            sql_query: `
                UPDATE crew 
                SET active_notes = '[]', archived_notes = '[]' 
                WHERE active_notes IS NULL OR archived_notes IS NULL;
            `
        });
        if (updateError) throw updateError;
        console.log('Existing records updated with default values.');

        console.log('Notes system database schema updated successfully!');
    } catch (error) {
        console.error('Error updating database schema:', error);
    }
}

addNotesColumns();
