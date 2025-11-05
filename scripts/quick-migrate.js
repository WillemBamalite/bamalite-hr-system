// Quick migration script - copy and paste this into browser console
(async function migrate() {
  console.log('🚀 Starting migration...');
  
  // Get localStorage data
  const crewData = JSON.parse(localStorage.getItem('crewDatabase') || '{}');
  const shipsData = JSON.parse(localStorage.getItem('ships') || '[]');
  
  console.log(`Found ${Object.keys(crewData).length} crew members`);
  console.log(`Found ${shipsData.length} ships`);
  
  // Migrate crew members
  for (const [id, crew] of Object.entries(crewData)) {
    const payload = {
      id: crew.id,
      first_name: crew.firstName || '',
      last_name: crew.lastName || '',
      nationality: crew.nationality || 'NL',
      position: crew.position || 'Matroos',
      ship_id: crew.shipId || null,
      regime: crew.regime || '2/2',
      status: crew.status || 'nog-in-te-delen',
      on_board_since: crew.onBoardSince || null,
      thuis_sinds: crew.thuisSinds || null,
      phone: crew.phone || null,
      email: crew.email || null,
      birth_date: crew.birthDate || null,
      address: crew.address || null,
      assignment_history: crew.assignmentHistory || [],
      diplomas: crew.diplomas || [],
      notes: Array.isArray(crew.notes) ? crew.notes : [],
      company: crew.company || null
    };
    
    try {
      const response = await fetch('https://ocwraavhrtpvbqlkwnlb.supabase.co/rest/v1/crew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04',
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`✅ Migrated: ${payload.first_name} ${payload.last_name}`);
      } else {
        console.log(`⚠️ Already exists: ${payload.first_name} ${payload.last_name}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  // Migrate ships
  for (const ship of shipsData) {
    const payload = {
      id: ship.id,
      name: ship.name,
      max_crew: ship.max_crew || 8,
      status: ship.status || 'Operationeel',
      location: ship.location || '',
      route: ship.route || '',
      company: ship.company || null
    };
    
    try {
      const response = await fetch('https://ocwraavhrtpvbqlkwnlb.supabase.co/rest/v1/ships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04',
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`✅ Migrated ship: ${payload.name}`);
      } else {
        console.log(`⚠️ Already exists: ${payload.name}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('🎉 Migration done! Refresh the page.');
})();

