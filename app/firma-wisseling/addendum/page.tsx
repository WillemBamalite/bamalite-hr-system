"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { generateAddendum, downloadContract, AddendumData } from '@/utils/contract-generator'
import { format } from 'date-fns'
import { DashboardButton } from '@/components/ui/dashboard-button'

const COMPANIES = [
  'Bamalite S.A.',
  'Alcina S.A.',
  'Europe Shipping AG.',
  'Brugo Shipping SARL.',
  'Devel Shipping S.A.',
]

function AddendumForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { crew, loading } = useSupabaseData()
  
  const memberId = searchParams.get('memberId') || ''
  const oldCompany = searchParams.get('oldCompany') || ''
  const newCompany = searchParams.get('newCompany') || ''
  const wisselingDate = searchParams.get('date') || ''
  
  const member = crew.find((m: any) => m.id === memberId)
  
  const [formData, setFormData] = useState<AddendumData>({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    },
    oldCompany: oldCompany,
    newCompany: newCompany,
    inDienstVanafEersteWerkgever: '',
    wisselingDate: wisselingDate,
    addendumDate: format(new Date(), 'yyyy-MM-dd'),
    language: 'nl', // Default Nederlands
  })
  
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (member) {
      // Haal adres op uit member.address object (kan een object zijn of undefined)
      const memberAddress = member.address || {}
      const addressStreet = typeof memberAddress === 'object' && memberAddress !== null 
        ? (memberAddress.street || '') 
        : ''
      const addressCity = typeof memberAddress === 'object' && memberAddress !== null 
        ? (memberAddress.city || '') 
        : ''
      const addressPostalCode = typeof memberAddress === 'object' && memberAddress !== null 
        ? (memberAddress.postal_code || memberAddress.postalCode || '') 
        : ''
      const addressCountry = typeof memberAddress === 'object' && memberAddress !== null 
        ? (memberAddress.country || '') 
        : ''
      
      setFormData({
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        birthDate: member.birth_date || '',
        birthPlace: member.birth_place || '',
        address: {
          street: addressStreet,
          city: addressCity,
          postalCode: addressPostalCode,
          country: addressCountry,
        },
        oldCompany: oldCompany || member.company || '',
        newCompany: newCompany,
        inDienstVanafEersteWerkgever: member.in_dienst_vanaf || '',
        wisselingDate: wisselingDate,
        addendumDate: format(new Date(), 'yyyy-MM-dd'),
        language: 'nl', // Default Nederlands
      })
    }
  }, [member, oldCompany, newCompany, wisselingDate])

  const handleGenerate = async () => {
    if (!member) {
      setError('Bemanningslid niet gevonden')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const blob = await generateAddendum(formData)
      const fileName = `Addendum_${member.first_name}_${member.last_name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      downloadContract(blob, fileName)
    } catch (err) {
      console.error('Error generating addendum:', err)
      setError(err instanceof Error ? err.message : 'Fout bij genereren addendum')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Bemanningslid niet gevonden</p>
          <Link href="/firma-wisseling">
            <Button>Terug naar Firma Wisseling</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <DashboardButton />
      
      <Link href="/firma-wisseling/wisseling">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Addendum Aanmaken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Persoonlijke gegevens */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Persoonlijke Gegevens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Voornaam</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Achternaam</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Geboortedatum</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="birthPlace">Geboorteplaats</Label>
                <Input
                  id="birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Adres */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Adres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Straat</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postcode</Label>
                <Input
                  id="postalCode"
                  value={formData.address.postalCode}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, postalCode: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="city">Plaats</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, city: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, country: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Taal selectie */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Taal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="language">Addendum Taal</Label>
                <Select 
                  value={formData.language || 'nl'} 
                  onValueChange={(value: 'nl' | 'de') => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Selecteer taal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="de">Duits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Firma gegevens */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Firma Gegevens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="oldCompany">Voormalige Firma</Label>
                <Select 
                  value={formData.oldCompany} 
                  onValueChange={(value) => setFormData({ ...formData, oldCompany: value })}
                >
                  <SelectTrigger id="oldCompany">
                    <SelectValue placeholder="Selecteer voormalige firma" />
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
                <Label htmlFor="newCompany">Nieuwe Firma</Label>
                <Select 
                  value={formData.newCompany} 
                  onValueChange={(value) => setFormData({ ...formData, newCompany: value })}
                >
                  <SelectTrigger id="newCompany">
                    <SelectValue placeholder="Selecteer nieuwe firma" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANIES.filter(c => c !== formData.oldCompany).map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inDienstVanaf">In Dienst Vanaf (bij eerste werkgever)</Label>
                <Input
                  id="inDienstVanaf"
                  type="date"
                  value={formData.inDienstVanafEersteWerkgever}
                  onChange={(e) => setFormData({ ...formData, inDienstVanafEersteWerkgever: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="wisselingDate">Datum van Wisseling</Label>
                <Input
                  id="wisselingDate"
                  type="date"
                  value={formData.wisselingDate}
                  onChange={(e) => setFormData({ ...formData, wisselingDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="addendumDate">Datum van Aanmaken</Label>
                <Input
                  id="addendumDate"
                  type="date"
                  value={formData.addendumDate}
                  onChange={(e) => setFormData({ ...formData, addendumDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={handleGenerate} 
              className="flex-1" 
              disabled={generating}
            >
              {generating ? (
                'Genereren...'
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Addendum Genereren en Downloaden
                </>
              )}
            </Button>
            <Link href="/firma-wisseling">
              <Button variant="outline">Terug naar Overzicht</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AddendumPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    }>
      <AddendumForm />
    </Suspense>
  )
}

