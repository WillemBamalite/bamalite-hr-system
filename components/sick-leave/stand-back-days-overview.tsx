"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ClockIcon as UserClock, Calendar, CheckCircle, Ship, Plus } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"

export function StandBackDaysOverview() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isAddDaysOpen, setIsAddDaysOpen] = useState(false)
  const [daysToAdd, setDaysToAdd] = useState("")
  const [note, setNote] = useState("")
  
  const { standBackRecords, crew, ships, loading, error, updateStandBackRecord } = useSupabaseData()

  // Filter records met openstaande terug staan dagen
  const openStandBackRecords = standBackRecords
    .filter((record: any) => (record.stand_back_days_remaining || 0) > 0)
    .map((record: any) => {
      const crewMember = crew.find((c: any) => c.id === record.crew_member_id)
      const ship = crewMember?.ship_id ? ships.find((s: any) => s.id === crewMember.ship_id) : null
      return {
        id: record.id,
        crewMemberId: record.crew_member_id,
        sickLeaveId: record.sick_leave_id,
        startDate: record.start_date,
        endDate: record.end_date,
        daysCount: record.days_count || 0,
        description: record.description || '',
        standBackDaysRemaining: record.stand_back_days_remaining || 0,
        standBackDaysRequired: record.stand_back_days_required || 0,
        standBackDaysCompleted: record.stand_back_days_completed || 0,
        standBackHistory: record.stand_back_history || [],
        standBackStatus: record.stand_back_status || 'openstaand',
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        crewMember: crewMember ? {
          id: crewMember.id,
          firstName: crewMember.first_name,
          lastName: crewMember.last_name,
          position: crewMember.position,
          nationality: crewMember.nationality,
          phone: crewMember.phone,
          shipId: crewMember.ship_id,
        } : null,
        ship: ship ? {
          id: ship.id,
          name: ship.name,
        } : null,
      }
    })
    .filter((record) => record.crewMember)
    .sort((a, b) => b.standBackDaysRemaining - a.standBackDaysRemaining)

  const totalOpenDays = openStandBackRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0)

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  const handleAddStandBackDays = async () => {
    if (!selectedRecord || !daysToAdd || Number.parseInt(daysToAdd) <= 0) {
      alert("Vul een geldig aantal dagen in")
      return
    }

    try {
      const daysToComplete = Math.min(Number.parseInt(daysToAdd), selectedRecord.standBackDaysRemaining)
      
      // Bereken nieuwe waarden
      const newCompleted = selectedRecord.standBackDaysCompleted + daysToComplete
      const newRemaining = selectedRecord.standBackDaysRemaining - daysToComplete
      const newStatus = newRemaining === 0 ? 'voltooid' : 'openstaand'
      
      // Maak history entry
      const historyEntry = {
        date: new Date().toISOString(),
        daysCompleted: daysToComplete,
        note: note || 'Dagen afgeboekt',
        completedBy: 'User' // Je zou hier de logged in user kunnen gebruiken
      }
      
      // Update in database
      await updateStandBackRecord(selectedRecord.id, {
        stand_back_days_completed: newCompleted,
        stand_back_days_remaining: newRemaining,
        stand_back_status: newStatus,
        stand_back_history: [...selectedRecord.standBackHistory, historyEntry]
      })
      
      alert(`Succesvol ${daysToComplete} dag(en) afgeboekt voor ${selectedRecord.crewMember?.firstName} ${selectedRecord.crewMember?.lastName}`)
      
      // Reset form
      setDaysToAdd("")
      setNote("")
      setIsAddDaysOpen(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error('Error booking off days:', error)
      alert('Fout bij het afboeken van dagen: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <UserClock className="w-5 h-5" />
            <span>Openstaande Terug Staan Dagen</span>
            <Badge variant="destructive" className="ml-2">
              {totalOpenDays} dagen totaal
            </Badge>
          </CardTitle>
          <div className="text-sm text-gray-500">{openStandBackRecords.length} personen met openstaande dagen</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {openStandBackRecords.map((record) => (
            <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-orange-100 text-orange-700">
                      {record.crewMember.firstName[0]}
                      {record.crewMember.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {record.crewMember.firstName} {record.crewMember.lastName}
                      </h4>
                      <span className="text-lg">{getNationalityFlag(record.crewMember.nationality)}</span>
                      <Badge variant="outline" className="text-xs">
                        {record.crewMember.nationality}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-medium">{record.crewMember.position}</span>
                      {record.ship && (
                        <div className="flex items-center space-x-1">
                          <Ship className="w-3 h-3" />
                          <span>{record.ship.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-sm">
                    {record.standBackDaysRemaining} dagen resterend
                  </Badge>
                  <Dialog
                    open={isAddDaysOpen && selectedRecord?.id === record.id}
                    onOpenChange={(open) => {
                      setIsAddDaysOpen(open)
                      if (open) setSelectedRecord(record)
                      else setSelectedRecord(null)
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Dagen Afboeken
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Terug Staan Dagen Afboeken - {record.crewMember.firstName} {record.crewMember.lastName}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <strong>Openstaand:</strong> {record.standBackDaysRemaining} dagen
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Al voltooid:</strong> {record.standBackDaysCompleted} van{" "}
                            {record.standBackDaysRequired} dagen
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="days">Aantal dagen om af te boeken</Label>
                          <Input
                            id="days"
                            type="number"
                            min="1"
                            max={record.standBackDaysRemaining}
                            value={daysToAdd}
                            onChange={(e) => setDaysToAdd(e.target.value)}
                            placeholder="Aantal dagen"
                          />
                        </div>

                        <div>
                          <Label htmlFor="note">Notitie (optioneel)</Label>
                          <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Bijv. 'Terug gestaan op MS Bellona van 15-20 januari'"
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddDaysOpen(false)}>
                            Annuleren
                          </Button>
                          <Button onClick={handleAddStandBackDays}>Dagen Afboeken</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Ziekte details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Ziekte periode</label>
                  <div className="flex items-center space-x-1 mt-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium">
                      {new Date(record.startDate).toLocaleDateString("nl-NL")} -{" "}
                      {new Date(record.endDate).toLocaleDateString("nl-NL")}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Ziekte duur</label>
                  <p className="text-sm font-medium mt-1">{record.daysCount} dagen</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Voortgang</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${(record.standBackDaysCompleted / record.standBackDaysRequired) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {record.standBackDaysCompleted}/{record.standBackDaysRequired}
                    </span>
                  </div>
                </div>
              </div>

              {/* Klacht beschrijving */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500">Klacht</label>
                <p className="text-sm text-gray-700 mt-1">{record.description}</p>
              </div>

              {/* History van afboekingen */}
              {record.standBackHistory.length > 0 && (
                <div className="border-t pt-3">
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Afboek History</label>
                  <div className="space-y-2">
                    {record.standBackHistory.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                        <div>
                          <span className="font-medium">{entry.daysCompleted} dagen</span>
                          <span className="text-gray-600 ml-2">
                            op {new Date(entry.date).toLocaleDateString("nl-NL")}
                          </span>
                        </div>
                        <div className="text-gray-500">{entry.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {openStandBackRecords.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">Geen openstaande terug staan dagen</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
