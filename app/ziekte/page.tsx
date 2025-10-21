"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserX, FileText, Calendar, AlertTriangle, CheckCircle, Euro, Ship, Phone, Edit, Heart } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function ZiektePage() {
  const { crew, sickLeave, loading, error, updateCrew, updateSickLeave, addStandBackRecord } = useSupabaseData()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    hasCertificate: false,
    certificateValidUntil: "",
    salaryPercentage: "100",
    paidBy: "Bamalite S.A.",
    notes: ""
  })
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false)
  const [recoveryRecord, setRecoveryRecord] = useState<any>(null)
  const [recoveryDate, setRecoveryDate] = useState("")

  // Filter actieve ziekmeldingen (inclusief wacht-op-briefje, EXCLUSIEF afgerond)
  const activeSickLeaves = sickLeave.filter((s: any) => 
    s.status === "actief" || s.status === "wacht-op-briefje"
  )

  // Combineer ziekmeldingen met crew data
  const sickLeaveRecords = activeSickLeaves
    .map((sick: any) => {
      const crewMember = crew.find((c) => c.id === sick.crew_member_id)
      const ship = crewMember?.ship_id ? crew.find((s) => s.id === crewMember.ship_id) : null

      // Bereken dagen ziek
      const startDate = new Date(sick.start_date)
      const today = new Date()
      const daysCount = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...sick,
        crewMember,
        ship,
        daysCount,
      }
    })
    .filter((record) => record.crewMember && record.crewMember.status !== 'uit-dienst') // Filter out records zonder crew member en uit-dienst crew

  const getStatusColor = (status: string) => {
    switch (status) {
      case "actief":
        return "bg-red-100 text-red-800"
      case "hersteld":
        return "bg-green-100 text-green-800"
      case "wacht-op-briefje":
        return "bg-orange-100 text-orange-800"
      case "afgerond":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "actief":
        return "Actief ziek"
      case "hersteld":
        return "Hersteld"
      case "wacht-op-briefje":
        return "Wacht op briefje"
      case "afgerond":
        return "Afgerond"
      default:
        return status
    }
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

  const getCertificateStatus = (record: any) => {
    if (!record.certificate_valid_until) {
      return {
        color: "bg-red-100 text-red-800",
        text: "Geen ziektebriefje",
        icon: AlertTriangle,
      }
    }

    if (record.certificate_valid_until) {
      const validUntil = new Date(record.certificate_valid_until)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        return {
          color: "bg-red-100 text-red-800",
          text: "Briefje verlopen",
          icon: AlertTriangle,
        }
      } else if (daysUntilExpiry <= 7) {
        return {
          color: "bg-orange-100 text-orange-800",
          text: `Briefje verloopt over ${daysUntilExpiry} dagen (${format(validUntil, "dd-MM-yyyy")})`,
          icon: AlertTriangle,
        }
      } else {
        return {
          color: "bg-green-100 text-green-800",
          text: `Briefje geldig t/m ${format(validUntil, "dd-MM-yyyy")}`,
          icon: CheckCircle,
        }
      }
    }

    return {
      color: "bg-green-100 text-green-800",
      text: "Briefje aanwezig",
      icon: CheckCircle,
    }
  }

  const handleEdit = (record: any) => {
    setEditingRecord(record)
    setEditForm({
      hasCertificate: !!record.certificate_valid_until, // Heeft briefje als deze datum gevuld is
      certificateValidUntil: record.certificate_valid_until ? format(new Date(record.certificate_valid_until), "yyyy-MM-dd") : "",
      salaryPercentage: record.salary_percentage?.toString() || "100",
      paidBy: record.paid_by || "Bamalite S.A.",
      notes: record.notes || ""
    })
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingRecord) return

    try {
      console.log('=== STARTING SICK LEAVE UPDATE ===')
      console.log('Editing record ID:', editingRecord.id)
      console.log('Edit form data:', editForm)
      
      // Update de record in Supabase
      // Note: dokters_verklaring is GEEN database kolom, wordt afgeleid van certificate_valid_until
      const updatedRecord: any = {
        certificate_valid_until: editForm.hasCertificate && editForm.certificateValidUntil ? editForm.certificateValidUntil : null,
        salary_percentage: parseInt(editForm.salaryPercentage),
        paid_by: editForm.paidBy,
        notes: editForm.notes || "" // Use empty string instead of null
      }

      // Update status naar "actief" als er een briefje is
      if (editForm.hasCertificate && editingRecord.status === "wacht-op-briefje") {
        updatedRecord.status = "actief"
      }

      console.log('Updated record data:', updatedRecord)

      // Update in Supabase
      console.log('Calling updateSickLeave...')
      const result = await updateSickLeave(editingRecord.id, updatedRecord)
      console.log('✅ Update result:', result)

      setEditDialogOpen(false)
      setEditingRecord(null)
      setEditForm({
        hasCertificate: false,
        certificateValidUntil: "",
        salaryPercentage: "100",
        paidBy: "Bamalite S.A.",
        notes: ""
      })
      
      alert("Ziekmelding bijgewerkt!")
      console.log('=== SICK LEAVE UPDATE COMPLETED ===')
    } catch (error) {
      console.error("❌ Error updating sick leave record:", error)
      console.error("❌ Error details:", JSON.stringify(error, null, 2))
      alert("Fout bij het bijwerken van de ziekmelding: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleMarkAsRecovered = (record: any) => {
    if (!record) return
    
    // Open recovery dialog
    setRecoveryRecord(record)
    setRecoveryDate("")
    setRecoveryDialogOpen(true)
  }

  const handleRecoveryConfirm = async () => {
    if (!recoveryRecord || !recoveryDate) {
      alert("Vul een datum in voor terugkeer aan boord")
      return
    }

    try {
      console.log('=== STARTING RECOVERY PROCESS ===')
      console.log('Recovery record:', recoveryRecord)
      console.log('Recovery date:', recoveryDate)
      
      // Update sick leave record status naar "afgerond"
      console.log('Updating sick leave record...')
      await updateSickLeave(recoveryRecord.id, {
        status: "afgerond",
        end_date: recoveryDate
      })
      console.log('✅ Sick leave updated successfully')

      // Update crew member status naar "thuis"
      console.log('Updating crew member...')
      
      // Check of terugkeerdatum in de toekomst ligt
      const recoveryDateObj = new Date(recoveryDate)
      recoveryDateObj.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const isFutureDate = recoveryDateObj > today
      
      if (isFutureDate) {
        // Terugkeerdatum in de toekomst: persoon blijft "thuis" tot die datum
        console.log('Recovery date is in the future, setting expected_start_date')
        await updateCrew(recoveryRecord.crewMember.id, {
          status: "thuis",
          expected_start_date: recoveryDate, // Wacht tot deze datum om aan boord te gaan
          on_board_since: null, // Nog niet aan boord
          thuis_sinds: today.toISOString().split('T')[0] // Thuis vanaf vandaag
        })
      } else {
        // Terugkeerdatum vandaag of in het verleden: persoon gaat direct aan boord
        console.log('Recovery date is today or in the past, starting rotation immediately')
        await updateCrew(recoveryRecord.crewMember.id, {
          status: "thuis",
          on_board_since: recoveryDate, // Vanaf deze datum start de rotatie
          expected_start_date: null, // Geen wachtdatum
          thuis_sinds: null // Rotatie is gestart
        })
      }
      
      console.log('✅ Crew member updated successfully')

      // Bereken ziekte duur
      const sickStartDate = new Date(recoveryRecord.start_date)
      const sickEndDate = new Date(recoveryDate)
      const daysCount = Math.floor((sickEndDate.getTime() - sickStartDate.getTime()) / (1000 * 60 * 60 * 24))

      // Voeg 7 dagen "terug te staan" toe aan Supabase
      const standBackRecord = {
        id: crypto.randomUUID(), // Generate UUID for the record
        crew_member_id: recoveryRecord.crewMember.id,
        sick_leave_id: recoveryRecord.id,
        start_date: recoveryRecord.start_date,
        end_date: recoveryDate,
        days_count: daysCount,
        reason: 'ziekte', // Stand-back reason is always 'ziekte' for sick leave
        description: recoveryRecord.reason || 'Geen klacht opgegeven',
        notes: recoveryRecord.notes || '', // Pass through the notes from sick leave
        stand_back_days_required: 7,
        stand_back_days_completed: 0,
        stand_back_days_remaining: 7,
        stand_back_status: "openstaand",
        stand_back_history: []
      }

      console.log('Creating stand back record in Supabase:', standBackRecord)
      console.log('Stand back record data structure:', JSON.stringify(standBackRecord, null, 2))
      
      const result = await addStandBackRecord(standBackRecord)
      console.log('✅ Stand back record created in Supabase:', result)

      // Recovery registered - no alert needed
      
      setRecoveryDialogOpen(false)
      setRecoveryRecord(null)
      setRecoveryDate("")
      
      console.log('=== RECOVERY PROCESS COMPLETED ===')
    } catch (error) {
      console.error("❌ Error marking as recovered:", error)
      console.error("❌ Error details:", JSON.stringify(error, null, 2))
      alert("Fout bij het registreren van herstel: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Statistieken
  const activeSick = activeSickLeaves.length
  const waitingForCertificate = activeSickLeaves.filter((r: any) => r.status === "wacht-op-briefje").length

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <div>
            <h1 className="text-2xl font-bold">Ziekte Overzicht</h1>
            <p className="text-sm text-gray-600">Actieve ziekmeldingen en ziekte management</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/ziekte/nieuw" className="bg-green-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-green-700 shadow flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Nieuwe ziekmelding
          </Link>
          <Link href="/ziekte-history" className="bg-blue-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-blue-700 shadow flex items-center gap-2">
            📊 Terug Te Staan
          </Link>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Actief ziek</p>
                <p className="text-2xl font-bold text-red-600">{activeSick}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Geen geldig briefje</p>
                <p className="text-2xl font-bold text-orange-600">{waitingForCertificate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop weergave */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sickLeaveRecords.map((record: any) => {
                const certificateStatus = getCertificateStatus(record)
                return (
              <Card key={record.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                            {record.crewMember.first_name[0]}{record.crewMember.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link href={`/bemanning/${record.crewMember.id}`} className="font-medium text-gray-900 hover:text-blue-700">
                          {record.crewMember.first_name} {record.crewMember.last_name}
                        </Link>
                        <span className="text-lg">{getNationalityFlag(record.crewMember.nationality)}</span>
                        </div>
                        <p className="text-sm text-gray-500">{record.crewMember.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(record)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ziekte details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Start datum:</span>
                      <div className="flex items-center space-x-1 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{format(new Date(record.start_date), "dd-MM-yyyy")}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Dagen ziek:</span>
                      <p className="font-medium mt-1">{record.daysCount} dagen</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Salaris:</span>
                      <div className="flex items-center space-x-1 mt-1">
                        <Euro className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{record.salary_percentage || 100}%</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Betaald door:</span>
                      <p className="font-medium mt-1">{record.paid_by || "Bamalite S.A."}</p>
                    </div>
                  </div>

                  {/* Ziektebriefje status */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Ziektebriefje:</span>
                    </div>
                      <Badge className={certificateStatus.color}>
                        {certificateStatus.text}
                      </Badge>
                  </div>

                  {/* Schip info */}
                  {record.ship && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Ship className="w-4 h-4" />
                      <span>{record.ship.name}</span>
                    </div>
                  )}

                  {/* Notities */}
                  {record.notes && (
                    <div className="pt-3 border-t">
                      <span className="text-gray-500 text-sm">Notities:</span>
                      <p className="text-sm text-gray-700 mt-1 italic">{record.notes}</p>
                    </div>
                      )}
                </CardContent>
              </Card>
                )
              })}
        </div>
      </div>

      {/* Mobiele weergave */}
      <div className="block md:hidden space-y-4">
        {sickLeaveRecords.map((record: any) => {
          const certificateStatus = getCertificateStatus(record)
          return (
            <Card key={record.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                      {record.crewMember.first_name[0]}{record.crewMember.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/bemanning/${record.crewMember.id}`} className="font-medium text-sm hover:text-blue-700">
                      {record.crewMember.first_name} {record.crewMember.last_name}
                        </Link>
                        <span className="text-lg">{getNationalityFlag(record.crewMember.nationality)}</span>
                      </div>
                      <p className="text-xs text-gray-500">{record.crewMember.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getStatusColor(record.status)} text-xs`}>
                      {getStatusText(record.status)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(record)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Ziekte details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Start datum:</span>
                    <p className="font-medium mt-1">{format(new Date(record.start_date), "dd-MM-yyyy")}</p>
              </div>
                <div>
                    <span className="text-gray-500">Dagen ziek:</span>
                    <p className="font-medium mt-1">{record.daysCount} dagen</p>
                </div>
                <div>
                    <span className="text-gray-500">Salaris:</span>
                    <p className="font-medium mt-1">{record.salary_percentage || 100}%</p>
                </div>

                <div>
                    <span className="text-gray-500">Betaald door:</span>
                    <p className="font-medium mt-1">{record.paid_by || "Bamalite S.A."}</p>
                  </div>
                </div>

                {/* Ziektebriefje status */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">Ziektebriefje:</span>
              </div>
                  <Badge className={`${certificateStatus.color} text-xs`}>
                  {certificateStatus.text}
                </Badge>
              </div>

                {/* Schip info */}
                {record.ship && (
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <Ship className="w-3 h-3" />
                    <span>{record.ship.name}</span>
                </div>
              )}

                {/* Notities */}
                {record.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-500 text-xs">Notities:</span>
                    <p className="text-xs text-gray-700 mt-1 italic">{record.notes}</p>
            </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {sickLeaveRecords.length === 0 && (
        <div className="text-center py-8">
          <UserX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Geen ziekmeldingen gevonden</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ziekmelding bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hasCertificate">Ziektebriefje aangeleverd</Label>
              <Select 
                value={editForm.hasCertificate ? "ja" : "nee"} 
                onValueChange={(value) => setEditForm({...editForm, hasCertificate: value === "ja"})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer optie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">Ja</SelectItem>
                  <SelectItem value="nee">Nee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.hasCertificate && (
              <div className="space-y-2">
                <Label htmlFor="certificateValidUntil">Geldig tot</Label>
                <Input
                  type="date"
                  value={editForm.certificateValidUntil}
                  onChange={(e) => setEditForm({...editForm, certificateValidUntil: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="salaryPercentage">Salaris percentage</Label>
              <Select 
                value={editForm.salaryPercentage} 
                onValueChange={(value) => setEditForm({...editForm, salaryPercentage: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer percentage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100% (aan boord)</SelectItem>
                  <SelectItem value="80">80% (thuis)</SelectItem>
                  <SelectItem value="0">0% (onbetaald)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidBy">Betaald door</Label>
              <Select 
                value={editForm.paidBy} 
                onValueChange={(value) => setEditForm({...editForm, paidBy: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer betaler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bamalite S.A.">Bamalite S.A.</SelectItem>
                  <SelectItem value="Alcina S.A.">Alcina S.A.</SelectItem>
                  <SelectItem value="Brugo Shipping SARL">Brugo Shipping SARL</SelectItem>
                  <SelectItem value="Develshipping S.A.">Develshipping S.A.</SelectItem>
                  <SelectItem value="Europe Shipping AG">Europe Shipping AG</SelectItem>
                  <SelectItem value="CNS">CNS</SelectItem>
                  <SelectItem value="CCCS">CCCS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="Optionele notities..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave}>
                Opslaan
              </Button>
            </div>

            {/* Beter melden knop */}
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                    <Heart className="w-4 h-4 mr-2" />
                    Beter melden
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Beter melden</AlertDialogTitle>
                    <AlertDialogDescription>
                      Weet je zeker dat je {editingRecord?.crewMember?.first_name} {editingRecord?.crewMember?.last_name} beter wilt melden? 
                      Deze persoon wordt dan verplaatst naar de "nog in te delen" lijst met 7 verschuldigde dagen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleMarkAsRecovered(editingRecord)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Ja, beter melden
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recovery Dialog */}
      <Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Beter melden - Terugkeer datum</DialogTitle>
            <DialogDescription>
              Wanneer gaat {recoveryRecord?.crewMember?.first_name} {recoveryRecord?.crewMember?.last_name} weer aan boord? 
              Vanaf deze datum start het regime weer automatisch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recoveryDate">Datum terugkeer aan boord *</Label>
              <Input
                type="date"
                value={recoveryDate}
                onChange={(e) => setRecoveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> De persoon blijft "thuis" tot de gekozen datum. 
                Vanaf die datum wordt de status automatisch "aan-boord" en start het regime weer.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setRecoveryDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleRecoveryConfirm} disabled={!recoveryDate}>
                Beter melden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
