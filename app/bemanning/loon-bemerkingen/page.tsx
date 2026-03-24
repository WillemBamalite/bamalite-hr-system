"use client"

import { useEffect, useMemo, useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"

const getCurrentMonthKey = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const monthKeyToDisplay = (monthKey: string) => {
  const [year, month] = (monthKey || "").split("-")
  if (!year || !month) return monthKey
  return `${month}/${String(year).slice(-2)}`
}

const monthNumberToDutchName = (month: string) => {
  const map: Record<string, string> = {
    "01": "januari",
    "02": "februari",
    "03": "maart",
    "04": "april",
    "05": "mei",
    "06": "juni",
    "07": "juli",
    "08": "augustus",
    "09": "september",
    "10": "oktober",
    "11": "november",
    "12": "december",
  }
  return map[month] || month
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yy} ${hh}:${mi}`
}

const getErrMsg = (e: any) => {
  if (!e) return "Onbekende fout"
  return e?.message || e?.error?.message || e?.details || e?.hint || JSON.stringify(e)
}

export default function LoonBemerkingenPage() {
  const { crew } = useSupabaseData()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [remarks, setRemarks] = useState<any[]>([])

  const [crewId, setCrewId] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState("")
  const [updating, setUpdating] = useState(false)

  useEffect(() => setMounted(true), [])

  const crewById = useMemo(() => {
    const map = new Map<string, any>()
    ;(crew || []).forEach((c: any) => map.set(String(c.id), c))
    return map
  }, [crew])

  const crewSorted = useMemo(() => {
    const list = [...(crew || [])].filter((c: any) => !c?.is_dummy)
    list.sort((a: any, b: any) => {
      const an = `${a?.first_name || ""} ${a?.last_name || ""}`.trim().toLowerCase()
      const bn = `${b?.first_name || ""} ${b?.last_name || ""}`.trim().toLowerCase()
      return an.localeCompare(bn)
    })
    return list
  }, [crew])

  const selectedCrew = crewById.get(crewId)
  const selectedCompany = (selectedCrew?.company || "").trim() || "-"

  const loadRemarks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("loon_bemerkingen")
        .select("*")
        .eq("month_key", monthKey)
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("Loon bemerkingen niet geladen:", getErrMsg(error))
        setRemarks([])
        return
      }
      setRemarks(data || [])
    } catch (e) {
      console.warn("Fout bij laden loon bemerkingen:", getErrMsg(e))
      setRemarks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRemarks()
  }, [monthKey])

  const groupedByCompany = useMemo(() => {
    const groups: Record<string, any[]> = {}
    ;(remarks || []).forEach((r: any) => {
      const company = (r?.company || "Onbekende firma").trim() || "Onbekende firma"
      if (!groups[company]) groups[company] = []
      groups[company].push(r)
    })
    return groups
  }, [remarks])

  const currentMonthPart = useMemo(() => {
    const [, month] = (monthKey || "").split("-")
    return month || String(new Date().getMonth() + 1).padStart(2, "0")
  }, [monthKey])

  const currentYearPart = useMemo(() => {
    const [year] = (monthKey || "").split("-")
    return year || String(new Date().getFullYear())
  }, [monthKey])

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => String(now - 4 + i))
  }, [])

  const handleAdd = async () => {
    if (!crewId) {
      alert("Kies eerst een naam.")
      return
    }
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      alert("Vul een reden in.")
      return
    }

    try {
      setSaving(true)
      const payload = {
        crew_id: crewId,
        company: selectedCompany === "-" ? null : selectedCompany,
        month_key: monthKey,
        reason: trimmedReason,
      }
      const { error } = await supabase.from("loon_bemerkingen").insert([payload])
      if (error) throw error

      setCrewId("")
      setReason("")
      await loadRemarks()
    } catch (e) {
      alert(`Fout bij opslaan: ${getErrMsg(e)}`)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (remark: any) => {
    setEditingId(String(remark.id))
    setEditReason(remark.reason || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditReason("")
  }

  const saveEdit = async (id: string) => {
    const trimmed = editReason.trim()
    if (!trimmed) {
      alert("Reden mag niet leeg zijn.")
      return
    }
    try {
      setUpdating(true)
      const { error } = await supabase
        .from("loon_bemerkingen")
        .update({ reason: trimmed, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
      cancelEdit()
      await loadRemarks()
    } catch (e) {
      alert(`Fout bij bewerken: ${getErrMsg(e)}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (remark: any) => {
    const m = crewById.get(String(remark.crew_id))
    const name = m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "Onbekend"
    if (!confirm(`Weet je zeker dat je deze opmerking wilt verwijderen?\n\n${name}`)) return
    try {
      setDeletingId(String(remark.id))
      const { error } = await supabase.from("loon_bemerkingen").delete().eq("id", remark.id)
      if (error) throw error
      await loadRemarks()
    } catch (e) {
      alert(`Fout bij verwijderen: ${getErrMsg(e)}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (!mounted) return null

  return (
    <main className="w-full px-4 py-6">
      <MobileHeaderNav />
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <DashboardButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loon bemerkingen toevoegen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Maand</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={currentMonthPart}
                  onValueChange={(m) => setMonthKey(`${currentYearPart}-${m}`)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                      <SelectItem key={m} value={m}>
                        {monthNumberToDutchName(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={currentYearPart}
                  onValueChange={(y) => setMonthKey(`${y}-${currentMonthPart}`)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="JJJJ" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-gray-500">
                Gekozen: {monthNumberToDutchName(currentMonthPart)} {currentYearPart}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Naam</Label>
              <Select value={crewId} onValueChange={setCrewId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bemanningslid" />
                </SelectTrigger>
                <SelectContent>
                  {crewSorted.map((c: any) => {
                    const id = String(c.id)
                    const name = `${c.first_name || ""} ${c.last_name || ""}`.trim()
                    return (
                      <SelectItem key={id} value={id}>
                        {name || id}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Firma</Label>
              <Input value={selectedCompany} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Reden</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Typ hier de opmerking..." />
            </div>

            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Loon bemerkingen per firma ({monthKeyToDisplay(monthKey)})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Laden...</div>
            ) : remarks.length === 0 ? (
              <div className="text-sm text-gray-500">Nog geen bemerkingen in deze maand.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(groupedByCompany).map(([company, items]) => (
                  <div key={company} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-semibold text-sm mb-3">{company}</div>
                    <div className="space-y-3">
                      {items.map((r: any) => {
                        const m = crewById.get(String(r.crew_id))
                        const name = m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "Onbekend"
                        const isEditing = editingId === String(r.id)
                        return (
                          <Card key={r.id} className="bg-white">
                            <CardContent className="pt-4 space-y-2">
                              <div className="text-sm font-medium">{name}</div>
                              {isEditing ? (
                                <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
                              ) : (
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{r.reason}</div>
                              )}
                              <div className="text-xs text-gray-500">{formatDateTime(r.created_at)}</div>

                              <div className="flex gap-2">
                                {isEditing ? (
                                  <>
                                    <Button size="sm" onClick={() => saveEdit(String(r.id))} disabled={updating}>
                                      {updating ? "Opslaan..." : "Opslaan"}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={updating}>
                                      Annuleer
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => startEdit(r)} disabled={!!deletingId}>
                                      Bewerk
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleDelete(r)}
                                      disabled={deletingId === String(r.id)}
                                    >
                                      {deletingId === String(r.id) ? "Verwijderen..." : "Verwijder"}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

