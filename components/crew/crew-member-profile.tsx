"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { User, Phone, Mail, Calendar, MapPin, GraduationCap, Cigarette, AlertCircle, Edit, Save, X, Trash2, Ship, Clock, ArrowRight, ArrowLeft } from "lucide-react"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const POSITION_OPTIONS = [
  "Kapitein",
  "2e kapitein",
  "Stuurman",
  "Lichtmatroos",
  "Matroos",
  "Deksman",
  "Aflosser"
]

const NATIONALITY_OPTIONS = [
  { value: "NL", label: "🇳🇱 Nederlands" },
  { value: "CZ", label: "🇨🇿 Tsjechisch" },
  { value: "SLK", label: "🇸🇰 Slowaaks" },
  { value: "EG", label: "🇪🇬 Egyptisch" },
  { value: "PO", label: "🇵🇱 Pools" },
  { value: "SERV", label: "🇷🇸 Servisch" },
  { value: "HUN", label: "🇭🇺 Hongaars" },
  { value: "BE", label: "🇧🇪 Belgisch" },
  { value: "FR", label: "🇫🇷 Frans" },
  { value: "DE", label: "🇩🇪 Duits" },
  { value: "LUX", label: "🇱🇺 Luxemburgs" },
  { value: "RO", label: "🇷🇴 Roemeens" }
]

const REGIME_OPTIONS = ["1/1", "2/2", "3/3"]

const STATUS_OPTIONS = [
  { value: "aan-boord", label: "Aan boord" },
  { value: "thuis", label: "Thuis" },
  { value: "ziek", label: "Ziek" },
  { value: "nog-in-te-delen", label: "Nog in te delen" },
]

const DIPLOMA_OPTIONS = [
  "Vaarbewijs",
  "Rijnpatent tot Wesel",
  "Rijnpatent tot Koblenz",
  "Rijnpatent tot Mannheim",
  "Rijnpatent tot Iffezheim",
  "Elbepatent",
  "Donaupatent",
  "ADN",
  "ADN C",
  "Radar",
  "Marifoon"
]

interface Props {
  crewMemberId: string
  onProfileUpdate?: () => void
  autoEdit?: boolean
}

export function CrewMemberProfile({ crewMemberId, onProfileUpdate, autoEdit = false }: Props) {
  const { crew, ships, loading, error, updateCrew } = useSupabaseData()
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const [showOutDialog, setShowOutDialog] = useState(false)
  const [outDate, setOutDate] = useState("")
  const [outReason, setOutReason] = useState("")
  const [resetRotation, setResetRotation] = useState(false)
  const [newRotationDate, setNewRotationDate] = useState("")

  const handleMarkOutOfService = async () => {
    if (!outDate || !outReason) {
      alert(t('fillDateAndReason'))
      return
    }
    try {
      // Update crew member in Supabase met status, datum en reden
      await updateCrew(crewMemberId, {
        status: 'uit-dienst',
        ship_id: null,
        out_of_service_date: outDate,
        out_of_service_reason: outReason
      } as any)

      // Sluit dialoog en reset velden
      setShowOutDialog(false)
      setOutDate("")
      setOutReason("")
      if (onProfileUpdate) onProfileUpdate()
    } catch (e) {
      console.error(e)
    }
  }

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-open edit mode if autoEdit is true
  useEffect(() => {
    if (autoEdit && mounted && !isEditing) {
      setIsEditing(true)
    }
  }, [autoEdit, mounted, isEditing])

  // Find the crew member
  const crewMember = crew.find((member: any) => member.id === crewMemberId)
  
  // Bereken status één keer en hergebruik (om inconsistenties te voorkomen)
  const calculatedStatus = useMemo(() => {
    if (!crewMember || !crewMember.regime || crewMember.regime === "Altijd") return null
    if (crewMember.status === "ziek" || crewMember.status === "nog-in-te-delen") return null
    
    return calculateCurrentStatus(
      crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd", 
      crewMember.thuis_sinds || null, 
      crewMember.on_board_since || null, 
      crewMember.status === "ziek", 
      (crewMember as any).expected_start_date || null
    )
  }, [crewMember])

  // Initialize edit data when crew member is found
  useEffect(() => {
    if (crewMember) {
      setEditData({
        first_name: crewMember.first_name || "",
        last_name: crewMember.last_name || "",
        nationality: crewMember.nationality || "NL",
        position: crewMember.position || "Kapitein",
        ship_id: crewMember.ship_id || "none",
        regime: crewMember.regime || "2/2",
        status: crewMember.status || "nog-in-te-delen",
        phone: crewMember.phone || "",
        email: crewMember.email || "",
        birth_date: crewMember.birth_date || "",
        expected_start_date: (crewMember as any).expected_start_date || "",
        in_dienst_vanaf: (crewMember as any).in_dienst_vanaf || "",
        arbeidsovereenkomst: (crewMember as any).arbeidsovereenkomst || false,
        ingeschreven_luxembourg: (crewMember as any).ingeschreven_luxembourg || false,
        verzekerd: (crewMember as any).verzekerd || false,
        address: crewMember.address || {
          street: "",
          city: "",
          postalCode: "",
          country: ""
        },
        diplomas: crewMember.diplomas || [],
        notes: crewMember.notes || []
      })
    }
  }, [crewMember])

  // Don't render until mounted
  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">Laden...</div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">Data laden...</div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">Fout: {error}</div>
        </CardContent>
      </Card>
    )
  }

  // Not found
  if (!crewMember) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">Bemanningslid niet gevonden</div>
        </CardContent>
      </Card>
    )
  }

  const getShipName = (shipId: string) => {
    if (!shipId || shipId === "none") return "Geen schip"
    const ship = ships.find(s => s.id === shipId)
    return ship ? ship.name : "Geen schip"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "bg-green-100 text-green-800"
      case "thuis":
        return "bg-blue-100 text-blue-800"
      case "ziek":
        return "bg-red-100 text-red-800"
      case "nog-in-te-delen":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

    const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate required fields
      const errors = []
      if (!editData.first_name?.trim()) errors.push(t('firstNameRequired'))
      if (!editData.last_name?.trim()) errors.push(t('lastNameRequired'))
      if (!editData.nationality) errors.push(t('nationalityRequired'))
      if (!editData.position) errors.push(t('positionRequired'))
      if (!editData.regime) errors.push(t('regimeRequired'))
      if (!editData.status) errors.push(t('statusRequired'))
      if (!editData.phone?.trim()) errors.push(t('phoneRequired'))
      if (!editData.birth_date) errors.push(t('birthDateRequired'))
      
      // In dienst vanaf is alleen verplicht als er nog geen datum is ingevuld
      const hasExistingDate = (crewMember as any).in_dienst_vanaf
      if (!editData.in_dienst_vanaf && !hasExistingDate) {
        errors.push(t('startDateRequired'))
      }
      
      if (errors.length > 0) {
        alert(t('fillRequiredFields') + ":\n" + errors.join("\n"))
        setIsSaving(false)
        return
      }
      
      console.log('Updating crew member with data:', editData)
      
      // Prepare data for Supabase (only include fields that exist in the database)
      const supabaseData: any = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        nationality: editData.nationality,
        position: editData.position,
        ship_id: editData.ship_id === "none" ? "" : editData.ship_id,
        regime: editData.regime,
        status: editData.status,
        phone: editData.phone,
        email: editData.email,
        arbeidsovereenkomst: editData.arbeidsovereenkomst,
        ingeschreven_luxembourg: editData.ingeschreven_luxembourg,
        verzekerd: editData.verzekerd,
        notes: editData.notes,
        address: editData.address,
        diplomas: editData.diplomas
      };

      // Update on_board_since and thuis_sinds based on status change
      const currentStatus = (crewMember as any).status;
      const newStatus = editData.status;
      const today = new Date().toISOString().split('T')[0];

      if (currentStatus !== newStatus) {
        if (newStatus === "aan-boord") {
          // Going on board: set on_board_since to today, clear thuis_sinds
          supabaseData.on_board_since = today;
          supabaseData.thuis_sinds = null;
          supabaseData.expected_start_date = null;
        } else if (newStatus === "thuis") {
          // Going home: set thuis_sinds to today, clear on_board_since
          supabaseData.thuis_sinds = today;
          supabaseData.on_board_since = null;
        } else if (newStatus === "ziek") {
          // Going sick: keep current on_board_since or thuis_sinds, don't change dates
          // Don't modify on_board_since or thuis_sinds for sick status
        }
      }

      // Only include date fields if they have values
      if (editData.birth_date && editData.birth_date.trim() !== "") {
        supabaseData.birth_date = editData.birth_date;
      }
      if (editData.expected_start_date && editData.expected_start_date.trim() !== "") {
        supabaseData.expected_start_date = editData.expected_start_date;
      }
      if (editData.in_dienst_vanaf && editData.in_dienst_vanaf.trim() !== "") {
        supabaseData.in_dienst_vanaf = editData.in_dienst_vanaf;
      } else if ((crewMember as any).in_dienst_vanaf) {
        supabaseData.in_dienst_vanaf = (crewMember as any).in_dienst_vanaf;
      }
      
      // Reset rotatie als gevraagd
      if (resetRotation) {
        const rotationDate = newRotationDate || new Date().toISOString().split('T')[0]
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDate = new Date(rotationDate)
        startDate.setHours(0, 0, 0, 0)
        
        if (startDate > today) {
          // Toekomstige start: gebruik expected_start_date
          supabaseData.expected_start_date = rotationDate
          supabaseData.on_board_since = null
          supabaseData.thuis_sinds = today.toISOString().split('T')[0]
          supabaseData.status = "thuis"
          console.log('Resetting rotation to future date (expected_start_date):', rotationDate)
        } else {
          // Start vandaag of in verleden: begin rotatie direct
          supabaseData.on_board_since = rotationDate
          supabaseData.thuis_sinds = null
          supabaseData.expected_start_date = null
          supabaseData.status = "thuis"
          console.log('Resetting rotation to current/past date (on_board_since):', rotationDate)
        }
      }
      
      // Als dit een aangenomen kandidaat is, update de sub_status
      if (autoEdit && crewMember.status === "nog-in-te-delen") {
        supabaseData.sub_status = "wacht-op-startdatum"
      }
      
      console.log('Sending to Supabase:', supabaseData)
      
      const result = await updateCrew(crewMemberId, supabaseData)
      console.log('Update result:', result)
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        const currentCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
        if (currentCrew[crewMemberId]) {
          currentCrew[crewMemberId] = {
            ...currentCrew[crewMemberId],
            firstName: editData.first_name,
            lastName: editData.last_name,
            nationality: editData.nationality,
            position: editData.position,
            shipId: editData.ship_id === "none" ? "" : editData.ship_id,
            regime: editData.regime,
            status: editData.status,
            phone: editData.phone,
            email: editData.email,
            birthDate: editData.birth_date,
            expectedStartDate: editData.expected_start_date,
            address: editData.address,
            diplomas: editData.diplomas,
            notes: editData.notes
          }
          localStorage.setItem('crewDatabase', JSON.stringify(currentCrew))
          window.dispatchEvent(new Event('localStorageUpdate'))
          window.dispatchEvent(new Event('forceRefresh'))
        }
      }
      
      setIsEditing(false)
      setResetRotation(false)
      setNewRotationDate("")
      if (onProfileUpdate) {
        onProfileUpdate()
      }
    } catch (error) {
      console.error('Error updating crew member:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert(t('errorUpdatingProfile') + " " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setResetRotation(false)
    setNewRotationDate("")
    // Reset edit data to original values
    if (crewMember) {
      setEditData({
        first_name: crewMember.first_name || "",
        last_name: crewMember.last_name || "",
        nationality: crewMember.nationality || "NL",
        position: crewMember.position || "Kapitein",
        ship_id: crewMember.ship_id || "none",
        regime: crewMember.regime || "2/2",
        status: crewMember.status || "nog-in-te-delen",
        phone: crewMember.phone || "",
        email: crewMember.email || "",
        birth_date: crewMember.birth_date || "",
        birth_place: (crewMember as any).birth_place || "",
        matricule: (crewMember as any).matricule || "",
        address: crewMember.address || {
          street: "",
          city: "",
          postalCode: "",
          country: ""
        },
        diplomas: crewMember.diplomas || [],
        notes: crewMember.notes || []
      })
    }
  }

  // Genereer scheepshistorie op basis van assignment_history
  const shipHistory = crewMember.assignment_history || []
  
  // Genereer status wijzigingen (historisch + toekomstig)
  const statusChanges: Array<{date: string, action: string, ship: string, type: string, isFuture?: boolean}> = []
  
  if (crewMember.on_board_since) {
    statusChanges.push({
      date: crewMember.on_board_since,
      action: "Aan boord gegaan",
      ship: getShipName(crewMember.ship_id),
      type: "aan-boord",
      isFuture: false
    })
  }
  
  if (crewMember.thuis_sinds) {
    statusChanges.push({
      date: crewMember.thuis_sinds,
      action: "Naar huis gegaan",
      ship: getShipName(crewMember.ship_id),
      type: "thuis",
      isFuture: false
    })
  }

  // Voeg toekomstige automatisch berekende wijzigingen toe (gebruik calculatedStatus uit useMemo)
  if (calculatedStatus && calculatedStatus.nextRotationDate) {
    const rotationAction = calculatedStatus.currentStatus === "aan-boord" ? "Naar huis" : "Aan boord"
    statusChanges.push({
      date: calculatedStatus.nextRotationDate,
      action: rotationAction,
      ship: getShipName(crewMember.ship_id),
      type: calculatedStatus.currentStatus === "aan-boord" ? "thuis" : "aan-boord",
      isFuture: true
    })
  }

  // Sorteer op datum (oudste eerst, toekomstige aan het einde)
  statusChanges.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateA - dateB // Oudste eerst
  })

  // Check if checklist is complete
  const isChecklistComplete = () => {
    return editData.arbeidsovereenkomst && 
           editData.ingeschreven_luxembourg && 
           editData.verzekerd;
  }

  const renderField = (label: string, value: any, field: string, type: string = "text") => {
    const currentValue = editData[field] || "";
    
    if (isEditing) {
      switch (type) {
        case "select":
          return (
            <Select 
              value={currentValue} 
              onValueChange={(value) => setEditData((prev: Record<string, any>) => ({ ...prev, [field]: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Selecteer ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field === "nationality" && NATIONALITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {field === "position" && POSITION_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
                {field === "regime" && REGIME_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
                {field === "status" && STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
                {field === "ship_id" && (
                  <>
                    <SelectItem value="none">Geen schip</SelectItem>
                    {ships.map((ship) => (
                      <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          )
        case "textarea":
          return (
            <Textarea
              value={currentValue}
              onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, [field]: e.target.value }))}
              placeholder={`Voer ${label.toLowerCase()} in`}
            />
          )
        default:
          return (
            <Input
              type={type}
              value={currentValue}
              onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, [field]: e.target.value }))}
              placeholder={`Voer ${label.toLowerCase()} in`}
            />
          )
      }
    } else {
      // Format dates for display
      if (type === "date" && value) {
        try {
          const formattedDate = format(new Date(value), 'dd-MM-yyyy');
          return <p className="mt-1">{formattedDate}</p>
        } catch {
          return <p className="mt-1">{value}</p>
        }
      }
      return <p className="mt-1">{value || "Niet ingevuld"}</p>
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner voor nieuwe aangenomen kandidaat */}
      {autoEdit && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Kandidaat Aangenomen - Vul het profiel compleet in</h3>
              <p className="text-sm text-green-800 mt-1">
                <strong>✓ Bestaande gegevens zijn al ingevuld!</strong> Vul alleen de ontbrekende verplichte velden (*) in:
              </p>
              <ul className="text-sm text-green-800 mt-2 ml-4 list-disc space-y-1">
                <li><strong className="text-red-700">Verwachte Startdatum</strong> - CRUCIAAL voor het automatische rotatie systeem!</li>
                <li><strong>Regime</strong> - Kies het werkschema (1/1, 2/2, of 3/3)</li>
                <li><strong>Geboortedatum</strong> - Verplicht voor administratie</li>
                <li><strong>Adres</strong> - Volledig adres invullen</li>
                <li><strong>Diploma's</strong> - Selecteer alle relevante diploma's</li>
                <li><strong>Schip</strong> - Wijs een schip toe als deze al bekend is</li>
              </ul>
              <p className="text-sm text-green-800 mt-2 font-medium">
                💡 <strong>Tip:</strong> Bestaande gegevens zijn al ingevuld - je hoeft alleen de ontbrekende velden aan te vullen!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hoofdprofiel */}
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-3">
            <User className="w-5 h-5" />
            <span>{t('profile')}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('edit')}</span>
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? t('save') + "..." : t('save')}</span>
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>{t('cancel')}</span>
                  </Button>
                </div>
              )}
              <Badge className={(() => {
                // Ziek en nog-in-te-delen: gebruik database status
                if (crewMember.status === "ziek") return "bg-red-100 text-red-800"
                if (crewMember.status === "nog-in-te-delen") return "bg-gray-100 text-gray-800"
                
                // Als er geen regime is: gebruik database status
                if (!crewMember.regime) return getStatusColor(crewMember.status)
                
                // Voor alle anderen: gebruik BEREKENDE status (uit useMemo)
                if (!calculatedStatus) return getStatusColor(crewMember.status)
                return calculatedStatus.currentStatus === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
              })()}>
                {(() => {
                  // Ziek en nog-in-te-delen: gebruik database status
                  if (crewMember.status === "ziek") return "Ziek"
                  if (crewMember.status === "nog-in-te-delen") return "Nog in te delen"
                  
                  // Als er geen regime is: gebruik database status
                  if (!crewMember.regime) return crewMember.status === "aan-boord" ? "Aan boord" : "Thuis"
                  
                  // Voor alle anderen: gebruik BEREKENDE status (uit useMemo)
                  if (!calculatedStatus) return crewMember.status === "aan-boord" ? "Aan boord" : "Thuis"
                  return calculatedStatus.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
                })()}
            </Badge>
              {(crewMember as any).is_student && (
              <Badge variant="outline" className="text-purple-600">
                Student
              </Badge>
            )}
              {(crewMember as any).is_aflosser && (
              <Badge variant="outline" className="text-orange-600">
                Aflosser
              </Badge>
              )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Uit dienst knop */}
        <div className="flex justify-end">
          <Button variant="destructive" onClick={() => setShowOutDialog(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Bemanningslid uit dienst
          </Button>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
                <label className="text-sm font-medium text-gray-700">{t('firstName')} *</label>
                {renderField(t('firstName'), crewMember.first_name, "first_name")}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">{t('lastName')} *</label>
                {renderField(t('lastName'), crewMember.last_name, "last_name")}
                </div>

              <div>
                <label className="text-sm font-medium text-gray-700">{t('nationality')} *</label>
                {renderField(t('nationality'), crewMember.nationality, "nationality", "select")}
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">{t('position')} *</label>
                {renderField(t('position'), crewMember.position, "position", "select")}
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">{t('regime')} *</label>
                {renderField(t('regime'), crewMember.regime, "regime", "select")}
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">{t('status')} *</label>
                {isEditing ? (
                  renderField(t('status'), crewMember.status, "status", "select")
                ) : (
                  <p className="mt-1">
                    {(() => {
                      // Ziek en nog-in-te-delen: gebruik database status
                      if (crewMember.status === "ziek") return "Ziek"
                      if (crewMember.status === "nog-in-te-delen") return "Nog in te delen"
                      
                      // Als er geen regime is: gebruik database status
                      if (!crewMember.regime) return crewMember.status === "aan-boord" ? "Aan boord" : "Thuis"
                      
                      // Voor alle anderen: gebruik BEREKENDE status (uit useMemo)
                      if (!calculatedStatus) return crewMember.status === "aan-boord" ? "Aan boord" : "Thuis"
                      return calculatedStatus.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
                    })()}
                  </p>
                )}
                {crewMember.regime && crewMember.regime !== "Altijd" && (
                  <div className="mt-1 text-xs text-gray-500">
                    {(() => {
                      // Als status "nog-in-te-delen" en er is een verwachte startdatum
                      if (crewMember.status === "nog-in-te-delen" && (crewMember as any).expected_start_date) {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const startDate = new Date((crewMember as any).expected_start_date)
                        startDate.setHours(0, 0, 0, 0)
                        const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        
                        if (daysUntilStart < 0) {
                          return `⚠️ Startdatum ${Math.abs(daysUntilStart)} dag${Math.abs(daysUntilStart) !== 1 ? 'en' : ''} geleden!`
                        } else if (daysUntilStart === 0) {
                          return `🚀 Start vandaag!`
                        } else if (daysUntilStart === 1) {
                          return `🚀 Start morgen!`
                        } else {
                          return `Start over ${daysUntilStart} dagen`
                        }
                      }
                      
                      // Anders normale rotatie berekening (gebruik calculatedStatus uit useMemo)
                      if (!calculatedStatus || !calculatedStatus.nextRotationDate) {
                        return `Geen rotatie informatie`
                      }
                      const rotationDate = format(new Date(calculatedStatus.nextRotationDate), 'dd-MM-yyyy')
                      const rotationText = calculatedStatus.currentStatus === "aan-boord" ? "Naar huis op" : "Aan boord op"
                      return `${rotationText}: ${rotationDate} (${calculatedStatus.daysUntilRotation} ${calculatedStatus.daysUntilRotation === 1 ? 'dag' : 'dagen'})`
                    })()}
                  </div>
                )}
              </div>
          </div>

          <div className="space-y-4">
            <div>
                <label className="text-sm font-medium text-gray-700">Huidig Schip</label>
                {renderField("Schip", crewMember.ship_id, "ship_id", "select")}
              </div>

              {/* Reset Rotatie Optie */}
              {isEditing && (
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="resetRotation"
                      checked={resetRotation}
                      onChange={(e) => setResetRotation(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="resetRotation" className="text-sm font-medium text-gray-900 cursor-pointer">
                      🔄 Start nieuwe rotatie (bij schip/regime wijziging)
                    </label>
                  </div>
                  {resetRotation && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Startdatum nieuwe rotatie</label>
                      <Input
                        type="date"
                        value={newRotationDate}
                        onChange={(e) => setNewRotationDate(e.target.value)}
                        placeholder={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Laat leeg voor vandaag. Persoon start "thuis" en rotatie begint vanaf deze datum.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Matricule Nummer</label>
                                 {renderField("Matricule", (crewMember as any).matricule, "matricule")}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">{t('phoneNumber')} *</label>
                {renderField(t('phoneNumber'), crewMember.phone, "phone")}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">{t('email')}</label>
                {renderField(t('email'), crewMember.email, "email", "email")}
            </div>

              <div>
                <label className="text-sm font-medium text-gray-700">{t('dateOfBirth')} *</label>
                {renderField(t('dateOfBirth'), crewMember.birth_date, "birth_date", "date")}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">{t('placeOfBirth')}</label>
                {renderField(t('placeOfBirth'), (crewMember as any).birth_place, "birth_place")}
              </div>
              </div>
                  </div>

        {/* Address */}
                    <div>
            <label className="text-sm font-medium text-gray-700">Adres</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs text-gray-500">Straat</label>
                {isEditing ? (
                  <Input
                    value={editData.address?.street || ""}
                                         onChange={(e) => setEditData((prev: Record<string, any>) => ({ 
                       ...prev, 
                       address: { ...prev.address, street: e.target.value }
                     }))}
                    placeholder="Straatnaam"
                  />
                ) : (
                  <p className="mt-1">{crewMember.address?.street || "Niet ingevuld"}</p>
                )}
          </div>
              <div>
                <label className="text-xs text-gray-500">Plaats</label>
                {isEditing ? (
                  <Input
                    value={editData.address?.city || ""}
                                         onChange={(e) => setEditData((prev: Record<string, any>) => ({ 
                       ...prev, 
                       address: { ...prev.address, city: e.target.value }
                     }))}
                    placeholder="Plaats"
                  />
                ) : (
                  <p className="mt-1">{crewMember.address?.city || "Niet ingevuld"}</p>
                )}
              </div>
                <div>
                <label className="text-xs text-gray-500">Postcode</label>
                {isEditing ? (
                  <Input
                    value={editData.address?.postalCode || ""}
                                         onChange={(e) => setEditData((prev: Record<string, any>) => ({ 
                       ...prev, 
                       address: { ...prev.address, postalCode: e.target.value }
                     }))}
                    placeholder="Postcode"
                  />
                ) : (
                  <p className="mt-1">{crewMember.address?.postalCode || "Niet ingevuld"}</p>
              )}
            </div>
              <div>
                <label className="text-xs text-gray-500">Land</label>
                {isEditing ? (
                  <Input
                    value={editData.address?.country || ""}
                                         onChange={(e) => setEditData((prev: Record<string, any>) => ({ 
                       ...prev, 
                       address: { ...prev.address, country: e.target.value }
                     }))}
                    placeholder="Land"
                  />
                ) : (
                  <p className="mt-1">{crewMember.address?.country || "Niet ingevuld"}</p>
                )}
              </div>
            </div>
          </div>

        {/* Diplomas */}
          <div>
            <label className="text-sm font-medium text-gray-700">Diploma's</label>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {DIPLOMA_OPTIONS.map((diploma) => (
                    <Button
                      key={diploma}
                      variant={editData.diplomas?.includes(diploma) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentDiplomas = editData.diplomas || []
                        const newDiplomas = currentDiplomas.includes(diploma)
                          ? currentDiplomas.filter((d: string) => d !== diploma)
                          : [...currentDiplomas, diploma]
                                                 setEditData((prev: Record<string, any>) => ({ ...prev, diplomas: newDiplomas }))
                      }}
                    >
                      {diploma}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
            <div className="flex flex-wrap gap-2 mt-2">
                {crewMember.diplomas && crewMember.diplomas.length > 0 ? (
                  crewMember.diplomas.map((diploma: string, index: number) => (
                <Badge key={index} variant="outline">
                  {diploma}
                </Badge>
                  ))
                ) : (
                  <p className="text-gray-500">Geen diploma's toegevoegd</p>
                )}
            </div>
        )}
          </div>

        {/* Verwachte Startdatum - BELANGRIJK voor rotatie systeem */}
        {crewMember.status === "nog-in-te-delen" && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-semibold text-blue-900">{t('expectedStartDate')} *</label>
                <p className="text-xs text-blue-700 mb-2">
                  Deze datum wordt gebruikt om het automatische rotatie systeem te starten
                </p>
                {renderField(t('expectedStartDate'), (crewMember as any).expected_start_date, "expected_start_date", "date")}
              </div>
            </div>
          </div>
        )}

        {/* In dienst per datum - altijd tonen */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <label className="text-sm font-semibold text-blue-900">{t('inServiceFrom')}</label>
              <p className="text-xs text-blue-700 mb-2">
                Officiële startdatum van deze bemanningslid
              </p>
              {isEditing ? (
                renderField(t('inServiceFrom'), (crewMember as any).in_dienst_vanaf ? format(new Date((crewMember as any).in_dienst_vanaf), 'dd-MM-yyyy') : "", "in_dienst_vanaf", "date")
              ) : (
                <p className="mt-1 text-blue-900 font-medium">
                  {(crewMember as any).in_dienst_vanaf ? format(new Date((crewMember as any).in_dienst_vanaf), 'dd-MM-yyyy') : "Nog niet ingevuld"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Checklist sectie - alleen tonen als niet volledig ingevuld */}
        {isEditing && !isChecklistComplete() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">📋 {t('checklist')} {t('newPersonnel')}</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-yellow-900">{t('checklist')}</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="arbeidsovereenkomst"
                      checked={editData.arbeidsovereenkomst || false}
                      onChange={(e) => setEditData({...editData, arbeidsovereenkomst: e.target.checked})}
                      className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="arbeidsovereenkomst" className="text-sm text-yellow-800">
                      ✅ {t('contractSigned')}
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="ingeschreven_luxembourg"
                      checked={editData.ingeschreven_luxembourg || false}
                      onChange={(e) => setEditData({...editData, ingeschreven_luxembourg: e.target.checked})}
                      className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="ingeschreven_luxembourg" className="text-sm text-yellow-800">
                      ✅ {t('registeredLuxembourg')}
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="verzekerd"
                      checked={editData.verzekerd || false}
                      onChange={(e) => setEditData({...editData, verzekerd: e.target.checked})}
                      className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="verzekerd" className="text-sm text-yellow-800">
                      ✅ {t('insured')}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700">{t('notes')}</label>
            {isEditing ? (
              <Textarea
                value={editData.notes?.join('\n') || ""}
                                 onChange={(e) => setEditData((prev: Record<string, any>) => ({ 
                   ...prev, 
                   notes: e.target.value ? [e.target.value] : []
                 }))}
                placeholder="Voeg notities toe..."
                className="mt-2"
              />
            ) : (
            <div className="mt-2 space-y-2">
                {crewMember.notes && crewMember.notes.length > 0 ? (
                  crewMember.notes.map((note: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {typeof note === 'string' ? note : note?.text || 'Geen notitie'}
                  </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Geen notities</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheepshistorie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Ship className="w-5 h-5" />
            <span>Scheepshistorie</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shipHistory.length > 0 ? (
            <div className="space-y-4">
              {shipHistory.map((assignment: any, index: number) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <Ship className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{getShipName(assignment.ship_id)}</div>
                    <div className="text-sm text-gray-600">
                      {assignment.position} • {assignment.regime}
                    </div>
                    {assignment.start_date && (
                      <div className="text-xs text-gray-500">
                        {format(new Date(assignment.start_date), 'dd-MM-yyyy')}
                        {assignment.end_date && ` - ${format(new Date(assignment.end_date), 'dd-MM-yyyy')}`}
                      </div>
                    )}
                  </div>
            </div>
          ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Nog geen scheepshistorie beschikbaar
          </div>
        )}
      </CardContent>
    </Card>

    {/* Uit dienst dialog */}
    <Dialog open={showOutDialog} onOpenChange={setShowOutDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zet bemanningslid uit dienst</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Datum uit dienst</label>
            <Input type="date" value={outDate} onChange={(e) => setOutDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Reden</label>
            <Textarea value={outReason} onChange={(e) => setOutReason(e.target.value)} placeholder="Bijv. einde contract, eigen verzoek, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowOutDialog(false)}>{t('cancel')}</Button>
          <Button variant="destructive" onClick={handleMarkOutOfService}>{t('confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>


    </div>
  )
}
