"use client"

import React, { useState, useEffect } from 'react'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { supabase } from '@/lib/supabase'
import { getCombinedShipDatabase } from '@/utils/ship-utils'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle, UserX, Calendar, Ship, Clock } from 'lucide-react'
import Link from 'next/link'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { BackButton } from '@/components/ui/back-button'
import { DashboardButton } from '@/components/ui/dashboard-button'

export default function SickLeaveHistoryPage() {
  const { crew: allCrewData, loading } = useSupabaseData()
  const [afboekenDialog, setAfboekenDialog] = useState<string | null>(null)
  const [afboekenData, setAfboekenData] = useState({
    daysCompleted: 1,
    note: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    ship: ""
  })
  const [historyRecords, setHistoryRecords] = useState<any[]>([])

  // Laad data direct uit localStorage (zoals ziekte pagina maar dan direct)
  useEffect(() => {
    const loadData = () => {
      if (typeof window !== 'undefined' && allCrewData.length > 0) {
        const localStorageData = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
        const records = Object.values(localStorageData)
        
        console.log('Loading from localStorage:', records.length, 'records')
        
        if (records.length > 0) {
          const processedRecords = records
            .map((record: any) => {
              const crewMember = allCrewData.find((c: any) => c.id === record.crewMemberId)
              const ship = crewMember?.ship_id ? getCombinedShipDatabase()[crewMember.ship_id] : null
              
              return {
                ...record,
                crewMember,
                ship,
                crew_member_id: record.crewMemberId,
                start_date: record.startDate,
                end_date: record.endDate,
                days_count: record.daysCount,
                stand_back_days_required: record.standBackDaysRequired,
                stand_back_days_completed: record.standBackDaysCompleted,
                stand_back_days_remaining: record.standBackDaysRemaining,
                stand_back_status: record.standBackStatus,
                stand_back_history: record.standBackHistory || []
              }
            })
            .filter((record) => record.standBackDaysRemaining > 0)
            .sort((a, b) => {
              try {
                const dateA = new Date(a.startDate || 0).getTime()
                const dateB = new Date(b.startDate || 0).getTime()
                return dateB - dateA
              } catch (error) {
                return 0
              }
            })

          setHistoryRecords(processedRecords)
          console.log('Processed records:', processedRecords.length)
        } else {
          setHistoryRecords([])
        }
      }
    }

    loadData()
  }, [allCrewData])

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱", 
      SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺"
    }
    return flags[nationality] || "🌍"
  }

  const getStandBackStatusColor = (status: string, remainingDays: number) => {
    if (remainingDays === 0) return "bg-green-100 text-green-800"
    switch (status) {
      case "voltooid": return "bg-green-100 text-green-800"
      case "openstaand": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStandBackStatusIcon = (status: string) => {
    switch (status) {
      case "voltooid": return <CheckCircle className="w-3 h-3" />
      case "openstaand": return <AlertTriangle className="w-3 h-3" />
      default: return null
    }
  }

  const getStandBackStatusText = (status: string, remainingDays: number) => {
    if (remainingDays === 0) return "Volledig afgeboekt"
    switch (status) {
      case "voltooid": return "Voltooid"
      case "openstaand": return "Openstaand"
      default: return status
    }
  }

  // Afboeken functionaliteit
  const handleAfboeken = async (recordId: string) => {
    const record = historyRecords.find(r => r.id === recordId)
    if (!record) return

    try {
      console.log('Starting afboeken for record:', recordId)
      console.log('Current record:', record)
      console.log('Afboeken data:', afboekenData)

      // DIRECT localStorage updaten
      if (typeof window !== 'undefined') {
        const currentStandBack = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
        
        // Zoek het record
        const recordToUpdate = currentStandBack[recordId]
        if (!recordToUpdate) {
          throw new Error(`Record met ID ${recordId} niet gevonden in localStorage`)
        }

        // Bereken nieuwe waarden
        const newCompleted = (recordToUpdate.standBackDaysCompleted || 0) + afboekenData.daysCompleted
        const newRemaining = Math.max(0, (recordToUpdate.standBackDaysRemaining || 0) - afboekenData.daysCompleted)
        const newStatus = newCompleted >= recordToUpdate.standBackDaysRequired ? "voltooid" : "openstaand"
        
        console.log('Berekening:', {
          huidigCompleted: recordToUpdate.standBackDaysCompleted,
          huidigRemaining: recordToUpdate.standBackDaysRemaining,
          afboeken: afboekenData.daysCompleted,
          nieuwCompleted: newCompleted,
          nieuwRemaining: newRemaining,
          nieuwStatus: newStatus
        })

        // Update het record
        const updatedRecord = {
          ...recordToUpdate,
          standBackDaysCompleted: newCompleted,
          standBackDaysRemaining: newRemaining,
          standBackStatus: newStatus,
          standBackHistory: [
            ...(recordToUpdate.standBackHistory || []),
            {
              daysCompleted: afboekenData.daysCompleted,
              startDate: afboekenData.startDate,
              endDate: afboekenData.endDate,
              note: afboekenData.note || "Afgeboekt",
              ship: afboekenData.ship
            }
          ]
        }

        // Sla op in localStorage
        currentStandBack[recordId] = updatedRecord
        localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(currentStandBack))
        
        console.log('Updated record in localStorage:', updatedRecord)

        // Update de state direct
        const updatedRecordsArray = Object.values(currentStandBack)
          .map((record: any) => {
            const crewMember = allCrewData.find((c: any) => c.id === record.crewMemberId)
            const ship = crewMember?.ship_id ? getCombinedShipDatabase()[crewMember.ship_id] : null
            
            return {
              ...record,
              crewMember,
              ship,
              crew_member_id: record.crewMemberId,
              start_date: record.startDate,
              end_date: record.endDate,
              days_count: record.daysCount,
              stand_back_days_required: record.standBackDaysRequired,
              stand_back_days_completed: record.standBackDaysCompleted,
              stand_back_days_remaining: record.standBackDaysRemaining,
              stand_back_status: record.standBackStatus,
              stand_back_history: record.standBackHistory || []
            }
          })
          .filter((record) => record.standBackDaysRemaining > 0)
          .sort((a, b) => {
            try {
              const dateA = new Date(a.startDate || 0).getTime()
              const dateB = new Date(b.startDate || 0).getTime()
              return dateB - dateA
            } catch (error) {
              return 0
            }
          })

        setHistoryRecords(updatedRecordsArray)
        console.log('State updated with:', updatedRecordsArray.length, 'records')

        // Toon succes bericht
        alert(`Succesvol ${afboekenData.daysCompleted} dag(en) afgeboekt voor ${record.crewMember?.first_name} ${record.crewMember?.last_name}`)
      }

      // Reset form
      setAfboekenData({ 
        daysCompleted: 1, 
        note: "", 
        startDate: new Date().toISOString().split('T')[0], 
        endDate: new Date().toISOString().split('T')[0], 
        ship: "" 
      })
      setAfboekenDialog(null)
    } catch (error) {
      console.error('Error updating stand back record:', error)
      const errorMessage = error instanceof Error ? error.message : 
                          typeof error === 'string' ? error : 
                          'Onbekende fout opgetreden'
      alert('Fout bij het afboeken van dagen: ' + errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <MobileHeaderNav />
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <div>
            <h1 className="text-2xl font-bold">Terug Te Staan Dagen</h1>
            <p className="text-sm text-gray-600">Overzicht van openstaande terug te staan dagen</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/ziekte" className="bg-blue-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-blue-700 shadow flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Ziekte Overzicht
          </Link>
        </div>
      </div>

      {/* Records */}
      {historyRecords.length > 0 ? (
        <div className="space-y-6">
          {historyRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="w-14 h-14 border-2 border-blue-100">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                        {record.crewMember?.first_name?.[0] || '?'}{record.crewMember?.last_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {record.crewMember?.first_name && record.crewMember?.last_name 
                            ? `${record.crewMember.first_name} ${record.crewMember.last_name}`
                            : `Crew Member ID: ${record.crew_member_id}`
                          }
                        </h3>
                        {record.crewMember?.position && (
                          <Badge variant="outline" className="text-sm font-medium">
                            {record.crewMember.position}
                          </Badge>
                        )}
                        {record.crewMember?.nationality && (
                          <span className="text-lg">
                            {getNationalityFlag(record.crewMember.nationality)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Ship className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-xs text-gray-500 font-medium">Schip</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {record.ship?.name || "Geen schip"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="text-xs text-gray-500 font-medium">Start Datum</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {(() => {
                                try {
                                  const dateValue = record.start_date || record.startDate
                                  if (!dateValue) return 'Geen datum'
                                  return format(new Date(dateValue), 'dd-MM-yyyy')
                                } catch (error) {
                                  console.warn('Invalid date:', record.start_date || record.startDate)
                                  return 'Ongeldige datum'
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Clock className="w-5 h-5 text-orange-600" />
                          <div>
                            <div className="text-xs text-gray-500 font-medium">Openstaande Dagen</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {record.standBackDaysRemaining || record.stand_back_days_remaining} van {record.standBackDaysRequired || record.stand_back_days_required}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 mb-4">
                        {getStandBackStatusIcon(record.standBackStatus || record.stand_back_status)}
                        <Badge 
                          className={`text-sm font-medium px-3 py-1 ${getStandBackStatusColor(record.standBackStatus || record.stand_back_status, record.standBackDaysRemaining || record.stand_back_days_remaining)}`}
                        >
                          {getStandBackStatusText(record.standBackStatus || record.stand_back_status, record.standBackDaysRemaining || record.stand_back_days_remaining)}
                        </Badge>
                      </div>

                      {record.description && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                          <p className="text-sm text-blue-800 font-medium">{record.description}</p>
                        </div>
                      )}

                      {/* History */}
                      {record.stand_back_history && record.stand_back_history.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Geschiedenis:</h4>
                          <div className="space-y-2">
                            {record.stand_back_history.map((history: any, index: number) => (
                              <div key={index} className="text-xs text-gray-600 bg-white border border-gray-200 p-3 rounded-lg">
                                {(() => {
                                  try {
                                    if (history.start_date && history.end_date) {
                                      return <div className="font-medium">{format(new Date(history.start_date), 'dd-MM-yyyy')} - {format(new Date(history.end_date), 'dd-MM-yyyy')}</div>
                                    }
                                    if (history.startDate && history.endDate) {
                                      return <div className="font-medium">{format(new Date(history.startDate), 'dd-MM-yyyy')} - {format(new Date(history.endDate), 'dd-MM-yyyy')}</div>
                                    }
                                    return null
                                  } catch (error) {
                                    console.warn('Invalid history date:', history)
                                    return <div>Ongeldige datum</div>
                                  }
                                })()}
                                {history.description && <div className="text-gray-500 mt-1">{history.description}</div>}
                                {history.days_count && <div className="text-gray-500">Dagen: {history.days_count}</div>}
                                {history.daysCount && <div className="text-gray-500">Dagen: {history.daysCount}</div>}
                                {history.added_days && <div className="text-gray-500">Toegevoegd: {history.added_days} dagen</div>}
                                {history.addedDays && <div className="text-gray-500">Toegevoegd: {history.addedDays} dagen</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3 ml-6">
                    <Dialog open={afboekenDialog === record.id} onOpenChange={(open) => setAfboekenDialog(open ? record.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                          Dagen Afboeken
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Dagen Afboeken</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="daysCompleted">Aantal dagen</Label>
                            <Input
                              id="daysCompleted"
                              type="number"
                              min="1"
                              max={record.stand_back_days_remaining}
                              value={afboekenData.daysCompleted}
                              onChange={(e) => setAfboekenData(prev => ({ ...prev, daysCompleted: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="startDate">Start datum</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={afboekenData.startDate}
                              onChange={(e) => setAfboekenData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="endDate">Eind datum</Label>
                            <Input
                              id="endDate"
                              type="date"
                              value={afboekenData.endDate}
                              onChange={(e) => setAfboekenData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="ship">Schip</Label>
                            <Input
                              id="ship"
                              value={afboekenData.ship}
                              onChange={(e) => setAfboekenData(prev => ({ ...prev, ship: e.target.value }))}
                              placeholder="Optioneel"
                            />
                          </div>
                          <div>
                            <Label htmlFor="note">Opmerking</Label>
                            <Textarea
                              id="note"
                              value={afboekenData.note}
                              onChange={(e) => setAfboekenData(prev => ({ ...prev, note: e.target.value }))}
                              placeholder="Optioneel"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleAfboeken(record.id)}
                              disabled={afboekenData.daysCompleted > record.stand_back_days_remaining}
                            >
                              Afboeken
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setAfboekenDialog(null)}
                            >
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen openstaande terug staan dagen</h3>
          <p className="text-gray-600">Er zijn momenteel geen openstaande terug staan dagen.</p>
        </div>
      )}
    </div>
  )
}
