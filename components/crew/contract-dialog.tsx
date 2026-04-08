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
import { supabase } from "@/lib/supabase"

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
  const [company, setCompany] = useState<string>(crewData.company || companyOptions[0])
  const [contractType, setContractType] = useState<'onbepaalde_tijd' | 'bepaalde_tijd'>('onbepaalde_tijd')
  const [einddatum, setEinddatum] = useState<string>('')
  const [basisSalaris, setBasisSalaris] = useState<string>('')
  const [kledinggeld, setKledinggeld] = useState<string>('')
  const [reiskosten, setReiskosten] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getReadableError = (err: any) => {
    if (!err) return "Onbekende fout"
    if (err instanceof Error && err.message) return err.message
    if (typeof err?.message === "string" && err.message) return err.message
    if (typeof err?.error === "string" && err.error) return err.error
    if (typeof err?.details === "string" && err.details) return err.details
    try {
      return JSON.stringify(err)
    } catch {
      return "Onbekende fout"
    }
  }

  const saveSalaryDefaultsToCrew = async () => {
    const crewId = String(crewData.crewId || "").trim()
    if (!crewId) return

    const basis = basisSalaris.trim()
    const kleding = kledinggeld.trim()
    const reis = reiskosten.trim()
    const kledingNum = Number(kleding.replace(",", "."))
    const reisNum = Number(reis.replace(",", "."))
    const updatesPrimary: any = {
      basis_salaris: basis || null,
      kleding_geld: kleding || null,
      reiskosten: reis || null,
      travel_allowance: Number.isFinite(reisNum) ? reisNum > 0 : false,
      updated_at: new Date().toISOString(),
    }

    let { error: updateError } = await supabase.from("crew").update(updatesPrimary).eq("id", crewId)
    if (!updateError) return

    // Fallback voor varianten in kolomnamen in oudere schemas
    const updatesFallback: any = {
      basissalaris: basis || null,
      kledinggeld: kleding || null,
      reiskosten: reis || null,
      travel_allowance: Number.isFinite(reisNum) ? reisNum > 0 : false,
      updated_at: new Date().toISOString(),
    }
    const retry = await supabase.from("crew").update(updatesFallback).eq("id", crewId)
    updateError = retry.error
    if (!updateError) return

    // Laatste fallback: alleen reiskosten-boolean en een salary note
    const baseNum = Number(basis.replace(",", "."))
    const totalExclKleding = Number.isFinite(baseNum) ? baseNum : null
    const noteParts = [
      totalExclKleding !== null ? `contract_basis_salaris_excl_kleding:${totalExclKleding}` : "",
      Number.isFinite(kledingNum) ? `contract_kledinggeld:${kledingNum}` : "",
      Number.isFinite(reisNum) ? `contract_reiskosten:${reisNum}` : "",
    ].filter(Boolean)
    const finalRetry = await supabase
      .from("crew")
      .update({
        travel_allowance: Number.isFinite(reisNum) ? reisNum > 0 : false,
        notes: noteParts.length > 0 ? [`${noteParts.join(" | ")}`] : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", crewId)
    if (finalRetry.error) {
      throw new Error(getReadableError(finalRetry.error))
    }
  }

  const getMonthKeyFromContract = () => {
    const source = crewData.in_dienst_vanaf || new Date().toISOString().slice(0, 10)
    const d = new Date(source)
    if (isNaN(d.getTime())) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }

  const upsertSalaryRowFromContract = async () => {
    const crewId = String(crewData.crewId || "").trim()
    if (!crewId) return

    const parseNum = (v: string) => {
      const n = Number(String(v || "").replace(/\./g, "").replace(",", "."))
      return Number.isFinite(n) ? n : 0
    }

    const baseSalary = parseNum(basisSalaris)
    const clothing = parseNum(kledinggeld)
    const travel = parseNum(reiskosten)
    const monthKey = getMonthKeyFromContract()
    const payload: any = {
      crew_id: crewId,
      company: company || crewData.company || null,
      month_key: monthKey,
      base_salary: baseSalary > 0 ? baseSalary : null,
      travel_allowance: travel > 0,
      notes:
        clothing > 0
          ? `Kledinggeld contract: € ${clothing.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "",
      reason:
        clothing > 0
          ? `Salaris uit contract overgenomen | kledinggeld:${clothing}`
          : "Salaris uit contract overgenomen",
      updated_at: new Date().toISOString(),
    }

    let { error } = await supabase
      .from("loon_bemerkingen")
      .upsert([payload], { onConflict: "crew_id,month_key" })
    if (!error) return

    // Fallback: kolommen zoals notes/reason kunnen ontbreken in sommige schema's
    const { notes: _omitNotes, ...payloadWithoutNotes } = payload
    const retry = await supabase
      .from("loon_bemerkingen")
      .upsert([payloadWithoutNotes], { onConflict: "crew_id,month_key" })
    error = retry.error
    if (error) {
      throw new Error(getReadableError(error))
    }
  }

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
      // Voeg salaris data toe aan crewData
      // BELANGRIJK: Gebruik de geselecteerde firma uit de dialog, niet de crewData.company
      // Anders wordt bij Europeshipping/andere firma's altijd Bamalite data ingevuld
      const contractDataWithSalary: ContractData = {
        ...crewData,
        company, // Override met geselecteerde firma - anders kloppen regels niet
        in_dienst_tot: contractType === 'bepaalde_tijd' ? einddatum : undefined,
        basisSalaris: basisSalaris || undefined,
        kledinggeld: kledinggeld || undefined,
        reiskosten: reiskosten || undefined,
      }

      // Basis bestandsnaam: "Arbeidsovereenkomst (Naam bemanningslid) firma (naam firma)"
      const crewName = `${crewData.firstName} ${crewData.lastName}`
      const companyName = company.replace(/\./g, '').replace(/\s+/g, ' ') // Normaliseer firma naam
      const contractTypeText = contractType === 'bepaalde_tijd' ? ' - Bepaalde tijd' : ''
      
      // Genereer en download altijd zowel Nederlands als Duits contract
      const optionsNl: ContractOptions = {
        language: 'nl',
        company,
        contractType,
      }
      const optionsDe: ContractOptions = {
        language: 'de',
        company,
        contractType,
      }

      // Nederlands
      const nlBlob = await generateContract(contractDataWithSalary, optionsNl)
      const nlFileName = `Arbeidsovereenkomst (${crewName}) firma (${companyName})${contractTypeText} - NL.pdf`
      downloadContract(nlBlob, nlFileName)

      // Duits
      const deBlob = await generateContract(contractDataWithSalary, optionsDe)
      const deFileName = `Arbeidsovereenkomst (${crewName}) firma (${companyName})${contractTypeText} - DE.pdf`
      downloadContract(deBlob, deFileName)

      // Sla salaris defaults op, maar blokkeer contractgeneratie niet als dit faalt
      try {
        await saveSalaryDefaultsToCrew()
      } catch (persistError) {
        console.warn("Kon salaris-startwaarden niet opslaan op crew record:", persistError)
      }
      try {
        await upsertSalaryRowFromContract()
      } catch (salaryRowError) {
        console.warn("Kon salarislijst regel niet automatisch updaten vanuit contract:", salaryRowError)
      }

      // Sluit de dialog en roep onComplete aan
      onComplete()
      onOpenChange(false)
    } catch (err) {
      console.error('Error generating contract:', err)
      setError(`Er is een fout opgetreden bij het genereren van het contract: ${getReadableError(err)}`)
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

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
            Er worden automatisch twee contracten gegenereerd en gedownload: één in het Nederlands en één in het Duits.
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
                Wordt gebruikt in contract en opgeslagen als salaris-startwaarde in het systeem
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

