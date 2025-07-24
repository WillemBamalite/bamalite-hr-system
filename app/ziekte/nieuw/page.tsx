"use client"

import { crewDatabase, sickLeaveDatabase, shipDatabase } from "@/data/crew-database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserX, ArrowLeft, Search } from "lucide-react"
import { useState } from "react"
import { useCrew } from "@/components/crew/CrewProvider"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NieuwZiektePage() {
  const { crew, setCrew } = useCrew()
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
  const crewMembers = Object.values(crewDatabase).filter((member: any) => 
    member.id !== "ziek" // Filter alleen de "ziek" placeholder uit
  )

  // Filter crew members op basis van zoekopdracht
  const filteredCrewMembers = crewMembers.filter((member: any) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    const searchLower = searchQuery.toLowerCase()
    return fullName.includes(searchLower) || member.position.toLowerCase().includes(searchLower)
  })

  const handleCrewMemberSelect = (member: any) => {
    setFormData({
      ...formData,
      crewMemberId: member.id,
      crewMemberName: `${member.firstName} ${member.lastName}`
    })
    setSearchQuery(`${member.firstName} ${member.lastName}`)
    setShowSearchResults(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.crewMemberId || !formData.startDate) {
      alert("Vul alle verplichte velden in")
      return
    }

    // Maak nieuwe ziekmelding
    const newSickLeave = {
      id: `sick-${Date.now()}`,
      crewMemberId: formData.crewMemberId,
      startDate: formData.startDate,
      sickLocation: formData.sickLocation,
      salaryPercentage: parseInt(formData.salaryPercentage),
      hasCertificate: formData.hasCertificate,
      certificateValidUntil: formData.certificateValidUntil || null,
      paidBy: formData.paidBy,
      notes: formData.notes,
      status: formData.hasCertificate ? "actief" : "wacht-op-briefje"
    }

    // Voeg toe aan database
    ;(sickLeaveDatabase as any)[newSickLeave.id] = newSickLeave

    // Update crew member status
    const crewMember = (crewDatabase as any)[formData.crewMemberId]
    if (crewMember) {
      ;(crewDatabase as any)[formData.crewMemberId].status = "ziek"
    }

    // Force re-render
    setCrew({ ...crew })

    // Redirect naar ziekte overzicht
    router.push("/ziekte")
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Link href="/ziekte" className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
                          <div className="font-medium">{member.firstName} {member.lastName}</div>
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