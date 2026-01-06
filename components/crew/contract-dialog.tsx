"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Loader2, Euro } from "lucide-react"
import { generateContract, downloadContract, ContractData, ContractOptions } from "@/utils/contract-generator"
import { format } from "date-fns"
import { nl } from "date-fns/locale"

interface ContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  crewData: ContractData
  onComplete: () => void
}

const companyOptions = [
  "Bamalite S.A.",
  "Devel Shipping S.A.",
  "Brugo Shipping SARL.",
  "Europe Shipping AG.",
  "Alcina S.A."
]

export function ContractDialog({ open, onOpenChange, crewData, onComplete }: ContractDialogProps) {
  const [language, setLanguage] = useState<'nl' | 'de'>('nl')
  const [company, setCompany] = useState<string>(crewData.company || companyOptions[0])
  const [contractType, setContractType] = useState<'onbepaalde_tijd' | 'bepaalde_tijd'>('onbepaalde_tijd')
  const [einddatum, setEinddatum] = useState<string>('')
  const [basisSalaris, setBasisSalaris] = useState<string>('')
  const [kledinggeld, setKledinggeld] = useState<string>('')
  const [reiskosten, setReiskosten] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!company) {
      setError('Selecteer een firma')
      return
    }

    // Validatie: bij bepaalde tijd moet einddatum ingevuld zijn
    if (contractType === 'bepaalde_tijd' && !einddatum) {
      setError('Vul de einddatum in voor een contract voor bepaalde tijd')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const options: ContractOptions = {
        language,
        company,
        contractType
      }

      // Voeg salaris data toe aan crewData
      const contractDataWithSalary: ContractData = {
        ...crewData,
        in_dienst_tot: contractType === 'bepaalde_tijd' ? einddatum : undefined,
        basisSalaris: basisSalaris || undefined,
        kledinggeld: kledinggeld || undefined,
        reiskosten: reiskosten || undefined,
      }

      // Genereer het contract
      const contractBlob = await generateContract(contractDataWithSalary, options)

      // Genereer bestandsnaam: "Arbeidsovereenkomst (Naam bemanningslid) firma (naam firma)"
      const crewName = `${crewData.firstName} ${crewData.lastName}`
      const companyName = company.replace(/\./g, '').replace(/\s+/g, ' ') // Normaliseer firma naam
      const contractTypeText = contractType === 'bepaalde_tijd' ? ' - Bepaalde tijd' : ''
      const fileName = `Arbeidsovereenkomst (${crewName}) firma (${companyName})${contractTypeText}.pdf`

      // Download het contract
      downloadContract(contractBlob, fileName)

      // Sluit de dialog en roep onComplete aan
      onComplete()
      onOpenChange(false)
    } catch (err) {
      console.error('Error generating contract:', err)
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden bij het genereren van het contract')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Contract Opstellen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              Wil je een contract opstellen voor <strong>{crewData.firstName} {crewData.lastName}</strong>?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Taal *</Label>
            <Select value={language} onValueChange={(value: 'nl' | 'de') => setLanguage(value)}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Selecteer taal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="de">Duits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Firma *</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger id="company">
                <SelectValue placeholder="Selecteer firma" />
              </SelectTrigger>
              <SelectContent>
                {companyOptions.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {comp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              De firma waar {crewData.firstName} {crewData.lastName} gaat werken
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractType">Contract Type *</Label>
            <Select 
              value={contractType} 
              onValueChange={(value: 'onbepaalde_tijd' | 'bepaalde_tijd') => {
                setContractType(value)
                if (value === 'onbepaalde_tijd') {
                  setEinddatum('') // Reset einddatum bij onbepaalde tijd
                }
              }}
            >
              <SelectTrigger id="contractType">
                <SelectValue placeholder="Selecteer contract type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onbepaalde_tijd">Onbepaalde tijd</SelectItem>
                <SelectItem value="bepaalde_tijd">Bepaalde tijd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contractType === 'bepaalde_tijd' && (
            <div className="space-y-2">
              <Label htmlFor="einddatum">Einddatum *</Label>
              <Input
                id="einddatum"
                type="date"
                value={einddatum}
                onChange={(e) => setEinddatum(e.target.value)}
                required={contractType === 'bepaalde_tijd'}
              />
              <p className="text-xs text-gray-500">
                Tot wanneer is het contract geldig?
              </p>
            </div>
          )}

          <div className="pt-4 border-t space-y-4">
            <div className="space-y-2">
              <Label htmlFor="basisSalaris" className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Basis Salaris (optioneel)
              </Label>
              <Input
                id="basisSalaris"
                type="text"
                placeholder="Bijv. 2500"
                value={basisSalaris}
                onChange={(e) => setBasisSalaris(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Alleen voor het contract, wordt niet opgeslagen in het systeem
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kledinggeld" className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Kledinggeld (optioneel)
              </Label>
              <Input
                id="kledinggeld"
                type="text"
                placeholder="Bijv. 150"
                value={kledinggeld}
                onChange={(e) => setKledinggeld(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reiskosten" className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Reiskosten (optioneel)
              </Label>
              <Input
                id="reiskosten"
                type="text"
                placeholder="Bijv. 200"
                value={reiskosten}
                onChange={(e) => setReiskosten(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            Nee, overslaan
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !company}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Contract genereren...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Ja, contract opstellen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

