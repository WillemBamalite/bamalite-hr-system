"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { StickyNote, Plus, Save, X, ArrowLeft, MessageSquare, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format } from "date-fns"

interface Props {
  crewMemberId: string
}

interface Note {
  id: string
  content: string
  createdAt: string
  createdBy: string
  archivedAt?: string
}

export function CrewMemberNotes({ crewMemberId }: Props) {
  const router = useRouter()
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const { crew, addNoteToCrew, removeNoteFromCrew, deleteArchivedNote } = useSupabaseData()

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Find crew member from Supabase data
  const crewMember = crew.find(member => member.id === crewMemberId)
  
  // Get active and archived notes (filter out system notes)
  const activeNotes: Note[] = (crewMember?.active_notes || []).filter((note: any) => 
    !note.content?.startsWith('DUMMY_LOCATION:') && 
    !note.content?.startsWith('CREW_AB_DESIGNATION:')
  ).map((note: any) => ({
    id: note.id,
    content: note.content,
    createdAt: note.created_at || note.createdAt || new Date().toISOString(),
    createdBy: note.created_by || note.createdBy || 'System',
    archivedAt: note.archived_at || note.archivedAt
  }))
  
  const archivedNotes: Note[] = (crewMember?.archived_notes || []).map((note: any) => ({
    id: note.id,
    content: note.content,
    createdAt: note.created_at || note.createdAt || new Date().toISOString(),
    createdBy: note.created_by || note.createdBy || 'System',
    archivedAt: note.archived_at || note.archivedAt
  }))

  const handleSaveNote = async () => {
    if (newNote.trim()) {
      try {
        await addNoteToCrew(crewMemberId, newNote.trim())
        setNewNote("")
        setIsAddingNote(false)
      } catch (error) {
        console.error('Error saving note:', error)
        alert('Fout bij het opslaan van de notitie')
      }
    }
  }

  const handleRemoveNote = async (noteId: string) => {
    if (confirm('Weet je zeker dat je deze notitie wilt verwijderen? Deze wordt gearchiveerd.')) {
      try {
        await removeNoteFromCrew(crewMemberId, noteId)
      } catch (error) {
        console.error('Error removing note:', error)
        alert('Fout bij het verwijderen van de notitie')
      }
    }
  }

  const handleDeleteArchivedNote = async (noteId: string) => {
    if (confirm('Weet je zeker dat je deze gearchiveerde notitie permanent wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      try {
        await deleteArchivedNote(crewMemberId, noteId)
      } catch (error) {
        console.error('Error deleting archived note:', error)
        alert('Fout bij het verwijderen van de gearchiveerde notitie')
      }
    }
  }

  // Don't render until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <StickyNote className="w-5 h-5" />
            <span>Notities & Opmerkingen</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Laden...</div>
        </CardContent>
      </Card>
    );
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

        {/* Actieve Notities */}
        {activeNotes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Actieve Notities:
            </h4>
            {activeNotes.map((note) => (
              <div key={note.id} className="bg-orange-50 p-3 rounded border-l-4 border-orange-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-1">{note.content}</p>
                    <p className="text-xs text-gray-500">
                      Toegevoegd: {(() => {
                        try {
                          const date = new Date(note.createdAt)
                          if (isNaN(date.getTime())) return 'Onbekende datum'
                          return format(date, 'dd-MM-yyyy HH:mm')
                        } catch {
                          return 'Onbekende datum'
                        }
                      })()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveNote(note.id)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                    title="Notitie verwijderen (archiveren)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gearchiveerde Notities */}
        {archivedNotes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Gearchiveerde Notities:</h4>
            {archivedNotes.map((note) => (
              <div key={note.id} className="bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{note.content}</p>
                    <p className="text-xs text-gray-500">
                      Toegevoegd: {(() => {
                        try {
                          const date = new Date(note.createdAt)
                          if (isNaN(date.getTime())) return 'Onbekende datum'
                          return format(date, 'dd-MM-yyyy HH:mm')
                        } catch {
                          return 'Onbekende datum'
                        }
                      })()}
                      {note.archivedAt && (
                        <span className="ml-2">
                          • Gearchiveerd: {(() => {
                            try {
                              const date = new Date(note.archivedAt)
                              if (isNaN(date.getTime())) return 'Onbekende datum'
                              return format(date, 'dd-MM-yyyy HH:mm')
                            } catch {
                              return 'Onbekende datum'
                            }
                          })()}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteArchivedNote(note.id)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                    title="Notitie permanent verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Geen notities */}
        {activeNotes.length === 0 && archivedNotes.length === 0 && !isAddingNote && (
          <div className="text-center py-8">
            <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nog geen notities toegevoegd</p>
            <Button variant="outline" onClick={() => setIsAddingNote(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Eerste notitie toevoegen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}