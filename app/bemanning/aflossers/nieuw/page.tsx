"use client";
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCrewData } from "@/hooks/use-crew-data"

// Diploma opties
const diplomaOptions = [
  "Vaarbewijs",
  "Rijnpatent tot Wesel",
  "Rijnpatent tot Koblenz", 
  "Rijnpatent tot Iffezheim",
  "Rijnpatent tot Mannheim",
  "Elbepatent",
  "Donaupatent",
  "ADN",
  "ADN C",
  "Radar",
  "Marifoon"
]

// Roken opties
const smokingOptions = [
  "Ja",
  "Nee"
]

// Nationaliteit opties
const nationalityOptions = [
  "NL",
  "DE", 
  "BE",
  "CZ",
  "PL",
  "RO",
  "BG",
  "HR",
  "SI",
  "SK",
  "HU",
  "AT",
  "CH",
  "FR",
  "ES",
  "IT",
  "GB",
  "IE",
  "DK",
  "SE",
  "NO",
  "FI"
]

// Functie opties voor aflossers (verwijderd - aflossers zijn gewoon aflossers)

export default function NieuwAflosser() {
  const { addItem, forceRefresh } = useCrewData();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nationality: "",
    smoking: "",
    phone: "",
    email: "",
    birthDate: "",
    address: {
      street: "",
      city: "",
      postalCode: "",
      country: ""
    },
    selectedDiplomas: [] as string[],
    notes: ""
  })
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const field = name.split('.')[1]
      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  function handleSelectChange(name: string, value: string) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleDiplomaChange(diploma: string) {
    setForm(prev => ({
      ...prev,
      selectedDiplomas: prev.selectedDiplomas.includes(diploma)
        ? prev.selectedDiplomas.filter(d => d !== diploma)
        : [...prev.selectedDiplomas, diploma]
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validatie
    if (!form.firstName || !form.lastName || !form.phone || form.selectedDiplomas.length === 0) {
      alert("Vul alle verplichte velden in: naam, telefoon en minimaal 1 diploma")
      return
    }

    // Genereer unieke ID
    const id = `${form.firstName.toLowerCase()}-${form.lastName.toLowerCase()}`
    
    // Nieuwe aflosser object - exact dezelfde structuur als bestaande aflossers
    const newAflosser = {
      id: id,
      firstName: form.firstName,
      lastName: form.lastName,
      nationality: form.nationality || "NL",
      position: "Aflosser", // Altijd "Aflosser" voor nieuwe aflossers
      function: "Aflosser", // Aflossers zijn gewoon aflossers
      shipId: null, // null in plaats van ""
      regime: "2/2",
      phone: form.phone,
      email: form.email || "",
      status: "thuis" as const,
      onBoardSince: null,
      birthDate: form.birthDate || "",
      address: form.address,
      assignmentHistory: [],
      aflosserAssignments: [], // Toegevoegd: lege array voor aflosser toewijzingen
      vasteDienst: false, // Toegevoegd: zoals bestaande aflossers
      inDienstVanaf: null, // Toegevoegd: zoals bestaande aflossers
      smoking: form.smoking,
      notes: form.notes,
      isAflosser: true,
      diplomas: form.selectedDiplomas // Toegevoegd: diploma's van het formulier
    }

    // Direct localStorage updaten
    if (typeof window !== 'undefined') {
      const currentData = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
      currentData[id] = newAflosser
      localStorage.setItem('crewDatabase', JSON.stringify(currentData))
      
      // Trigger events
      window.dispatchEvent(new Event('localStorageUpdate'))
      window.dispatchEvent(new Event('forceRefresh'))
    }

    // Voeg ook diploma's toe aan document database
    form.selectedDiplomas.forEach((diploma, index) => {
      const docId = `${id}-${diploma.toLowerCase().replace(/\s+/g, '-')}`
      const newDoc = {
        id: docId,
        crewMemberId: id,
        type: "diploma",
        name: diploma,
        fileName: `${diploma.toLowerCase().replace(/\s+/g, '_')}_${id}.pdf`,
        uploadDate: new Date().toISOString().split('T')[0],
        expiryDate: null, // Kan later worden ingevuld
        isValid: true,
      }
      
      // Direct document database updaten
      if (typeof window !== 'undefined') {
        const currentDocData = JSON.parse(localStorage.getItem('documentDatabase') || '{}')
        currentDocData[docId] = newDoc
        localStorage.setItem('documentDatabase', JSON.stringify(currentDocData))
      }
    })
    
    // Toon success message
    alert("✅ Aflosser succesvol toegevoegd!")
    
    // Navigeer terug naar aflossers pagina
    router.push("/bemanning/aflossers")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <MobileHeaderNav />
      <h1 className="text-2xl font-bold mb-6 text-blue-800">Nieuwe aflosser toevoegen</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Persoonlijke gegevens */}
        <Card>
          <CardHeader>
            <CardTitle>Persoonlijke gegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Voornaam *</Label>
                <Input 
                  name="firstName" 
                  value={form.firstName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="lastName">Achternaam *</Label>
                <Input 
                  name="lastName" 
                  value={form.lastName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality">Nationaliteit</Label>
                <Select value={form.nationality} onValueChange={(value) => handleSelectChange("nationality", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer nationaliteit" />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalityOptions.map(nat => (
                      <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="smoking">Roken</Label>
                <Select value={form.smoking} onValueChange={(value) => handleSelectChange("smoking", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer roken" />
                  </SelectTrigger>
                  <SelectContent>
                    {smokingOptions.map(smoking => (
                      <SelectItem key={smoking} value={smoking}>{smoking}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefoon *</Label>
                <Input 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  name="email" 
                  type="email"
                  value={form.email} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="birthDate">Geboortedatum</Label>
              <Input 
                name="birthDate" 
                type="date"
                value={form.birthDate} 
                onChange={handleChange} 
              />
            </div>
            

          </CardContent>
        </Card>

        {/* Adres */}
        <Card>
          <CardHeader>
            <CardTitle>Adres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address.street">Straat</Label>
              <Input 
                name="address.street" 
                value={form.address.street} 
                onChange={handleChange} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="address.city">Plaats</Label>
                <Input 
                  name="address.city" 
                  value={form.address.city} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label htmlFor="address.postalCode">Postcode</Label>
                <Input 
                  name="address.postalCode" 
                  value={form.address.postalCode} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label htmlFor="address.country">Land</Label>
                <Input 
                  name="address.country" 
                  value={form.address.country} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diploma's */}
        <Card>
          <CardHeader>
            <CardTitle>Diploma's en certificaten *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {diplomaOptions.map(diploma => (
                <div key={diploma} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={diploma}
                    checked={form.selectedDiplomas.includes(diploma)}
                    onChange={() => handleDiplomaChange(diploma)}
                    className="rounded"
                  />
                  <Label htmlFor={diploma} className="text-sm cursor-pointer">
                    {diploma}
                  </Label>
                </div>
              ))}
            </div>
            {form.selectedDiplomas.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Selecteer minimaal 1 diploma</p>
            )}
          </CardContent>
        </Card>

        {/* Opmerkingen */}
        <Card>
          <CardHeader>
            <CardTitle>Opmerkingen</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border rounded px-3 py-2 min-h-[100px]"
              placeholder="Extra informatie over de aflosser..."
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            Aflosser toevoegen
          </Button>
          <Link href="/bemanning/aflossers">
            <Button variant="outline">
              Annuleren
            </Button>
          </Link>
        </div>

        {success && (
          <div className="text-green-700 text-sm p-4 bg-green-50 rounded border">
            Aflosser succesvol toegevoegd! (mock)
          </div>
        )}
      </form>

      {/* Mobiele actieknoppen */}
      <div className="block md:hidden mt-8 space-y-4">
        <div className="text-lg font-semibold text-gray-800 mb-3">Nieuwe aflosser acties</div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/bemanning/aflossers" className="bg-green-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-green-700 shadow">
            🔄 Aflossers
          </Link>
          <Link href="/bemanning/overzicht" className="bg-blue-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-blue-700 shadow">
            👥 Bemanning
          </Link>
          <Link href="/documenten" className="bg-orange-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-orange-700 shadow">
            📄 Documenten
          </Link>
        </div>
      </div>
    </div>
  )
} 