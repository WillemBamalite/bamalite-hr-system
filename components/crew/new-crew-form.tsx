"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, UserPlus, Save, X } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import { ContractDialog } from "./contract-dialog"
import type { ContractData } from "@/utils/contract-generator"

const diplomaOptions = [
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
const companyOptions = [
  "Bamalite S.A.",
  "Devel Shipping S.A.",
  "Brugo Shipping SARL.",
  "Europe Shipping AG.",
  "Alcina S.A."
]

interface NewCrewFormData {
  firstName: string
  lastName: string
  nationality: string
  position: string
  shipId: string
  regime: "1/1" | "2/2" | "3/3"
  startDate: string // Nieuwe veld voor startdatum
  phone: string
  email: string
  birthDate: string
  entryDate: string
  birthPlace: string
  smoking: boolean
  experience: string
  diplomas: string[]
  company: string
  matricule: string
  address: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  notes: string
  // Checklist velden
  in_dienst_vanaf: string
  arbeidsovereenkomst: boolean
  ingeschreven_luxembourg: boolean
  verzekerd: boolean
  // Student velden
  isStudent: boolean
  educationType?: "BBL" | "BOL"
  educationStartDate?: string // Voor BOL
  educationEndDate?: string // Voor BOL
  schoolPeriods: Array<{
    fromDate: string
    toDate: string
    reason: string
  }>
}

export function NewCrewForm() {
  const { addCrew, ships, loading, error } = useSupabaseData()
  const { t } = useLanguage()
  const [formData, setFormData] = useState<NewCrewFormData>({
    firstName: "",
    lastName: "",
    nationality: "NL",
    position: "Kapitein",
    shipId: "none",
    regime: "2/2",
    startDate: "", // Nieuwe veld voor startdatum
    phone: "",
    email: "",
    birthDate: "",
    entryDate: "",
    birthPlace: "",
    smoking: false,
    experience: "",
    diplomas: [],
    company: companyOptions[0],
    matricule: "",
    address: {
      street: "",
      city: "",
      postalCode: "",
      country: ""
    },
    notes: "",
    // Checklist velden
    in_dienst_vanaf: "",
    arbeidsovereenkomst: false,
    ingeschreven_luxembourg: false,
    verzekerd: false,
    // Student velden
    isStudent: false,
    educationType: "BBL",
    educationStartDate: "",
    educationEndDate: "",
    schoolPeriods: []
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showContractDialog, setShowContractDialog] = useState(false)
  const [savedCrewData, setSavedCrewData] = useState<ContractData | null>(null)

  const validateForm = () => {
    const errors: string[] = []

    if (!formData.firstName.trim()) errors.push(t('firstNameRequired'))
    if (!formData.lastName.trim()) errors.push(t('lastNameRequired'))
    if (!formData.nationality) errors.push(t('nationalityRequired'))
    if (!formData.position) errors.push(t('positionRequired'))
    if (!formData.phone.trim()) errors.push(t('phoneRequired'))
    if (!formData.birthDate) errors.push(t('birthDateRequired'))
    if (!formData.in_dienst_vanaf) errors.push(t('inServiceFromRequired'))

    // Validatie voor startdatum als er een schip is geselecteerd (niet voor 'Geen schip' of 'Nog in te delen')
    if (formData.shipId && formData.shipId !== "none" && formData.shipId !== "unassigned" && !formData.startDate) {
      errors.push("Startdatum is verplicht als er een schip is geselecteerd")
    }

    // Student validatie
    if (formData.isStudent) {
      if (!formData.educationType) {
        errors.push("Opleidingstype is verplicht voor studenten")
      }
      if (formData.educationType === "BOL") {
        if (!formData.educationStartDate) {
          errors.push(t('educationStartDateRequired'))
        }
        if (!formData.educationEndDate) {
          errors.push(t('educationEndDateRequired'))
        }
      }
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      alert("Vul de volgende velden in:\n" + errors.join("\n"))
      return
    }

    setIsSubmitting(true)

    try {
      // Bereken status op basis van startdatum en regime
      let status = "nog-in-te-delen"
      let onBoardSince = null
      let thuisSinds = null

      if (formData.shipId && formData.shipId !== "none" && formData.shipId !== "unassigned" && formData.startDate) {
        const calculatedStatus = calculateCurrentStatus(formData.startDate, formData.regime)
        status = calculatedStatus.status
        onBoardSince = calculatedStatus.onBoardSince
        thuisSinds = calculatedStatus.thuisSinds
      }

      // Genereer client-side id (zelfde patroon als aflossers)
      const id = `crew-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Maak crew member object voor Supabase
      const crewMember = {
        id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        nationality: formData.nationality,
        position: formData.position,
        ship_id: (formData.shipId === "none" || formData.shipId === "unassigned") ? null : formData.shipId,
        regime: formData.regime,
        status: (formData.shipId === "unassigned" ? 'nog-in-te-delen' : status) as "aan-boord" | "thuis" | "ziek" | "uit-dienst" | "nog-in-te-delen",
        sub_status: (!formData.arbeidsovereenkomst || !formData.ingeschreven_luxembourg || !formData.verzekerd) ? "wacht-op-startdatum" : null,
        on_board_since: onBoardSince || null,
        thuis_sinds: thuisSinds || null,
        expected_start_date: (status === "thuis" && formData.startDate && new Date(formData.startDate) > new Date()) ? formData.startDate : null,
        phone: formData.phone || null,
        email: formData.email || null,
        birth_date: formData.birthDate || null,
        birth_place: formData.birthPlace || null,
        matricule: formData.matricule || null,
        company: formData.company || null,
        smoking: formData.smoking || false,
        experience: formData.experience || null,
        address: formData.address,
        diplomas: formData.diplomas,
        notes: formData.notes ? [formData.notes] : [],
        // Checklist velden
        in_dienst_vanaf: formData.in_dienst_vanaf || null,
        proeftijd_datum: formData.in_dienst_vanaf || null, // Automatisch gelijk aan in_dienst_vanaf voor nieuwe medewerkers
        arbeidsovereenkomst: formData.arbeidsovereenkomst,
        ingeschreven_luxembourg: formData.ingeschreven_luxembourg,
        verzekerd: formData.verzekerd,
        // Student velden
        is_student: formData.isStudent,
        education_type: formData.isStudent ? formData.educationType : null,
        education_start_date: formData.isStudent && formData.educationType === "BOL" ? formData.educationStartDate : null,
        education_end_date: formData.isStudent && formData.educationType === "BOL" ? formData.educationEndDate : null,
        school_periods: formData.isStudent ? formData.schoolPeriods : [],
        // Recruitment status
        recruitment_status: "aangenomen"
      }

      console.log('Saving crew member to Supabase:', crewMember)

      // Bewaar via Supabase
      await addCrew(crewMember as any)

      // Haal scheepsnaam op
      const selectedShip = ships.find(ship => ship.id === formData.shipId)
      const shipName = selectedShip ? selectedShip.name : (formData.shipId === 'none' || formData.shipId === 'unassigned' ? '' : 'Onbekend schip')

      // Bereid contract data voor
      const contractData: ContractData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace,
        nationality: formData.nationality,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        position: formData.position,
        company: formData.company,
        in_dienst_vanaf: formData.in_dienst_vanaf,
        matricule: formData.matricule,
        shipName: shipName
      }

      // Bewaar contract data en toon dialog
      setSavedCrewData(contractData)
      setIsSuccess(true)
      setShowContractDialog(true)

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        nationality: "NL",
        position: "Kapitein",
        shipId: "none",
        regime: "2/2",
        startDate: "",
        phone: "",
        email: "",
        birthDate: "",
        entryDate: "",
        birthPlace: "",
        smoking: false,
        experience: "",
        diplomas: [],
        company: companyOptions[0],
        matricule: "",
        address: {
          street: "",
          city: "",
          postalCode: "",
          country: ""
        },
        notes: "",
        // Checklist velden
        in_dienst_vanaf: "",
        arbeidsovereenkomst: false,
        ingeschreven_luxembourg: false,
        verzekerd: false,
        // Student velden
        isStudent: false,
        educationType: "BBL",
        educationStartDate: "",
        educationEndDate: "",
        schoolPeriods: []
      })
      
    } catch (error) {
      console.error('Error adding crew member:', error)
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het toevoegen van het bemanningslid.'
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      nationality: "NL",
      position: "Kapitein",
      shipId: "none",
      regime: "2/2",
      startDate: "",
      phone: "",
      email: "",
      birthDate: "",
      entryDate: "",
      birthPlace: "",
      smoking: false,
      experience: "",
      diplomas: [],
      company: companyOptions[0],
      matricule: "",
      address: {
        street: "",
        city: "",
        postalCode: "",
        country: ""
      },
      notes: "",
      isStudent: false,
      educationType: "BBL",
      educationStartDate: "",
      educationEndDate: "",
      schoolPeriods: []
    })
  }

  // Helper functie voor status berekening
  const calculateCurrentStatus = (startDate: string, regime: string) => {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0) // Reset naar start van de dag
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset naar start van de dag
    
    // Als de startdatum in de toekomst ligt, persoon is "thuis" tot startdatum
    if (start > today) {
      return { 
        status: "thuis", 
        onBoardSince: null, 
        thuisSinds: today.toISOString().split('T')[0] // Thuis sinds vandaag
      }
    }
    
    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    let status = "nog-in-te-delen"
    let onBoardSince = null
    let thuisSinds = null
    
    if (regime === "1/1") {
      const cycle = 2 // 1 dag aan boord + 1 dag thuis
      const dayInCycle = daysSinceStart % cycle
      
      if (dayInCycle === 0) {
        status = "aan-boord"
        onBoardSince = startDate
      } else {
        status = "thuis"
        thuisSinds = new Date(start.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      }
    } else if (regime === "2/2") {
      const cycle = 4 // 2 dagen aan boord + 2 dagen thuis
      const dayInCycle = daysSinceStart % cycle
      
      if (dayInCycle < 2) {
        status = "aan-boord"
        onBoardSince = startDate
      } else {
        status = "thuis"
        thuisSinds = new Date(start.getTime() + (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      }
    } else if (regime === "3/3") {
      const cycle = 6 // 3 dagen aan boord + 3 dagen thuis
      const dayInCycle = daysSinceStart % cycle
      
      if (dayInCycle < 3) {
        status = "aan-boord"
        onBoardSince = startDate
      } else {
        status = "thuis"
        thuisSinds = new Date(start.getTime() + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      }
    }
    
    return { status, onBoardSince, thuisSinds }
  }

  const handleContractDialogComplete = () => {
    // Navigeer naar overzicht na contract dialog
    setTimeout(() => {
      window.location.href = '/bemanning/overzicht'
    }, 500)
  }

  if (isSuccess) {
    return (
      <>
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <UserPlus className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">{t('crewMemberAdded')}</h2>
              <p className='text-green-700 mb-4'>
                Het bemanningslid is succesvol toegevoegd aan het systeem.
              </p>
            </CardContent>
          </Card>
        </div>
        {savedCrewData && (
          <ContractDialog
            open={showContractDialog}
            onOpenChange={setShowContractDialog}
            crewData={savedCrewData}
            onComplete={handleContractDialogComplete}
          />
        )}
      </>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Persoonlijke Informatie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5" />
              <span>Persoonlijke Informatie</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('firstName')} *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder={t('firstName')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastName')} *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder={t('lastName')}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">{t('nationality')} *</Label>
                <Select value={formData.nationality} onValueChange={(value) => setFormData(prev => ({ ...prev, nationality: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer nationaliteit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NL">🇳🇱 Nederlands</SelectItem>
                    <SelectItem value="CZ">🇨🇿 Tsjechisch</SelectItem>
                    <SelectItem value="SLK">🇸🇰 Slowaaks</SelectItem>
                    <SelectItem value="EG">🇪🇬 Egyptisch</SelectItem>
                    <SelectItem value="PO">🇵🇱 Pools</SelectItem>
                    <SelectItem value="SERV">🇷🇸 Servisch</SelectItem>
                    <SelectItem value="HUN">🇭🇺 Hongaars</SelectItem>
                    <SelectItem value="BE">🇧🇪 Belgisch</SelectItem>
                    <SelectItem value="FR">🇫🇷 Frans</SelectItem>
                    <SelectItem value="DE">🇩🇪 Duits</SelectItem>
                    <SelectItem value="LUX">🇱🇺 Luxemburgs</SelectItem>
                    <SelectItem value="RO">🇷🇴 Roemeens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">{t('position')} *</Label>
                <Select value={formData.position} onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer functie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kapitein">Kapitein</SelectItem>
                    <SelectItem value="2e kapitein">2e kapitein</SelectItem>
                    <SelectItem value="Stuurman">Stuurman</SelectItem>
                    <SelectItem value="Lichtmatroos">Lichtmatroos</SelectItem>
                    <SelectItem value="Matroos">Matroos</SelectItem>
                    <SelectItem value="Deksman">Deksman</SelectItem>
                    <SelectItem value="Aflosser">Aflosser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Bedrijf</Label>
                <Select value={formData.company} onValueChange={(value) => setFormData(prev => ({ ...prev, company: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer bedrijf" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map((company) => (
                      <SelectItem key={company} value={company}>{company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')} *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+31 6 12345678"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="naam@email.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schip en Regime */}
        <Card>
          <CardHeader>
            <CardTitle>Schip en Regime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipId">Schip</Label>
                <Select
                  value={formData.shipId}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      shipId: value,
                      // Startdatum wissen wanneer geen schip of 'Nog in te delen'
                      startDate: (value === 'none' || value === 'unassigned') ? '' : prev.startDate
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer schip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen schip</SelectItem>
                    <SelectItem value="unassigned">Nog in te delen</SelectItem>
                    {ships.map((ship) => (
                      <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regime">Regime *</Label>
                <Select value={formData.regime} onValueChange={(value: "1/1" | "2/2" | "3/3") => setFormData(prev => ({ ...prev, regime: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1/1">1/1 (1 dag aan boord, 1 dag thuis)</SelectItem>
                    <SelectItem value="2/2">2/2 (2 dagen aan boord, 2 dagen thuis)</SelectItem>
                    <SelectItem value="3/3">3/3 (3 dagen aan boord, 3 dagen thuis)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('startDate')} *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required={!!(formData.shipId && formData.shipId !== 'unassigned' && formData.shipId !== 'none')}
                />
                {(formData.shipId && formData.shipId !== 'unassigned' && formData.shipId !== 'none') && (
                  <p className='text-xs text-gray-500'>{t('requiredWhenShipSelected')}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datums */}
        <Card>
          <CardHeader>
            <CardTitle>Datums</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">{t('birthDate')} *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entryDate">Indiensttreding *</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, entryDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthPlace">{t('birthPlace')} *</Label>
                <Input
                  id="birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthPlace: e.target.value }))}
                  placeholder={t('birthPlace')}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adres */}
        <Card>
          <CardHeader>
            <CardTitle>Adres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Straat *</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value }
                }))}
                placeholder="Straatnaam en huisnummer"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Plaats *</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value }
                  }))}
                  placeholder="Plaats"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postcode *</Label>
                <Input
                  id="postalCode"
                  value={formData.address.postalCode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, postalCode: e.target.value }
                  }))}
                  placeholder="1234 AB"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land *</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, country: e.target.value }
                  }))}
                  placeholder="Land"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overige Informatie */}
        <Card>
          <CardHeader>
            <CardTitle>Overige Informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule</Label>
                <Input
                  id="matricule"
                  value={formData.matricule}
                  onChange={(e) => setFormData(prev => ({ ...prev, matricule: e.target.value }))}
                  placeholder="Matricule nummer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">{t('experience')}</Label>
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="Jaren ervaring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Diploma's</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {diplomaOptions.map((diploma) => (
                  <div key={diploma} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={diploma}
                      checked={formData.diplomas.includes(diploma)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ 
                            ...prev, 
                            diplomas: [...prev.diplomas, diploma]
                          }))
                        } else {
                          setFormData(prev => ({ 
                            ...prev, 
                            diplomas: prev.diplomas.filter(d => d !== diploma)
                          }))
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={diploma} className="text-sm">{diploma}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optionele notities..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checklist Nieuw Personeel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Checklist Nieuw Personeel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Let op:</strong> Als de checklist niet volledig is ingevuld, blijft deze persoon zichtbaar in "Nieuw Personeel" → "Nog af te ronden" tot alles is afgerond.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="in_dienst_vanaf">In dienst vanaf *</Label>
              <Input
                id="in_dienst_vanaf"
                type="date"
                value={formData.in_dienst_vanaf}
                onChange={(e) => setFormData(prev => ({ ...prev, in_dienst_vanaf: e.target.value }))}
                required
              />
              <p className="text-xs text-gray-500">Vanaf welke datum is deze persoon officieel in dienst?</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Administratieve Checklist</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="arbeidsovereenkomst"
                    checked={formData.arbeidsovereenkomst}
                    onChange={(e) => setFormData(prev => ({ ...prev, arbeidsovereenkomst: e.target.checked }))}
                    className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="arbeidsovereenkomst" className="text-sm text-gray-700">
                    ✅ Arbeidsovereenkomst ondertekend
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="ingeschreven_luxembourg"
                    checked={formData.ingeschreven_luxembourg}
                    onChange={(e) => setFormData(prev => ({ ...prev, ingeschreven_luxembourg: e.target.checked }))}
                    className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="ingeschreven_luxembourg" className="text-sm text-gray-700">
                    ✅ Ingeschreven in Luxembourg
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="verzekerd"
                    checked={formData.verzekerd}
                    onChange={(e) => setFormData(prev => ({ ...prev, verzekerd: e.target.checked }))}
                    className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="verzekerd" className="text-sm text-gray-700">
                    ✅ Verzekerd
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Informatie */}
        <Card>
          <CardHeader>
            <CardTitle>{t('studentInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isStudent"
                checked={formData.isStudent}
                onChange={(e) => setFormData(prev => ({ ...prev, isStudent: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isStudent">{t('isStudent')}</Label>
            </div>

            {formData.isStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="educationType">{t('educationType')} *</Label>
                    <Select value={formData.educationType} onValueChange={(value: "BBL" | "BOL") => setFormData(prev => ({ ...prev, educationType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer opleidingstype" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='BBL'>{t('bblDescription')}</SelectItem>
                        <SelectItem value='BOL'>{t('bolDescription')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.educationType === "BOL" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="educationStartDate">{t('educationStartDateRequiredBOL')}</Label>
                        <Input
                          id="educationStartDate"
                          type="date"
                          value={formData.educationStartDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, educationStartDate: e.target.value }))}
                          required={formData.educationType === "BOL"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="educationEndDate">{t('educationEndDateRequiredBOL')}</Label>
                        <Input
                          id="educationEndDate"
                          type="date"
                          value={formData.educationEndDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, educationEndDate: e.target.value }))}
                          required={formData.educationType === "BOL"}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={handleReset}>
            <X className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('save')}...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span>{t('memberAdded')}</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
