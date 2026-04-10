"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { useLanguage } from '@/contexts/LanguageContext'
import { isRealCrewMember } from '@/utils/crew-filters'
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  Euro,
  User,
  Calendar,
  FileText,
  Search,
  Wallet,
  RefreshCw,
  Trash2,
  Printer
} from 'lucide-react'

export default function LeningenPage() {
  const { crew, loans, addLoan, updateLoan, completeLoan, deleteLoan, makePayment, applyPendingLoanInstallments, loading } =
    useSupabaseData()
  const { t } = useLanguage()
  const [newLoanDialog, setNewLoanDialog] = useState(false)
  const [completeLoanDialog, setCompleteLoanDialog] = useState<{ isOpen: boolean; loanId: string; loanName: string }>({
    isOpen: false,
    loanId: "",
    loanName: ""
  })
  const [paymentDialog, setPaymentDialog] = useState<{ isOpen: boolean; loanId: string; loanName: string; maxAmount: number }>({
    isOpen: false,
    loanId: "",
    loanName: "",
    maxAmount: 0
  })
  const [deleteLoanDialog, setDeleteLoanDialog] = useState<{ isOpen: boolean; loanId: string; loanName: string }>({
    isOpen: false,
    loanId: "",
    loanName: ""
  })
  const [expandedPaymentHistory, setExpandedPaymentHistory] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const defaultNewLoanData = () => ({
    crew_id: "",
    name: "",
    period: "",
    amount: "",
    reason: "",
    installment_enabled: false,
    installment_deduct_from_salary: false,
    installment_amount: "",
    installment_start_month: new Date().toISOString().slice(0, 7),
    installment_period_type: "month" as "month" | "year",
  })
  const [newLoanData, setNewLoanData] = useState(() => defaultNewLoanData())
  const [completeNotes, setCompleteNotes] = useState("")
  const [paymentData, setPaymentData] = useState({
    amount: "",
    note: ""
  })
  const [installmentDialog, setInstallmentDialog] = useState<{
    open: boolean
    loan: any | null
    enabled: boolean
    deductFromSalary: boolean
    monthly: string
    startMonth: string
    periodType: "month" | "year"
  }>({
    open: false,
    loan: null,
    enabled: false,
    deductFromSalary: false,
    monthly: "",
    startMonth: "",
    periodType: "month",
  })
  const [savingInstallment, setSavingInstallment] = useState(false)
  const selectableCrew = crew.filter((member: any) => isRealCrewMember(member))

  const openInstallmentDialog = (loan: any) => {
    const ym = new Date().toISOString().slice(0, 7)
    setInstallmentDialog({
      open: true,
      loan,
      enabled: !!loan.auto_installment_enabled,
      deductFromSalary: !!loan.auto_deduct_salary,
      monthly:
        loan.monthly_installment_amount != null && loan.monthly_installment_amount !== ""
          ? String(loan.monthly_installment_amount)
          : "",
      startMonth: typeof loan.installment_start_period === "string" ? loan.installment_start_period : ym,
    })
  }

  const handleSaveInstallment = async () => {
    if (!installmentDialog.loan) return
    const { loan, enabled, deductFromSalary, monthly, startMonth, periodType } = installmentDialog
    setSavingInstallment(true)
    try {
      const parsed = parseFloat(monthly.replace(",", "."))
      if (enabled) {
        if (!Number.isFinite(parsed) || parsed <= 0) {
          alert("Vul een geldig termijnbedrag in.")
          setSavingInstallment(false)
          return
        }
        if (!/^\d{4}-\d{2}$/.test(startMonth)) {
          alert("Kies een geldige startmaand.")
          setSavingInstallment(false)
          return
        }
      }
      const prevStart = loan.installment_start_period
      const prevType =
        String(loan.installment_period_type || "month").toLowerCase() === "year" ? "year" : "month"
      const updates: Record<string, unknown> = {
        auto_installment_enabled: enabled,
        auto_deduct_salary: enabled ? deductFromSalary : false,
        monthly_installment_amount: enabled ? parsed : null,
        installment_start_period: enabled ? startMonth : null,
        installment_period_type: enabled ? periodType : "month",
      }
      if (enabled && (startMonth !== prevStart || periodType !== prevType)) {
        updates.last_installment_period = null
      }
      if (!enabled) {
        updates.last_installment_period = null
      }
      await updateLoan(loan.id, updates)
      setInstallmentDialog({
        open: false,
        loan: null,
        enabled: false,
        deductFromSalary: false,
        monthly: "",
        startMonth: "",
        periodType: "month",
      })
      await applyPendingLoanInstallments()
    } catch (e) {
      console.error(e)
      alert(
        "Opslaan van de aflossingsregeling mislukt. Controleer of de database-migratie is uitgevoerd (scripts/add-loan-monthly-installment.sql)."
      )
    } finally {
      setSavingInstallment(false)
    }
  }

  // Bij openen van deze pagina: openstaande automatische termijnen t/m huidige maand boeken
  useEffect(() => {
    if (loading) return
    void applyPendingLoanInstallments().catch((e) => console.error("Maandtermijnen:", e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Filter loans based on search only (status filtered by tabs)
  const filterLoansBySearch = (loansToFilter: any[]) => {
    return loansToFilter.filter((loan) => {
      const crewMember = crew.find((c) => c.id === loan.crew_id)
      const crewName = crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : 'Onbekend'
      
      const matchesSearch = searchTerm === "" || 
        crewName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.reason.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }

  const openLoansFiltered = filterLoansBySearch(loans.filter(loan => loan.status === 'open'))
  const completedLoansFiltered = filterLoansBySearch(loans.filter(loan => loan.status === 'voltooid'))

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

      if (newLoanData.installment_enabled) {
        const parsedInst = parseFloat(newLoanData.installment_amount.replace(",", "."))
        if (!Number.isFinite(parsedInst) || parsedInst <= 0) {
          alert("Vul een geldig termijnbedrag in voor de automatische aflossing, of schakel die uit.")
          return
        }
        if (!/^\d{4}-\d{2}$/.test(newLoanData.installment_start_month)) {
          alert("Kies een geldige startmaand voor de automatische aflossing.")
          return
        }
      }

      const payload: Record<string, unknown> = {
        id: `loan-${Date.now()}`,
        crew_id: newLoanData.crew_id,
        name: newLoanData.name,
        period: newLoanData.period,
        amount: parsedAmount,
        amount_paid: 0,
        amount_remaining: parsedAmount,
        reason: newLoanData.reason,
        status: "open",
      }

      if (newLoanData.installment_enabled) {
        const parsedInst = parseFloat(newLoanData.installment_amount.replace(",", "."))
        payload.auto_installment_enabled = true
        payload.auto_deduct_salary = !!newLoanData.installment_deduct_from_salary
        payload.monthly_installment_amount = parsedInst
        payload.installment_start_period = newLoanData.installment_start_month
        payload.installment_period_type = newLoanData.installment_period_type
        payload.last_installment_period = null
      } else {
        payload.auto_installment_enabled = false
        payload.auto_deduct_salary = false
        payload.monthly_installment_amount = null
        payload.installment_start_period = null
        payload.installment_period_type = "month"
        payload.last_installment_period = null
      }

      await addLoan(payload)

      setNewLoanDialog(false)
      setNewLoanData(defaultNewLoanData())
      // Loan added - no alert needed
    } catch (error) {
      console.error("Error adding loan:", error)
      const message = error instanceof Error ? error.message : 'Fout bij het toevoegen van de lening'
      alert(message)
    }
  }

  const handlePayment = async () => {
    try {
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        alert("Vul een geldig bedrag in")
        return
      }

      const paymentAmount = parseFloat(paymentData.amount)
      if (paymentAmount > paymentDialog.maxAmount) {
        alert(`Het bedrag mag niet hoger zijn dan €${paymentDialog.maxAmount.toFixed(2)}`)
        return
      }

      await makePayment(paymentDialog.loanId, paymentAmount, paymentData.note)

      setPaymentDialog({ isOpen: false, loanId: "", loanName: "", maxAmount: 0 })
      setPaymentData({ amount: "", note: "" })
      // Payment processed - no alert needed
    } catch (error) {
      console.error("Error making payment:", error)
      const message = error instanceof Error ? error.message : 'Fout bij het verwerken van de betaling'
      alert(message)
    }
  }

  const handleCompleteLoan = async () => {
    try {
      await completeLoan(completeLoanDialog.loanId, completeNotes)
      setCompleteLoanDialog({ isOpen: false, loanId: "", loanName: "" })
      setCompleteNotes("")
      // Loan completed - no alert needed
    } catch (error) {
      console.error("Error completing loan:", error)
      alert("Fout bij het afronden van de lening")
    }
  }

  const handleDeleteCompletedLoan = async () => {
    try {
      await deleteLoan(deleteLoanDialog.loanId)
      setDeleteLoanDialog({ isOpen: false, loanId: "", loanName: "" })
    } catch (error) {
      console.error("Error deleting completed loan:", error)
      alert("Fout bij het verwijderen van de voltooide lening")
    }
  }

  const togglePaymentHistory = (loanId: string) => {
    setExpandedPaymentHistory((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }))
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
        <div className="text-center">{t('loading')}...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('loansAndTraining')}</h1>
          <p className="text-gray-600">Overzicht van alle leningen en opleidingen voor bemanning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/bemanning/leningen/print">
              <Printer className="w-4 h-4 mr-2" />
              Printversie
            </Link>
          </Button>
          <Button onClick={() => setNewLoanDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('newLoan')}
          </Button>
        </div>
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

      {/* Search Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
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
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
              >
                Wissen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loans Tabs */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="open" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Openstaand ({openLoansFiltered.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Voltooid ({completedLoansFiltered.length})
          </TabsTrigger>
        </TabsList>

        {/* Open Loans Tab */}
        <TabsContent value="open">
          {openLoansFiltered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen openstaande leningen</h3>
                <p className="text-gray-500">
                  {loans.filter(l => l.status === 'open').length === 0 
                    ? "Er zijn nog geen openstaande leningen."
                    : "Geen leningen gevonden met deze zoekcriteria."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {openLoansFiltered.map((loan) => {
            const crewMember = crew.find((c) => c.id === loan.crew_id)
            return (
              <Card key={loan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    {/* Left side: Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
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
                          <span className="text-sm font-medium text-gray-700">Totaal Bedrag</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">€{loan.amount.toFixed(2)}</p>
                        {loan.status === 'open' && (
                          <>
                            <p className="text-xs text-green-600">Betaald: €{(loan.amount_paid || 0).toFixed(2)}</p>
                            <p className="text-xs text-orange-600">Nog te betalen: €{(loan.amount_remaining || loan.amount).toFixed(2)}</p>
                          </>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Reden</span>
                        </div>
                        <p className="text-sm text-gray-600">{loan.reason}</p>
                      </div>
                    </div>
                    
                    {/* Right side: Status & Actions */}
                    <div className="flex flex-col items-end space-y-2 md:min-w-[280px]">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Badge 
                          className={loan.status === 'open' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}
                        >
                          {loan.status === 'open' ? 'Openstaand' : 'Voltooid'}
                        </Badge>
                        {loan.status === 'open' && loan.auto_installment_enabled && (
                          <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {String(loan.installment_period_type || "month").toLowerCase() === "year"
                              ? `Jaarregeling €${Number(loan.monthly_installment_amount || 0).toFixed(2)}/jaar`
                              : `Maandregeling €${Number(loan.monthly_installment_amount || 0).toFixed(2)}/mnd`}
                          </Badge>
                        )}
                        {loan.status === 'open' && loan.auto_installment_enabled && loan.auto_deduct_salary && (
                          <Badge className="bg-amber-100 text-amber-900 border border-amber-300">
                            Inhouden via salaris
                          </Badge>
                        )}
                      </div>
                      {loan.status === 'open' && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                            onClick={() => openInstallmentDialog(loan)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Aflossingsregeling
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPaymentDialog({
                              isOpen: true,
                              loanId: loan.id,
                              loanName: loan.name,
                              maxAmount: loan.amount_remaining || loan.amount
                            })}
                          >
                            <Wallet className="w-4 h-4 mr-1" />
                            Betalen
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {loan.status === 'open' && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-600">Voortgang</span>
                        <span className="text-xs text-gray-500">
                          {Math.round(((loan.amount_paid || 0) / loan.amount) * 100)}%
                        </span>
                      </div>
                      <Progress value={((loan.amount_paid || 0) / loan.amount) * 100} className="h-2" />
                    </div>
                  )}
                  
                  {loan.completed_at && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Afgerond op: {format(new Date(loan.completed_at), 'dd-MM-yyyy')}
                        {loan.notes && ` - ${loan.notes}`}
                      </p>
                    </div>
                  )}
                  
                  {/* Payment History */}
                  {loan.payment_history && loan.payment_history.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600">
                          Betalingshistorie ({loan.payment_history.length})
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => togglePaymentHistory(loan.id)}
                        >
                          {expandedPaymentHistory[loan.id] ? "Verberg" : "Toon"}
                        </Button>
                      </div>
                      {expandedPaymentHistory[loan.id] && (
                        <div className="space-y-1">
                          {loan.payment_history.map((payment: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-500">
                              <span>{format(new Date(payment.date), 'dd-MM-yyyy')}: {payment.note}</span>
                              <span className="font-medium text-green-600">€{payment.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
            </div>
          )}
        </TabsContent>

        {/* Completed Loans Tab */}
        <TabsContent value="completed">
          {completedLoansFiltered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen voltooide leningen</h3>
                <p className="text-gray-500">
                  {loans.filter(l => l.status === 'voltooid').length === 0 
                    ? "Er zijn nog geen voltooide leningen."
                    : "Geen leningen gevonden met deze zoekcriteria."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedLoansFiltered.map((loan) => {
                const crewMember = crew.find((c) => c.id === loan.crew_id)
                return (
                  <Card key={loan.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        {/* Left side: Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
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
                              <span className="text-sm font-medium text-gray-700">Totaal Bedrag</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">€{loan.amount.toFixed(2)}</p>
                            <p className="text-xs text-green-600">Volledig betaald</p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">Reden</span>
                            </div>
                            <p className="text-sm text-gray-600">{loan.reason}</p>
                          </div>
                        </div>
                        
                        {/* Right side: Status */}
                        <div className="flex flex-col items-end space-y-2 md:min-w-[280px]">
                          <Badge className="bg-green-100 text-green-800">
                            Voltooid
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setDeleteLoanDialog({
                                isOpen: true,
                                loanId: loan.id,
                                loanName: loan.name,
                              })
                            }
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                      
                      {/* Completion Info */}
                      {loan.completed_at && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500">
                            Afgerond op: {format(new Date(loan.completed_at), 'dd-MM-yyyy')}
                            {loan.notes && ` - ${loan.notes}`}
                          </p>
                        </div>
                      )}
                      
                      {/* Payment History */}
                      {loan.payment_history && loan.payment_history.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-600">
                              Betalingshistorie ({loan.payment_history.length})
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => togglePaymentHistory(loan.id)}
                            >
                              {expandedPaymentHistory[loan.id] ? "Verberg" : "Toon"}
                            </Button>
                          </div>
                          {expandedPaymentHistory[loan.id] && (
                            <div className="space-y-1">
                              {loan.payment_history.map((payment: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs text-gray-500">
                                  <span>{format(new Date(payment.date), 'dd-MM-yyyy')}: {payment.note}</span>
                                  <span className="font-medium text-green-600">€{payment.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                   {selectableCrew.length === 0 ? (
                     <SelectItem value="no-crew" disabled>
                       Geen bemanningsleden beschikbaar
                     </SelectItem>
                   ) : (
                     selectableCrew.map((member) => (
                       <SelectItem key={member.id} value={member.id}>
                         {member.first_name} {member.last_name} - {member.position}
                       </SelectItem>
                     ))
                   )}
                 </SelectContent>
              </Select>
              {selectableCrew.length === 0 && (
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

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">Automatische aflossing (optioneel)</p>
              <p className="text-xs text-gray-500">
                Zelfde werking als bij een bestaande lening: bij bezoek aan deze pagina worden openstaande
                termijnen automatisch geboekt tot en met de huidige maand.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-loan-installment"
                  checked={newLoanData.installment_enabled}
                  onCheckedChange={(v) =>
                    setNewLoanData((s) => ({ ...s, installment_enabled: v === true }))
                  }
                />
                <Label htmlFor="new-loan-installment" className="cursor-pointer">
                  Automatische aflossing instellen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-loan-installment-deduct"
                  checked={newLoanData.installment_deduct_from_salary}
                  disabled={!newLoanData.installment_enabled}
                  onCheckedChange={(v) =>
                    setNewLoanData((s) => ({ ...s, installment_deduct_from_salary: v === true }))
                  }
                />
                <Label htmlFor="new-loan-installment-deduct" className="cursor-pointer">
                  Inhouden via salaris
                </Label>
              </div>
              <div>
                <Label htmlFor="new-installment-period-type">Periode</Label>
                <Select
                  value={newLoanData.installment_period_type}
                  onValueChange={(v) =>
                    setNewLoanData((s) => ({
                      ...s,
                      installment_period_type: v as "month" | "year",
                    }))
                  }
                  disabled={!newLoanData.installment_enabled}
                >
                  <SelectTrigger id="new-installment-period-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Maandelijks</SelectItem>
                    <SelectItem value="year">Jaarlijks (elk jaar in dezelfde maand)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-installment-amount">
                  {newLoanData.installment_period_type === "year"
                    ? "Bedrag per jaar (€)"
                    : "Bedrag per maand (€)"}
                </Label>
                <Input
                  id="new-installment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!newLoanData.installment_enabled}
                  value={newLoanData.installment_amount}
                  onChange={(e) =>
                    setNewLoanData({ ...newLoanData, installment_amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="new-installment-start">Eerste maand van de regeling</Label>
                <Input
                  id="new-installment-start"
                  type="month"
                  disabled={!newLoanData.installment_enabled}
                  value={newLoanData.installment_start_month}
                  onChange={(e) =>
                    setNewLoanData({ ...newLoanData, installment_start_month: e.target.value })
                  }
                />
              </div>
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.isOpen} onOpenChange={(open) => setPaymentDialog({...paymentDialog, isOpen: open})}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling Registreren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Betaling voor lening: <span className="font-medium">{paymentDialog.loanName}</span>
            </p>
            <div>
              <Label htmlFor="paymentAmount">Bedrag (max €{paymentDialog.maxAmount.toFixed(2)}) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentDialog.maxAmount}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Nog te betalen: €{paymentDialog.maxAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <Label htmlFor="paymentNote">Notitie (optioneel)</Label>
              <Input
                id="paymentNote"
                value={paymentData.note}
                onChange={(e) => setPaymentData({...paymentData, note: e.target.value})}
                placeholder="Bijv. Betaling maand januari"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setPaymentDialog({isOpen: false, loanId: "", loanName: "", maxAmount: 0})
                setPaymentData({amount: "", note: ""})
              }}>
                Annuleren
              </Button>
              <Button onClick={handlePayment}>
                <Wallet className="w-4 h-4 mr-1" />
                Betaling Bevestigen
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

      {/* Delete Completed Loan Dialog */}
      <Dialog
        open={deleteLoanDialog.isOpen}
        onOpenChange={(open) => setDeleteLoanDialog({ ...deleteLoanDialog, isOpen: open })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voltooide Lening Verwijderen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Weet je zeker dat je de voltooide lening "{deleteLoanDialog.loanName}" wilt verwijderen?
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setDeleteLoanDialog({ isOpen: false, loanId: "", loanName: "" })}
              >
                Annuleren
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCompletedLoan}
              >
                Verwijderen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Automatische aflossing (maand of jaar) */}
      <Dialog
        open={installmentDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setInstallmentDialog({
              open: false,
              loan: null,
              enabled: false,
              monthly: "",
              startMonth: "",
              periodType: "month",
            })
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Automatische aflossing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Voor leningen met een vast termijnbedrag: bij het openen van deze pagina worden openstaande
              termijnen automatisch als betaling geboekt (maandelijks elke maand, of jaarlijks eens per jaar
              in de gekozen startmaand). Handmatige betalingen blijven mogelijk.
            </p>
            {installmentDialog.loan && (
              <p className="text-sm font-medium text-gray-900">
                {installmentDialog.loan.name}
              </p>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="installment-enabled"
                checked={installmentDialog.enabled}
                onCheckedChange={(v) =>
                  setInstallmentDialog((s) => ({ ...s, enabled: v === true }))
                }
              />
              <Label htmlFor="installment-enabled" className="cursor-pointer">
                Automatische aflossing actief
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="installment-deduct-salary"
                checked={installmentDialog.deductFromSalary}
                disabled={!installmentDialog.enabled}
                onCheckedChange={(v) =>
                  setInstallmentDialog((s) => ({ ...s, deductFromSalary: v === true }))
                }
              />
              <Label htmlFor="installment-deduct-salary" className="cursor-pointer">
                Inhouden via salaris
              </Label>
            </div>
            <div>
              <Label htmlFor="installment-period-type">Periode</Label>
              <Select
                value={installmentDialog.periodType}
                onValueChange={(v) =>
                  setInstallmentDialog((s) => ({
                    ...s,
                    periodType: v as "month" | "year",
                  }))
                }
                disabled={!installmentDialog.enabled}
              >
                <SelectTrigger id="installment-period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Maandelijks</SelectItem>
                  <SelectItem value="year">Jaarlijks (elk jaar in dezelfde maand)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="installment-monthly">
                {installmentDialog.periodType === "year"
                  ? "Bedrag per jaar (€)"
                  : "Bedrag per maand (€)"}
              </Label>
              <Input
                id="installment-monthly"
                type="number"
                min="0"
                step="0.01"
                disabled={!installmentDialog.enabled}
                value={installmentDialog.monthly}
                onChange={(e) => setInstallmentDialog((s) => ({ ...s, monthly: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="installment-start">Eerste maand van de regeling</Label>
              <Input
                id="installment-start"
                type="month"
                disabled={!installmentDialog.enabled}
                value={installmentDialog.startMonth}
                onChange={(e) => setInstallmentDialog((s) => ({ ...s, startMonth: e.target.value }))}
              />
            </div>
            {installmentDialog.loan?.last_installment_period && (
              <p className="text-xs text-gray-500">
                Laatste automatisch geboekte termijn (maand):{" "}
                <span className="font-mono">{installmentDialog.loan.last_installment_period}</span>
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setInstallmentDialog({
                    open: false,
                    loan: null,
                    enabled: false,
                    deductFromSalary: false,
                    monthly: "",
                    startMonth: "",
                    periodType: "month",
                  })
                }
              >
                Annuleren
              </Button>
              <Button onClick={handleSaveInstallment} disabled={savingInstallment}>
                {savingInstallment ? "Opslaan…" : "Opslaan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 