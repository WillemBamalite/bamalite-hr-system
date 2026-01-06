"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ListTodo, Plus, AlertCircle, CheckCircle2, X, Calendar, User, Ship as ShipIcon, Clock, Flag, Edit } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useAuth } from "@/contexts/AuthContext"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { nl } from "date-fns/locale"
import { supabase } from "@/lib/supabase"

export function TasksPanel() {
  const searchParams = useSearchParams()
  const highlightedTaskId = searchParams.get('taskId')
  const { tasks, crew, ships, loading, addTask, updateTask, deleteTask, completeTask } = useSupabaseData()
  const { user } = useAuth()
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTaskType, setSelectedTaskType] = useState<"ship" | "crew" | "algemeen" | "">("")
  const [selectedShipId, setSelectedShipId] = useState<string>("")
  const [selectedCrewId, setSelectedCrewId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState<"Nautic" | "Leo" | "Jos" | "Willem" | "Bart">("Nautic")
  const [priority, setPriority] = useState<"laag" | "normaal" | "hoog" | "urgent">("normaal")
  const [deadline, setDeadline] = useState("")
  const [addToAgenda, setAddToAgenda] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<"open" | "completed">("open")
  const [isEditing, setIsEditing] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string>("")
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({})
  const assignees = ["Nautic", "Leo", "Willem", "Jos", "Bart"] as const
  const [selectedAssignee, setSelectedAssignee] = useState<(typeof assignees)[number]>("Nautic")

  // Hulp: bepaal assignee naam op basis van e-mail
  const resolveAssigneeFromEmail = (email: string | null | undefined): (typeof assignees)[number] | null => {
    if (!email) return null
    const lower = email.toLowerCase()
    if (lower.includes("nautic")) return "Nautic"
    if (lower.includes("leo")) return "Leo"
    if (lower.includes("willem")) return "Willem"
    if (lower.includes("jos")) return "Jos"
    if (lower.includes("bart")) return "Bart"
    return null
  }

  // Filter tasks - standaard alleen openstaande taken (niet voltooid)
  // Open tasks include both 'open' and 'in_progress' status
  const openTasks = tasks.filter((t: any) => !t.completed && t.status !== 'completed')
  const completedTasks = tasks.filter((t: any) => t.completed || t.status === 'completed')
  const filteredTasks = filter === "open" ? openTasks : completedTasks

  // Sync lokale status-updates met bestaande data (pak laatste entry uit status_updates)
  useEffect(() => {
    const initial: Record<string, string> = {}
    tasks.forEach((t: any) => {
      const history = Array.isArray(t.status_updates) ? t.status_updates : []
      const latest = history.length ? history[history.length - 1] : null
      if (latest?.text) {
        initial[t.id] = latest.text
      } else if (t.status_update) {
        initial[t.id] = t.status_update
      }
    })
    setStatusUpdates(initial)
  }, [tasks])

  // Helper to check if task belongs to person (either assigned_to or taken_by)
  const taskBelongsToPerson = (task: any, person: string): boolean => {
    // Task is assigned to this person
    if (task.assigned_to === person) return true
    
    // Task was taken by this person (check email)
    if (task.taken_by) {
      const takenByLower = task.taken_by.toLowerCase()
      const personLower = person.toLowerCase()
      if (takenByLower.includes(personLower)) return true
    }
    
    return false
  }

  // Group tasks by assigned person (includes tasks taken by that person)
  const tasksByPerson = {
    Nautic: filteredTasks.filter((t: any) => t.assigned_to === "Nautic"),
    Leo: filteredTasks.filter((t: any) => taskBelongsToPerson(t, "Leo")),
    Willem: filteredTasks.filter((t: any) => taskBelongsToPerson(t, "Willem")),
    Jos: filteredTasks.filter((t: any) => taskBelongsToPerson(t, "Jos")),
    Bart: filteredTasks.filter((t: any) => taskBelongsToPerson(t, "Bart"))
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
    setAddToAgenda(false)
    setIsEditing(false)
    setEditingTaskId("")
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Titel is verplicht")
      return
    }

    if (!selectedTaskType) {
      alert("Selecteer een taaktype (Schip, Bemanningslid of Algemeen)")
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
        status: 'open', // Default status for new tasks
        completed: false
      }

      if (selectedTaskType === "ship") {
        taskData.related_ship_id = selectedShipId
        taskData.related_crew_id = null
      } else if (selectedTaskType === "crew") {
        taskData.related_crew_id = selectedCrewId
        taskData.related_ship_id = null
      } else {
        taskData.related_crew_id = null
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
        } else if (selectedTaskType === "crew") {
          updates.related_ship_id = null
          updates.related_crew_id = selectedCrewId
        } else {
          updates.related_ship_id = null
          updates.related_crew_id = null
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

      // Toevoegen aan agenda als gevraagd (zowel bij nieuw als bij bewerken)
      if (addToAgenda && deadline) {
        try {
          const relatedShip = selectedTaskType === "ship" && selectedShipId
            ? ships.find((s: any) => s.id === selectedShipId)
            : null
          const relatedCrew = selectedTaskType === "crew" && selectedCrewId
            ? crew.find((c: any) => c.id === selectedCrewId)
            : null

          const agendaDescription = description.trim() || 
            `Taak: ${title}${relatedShip ? ` - Schip: ${relatedShip.name}` : ''}${relatedCrew ? ` - Bemanningslid: ${relatedCrew.first_name} ${relatedCrew.last_name}` : ''}`

          const agendaItem = {
            title: title.trim(),
            description: agendaDescription,
            date: deadline, // Gebruik deadline als datum
            time: null,
            voor_wie: assignedTo
          }

          const { error: agendaError } = await supabase
            .from('agenda_items')
            .insert([agendaItem])

          if (agendaError) {
            console.error('❌ Fout bij toevoegen aan agenda:', agendaError)
            // Niet blokkerend - toon alleen waarschuwing
            alert(`⚠️ Taak ${isEditing ? 'bijgewerkt' : 'aangemaakt'}, maar kon niet worden toegevoegd aan agenda: ${agendaError.message}`)
          } else {
            console.log('✅ Taak toegevoegd aan agenda')
          }
        } catch (agendaError) {
          console.error('❌ Exception bij toevoegen aan agenda:', agendaError)
          // Niet blokkerend
          alert(`⚠️ Taak ${isEditing ? 'bijgewerkt' : 'aangemaakt'}, maar kon niet worden toegevoegd aan agenda: ${agendaError instanceof Error ? agendaError.message : 'Onbekende fout'}`)
        }
      }
      
      resetForm()
      setShowDialog(false)
    } catch (error: any) {
      console.error(`Error ${isEditing ? "updating" : "creating"} task:`, error)
      console.error('Error code:', error?.code)
      console.error('Error message:', error?.message)
      console.error('Error details:', error?.details)
      console.error('Error hint:', error?.hint)
      console.error('Full error:', JSON.stringify(error, null, 2))
      const errorMessage = error?.message || error?.error?.message || error?.details || error?.hint || JSON.stringify(error)
      alert(`Fout bij ${isEditing ? "bijwerken" : "aanmaken"} taak: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async (taskId: string) => {
    try {
      await updateTask(taskId, {
        status: 'completed',
        completed: true,
        completed_at: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error completing task:", error)
      alert("Fout bij voltooien taak")
    }
  }

  const handleTakeTask = async (taskId: string) => {
    try {
      const currentUser = user?.email || 'Onbekend'
      // Don't change assigned_to - task stays at original assignee (e.g. Nautic)
      // Only set taken_by so we know who picked it up
      await updateTask(taskId, {
        status: 'in_progress',
        taken_by: currentUser,
        taken_at: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error taking task:", error)
      alert("Fout bij oppakken taak")
    }
  }

  const handleReleaseTask = async (taskId: string) => {
    try {
      await updateTask(taskId, {
        status: 'open',
        taken_by: null,
        taken_at: null
      })
    } catch (error) {
      console.error("Error releasing task:", error)
      alert("Fout bij vrijgeven taak")
    }
  }

  const handleSaveStatusUpdate = async (taskId: string) => {
    const updateText = (statusUpdates[taskId] || '').trim()
    if (!updateText) {
      alert("Vul een statusupdate in")
      return
    }
    try {
      const currentTask = tasks.find((t: any) => t.id === taskId) || {}
      const existing = Array.isArray(currentTask.status_updates) ? currentTask.status_updates : []
      const newEntry = {
        text: updateText,
        at: new Date().toISOString(),
        by: user?.email || currentTask.taken_by || currentTask.created_by || 'Onbekend'
      }
      await updateTask(taskId, {
        status_update: updateText,
        status_update_at: newEntry.at,
        status_updates: [...existing, newEntry]
      })
      setStatusUpdates((prev) => ({ ...prev, [taskId]: "" }))
    } catch (error) {
      console.error("Error saving status update:", error)
      alert("Fout bij opslaan statusupdate")
    }
  }

  const getStatusBadge = (status: string | null, completed: boolean) => {
    // If task is completed, always show completed status
    if (completed || status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 border">
          Voltooid
        </Badge>
      )
    }
    
    switch (status) {
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 border">
            In Behandeling
          </Badge>
        )
      case 'open':
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300 border">
            Open
          </Badge>
        )
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

  // Sorteer taken op prioriteit: urgent > hoog > normaal > laag
  const sortTasksByPriority = (tasks: any[]) => {
    const priorityOrder: { [key: string]: number } = {
      urgent: 0,
      hoog: 1,
      normaal: 2,
      laag: 3
    }
    return [...tasks].sort((a, b) => {
      const priorityA = priorityOrder[a.priority] ?? 99
      const priorityB = priorityOrder[b.priority] ?? 99
      return priorityA - priorityB
    })
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

  return <div className="space-y-6">
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

      {/* Tabs per assignee */}
      <div className="flex items-center gap-2 mb-4">
        {assignees.map((person) => (
          <button
            key={person}
            onClick={() => setSelectedAssignee(person)}
            className={`px-4 py-2 rounded border text-sm font-medium flex items-center gap-2 ${
              selectedAssignee === person
                ? "bg-white border-gray-300 text-gray-900 shadow-sm"
                : "bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-800"
            }`}
          >
            {person === "Nautic" && <ListTodo className="w-4 h-4" />}
            {person === "Leo" && <User className="w-4 h-4" />}
            {person === "Willem" && <User className="w-4 h-4" />}
            {person === "Jos" && <User className="w-4 h-4" />}
            {person === "Bart" && <User className="w-4 h-4" />}
            <span>{person} ({tasksByPerson[person].filter((t: any) => !t.completed).length})</span>
          </button>
        ))}
      </div>

      {/* Taken lijst voor geselecteerde assignee (verdeeld in kolommen per type) */}
      {[selectedAssignee].map((person) => {
        const personTasks = tasksByPerson[person]
        const openCount = personTasks.filter((t: any) => !t.completed).length
        const completedCount = personTasks.filter((t: any) => t.completed).length

        // Verdeel taken per type
        const shipTasks = sortTasksByPriority(personTasks.filter((t: any) => t.task_type === "ship"))
        const crewTasks = sortTasksByPriority(personTasks.filter((t: any) => t.task_type === "crew"))
        const algemeenTasks = sortTasksByPriority(personTasks.filter((t: any) => t.task_type === "algemeen"))

        return (
          <div key={`person-${person}`} className="space-y-4" id={`task-person-${person}`}>
            {/* Header met persoon naam en counts */}
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-xl font-bold">{person}</h2>
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
            </div>

            {/* Taken verdeeld in 3 kolommen per type (onder elkaar) */}
            {personTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Geen taken
              </div>
            ) : (
              <div className="space-y-6">
                {/* Kolom 1: Schepen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShipIcon className="w-5 h-5 text-blue-600" />
                    Schepen
                    <Badge variant="outline" className="text-xs">
                      {shipTasks.length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shipTasks.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Geen taken
                      </div>
                    ) : (
                      shipTasks.map((task: any) => {
                        const relatedShip = task.related_ship_id
                        ? ships.find((s: any) => s.id === task.related_ship_id)
                        : null
                      const relatedCrew = task.related_crew_id
                        ? crew.find((c: any) => c.id === task.related_crew_id)
                        : null
                      const deadlineStatus = getDeadlineStatus(task.deadline)

                      const isHighlighted = highlightedTaskId === task.id
                      return (
                        <Card 
                          key={task.id} 
                          className={`${task.completed ? "opacity-60" : ""} ${isHighlighted ? "ring-4 ring-orange-400 ring-offset-2" : ""}`}
                        >
                            <CardContent className="p-4">
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
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(task.status, task.completed)}
                                </div>

                                {/* Opgepakt door */}
                                {task.taken_by && task.status === 'in_progress' && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 text-sm">
                                    <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-blue-800 font-medium">
                                      Opgepakt door: {task.taken_by}
                                    </span>
                                    {task.taken_at && (
                                      <span className="text-blue-600 text-xs">
                                        ({format(new Date(task.taken_at), "d MMM, HH:mm", { locale: nl })})
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {task.task_type === "ship" ? (
                                    <ShipIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  ) : task.task_type === "crew" ? (
                                    <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  ) : (
                                    <ListTodo className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                  )}
                                  <span className="text-gray-600 truncate">
                                    {task.task_type === "ship"
                                      ? relatedShip?.name || "Onbekend schip"
                                      : task.task_type === "crew"
                                      ? relatedCrew
                                        ? `${relatedCrew.first_name} ${relatedCrew.last_name}`
                                        : "Onbekend persoon"
                                      : "Algemeen"}
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

                                {/* Status update weergave (meerdere, nieuwste bovenaan) */}
                                {(() => {
                                  const history = Array.isArray(task.status_updates) ? [...task.status_updates] : []
                                  if (!history.length && task.status_update) {
                                    history.push({
                                      text: task.status_update,
                                      at: task.status_update_at,
                                      by: task.taken_by || task.created_by || 'Onbekend'
                                    })
                                  }
                                  if (!history.length) return null
                                  return (
                                    <div className="space-y-2">
                                      {history.slice().reverse().map((entry: any, idx: number) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm space-y-1">
                                          <div className="flex items-center gap-2 text-gray-700">
                                            <AlertCircle className="w-4 h-4 text-blue-600" />
                                            <span className="font-medium">Statusupdate</span>
                                            {entry.at && (
                                              <span className="text-xs text-gray-500">
                                                {format(new Date(entry.at), "d MMM, HH:mm", { locale: nl })}
                                              </span>
                                            )}
                                            {entry.by && (
                                              <span className="text-xs text-gray-500">— {entry.by}</span>
                                            )}
                                          </div>
                                          <div className="text-gray-700 whitespace-pre-wrap break-words">
                                            {entry.text}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}

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
                                  </div>
                                </div>
                                
                                {/* Status actie knoppen */}
                                {!task.completed && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {task.status === 'open' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleTakeTask(task.id)}
                                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                                      >
                                        <User className="w-4 h-4" />
                                        Ik pak dit op
                                      </Button>
                                    )}
                                    {((task.status === 'in_progress' && task.taken_by === (user?.email || 'Onbekend')) || task.assigned_to === "Nautic") && (
                                      <div className="flex flex-col gap-2 w-full">
                                        {task.status === 'in_progress' && task.taken_by === (user?.email || 'Onbekend') && (
                                          <div className="flex flex-wrap gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleReleaseTask(task.id)}
                                              className="flex items-center gap-1.5"
                                            >
                                              <X className="w-4 h-4" />
                                              Vrijgeven
                                            </Button>
                                            <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() => handleComplete(task.id)}
                                              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                              Voltooien
                                            </Button>
                                          </div>
                                        )}
                                        <Label className="text-xs text-gray-600">Statusupdate</Label>
                                        <Textarea
                                          rows={2}
                                          value={statusUpdates[task.id] ?? ""}
                                          onChange={(e) => setStatusUpdates((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                          placeholder="Geef een korte update over de voortgang..."
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleSaveStatusUpdate(task.id)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            Opslaan
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStatusUpdates((prev) => ({ ...prev, [task.id]: task.status_update || "" }))}
                                          >
                                            Herstel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {task.status === 'in_progress' && task.taken_by !== (user?.email || 'Onbekend') && task.assigned_to !== "Nautic" && (
                                      <span className="text-xs text-gray-500 italic">
                                        Wordt behandeld door {task.taken_by}
                                      </span>
                                    )}
                                    {(!task.status || task.status === 'open') && (
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
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                      })
                    )}
                  </div>
                </div>

                {/* Kolom 2: Personeel */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    Personeel
                    <Badge variant="outline" className="text-xs">
                      {crewTasks.length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {crewTasks.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Geen taken
                      </div>
                    ) : (
                      crewTasks.map((task: any) => {
                        const relatedShip = task.related_ship_id
                        ? ships.find((s: any) => s.id === task.related_ship_id)
                        : null
                      const relatedCrew = task.related_crew_id
                        ? crew.find((c: any) => c.id === task.related_crew_id)
                        : null
                      const deadlineStatus = getDeadlineStatus(task.deadline)

                      const isHighlighted = highlightedTaskId === task.id
                      return (
                        <Card 
                          key={task.id} 
                          className={`${task.completed ? "opacity-60" : ""} ${isHighlighted ? "ring-4 ring-orange-400 ring-offset-2" : ""}`}
                        >
                            <CardContent className="p-4">
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
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(task.status, task.completed)}
                                </div>

                                {/* Opgepakt door */}
                                {task.taken_by && task.status === 'in_progress' && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 text-sm">
                                    <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-blue-800 font-medium">
                                      Opgepakt door: {task.taken_by}
                                    </span>
                                    {task.taken_at && (
                                      <span className="text-blue-600 text-xs">
                                        ({format(new Date(task.taken_at), "d MMM, HH:mm", { locale: nl })})
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {task.task_type === "ship" ? (
                                    <ShipIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  ) : task.task_type === "crew" ? (
                                    <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  ) : (
                                    <ListTodo className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                  )}
                                  <span className="text-gray-600 truncate">
                                    {task.task_type === "ship"
                                      ? relatedShip?.name || "Onbekend schip"
                                      : task.task_type === "crew"
                                      ? relatedCrew
                                        ? `${relatedCrew.first_name} ${relatedCrew.last_name}`
                                        : "Onbekend persoon"
                                      : "Algemeen"}
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

                                {/* Status update weergave (meerdere, nieuwste bovenaan) */}
                                {(() => {
                                  const history = Array.isArray(task.status_updates) ? [...task.status_updates] : []
                                  if (!history.length && task.status_update) {
                                    history.push({
                                      text: task.status_update,
                                      at: task.status_update_at,
                                      by: task.taken_by || task.created_by || 'Onbekend'
                                    })
                                  }
                                  if (!history.length) return null
                                  return (
                                    <div className="space-y-2">
                                      {history.slice().reverse().map((entry: any, idx: number) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm space-y-1">
                                          <div className="flex items-center gap-2 text-gray-700">
                                            <AlertCircle className="w-4 h-4 text-blue-600" />
                                            <span className="font-medium">Statusupdate</span>
                                            {entry.at && (
                                              <span className="text-xs text-gray-500">
                                                {format(new Date(entry.at), "d MMM, HH:mm", { locale: nl })}
                                              </span>
                                            )}
                                            {entry.by && (
                                              <span className="text-xs text-gray-500">— {entry.by}</span>
                                            )}
                                          </div>
                                          <div className="text-gray-700 whitespace-pre-wrap break-words">
                                            {entry.text}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}

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
                                  </div>
                                </div>
                                
                                {/* Status actie knoppen */}
                                {!task.completed && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {task.status === 'open' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleTakeTask(task.id)}
                                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                                      >
                                        <User className="w-4 h-4" />
                                        Ik pak dit op
                                      </Button>
                                    )}
                                    {((task.status === 'in_progress' && task.taken_by === (user?.email || 'Onbekend')) || task.assigned_to === "Nautic") && (
                                      <div className="flex flex-col gap-2 w-full">
                                        {task.status === 'in_progress' && task.taken_by === (user?.email || 'Onbekend') && (
                                          <div className="flex flex-wrap gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleReleaseTask(task.id)}
                                              className="flex items-center gap-1.5"
                                            >
                                              <X className="w-4 h-4" />
                                              Vrijgeven
                                            </Button>
                                            <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() => handleComplete(task.id)}
                                              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                              Voltooien
                                            </Button>
                                          </div>
                                        )}
                                        <Label className="text-xs text-gray-600">Statusupdate</Label>
                                        <Textarea
                                          rows={2}
                                          value={statusUpdates[task.id] ?? ""}
                                          onChange={(e) => setStatusUpdates((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                          placeholder="Geef een korte update over de voortgang..."
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleSaveStatusUpdate(task.id)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            Opslaan
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStatusUpdates((prev) => ({ ...prev, [task.id]: task.status_update || "" }))}
                                          >
                                            Herstel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {task.status === 'in_progress' && task.taken_by !== (user?.email || 'Onbekend') && task.assigned_to !== "Nautic" && (
                                      <span className="text-xs text-gray-500 italic">
                                        Wordt behandeld door {task.taken_by}
                                      </span>
                                    )}
                                    {(!task.status || task.status === 'open') && (
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
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                      })
                    )}
                  </div>
                </div>

                {/* Kolom 3: Algemeen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-gray-600" />
                    Algemeen
                    <Badge variant="outline" className="text-xs">
                      {algemeenTasks.length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {algemeenTasks.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Geen taken
                      </div>
                    ) : (
                      algemeenTasks.map((task: any) => {
                        const relatedShip = task.related_ship_id
                        ? ships.find((s: any) => s.id === task.related_ship_id)
                        : null
                      const relatedCrew = task.related_crew_id
                        ? crew.find((c: any) => c.id === task.related_crew_id)
                        : null
                      const deadlineStatus = getDeadlineStatus(task.deadline)

                      const isHighlighted = highlightedTaskId === task.id
                      return (
                        <Card 
                          key={task.id} 
                          className={`${task.completed ? "opacity-60" : ""} ${isHighlighted ? "ring-4 ring-orange-400 ring-offset-2" : ""}`}
                        >
                            <CardContent className="p-4">
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
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(task.status, task.completed)}
                                </div>

                                {/* Opgepakt door */}
                                {task.taken_by && task.status === 'in_progress' && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 text-sm">
                                    <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-blue-800 font-medium">
                                      Opgepakt door: {task.taken_by}
                                    </span>
                                    {task.taken_at && (
                                      <span className="text-blue-600 text-xs">
                                        ({format(new Date(task.taken_at), "d MMM, HH:mm", { locale: nl })})
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {task.task_type === "ship" ? (
                                    <ShipIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  ) : task.task_type === "crew" ? (
                                    <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  ) : (
                                    <ListTodo className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                  )}
                                  <span className="text-gray-600 truncate">
                                    {task.task_type === "ship"
                                      ? relatedShip?.name || "Onbekend schip"
                                      : task.task_type === "crew"
                                      ? relatedCrew
                                        ? `${relatedCrew.first_name} ${relatedCrew.last_name}`
                                        : "Onbekend persoon"
                                      : "Algemeen"}
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

                                {/* Status update weergave (meerdere, nieuwste bovenaan) */}
                                {(() => {
                                  const history = Array.isArray(task.status_updates) ? [...task.status_updates] : []
                                  if (!history.length && task.status_update) {
                                    history.push({
                                      text: task.status_update,
                                      at: task.status_update_at,
                                      by: task.taken_by || task.created_by || 'Onbekend'
                                    })
                                  }
                                  if (!history.length) return null
                                  return (
                                    <div className="space-y-2">
                                      {history.slice().reverse().map((entry: any, idx: number) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm space-y-1">
                                          <div className="flex items-center gap-2 text-gray-700">
                                            <AlertCircle className="w-4 h-4 text-blue-600" />
                                            <span className="font-medium">Statusupdate</span>
                                            {entry.at && (
                                              <span className="text-xs text-gray-500">
                                                {format(new Date(entry.at), "d MMM, HH:mm", { locale: nl })}
                                              </span>
                                            )}
                                            {entry.by && (
                                              <span className="text-xs text-gray-500">— {entry.by}</span>
                                            )}
                                          </div>
                                          <div className="text-gray-700 whitespace-pre-wrap break-words">
                                            {entry.text}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}

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
                                  </div>
                                </div>
                                
                                {/* Status actie knoppen */}
                                {!task.completed && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {task.status === 'open' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleTakeTask(task.id)}
                                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                                      >
                                        <User className="w-4 h-4" />
                                        Ik pak dit op
                                      </Button>
                                    )}
                                    {((task.status === 'in_progress' && task.taken_by === (user?.email || 'Onbekend')) || task.assigned_to === "Nautic") && (
                                      <div className="flex flex-col gap-2 w-full">
                                        {task.status === 'in_progress' && task.taken_by === (user?.email || 'Onbekend') && (
                                          <div className="flex flex-wrap gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleReleaseTask(task.id)}
                                              className="flex items-center gap-1.5"
                                            >
                                              <X className="w-4 h-4" />
                                              Vrijgeven
                                            </Button>
                                            <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() => handleComplete(task.id)}
                                              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                              Voltooien
                                            </Button>
                                          </div>
                                        )}
                                        <Label className="text-xs text-gray-600">Statusupdate</Label>
                                        <Textarea
                                          rows={2}
                                          value={statusUpdates[task.id] ?? ""}
                                          onChange={(e) => setStatusUpdates((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                          placeholder="Geef een korte update over de voortgang..."
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleSaveStatusUpdate(task.id)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            Opslaan
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStatusUpdates((prev) => ({ ...prev, [task.id]: task.status_update || "" }))}
                                          >
                                            Herstel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {task.status === 'in_progress' && task.taken_by !== (user?.email || 'Onbekend') && task.assigned_to !== "Nautic" && (
                                      <span className="text-xs text-gray-500 italic">
                                        Wordt behandeld door {task.taken_by}
                                      </span>
                                    )}
                                    {(!task.status || task.status === 'open') && (
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
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

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
                onValueChange={(value: "ship" | "crew" | "algemeen") => {
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
                  <SelectItem value="algemeen">Algemeen</SelectItem>
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

            {deadline && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addToAgenda"
                  checked={addToAgenda}
                  onCheckedChange={(checked) => setAddToAgenda(checked === true)}
                />
                <Label
                  htmlFor="addToAgenda"
                  className="text-sm font-normal cursor-pointer"
                >
                  Toevoegen aan agenda ({format(new Date(deadline), 'dd-MM-yyyy')})
                </Label>
              </div>
            )}
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
}
