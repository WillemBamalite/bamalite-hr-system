"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  Euro,
  User,
  Calendar,
  FileText,
  Search,
  Filter
} from 'lucide-react'

export default function LeningenPage() {
  const { crew, loans, addLoan, completeLoan, loading } = useSupabaseData()
  const [newLoanDialog, setNewLoanDialog] = useState(false)
  const [completeLoanDialog, setCompleteLoanDialog] = useState<{ isOpen: boolean; loanId: string; loanName: string }>({
    isOpen: false,
    loanId: "",
    loanName: ""
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [newLoanData, setNewLoanData] = useState({
    crew_id: "",
    name: "",
    period: "",
    amount: "",
    reason: ""
  })
  const [completeNotes, setCompleteNotes] = useState("")

  // Filter loans based on search and status
  const filteredLoans = loans.filter((loan) => {
    const crewMember = crew.find((c) => c.id === loan.crew_id)
    const crewName = crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : 'Onbekend'
    
    const matchesSearch = searchTerm === "" || 
      crewName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.reason.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || loan.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleAddLoan = async () => {
    try {
      if (!newLoanData.crew_id || !newLoanData.name || !newLoanData.period || !newLoanData.amount || !newLoanData.reason) {
        alert("Vul alle verplichte velden in")
        return
      }

      const parsedAmount = parseFloat(newLoanData.amount)
      if (Number.isNaN(parsedAmount)) {
        alert("Bedrag is ongeldig")
        return
      }

      await addLoan({
        crew_id: newLoanData.crew_id,
        name: newLoanData.name,
        period: newLoanData.period,
        amount: parsedAmount,
        reason: newLoanData.reason,
        status: 'open'
      })

      setNewLoanDialog(false)
      setNewLoanData({ crew_id: "", name: "", period: "", amount: "", reason: "" })
      alert("Lening succesvol toegevoegd!")
    } catch (error) {
      console.error("Error adding loan:", error)
      const message = error instanceof Error ? error.message : 'Fout bij het toevoegen van de lening'
      alert(message)
    }
  }

  const handleCompleteLoan = async () => {
    try {
      await completeLoan(completeLoanDialog.loanId, completeNotes)
      setCompleteLoanDialog({ isOpen: false, loanId: "", loanName: "" })
      setCompleteNotes("")
      alert("Lening succesvol afgerond!")
    } catch (error) {
      console.error("Error completing loan:", error)
      alert("Fout bij het afronden van de lening")
    }
  }

  const getCrewMemberName = (crewId: string) => {
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : 'Onbekend'
  }

  const openLoans = loans.filter(loan => loan.status === 'open')
  const completedLoans = loans.filter(loan => loan.status === 'voltooid')
  const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0)
  const openAmount = openLoans.reduce((sum, loan) => sum + loan.amount, 0)

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <MobileHeaderNav />
        <div className="text-center">Laden...</div>
      </div>
    )
  }

  // Debug info
  console.log('Leningen page - Crew data:', {
    crewLength: crew.length,
    crewMembers: crew.map(c => `${c.first_name} ${c.last_name}`)
  })

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leningen & Opleidingen</h1>
          <p className="text-gray-600">Overzicht van alle leningen en opleidingen voor bemanning</p>
        </div>
        <Button onClick={() => setNewLoanDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Lening
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Leningen</p>
                <p className="text-2xl font-bold text-blue-600">{loans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Openstaand</p>
                <p className="text-2xl font-bold text-orange-600">{openLoans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Voltooid</p>
                <p className="text-2xl font-bold text-green-600">{completedLoans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Openstaand Bedrag</p>
                <p className="text-2xl font-bold text-purple-600">€{openAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Zoeken</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Zoek op naam, lening, reden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle statussen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="open">Openstaand</SelectItem>
                  <SelectItem value="voltooid">Voltooid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
                className="w-full"
              >
                Filters Wissen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {filteredLoans.length} van {loans.length} leningen
          </p>
        </div>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen leningen gevonden</h3>
            <p className="text-gray-500">
              {loans.length === 0 
                ? "Er zijn nog geen leningen geregistreerd."
                : "Probeer andere filters te gebruiken."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const crewMember = crew.find((c) => c.id === loan.crew_id)
            return (
              <Card key={loan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">
                          {crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : 'Onbekend'}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600">{loan.name}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Periode</span>
                      </div>
                      <p className="text-sm text-gray-600">{loan.period}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Euro className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Bedrag</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">€{loan.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Reden</span>
                      </div>
                      <p className="text-sm text-gray-600">{loan.reason}</p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Badge 
                        className={loan.status === 'open' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}
                      >
                        {loan.status === 'open' ? 'Openstaand' : 'Voltooid'}
                      </Badge>
                      {loan.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => setCompleteLoanDialog({
                            isOpen: true,
                            loanId: loan.id,
                            loanName: loan.name
                          })}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Afronden
                        </Button>
                      )}
                    </div>
                  </div>
                  {loan.completed_at && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Afgerond op: {format(new Date(loan.completed_at), 'dd-MM-yyyy')}
                        {loan.notes && ` - ${loan.notes}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New Loan Dialog */}
      <Dialog open={newLoanDialog} onOpenChange={setNewLoanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe Lening Toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="crew">Bemanningslid *</Label>
              <Select value={newLoanData.crew_id} onValueChange={(value) => setNewLoanData({...newLoanData, crew_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bemanningslid" />
                </SelectTrigger>
                                 <SelectContent>
                   {crew.length === 0 ? (
                     <SelectItem value="no-crew" disabled>
                       Geen bemanningsleden beschikbaar
                     </SelectItem>
                   ) : (
                     crew.map((member) => (
                       <SelectItem key={member.id} value={member.id}>
                         {member.first_name} {member.last_name} - {member.position}
                       </SelectItem>
                     ))
                   )}
                 </SelectContent>
              </Select>
              {crew.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Geen bemanningsleden geladen. Controleer of de data correct wordt geladen.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Naam Lening/Opleiding *</Label>
              <Input
                id="name"
                value={newLoanData.name}
                onChange={(e) => setNewLoanData({...newLoanData, name: e.target.value})}
                placeholder="Bijv. VHF Marifoon cursus"
                required
              />
            </div>
            <div>
              <Label htmlFor="period">Periode *</Label>
              <Input
                id="period"
                value={newLoanData.period}
                onChange={(e) => setNewLoanData({...newLoanData, period: e.target.value})}
                placeholder="Bijv. Januari 2025"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Bedrag (€) *</Label>
              <Input
                id="amount"
                type="number"
                value={newLoanData.amount}
                onChange={(e) => setNewLoanData({...newLoanData, amount: e.target.value})}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">Reden *</Label>
              <Textarea
                id="reason"
                value={newLoanData.reason}
                onChange={(e) => setNewLoanData({...newLoanData, reason: e.target.value})}
                placeholder="Beschrijf de reden voor de lening/opleiding"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNewLoanDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={handleAddLoan}>
                Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Loan Dialog */}
      <Dialog open={completeLoanDialog.isOpen} onOpenChange={(open) => setCompleteLoanDialog({...completeLoanDialog, isOpen: open})}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lening Afronden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Weet je zeker dat je de lening "{completeLoanDialog.loanName}" wilt afronden?
            </p>
            <div>
              <Label htmlFor="notes">Notities (optioneel)</Label>
              <Textarea
                id="notes"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Optionele notities bij het afronden..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCompleteLoanDialog({isOpen: false, loanId: "", loanName: ""})}>
                Annuleren
              </Button>
              <Button onClick={handleCompleteLoan}>
                Afronden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 