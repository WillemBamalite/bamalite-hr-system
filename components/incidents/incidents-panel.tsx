"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, Plus, X, Edit, Ship as ShipIcon, User, AlertTriangle, Shield, Wrench, Users, CheckCircle2 } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useAuth } from "@/contexts/AuthContext"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"

export function IncidentsPanel() {
  const { incidents, crew, ships, tasks, loading, addIncident, updateIncident, deleteIncident, addTask } = useSupabaseData()
  const { user } = useAuth()
  const [showDialog, setShowDialog] = useState(false)
  const [selectedIncidentType, setSelectedIncidentType] = useState<"ship" | "crew" | "algemeen" | "veiligheid" | "technisch" | "personeel" | "">("")
  const [selectedShipId, setSelectedShipId] = useState<string>("")
  const [selectedCrewId, setSelectedCrewId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState<"Nautic" | "Leo" | "Jos" | "Willem" | "Bart">("Nautic")
  const [severity, setSeverity] = useState<"laag" | "normaal" | "hoog" | "kritiek">("normaal")
  const [verklaringGemaakt, setVerklaringGemaakt] = useState(false)
  const [verzekeringIngelicht, setVerzekeringIngelicht] = useState(false)
  const [incidentenRapportNodig, setIncidentenRapportNodig] = useState<"ja" | "nee">("nee")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<"open" | "resolved">("open")
  const [isEditing, setIsEditing] = useState(false)
  const [editingIncidentId, setEditingIncidentId] = useState<string>("")
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({})

  // Filter incidents - standaard alleen openstaande incidenten
  const openIncidents = incidents.filter((i: any) => i.status === 'open' || i.status === 'in_behandeling')
  const resolvedIncidents = incidents.filter((i: any) => i.status === 'opgelost' || i.status === 'geannuleerd')
  const filteredIncidents = filter === "open" ? openIncidents : resolvedIncidents

  const resetForm = () => {
    setSelectedIncidentType("")
    setSelectedShipId("")
    setSelectedCrewId("")
    setTitle("")
    setDescription("")
    setAssignedTo("Nautic")
    setSeverity("normaal")
    setVerklaringGemaakt(false)
    setVerzekeringIngelicht(false)
    setIncidentenRapportNodig("nee")
    setIsEditing(false)
    setEditingIncidentId("")
  }

  // Sync lokale status-updates met bestaande data
  useEffect(() => {
    const initial: Record<string, string> = {}
    incidents.forEach((i: any) => {
      const history = Array.isArray(i.status_updates) ? i.status_updates : []
      const latest = history.length ? history[history.length - 1] : null
      if (latest?.text) {
        initial[i.id] = latest.text
      } else if (i.status_update) {
        initial[i.id] = i.status_update
      }
    })
    setStatusUpdates(initial)
  }, [incidents])

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Titel is verplicht")
      return
    }

    if (!selectedIncidentType) {
      alert("Selecteer een incidenttype")
      return
    }

    if (selectedIncidentType === "ship" && !selectedShipId) {
      alert("Selecteer een schip")
      return
    }

    if (selectedIncidentType === "crew" && !selectedCrewId) {
      alert("Selecteer een bemanningslid")
      return
    }

    setIsSubmitting(true)
    try {
      const incidentData: any = {
        title: title.trim(),
        incident_type: selectedIncidentType,
        assigned_to: assignedTo,
        severity: severity,
        reported_date: new Date().toISOString().split('T')[0],
        reported_by: user?.email || null,
        status: 'open',
        description: description.trim() || null,
        verklaring_gemaakt: verklaringGemaakt,
        verzekering_ingelicht: verzekeringIngelicht,
        incidenten_rapport_nodig: incidentenRapportNodig === "ja"
      }

      if (selectedIncidentType === "ship") {
        incidentData.related_ship_id = selectedShipId
        incidentData.related_crew_id = null
      } else if (selectedIncidentType === "crew") {
        incidentData.related_crew_id = selectedCrewId
        incidentData.related_ship_id = null
      } else {
        incidentData.related_crew_id = null
        incidentData.related_ship_id = null
      }

      let createdIncidentId: string | null = null

      if (isEditing && editingIncidentId) {
        // Update bestaand incident
        const updates: any = {
          title: incidentData.title,
          incident_type: selectedIncidentType,
          assigned_to: assignedTo,
          severity: severity,
          description: incidentData.description || null,
          verklaring_gemaakt: verklaringGemaakt,
          verzekering_ingelicht: verzekeringIngelicht,
          incidenten_rapport_nodig: incidentenRapportNodig === "ja"
        }
        if (selectedIncidentType === "ship") {
          updates.related_ship_id = selectedShipId
          updates.related_crew_id = null
        } else if (selectedIncidentType === "crew") {
          updates.related_ship_id = null
          updates.related_crew_id = selectedCrewId
        } else {
          updates.related_ship_id = null
          updates.related_crew_id = null
        }
        await updateIncident(editingIncidentId, updates)
        createdIncidentId = editingIncidentId
      } else {
        // Nieuw incident
        const newIncident = await addIncident(incidentData)
        createdIncidentId = newIncident?.id || null
      }

      // Als "Incidenten rapport nodig" op "ja" staat, maak automatisch een taak aan
      if (incidentenRapportNodig === "ja" && createdIncidentId) {
        // Check of er al een taak bestaat voor dit incident
        const existingTask = tasks.find((t: any) => 
          !t.completed &&
          t.status !== 'completed' &&
          t.title?.toLowerCase().includes('incidenten rapport') && 
          t.description?.includes(title.trim())
        )

        if (!existingTask) {
          // Bepaal het type taak op basis van incident type
          let taskType: "ship" | "crew" | "algemeen" = "algemeen"
          let relatedShipId: string | null = null
          let relatedCrewId: string | null = null

          if (selectedIncidentType === "ship" && selectedShipId) {
            taskType = "ship"
            relatedShipId = selectedShipId
          } else if (selectedIncidentType === "crew" && selectedCrewId) {
            taskType = "crew"
            relatedCrewId = selectedCrewId
          }

          const taskData: any = {
            title: `Incidenten rapport: ${title.trim()}`,
            task_type: taskType,
            assigned_to: assignedTo,
            priority: severity === 'kritiek' ? 'urgent' : severity === 'hoog' ? 'hoog' : 'normaal',
            created_date: new Date().toISOString().split('T')[0],
            description: `Incidenten rapport nodig voor incident: ${title.trim()}\n${description.trim() ? `\nBeschrijving: ${description.trim()}` : ''}`,
            status: 'open',
            completed: false,
            created_by: user?.email || null
          }

          if (relatedShipId) {
            taskData.related_ship_id = relatedShipId
          }
          if (relatedCrewId) {
            taskData.related_crew_id = relatedCrewId
          }

          try {
            await addTask(taskData)
            console.log('✅ Taak aangemaakt voor incidenten rapport')
          } catch (taskError) {
            console.error('❌ Fout bij aanmaken taak voor incidenten rapport:', taskError)
            // Niet blokkerend - toon alleen waarschuwing
            alert('⚠️ Incident aangemaakt, maar taak voor incidenten rapport kon niet worden aangemaakt. Maak handmatig een taak aan.')
          }
        }
      }
      
      resetForm()
      setShowDialog(false)
    } catch (error: any) {
      console.error(`Error ${isEditing ? "updating" : "creating"} incident:`, error)
      const errorMessage = error?.message || error?.error?.message || error?.details || error?.hint || JSON.stringify(error)
      alert(`Fout bij ${isEditing ? "bijwerken" : "aanmaken"} incident: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResolve = async (incidentId: string) => {
    try {
      await updateIncident(incidentId, {
        status: 'opgelost',
        resolved_date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error("Error resolving incident:", error)
      alert("Fout bij oplossen incident")
    }
  }

  const handleCancel = async (incidentId: string) => {
    if (!confirm("Weet je zeker dat je dit incident wilt annuleren?")) return
    try {
      await updateIncident(incidentId, {
        status: 'geannuleerd',
        resolved_date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error("Error cancelling incident:", error)
      alert("Fout bij annuleren incident")
    }
  }

  const handleDelete = async (incidentId: string) => {
    if (!confirm("Weet je zeker dat je dit incident wilt verwijderen?")) return
    try {
      await deleteIncident(incidentId)
    } catch (error) {
      console.error("Error deleting incident:", error)
      alert("Fout bij verwijderen incident")
    }
  }

  const handleChecklistUpdate = async (incidentId: string, field: string, value: boolean) => {
    try {
      // Update de checklist
      await updateIncident(incidentId, { [field]: value })

      // Als "Incidenten rapport nodig" op true wordt gezet (ja), maak automatisch een taak aan
      if (field === 'incidenten_rapport_nodig' && value === true) {
        const incident = incidents.find((i: any) => i.id === incidentId)
        if (!incident) return

        // Check of er al een taak bestaat voor dit incident (niet voltooid)
        const existingTask = tasks.find((t: any) => 
          !t.completed &&
          t.status !== 'completed' &&
          t.title?.toLowerCase().includes('incidenten rapport') && 
          t.description?.includes(incident.title)
        )

        if (!existingTask) {
          // Bepaal het type taak op basis van incident type
          let taskType: "ship" | "crew" | "algemeen" = "algemeen"
          let relatedShipId: string | null = null
          let relatedCrewId: string | null = null

          if (incident.incident_type === "ship" && incident.related_ship_id) {
            taskType = "ship"
            relatedShipId = incident.related_ship_id
          } else if (incident.incident_type === "crew" && incident.related_crew_id) {
            taskType = "crew"
            relatedCrewId = incident.related_crew_id
          }

          const taskData: any = {
            title: `Incidenten rapport: ${incident.title}`,
            task_type: taskType,
            assigned_to: incident.assigned_to || "Nautic",
            priority: incident.severity === 'kritiek' ? 'urgent' : incident.severity === 'hoog' ? 'hoog' : 'normaal',
            created_date: new Date().toISOString().split('T')[0],
            description: `Incidenten rapport nodig voor incident: ${incident.title}\n${incident.description ? `\nBeschrijving: ${incident.description}` : ''}`,
            status: 'open',
            completed: false,
            created_by: user?.email || null
          }

          if (relatedShipId) {
            taskData.related_ship_id = relatedShipId
          }
          if (relatedCrewId) {
            taskData.related_crew_id = relatedCrewId
          }

          try {
            await addTask(taskData)
            console.log('✅ Taak aangemaakt voor incidenten rapport')
          } catch (taskError) {
            console.error('❌ Fout bij aanmaken taak voor incidenten rapport:', taskError)
            // Niet blokkerend - toon alleen waarschuwing
            alert('⚠️ Checklist bijgewerkt, maar taak kon niet worden aangemaakt. Maak handmatig een taak aan voor het incidenten rapport.')
          }
        }
      }
    } catch (error) {
      console.error("Error updating checklist:", error)
      alert("Fout bij bijwerken checklist")
    }
  }

  const handleSaveStatusUpdate = async (incidentId: string) => {
    const updateText = (statusUpdates[incidentId] || '').trim()
    if (!updateText) {
      alert("Vul een statusupdate in")
      return
    }
    try {
      const currentIncident = incidents.find((i: any) => i.id === incidentId) || {}
      const existing = Array.isArray(currentIncident.status_updates) ? currentIncident.status_updates : []
      const newEntry = {
        text: updateText,
        at: new Date().toISOString(),
        by: user?.email || currentIncident.reported_by || 'Onbekend'
      }
      await updateIncident(incidentId, {
        status_update: updateText,
        status_update_at: newEntry.at,
        status_updates: [...existing, newEntry]
      })
      setStatusUpdates((prev) => ({ ...prev, [incidentId]: "" }))
    } catch (error) {
      console.error("Error saving status update:", error)
      alert("Fout bij opslaan statusupdate")
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "kritiek":
        return "bg-red-100 text-red-800 border-red-300"
      case "hoog":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "normaal":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "laag":
        return "bg-gray-100 text-gray-800 border-gray-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colors = getSeverityColor(severity)
    return (
      <Badge className={`${colors} border`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'opgelost':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 border">
            Opgelost
          </Badge>
        )
      case 'in_behandeling':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 border">
            In Behandeling
          </Badge>
        )
      case 'geannuleerd':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300 border">
            Geannuleerd
          </Badge>
        )
      case 'open':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 border">
            Open
          </Badge>
        )
    }
  }

  const getIncidentTypeIcon = (type: string) => {
    switch (type) {
      case 'ship':
        return <ShipIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
      case 'crew':
        return <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
      case 'veiligheid':
        return <Shield className="w-4 h-4 text-red-600 flex-shrink-0" />
      case 'technisch':
        return <Wrench className="w-4 h-4 text-orange-600 flex-shrink-0" />
      case 'personeel':
        return <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
    }
  }

  // Sorteer incidenten op severity: kritiek > hoog > normaal > laag
  const sortIncidentsBySeverity = (incidents: any[]) => {
    const severityOrder: { [key: string]: number } = {
      kritiek: 0,
      hoog: 1,
      normaal: 2,
      laag: 3
    }
    return [...incidents].sort((a, b) => {
      const severityA = severityOrder[a.severity] ?? 99
      const severityB = severityOrder[b.severity] ?? 99
      return severityA - severityB
    })
  }

  if (loading) {
    return <div className="text-center py-8">Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header met filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={filter === "open" ? "default" : "outline"}
            onClick={() => setFilter("open")}
            size="sm"
          >
            Openstaande Incidenten ({openIncidents.length})
          </Button>
          <Button
            variant={filter === "resolved" ? "default" : "outline"}
            onClick={() => setFilter("resolved")}
            size="sm"
          >
            Opgeloste Incidenten ({resolvedIncidents.length})
          </Button>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nieuw Incident
        </Button>
      </div>

      {/* Incidenten lijst */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          Geen incidenten
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortIncidentsBySeverity(filteredIncidents).map((incident: any) => {
            const relatedShip = incident.related_ship_id
              ? ships.find((s: any) => s.id === incident.related_ship_id)
              : null
            const relatedCrew = incident.related_crew_id
              ? crew.find((c: any) => c.id === incident.related_crew_id)
              : null

            return (
              <Card key={incident.id} className={incident.status === 'opgelost' || incident.status === 'geannuleerd' ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-base ${incident.status === 'opgelost' || incident.status === 'geannuleerd' ? "line-through" : ""}`}>
                          {incident.title}
                        </h3>
                        {incident.description && (
                          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{incident.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* Status en Severity Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(incident.status)}
                        {getSeverityBadge(incident.severity)}
                      </div>

                      <div className="flex items-center gap-2">
                        {getIncidentTypeIcon(incident.incident_type)}
                        <span className="text-gray-600">
                          {incident.incident_type === "ship"
                            ? relatedShip?.name || "Onbekend schip"
                            : incident.incident_type === "crew"
                            ? relatedCrew
                              ? `${relatedCrew.first_name} ${relatedCrew.last_name}`
                              : "Onbekend persoon"
                            : incident.incident_type.charAt(0).toUpperCase() + incident.incident_type.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span className="text-gray-600 text-xs">
                          Toegewezen aan: {incident.assigned_to || "Niet toegewezen"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span className="text-gray-600 text-xs">
                          {incident.reported_at 
                            ? format(new Date(incident.reported_at), "d MMM yyyy, HH:mm", { locale: nl })
                            : incident.reported_date 
                              ? format(new Date(incident.reported_date), "d MMM yyyy", { locale: nl })
                              : incident.created_at
                                ? format(new Date(incident.created_at), "d MMM yyyy, HH:mm", { locale: nl })
                                : "Onbekende datum"}
                        </span>
                      </div>

                      {incident.reported_by && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-gray-600 text-xs">
                            Gemeld door: {incident.reported_by}
                          </span>
                        </div>
                      )}

                      {incident.resolved_date && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-green-600 text-xs">
                            Opgelost op: {format(new Date(incident.resolved_date), "d MMM yyyy", { locale: nl })}
                          </span>
                        </div>
                      )}

                      {/* Checklist */}
                      {(incident.status === 'open' || incident.status === 'in_behandeling') && (
                        <div className="pt-2 border-t space-y-2">
                          <div className="text-xs font-semibold text-gray-700 mb-1">Checklist:</div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`verklaring-${incident.id}`}
                              checked={incident.verklaring_gemaakt || false}
                              onCheckedChange={(checked) => 
                                handleChecklistUpdate(incident.id, 'verklaring_gemaakt', checked === true)
                              }
                            />
                            <Label 
                              htmlFor={`verklaring-${incident.id}`}
                              className={`text-xs cursor-pointer ${incident.verklaring_gemaakt ? 'line-through text-gray-500' : 'text-gray-700'}`}
                            >
                              Verklaring gemaakt
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`verzekering-${incident.id}`}
                              checked={incident.verzekering_ingelicht || false}
                              onCheckedChange={(checked) => 
                                handleChecklistUpdate(incident.id, 'verzekering_ingelicht', checked === true)
                              }
                            />
                            <Label 
                              htmlFor={`verzekering-${incident.id}`}
                              className={`text-xs cursor-pointer ${incident.verzekering_ingelicht ? 'line-through text-gray-500' : 'text-gray-700'}`}
                            >
                              Verzekering ingelicht
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-700">Incidenten rapport nodig:</Label>
                            <Select
                              value={incident.incidenten_rapport_nodig ? "ja" : "nee"}
                              onValueChange={(value: "ja" | "nee") => 
                                handleChecklistUpdate(incident.id, 'incidenten_rapport_nodig', value === "ja")
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nee">Nee</SelectItem>
                                <SelectItem value="ja">Ja</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Status updates weergave */}
                      {(() => {
                        const history = Array.isArray(incident.status_updates) ? [...incident.status_updates] : []
                        if (!history.length && incident.status_update) {
                          history.push({
                            text: incident.status_update,
                            at: incident.status_update_at,
                            by: incident.reported_by || 'Onbekend'
                          })
                        }
                        if (!history.length) return null
                        return (
                          <div className="pt-2 border-t space-y-2">
                            <div className="text-xs font-semibold text-gray-700 mb-1">Updates:</div>
                            {history.slice().reverse().map((entry: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm space-y-1">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <AlertCircle className="w-3 h-3 text-blue-600" />
                                  <span className="font-medium text-xs">Update</span>
                                  {entry.at && (
                                    <span className="text-xs text-gray-500">
                                      {format(new Date(entry.at), "d MMM, HH:mm", { locale: nl })}
                                    </span>
                                  )}
                                  {entry.by && (
                                    <span className="text-xs text-gray-500">— {entry.by}</span>
                                  )}
                                </div>
                                <div className="text-gray-700 whitespace-pre-wrap break-words text-xs">
                                  {entry.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                    <div className="flex flex-col gap-3 pt-3 border-t">
                      {incident.status === 'open' || incident.status === 'in_behandeling' ? (
                        <>
                          {/* Status update input */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Statusupdate</Label>
                            <Textarea
                              rows={2}
                              value={statusUpdates[incident.id] ?? ""}
                              onChange={(e) => setStatusUpdates((prev) => ({ ...prev, [incident.id]: e.target.value }))}
                              placeholder="Geef een update over het incident..."
                              className="text-sm"
                            />
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSaveStatusUpdate(incident.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Update Opslaan
                            </Button>
                          </div>

                          {/* Actie knoppen */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditing(true)
                                setEditingIncidentId(incident.id)
                                setShowDialog(true)
                                setSelectedIncidentType(incident.incident_type)
                                setSelectedShipId(incident.related_ship_id || "")
                                setSelectedCrewId(incident.related_crew_id || "")
                                setTitle(incident.title || "")
                                setDescription(incident.description || "")
                                setAssignedTo(incident.assigned_to || "Nautic")
                                setSeverity(incident.severity || "normaal")
                                setVerklaringGemaakt(incident.verklaring_gemaakt || false)
                                setVerzekeringIngelicht(incident.verzekering_ingelicht || false)
                                setIncidentenRapportNodig(incident.incidenten_rapport_nodig ? "ja" : "nee")
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <Edit className="w-4 h-4" />
                              Bewerken
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleResolve(incident.id)}
                              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700"
                            >
                              Oplossen
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Nieuw incident dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open)
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Incident Bewerken" : "Nieuw Incident Aanmaken"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. Motorstoring op schip"
              />
            </div>

            <div>
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionele beschrijving van het incident"
                rows={3}
              />
            </div>

            <div>
              <Label>Incidenttype *</Label>
              <Select
                value={selectedIncidentType}
                onValueChange={(value: "ship" | "crew" | "algemeen" | "veiligheid" | "technisch" | "personeel") => {
                  setSelectedIncidentType(value)
                  setSelectedShipId("")
                  setSelectedCrewId("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer incidenttype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Schip</SelectItem>
                  <SelectItem value="crew">Bemanningslid</SelectItem>
                  <SelectItem value="veiligheid">Veiligheid</SelectItem>
                  <SelectItem value="technisch">Technisch</SelectItem>
                  <SelectItem value="personeel">Personeel</SelectItem>
                  <SelectItem value="algemeen">Algemeen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedIncidentType === "ship" && (
              <div>
                <Label>Schip *</Label>
                <Select value={selectedShipId} onValueChange={setSelectedShipId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een schip" />
                  </SelectTrigger>
                  <SelectContent>
                    {ships.map((ship: any) => (
                      <SelectItem key={ship.id} value={ship.id}>
                        {ship.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedIncidentType === "crew" && (
              <div>
                <Label>Bemanningslid *</Label>
                <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een bemanningslid" />
                  </SelectTrigger>
                  <SelectContent>
                    {crew
                      .filter((c: any) => c.status !== "uit-dienst")
                      .map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} - {member.position}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Toegewezen aan *</Label>
              <Select
                value={assignedTo}
                onValueChange={(value: "Nautic" | "Leo" | "Jos" | "Willem" | "Bart") => setAssignedTo(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nautic">Nautic</SelectItem>
                  <SelectItem value="Leo">Leo</SelectItem>
                  <SelectItem value="Jos">Jos</SelectItem>
                  <SelectItem value="Willem">Willem</SelectItem>
                  <SelectItem value="Bart">Bart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ernst *</Label>
              <Select
                value={severity}
                onValueChange={(value: "laag" | "normaal" | "hoog" | "kritiek") => setSeverity(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laag">Laag</SelectItem>
                  <SelectItem value="normaal">Normaal</SelectItem>
                  <SelectItem value="hoog">Hoog</SelectItem>
                  <SelectItem value="kritiek">Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-semibold">Checklist:</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verklaring-gemaakt"
                  checked={verklaringGemaakt}
                  onCheckedChange={(checked) => setVerklaringGemaakt(checked === true)}
                />
                <Label
                  htmlFor="verklaring-gemaakt"
                  className="text-sm font-normal cursor-pointer"
                >
                  Verklaring gemaakt
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verzekering-ingelicht"
                  checked={verzekeringIngelicht}
                  onCheckedChange={(checked) => setVerzekeringIngelicht(checked === true)}
                />
                <Label
                  htmlFor="verzekering-ingelicht"
                  className="text-sm font-normal cursor-pointer"
                >
                  Verzekering ingelicht
                </Label>
              </div>
              <div>
                <Label className="text-sm font-semibold">Incidenten rapport nodig *</Label>
                <Select
                  value={incidentenRapportNodig}
                  onValueChange={(value: "ja" | "nee") => setIncidentenRapportNodig(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nee">Nee</SelectItem>
                    <SelectItem value="ja">Ja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Opslaan..." : "Aanmaken...") : (isEditing ? "Opslaan" : "Incident Aanmaken")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

