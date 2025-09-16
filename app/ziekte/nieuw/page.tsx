"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserX, ArrowLeft, Search } from "lucide-react"
import { useState } from "react"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { BackButton } from "@/components/ui/back-button"

export default function NieuwZiektePage() {
  const { crew, sickLeave, updateCrew, addSickLeave } = useSupabaseData()
  const router = useRouter()
  const [formData, setFormData] = useState({
    crewMemberId: "",
    crewMemberName: "",
    startDate: "",
    sickLocation: "thuis",
    salaryPercentage: "100",
    hasCertificate: false,
    certificateValidUntil: "",
    paidBy: "Bamalite S.A.",
    notes: ""
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Haal alle crew members op
  const crewMembers = crew.filter((member: any) => 
    member.status !== "uit-dienst" // Filter alleen uit-dienst uit
  )

  // Filter crew members op basis van zoekopdracht
  const filteredCrewMembers = crewMembers.filter((member: any) => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase()
    const searchLower = searchQuery.toLowerCase()
    return fullName.includes(searchLower) || member.position.toLowerCase().includes(searchLower)
  })

  const handleCrewMemberSelect = (member: any) => {
    setFormData({
      ...formData,
      crewMemberId: member.id,
      crewMemberName: `${member.first_name} ${member.last_name}`
    })
    setSearchQuery(`${member.first_name} ${member.last_name}`)
    setShowSearchResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.crewMemberId || !formData.startDate) {
      alert("Vul alle verplichte velden in")
      return
    }

    // PREVENTIEVE FIX: Controleer of er al een actieve ziekmelding is voor deze crew member
    const existingSickLeaves = sickLeave.filter((sick: any) => 
      sick.crew_member_id === formData.crewMemberId && 
      (sick.status === "actief" || sick.status === "wacht-op-briefje")
    );

    if (existingSickLeaves.length > 0) {
      const crewMember = crew.find((c: any) => c.id === formData.crewMemberId);
      const crewName = crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : formData.crewMemberId;
      
      alert(`⚠️ ${crewName} heeft al een actieve ziekmelding!\n\nStartdatum: ${existingSickLeaves[0].start_date}\nStatus: ${existingSickLeaves[0].status}\n\nGa eerst naar het ziekte overzicht om de bestaande ziekmelding te beheren.`);
      return;
    }

    try {
      // Maak nieuwe ziekmelding
      const newSickLeave = {
        id: `sick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        crew_member_id: formData.crewMemberId,
        start_date: formData.startDate,
        salary_percentage: parseInt(formData.salaryPercentage),
        certificate_valid_until: formData.certificateValidUntil || undefined,
        paid_by: formData.paidBy,
        notes: formData.notes,
        status: (formData.hasCertificate && formData.certificateValidUntil) ? "actief" as const : "wacht-op-briefje" as const
      }

      // Voeg ziekmelding toe via Supabase
      await addSickLeave(newSickLeave)

      // Update crew member status naar ziek
      const currentCrewMember = crew.find((c: any) => c.id === formData.crewMemberId)
      if (currentCrewMember) {
        await updateCrew(formData.crewMemberId, {
          ...currentCrewMember,
          status: "ziek"
        })
      }

      alert("Ziekmelding succesvol geregistreerd!")
      router.push("/ziekte")
    } catch (error) {
      console.error("Error creating sick leave:", error)
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
      alert("Fout bij het registreren van de ziekmelding: " + errorMessage)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BackButton href="/ziekte" />
          <div>
            <h1 className="text-2xl font-bold">Nieuwe ziekmelding</h1>
            <p className="text-sm text-gray-600">Registreer een nieuwe ziekmelding</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserX className="w-5 h-5 text-red-600" />
            <span>Ziekmelding registreren</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Crew Member Zoeken */}
            <div className="space-y-2">
              <Label htmlFor="crewMember">Bemanningslid *</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowSearchResults(true)
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    placeholder="Zoek op naam of functie..."
                    className="pl-10"
                  />
                </div>
                
                {showSearchResults && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {(searchQuery ? filteredCrewMembers : crewMembers).length > 0 ? (
                      (searchQuery ? filteredCrewMembers : crewMembers).map((member: any) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleCrewMemberSelect(member)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{member.first_name} {member.last_name}</div>
                          <div className="text-sm text-gray-500">{member.position}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">Geen resultaten gevonden</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Start Datum */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start datum *</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>

            {/* Locatie */}
            <div className="space-y-2">
              <Label htmlFor="sickLocation">Locatie</Label>
              <Select 
                value={formData.sickLocation} 
                onValueChange={(value) => setFormData({...formData, sickLocation: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thuis">Thuis</SelectItem>
                  <SelectItem value="aan-boord">Aan boord</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Salaris Percentage */}
            <div className="space-y-2">
              <Label htmlFor="salaryPercentage">Salaris percentage</Label>
              <Select 
                value={formData.salaryPercentage} 
                onValueChange={(value) => setFormData({...formData, salaryPercentage: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100%</SelectItem>
                  <SelectItem value="80">80%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Betaald door */}
            <div className="space-y-2">
              <Label htmlFor="paidBy">Betaald door</Label>
              <Select 
                value={formData.paidBy} 
                onValueChange={(value) => setFormData({...formData, paidBy: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bamalite S.A.">Bamalite S.A.</SelectItem>
                  <SelectItem value="Alcina S.A.">Alcina S.A.</SelectItem>
                  <SelectItem value="Devel Shipping S.A.">Devel Shipping S.A.</SelectItem>
                  <SelectItem value="Europe Shipping AG.">Europe Shipping AG.</SelectItem>
                  <SelectItem value="Brugo Shipping SARL.">Brugo Shipping SARL.</SelectItem>
                  <SelectItem value="CNS">CNS</SelectItem>
                  <SelectItem value="CCCS">CCCS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ziektebriefje */}
            <div className="space-y-2">
              <Label htmlFor="hasCertificate">Ziektebriefje aangeleverd</Label>
              <Select 
                value={formData.hasCertificate ? "ja" : "nee"} 
                onValueChange={(value) => setFormData({...formData, hasCertificate: value === "ja"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">Ja</SelectItem>
                  <SelectItem value="nee">Nee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Geldig tot datum */}
            {formData.hasCertificate && (
              <div className="space-y-2">
                <Label htmlFor="certificateValidUntil">Geldig tot</Label>
                <Input
                  type="date"
                  value={formData.certificateValidUntil}
                  onChange={(e) => setFormData({...formData, certificateValidUntil: e.target.value})}
                />
              </div>
            )}

            {/* Notities */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Optionele notities over de ziekmelding..."
                rows={3}
              />
            </div>

            {/* Submit knoppen */}
            <div className="flex justify-end space-x-3 pt-4">
              <Link href="/ziekte">
                <Button variant="outline" type="button">
                  Annuleren
                </Button>
              </Link>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <UserX className="w-4 h-4 mr-2" />
                Ziekmelding registreren
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 