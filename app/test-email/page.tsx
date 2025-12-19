'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestEmailPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testGmail = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      console.log('🧪 Test Gmail SMTP...')
      const response = await fetch('/api/test-gmail')
      const data = await response.json()
      
      console.log('🧪 Test result:', data)
      setResult(data)
      
      if (!data.success) {
        setError(data.error || data.message || 'Onbekende fout')
      }
    } catch (err) {
      console.error('🧪 Test error:', err)
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Gmail SMTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testGmail} disabled={loading}>
            {loading ? 'Testen...' : 'Test Gmail SMTP'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-bold text-red-800">Fout:</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="font-bold mb-2">Resultaat:</h3>
              <pre className="text-xs overflow-auto bg-white p-4 rounded border">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-bold text-blue-800 mb-2">Instructies:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
              <li>Klik op "Test Gmail SMTP" om direct te testen of Gmail werkt</li>
              <li>Check de browser console (F12) voor gedetailleerde logs</li>
              <li>Check de terminal waar npm run dev draait voor server-side logs</li>
              <li>Als de test succesvol is, zou je een e-mail moeten ontvangen op willem@bamalite.com</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



