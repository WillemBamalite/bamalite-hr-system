"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { DashboardButton } from '@/components/ui/dashboard-button'

const COMPANIES = [
  'Bamalite S.A.',
  'Alcina S.A.',
  'Europe Shipping AG.',
  'Brugo Shipping SARL.',
  'Devel Shipping S.A.',
]

export default function FirmaWisselingFormPage() {
  const router = useRouter()
  const { crew, loading, updateCrew } = useSupabaseData()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [oldCompany, setOldCompany] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [wisselingDate, setWisselingDate] = useState('')

  const selectedMember = crew.find((m: any) => m.id === selectedMemberId)
  
  // Update oldCompany wanneer een bemanningslid wordt geselecteerd (als suggestie)
  useEffect(() => {
    if (selectedMember?.company && !oldCompany) {
      setOldCompany(selectedMember.company)
    }
  }, [selectedMember, oldCompany])

  const handleSubmit = async () => {
    if (!selectedMemberId || !oldCompany || !newCompany || !wisselingDate) {
      alert('Vul alle velden in')
      return
    }

    if (oldCompany === newCompany) {
      alert('De nieuwe firma moet anders zijn dan de huidige firma')
      return
    }

    try {
      // Update crew member company
      await updateCrew(selectedMemberId, { company: newCompany })
      
      // Navigate to addendum generation page
      router.push(`/firma-wisseling/addendum?memberId=${selectedMemberId}&oldCompany=${encodeURIComponent(oldCompany)}&newCompany=${encodeURIComponent(newCompany)}&date=${wisselingDate}`)
    } catch (error) {
      alert('Fout bij wisseling van firma')
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <DashboardButton />
      
      <Link href="/firma-wisseling">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Wisseling van Firma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="member">Naam Bemanningslid *</Label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger id="member">
                <SelectValue placeholder="Selecteer bemanningslid" />
              </SelectTrigger>
              <SelectContent>
                {crew
                  .filter((m: any) => !m.is_dummy && m.status !== 'uit-dienst')
                  .map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} - {member.position}
                      {member.company && ` (${member.company})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="oldCompany">Naam Huidige Firma *</Label>
            <Select value={oldCompany} onValueChange={setOldCompany}>
              <SelectTrigger id="oldCompany">
                <SelectValue placeholder="Selecteer huidige firma" />
              </SelectTrigger>
              <SelectContent>
                {COMPANIES.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="newCompany">Naam Nieuwe Firma *</Label>
            <Select value={newCompany} onValueChange={setNewCompany}>
              <SelectTrigger id="newCompany">
                <SelectValue placeholder="Selecteer nieuwe firma" />
              </SelectTrigger>
              <SelectContent>
                {COMPANIES.filter(c => c !== oldCompany).map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Datum van Wisseling *</Label>
            <Input
              id="date"
              type="date"
              value={wisselingDate}
              onChange={(e) => setWisselingDate(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleSubmit} 
              className="flex-1" 
              disabled={!selectedMemberId || !oldCompany || !newCompany || !wisselingDate}
            >
              Volgende: Addendum Aanmaken
            </Button>
            <Link href="/firma-wisseling">
              <Button variant="outline">Annuleren</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

