"use client"

import { useState, useEffect } from "react"
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
  Download
} from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"

interface StandBackRecord {
  id: string
  crewMemberId: string
  startDate: string
  endDate: string
  daysCount: number
  description: string
  reason: string
  standBackDaysRemaining: number
  standBackDaysRequired: number
  standBackDaysCompleted: number
  standBackHistory: any[]
  standBackStatus: 'openstaand' | 'voltooid' | 'uit-dienst'
  archiveStatus?: 'voltooid' | 'uit-dienst'
  archivedAt?: string
  archivedBy?: string
  createdAt: string
  updatedAt: string
  crewMember?: {
    id: string
    firstName: string
    lastName: string
    position: string
    nationality: string
    phone?: string
    shipId?: string
  }
  ship?: {
    id: string
    name: string
  }
}

export function StandBackLocal() {
  const [selectedRecord, setSelectedRecord] = useState<StandBackRecord | null>(null)
  const [isAddDaysOpen, setIsAddDaysOpen] = useState(false)
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false)
  const [daysToAdd, setDaysToAdd] = useState("")
  const [note, setNote] = useState("")
  const [standBackRecords, setStandBackRecords] = useState<StandBackRecord[]>([])
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'voltooid' | 'uit-dienst'>('all')
  
  // New record form state
  const [newRecord, setNewRecord] = useState({
    crewMemberId: "",
    reason: "ziekte",
    startDate: "",
    endDate: "",
    daysCount: "",
    description: ""
  })
  
  const { crew, ships, loading } = useSupabaseData()

  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('standBackRecords')
    if (saved) {
      try {
        const records = JSON.parse(saved)
        setStandBackRecords(records)
      } catch (error) {
        console.error('Error loading stand back records from localStorage:', error)
      }
    }
  }, [])

  // Save data to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('standBackRecords', JSON.stringify(standBackRecords))
  }, [standBackRecords])

  // Filter records by status
  const openStandBackRecords = standBackRecords
    .filter(record => record.standBackDaysRemaining > 0 && record.standBackStatus === 'openstaand')
    .sort((a, b) => b.standBackDaysRemaining - a.standBackDaysRemaining)

  // Archive records (completed and terminated)
  const allArchiveRecords = standBackRecords
    .filter(record => record.standBackStatus === 'voltooid' || record.standBackStatus === 'uit-dienst')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  // Filter archive records based on selected filter
  const archiveRecords = allArchiveRecords.filter(record => {
    if (archiveFilter === 'all') return true
    if (archiveFilter === 'voltooid') return record.standBackStatus === 'voltooid'
    if (archiveFilter === 'uit-dienst') return record.standBackStatus === 'uit-dienst'
    return true
  })

  const totalOpenDays = openStandBackRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0)
  
  // Archive statistics
  const archiveStats = {
    total: allArchiveRecords.length,
    voltooid: allArchiveRecords.filter(r => r.standBackStatus === 'voltooid').length,
    uitDienst: allArchiveRecords.filter(r => r.standBackStatus === 'uit-dienst').length,
    totalOpenstaandInArchief: allArchiveRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0),
    voltooidOpenstaand: allArchiveRecords.filter(r => r.standBackStatus === 'voltooid').reduce((sum, record) => sum + record.standBackDaysRemaining, 0),
    uitDienstOpenstaand: allArchiveRecords.filter(r => r.standBackStatus === 'uit-dienst').reduce((sum, record) => sum + record.standBackDaysRemaining, 0)
  }

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
        completedBy: 'User'
      }
      
      // Update record
      const updatedRecords = standBackRecords.map(record => 
        record.id === selectedRecord.id 
          ? {
              ...record,
              standBackDaysCompleted: newCompleted,
              standBackDaysRemaining: newRemaining,
              standBackStatus: newStatus,
              standBackHistory: [...record.standBackHistory, historyEntry],
              updatedAt: new Date().toISOString()
            }
          : record
      )
      
      setStandBackRecords(updatedRecords)
      
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
      const daysCount = Number.parseInt(newRecord.daysCount)
      const standBackDaysRequired = daysCount
      
      const crewMember = crew.find(c => c.id === newRecord.crewMemberId)
      const ship = crewMember?.ship_id ? ships.find(s => s.id === crewMember.ship_id) : null
      
      const newRecordData: StandBackRecord = {
        id: `standback-${Date.now()}`,
        crewMemberId: newRecord.crewMemberId,
        startDate: newRecord.startDate,
        endDate: newRecord.endDate,
        daysCount: daysCount,
        description: newRecord.description || `Terug-te-staan voor ${newRecord.reason}`,
        reason: newRecord.reason,
        standBackDaysRequired: standBackDaysRequired,
        standBackDaysCompleted: 0,
        standBackDaysRemaining: standBackDaysRequired,
        standBackStatus: 'openstaand',
        standBackHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        crewMember: crewMember ? {
          id: crewMember.id,
          firstName: crewMember.first_name,
          lastName: crewMember.last_name,
          position: crewMember.position,
          nationality: crewMember.nationality,
          phone: crewMember.phone,
          shipId: crewMember.ship_id,
        } : undefined,
        ship: ship ? {
          id: ship.id,
          name: ship.name,
        } : undefined,
      }
      
      setStandBackRecords(prev => [...prev, newRecordData])
      
      alert("Terug-te-staan registratie succesvol toegevoegd!")
      
      // Reset form
      setNewRecord({
        crewMemberId: "",
        reason: "ziekte",
        startDate: "",
        endDate: "",
        daysCount: "",
        description: ""
      })
      setIsNewRecordOpen(false)
    } catch (error) {
      console.error('Error creating stand-back record:', error)
      alert('Fout bij het aanmaken van registratie: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleMarkAsCompleted = async (record: StandBackRecord) => {
    try {
      const updatedRecords = standBackRecords.map(r => 
        r.id === record.id 
          ? {
              ...r,
              standBackStatus: 'voltooid',
              archiveStatus: 'voltooid',
              standBackDaysCompleted: r.standBackDaysRequired,
              standBackDaysRemaining: 0,
              archivedAt: new Date().toISOString(),
              archivedBy: 'User',
              updatedAt: new Date().toISOString()
            }
          : r
      )
      
      setStandBackRecords(updatedRecords)
      
      alert(`Registratie gemarkeerd als voltooid voor ${record.crewMember?.firstName} ${record.crewMember?.lastName}`)
    } catch (error) {
      console.error('Error marking as completed:', error)
      alert('Fout bij het markeren als voltooid: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleArchiveOnTermination = async (record: StandBackRecord) => {
    try {
      const updatedRecords = standBackRecords.map(r => 
        r.id === record.id 
          ? {
              ...r,
              standBackStatus: 'uit-dienst',
              archiveStatus: 'uit-dienst',
              archivedAt: new Date().toISOString(),
              archivedBy: 'User',
              updatedAt: new Date().toISOString()
            }
          : r
      )
      
      setStandBackRecords(updatedRecords)
      
      alert(`Registratie gearchiveerd (uit dienst) voor ${record.crewMember?.firstName} ${record.crewMember?.lastName}. Openstaande dagen: ${record.standBackDaysRemaining}`)
    } catch (error) {
      console.error('Error archiving on termination:', error)
      alert('Fout bij het archiveren: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const calculateDaysBetween = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
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
      'Beschrijving'
    ]

    const csvRows = archiveRecords.map(record => [
      `${record.crewMember?.firstName} ${record.crewMember?.lastName}`,
      record.reason || 'overig',
      new Date(record.startDate).toLocaleDateString("nl-NL"),
      new Date(record.endDate).toLocaleDateString("nl-NL"),
      record.daysCount,
      record.standBackDaysCompleted,
      record.standBackDaysRemaining,
      record.standBackStatus === 'voltooid' ? 'Voltooid' : 'Uit Dienst',
      record.description || ''
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <UserClock className="w-5 h-5" />
              <span>Terug-te-staan Dagen Beheer</span>
              <Badge variant="destructive" className="ml-2">
                {totalOpenDays} dagen totaal
              </Badge>
              <Badge variant="outline" className="ml-2">
                LocalStorage
              </Badge>
            </CardTitle>
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
                        placeholder="Bijv. 'Ziekte', 'Verlof', 'Training', etc."
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
                            {record.crewMember?.firstName[0]}
                            {record.crewMember?.lastName[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {record.crewMember?.firstName} {record.crewMember?.lastName}
                            </h4>
                            <span className="text-lg">{getNationalityFlag(record.crewMember?.nationality || '')}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.crewMember?.nationality}
                            </Badge>
                            <Badge className={`text-xs ${getReasonColor(record.reason || 'overig')}`}>
                              {record.reason || 'overig'}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-medium">{record.crewMember?.position}</span>
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
                                Terug Staan Dagen Afboeken - {record.crewMember?.firstName} {record.crewMember?.lastName}
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

                        <div className="flex flex-col space-y-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkAsCompleted(record)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Voltooid
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleArchiveOnTermination(record)}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Uit Dienst
                          </Button>
                        </div>
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

                    {/* Description */}
                    {record.description && (
                      <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500">Beschrijving</label>
                        <p className="text-sm text-gray-700 mt-1">{record.description}</p>
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
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Totaal Archief</div>
                  <div className="text-lg font-semibold">{archiveStats.total}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Voltooid</div>
                  <div className="text-lg font-semibold text-green-700">{archiveStats.voltooid}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600">Uit Dienst</div>
                  <div className="text-lg font-semibold text-orange-700">{archiveStats.uitDienst}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-sm text-red-600">Openstaand in Archief</div>
                  <div className="text-lg font-semibold text-red-700">{archiveStats.totalOpenstaandInArchief} dagen</div>
                </div>
              </div>

              {/* Archive Filter */}
              <div className="flex items-center space-x-4 mt-4">
                <span className="text-sm font-medium text-gray-700">Filter:</span>
                <div className="flex space-x-2">
                  <Button
                    variant={archiveFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setArchiveFilter('all')}
                  >
                    Alle ({archiveStats.total})
                  </Button>
                  <Button
                    variant={archiveFilter === 'voltooid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setArchiveFilter('voltooid')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Voltooid ({archiveStats.voltooid})
                  </Button>
                  <Button
                    variant={archiveFilter === 'uit-dienst' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setArchiveFilter('uit-dienst')}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Uit Dienst ({archiveStats.uitDienst})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {archiveRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gray-100 text-gray-700">
                            {record.crewMember?.firstName[0]}
                            {record.crewMember?.lastName[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {record.crewMember?.firstName} {record.crewMember?.lastName}
                            </h4>
                            <span className="text-lg">{getNationalityFlag(record.crewMember?.nationality || '')}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.crewMember?.nationality}
                            </Badge>
                            <Badge className={`text-xs ${getReasonColor(record.reason || 'overig')}`}>
                              {record.reason || 'overig'}
                            </Badge>
                            <Badge className={`text-xs ${
                              record.standBackStatus === 'voltooid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {record.standBackStatus === 'voltooid' ? 'Voltooid' : 'Uit Dienst'}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-medium">{record.crewMember?.position}</span>
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
                          {record.standBackStatus === 'voltooid' ? 'Voltooid' : 'Gearchiveerd'}: {new Date(record.updatedAt).toLocaleDateString("nl-NL")}
                        </div>
                        {record.standBackStatus === 'uit-dienst' && record.standBackDaysRemaining > 0 && (
                          <Badge variant="destructive" className="text-sm mt-1">
                            {record.standBackDaysRemaining} dagen openstaand
                          </Badge>
                        )}
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
                          {record.standBackStatus === 'voltooid' 
                            ? 'Volledig ingehaald' 
                            : `Gedeeltelijk ingehaald (${record.standBackDaysRemaining} dagen openstaand)`
                          }
                        </p>
                      </div>
                    </div>

                    {record.description && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500">Beschrijving</label>
                        <p className="text-sm text-gray-700 mt-1">{record.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {archiveRecords.length === 0 && (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Geen gearchiveerde registraties</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
