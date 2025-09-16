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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

const POSITION_OPTIONS = [
  "Kapitein",
  "Stuurman",
  "Machinist",
  "Matroos",
  "Aflosser",
  "Student"
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
  { value: "LUX", label: "🇱🇺 Luxemburgs" }
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
}

export function CrewMemberProfile({ crewMemberId, onProfileUpdate }: Props) {
  const { crew, ships, loading, error, updateCrew } = useSupabaseData()
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Find the crew member
  const crewMember = crew.find((member: any) => member.id === crewMemberId)

  // Initialize edit data when crew member is found
  useEffect(() => {
    if (crewMember && !isEditing) {
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
        birth_place: (crewMember as any).birth_place || "", // UI only field
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
  }, [crewMember, isEditing])

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
      if (!editData.first_name?.trim()) errors.push("Voornaam is verplicht")
      if (!editData.last_name?.trim()) errors.push("Achternaam is verplicht")
      if (!editData.nationality) errors.push("Nationaliteit is verplicht")
      if (!editData.position) errors.push("Functie is verplicht")
      if (!editData.regime) errors.push("Regime is verplicht")
      if (!editData.status) errors.push("Status is verplicht")
      if (!editData.phone?.trim()) errors.push("Telefoonnummer is verplicht")
      if (!editData.birth_date) errors.push("Geboortedatum is verplicht")
      
      if (errors.length > 0) {
        alert("Vul de volgende verplichte velden in:\n" + errors.join("\n"))
        setIsSaving(false)
        return
      }
      
      console.log('Updating crew member with data:', editData)
      
      // Prepare data for Supabase (only include fields that exist in the database)
      const supabaseData = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        nationality: editData.nationality,
        position: editData.position,
        ship_id: editData.ship_id === "none" ? "" : editData.ship_id,
        regime: editData.regime,
        status: editData.status,
        phone: editData.phone,
        email: editData.email,
        birth_date: editData.birth_date,
        address: editData.address,
        diplomas: editData.diplomas,
        notes: editData.notes
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
            birthPlace: editData.birth_place || "",
            matricule: editData.matricule,
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
      if (onProfileUpdate) {
        onProfileUpdate()
      }
      alert("Profiel succesvol bijgewerkt!")
    } catch (error) {
      console.error('Error updating crew member:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert("Fout bij het bijwerken van het profiel: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
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
  
  // Genereer status wijzigingen
  const statusChanges = []
  
  if (crewMember.on_board_since) {
    statusChanges.push({
      date: crewMember.on_board_since,
      action: "Aan boord gegaan",
      ship: getShipName(crewMember.ship_id),
      type: "aan-boord"
    })
  }
  
  if (crewMember.thuis_sinds) {
    statusChanges.push({
      date: crewMember.thuis_sinds,
      action: "Naar huis gegaan",
      ship: getShipName(crewMember.ship_id),
      type: "thuis"
    })
  }

  // Sorteer op datum (nieuwste eerst)
  statusChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const renderField = (label: string, value: any, field: string, type: string = "text") => {
    if (isEditing) {
      switch (type) {
        case "select":
          return (
            <Select 
              value={editData[field] || ""} 
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
               value={editData[field] || ""}
               onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, [field]: e.target.value }))}
               placeholder={`Voer ${label.toLowerCase()} in`}
             />
          )
        default:
          return (
                         <Input
               type={type}
               value={editData[field] || ""}
               onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, [field]: e.target.value }))}
               placeholder={`Voer ${label.toLowerCase()} in`}
             />
          )
      }
    } else {
      return <p className="mt-1">{value || "Niet ingevuld"}</p>
    }
  }

  return (
    <div className="space-y-6">
      {/* Hoofdprofiel */}
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-3">
            <User className="w-5 h-5" />
            <span>Profiel</span>
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
                  <span>Bewerken</span>
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
                    <span>{isSaving ? "Opslaan..." : "Opslaan"}</span>
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Annuleren</span>
                  </Button>
                </div>
              )}
              <Badge className={(() => {
                if (crewMember.status === "ziek") return "bg-red-100 text-red-800"
                if (!crewMember.regime) return getStatusColor(crewMember.status)
                
                const statusCalculation = calculateCurrentStatus(crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd", crewMember.thuis_sinds || null, crewMember.on_board_since || null)
                return statusCalculation.currentStatus === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
              })()}>
                {(() => {
                  if (crewMember.status === "ziek") return "Ziek"
                  if (!crewMember.regime) return crewMember.status === "aan-boord" ? "Aan boord" : "Thuis"
                  
                  const statusCalculation = calculateCurrentStatus(crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd", crewMember.thuis_sinds || null, crewMember.on_board_since || null)
                  return statusCalculation.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
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
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
                <label className="text-sm font-medium text-gray-700">Voornaam *</label>
                {renderField("Voornaam", crewMember.first_name, "first_name")}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Achternaam *</label>
                {renderField("Achternaam", crewMember.last_name, "last_name")}
                </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Nationaliteit *</label>
                {renderField("Nationaliteit", crewMember.nationality, "nationality", "select")}
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">Functie *</label>
                {renderField("Functie", crewMember.position, "position", "select")}
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">Regime *</label>
                {renderField("Regime", crewMember.regime, "regime", "select")}
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700">Status *</label>
                {renderField("Status", crewMember.status, "status", "select")}
                {crewMember.regime && crewMember.regime !== "Altijd" && (
                  <div className="mt-1 text-xs text-gray-500">
                    {(() => {
                      const statusCalculation = calculateCurrentStatus(crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd", crewMember.thuis_sinds || null, crewMember.on_board_since || null)
                      return `Volgende wijziging: ${statusCalculation.daysUntilRotation} dagen`
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

              <div>
                <label className="text-sm font-medium text-gray-700">Matricule Nummer</label>
                                 {renderField("Matricule", (crewMember as any).matricule, "matricule")}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Telefoon *</label>
                {renderField("Telefoon", crewMember.phone, "phone")}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
                {renderField("Email", crewMember.email, "email", "email")}
            </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Geboortedatum *</label>
                {renderField("Geboortedatum", crewMember.birth_date, "birth_date", "date")}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Geboorteplaats</label>
                {renderField("Geboorteplaats", (crewMember as any).birth_place, "birth_place")}
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

        {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700">Notities</label>
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


    </div>
  )
}
