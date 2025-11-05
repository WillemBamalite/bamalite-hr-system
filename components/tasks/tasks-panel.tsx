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
import { ListTodo, Plus, AlertCircle, CheckCircle2, X, Calendar, User, Ship as ShipIcon, Clock, Flag } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { nl } from "date-fns/locale"

export function TasksPanel() {
  const { tasks, crew, ships, loading, addTask, updateTask, deleteTask, completeTask } = useSupabaseData()
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTaskType, setSelectedTaskType] = useState<"ship" | "crew" | "">("")
  const [selectedShipId, setSelectedShipId] = useState<string>("")
  const [selectedCrewId, setSelectedCrewId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState<"Leo" | "Jos" | "Willem">("Leo")
  const [priority, setPriority] = useState<"laag" | "normaal" | "hoog" | "urgent">("normaal")
  const [deadline, setDeadline] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<"open" | "completed">("open")

  // Filter tasks - standaard alleen openstaande taken
  const openTasks = tasks.filter((t: any) => !t.completed)
  const completedTasks = tasks.filter((t: any) => t.completed)
  const filteredTasks = filter === "open" ? openTasks : completedTasks

  // Group tasks by assigned person
  const tasksByPerson = {
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
    setAssignedTo("Leo")
    setPriority("normaal")
    setDeadline("")
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

      await addTask(taskData)
      resetForm()
      setShowDialog(false)
    } catch (error) {
      console.error("Error creating task:", error)
      alert("Fout bij aanmaken taak")
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

      {/* Taken lijst in 3 kolommen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {(["Leo", "Willem", "Jos"] as const).map((person) => {
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
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{task.description}</p>
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
                                  <span className="text-gray-600">
                                    {format(new Date(task.created_date), "d MMM yyyy", { locale: nl })}
                                  </span>
                                </div>

                                {task.deadline && (
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${deadlineStatus?.bg || "bg-gray-50"}`}>
                                    <Clock className={`w-4 h-4 ${deadlineStatus?.color || "text-gray-600"} flex-shrink-0`} />
                                    <span className={deadlineStatus?.color || "text-gray-600"}>
                                      {format(new Date(task.deadline), "d MMM yyyy", { locale: nl })} ({deadlineStatus?.text})
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t">
                                <div>{getPriorityBadge(task.priority)}</div>
                                <div className="flex items-center gap-2">
                                  {!task.completed && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleComplete(task.id)}
                                      className="gap-2"
                                      title="Voltooien"
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
                                    title="Verwijderen"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
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
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Taak Aanmaken</DialogTitle>
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
                onValueChange={(value: "Leo" | "Jos" | "Willem") => setAssignedTo(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            <Button variant="outline" onClick={() => {
              setShowDialog(false)
              resetForm()
            }}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Aanmaken..." : "Taak Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
