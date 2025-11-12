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
import { ListTodo, Plus, AlertCircle, CheckCircle2, X, Calendar, User, Ship as ShipIcon, Clock, Flag, Edit } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useAuth } from "@/contexts/AuthContext"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { nl } from "date-fns/locale"

export function TasksPanel() {
  const { tasks, crew, ships, loading, addTask, updateTask, deleteTask, completeTask } = useSupabaseData()
  const { user } = useAuth()
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTaskType, setSelectedTaskType] = useState<"ship" | "crew" | "">("")
  const [selectedShipId, setSelectedShipId] = useState<string>("")
  const [selectedCrewId, setSelectedCrewId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState<"Nautic" | "Leo" | "Jos" | "Willem">("Nautic")
  const [priority, setPriority] = useState<"laag" | "normaal" | "hoog" | "urgent">("normaal")
  const [deadline, setDeadline] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<"open" | "completed">("open")
  const [isEditing, setIsEditing] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string>("")

  // Filter tasks - standaard alleen openstaande taken
  const openTasks = tasks.filter((t: any) => !t.completed)
  const completedTasks = tasks.filter((t: any) => t.completed)
  const filteredTasks = filter === "open" ? openTasks : completedTasks

  // Group tasks by assigned person
  const tasksByPerson = {
    Nautic: filteredTasks.filter((t: any) => t.assigned_to === "Nautic"),
    Leo: filteredTasks.filter((t: any) => t.assigned_to === "Leo"),
    Willem: filteredTasks.filter((t: any) => t.assigned_to === "Willem"),
    Jos: filteredTasks.filter((t: any) => t.assigned_to === "Jos")
  }

  const resetForm = () => {
    setSelectedTaskType("")
    setSelectedShipId("")
    setSelectedCrewId("")
    setTitle("")
    setDescription("")
    setAssignedTo("Nautic")
    setPriority("normaal")
    setDeadline("")
    setIsEditing(false)
    setEditingTaskId("")
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Titel is verplicht")
      return
    }

    if (!selectedTaskType) {
      alert("Selecteer een taaktype (Schip of Bemanningslid)")
      return
    }

    if (selectedTaskType === "ship" && !selectedShipId) {
      alert("Selecteer een schip")
      return
    }

    if (selectedTaskType === "crew" && !selectedCrewId) {
      alert("Selecteer een bemanningslid")
      return
    }

    setIsSubmitting(true)
    try {
      const taskData: any = {
        title: title.trim(),
        task_type: selectedTaskType,
        assigned_to: assignedTo,
        priority: priority,
        created_date: new Date().toISOString().split('T')[0],
        created_by: user?.email || null,
        description: description.trim() || null,
      }

      if (selectedTaskType === "ship") {
        taskData.related_ship_id = selectedShipId
        taskData.related_crew_id = null
      } else {
        taskData.related_crew_id = selectedCrewId
        taskData.related_ship_id = null
      }

      if (deadline) {
        taskData.deadline = deadline
      }

      if (isEditing && editingTaskId) {
        // Update bestaande taak
        const updates: any = {
          title: taskData.title,
          task_type: selectedTaskType,
          assigned_to: assignedTo,
          priority: priority,
          description: taskData.description || null
        }
        if (deadline) updates.deadline = deadline
        if (selectedTaskType === "ship") {
          updates.related_ship_id = selectedShipId
          updates.related_crew_id = null
        } else {
          updates.related_ship_id = null
          updates.related_crew_id = selectedCrewId
        }
        await updateTask(editingTaskId, updates)
      } else {
        // Nieuwe taak
        await addTask(taskData)
      }
      
      // Verstuur e-mail alleen bij nieuwe taken, niet bij bewerken
      if (!isEditing) {
        try {
          console.log('📧 ===== START E-MAIL VERSTUREN =====')
          const relatedShip = selectedTaskType === "ship" && selectedShipId
            ? ships.find((s: any) => s.id === selectedShipId)
            : null
          const relatedCrew = selectedTaskType === "crew" && selectedCrewId
            ? crew.find((c: any) => c.id === selectedCrewId)
            : null

          const emailPayload = {
            assignedTo,
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority,
            deadline: taskData.deadline || null,
            relatedShipName: relatedShip ? relatedShip.name : null,
            relatedCrewName: relatedCrew ? `${relatedCrew.first_name} ${relatedCrew.last_name}` : null,
            createdBy: user?.email || null,
          }
          
          console.log('📧 E-mail payload:', JSON.stringify(emailPayload, null, 2))
          console.log('📧 Verstuur naar API: /api/send-task-email')

          // Probeer eerst Resend, fallback naar Gmail als Resend niet werkt
          // Dit gebeurt automatisch in de API route - hier gebruiken we gewoon de normale route
          const emailResponse = await fetch('/api/send-task-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
          })

          console.log('📧 E-mail API response status:', emailResponse.status)
          console.log('📧 E-mail API response ok:', emailResponse.ok)

          if (!emailResponse.ok) {
            try {
              const emailResult = await emailResponse.json()
              const errorMsg = emailResult.message || emailResult.error || 'Onbekende fout'
              console.error('❌ E-mail niet verstuurd:', errorMsg)
              console.error('❌ Response status:', emailResponse.status)
              console.error('❌ Full response:', JSON.stringify(emailResult, null, 2))
              
              // Toon foutmelding aan gebruiker (optioneel - niet blokkerend)
              alert(`⚠️ Taak aangemaakt, maar e-mail kon niet worden verstuurd: ${errorMsg}`)
            } catch (parseError) {
              const text = await emailResponse.text()
              console.error('❌ E-mail niet verstuurd (status:', emailResponse.status, ')')
              console.error('❌ Response text:', text)
              alert(`⚠️ Taak aangemaakt, maar e-mail kon niet worden verstuurd (status: ${emailResponse.status})`)
            }
          } else {
            try {
              const emailResult = await emailResponse.json()
              console.log('✅ E-mail response:', JSON.stringify(emailResult, null, 2))
              
              if (emailResult.results && Array.isArray(emailResult.results)) {
                const successCount = emailResult.results.filter((r: any) => r.success).length
                const totalCount = emailResult.results.length
                console.log(`✅ ${successCount}/${totalCount} e-mails succesvol verstuurd`)
                
                emailResult.results.forEach((result: any) => {
                  if (result.success) {
                    console.log(`  ✅ ${result.recipient}: Message ID ${result.messageId}`)
                  } else {
                    console.error(`  ❌ ${result.recipient}: ${result.error?.message || result.error || 'Onbekende fout'}`)
                  }
                })
                
                if (successCount === 0) {
                  console.error('❌ Geen e-mails succesvol verstuurd!')
                  alert(`⚠️ Taak aangemaakt, maar e-mails konden niet worden verstuurd. Check de console voor details.`)
                } else if (successCount < totalCount) {
                  console.warn(`⚠️ Slechts ${successCount}/${totalCount} e-mails succesvol verstuurd`)
                } else {
                  console.log('✅ Alle e-mails succesvol verstuurd!')
                }
              } else if (emailResult.success) {
                console.log('✅ E-mail succesvol verstuurd!', emailResult)
              } else {
                console.error('❌ E-mail versturen gefaald:', emailResult.error || emailResult.message)
                alert(`⚠️ Taak aangemaakt, maar e-mail kon niet worden verstuurd: ${emailResult.error || emailResult.message}`)
              }
            } catch (parseError) {
              console.error('❌ Kon e-mail response niet parsen:', parseError)
              const text = await emailResponse.text()
              console.error('❌ Response text:', text)
            }
          }
          
          console.log('📧 ===== EINDE E-MAIL VERSTUREN =====')
        } catch (emailError) {
          console.error('❌ Exception bij versturen e-mail:', emailError)
          console.error('❌ Error details:', JSON.stringify(emailError, null, 2))
          // Toon foutmelding aan gebruiker (optioneel - niet blokkerend)
          alert(`⚠️ Taak aangemaakt, maar e-mail kon niet worden verstuurd: ${emailError instanceof Error ? emailError.message : 'Onbekende fout'}`)
        }
      }
      
      resetForm()
      setShowDialog(false)
    } catch (error: any) {
      console.error(`Error ${isEditing ? "updating" : "creating"} task:`, error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error)
      alert(`Fout bij ${isEditing ? "bijwerken" : "aanmaken"} taak: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async (taskId: string) => {
    try {
      await completeTask(taskId)
    } catch (error) {
      console.error("Error completing task:", error)
      alert("Fout bij voltooien taak")
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) return
    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error("Error deleting task:", error)
      alert("Fout bij verwijderen taak")
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300"
      case "hoog":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "normaal":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "laag":
        return "bg-gray-100 text-gray-800 border-gray-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getPriorityBadge = (priority: string) => {
    const colors = getPriorityColor(priority)
    return (
      <Badge className={`${colors} border`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null
    const deadlineDate = new Date(deadline)
    const daysUntil = differenceInDays(deadlineDate, new Date())
    
    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return { text: "Verlopen", color: "text-red-600", bg: "bg-red-50" }
    }
    if (isToday(deadlineDate)) {
      return { text: "Vandaag", color: "text-orange-600", bg: "bg-orange-50" }
    }
    if (daysUntil <= 3) {
      return { text: `${daysUntil} dagen`, color: "text-orange-600", bg: "bg-orange-50" }
    }
    return { text: `${daysUntil} dagen`, color: "text-gray-600", bg: "bg-gray-50" }
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
            Openstaande Taken ({openTasks.length})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            size="sm"
          >
            Voltooide Taken ({completedTasks.length})
          </Button>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nieuwe Taak
        </Button>
      </div>

      {/* Taken lijst in 4 kolommen */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {(["Nautic", "Leo", "Willem", "Jos"] as const).map((person) => {
          const personTasks = tasksByPerson[person]
          const openCount = personTasks.filter((t: any) => !t.completed).length
          const completedCount = personTasks.filter((t: any) => t.completed).length

          return (
            <div key={person} className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="font-bold">{person}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        {openCount} open
                      </Badge>
                      {completedCount > 0 && (
                        <Badge variant="outline" className="text-sm text-gray-500">
                          {completedCount} voltooid
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {personTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Geen taken
                    </div>
                  ) : (
                    personTasks.map((task: any) => {
                      const relatedShip = task.related_ship_id
                        ? ships.find((s: any) => s.id === task.related_ship_id)
                        : null
                      const relatedCrew = task.related_crew_id
                        ? crew.find((c: any) => c.id === task.related_crew_id)
                        : null
                      const deadlineStatus = getDeadlineStatus(task.deadline)

                      return (
                        <Card key={task.id} className={task.completed ? "opacity-60" : ""}>
                          <CardContent className="p-5">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                {task.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <ListTodo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className={`font-semibold text-base ${task.completed ? "line-through" : ""}`}>
                                    {task.title}
                                  </h3>
                                  {task.description && (
                                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{task.description}</p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  {task.task_type === "ship" ? (
                                    <ShipIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  ) : (
                                    <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  )}
                                  <span className="text-gray-600 truncate">
                                    {task.task_type === "ship"
                                      ? relatedShip?.name || "Onbekend schip"
                                      : relatedCrew
                                      ? `${relatedCrew.first_name} ${relatedCrew.last_name}`
                                      : "Onbekend persoon"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                  <span className="text-gray-600 text-xs">
                                    {task.created_at 
                                      ? format(new Date(task.created_at), "d MMM yyyy, HH:mm", { locale: nl })
                                      : task.created_date 
                                        ? format(new Date(task.created_date), "d MMM yyyy", { locale: nl })
                                        : "Onbekende datum"}
                                  </span>
                                </div>

                                {task.created_by && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                    <span className="text-gray-600 text-xs">
                                      Door: {task.created_by}
                                    </span>
                                  </div>
                                )}

                                {task.deadline && (
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${deadlineStatus?.bg || "bg-gray-50"}`}>
                                    <Clock className={`w-4 h-4 ${deadlineStatus?.color || "text-gray-600"} flex-shrink-0`} />
                                    <span className={deadlineStatus?.color || "text-gray-600"}>
                                      {format(new Date(task.deadline), "d MMM yyyy", { locale: nl })} ({deadlineStatus?.text})
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-3 pt-3 border-t">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>{getPriorityBadge(task.priority)}</div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {!task.completed && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setIsEditing(true)
                                          setEditingTaskId(task.id)
                                          setShowDialog(true)
                                          setSelectedTaskType(task.task_type)
                                          setSelectedShipId(task.related_ship_id || "")
                                          setSelectedCrewId(task.related_crew_id || "")
                                          setTitle(task.title || "")
                                          setDescription(task.description || "")
                                          setAssignedTo(task.assigned_to)
                                          setPriority(task.priority)
                                          setDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "")
                                        }}
                                        className="flex items-center gap-1.5"
                                      >
                                        <Edit className="w-4 h-4" />
                                        Bewerken
                                      </Button>
                                    )}
                                    {!task.completed && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleComplete(task.id)}
                                        className="flex items-center gap-1.5"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Voltooien
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(task.id)}
                                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Nieuwe taak dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open)
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Taak Bewerken" : "Nieuwe Taak Aanmaken"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. Reparatie schip aanvragen"
              />
            </div>

            <div>
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionele beschrijving van de taak"
                rows={3}
              />
            </div>

            <div>
              <Label>Taaktype *</Label>
              <Select
                value={selectedTaskType}
                onValueChange={(value: "ship" | "crew") => {
                  setSelectedTaskType(value)
                  setSelectedShipId("")
                  setSelectedCrewId("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer taaktype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Schip</SelectItem>
                  <SelectItem value="crew">Bemanningslid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTaskType === "ship" && (
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

            {selectedTaskType === "crew" && (
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
                onValueChange={(value: "Nautic" | "Leo" | "Jos" | "Willem") => setAssignedTo(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nautic">Nautic</SelectItem>
                  <SelectItem value="Leo">Leo</SelectItem>
                  <SelectItem value="Jos">Jos</SelectItem>
                  <SelectItem value="Willem">Willem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioriteit *</Label>
              <Select
                value={priority}
                onValueChange={(value: "laag" | "normaal" | "hoog" | "urgent") => setPriority(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laag">Laag</SelectItem>
                  <SelectItem value="normaal">Normaal</SelectItem>
                  <SelectItem value="hoog">Hoog</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deadline">Deadline (optioneel)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Opslaan..." : "Aanmaken...") : (isEditing ? "Opslaan" : "Taak Aanmaken")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
