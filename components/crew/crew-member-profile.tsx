"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { User, Phone, Mail, Calendar, MapPin, GraduationCap, Cigarette, AlertCircle, Edit, Save, X, Trash2 } from "lucide-react"
import { OutOfServiceDialog } from "./out-of-service-dialog"
import { BackInServiceDialog, BackInServiceData } from "./back-in-service-dialog"
import { shipDatabase } from "@/data/crew-database"
import { useCrewData, useCrewMember } from "@/hooks/use-crew-data"
import { addOutOfServiceCrew, removeOutOfServiceCrew, isCrewMemberOutOfService } from "@/utils/out-of-service-storage"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

const POSITION_OPTIONS = [
  "Schipper",
  "Stuurman",
  "Vol Matroos",
  "Matroos",
  "Lichtmatroos",
  "Deksmann"
]

const FIRMA_OPTIONS = [
  "Bamalite S.A.",
  "Alcina S.A.",
  "Devel Shipping S.A.",
  "Europe Shipping AG.",
  "Brugo Shipping SARL"
]

const REGIME_OPTIONS = ["1/1", "2/2", "3/3"]

const STATUS_OPTIONS = [
  { value: "aan-boord", label: "Aan boord" },
  { value: "thuis", label: "Thuis" },
  { value: "ziek", label: "Ziek" },
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

const DOCUMENT_OPTIONS = [
  "Dienstboek",
  "Legitimatie",
  "Medische keuring",
  "Overig document"
]

type AssignmentEntry = {
  date?: string;
  from?: string;
  to?: string;
  shipId: string;
  action: string;
  note: string;
}

type ChangeEntry = {
  date: string;
  field: string;
  oldValue: any;
  newValue: any;
};

interface Props {
  crewMemberId: string
  onProfileUpdate?: () => void
}

export function CrewMemberProfile({ crewMemberId, onProfileUpdate }: Props) {
  // Gebruik de nieuwe hook voor crew data
  const { crewDatabase, updateData, removeItem } = useCrewData()
  const crewData = (crewDatabase as any)[crewMemberId]
  
  const [edit, setEdit] = useState(false)
  const [profile, setProfile] = useState(() => {
    if (!crewData) {
      return {
        id: crewMemberId,
        firstName: "Onbekend",
        lastName: "Bemanningslid",
        birthDate: "",
        birthPlace: "",
        address: "",
        phone: "",
        email: "",
        position: "",
        smoking: false,
        experience: "",
        qualifications: [],
        shipId: "",
        ship: "",
        regime: "2/2",
        company: "",
        matricule: "",
        entryDate: "",
        notes: "",
        onBoardSince: "",
        status: "aan-boord",
        assignmentHistory: [] as AssignmentEntry[],
        vasteDienst: false,
        inDienstVanaf: "",
        // Student velden
        isStudent: false,
        educationType: "",
        schoolPeriods: [],
        educationEndDate: "",
      };
    }
    
    return {
      ...crewData,
      // fallback voor velden die mogelijk ontbreken in oude data
      qualifications: crewData.qualifications || [],
      notes: crewData.notes || "",
      assignmentHistory: crewData.assignmentHistory || [],
      vasteDienst: crewData.vasteDienst || false,
      inDienstVanaf: crewData.inDienstVanaf || "",
      // Student velden
      isStudent: crewData.isStudent || false,
      educationType: crewData.educationType || "",
      schoolPeriods: crewData.schoolPeriods || [],
      educationEndDate: crewData.educationEndDate || "",
    };
  })
  const [newDiploma, setNewDiploma] = useState("")
  const [newNote, setNewNote] = useState("")
  const [error, setError] = useState("")

  // Houd het vorige profiel bij om te detecteren of het schip is gewijzigd
  const prevProfileRef = useRef<typeof profile | null>(null)
  useEffect(() => { prevProfileRef.current = profile }, [edit])

  useEffect(() => {
    if (profile.position === "Kapitein") {
      setProfile((prev: typeof profile) => ({ ...prev, position: "Schipper" }));
    }
    // eslint-disable-next-line
  }, []);

  const isAflosser = profile.position?.toLowerCase().includes("aflos") || profile.position?.toLowerCase().includes("relief")
  const isOutOfService = isCrewMemberOutOfService(crewMemberId)
  const [vasteDienst, setVasteDienst] = useState(profile.vasteDienst || false)
  const [inDienstVanaf, setInDienstVanaf] = useState(profile.inDienstVanaf || "")
  // Voor nieuwe periode-toewijzing
  const [newPeriod, setNewPeriod] = useState({
    from: "",
    to: "",
    shipId: "",
    note: ""
  })

  // Huidige actieve periode voor aflosser bepalen
  const huidigePeriode = useMemo(() => {
    if (!isAflosser) return null
    const today = new Date()
    const sorted = [...(profile.assignmentHistory || [])]
      .filter(entry => entry.from && entry.to)
      .sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime())
    return sorted.find(entry => new Date(entry.from) <= today && new Date(entry.to) >= today) || null
  }, [profile.assignmentHistory, isAflosser])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setProfile({ ...profile, [e.target.name]: e.target.value })
    if (e.target.name === "onBoardSince" && error) setError("")
  }
  function handleDiplomaRemove(idx: number) {
    setProfile({ ...profile, qualifications: profile.qualifications.filter((_: string, i: number) => i !== idx) })
  }
  function handleDiplomaAdd() {
    if (newDiploma.trim()) {
      setProfile({ ...profile, qualifications: [...profile.qualifications, newDiploma.trim()] })
      setNewDiploma("")
    }
  }
  function handleSave() {
    let updatedProfile = { ...profile };
    
    // Als er een nieuwe notitie is toegevoegd, voeg deze toe aan de notities array
    if (newNote.trim()) {
      const newNoteObj = {
        id: `note-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        author: "HR Manager",
        type: "neutraal",
        content: newNote.trim()
      };
      
      const currentNotes = Array.isArray(profile.notes) ? profile.notes : [];
      updatedProfile.notes = [...currentNotes, newNoteObj];
    }
    const now = new Date().toISOString();
    const changeHistory: ChangeEntry[] = [...(profile.changeHistory || [])];
    // Vergelijk alle relevante velden en log wijzigingen
    const fieldsToCheck = [
      "firstName", "lastName", "birthDate", "birthPlace", "address", "phone", "email", "position", "smoking", "experience", "qualifications", "ship", "regime", "company", "matricule", "entryDate", "notes", "onBoardSince", "status", "vasteDienst", "inDienstVanaf", "isStudent", "educationType", "schoolPeriods", "educationEndDate"
    ];
    fieldsToCheck.forEach(field => {
      if (JSON.stringify((profile as any)[field]) !== JSON.stringify((crewDatabase as any)[profile.id]?.[field])) {
        changeHistory.push({
          date: now,
          field,
          oldValue: (crewDatabase as any)[profile.id]?.[field],
          newValue: (profile as any)[field]
        });
      }
    });
    updatedProfile.changeHistory = changeHistory;
    // Automatisch vandaag invullen als geen datum is opgegeven bij statuswissel
    if ((profile.status === "aan-boord" || profile.status === "thuis") && !profile.onBoardSince) {
      updatedProfile = { ...updatedProfile, onBoardSince: new Date().toISOString().split("T")[0] };
    }
    if (edit && profile.shipId !== prevProfileRef.current?.shipId) {
      const newHistory = [
        ...(profile.assignmentHistory || []),
        {
          date: new Date().toISOString().split("T")[0],
          shipId: profile.shipId,
          action: "verplaatst",
          note: `Handmatige wissel naar ${profile.ship}`,
        },
      ];
      updatedProfile = { 
        ...updatedProfile, 
        assignmentHistory: newHistory,
        shipId: profile.shipId // Update de shipId zodat het bemanningslid echt verplaatst wordt
      };
    }
    if (isAflosser) {
      updatedProfile = { ...updatedProfile, vasteDienst, inDienstVanaf };
    }
    setProfile(updatedProfile);
    
    // Update via de nieuwe hook
    updateData('crewDatabase', {
      [profile.id]: updatedProfile
    });
    
    setEdit(false);
    
    // Notify parent component van wijzigingen
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  }
  function handleCancel() {
    setEdit(false)
    setNewNote("")
  }

  function handleAddPeriod() {
    if (!newPeriod.from || !newPeriod.to || !newPeriod.shipId) return setError("Vul alle velden in voor de periode-toewijzing.")
    const newHistory = [
      ...(profile.assignmentHistory || []),
      {
        ...newPeriod,
        action: "aflos-periode",
        note: newPeriod.note || "Aflos-periode"
      }
    ]
    setProfile({ ...profile, assignmentHistory: newHistory })
    setNewPeriod({ from: "", to: "", shipId: "", note: "" })
    setError("")
  }

  function formatAddress(address: any) {
    if (!address) return "";
    if (typeof address === "string") return address;
    // Object: combineer velden
    const { street = "", postalCode = "", city = "", country = "" } = address;
    return [street, postalCode, city, country].filter(Boolean).join(", ");
  }

  function handleDiplomaFileUpload(e: React.ChangeEvent<HTMLInputElement>, diploma: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Simuleer upload: in echte app uploaden naar server en url opslaan
    const url = URL.createObjectURL(file);
    setProfile((prev: typeof profile) => ({
      ...prev,
      diplomaFiles: {
        ...(prev.diplomaFiles || {}),
        [diploma]: url
      }
    }));
  }

  function handleDocumentFileUpload(e: React.ChangeEvent<HTMLInputElement>, docType: string, expiry?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProfile((prev: typeof profile) => ({
      ...prev,
      documentFiles: {
        ...(prev.documentFiles || {}),
        [docType]: { url, expiry: expiry || '' }
      }
    }));
  }

  function handleDocumentRemove(docType: string) {
    setProfile((prev: typeof profile) => {
      const newFiles = { ...(prev.documentFiles || {}) };
      delete newFiles[docType];
      return { ...prev, documentFiles: newFiles };
    });
  }

  function handleDeleteAflosser() {
    if (isAflosser && confirm("Weet je zeker dat je deze aflosser wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
      // Verwijder via de nieuwe hook
      removeItem('crewDatabase', crewMemberId)
      
      // Redirect naar aflosser overzicht
      window.location.href = "/bemanning/aflossers"
    }
  }

  function handleOutOfService(date: Date, reason: string) {
    // Save to localStorage
    addOutOfServiceCrew({
      crewMemberId,
      outOfServiceDate: date.toISOString().split('T')[0],
      outOfServiceReason: reason
    })
    
    // Update local state
    const updatedProfile = {
      ...profile,
      status: "uit-dienst" as const,
      outOfServiceDate: date.toISOString().split('T')[0],
      outOfServiceReason: reason
    }
    setProfile(updatedProfile)
    
    // Show success message
    alert(`${profile.firstName} ${profile.lastName} is succesvol uit dienst gezet`)
    
    // Trigger profile update callback
    if (onProfileUpdate) {
      onProfileUpdate()
    }
    
    // Force page refresh to update all overviews
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  function handleDefinitiveDelete() {
    if (confirm(`Weet je zeker dat je ${profile.firstName} ${profile.lastName} definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      // Remove from out-of-service list
      removeOutOfServiceCrew(crewMemberId)
      
      // Show success message
      alert(`${profile.firstName} ${profile.lastName} is definitief verwijderd`)
      
      // Redirect to former crew members page
      window.location.href = "/bemanning/oude-bemanningsleden"
    }
  }

  function handleBackInService(data: BackInServiceData) {
    // Remove from out-of-service list
    removeOutOfServiceCrew(crewMemberId)
    
    // Update local state with new data
    const updatedProfile = {
      ...profile,
      shipId: data.shipId,
      position: data.position,
      regime: data.regime,
      onBoardSince: data.startDate,
      // Add assignment history entry
      assignmentHistory: [
        ...(profile.assignmentHistory || []),
        {
          date: data.startDate,
          shipId: data.shipId,
          action: "Terug in dienst",
          note: data.notes || `Terug in dienst gezet op ${data.startDate}`
        }
      ]
    }
    setProfile(updatedProfile)
    
    // Show success message
    alert(`${profile.firstName} ${profile.lastName} is weer in dienst gezet op ${data.shipId}`)
    
    // Trigger profile update callback
    if (onProfileUpdate) {
      onProfileUpdate()
    }
    
    // Force page refresh to update all overviews
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Persoonlijk Profiel</span>
          </CardTitle>
          {edit ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />Opslaan
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />Annuleren
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
                <Edit className="w-4 h-4 mr-2" />Bewerken
              </Button>
              {isAflosser && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteAflosser}
                  title="Aflosser verwijderen"
                >
                  <Trash2 className="w-4 h-4 mr-2" />Verwijderen
                </Button>
              )}
              {!isAflosser && !isOutOfService && (
                <OutOfServiceDialog
                  crewMemberId={crewMemberId}
                  crewMemberName={`${profile.firstName} ${profile.lastName}`}
                  onOutOfService={handleOutOfService}
                />
              )}
              {!isAflosser && isOutOfService && (
                <div className="flex gap-2">
                  <BackInServiceDialog
                    crewMemberId={crewMemberId}
                    crewMemberName={`${profile.firstName} ${profile.lastName}`}
                    onBackInService={handleBackInService}
                  />
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDefinitiveDelete}
                    title="Definitief verwijderen"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />Definitief verwijderen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        
        {/* Status indicator voor uit dienst bemanningsleden */}
        {isOutOfService && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">Uit dienst bemanningslid</span>
            </div>
            <p className="text-red-600 text-sm mt-1">
              Dit bemanningslid is uit dienst gezet en verschijnt niet meer in actieve overzichten.
              Je kunt deze persoon weer in dienst zetten of definitief verwijderen.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Naam</label>
              {edit ? (
                <div className="flex gap-2">
                  <Input name="firstName" value={profile.firstName} onChange={handleChange} className="w-1/2" />
                  <Input name="lastName" value={profile.lastName} onChange={handleChange} className="w-1/2" />
                </div>
              ) : (
                <p className="text-gray-900 font-medium">{profile.firstName} {profile.lastName}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Geboortedatum</label>
              {edit ? (
                <Input name="birthDate" type="date" value={profile.birthDate} onChange={handleChange} />
              ) : (
                <p className="text-gray-900">{new Date(profile.birthDate).toLocaleDateString("nl-NL")}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Geboorteplaats</label>
              {edit ? (
                <Input name="birthPlace" value={profile.birthPlace} onChange={handleChange} />
              ) : (
                <p className="text-gray-900">{profile.birthPlace}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Adres</label>
              {edit ? (
                <Input name="address" value={typeof profile.address === "string" ? profile.address : formatAddress(profile.address)} onChange={handleChange} />
              ) : (
                <p className="text-gray-900">{formatAddress(profile.address)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Telefoonnummer</label>
              {edit ? (
                <Input name="phone" value={profile.phone} onChange={handleChange} />
              ) : (
                <p className="text-gray-900">{profile.phone}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Mailadres</label>
              {edit ? (
                <Input name="email" value={profile.email} onChange={handleChange} />
              ) : (
                <p className="text-gray-900">{profile.email}</p>
              )}
            </div>
            {!isAflosser && (
              <div>
                <label className="text-sm font-medium text-gray-500">Functie</label>
                <select name="position" value={profile.position} onChange={handleChange} className="border rounded px-2 py-1">
                  <option value="">Kies functie</option>
                  {POSITION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Roken</label>
              {edit ? (
                <select name="smoking" value={profile.smoking ? "ja" : "nee"} onChange={e => setProfile({ ...profile, smoking: e.target.value === "ja" })} className="border rounded px-2 py-1">
                  <option value="nee">Nee</option>
                  <option value="ja">Ja</option>
                </select>
              ) : (
                <Badge variant={profile.smoking ? "destructive" : "secondary"}>{profile.smoking ? "Ja" : "Nee"}</Badge>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Ervaring</label>
              {edit ? (
                <Input name="experience" value={profile.experience} onChange={handleChange} />
              ) : (
                <p className="text-gray-900">{profile.experience}</p>
              )}
            </div>

            {/* Student sectie */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="isStudent"
                  checked={profile.isStudent}
                  onChange={(e) => setProfile({ ...profile, isStudent: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isStudent" className="text-sm font-medium text-gray-500">Volgt bemanningslid een opleiding?</label>
              </div>

              {profile.isStudent && (
                <div className="space-y-4 pl-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type opleiding</label>
                    {edit ? (
                      <select
                        name="educationType"
                        value={profile.educationType}
                        onChange={(e) => setProfile({ ...profile, educationType: e.target.value })}
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="">Selecteer type opleiding</option>
                        <option value="BBL">BBL (Beroepsbegeleidende Leerweg)</option>
                        <option value="BOL">BOL (Beroepsopleidende Leerweg)</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{profile.educationType || "Niet gespecificeerd"}</p>
                    )}
                  </div>

                  {profile.educationType === "BBL" && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Schoolperiodes</label>
                      {edit ? (
                        <div className="space-y-2">
                          {profile.schoolPeriods && profile.schoolPeriods.map((period: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <Input
                                type="date"
                                value={period.fromDate || ""}
                                onChange={(e) => {
                                  const newPeriods = [...(profile.schoolPeriods || [])];
                                  newPeriods[index] = { ...period, fromDate: e.target.value };
                                  setProfile({ ...profile, schoolPeriods: newPeriods });
                                }}
                                placeholder="Van datum"
                                className="text-xs"
                              />
                              <Input
                                type="date"
                                value={period.toDate || ""}
                                onChange={(e) => {
                                  const newPeriods = [...(profile.schoolPeriods || [])];
                                  newPeriods[index] = { ...period, toDate: e.target.value };
                                  setProfile({ ...profile, schoolPeriods: newPeriods });
                                }}
                                placeholder="Tot datum"
                                className="text-xs"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newPeriods = (profile.schoolPeriods || []).filter((_: any, i: number) => i !== index);
                                  setProfile({ ...profile, schoolPeriods: newPeriods });
                                }}
                                className="text-xs"
                              >
                                Verwijderen
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPeriods = [...(profile.schoolPeriods || []), { fromDate: "", toDate: "", reason: "School" }];
                              setProfile({ ...profile, schoolPeriods: newPeriods });
                            }}
                          >
                            Schoolperiode toevoegen
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {profile.schoolPeriods && profile.schoolPeriods.length > 0 ? (
                            // Sorteer periodes op datum
                            [...profile.schoolPeriods]
                              .sort((a, b) => new Date(a.fromDate || 0).getTime() - new Date(b.fromDate || 0).getTime())
                              .map((period: any, index: number) => (
                                <div key={index} className="text-sm text-gray-700 flex items-center gap-2">
                                  <span className="text-xs text-gray-500">#{index + 1}</span>
                                  {period.fromDate && period.toDate ? (
                                    <span>
                                      {new Date(period.fromDate).toLocaleDateString("nl-NL")} t/m {new Date(period.toDate).toLocaleDateString("nl-NL")}
                                    </span>
                                  ) : (
                                    <span className="text-red-500">Onvolledige periode</span>
                                  )}
                                </div>
                              ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">Geen schoolperiodes ingevoerd</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {profile.educationType === "BOL" && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Opleidingsperiode tot</label>
                      {edit ? (
                        <Input
                          type="date"
                          value={profile.educationEndDate || ""}
                          onChange={(e) => setProfile({ ...profile, educationEndDate: e.target.value })}
                          placeholder="Tot wanneer duurt de opleiding?"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {profile.educationEndDate ? new Date(profile.educationEndDate).toLocaleDateString("nl-NL") : "Niet gespecificeerd"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Diploma's</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.qualifications && profile.qualifications.length > 0 ? (
                  profile.qualifications.map((diploma: string, idx: number) => (
                    <span key={idx} className="flex items-center bg-green-50 border border-green-200 rounded px-2 py-0.5 text-xs text-green-800">
                      {diploma}
                      {/* Toon link naar upload als aanwezig */}
                      {profile.diplomaFiles && profile.diplomaFiles[diploma] && (
                        <a href={profile.diplomaFiles[diploma]} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 underline">Bekijk</a>
                      )}
                      {edit && (
                        <button onClick={() => handleDiplomaRemove(idx)} className="ml-1 text-red-500 hover:underline" title="Verwijder diploma">×</button>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">Geen diploma's geregistreerd</span>
                )}
                {edit && (
                  <span className="flex items-center gap-2">
                    <select
                      value={newDiploma}
                      onChange={e => setNewDiploma(e.target.value)}
                      className="h-7 text-xs px-2 py-1"
                    >
                      <option value="">Kies diploma</option>
                      {DIPLOMA_OPTIONS.filter(opt => !profile.qualifications.includes(opt)).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <Button size="sm" className="ml-1 px-2 py-1 h-7" onClick={handleDiplomaAdd} type="button">Toevoegen</Button>
                  </span>
                )}
              </div>
              {/* Upload voor elk diploma */}
              {edit && profile.qualifications.map((diploma: string, idx: number) => (
                <div key={diploma} className="flex items-center gap-2 mt-1">
                  <label className="text-xs text-gray-500">Upload {diploma}:</label>
                  <input type="file" accept="application/pdf,image/*" onChange={e => handleDiplomaFileUpload(e, diploma)} />
                  {profile.diplomaFiles && profile.diplomaFiles[diploma] && (
                    <a href={profile.diplomaFiles[diploma]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Bekijk</a>
                  )}
                </div>
              ))}
            </div>
            {!isAflosser && (
              <div>
                <label className="text-sm font-medium text-gray-500">Schip</label>
                {edit ? (
                  <Select
                    value={profile.shipId || ""}
                    onValueChange={(val: keyof typeof shipDatabase) => {
                      const ship = shipDatabase[val]
                      setProfile({ ...profile, shipId: val, ship: ship?.name || "" })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kies een schip" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(shipDatabase).map(ship => (
                        <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-900">{profile.shipId ? (shipDatabase as any)[profile.shipId]?.name || profile.shipId : profile.ship}</p>
                )}
              </div>
            )}
            {isAflosser && (
              <div>
                <label className="text-sm font-medium text-gray-500">Huidige toewijzing</label>
                <div>
                  <p className="text-gray-900 font-medium">
                    {profile.status === "aan-boord" && profile.shipId && (shipDatabase as any)[profile.shipId]?.name
                      ? (shipDatabase as any)[profile.shipId]?.name
                      : "Geen actieve toewijzing"}
                  </p>
                  {huidigePeriode && (
                    <div className="text-xs text-blue-700">
                      Periode: {huidigePeriode.from && format(new Date(huidigePeriode.from), "dd-MM-yyyy")} t/m {huidigePeriode.to && format(new Date(huidigePeriode.to), "dd-MM-yyyy")}
                    </div>
                  )}
                </div>
              </div>
            )}
            {(!isAflosser || vasteDienst) && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Firma</label>
                  {edit ? (
                    <select name="company" value={profile.company} onChange={handleChange} className="border rounded px-2 py-1">
                      {FIRMA_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.company}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Matricule nummer</label>
                  {edit ? (
                    <Input name="matricule" value={profile.matricule} onChange={handleChange} />
                  ) : (
                    <p className="text-gray-900">{profile.matricule}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">In dienst per</label>
                  {edit ? (
                    <Input name="entryDate" type="date" value={profile.entryDate} onChange={handleChange} />
                  ) : (
                    <p className="text-gray-900">{new Date(profile.entryDate).toLocaleDateString("nl-NL")}</p>
                  )}
                </div>
              </>
            )}
            {/* Vaarregime alleen tonen als geen aflosser */}
            {!isAflosser && (
              <div>
                <label className="text-sm font-medium text-gray-500">Vaarregime</label>
                {edit ? (
                  <select name="regime" value={profile.regime} onChange={handleChange} className="border rounded px-2 py-1">
                    {REGIME_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800">{profile.regime} weken</Badge>
                )}
              </div>
            )}
            {(!isAflosser || vasteDienst) && (
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                {edit ? (
                  <select name="status" value={profile.status} onChange={handleChange} className="border rounded px-2 py-1">
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <Badge className={
                    profile.status === "aan-boord" ? "bg-green-100 text-green-800" :
                    profile.status === "thuis" ? "bg-blue-100 text-blue-800" :
                    profile.status === "ziek" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {STATUS_OPTIONS.find(opt => opt.value === profile.status)?.label || profile.status}
                  </Badge>
                )}
              </div>
            )}
            {/* Status-info: voor aflosser een aangepaste tekst, anders de standaard */}
            {isAflosser ? (
              <div>
                <label className="text-sm font-medium text-gray-500">Actief</label>
                <p className="text-gray-900">
                  {profile.status === "aan-boord" && profile.ship ? (
                    <>Momenteel actief op de {profile.ship}</>
                  ) : (
                    <>Momenteel niet actief</>
                  )}
                </p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {profile.status === "aan-boord" ? "Aan boord sinds" : profile.status === "thuis" ? "Naar huis sinds" : "Status sinds"}
                </label>
                {edit ? (
                  <Input name="onBoardSince" type="date" value={profile.onBoardSince || ""} onChange={handleChange} />
                ) : (
                  <p className="text-gray-900">{profile.onBoardSince ? new Date(profile.onBoardSince).toLocaleDateString("nl-NL") : "-"}</p>
                )}
              </div>
            )}
          </div>
        </div>
        {isAflosser && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                <input 
                  type="checkbox" 
                  checked={vasteDienst} 
                  onChange={e => setVasteDienst(e.target.checked)} 
                  className="mr-2"
                />
                Vaste dienst?
              </label>
              {vasteDienst && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-500">In dienst vanaf:</label>
                  <input 
                    type="date" 
                    value={inDienstVanaf || ""} 
                    onChange={e => setInDienstVanaf(e.target.value)} 
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
            {vasteDienst && (
              <div className="mt-3 text-xs text-blue-700">
                <p>✅ Vaste dienst velden zijn nu beschikbaar (Firma, Matricule, Status, etc.)</p>
              </div>
            )}
          </div>
        )}
        {/* Opmerkingen */}
        <div className="border-t pt-4">
          <label className="text-sm font-medium text-gray-500 mb-2 block">Opmerkingen</label>
          <div className="space-y-2">
            {edit ? (
              <Textarea 
                value={newNote} 
                onChange={e => setNewNote(e.target.value)}
                placeholder="Voeg een opmerking toe..."
                className="min-h-[80px]"
              />
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {Array.isArray(profile.notes) 
                    ? profile.notes.length > 0 
                      ? profile.notes.map((note: any, index: number) => (
                          <div key={note.id || index} className="mb-2 last:mb-0">
                            <div className="text-xs text-gray-500 mb-1">
                              {note.date} - {note.author} ({note.type})
                            </div>
                            <div className="text-sm">{note.content}</div>
                          </div>
                        ))
                      : "Geen opmerkingen"
                    : profile.notes || "Geen opmerkingen"
                  }
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Toewijzingshistorie */}
        <div className="mb-6">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Toewijzingshistorie</label>
          <div className="border rounded-lg bg-gray-50 p-3">
            {(profile.assignmentHistory || []).length === 0 ? (
              <div className="text-gray-500 text-sm">Geen historie beschikbaar</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {profile.assignmentHistory.map((entry: any, idx: number) => (
                  <li key={idx} className="py-2 flex flex-col md:flex-row md:items-center md:space-x-4">
                    {entry.from && entry.to ? (
                      <span className="text-xs text-gray-500 w-32">{format(new Date(entry.from), "dd-MM-yyyy")} t/m {format(new Date(entry.to), "dd-MM-yyyy")}</span>
                    ) : (
                      <span className="text-xs text-gray-500 w-24">{entry.date}</span>
                    )}
                    <span className="text-sm font-medium text-gray-900 flex-1">{shipDatabase[entry.shipId as keyof typeof shipDatabase]?.name || entry.shipId}</span>
                    <span className="text-xs text-blue-700 w-24">{entry.action}</span>
                    <span className="text-xs text-gray-500 flex-1">{entry.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Alleen voor aflossers: nieuw van-tot formulier */}
        {isAflosser && edit && (
          <div className="mb-6 border rounded-lg bg-blue-50 p-4">
            <div className="font-semibold mb-2">Nieuwe aflos-periode toevoegen</div>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 gap-2">
              <span>
                <label className="text-xs text-gray-500">Schip</label>
                <select value={newPeriod.shipId} onChange={e => setNewPeriod({ ...newPeriod, shipId: e.target.value })} className="border rounded px-2 py-1">
                  <option value="">Kies schip</option>
                  {Object.values(shipDatabase).map(ship => (
                    <option key={ship.id} value={ship.id}>{ship.name}</option>
                  ))}
                </select>
              </span>
              <span>
                <label className="text-xs text-gray-500">Van</label>
                <input type="date" value={newPeriod.from} onChange={e => setNewPeriod({ ...newPeriod, from: e.target.value })} className="border rounded px-2 py-1" />
              </span>
              <span>
                <label className="text-xs text-gray-500">Tot</label>
                <input type="date" value={newPeriod.to} onChange={e => setNewPeriod({ ...newPeriod, to: e.target.value })} className="border rounded px-2 py-1" />
              </span>
              <span className="flex-1">
                <label className="text-xs text-gray-500">Notitie</label>
                <input type="text" value={newPeriod.note} onChange={e => setNewPeriod({ ...newPeriod, note: e.target.value })} className="border rounded px-2 py-1 w-full" />
              </span>
              <Button size="sm" className="h-8" onClick={handleAddPeriod} type="button">Toevoegen</Button>
            </div>
            {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
          </div>
        )}
        <div className="mt-8">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Documenten & Certificaten</label>
          {DOCUMENT_OPTIONS.map((docType) => (
            <div key={docType} className="flex items-center gap-2 mt-1">
              <label className="text-xs text-gray-500 w-32">{docType}:</label>
              {edit ? (
                <>
                  <input type="file" accept="application/pdf,image/*" onChange={e => handleDocumentFileUpload(e, docType, (document.getElementById(`expiry-${docType}`) as HTMLInputElement)?.value)} />
                  <input type="date" id={`expiry-${docType}`} className="ml-2 text-xs border rounded px-2 py-1" placeholder="Verloopdatum" />
                  {profile.documentFiles && profile.documentFiles[docType]?.url && (
                    <>
                      <a href={profile.documentFiles[docType].url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Bekijk</a>
                      <button type="button" className="ml-2 text-red-500 text-xs underline" onClick={() => handleDocumentRemove(docType)}>Verwijder</button>
                    </>
                  )}
                </>
              ) : (
                profile.documentFiles && profile.documentFiles[docType]?.url ? (
                  <>
                    <a href={profile.documentFiles[docType].url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Bekijk</a>
                    {profile.documentFiles[docType].expiry && (
                      <span className="ml-2 text-xs text-gray-500">(geldig t/m {new Date(profile.documentFiles[docType].expiry).toLocaleDateString('nl-NL')})</span>
                    )}
                    {profile.documentFiles[docType].expiry && new Date(profile.documentFiles[docType].expiry) < new Date() && (
                      <span className="ml-2 text-xs text-red-600 font-bold">Verlopen!</span>
                    )}
                    {profile.documentFiles[docType].expiry && new Date(profile.documentFiles[docType].expiry) >= new Date() && (new Date(profile.documentFiles[docType].expiry).getTime() - new Date().getTime())/(1000*60*60*24) < 30 && (
                      <span className="ml-2 text-xs text-orange-600 font-bold">Bijna verlopen!</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic">Niet geüpload</span>
                )
              )}
            </div>
          ))}
        </div>
        {profile.changeHistory && profile.changeHistory.length > 0 && (
          <div className="mt-8">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Wijzigingshistorie</label>
            <div className="border rounded-lg bg-gray-50 p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th>Datum</th>
                    <th>Veld</th>
                    <th>Oud</th>
                    <th>Nieuw</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.changeHistory.map((entry: any, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(entry.date).toLocaleString("nl-NL")}</td>
                      <td>{entry.field}</td>
                      <td>{typeof entry.oldValue === "object" ? JSON.stringify(entry.oldValue) : String(entry.oldValue ?? "")}</td>
                      <td>{typeof entry.newValue === "object" ? JSON.stringify(entry.newValue) : String(entry.newValue ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
