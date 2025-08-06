"use client"

import { getCombinedShipDatabase } from "@/utils/ship-utils"
import { sickLeaveHistoryDatabase } from "@/data/crew-database"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserX, FileText, Calendar, AlertTriangle, CheckCircle, Euro, Ship, Phone, Edit, Heart } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { useLocalStorageData } from "@/hooks/use-localStorage-data"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function ZiektePage() {
  const { crewDatabase, sickLeaveDatabase, updateData, forceRefresh } = useLocalStorageData()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    hasCertificate: false,
    certificateValidUntil: "",
    notes: ""
  })
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false)
  const [recoveryRecord, setRecoveryRecord] = useState<any>(null)
  const [recoveryDate, setRecoveryDate] = useState("")

  // Gebruik de centrale actieve ziekmeldingen (al gefilterd)
  const sickLeaveRecords = activeSickLeaves
    .map((sick: any) => {
      const crewMember = (crewDatabase as any)[sick.crewMemberId]
      const ship = crewMember?.shipId ? getCombinedShipDatabase()[crewMember.shipId] : null

      // Bereken dagen ziek
      const startDate = new Date(sick.startDate)
      const today = new Date()
      const daysCount = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...sick,
        crewMember,
        ship,
        daysCount,
      }
    })
    .filter((record) => record.crewMember) // Filter out records zonder crew member
    .filter((record) => record.status !== "hersteld") // Filter out herstelde records

  const getStatusColor = (status: string) => {
    switch (status) {
      case "actief":
        return "bg-red-100 text-red-800"
      case "hersteld":
        return "bg-green-100 text-green-800"
      case "wacht-op-briefje":
        return "bg-orange-100 text-orange-800"
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
        return "Geen geldig briefje"
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
    if (!record.hasCertificate) {
      // Update status naar "wacht-op-briefje" als er geen briefje is
      if (record.status === "actief") {
        updateData('sickLeaveDatabase', {
          [record.id]: { ...record, status: "wacht-op-briefje" }
        })
      }
      return {
        color: "bg-red-100 text-red-800",
        text: "Geen ziektebriefje",
        icon: AlertTriangle,
      }
    }

    if (record.certificateValidUntil) {
      const validUntil = new Date(record.certificateValidUntil)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        // Update status naar "wacht-op-briefje" als briefje verlopen is
        if (record.status === "actief") {
          updateData('sickLeaveDatabase', {
            [record.id]: { ...record, status: "wacht-op-briefje" }
          })
        }
        return {
          color: "bg-red-100 text-red-800",
          text: "Briefje verlopen",
          icon: AlertTriangle,
        }
      } else if (daysUntilExpiry <= 7) {
        return {
          color: "bg-orange-100 text-orange-800",
          text: `Briefje verloopt over ${daysUntilExpiry} dagen`,
          icon: AlertTriangle,
        }
      } else {
        // Update status naar "actief" als briefje geldig is
        if (record.status === "wacht-op-briefje") {
          updateData('sickLeaveDatabase', {
            [record.id]: { ...record, status: "actief" }
          })
        }
        return {
          color: "bg-green-100 text-green-800",
          text: `Briefje geldig t/m ${format(validUntil, "dd-MM-yyyy")}`,
          icon: CheckCircle,
        }
      }
    }

    // Update status naar "actief" als briefje aanwezig is zonder vervaldatum
    if (record.status === "wacht-op-briefje") {
      updateData('sickLeaveDatabase', {
        [record.id]: { ...record, status: "actief" }
      })
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
      hasCertificate: record.hasCertificate || false,
      certificateValidUntil: record.certificateValidUntil ? format(new Date(record.certificateValidUntil), "yyyy-MM-dd") : "",
      notes: record.notes || ""
    })
    setEditDialogOpen(true)
  }

  const handleSave = () => {
    if (!editingRecord) return

    // Update de record in de database
    const updatedRecord = {
      ...editingRecord,
      hasCertificate: editForm.hasCertificate,
      certificateValidUntil: editForm.certificateValidUntil,
      notes: editForm.notes
    }

    // Update status naar "actief" als er een briefje is
    if (editForm.hasCertificate && editingRecord.status === "wacht-op-briefje") {
      updatedRecord.status = "actief"
    }

    // Update via de nieuwe hook
    updateData('sickLeaveDatabase', {
      [editingRecord.id]: updatedRecord
    })

    setEditDialogOpen(false)
    setEditingRecord(null)
    setEditForm({
      hasCertificate: false,
      certificateValidUntil: "",
      notes: ""
    })
  }

  const handleMarkAsRecovered = (record: any) => {
    if (!record) return
    
    // Open recovery dialog
    setRecoveryRecord(record)
    setRecoveryDate("")
    setRecoveryDialogOpen(true)
  }

  const handleRecoveryConfirm = () => {
    if (!recoveryRecord || !recoveryDate) {
      alert("Vul een datum in voor terugkeer aan boord")
      return
    }

    // Bereken verschuldigde dagen (altijd 7 dagen)
    const owedDays = 7

    // Update de ziekmelding status naar "hersteld" via de hook
    updateData('sickLeaveDatabase', {
      [recoveryRecord.id]: {
        ...recoveryRecord,
        status: "hersteld"
      }
    })

    // Voeg toe aan sickLeaveHistoryDatabase voor "terug te staan" dagen
    const historyRecord = {
      id: `history-${Date.now()}`,
      crewMemberId: recoveryRecord.crewMemberId,
      startDate: recoveryRecord.startDate,
      endDate: new Date().toISOString().split('T')[0],
      description: recoveryRecord.notes || "Ziekte",
      hasCertificate: recoveryRecord.hasCertificate || false,
      salaryPercentage: recoveryRecord.salaryPercentage || 100,
      sickLocation: recoveryRecord.sickLocation || "thuis",
      daysCount: recoveryRecord.daysCount || 0,
      standBackDaysRequired: owedDays, // Altijd 7 dagen
      standBackDaysCompleted: 0, // Nog geen dagen terug gestaan
      standBackDaysRemaining: owedDays, // Nog alle 7 dagen te gaan
      standBackStatus: "openstaand", // Status voor terug staan dagen
      standBackHistory: [], // Lege geschiedenis
      paidBy: recoveryRecord.paidBy || "Bamalite S.A."
    }

    // Voeg toe aan sickLeaveHistoryDatabase via de hook
    updateData('sickLeaveHistoryDatabase', {
      [historyRecord.id]: historyRecord
    })

    // Update crew member status en terugkeer datum
    const currentCrewMember = (crewDatabase as any)[recoveryRecord.crewMemberId]
    
    // Specifieke fix voor Rob van Etten - altijd op de Bellona
    let targetShipId = "ms-bellona" // Default voor Rob van Etten
    if (!(currentCrewMember.firstName === "Rob" && currentCrewMember.lastName === "van Etten")) {
      targetShipId = currentCrewMember.shipId || "ms-bellona" // Voor anderen, behoud huidige shipId
    }
    
    const updatedCrewMember = {
      ...currentCrewMember,
      status: "thuis", // Blijf thuis tot de terugkeer datum
      shipId: targetShipId,
      terugkeerDatum: recoveryDate, // Nieuwe veld voor terugkeer datum
      onBoardSince: recoveryDate // Regime start vanaf deze datum
    }
    
    // DIRECTE localStorage update zonder hooks
    try {
      const crewData = localStorage.getItem('crewDatabase')
      const crew = crewData ? JSON.parse(crewData) : {}
      crew[recoveryRecord.crewMemberId] = updatedCrewMember
      localStorage.setItem('crewDatabase', JSON.stringify(crew))
      
      // Debug info verwijderd
      
      // Force page reload om alle componenten te updaten
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
    } catch (error) {
      console.error("Error bij directe localStorage update:", error)
    }

    alert(`Herstel succesvol geregistreerd voor ${recoveryRecord.crewMember.firstName} ${recoveryRecord.crewMember.lastName}. Terugkeer aan boord: ${recoveryDate}`)
    
    setRecoveryDialogOpen(false)
    setRecoveryRecord(null)
    setRecoveryDate("")
  }

  // Gebruik centrale statistieken
  const activeSick = stats.actieveZiekmeldingen
  const waitingForCertificate = activeSickLeaves.filter((r: any) => r.status === "wacht-op-briefje").length
  


  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ziekte Overzicht</h1>
          <p className="text-sm text-gray-600">Actieve ziekmeldingen en ziekte management</p>
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
                            {record.crewMember.firstName[0]}{record.crewMember.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link href={`/bemanning/${record.crewMember.id}`} className="font-medium text-gray-900 hover:text-blue-700">
                          {record.crewMember.firstName} {record.crewMember.lastName}
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
                        <span className="font-medium">{format(new Date(record.startDate), "dd-MM-yyyy")}</span>
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
                        <span className="font-medium">{record.salaryPercentage || 100}%</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Betaald door:</span>
                      <p className="font-medium mt-1">{record.paidBy || "Bamalite S.A."}</p>
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
                      {record.crewMember.firstName[0]}{record.crewMember.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/bemanning/${record.crewMember.id}`} className="font-medium text-sm hover:text-blue-700">
                      {record.crewMember.firstName} {record.crewMember.lastName}
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
                    <p className="font-medium mt-1">{format(new Date(record.startDate), "dd-MM-yyyy")}</p>
              </div>
                <div>
                    <span className="text-gray-500">Dagen ziek:</span>
                    <p className="font-medium mt-1">{record.daysCount} dagen</p>
                </div>
                <div>
                    <span className="text-gray-500">Salaris:</span>
                    <p className="font-medium mt-1">{record.salaryPercentage || 100}%</p>
                </div>

                <div>
                    <span className="text-gray-500">Betaald door:</span>
                    <p className="font-medium mt-1">{record.paidBy || "Bamalite S.A."}</p>
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
            <DialogTitle>Ziektebriefje bewerken</DialogTitle>
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
                      Weet je zeker dat je {editingRecord?.crewMember?.firstName} {editingRecord?.crewMember?.lastName} beter wilt melden? 
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
              Wanneer gaat {recoveryRecord?.crewMember?.firstName} {recoveryRecord?.crewMember?.lastName} weer aan boord? 
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
