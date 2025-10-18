"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function DebugDatabasePage() {
  const [tables, setTables] = useState<string[]>([])
  const [standBackData, setStandBackData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  const checkDatabaseTables = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Try to get all tables by querying information_schema
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (error) {
        console.error('Error getting tables:', error)
        setError(`Error getting tables: ${error.message}`)
        
        // Try alternative approach - test specific tables
        await testSpecificTables()
      } else {
        const tableNames = data?.map(t => t.table_name) || []
        setTables(tableNames)
        console.log('Available tables:', tableNames)
      }
    } catch (err) {
      console.error('Error in checkDatabaseTables:', err)
      setError(`Error: ${err}`)
      await testSpecificTables()
    } finally {
      setLoading(false)
    }
  }

  const testSpecificTables = async () => {
    const testTables = ['crew', 'ships', 'sick_leave', 'stand_back_records']
    const existingTables: string[] = []
    
    for (const tableName of testTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (!error) {
          existingTables.push(tableName)
          console.log(`✅ Table ${tableName} exists`)
        } else {
          console.log(`❌ Table ${tableName} does not exist:`, error.message)
        }
      } catch (err) {
        console.log(`❌ Table ${tableName} error:`, err)
      }
    }
    
    setTables(existingTables)
  }

  const testStandBackTable = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Try to select from stand_back_records
      const { data, error } = await supabase
        .from('stand_back_records')
        .select('*')
        .limit(10)
      
      if (error) {
        setError(`Error querying stand_back_records: ${error.message}`)
        console.error('Stand back records error:', error)
      } else {
        setStandBackData(data || [])
        console.log('Stand back records:', data)
      }
    } catch (err) {
      setError(`Error: ${err}`)
      console.error('Error testing stand back table:', err)
    } finally {
      setLoading(false)
    }
  }

  const createStandBackTable = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Try to create the table using SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS stand_back_records (
          id TEXT PRIMARY KEY,
          crew_member_id TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days_count INTEGER DEFAULT 0,
          description TEXT NOT NULL,
          stand_back_days_required INTEGER NOT NULL,
          stand_back_days_completed INTEGER DEFAULT 0,
          stand_back_days_remaining INTEGER NOT NULL,
          stand_back_status TEXT CHECK (stand_back_status IN ('openstaand', 'voltooid')) DEFAULT 'openstaand',
          stand_back_history JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
      
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL })
      
      if (error) {
        setError(`Error creating table: ${error.message}`)
        console.error('Create table error:', error)
      } else {
        setError("Table creation attempted. Check if it worked.")
        console.log('Table creation result:', data)
      }
    } catch (err) {
      setError(`Error: ${err}`)
      console.error('Error creating table:', err)
    } finally {
      setLoading(false)
    }
  }

  const testInsert = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Try to insert a test record
      const testRecord = {
        id: `test-${Date.now()}`,
        crew_member_id: "test-crew-id",
        start_date: "2024-01-01",
        end_date: "2024-01-02",
        days_count: 1,
        description: "Test record",
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
        setError(`Insert test failed: ${error.message}`)
        console.error('Insert test error:', error)
      } else {
        setError("✅ Insert test successful!")
        console.log('Insert test result:', data)
        
        // Clean up test record
        if (data && data[0]) {
          await supabase
            .from('stand_back_records')
            .delete()
            .eq('id', data[0].id)
        }
      }
    } catch (err) {
      setError(`Insert test error: ${err}`)
      console.error('Insert test error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Database Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button onClick={checkDatabaseTables} disabled={loading}>
              {loading ? "Checking..." : "Check Database Tables"}
            </Button>
            
            <Button onClick={testStandBackTable} disabled={loading} variant="outline">
              {loading ? "Testing..." : "Test Stand Back Table"}
            </Button>
            
            <Button onClick={createStandBackTable} disabled={loading} variant="outline">
              {loading ? "Creating..." : "Create Stand Back Table"}
            </Button>
            
            <Button onClick={testInsert} disabled={loading} variant="outline">
              {loading ? "Testing..." : "Test Insert"}
            </Button>
          </div>

          {tables.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Available Tables:</h3>
              <ul className="text-sm text-green-800">
                {tables.map(table => (
                  <li key={table}>• {table}</li>
                ))}
              </ul>
            </div>
          )}

          {standBackData.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Stand Back Records:</h3>
              <pre className="text-xs text-blue-800 overflow-auto">
                {JSON.stringify(standBackData, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Error:</h3>
              <pre className="text-sm text-red-800 whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Debug Steps:</h3>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. Click "Check Database Tables" to see what tables exist</li>
              <li>2. Click "Test Stand Back Table" to see if stand_back_records exists</li>
              <li>3. If table doesn't exist, click "Create Stand Back Table"</li>
              <li>4. Click "Test Insert" to verify the table works</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
