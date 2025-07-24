"use client"

import { useState } from "react"
import { crewDatabase } from "@/data/crew-database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { StickyNote, Plus, Save, X, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
  crewMemberId: string
}

interface Note {
  id: string
  date: string
  author: string
  type: string
  content: string
}

export function CrewMemberNotes({ crewMemberId }: Props) {
  const router = useRouter()
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Haal bemanningslid uit database
  const crewMember = (crewDatabase as any)[crewMemberId]
  
  // Gebruik echte notities uit database of fallback naar lege array
  console.log("Crew member:", crewMember);
  console.log("Notes from database:", crewMember?.notes);
  console.log("Notes type:", typeof crewMember?.notes);
  const notes: Note[] = Array.isArray(crewMember?.notes) ? crewMember.notes : []

  const getTypeColor = (type: string) => {
    switch (type) {
      case "positief":
        return "bg-green-100 text-green-800"
      case "negatief":
        return "bg-red-100 text-red-800"
      case "ontwikkeling":
        return "bg-blue-100 text-blue-800"
      case "neutraal":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSaveNote = () => {
    if (newNote.trim()) {
      // Maak nieuwe notitie
      const newNoteObj: Note = {
        id: `note-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        author: "HR Manager", // Later dynamisch maken
        type: "neutraal", // Later selecteerbaar maken
        content: newNote.trim()
      }
      
      // Voeg toe aan database
      if (crewMember) {
        const currentNotes = Array.isArray(crewMember.notes) ? crewMember.notes : []
        const updatedNotes = [...currentNotes, newNoteObj]
        crewMember.notes = updatedNotes
        console.log("Notitie opgeslagen:", newNoteObj)
        console.log("Alle notities na opslag:", crewMember.notes)
      }
      
              setNewNote("")
        setIsAddingNote(false)
      
      // Force page refresh om wijzigingen te tonen
      window.location.reload()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <StickyNote className="w-5 h-5" />
            <span>Notities & Opmerkingen</span>
          </CardTitle>
          {!isAddingNote && (
            <Button variant="outline" size="sm" onClick={() => setIsAddingNote(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Notitie
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </button>
        {/* Nieuwe notitie toevoegen */}
        {isAddingNote && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="space-y-3">
              <Textarea
                placeholder="Voeg een notitie toe over dit bemanningslid..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={handleSaveNote}>
                  <Save className="w-3 h-3 mr-1" />
                  Opslaan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNote("")
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bestaande notities */}
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Badge className={getTypeColor(note.type)} variant="secondary">
                    {note.type}
                  </Badge>
                  <span className="text-xs text-gray-500">{note.author}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(note.date).toLocaleDateString("nl-NL")}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>

        {notes.length === 0 && !isAddingNote && (
          <div className="text-center py-6">
            <StickyNote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Nog geen notities toegevoegd</p>
            <Button variant="outline" size="sm" className="mt-2 bg-transparent" onClick={() => setIsAddingNote(true)}>
              Eerste notitie toevoegen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
