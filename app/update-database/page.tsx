"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export default function UpdateDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>("")

  const updateDatabaseSchema = async () => {
    setLoading(true)
    setResult("")
    
    try {
      // SQL statements to add new fields
      const sqlStatements = [
        "ALTER TABLE stand_back_records ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'ziekte'",
        "ALTER TABLE stand_back_records ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'openstaand'",
        "ALTER TABLE stand_back_records ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE stand_back_records ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE stand_back_records ADD COLUMN IF NOT EXISTS archived_by TEXT"
      ]

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const sql of sqlStatements) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
          if (error) {
            console.error('SQL Error:', error)
            errors.push(`${sql}: ${error.message}`)
            errorCount++
          } else {
            successCount++
          }
        } catch (err) {
          console.error('Execution Error:', err)
          errors.push(`${sql}: ${err}`)
          errorCount++
        }
      }

      // Try alternative approach using direct SQL execution
      if (errorCount > 0) {
        setResult(`Direct SQL execution failed. Trying alternative approach...\n\nErrors:\n${errors.join('\n')}`)
        
        // Try to execute the SQL directly
        try {
          const { data, error } = await supabase
            .from('stand_back_records')
            .select('*')
            .limit(1)
          
          if (error) {
            setResult(`Database connection test failed: ${error.message}`)
          } else {
            setResult(`Database connection successful. The new fields might already exist or need to be added manually.\n\nSuccess: ${successCount}\nErrors: ${errorCount}\n\nErrors:\n${errors.join('\n')}`)
          }
        } catch (err) {
          setResult(`Database test failed: ${err}`)
        }
      } else {
        setResult(`✅ Database schema updated successfully!\n\nSuccessfully executed: ${successCount} statements`)
      }

    } catch (error) {
      setResult(`❌ Error updating database: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testNewFields = async () => {
    setLoading(true)
    setResult("")
    
    try {
      // Try to insert a test record with new fields
      const testRecord = {
        crew_member_id: "test-id",
        start_date: "2024-01-01",
        end_date: "2024-01-02",
        days_count: 1,
        description: "Test record",
        reason: "ziekte",
        archive_status: "openstaand",
        notes: "Test notes",
        stand_back_days_required: 1,
        stand_back_days_completed: 0,
        stand_back_days_remaining: 1,
        stand_back_status: "openstaand",
        stand_back_history: []
      }

      const { data, error } = await supabase
        .from('stand_back_records')
        .insert([testRecord])
        .select()

      if (error) {
        setResult(`❌ Test insert failed: ${error.message}\n\nThis means the new fields are not available yet.`)
      } else {
        // Clean up test record
        await supabase
          .from('stand_back_records')
          .delete()
          .eq('id', data[0].id)
        
        setResult(`✅ Test successful! New fields are available.\n\nTest record created and cleaned up.`)
      }

    } catch (error) {
      setResult(`❌ Test failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const cleanupJubileeTasks = async () => {
    setLoading(true)
    setResult("")

    try {
      setResult("Bezig met opruimen van jubileum-taken...")

      // Verwijder alle taken waarvan de titel met 'Jubileum' begint
      const { error, count } = await supabase
        .from("tasks")
        .delete({ count: "estimated" })
        .ilike("title", "Jubileum%")

      if (error) {
        setResult(`❌ Fout bij het verwijderen van jubileum-taken: ${error.message}`)
      } else {
        setResult(
          `✅ Opruimen voltooid.\nVerwijderde jubileum-taken (titel begint met 'Jubileum'): ${count ?? "onbekend aantal"}.\n\nDe herinnerings-taken 'Over 10 dagen: ...' blijven staan.`
        )
      }
    } catch (err) {
      setResult(`❌ Onverwachte fout bij het verwijderen van jubileum-taken: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Database Schema Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Deze pagina helpt bij het updaten van de database schema voor de nieuwe stand-back functionaliteit.
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={updateDatabaseSchema} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Updating..." : "Update Database Schema"}
            </Button>
            
            <Button 
              onClick={testNewFields} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? "Testing..." : "Test New Fields"}
            </Button>

            <Button 
              onClick={cleanupJubileeTasks} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? "Bezig..." : "Verwijder alle jubileum-taken (Jubileum X jaar in dienst)"}
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Nieuwe velden die worden toegevoegd:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <code>reason</code> - Reden (ziekte, vrij genomen, verlof, training, overig)</li>
              <li>• <code>archive_status</code> - Archief status (openstaand, voltooid, gearchiveerd-uitdienst)</li>
              <li>• <code>notes</code> - Extra opmerkingen</li>
              <li>• <code>archived_at</code> - Wanneer gearchiveerd</li>
              <li>• <code>archived_by</code> - Wie heeft gearchiveerd</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

