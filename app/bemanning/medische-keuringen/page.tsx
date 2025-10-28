"use client"

import { useState, useEffect } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { Calendar, Stethoscope, AlertTriangle, CheckCircle, Phone, MapPin } from "lucide-react"
import { format, addYears, addMonths, addDays, isAfter, isBefore, differenceInDays } from "date-fns"
import { nl } from "date-fns/locale"
import Link from "next/link"

export default function MedischeKeuringenPage() {
  const { crew, ships, loading, error, updateCrew } = useSupabaseData()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    laatste_keuring_datum: "",
    fit_verklaard: "",
    proeftijd_datum: ""
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Helper functie om einddatum te berekenen
  const calculateNextExaminationDate = (member: any): Date | null => {
    // Als er geen keuring datum is, kan je geen einddatum berekenen
    if (!member.laatste_keuring_datum) return null

    const keuringDatum = new Date(member.laatste_keuring_datum)
    
    // Als niet fit verklaard, moet over 1 jaar opnieuw gekeurd worden
    if (member.fit_verklaard === false) {
      return addYears(keuringDatum, 1)
    }
    
    // Anders: elke 3 jaar
    return addYears(keuringDatum, 3)
  }

  // Helper functie om te bepalen of iemand binnenkort gekeurd moet worden (3 maanden = 90 dagen)
  const isExaminationDueSoon = (nextDate: Date | null): boolean => {
    if (!nextDate) return false
    const daysUntil = differenceInDays(nextDate, new Date())
    return daysUntil <= 90 && daysUntil >= 0
  }

  // Helper functie om te bepalen of keuring verlopen is
  const isExaminationOverdue = (nextDate: Date | null): boolean => {
    if (!nextDate) return false
    return isBefore(nextDate, new Date())
  }

  // Helper functie voor nieuwe bemanningsleden: deadline = proeftijd + 3 maanden + 1 jaar
  const calculateNewMemberDeadline = (member: any): Date | null => {
    if (!member.proeftijd_datum) return null
    
    const proeftijdStart = new Date(member.proeftijd_datum)
    // Proeftijd 3 maanden + dan 1 jaar de tijd voor keuring
    return addYears(addMonths(proeftijdStart, 3), 1)
  }

  // Helper functie voor proeftijd einddatum: proeftijd + 3 maanden
  const calculateProeftijdEinddatum = (member: any): Date | null => {
    if (!member.proeftijd_datum) return null
    
    const proeftijdStart = new Date(member.proeftijd_datum)
    return addMonths(proeftijdStart, 3)
  }

  // Helper functie om te bepalen of iemand net in dienst is (heeft proeftijd_datum maar nog geen keuring)
  const isNewMember = (member: any): boolean => {
    return !member.laatste_keuring_datum && !!member.proeftijd_datum
  }

  // Helper functie om member card te renderen
  const renderMemberCard = (member: any, category: string) => {
    const nextExaminationDate = calculateNextExaminationDate(member)
    const newMemberDeadline = calculateNewMemberDeadline(member)
    const proeftijdEinddatum = calculateProeftijdEinddatum(member)
    const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
    const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
    const hasNoExamination = !member.laatste_keuring_datum
    const isNewMemberPastDeadline = newMemberDeadline ? isBefore(newMemberDeadline, new Date()) : false
    const memberShip = member.ship_id ? ships.find((s: any) => s.id === member.ship_id) : null

    let statusColor = "bg-gray-50 border-gray-200"
    let statusBadge = null

    if (category === "verlopen") {
      statusColor = "bg-red-50 border-red-200"
      statusBadge = <Badge className="bg-red-600 text-xs px-1.5 py-0.5">Verlopen</Badge>
    } else if (category === "binnenkort") {
      statusColor = "bg-orange-50 border-orange-200"
      statusBadge = <Badge className="bg-orange-600 text-xs px-1.5 py-0.5">Binnenkort</Badge>
    } else if (category === "net_in_dienst") {
      statusColor = "bg-yellow-50 border-yellow-200"
      statusBadge = <Badge className="bg-yellow-600 text-xs px-1.5 py-0.5">Nieuw</Badge>
    } else {
      statusColor = "bg-green-50 border-green-200"
      statusBadge = <Badge className="bg-green-600 text-xs px-1.5 py-0.5">In Orde</Badge>
    }

    return (
      <div key={member.id} className={`${statusColor} border rounded-lg p-2.5 hover:shadow-sm transition-shadow`}>
        <div className="space-y-1.5">
          {/* Header met naam en badge */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Link 
                href={`/bemanning/${member.id}`}
                className="font-medium text-gray-900 hover:text-blue-700 text-sm truncate"
              >
                {member.first_name} {member.last_name}
              </Link>
              <span className="text-sm flex-shrink-0">{getNationalityFlag(member.nationality)}</span>
            </div>
            {statusBadge}
          </div>
          
          {/* Info in compacte layout */}
          <div className="text-xs text-gray-600 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Functie:</span>
              <span>{member.position}</span>
            </div>
            {member.company && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Firma:</span>
                <span className="truncate">{member.company}</span>
              </div>
            )}
            {memberShip && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Schip:</span>
                <span className="truncate">{memberShip.name}</span>
              </div>
            )}
            
            {/* Keurings info */}
            {hasNoExamination && member.proeftijd_datum ? (
              <>
                {proeftijdEinddatum && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Proeftijd afloopt:</span>
                    <span>{format(proeftijdEinddatum, 'dd-MM-yyyy', { locale: nl })}</span>
                  </div>
                )}
                {newMemberDeadline && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Deadline:</span>
                    <span className={isNewMemberPastDeadline ? "text-red-600 font-bold" : ""}>
                      {format(newMemberDeadline, 'dd-MM-yyyy', { locale: nl })}
                    </span>
                    {isNewMemberPastDeadline && <span className="text-red-600">⚠️</span>}
                  </div>
                )}
              </>
            ) : member.laatste_keuring_datum ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Laatste keuring:</span>
                  <span>{format(new Date(member.laatste_keuring_datum), 'dd-MM-yyyy', { locale: nl })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Fit verklaard:</span>
                  <span className={member.fit_verklaard === true ? "text-green-600 font-bold" : member.fit_verklaard === false ? "text-red-600 font-bold" : "text-gray-500"}>
                    {member.fit_verklaard === true ? "Ja ✅" : member.fit_verklaard === false ? "Nee ❌" : "Onbekend"}
                  </span>
                </div>
                {nextExaminationDate && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Volgende:</span>
                    <span>{format(nextExaminationDate, 'dd-MM-yyyy', { locale: nl })}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 italic text-xs">Geen keuringsgegevens</div>
            )}
          </div>

          {/* Actie button */}
          <div className="pt-1.5 border-t border-gray-300">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(member)}
              className="h-6 text-xs w-full"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Bewerken
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleEdit = (member: any) => {
    setEditingMember(member)
    setEditForm({
      laatste_keuring_datum: member.laatste_keuring_datum ? format(new Date(member.laatste_keuring_datum), 'yyyy-MM-dd') : "",
      fit_verklaard: member.fit_verklaard === null ? "" : (member.fit_verklaard ? "true" : "false"),
      proeftijd_datum: member.proeftijd_datum ? format(new Date(member.proeftijd_datum), 'yyyy-MM-dd') : ""
    })
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingMember) return

    try {
      const updateData: any = {}
      
      if (editForm.laatste_keuring_datum) {
        updateData.laatste_keuring_datum = editForm.laatste_keuring_datum
      } else {
        updateData.laatste_keuring_datum = null
      }

      if (editForm.fit_verklaard !== "") {
        updateData.fit_verklaard = editForm.fit_verklaard === "true"
      } else {
        updateData.fit_verklaard = null
      }

      if (editForm.proeftijd_datum) {
        updateData.proeftijd_datum = editForm.proeftijd_datum
      } else {
        updateData.proeftijd_datum = null
      }

      await updateCrew(editingMember.id, updateData)
      setEditDialogOpen(false)
      setEditingMember(null)
    } catch (error) {
      console.error("Error updating medical examination:", error)
      alert("Fout bij bijwerken medische keuring")
    }
  }

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱",
      SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺", RO: "🇷🇴"
    }
    return flags[nationality] || "🌍"
  }

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">{t('loading')}...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Filter alleen actieve bemanningsleden (geen aflossers, geen uit-dienst)
  const activeCrew = crew.filter((member: any) => 
    member.status !== 'uit-dienst' && 
    !member.is_aflosser && 
    member.position !== 'Aflosser'
  )

  // Bereken statistieken
  const stats = {
    total: activeCrew.length,
    needsExamination: 0,
    dueSoon: 0,
    overdue: 0,
    newMembersNeedExamination: 0
  }

  activeCrew.forEach((member: any) => {
    const nextDate = calculateNextExaminationDate(member)
    if (!member.laatste_keuring_datum) {
      stats.needsExamination++
      // Check if new member and past deadline
      const newMemberDeadline = calculateNewMemberDeadline(member)
      if (newMemberDeadline && isBefore(newMemberDeadline, new Date())) {
        stats.newMembersNeedExamination++
      }
    } else if (nextDate) {
      if (isExaminationOverdue(nextDate)) {
        stats.overdue++
      } else if (isExaminationDueSoon(nextDate)) {
        stats.dueSoon++
      }
    }
  })

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      {/* Header */}
      <div className="mb-8">
        <BackButton href="/" />
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Medische Keuringen</h1>
        <p className="text-gray-600">Overzicht van medische keuringen voor binnenvaartpersoneel</p>
      </div>

      {/* Informatiebalkje */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Stethoscope className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Keuringsdienst</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="font-medium">Corporate Travel Clinic BV</div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Maasboulevard 148, 3011 TX Rotterdam, Nederland</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+31 10 820 1120</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Bemanningsleden</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Verlopen</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Binnenkort (30 dagen)</p>
                <p className="text-2xl font-bold text-orange-600">{stats.dueSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Nog niet gekeurd</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.needsExamination}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lijst met bemanningsleden in 4 kolommen (onder elkaar) */}
      <div className="space-y-8">
        {/* Kolom 1: Verlopen */}
        <div className="space-y-3">
          <div className="sticky top-0 bg-white z-10 pb-2 border-b-2 border-red-200">
            <h2 className="text-xl font-bold text-red-600 mb-2">Verlopen</h2>
            <Badge className="bg-red-600">{activeCrew.filter((member: any) => {
              const nextExaminationDate = calculateNextExaminationDate(member)
              const newMemberDeadline = calculateNewMemberDeadline(member)
              const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
              const isNewMemberPastDeadline = newMemberDeadline ? isBefore(newMemberDeadline, new Date()) : false
              // Verlopen: heeft verlopen keuring OF nieuwe medewerker met verlopen deadline OF geen keuringsgegevens (oude medewerker zonder keuring)
              const hasNoExaminationAndNoProeftijd = !member.laatste_keuring_datum && !member.proeftijd_datum
              return isOverdue || (isNewMember(member) && isNewMemberPastDeadline) || hasNoExaminationAndNoProeftijd
            }).length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeCrew
              .filter((member: any) => {
                const nextExaminationDate = calculateNextExaminationDate(member)
                const newMemberDeadline = calculateNewMemberDeadline(member)
                const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
                const isNewMemberPastDeadline = newMemberDeadline ? isBefore(newMemberDeadline, new Date()) : false
                // Verlopen: heeft verlopen keuring OF nieuwe medewerker met verlopen deadline OF geen keuringsgegevens (oude medewerker zonder keuring)
                const hasNoExaminationAndNoProeftijd = !member.laatste_keuring_datum && !member.proeftijd_datum
                return isOverdue || (isNewMember(member) && isNewMemberPastDeadline) || hasNoExaminationAndNoProeftijd
              })
              .map((member: any) => renderMemberCard(member, "verlopen"))}
          </div>
          
          {activeCrew.filter((member: any) => {
            const nextExaminationDate = calculateNextExaminationDate(member)
            const newMemberDeadline = calculateNewMemberDeadline(member)
            const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
            const isNewMemberPastDeadline = newMemberDeadline ? isBefore(newMemberDeadline, new Date()) : false
            const hasNoExaminationAndNoProeftijd = !member.laatste_keuring_datum && !member.proeftijd_datum
            return isOverdue || (isNewMember(member) && isNewMemberPastDeadline) || hasNoExaminationAndNoProeftijd
          }).length === 0 && (
            <div className="col-span-full text-sm text-gray-500 italic text-center py-4">Geen verlopen keuringen</div>
          )}
        </div>

        {/* Kolom 2: Binnen 3 maanden */}
        <div className="space-y-3">
          <div className="sticky top-0 bg-white z-10 pb-2 border-b-2 border-orange-200">
            <h2 className="text-xl font-bold text-orange-600 mb-2">Binnenkort (3 maanden)</h2>
            <Badge className="bg-orange-600">{activeCrew.filter((member: any) => {
              const nextExaminationDate = calculateNextExaminationDate(member)
              const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
              // Alleen tonen als niet verlopen (om duplicaten te voorkomen)
              const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
              return isDueSoon && !isOverdue
            }).length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeCrew
              .filter((member: any) => {
                const nextExaminationDate = calculateNextExaminationDate(member)
                const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
                // Alleen tonen als niet verlopen (om duplicaten te voorkomen)
                const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
                return isDueSoon && !isOverdue
              })
              .map((member: any) => renderMemberCard(member, "binnenkort"))}
          </div>
          
          {activeCrew.filter((member: any) => {
            const nextExaminationDate = calculateNextExaminationDate(member)
            const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
            const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
            return isDueSoon && !isOverdue
          }).length === 0 && (
            <div className="col-span-full text-sm text-gray-500 italic text-center py-4">Geen keuringen binnenkort</div>
          )}
        </div>

        {/* Kolom 3: Net in dienst */}
        <div className="space-y-3">
          <div className="sticky top-0 bg-white z-10 pb-2 border-b-2 border-yellow-200">
            <h2 className="text-xl font-bold text-yellow-600 mb-2">Net in dienst</h2>
            <Badge className="bg-yellow-600">{activeCrew.filter((member: any) => {
              const newMemberDeadline = calculateNewMemberDeadline(member)
              // Alleen nieuwe medewerkers met nog geldige deadline (niet verlopen)
              return isNewMember(member) && newMemberDeadline && !isBefore(newMemberDeadline, new Date())
            }).length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeCrew
              .filter((member: any) => {
                const newMemberDeadline = calculateNewMemberDeadline(member)
                // Alleen nieuwe medewerkers met nog geldige deadline (niet verlopen)
                return isNewMember(member) && newMemberDeadline && !isBefore(newMemberDeadline, new Date())
              })
              .map((member: any) => renderMemberCard(member, "net_in_dienst"))}
          </div>
          
          {activeCrew.filter((member: any) => {
            const newMemberDeadline = calculateNewMemberDeadline(member)
            return isNewMember(member) && newMemberDeadline && !isBefore(newMemberDeadline, new Date())
          }).length === 0 && (
            <div className="col-span-full text-sm text-gray-500 italic text-center py-4">Geen nieuwe medewerkers</div>
          )}
        </div>

        {/* Kolom 4: Gekeurd (in orde) */}
        <div className="space-y-3">
          <div className="sticky top-0 bg-white z-10 pb-2 border-b-2 border-green-200">
            <h2 className="text-xl font-bold text-green-600 mb-2">Gekeurd</h2>
            <Badge className="bg-green-600">{activeCrew.filter((member: any) => {
              const nextExaminationDate = calculateNextExaminationDate(member)
              const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
              const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
              // Gekeurd: heeft keuring EN niet verlopen EN niet binnenkort
              return member.laatste_keuring_datum && !isOverdue && !isDueSoon
            }).length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeCrew
              .filter((member: any) => {
                const nextExaminationDate = calculateNextExaminationDate(member)
                const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
                const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
                // Gekeurd: heeft keuring EN niet verlopen EN niet binnenkort
                return member.laatste_keuring_datum && !isOverdue && !isDueSoon
              })
              .map((member: any) => renderMemberCard(member, "gekeurd"))}
          </div>
          
          {activeCrew.filter((member: any) => {
            const nextExaminationDate = calculateNextExaminationDate(member)
            const isOverdue = nextExaminationDate ? isExaminationOverdue(nextExaminationDate) : false
            const isDueSoon = nextExaminationDate ? isExaminationDueSoon(nextExaminationDate) : false
            return member.laatste_keuring_datum && !isOverdue && !isDueSoon
          }).length === 0 && (
            <div className="col-span-full text-sm text-gray-500 italic text-center py-4">Geen gekeurde medewerkers</div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Medische Keuring Bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="laatste_keuring_datum">Laatste keuringsdatum</Label>
              <Input
                id="laatste_keuring_datum"
                type="date"
                value={editForm.laatste_keuring_datum}
                onChange={(e) => setEditForm({...editForm, laatste_keuring_datum: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fit_verklaard">Fit verklaard</Label>
              <Select 
                value={editForm.fit_verklaard || "none"} 
                onValueChange={(value) => setEditForm({...editForm, fit_verklaard: value === "none" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Niet ingevuld</SelectItem>
                  <SelectItem value="true">Ja, fit verklaard</SelectItem>
                  <SelectItem value="false">Nee, niet fit verklaard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proeftijd_datum">Proeftijd startdatum (voor nieuwe medewerkers)</Label>
              <Input
                id="proeftijd_datum"
                type="date"
                value={editForm.proeftijd_datum}
                onChange={(e) => setEditForm({...editForm, proeftijd_datum: e.target.value})}
              />
              <p className="text-xs text-gray-500">Deadline: proeftijd + 3 maanden + 1 jaar</p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave}>
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

