"use client"

import { useSupabaseData } from "@/hooks/use-supabase-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DebugSupabasePage() {
  const { crew, ships, sickLeave, loading, error, addCrew, addShip, deleteCrew } = useSupabaseData()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  const migrateLocalStorageToSupabase = async () => {
    try {
      // Haal localStorage data op
      const localStorageCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
      const localStorageShips = JSON.parse(localStorage.getItem('shipDatabase') || '{}')

      console.log('localStorage crew:', localStorageCrew)
      console.log('localStorage ships:', localStorageShips)

      // Migreer schepen
      for (const shipId in localStorageShips) {
        const ship = localStorageShips[shipId]
        try {
          await addShip({
            id: ship.id,
            name: ship.name,
            max_crew: ship.maxCrew || 8
          })
          console.log(`Ship ${ship.name} migrated`)
        } catch (err) {
          console.log(`Ship ${ship.name} already exists or error:`, err)
        }
      }

      // Migreer bemanningsleden
      for (const crewId in localStorageCrew) {
        const crewMember = localStorageCrew[crewId]
        try {
          await addCrew({
            id: crewMember.id,
            first_name: crewMember.firstName,
            last_name: crewMember.lastName,
            nationality: crewMember.nationality,
            position: crewMember.position,
            ship_id: crewMember.shipId || "",
            regime: crewMember.regime,
            status: crewMember.status,
            phone: crewMember.phone || "",
            email: crewMember.email || "",
            birth_date: crewMember.birthDate || "1990-01-01",
            address: crewMember.address || {
              street: "",
              city: "",
              postalCode: "",
              country: ""
            },
            assignment_history: crewMember.assignmentHistory || [],
            diplomas: crewMember.diplomas || [],
            notes: crewMember.notes || []
          })
          console.log(`Crew member ${crewMember.firstName} ${crewMember.lastName} migrated`)
        } catch (err) {
          console.log(`Crew member ${crewMember.firstName} ${crewMember.lastName} already exists or error:`, err)
        }
      }

      alert("Migratie voltooid! De pagina wordt herladen...")
      window.location.reload()
    } catch (error) {
      console.error('Migration error:', error)
      alert("Fout bij migratie: " + error)
    }
  }

  const deleteCrewMember = async (crewId: string, crewName: string) => {
    try {
      // Verwijder uit Supabase
      await deleteCrew(crewId)
      
      // Verwijder uit localStorage
      if (typeof window !== 'undefined') {
        const currentCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
        delete currentCrew[crewId]
        localStorage.setItem('crewDatabase', JSON.stringify(currentCrew))
        
        // Trigger events
        window.dispatchEvent(new Event('localStorageUpdate'))
        window.dispatchEvent(new Event('forceRefresh'))
      }
      
      alert(`${crewName} succesvol verwijderd uit beide systemen!`)
      window.location.reload()
    } catch (error) {
      console.error('Delete error:', error)
      alert("Fout bij verwijderen: " + error)
    }
  }

  const clearAllData = async () => {
    if (confirm("Weet je zeker dat je ALLE data wilt verwijderen? Dit kan niet ongedaan worden gemaakt!")) {
      try {
        // Verwijder uit Supabase
        const { clearAllData } = useSupabaseData()
        await clearAllData()
        
        // Verwijder uit localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('crewDatabase')
          localStorage.removeItem('shipDatabase')
          localStorage.removeItem('sickLeaveDatabase')
          
          // Trigger events
          window.dispatchEvent(new Event('localStorageUpdate'))
          window.dispatchEvent(new Event('forceRefresh'))
        }
        
        alert("Alle data succesvol verwijderd!")
        window.location.reload()
      } catch (error) {
        console.error('Clear all error:', error)
        alert("Fout bij verwijderen: " + error)
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Data Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crew ({crew.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {crew.map((member) => (
                <div key={member.id} className="text-sm border-b pb-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong>{member.first_name} {member.last_name}</strong>
                      <br />
                      <span className="text-gray-600">
                        ID: {member.id}
                      </span>
                      <br />
                      <span className="text-gray-600">
                        {member.position} • {member.status} • {member.ship_id || 'Geen schip'}
                      </span>
                      <br />
                      <span className="text-gray-600">
                        Regime: {member.regime}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteCrewMember(member.id, `${member.first_name} ${member.last_name}`)}
                      className="ml-2"
                    >
                      Verwijder
                    </Button>
                  </div>
                </div>
              ))}
              {crew.length === 0 && (
                <div className="text-gray-500 text-sm">
                  Geen crew data gevonden
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ships ({ships.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ships.map((ship) => (
                <div key={ship.id} className="text-sm border-b pb-1">
                  <strong>{ship.name}</strong>
                  <br />
                  <span className="text-gray-600">
                    Schip ID: {ship.id}
                  </span>
                  <br />
                  <span className="text-gray-600">
                    Max Crew: {ship.max_crew}
                  </span>
                </div>
              ))}
              {ships.length === 0 && (
                <div className="text-gray-500 text-sm">
                  Geen ships data gevonden
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sick Leave ({sickLeave.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sickLeave.map((sick) => (
                <div key={sick.id} className="text-sm border-b pb-1">
                  <strong>{sick.crew_member_id}</strong>
                  <br />
                  <span className="text-gray-600">
                    {sick.status} • {sick.start_date}
                  </span>
                </div>
              ))}
              {sickLeave.length === 0 && (
                <div className="text-gray-500 text-sm">
                  Geen sick leave data gevonden
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Database Acties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Migreer localStorage naar Supabase</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Dit migreert alle bemanningsleden en schepen uit localStorage naar Supabase zodat de persoonlijke pagina's gaan werken.
                </p>
                <Button 
                  onClick={migrateLocalStorageToSupabase}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Migreer Data naar Supabase
                </Button>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Test Crew Member Toevoegen</h3>
                <Button 
                  onClick={async () => {
                    try {
                      await addCrew({
                        id: "test-crew-1",
                        first_name: "Test",
                        last_name: "Crew",
                        nationality: "NL",
                        position: "Kapitein",
                        ship_id: "",
                        regime: "2/2",
                        status: "nog-in-te-delen",
                        phone: "0612345678",
                        email: "test@example.com",
                        birth_date: "1990-01-01",
                        address: {
                          street: "Teststraat 1",
                          city: "Amsterdam",
                          postalCode: "1000 AA",
                          country: "Nederland"
                        },
                        assignment_history: [],
                        diplomas: ["Vaarbewijs"],
                        notes: []
                      })
                      alert("Test crew member toegevoegd!")
                      window.location.reload()
                    } catch (error) {
                      alert("Fout: " + error)
                    }
                  }}
                >
                  Test Crew Member Toevoegen
                </Button>
              </div>

              <div>
                <h3 className="font-medium mb-2 text-red-600">Gevaarlijke Acties</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Deze acties kunnen niet ongedaan worden gemaakt!
                </p>
                <Button 
                  onClick={clearAllData}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Verwijder ALLE Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 