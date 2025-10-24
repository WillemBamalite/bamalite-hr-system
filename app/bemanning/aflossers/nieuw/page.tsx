"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { UserPlus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { useRouter } from "next/navigation"

export default function NieuwAflosserPage() {
  const { addCrew, addVasteDienstRecord } = useSupabaseData()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nationality: "NL",
    phone: "",
    email: "",
    birthDate: "",
    birthPlace: "",
    address: "",
    notes: "",
    selectedDiplomas: [] as string[],
    inVasteDienst: false,
    vasteDienstStartDate: "",
    vasteDienstStartMonth: new Date().getMonth() + 1,
    vasteDienstStartYear: new Date().getFullYear(),
    vasteDienstInitialBalance: 0,
    isUitzendbureau: false,
    uitzendbureauNaam: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validatie
      if (formData.selectedDiplomas.length === 0) {
        alert("Selecteer minimaal 1 diploma")
        return
      }

      // Genereer een unieke ID
      const id = `aflosser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Maak nieuwe aflosser - alleen kolommen die in de crew tabel bestaan
      const newAflosser: any = {
        id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        nationality: formData.nationality,
        position: "Aflosser",
        ship_id: "", // geen vast schip
        regime: "Altijd", // geen rotatie-regime voor aflossers
        phone: formData.phone || null,
        email: formData.email || null,
        status: "thuis",
        on_board_since: null,
        thuis_sinds: new Date().toISOString().split('T')[0],
        birth_date: formData.birthDate || null,
        address: formData.address ? { raw: formData.address } : {},
        diplomas: formData.selectedDiplomas,
        notes: formData.notes ? [formData.notes] : [],
        vaste_dienst: formData.inVasteDienst, // Voeg vaste_dienst veld toe
        is_uitzendbureau: formData.isUitzendbureau,
        uitzendbureau_naam: formData.isUitzendbureau ? formData.uitzendbureauNaam : null
      }

      await addCrew(newAflosser)

      // Voeg vaste dienst record toe aan Supabase als vaste dienst is geselecteerd
      if (formData.inVasteDienst) {
        await addVasteDienstRecord({
          aflosser_id: id,
          year: formData.vasteDienstStartYear,
          month: formData.vasteDienstStartMonth,
          required_days: 15,
          actual_days: 0, // Start met 0 werkdagen
          balance_days: formData.vasteDienstInitialBalance, // Start met opgegeven saldo
          notes: `Aflosser toegevoegd met startsaldo van ${formData.vasteDienstInitialBalance} dagen`
        })
      }
      
      alert("Aflosser succesvol toegevoegd!")
      router.push("/bemanning/aflossers")
      
    } catch (error: any) {
      console.error("Error adding aflosser:", error)
      
      // Meer specifieke foutmeldingen
      let errorMessage = "Er is een fout opgetreden bij het toevoegen van de aflosser."
      
      if (error.message) {
        if (error.message.includes("duplicate key")) {
          errorMessage = "Er bestaat al een aflosser met deze gegevens. Controleer de naam en contactgegevens."
        } else if (error.message.includes("foreign key")) {
          errorMessage = "Database fout: probeer het opnieuw of neem contact op met de beheerder."
        } else if (error.message.includes("validation")) {
          errorMessage = "Controleer of alle verplichte velden correct zijn ingevuld."
        } else {
          errorMessage = `Fout: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/bemanning/aflossers" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nieuwe Aflosser</h1>
              <p className="text-sm text-gray-600">Voeg een nieuwe aflosser toe aan het systeem</p>
            </div>
          </div>
        </div>
      </header>

      <MobileHeaderNav />
      <DashboardButton />

      {/* Main content */}
      <main className="w-full px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span>Aflosser Registreren</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Persoonlijke Informatie */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Persoonlijke Informatie</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Voornaam *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Achternaam *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationaliteit *</Label>
                    <Select 
                      value={formData.nationality} 
                      onValueChange={(value) => setFormData({...formData, nationality: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NL">NL Nederlands</SelectItem>
                        <SelectItem value="CZ">CZ Tsjechisch</SelectItem>
                        <SelectItem value="SLK">SLK Slowaaks</SelectItem>
                        <SelectItem value="EG">EG Egyptisch</SelectItem>
                        <SelectItem value="PO">PO Pools</SelectItem>
                        <SelectItem value="SERV">SERV Servisch</SelectItem>
                        <SelectItem value="HUN">HUN Hongaars</SelectItem>
                        <SelectItem value="BE">BE Belgisch</SelectItem>
                        <SelectItem value="FR">FR Frans</SelectItem>
                        <SelectItem value="DE">DE Duits</SelectItem>
                        <SelectItem value="LUX">LUX Luxemburgs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefoonnummer *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+31 6 12345678"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="naam@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Datums */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Datums</h3>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="birthDate">Geboortedatum</Label>
                     <Input
                       id="birthDate"
                       type="date"
                       value={formData.birthDate}
                       onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                     />
                   </div>
                   <div>
                     <Label htmlFor="birthPlace">Geboorteplaats</Label>
                     <Input
                       id="birthPlace"
                       value={formData.birthPlace}
                       onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                     />
                   </div>
                 </div>
             </div>

             {/* Vaste Dienst */}
             <div>
               <h3 className="text-lg font-semibold mb-4">Vaste Dienst</h3>
               <div className="space-y-4">
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="inVasteDienst"
                     checked={formData.inVasteDienst}
                     onCheckedChange={(checked) => {
                       setFormData({
                         ...formData,
                         inVasteDienst: checked as boolean,
                         vasteDienstStartDate: checked ? formData.vasteDienstStartDate : ""
                       })
                     }}
                   />
                   <Label htmlFor="inVasteDienst" className="text-sm cursor-pointer">
                     In vaste dienst (15 dagen per maand vereist)
                   </Label>
                 </div>
                 {formData.inVasteDienst && (
                   <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                     <h4 className="font-medium text-blue-800">Vaste Dienst Instellingen</h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="vasteDienstStartYear">Start Jaar *</Label>
                         <Input
                           id="vasteDienstStartYear"
                           type="number"
                           value={formData.vasteDienstStartYear}
                           onChange={(e) => setFormData({...formData, vasteDienstStartYear: parseInt(e.target.value) || new Date().getFullYear()})}
                           min="2020"
                           max="2030"
                           required={formData.inVasteDienst}
                         />
                       </div>
                       
                       <div>
                         <Label htmlFor="vasteDienstStartMonth">Start Maand *</Label>
                         <Select
                           value={formData.vasteDienstStartMonth.toString()}
                           onValueChange={(value) => setFormData({...formData, vasteDienstStartMonth: parseInt(value)})}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Selecteer maand" />
                           </SelectTrigger>
                           <SelectContent>
                             {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                               <SelectItem key={month} value={month.toString()}>
                                 {new Date(2024, month - 1).toLocaleString('nl-NL', { month: 'long' })}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                     
                     <div>
                       <Label htmlFor="vasteDienstInitialBalance">
                         Startsaldo dagen
                       </Label>
                       <div className="space-y-2">
                         <div className="flex items-center space-x-2">
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setFormData({...formData, vasteDienstInitialBalance: Math.max(-365, formData.vasteDienstInitialBalance - 1)})}
                             className="w-10 h-10 p-0"
                           >
                             -
                           </Button>
                           <div className="relative flex-1">
                             <Input
                               id="vasteDienstInitialBalance"
                               type="number"
                               step="0.5"
                               value={formData.vasteDienstInitialBalance}
                               onChange={(e) => setFormData({...formData, vasteDienstInitialBalance: parseFloat(e.target.value) || 0})}
                               placeholder="0"
                               min="-365"
                               max="365"
                               className={`text-center ${
                                 formData.vasteDienstInitialBalance > 0 
                                   ? 'border-green-300 bg-green-50 text-green-700' 
                                   : formData.vasteDienstInitialBalance < 0 
                                   ? 'border-red-300 bg-red-50 text-red-700' 
                                   : ''
                               }`}
                             />
                           </div>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setFormData({...formData, vasteDienstInitialBalance: Math.min(365, formData.vasteDienstInitialBalance + 1)})}
                             className="w-10 h-10 p-0"
                           >
                             +
                           </Button>
                         </div>
                         <div className="flex justify-center space-x-4">
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setFormData({...formData, vasteDienstInitialBalance: -5})}
                             className="text-red-600 hover:bg-red-50"
                           >
                             -5 dagen
                           </Button>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setFormData({...formData, vasteDienstInitialBalance: 0})}
                             className="text-gray-600 hover:bg-gray-50"
                           >
                             Reset
                           </Button>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setFormData({...formData, vasteDienstInitialBalance: 5})}
                             className="text-green-600 hover:bg-green-50"
                           >
                             +5 dagen
                           </Button>
                         </div>
                       </div>
                       <div className="mt-2 space-y-1">
                         <p className="text-sm text-gray-600">
                           <span className="font-medium text-green-600">+ (positief):</span> Voorsprong - aflosser heeft al extra dagen gemaakt
                         </p>
                         <p className="text-sm text-gray-600">
                           <span className="font-medium text-red-600">- (negatief):</span> Achterstand - aflosser moet nog dagen inhalen
                         </p>
                         <p className="text-sm text-gray-600">
                           <span className="font-medium text-gray-600">0:</span> Geen voorsprong of achterstand
                         </p>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             </div>

             {/* Uitzendbureau */}
             <div>
               <h3 className="text-lg font-semibold mb-4">Uitzendbureau</h3>
               <div className="space-y-4">
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="isUitzendbureau"
                     checked={formData.isUitzendbureau}
                     onCheckedChange={(checked) => {
                       setFormData({
                         ...formData,
                         isUitzendbureau: checked as boolean,
                         uitzendbureauNaam: checked ? formData.uitzendbureauNaam : ""
                       })
                     }}
                   />
                   <Label htmlFor="isUitzendbureau" className="text-sm cursor-pointer">
                     Komt van uitzendbureau
                   </Label>
                 </div>
                 {formData.isUitzendbureau && (
                   <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                     <h4 className="font-medium text-orange-800">Uitzendbureau Informatie</h4>
                     
                     <div>
                       <Label htmlFor="uitzendbureauNaam">Naam van het uitzendbureau *</Label>
                       <Input
                         id="uitzendbureauNaam"
                         type="text"
                         value={formData.uitzendbureauNaam}
                         onChange={(e) => setFormData({...formData, uitzendbureauNaam: e.target.value})}
                         placeholder="Bijv. Randstad, Tempo-Team, etc."
                         required={formData.isUitzendbureau}
                       />
                     </div>
                   </div>
                 )}
               </div>
             </div>

             {/* Diploma's */}
             <div>
               <h3 className="text-lg font-semibold mb-4">Diploma's en certificaten *</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                 {diplomaOptions.map(diploma => (
                   <div key={diploma} className="flex items-center space-x-2">
                     <Checkbox
                       id={diploma}
                       checked={formData.selectedDiplomas.includes(diploma)}
                       onCheckedChange={(checked) => {
                         if (checked) {
                           setFormData({
                             ...formData,
                             selectedDiplomas: [...formData.selectedDiplomas, diploma]
                           })
                         } else {
                           setFormData({
                             ...formData,
                             selectedDiplomas: formData.selectedDiplomas.filter(d => d !== diploma)
                           })
                         }
                       }}
                     />
                     <Label htmlFor={diploma} className="text-sm cursor-pointer">
                       {diploma}
                     </Label>
                   </div>
                 ))}
               </div>
               {formData.selectedDiplomas.length === 0 && (
                 <p className="text-sm text-red-600 mt-2">Selecteer minimaal 1 diploma</p>
               )}
             </div>

             {/* Adres */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Adres</h3>
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Straat, huisnummer, postcode, plaats"
                    rows={3}
                  />
                </div>
              </div>

              {/* Notities */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Notities</h3>
                <div>
                  <Label htmlFor="notes">Opmerkingen</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Extra informatie over de aflosser..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end space-x-4">
                <Link href="/bemanning/aflossers">
                  <Button type="button" variant="outline">
                    Annuleren
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                  {isSubmitting ? "Toevoegen..." : "Aflosser Toevoegen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 