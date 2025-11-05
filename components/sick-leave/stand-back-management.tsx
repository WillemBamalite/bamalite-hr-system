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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ClockIcon as UserClock, 
  Calendar, 
  CheckCircle, 
  Ship, 
  Plus, 
  Archive,
  FileText,
  Download,
  UserX,
  Trash2
} from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { supabase } from "@/lib/supabase"

export function StandBackManagement() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isAddDaysOpen, setIsAddDaysOpen] = useState(false)
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [daysToAdd, setDaysToAdd] = useState("")
  const [note, setNote] = useState("")
  
  // New record form state
  const [newRecord, setNewRecord] = useState({
    crewMemberId: "",
    reason: "ziekte",
    startDate: "",
    endDate: "",
    daysCount: "",
    description: "",
    notes: ""
  })
  
  const { standBackRecords, crew, ships, loading, error, updateStandBackRecord, addStandBackRecord, loadData } = useSupabaseData()

  // Filter records by status
  const openStandBackRecords = standBackRecords
    .filter((record: any) => (record.stand_back_days_remaining || 0) > 0 && record.stand_back_status === 'openstaand')
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
        reason: record.reason || 'ziekte',
        notes: record.notes || '',
        standBackDaysRemaining: record.stand_back_days_remaining || 0,
        standBackDaysRequired: record.stand_back_days_required || 0,
        standBackDaysCompleted: record.stand_back_days_completed || 0,
        standBackHistory: record.stand_back_history || [],
        standBackStatus: record.stand_back_status || 'openstaand',
        archiveStatus: 'openstaand', // Default for now since we don't have this field yet
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

  // Archive records (completed and terminated)
  const archiveRecords = standBackRecords
    .filter((record: any) => record.stand_back_status === 'voltooid')
    .map((record: any) => {
      const crewMember = crew.find((c: any) => c.id === record.crew_member_id)
      const ship = crewMember?.ship_id ? ships.find((s: any) => s.id === crewMember.ship_id) : null
      return {
        id: record.id,
        crewMemberId: record.crew_member_id,
        startDate: record.start_date,
        endDate: record.end_date,
        daysCount: record.days_count || 0,
        description: record.description || '',
        reason: record.reason || 'ziekte',
        notes: record.notes || '',
        standBackDaysRemaining: record.stand_back_days_remaining || 0,
        standBackDaysRequired: record.stand_back_days_required || 0,
        standBackDaysCompleted: record.stand_back_days_completed || 0,
        standBackHistory: record.stand_back_history || [],
        standBackStatus: record.stand_back_status || 'openstaand',
        archiveStatus: record.description?.includes('[UIT DIENST') ? 'gearchiveerd-uitdienst' : 'voltooid',
        archivedAt: record.updated_at, // Use updated_at as proxy for archived_at
        archivedBy: 'Systeem',
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
    .sort((a, b) => new Date(b.archivedAt || b.updatedAt).getTime() - new Date(a.archivedAt || a.updatedAt).getTime())

  const totalOpenDays = openStandBackRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0)

  // Archive statistics
  const archiveStats = {
    total: archiveRecords.length,
    completed: archiveRecords.filter(r => r.archiveStatus === 'voltooid' && !r.description?.includes('[UIT DIENST')).length,
    terminated: archiveRecords.filter(r => r.archiveStatus === 'gearchiveerd-uitdienst' || r.description?.includes('[UIT DIENST')).length,
    totalRemainingDays: archiveRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0)
  }

  // Archive filter state
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'voltooid' | 'gearchiveerd-uitdienst'>('all')
  
  // Filtered archive records
  const filteredArchiveRecords = archiveFilter === 'all' 
    ? archiveRecords 
    : archiveRecords.filter(record => {
      if (archiveFilter === 'voltooid') {
        return record.archiveStatus === 'voltooid' && !record.description?.includes('[UIT DIENST')
      } else if (archiveFilter === 'gearchiveerd-uitdienst') {
        return record.archiveStatus === 'gearchiveerd-uitdienst' || record.description?.includes('[UIT DIENST')
      }
      return true
    })

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

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'ziekte':
        return 'bg-red-100 text-red-800'
      case 'vrij genomen':
        return 'bg-blue-100 text-blue-800'
      case 'verlof':
        return 'bg-green-100 text-green-800'
      case 'training':
        return 'bg-purple-100 text-purple-800'
      case 'school':
        return 'bg-yellow-100 text-yellow-800'
      case 'overig':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getArchiveStatusColor = (status: string) => {
    switch (status) {
      case 'voltooid':
        return 'bg-green-100 text-green-800'
      case 'gearchiveerd-uitdienst':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
      const newArchiveStatus = newRemaining === 0 ? 'voltooid' : 'openstaand'
      
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

  const handleCreateNewRecord = async () => {
    if (!newRecord.crewMemberId || !newRecord.startDate || !newRecord.endDate || !newRecord.daysCount) {
      alert("Vul alle verplichte velden in")
      return
    }

    try {
      const startDate = new Date(newRecord.startDate)
      const endDate = new Date(newRecord.endDate)
      const daysCount = Number.parseInt(newRecord.daysCount)
      
      // Calculate stand-back days (usually 1:1 ratio, but can be customized)
      const standBackDaysRequired = daysCount
      
      await addStandBackRecord({
        id: crypto.randomUUID(), // Generate UUID for the record
        crew_member_id: newRecord.crewMemberId,
        start_date: newRecord.startDate,
        end_date: newRecord.endDate,
        days_count: daysCount,
        reason: newRecord.reason, // Add the reason field
        description: newRecord.description || `Terug-te-staan voor ${newRecord.reason}`,
        notes: newRecord.notes || '', // Add notes field
        stand_back_days_required: standBackDaysRequired,
        stand_back_days_completed: 0,
        stand_back_days_remaining: standBackDaysRequired,
        stand_back_status: 'openstaand',
        stand_back_history: []
      })
      
      alert("Terug-te-staan registratie succesvol toegevoegd!")
      
      // Reset form
      setNewRecord({
        crewMemberId: "",
        reason: "ziekte",
        startDate: "",
        endDate: "",
        daysCount: "",
        description: "",
        notes: ""
      })
      setIsNewRecordOpen(false)
    } catch (error) {
      console.error('Error creating stand-back record:', error)
      alert('Fout bij het aanmaken van registratie: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleArchiveRecord = async (record: any, archiveType: 'completed' | 'terminated') => {
    try {
      if (archiveType === 'completed') {
        // Mark as fully completed
        await updateStandBackRecord(record.id, {
          stand_back_status: 'voltooid',
          stand_back_days_completed: record.standBackDaysRequired,
          stand_back_days_remaining: 0
        })
      } else {
        // Archive with remaining days (terminated employee) - just mark as completed for now
        // We'll use the description field to indicate it's a terminated employee
        const originalDescription = record.description || 'Geen klacht opgegeven'
        await updateStandBackRecord(record.id, {
          stand_back_status: 'voltooid',
          description: `${originalDescription} [UIT DIENST - ${record.standBackDaysRemaining} dagen openstaand]`
          // Keep stand_back_days_remaining as is to show remaining days
        })
      }
      
      const message = archiveType === 'completed' 
        ? `Registratie gemarkeerd als voltooid voor ${record.crewMember?.firstName} ${record.crewMember?.lastName}`
        : `Registratie gearchiveerd (uit dienst) voor ${record.crewMember?.firstName} ${record.crewMember?.lastName} - ${record.standBackDaysRemaining} dagen blijven openstaand`
      
      alert(message)
      setIsArchiveOpen(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error('Error archiving record:', error)
      alert('Fout bij het archiveren: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDeleteRecord = async (record: any) => {
    const confirmMessage = `Weet je zeker dat je deze registratie DEFINITIEF wilt verwijderen?\n\nMedewerker: ${record.crewMember?.firstName} ${record.crewMember?.lastName}\nReden: ${record.reason}\nPeriode: ${new Date(record.startDate).toLocaleDateString("nl-NL")} - ${new Date(record.endDate).toLocaleDateString("nl-NL")}\n\nDeze actie kan NIET ongedaan worden gemaakt!`
    
    if (confirm(confirmMessage)) {
      try {
        console.log('Deleting stand back record:', record.id)
        const { error } = await supabase
          .from('stand_back_records')
          .delete()
          .eq('id', record.id)
        
        if (error) {
          console.error('Error deleting record:', error)
          throw error
        }
        
        alert(`Registratie definitief verwijderd voor ${record.crewMember?.firstName} ${record.crewMember?.lastName}`)
        
        // Reload data to refresh the list
        await loadData()
      } catch (error) {
        console.error('Error deleting record:', error)
        alert('Fout bij het verwijderen: ' + (error instanceof Error ? error.message : String(error)))
      }
    }
  }

  const calculateDaysBetween = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const handleExportArchive = () => {
    // Create CSV content
    const csvHeaders = [
      'Medewerker',
      'Reden',
      'Periode Van',
      'Periode Tot',
      'Aantal Dagen',
      'Voltooid',
      'Openstaand',
      'Status',
      'Gearchiveerd Op',
      'Beschrijving',
      'Opmerkingen'
    ]

    const csvRows = archiveRecords.map(record => [
      `${record.crewMember?.firstName || ''} ${record.crewMember?.lastName || ''}`,
      record.reason,
      new Date(record.startDate).toLocaleDateString("nl-NL"),
      new Date(record.endDate).toLocaleDateString("nl-NL"),
      record.daysCount,
      record.standBackDaysCompleted,
      record.standBackDaysRemaining,
      record.description?.includes('[UIT DIENST') ? 'Uit Dienst' : 'Voltooid',
      record.archivedAt ? new Date(record.archivedAt).toLocaleDateString("nl-NL") : '',
      record.description?.includes('[UIT DIENST') 
        ? record.description.split(' [UIT DIENST')[0] 
        : record.description || '',
      record.notes || ''
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `terug-te-staan-archief-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setNewRecord(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate days if both dates are set
      if (updated.startDate && updated.endDate) {
        const days = calculateDaysBetween(updated.startDate, updated.endDate)
        updated.daysCount = days.toString()
      }
      
      return updated
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold">Terug-te-staan Dagen Beheer</h1>
                <p className="text-sm text-gray-600">Beheer alle terug-te-staan situaties: ziekte, verlof, training en meer</p>
              </div>
              <div className="flex items-center space-x-2">
                <UserClock className="w-5 h-5" />
                <Badge variant="destructive">
                  {totalOpenDays} dagen totaal
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={isNewRecordOpen} onOpenChange={setIsNewRecordOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Registratie
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Terug-te-staan Registratie</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="crewMember">Medewerker *</Label>
                        <Select value={newRecord.crewMemberId} onValueChange={(value) => setNewRecord(prev => ({ ...prev, crewMemberId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer medewerker" />
                          </SelectTrigger>
                          <SelectContent>
                            {crew.filter(c => c.status !== 'uit-dienst').map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.first_name} {member.last_name} - {member.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="reason">Reden *</Label>
                        <Select value={newRecord.reason} onValueChange={(value) => setNewRecord(prev => ({ ...prev, reason: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ziekte">Ziekte</SelectItem>
                            <SelectItem value="vrij genomen">Vrij genomen</SelectItem>
                            <SelectItem value="verlof">Verlof</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="school">School</SelectItem>
                            <SelectItem value="overig">Overig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="startDate">Van datum *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newRecord.startDate}
                          onChange={(e) => handleDateChange('startDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="endDate">Tot datum *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newRecord.endDate}
                          onChange={(e) => handleDateChange('endDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="daysCount">Aantal dagen *</Label>
                        <Input
                          id="daysCount"
                          type="number"
                          min="1"
                          value={newRecord.daysCount}
                          onChange={(e) => setNewRecord(prev => ({ ...prev, daysCount: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Beschrijving</Label>
                      <Textarea
                        id="description"
                        value={newRecord.description}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Bijv. 'Griep', 'Persoonlijke omstandigheden', etc."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Opmerkingen</Label>
                      <Textarea
                        id="notes"
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Extra informatie over de situatie"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsNewRecordOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleCreateNewRecord}>Registratie Aanmaken</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="openstaand" className="space-y-4">
        <TabsList>
          <TabsTrigger value="openstaand">
            Openstaand ({openStandBackRecords.length})
          </TabsTrigger>
          <TabsTrigger value="archief">
            Archief ({archiveRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="openstaand" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {openStandBackRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {record.crewMember?.firstName?.[0] || '?'}
                            {record.crewMember?.lastName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {record.crewMember?.firstName || 'Onbekend'} {record.crewMember?.lastName || 'Medewerker'}
                            </h4>
                            <span className="text-lg">{getNationalityFlag(record.crewMember?.nationality || 'NL')}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.crewMember?.nationality || 'NL'}
                            </Badge>
                            <Badge className={`text-xs ${getReasonColor(record.reason)}`}>
                              {record.reason}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-medium">{record.crewMember?.position || 'Onbekend'}</span>
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
                                Terug Staan Dagen Afboeken - {record.crewMember?.firstName || 'Onbekend'} {record.crewMember?.lastName || 'Medewerker'}
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

                        <Dialog
                          open={isArchiveOpen && selectedRecord?.id === record.id}
                          onOpenChange={(open) => {
                            setIsArchiveOpen(open)
                            if (open) setSelectedRecord(record)
                            else setSelectedRecord(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Archive className="w-4 h-4 mr-2" />
                              Archiveren
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Registratie Archiveren - {record.crewMember?.firstName || 'Onbekend'} {record.crewMember?.lastName || 'Medewerker'}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">
                                  <strong>Reden:</strong> {record.reason}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Periode:</strong> {new Date(record.startDate).toLocaleDateString("nl-NL")} - {new Date(record.endDate).toLocaleDateString("nl-NL")}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Openstaand:</strong> {record.standBackDaysRemaining} dagen
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Button 
                                  className="w-full" 
                                  onClick={() => handleArchiveRecord(record, 'completed')}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Markeer als Voltooid
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="w-full" 
                                  onClick={() => handleArchiveRecord(record, 'terminated')}
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Archiveer (Uit Dienst)
                                </Button>
                              </div>

                              <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>
                                  Annuleren
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Periode</label>
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-sm font-medium">
                            {new Date(record.startDate).toLocaleDateString("nl-NL")} -{" "}
                            {new Date(record.endDate).toLocaleDateString("nl-NL")}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Duur</label>
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

                    {/* Description and Notes */}
                    {record.description && (
                      <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500">Beschrijving</label>
                        <p className="text-sm text-gray-700 mt-1">{record.description}</p>
                      </div>
                    )}

                    {record.notes && (
                      <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500">Opmerkingen</label>
                        <p className="text-sm text-gray-700 mt-1">{record.notes}</p>
                      </div>
                    )}

                    {/* History */}
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
                  <p className="text-gray-500">Geen openstaande terug-te-staan dagen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archief" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Archive className="w-5 h-5" />
                  <span>Archief</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportArchive}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporteer CSV
                </Button>
              </div>
              
              {/* Archive Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{archiveStats.total}</div>
                  <div className="text-sm text-blue-600">Totaal Gearchiveerd</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{archiveStats.completed}</div>
                  <div className="text-sm text-green-600">Volledig Voltooid</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{archiveStats.terminated}</div>
                  <div className="text-sm text-orange-600">Uit Dienst</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{archiveStats.totalRemainingDays}</div>
                  <div className="text-sm text-red-600">Dagen Nog Openstaand</div>
                </div>
              </div>

              {/* Archive Filter */}
              <div className="flex items-center space-x-2 mt-4">
                <span className="text-sm font-medium text-gray-700">Filter:</span>
                <Button
                  variant={archiveFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArchiveFilter('all')}
                >
                  Alle ({archiveRecords.length})
                </Button>
                <Button
                  variant={archiveFilter === 'voltooid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArchiveFilter('voltooid')}
                >
                  Voltooid ({archiveStats.completed})
                </Button>
                <Button
                  variant={archiveFilter === 'gearchiveerd-uitdienst' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArchiveFilter('gearchiveerd-uitdienst')}
                >
                  Uit Dienst ({archiveStats.terminated})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredArchiveRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gray-100 text-gray-700">
                            {record.crewMember?.firstName?.[0] || '?'}
                            {record.crewMember?.lastName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {record.crewMember?.firstName || 'Onbekend'} {record.crewMember?.lastName || 'Medewerker'}
                            </h4>
                            <span className="text-lg">{getNationalityFlag(record.crewMember?.nationality || 'NL')}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.crewMember?.nationality || 'NL'}
                            </Badge>
                            <Badge className={`text-xs ${getReasonColor(record.reason)}`}>
                              {record.reason}
                            </Badge>
                            <Badge className={`text-xs ${getArchiveStatusColor(record.description?.includes('[UIT DIENST') ? 'gearchiveerd-uitdienst' : 'voltooid')}`}>
                              {record.description?.includes('[UIT DIENST') ? 'Uit Dienst' : 'Voltooid'}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-medium">{record.crewMember?.position || 'Onbekend'}</span>
                            {record.ship && (
                              <div className="flex items-center space-x-1">
                                <Ship className="w-3 h-3" />
                                <span>{record.ship.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Gearchiveerd: {record.archivedAt ? new Date(record.archivedAt).toLocaleDateString("nl-NL") : 'Onbekend'}
                        </div>
                        {record.standBackDaysRemaining > 0 && (
                          <Badge variant="destructive" className="text-sm mt-1">
                            {record.standBackDaysRemaining} dagen openstaand
                          </Badge>
                        )}
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRecord(record)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Verwijder
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Archive Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Periode</label>
                        <p className="font-medium">
                          {new Date(record.startDate).toLocaleDateString("nl-NL")} -{" "}
                          {new Date(record.endDate).toLocaleDateString("nl-NL")}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Duur</label>
                        <p className="font-medium">{record.daysCount} dagen</p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Voltooid</label>
                        <p className="font-medium">{record.standBackDaysCompleted}/{record.standBackDaysRequired}</p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Status</label>
                        <p className="font-medium">
                          {record.description?.includes('[UIT DIENST') ? 'Uit Dienst' : 'Volledig ingehaald'}
                        </p>
                      </div>
                    </div>

                    {record.description && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500">Beschrijving</label>
                        <p className="text-sm text-gray-700 mt-1">
                          {record.description.includes('[UIT DIENST') 
                            ? record.description.split(' [UIT DIENST')[0] 
                            : record.description}
                        </p>
                        {record.description.includes('[UIT DIENST') && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            {record.description.split('[UIT DIENST')[1].replace(']', '')}
                          </p>
                        )}
                      </div>
                    )}

                    {record.notes && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500">Opmerkingen</label>
                        <p className="text-sm text-gray-700 mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredArchiveRecords.length === 0 && (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {archiveFilter === 'all' 
                      ? 'Geen gearchiveerde registraties' 
                      : `Geen ${archiveFilter === 'voltooid' ? 'voltooide' : 'uit-dienst'} registraties`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
