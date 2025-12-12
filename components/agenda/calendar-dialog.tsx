"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Edit, Trash2, Calendar as CalendarIcon, User } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AgendaItem {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  voor_wie: string | null
  created_at: string
  updated_at: string
}

interface CalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CalendarDialog({ open, onOpenChange }: CalendarDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    voor_wie: ''
  })

  // Load agenda items
  useEffect(() => {
    if (open) {
      loadAgendaItems()
    }
  }, [open, currentMonth])

  const loadAgendaItems = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
      
      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }
      
      // Sort by date first, then by time (items without time go last)
      const sorted = (data || []).sort((a, b) => {
        // First sort by date
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date)
        }
        // Then by time (nulls last)
        if (!a.time && !b.time) return 0
        if (!a.time) return 1
        if (!b.time) return -1
        return a.time.localeCompare(b.time)
      })
      
      setAgendaItems(sorted)
    } catch (error) {
      console.error('Error loading agenda items:', error)
      // Check if table doesn't exist
      if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
        alert('De agenda_items tabel bestaat nog niet. Voer eerst het SQL script uit in Supabase.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = async () => {
    if (!formData.title || !formData.date) {
      alert('Vul tenminste een titel en datum in')
      return
    }

    try {
      const itemData = {
        title: formData.title,
        description: formData.description || null,
        date: formData.date,
        time: formData.time || null,
        voor_wie: formData.voor_wie || null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('agenda_items')
          .update(itemData)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('agenda_items')
          .insert([itemData])
        
        if (error) throw error
      }

      setShowAddDialog(false)
      setEditingItem(null)
      setFormData({
        title: '',
        description: '',
        date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
        time: '',
        voor_wie: ''
      })
      await loadAgendaItems()
    } catch (error) {
      console.error('Error saving agenda item:', error)
      alert('Fout bij opslaan agenda item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadAgendaItems()
    } catch (error) {
      console.error('Error deleting agenda item:', error)
      alert('Fout bij verwijderen agenda item')
    }
  }

  const handleEditItem = (item: AgendaItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      date: item.date,
      time: item.time || '',
      voor_wie: item.voor_wie || ''
    })
    setShowAddDialog(true)
  }

  const handleDateClick = (date: Date) => {
    // Selecteer de dag en toon de items
    setSelectedDate(date)
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get first day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart)
  // Adjust for Monday as first day (0 = Monday)
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  
  // Create empty cells for days before month starts
  const emptyCells = Array.from({ length: adjustedFirstDay }, (_, i) => i)

  // Get items for a specific date
  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    // Compare date strings directly to avoid timezone issues
    return agendaItems.filter(item => item.date === dateStr)
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Agenda
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Month Navigation */}
          <div className="flex items-center justify-between flex-shrink-0">
            <Button variant="outline" onClick={previousMonth}>
              ← Vorige maand
            </Button>
            <h2 className="text-xl font-bold">
              {format(currentMonth, 'MMMM yyyy', { locale: nl })}
            </h2>
            <Button variant="outline" onClick={nextMonth}>
              Volgende maand →
            </Button>
          </div>

          <div className={`flex-1 grid gap-4 overflow-hidden min-h-0 ${selectedDate ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Calendar Grid */}
            <Card className="flex flex-col overflow-hidden">
            <CardContent className="p-4 flex-1 overflow-auto">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells */}
                {emptyCells.map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* Days */}
                {daysInMonth.map(day => {
                  const dayItems = getItemsForDate(day)
                  const isToday = isSameDay(day, new Date())
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square border rounded-lg p-1 text-sm relative
                        hover:bg-blue-50 transition-colors
                        ${isToday ? 'bg-blue-100 border-blue-400 font-bold' : ''}
                        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                        ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between">
                          <div className="text-sm font-medium">{format(day, 'd')}</div>
                          {dayItems.length > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs h-5 px-1.5 bg-blue-600 text-white"
                            >
                              {dayItems.length}
                            </Badge>
                          )}
                        </div>
                        {dayItems.length > 0 && (
                          <div className="mt-auto pt-1 space-y-0.5">
                            {dayItems.slice(0, 2).map((item) => (
                              <div 
                                key={item.id} 
                                className="text-[10px] text-left truncate text-gray-700"
                                title={item.title}
                              >
                                {item.time && <span className="text-gray-500">{item.time} </span>}
                                {item.title}
                              </div>
                            ))}
                            {dayItems.length > 2 && (
                              <div className="text-[10px] text-gray-500">
                                +{dayItems.length - 2} meer
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Items */}
          {selectedDate ? (
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {format(selectedDate, 'EEEE d MMMM yyyy', { locale: nl })} ({format(selectedDate, 'dd-MM-yyyy')})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getItemsForDate(selectedDate).length > 0 && (
                      <Badge variant="outline" className="text-sm">
                        {getItemsForDate(selectedDate).length} item{getItemsForDate(selectedDate).length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingItem(null)
                        setFormData({
                          title: '',
                          description: '',
                          date: format(selectedDate, 'yyyy-MM-dd'),
                          time: '',
                          voor_wie: ''
                        })
                        setShowAddDialog(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nieuw item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {getItemsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">
                      Geen items voor deze datum.
                    </p>
                    <Button
                      onClick={() => {
                        setEditingItem(null)
                        setFormData({
                          title: '',
                          description: '',
                          date: format(selectedDate, 'yyyy-MM-dd'),
                          time: '',
                          voor_wie: ''
                        })
                        setShowAddDialog(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Item toevoegen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getItemsForDate(selectedDate)
                      .sort((a, b) => {
                        if (!a.time && !b.time) return 0
                        if (!a.time) return 1
                        if (!b.time) return -1
                        return a.time.localeCompare(b.time)
                      })
                      .map(item => (
                        <Card key={item.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{item.title}</h3>
                                  {item.time && (
                                    <Badge variant="outline">{item.time}</Badge>
                                  )}
                                  {item.voor_wie && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {item.voor_wie}
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center">
              <CardContent className="text-center text-gray-500 py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Selecteer een datum om items te bekijken</p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>

        {/* Add/Edit Item Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Item bewerken' : 'Nieuw agenda item'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Voer een titel in"
                />
              </div>
              <div>
                <Label htmlFor="date">Datum *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time">Tijd (optioneel)</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="voor_wie">Voor wie (optioneel)</Label>
                <Select
                  value={formData.voor_wie}
                  onValueChange={(value) => setFormData({ ...formData, voor_wie: value })}
                >
                  <SelectTrigger id="voor_wie">
                    <SelectValue placeholder="Selecteer persoon of algemeen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Algemeen">Algemeen</SelectItem>
                    <SelectItem value="Nautic">Nautic</SelectItem>
                    <SelectItem value="Willem">Willem</SelectItem>
                    <SelectItem value="Leo">Leo</SelectItem>
                    <SelectItem value="Jos">Jos</SelectItem>
                    <SelectItem value="Bart">Bart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Beschrijving (optioneel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Voeg een beschrijving toe"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveItem} className="flex-1">
                  {editingItem ? 'Opslaan' : 'Toevoegen'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuleren
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

