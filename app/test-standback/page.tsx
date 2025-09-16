"use client"

import React, { useState } from 'react'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TestStandBackPage() {
  const { crew, standBackRecords, addStandBackRecord } = useSupabaseData()
  const [testResult, setTestResult] = useState<string>('')

  const testStandBackCreation = async () => {
    try {
      if (crew.length === 0) {
        setTestResult('Geen crew members beschikbaar voor test')
        return
      }

      const testCrewMember = crew[0]
      const testRecord = {
        id: `test-standback-${Date.now()}`,
        crew_member_id: testCrewMember.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        days_count: 0,
        description: `Test terug te staan (${testCrewMember.first_name} ${testCrewMember.last_name})`,
        stand_back_days_required: 7,
        stand_back_days_completed: 0,
        stand_back_days_remaining: 7,
        stand_back_status: "openstaand" as const,
        stand_back_history: []
      }

      console.log('Testing stand back creation with:', testRecord)
      const result = await addStandBackRecord(testRecord)
      console.log('Test result:', result)

      // Check localStorage after creation
      if (typeof window !== 'undefined') {
        const localStorageData = localStorage.getItem('sickLeaveHistoryDatabase')
        console.log('localStorage after test:', localStorageData)
      }

      setTestResult(`Test succesvol! Record aangemaakt voor ${testCrewMember.first_name} ${testCrewMember.last_name}`)
    } catch (error) {
      console.error('Test failed:', error)
      setTestResult(`Test mislukt: ${error}`)
    }
  }

  const checkLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('sickLeaveHistoryDatabase')
      console.log('localStorage data:', data)
      setTestResult(`localStorage data: ${data ? 'Aanwezig' : 'Leeg'}`)
    }
  }

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sickLeaveHistoryDatabase')
      setTestResult('localStorage cleared')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <h1 className="text-2xl font-bold mb-6">Test Terug Te Staan Functionaliteit</h1>
      
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Status</h2>
            <p>Crew members: {crew.length}</p>
            <p>Stand back records: {standBackRecords.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Tests</h2>
            <div className="space-y-2">
              <Button onClick={testStandBackCreation}>
                Test Stand Back Aanmaken
              </Button>
              <Button onClick={checkLocalStorage} variant="outline">
                Check localStorage
              </Button>
              <Button onClick={clearLocalStorage} variant="outline">
                Clear localStorage
              </Button>
            </div>
          </CardContent>
        </Card>

        {testResult && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Test Resultaat</h2>
              <p className="text-sm">{testResult}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 