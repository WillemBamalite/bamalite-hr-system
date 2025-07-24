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
import { shipDatabase } from "@/data/crew-database"

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
  "Alcina S.A.",
  "Devel Shipping S.A.",
  "Europe Shipping AG.",
  "Brugo Shipping SARL"
]

interface NewCrewFormData {
  firstName: string
  lastName: string
  nationality: string
  position: string
  shipId: string
  regime: "1/1" | "2/2" | "3/3"
  phone: string
  email: string
  birthDate: Date | undefined
  entryDate: Date | undefined
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
  // Student velden
  isStudent: boolean
  educationType?: "BBL" | "BOL"
  schoolPeriods: Array<{
    fromDate: string
    toDate: string
    reason: string
  }>
  educationEndDate?: string // Voor BOL
}

export function NewCrewForm() {
  const [formData, setFormData] = useState<NewCrewFormData>({
    firstName: "",
    lastName: "",
    nationality: "NL",
    position: "Kapitein",
    shipId: "",
    regime: "2/2",
    phone: "",
    email: "",
    birthDate: undefined,
    entryDate: new Date(),
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
      country: "",
    },
    notes: "",
    // Student velden
    isStudent: false,
    educationType: undefined,
    schoolPeriods: [],
    educationEndDate: undefined,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const nationalities = [
    { code: "NL", name: "Nederland", flag: "🇳🇱" },
    { code: "CZ", name: "Tsjechië", flag: "🇨🇿" },
    { code: "SLK", name: "Slowakije", flag: "🇸🇰" },
    { code: "PO", name: "Polen", flag: "🇵🇱" },
    { code: "SERV", name: "Servië", flag: "🇷🇸" },
    { code: "HUN", name: "Hongarije", flag: "🇭🇺" },
    { code: "BE", name: "België", flag: "🇧🇪" },
    { code: "FR", name: "Frankrijk", flag: "🇫🇷" },
    { code: "DE", name: "Duitsland", flag: "🇩🇪" },
    { code: "LUX", name: "Luxemburg", flag: "🇱🇺" },
    { code: "EG", name: "Egypte", flag: "🇪🇬" },
  ]

  const positions = ["Kapitein", "Stuurman", "Machinist", "Matroos", "Deksman", "Lichtmatroos", "Kok", "Scheepsjongen"]

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Alleen de verplichte velden volgens jouw specificatie
    if (!formData.firstName.trim()) newErrors.firstName = "Voornaam is verplicht"
    if (!formData.lastName.trim()) newErrors.lastName = "Achternaam is verplicht"
    if (!formData.nationality) newErrors.nationality = "Nationaliteit is verplicht"
    if (!formData.phone.trim()) newErrors.phone = "Telefoonnummer is verplicht"

    // Email validatie (alleen als email is ingevuld)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Ongeldig e-mailadres"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Genereer nieuwe ID
      const newId = `crew-${Date.now()}`

      // Maak nieuwe bemanningslid object
      const newCrewMember: any = {
        id: newId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationality: formData.nationality,
        position: formData.position,
        shipId: formData.shipId || "",
        regime: formData.regime,
        phone: formData.phone,
        email: formData.email,
        birthDate: formData.birthDate?.toISOString().split('T')[0],
        entryDate: formData.entryDate?.toISOString().split('T')[0],
        birthPlace: formData.birthPlace,
        smoking: formData.smoking,
        experience: formData.experience,
        diplomas: formData.diplomas,
        company: formData.company,
        matricule: formData.matricule,
        address: formData.address,
        notes: formData.notes,
        status: formData.shipId ? "aan-boord" : "nog-in-te-delen",
        onBoardSince: formData.shipId ? new Date().toISOString().split('T')[0] : null,
        documents: {
          vaarbewijs: { valid: false, expiryDate: null },
          medisch: { valid: false, expiryDate: null },
          certificaat: { valid: false, expiryDate: null },
        },
        // Student velden
        isStudent: formData.isStudent,
        educationType: formData.educationType,
        schoolPeriods: formData.schoolPeriods,
        educationEndDate: formData.educationEndDate,
      }

      // Voeg toe aan de database
      const { crewDatabase } = await import("@/data/crew-database");
      (crewDatabase as any)[newId] = newCrewMember;

      // Simuleer API call
      await new Promise<void>((resolve) => setTimeout(resolve, 1000))

      alert(`${formData.firstName} ${formData.lastName} is succesvol toegevoegd!`)

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        nationality: "NL",
        position: "Kapitein",
        shipId: "",
        regime: "2/2",
        phone: "",
        email: "",
        birthDate: undefined,
        entryDate: new Date(),
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
          country: "",
        },
        notes: "",
        // Student velden
        isStudent: false,
        educationType: undefined,
        schoolPeriods: [],
        educationEndDate: undefined,
      })
    } catch (error) {
      console.error("Error adding crew member:", error)
      console.error("Error details:", error instanceof Error ? error.message : error)
      alert(`Er is een fout opgetreden bij het toevoegen van het bemanningslid: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
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
      shipId: "",
      regime: "2/2",
      phone: "",
      email: "",
      birthDate: undefined,
      entryDate: new Date(),
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
        country: "",
      },
      notes: "",
      // Student velden
      isStudent: false,
      educationType: undefined,
      schoolPeriods: [],
      educationEndDate: undefined,
    })
    setErrors({})
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="w-5 h-5" />
          <span>Nieuw Bemanningslid Toevoegen</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Persoonlijke gegevens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Voornaam *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <Label htmlFor="lastName">Achternaam *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Nationaliteit en functie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nationality">Nationaliteit *</Label>
              <Select
                value={formData.nationality}
                onValueChange={(value) => setFormData({ ...formData, nationality: value })}
              >
                <SelectTrigger className={errors.nationality ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecteer nationaliteit" />
                </SelectTrigger>
                <SelectContent>
                  {nationalities.map((nat) => (
                    <SelectItem key={nat.code} value={nat.code}>
                      <div className="flex items-center space-x-2">
                        <span>{nat.flag}</span>
                        <span>{nat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.nationality && <p className="text-sm text-red-500 mt-1">{errors.nationality}</p>}
            </div>

            <div>
              <Label htmlFor="position">Functie *</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger className={errors.position ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecteer functie" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.position && <p className="text-sm text-red-500 mt-1">{errors.position}</p>}
            </div>
          </div>

          {/* Schip en regime */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipId">Schip *</Label>
              <Select 
                value={formData.shipId} 
                onValueChange={(value) => setFormData({ ...formData, shipId: value })}
              >
                <SelectTrigger className={errors.shipId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecteer schip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nog-in-te-delen">Nog in te delen</SelectItem>
                  {Object.values(shipDatabase)
                    .filter((ship: any) => ship.status === "Operationeel")
                    .map((ship: any) => (
                      <SelectItem key={ship.id} value={ship.id}>
                        {ship.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.shipId && <p className="text-sm text-red-500 mt-1">{errors.shipId}</p>}
            </div>

            <div>
              <Label htmlFor="regime">Regime *</Label>
              <Select
                value={formData.regime}
                onValueChange={(value: "1/1" | "2/2" | "3/3") => setFormData({ ...formData, regime: value })}
              >
                <SelectTrigger className={errors.regime ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecteer regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1/1">1/1 (1 week aan boord, 1 week thuis)</SelectItem>
                  <SelectItem value="2/2">2/2 (2 weken aan boord, 2 weken thuis)</SelectItem>
                  <SelectItem value="3/3">3/3 (3 weken aan boord, 3 weken thuis)</SelectItem>
                </SelectContent>
              </Select>
              {errors.regime && <p className="text-sm text-red-500 mt-1">{errors.regime}</p>}
            </div>
          </div>

          {/* Contact gegevens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefoonnummer *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+31 6 12345678"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="naam@bamalite.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Datums */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Geboortedatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${errors.birthDate ? "border-red-500" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthDate ? (
                      format(formData.birthDate, "PPP", { locale: nl })
                    ) : (
                      <span>Selecteer datum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.birthDate}
                    onSelect={(date) => setFormData({ ...formData, birthDate: date })}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.birthDate && <p className="text-sm text-red-500 mt-1">{errors.birthDate}</p>}
            </div>

            <div>
              <Label>Intrededatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${errors.entryDate ? "border-red-500" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.entryDate ? (
                      format(formData.entryDate, "PPP", { locale: nl })
                    ) : (
                      <span>Selecteer datum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.entryDate}
                    onSelect={(date) => setFormData({ ...formData, entryDate: date })}
                    disabled={(date) => date > new Date("2030-01-01") || date < new Date("2020-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.entryDate && <p className="text-sm text-red-500 mt-1">{errors.entryDate}</p>}
            </div>
          </div>

          {/* Geboorteplaats */}
          <div>
            <Label htmlFor="birthPlace">Geboorteplaats *</Label>
            <Input
              id="birthPlace"
              value={formData.birthPlace}
              onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
              className={errors.birthPlace ? "border-red-500" : ""}
            />
            {errors.birthPlace && <p className="text-sm text-red-500 mt-1">{errors.birthPlace}</p>}
          </div>

          {/* Ervaring */}
          <div>
            <Label htmlFor="experience">Ervaring *</Label>
            <Input
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              className={errors.experience ? "border-red-500" : ""}
            />
            {errors.experience && <p className="text-sm text-red-500 mt-1">{errors.experience}</p>}
          </div>

          {/* Adres */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Adresgegevens *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Straat en huisnummer *</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  placeholder="Hoofdstraat 123"
                  className={errors.street ? "border-red-500" : ""}
                />
                {errors.street && <p className="text-sm text-red-500 mt-1">{errors.street}</p>}
              </div>

              <div>
                <Label htmlFor="city">Plaats *</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  placeholder="Amsterdam"
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
              </div>

              <div>
                <Label htmlFor="postalCode">Postcode *</Label>
                <Input
                  id="postalCode"
                  value={formData.address.postalCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, postalCode: e.target.value },
                    })
                  }
                  placeholder="1012 AB"
                  className={errors.postalCode ? "border-red-500" : ""}
                />
                {errors.postalCode && <p className="text-sm text-red-500 mt-1">{errors.postalCode}</p>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="country">Land *</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value },
                    })
                  }
                  placeholder="Nederland"
                  className={errors.country ? "border-red-500" : ""}
                />
                {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country}</p>}
              </div>
            </div>
          </div>

          {/* Optionele velden */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Optionele gegevens</h3>
            
            {/* Roken */}
            <div>
              <Label>Roken</Label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="smoking"
                    checked={formData.smoking === true}
                    onChange={() => setFormData({ ...formData, smoking: true })}
                  />
                  Ja
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="smoking"
                    checked={formData.smoking === false}
                    onChange={() => setFormData({ ...formData, smoking: false })}
                  />
                  Nee
                </label>
              </div>
            </div>

            {/* Diploma's */}
            <div>
              <Label>Diploma's</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {diplomaOptions.map((diploma) => (
                  <label key={diploma} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={formData.diplomas.includes(diploma)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, diplomas: [...formData.diplomas, diploma] })
                        } else {
                          setFormData({ ...formData, diplomas: formData.diplomas.filter((d) => d !== diploma) })
                        }
                      }}
                    />
                    {diploma}
                  </label>
                ))}
              </div>
            </div>

            {/* Student opleiding */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="isStudent"
                  checked={formData.isStudent}
                  onChange={(e) => setFormData({ ...formData, isStudent: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isStudent" className="font-medium">Volgt bemanningslid een opleiding?</Label>
              </div>

              {formData.isStudent && (
                <div className="space-y-4 pl-6">
                  <div>
                    <Label htmlFor="educationType">Type opleiding</Label>
                    <Select
                      value={formData.educationType || ""}
                      onValueChange={(value) => setFormData({ ...formData, educationType: value as "BBL" | "BOL" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer type opleiding" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BBL">BBL (Beroepsbegeleidende Leerweg)</SelectItem>
                        <SelectItem value="BOL">BOL (Beroepsopleidende Leerweg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.educationType === "BBL" && (
                    <div>
                      <Label>Schoolperiodes</Label>
                      <div className="space-y-2">
                        {formData.schoolPeriods.map((period, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            <Input
                              type="date"
                              value={period.fromDate}
                              onChange={(e) => {
                                const newPeriods = [...formData.schoolPeriods]
                                newPeriods[index].fromDate = e.target.value
                                setFormData({ ...formData, schoolPeriods: newPeriods })
                              }}
                              placeholder="Van datum"
                            />
                            <Input
                              type="date"
                              value={period.toDate}
                              onChange={(e) => {
                                const newPeriods = [...formData.schoolPeriods]
                                newPeriods[index].toDate = e.target.value
                                setFormData({ ...formData, schoolPeriods: newPeriods })
                              }}
                              placeholder="Tot datum"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newPeriods = formData.schoolPeriods.filter((_, i) => i !== index)
                                setFormData({ ...formData, schoolPeriods: newPeriods })
                              }}
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
                            setFormData({
                              ...formData,
                              schoolPeriods: [...formData.schoolPeriods, { fromDate: "", toDate: "", reason: "School" }]
                            })
                          }}
                        >
                          Schoolperiode toevoegen
                        </Button>
                      </div>
                    </div>
                  )}

                  {formData.educationType === "BOL" && (
                    <div>
                      <Label htmlFor="educationEndDate">Opleidingsperiode tot</Label>
                      <Input
                        id="educationEndDate"
                        type="date"
                        value={formData.educationEndDate || ""}
                        onChange={(e) => setFormData({ ...formData, educationEndDate: e.target.value })}
                        placeholder="Tot wanneer duurt de opleiding?"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Firma */}
            <div>
              <Label htmlFor="company">Firma</Label>
              <Select
                value={formData.company}
                onValueChange={(value) => setFormData({ ...formData, company: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer firma" />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Matricule nummer */}
            <div>
              <Label htmlFor="matricule">Matricule nummer</Label>
              <Input
                id="matricule"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                placeholder="123456789"
              />
            </div>

            {/* Notities */}
            <div>
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Aanvullende informatie..."
                rows={3}
              />
            </div>
          </div>

          {/* Preview */}
          {(formData.firstName || formData.lastName) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Preview:</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {formData.firstName} {formData.lastName}
                </Badge>
                {formData.nationality && (
                  <Badge variant="outline">
                    {nationalities.find((n) => n.code === formData.nationality)?.flag} {formData.nationality}
                  </Badge>
                )}
                {formData.position && <Badge variant="outline">{formData.position}</Badge>}
                <Badge variant="outline">{formData.regime}</Badge>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleReset}>
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Bezig met opslaan..." : "Bemanningslid Toevoegen"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
