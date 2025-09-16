"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TestSimplePage() {
  const [localStorageData, setLocalStorageData] = useState<any>(null)
  const [message, setMessage] = useState<string>('')

  // Load localStorage data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('sickLeaveHistoryDatabase')
      console.log('localStorage data on mount:', data)
      setLocalStorageData(data ? JSON.parse(data) : {})
    }
  }, [])

  const addTestRecord = () => {
    if (typeof window !== 'undefined') {
      const testRecord = {
        id: `test-${Date.now()}`,
        crewMemberId: 'test-crew-1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        daysCount: 0,
        description: 'Test record',
        standBackDaysRequired: 7,
        standBackDaysCompleted: 0,
        standBackDaysRemaining: 7,
        standBackStatus: 'openstaand',
        standBackHistory: []
      }

      const currentData = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
      currentData[testRecord.id] = testRecord
      localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(currentData))
      
      console.log('Added test record:', testRecord)
      console.log('Updated localStorage:', localStorage.getItem('sickLeaveHistoryDatabase'))
      
      setMessage('Test record added!')
      setLocalStorageData(currentData)
    }
  }

  const checkLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('sickLeaveHistoryDatabase')
      console.log('Current localStorage:', data)
      setMessage(`localStorage: ${data ? 'Has data' : 'Empty'}`)
      setLocalStorageData(data ? JSON.parse(data) : {})
    }
  }

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sickLeaveHistoryDatabase')
      setMessage('localStorage cleared!')
      setLocalStorageData({})
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <h1 className="text-2xl font-bold mb-6">Simple localStorage Test</h1>
      
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Actions</h2>
            <div className="space-y-2">
              <Button onClick={addTestRecord}>
                Add Test Record
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

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Status</h2>
            <p className="text-sm mb-2">{message}</p>
            <p className="text-sm">Records: {localStorageData ? Object.keys(localStorageData).length : 0}</p>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 