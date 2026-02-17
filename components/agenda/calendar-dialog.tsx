"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Edit, Trash2, Calendar as CalendarIcon, User, Cake } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay, parse, isWithinInterval, isAfter, isBefore } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AgendaItem {
  id: string
  title: string
  description: string | null
  date: string
  end_date?: string | null
  time: string | null
  voor_wie: string | null
  color?: string | null
  created_at: string
  updated_at: string
}

interface BirthdayItem {
  id: string
  title: string
  date: string
  color: string
  isBirthday: true
  crewMemberName: string
}

interface AnniversaryItem {
  id: string
  title: string
  date: string
  color: string
  isAnniversary: true
  crewMemberName: string
  years: number
}

interface CalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CalendarDialog({ open, onOpenChange }: CalendarDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>([])
  const [anniversaries, setAnniversaries] = useState<AnniversaryItem[]>([])
  const [crew, setCrew] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    time: '',
    voor_wie: '',
    extra_emails: '',
    color: '#3b82f6'
  })

  // Load agenda items and birthdays
  useEffect(() => {
    if (open) {
      loadAgendaItems()
      loadCrewAndBirthdays()
    }
  }, [open, currentMonth])

  const loadCrewAndBirthdays = async () => {
    try {
      // Load crew members with birth dates en in-dienst data (exclusief dummy's)
      const { data: crewData, error: crewError } = await supabase
        .from('crew')
        .select('id, first_name, last_name, birth_date, in_dienst_vanaf, is_dummy')
      
      if (crewError) {
        console.error('Error loading crew for birthdays:', crewError)
        // Don't throw, just return empty arrays - birthdays/anniversaries zijn optioneel
        setBirthdays([])
        setAnniversaries([])
        return
      }
      
      if (!crewData || crewData.length === 0) {
        setBirthdays([])
        setAnniversaries([])
        return
      }
      
      setCrew(crewData)
      
      // Generate birthdays en dienstjubilea voor current month
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const currentYear = currentMonth.getFullYear()
      
      const birthdayItems: BirthdayItem[] = []
      const anniversaryItems: AnniversaryItem[] = []
      
      // Filter en verwerk alleen echte bemanningsleden met geldige geboortedatum
      crewData
        .filter((member: any) => !member.is_dummy && member.birth_date && member.birth_date.trim() !== '')
        .forEach((member: any) => {
          try {
            // Parse birth date (format: YYYY-MM-DD)
            const birthDateStr = member.birth_date.trim()
            const birthDate = parse(birthDateStr, 'yyyy-MM-dd', new Date())
            
            // Validate the parsed date
            if (isNaN(birthDate.getTime())) {
              console.warn(`Invalid birth date format for ${member.first_name} ${member.last_name}: ${birthDateStr}`)
              return
            }
            
            const month = birthDate.getMonth()
            const day = birthDate.getDate()
            
            // Create birthday date for current year
            const birthdayThisYear = new Date(currentYear, month, day)
            
            // Check if birthday falls within current month
            if (isWithinInterval(birthdayThisYear, { start, end }) || isSameDay(birthdayThisYear, start) || isSameDay(birthdayThisYear, end)) {
              birthdayItems.push({
                id: `birthday-${member.id}-${currentYear}`,
                title: `🎂 ${member.first_name} ${member.last_name}`,
                date: format(birthdayThisYear, 'yyyy-MM-dd'),
                color: '#ec4899', // Pink color for birthdays
                isBirthday: true,
                crewMemberName: `${member.first_name} ${member.last_name}`
              })
            }
          } catch (error) {
            console.warn(`Error parsing birth date for ${member.first_name} ${member.last_name}:`, error, `Date: ${member.birth_date}`)
          }
        })
      
      setBirthdays(birthdayItems)

      // Dienstjubilea (5,10,15,20,25,30 jaar en vanaf 30 elk jaar)
      crewData
        .filter((member: any) => !member.is_dummy && member.in_dienst_vanaf && String(member.in_dienst_vanaf).trim() !== '')
        .forEach((member: any) => {
          try {
            const startStr = String(member.in_dienst_vanaf).trim()
            // Probeer eerst als YYYY-MM-DD, anders fallback naar Date constructor
            let startDate = parse(startStr, 'yyyy-MM-dd', new Date())
            if (isNaN(startDate.getTime())) {
              startDate = new Date(startStr)
            }
            if (isNaN(startDate.getTime())) {
              console.warn(`Invalid in_dienst_vanaf for ${member.first_name} ${member.last_name}: ${startStr}`)
              return
            }

            startDate.setHours(0, 0, 0, 0)

            // Loop door mogelijke jaren tot max 60 dienstjaren
            for (let years = 5; years <= 60; years++) {
              const isMilestone = years < 30 ? years % 5 === 0 : true
              if (!isMilestone) continue

              const anniversaryDate = new Date(startDate)
              anniversaryDate.setFullYear(startDate.getFullYear() + years)

              if (anniversaryDate.getFullYear() !== currentYear) {
                continue
              }

              // Valt dit jubileum in de huidige maand?
              if (
                isWithinInterval(anniversaryDate, { start, end }) ||
                isSameDay(anniversaryDate, start) ||
                isSameDay(anniversaryDate, end)
              ) {
                anniversaryItems.push({
                  id: `anniversary-${member.id}-${years}-${currentYear}`,
                  title: `⭐ ${years} jaar in dienst – ${member.first_name} ${member.last_name}`,
                  date: format(anniversaryDate, 'yyyy-MM-dd'),
                  color: '#f59e0b', // Amber voor jubileum
                  isAnniversary: true,
                  crewMemberName: `${member.first_name} ${member.last_name}`,
                  years
                })
              }
            }
          } catch (error) {
            console.warn(`Error parsing in_dienst_vanaf for ${member.first_name} ${member.last_name}:`, error, `Date: ${member.in_dienst_vanaf}`)
          }
        })

      setAnniversaries(anniversaryItems)
    } catch (error) {
      console.error('Error loading birthdays:', error)
      // Set empty arrays on error so the agenda still works
      setBirthdays([])
      setAnniversaries([])
    }
  }

  const loadAgendaItems = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const startStr = format(start, 'yyyy-MM-dd')
      const endStr = format(end, 'yyyy-MM-dd')
      
      // Load items that might be visible in this month
      // We'll load a wider range and filter in JavaScript for better control
      // Load items where:
      // - date is before or during this month, OR
      // - end_date is during or after this month
      const { data: data1, error: error1 } = await supabase
        .from('agenda_items')
        .select('*')
        .lte('date', endStr)
        .order('date', { ascending: true })
      
      // Also load items where end_date falls in this month (items that started earlier)
      const { data: data2, error: error2 } = await supabase
        .from('agenda_items')
        .select('*')
        .not('end_date', 'is', null)
        .gte('end_date', startStr)
        .lt('date', startStr)
        .order('date', { ascending: true })
      
      // Combine and deduplicate
      const allData = [...(data1 || []), ...(data2 || [])]
      const uniqueData = Array.from(
        new Map(allData.map(item => [item.id, item])).values()
      )
      
      const error = error1 || error2
      
      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }
      
      // Filter items that are visible in this month
      const visibleItems = (uniqueData || []).filter(item => {
        try {
          const itemStart = parse(item.date, 'yyyy-MM-dd', new Date())
          const itemEnd = item.end_date ? parse(item.end_date, 'yyyy-MM-dd', new Date()) : itemStart
          
          // Item is visible if it overlaps with the current month
          // Check if item range overlaps with month range
          // Item overlaps if:
          // - Item starts before or during month AND ends during or after month
          const itemStartsBeforeOrDuring = isBefore(itemStart, start) || isSameDay(itemStart, start) || isWithinInterval(itemStart, { start, end })
          const itemEndsDuringOrAfter = isSameDay(itemEnd, end) || isWithinInterval(itemEnd, { start, end }) || isAfter(itemEnd, end)
          const itemSpansMonth = isBefore(itemStart, start) && isAfter(itemEnd, end)
          
          return (itemStartsBeforeOrDuring && itemEndsDuringOrAfter) || itemSpansMonth
        } catch (error) {
          console.warn('Error parsing agenda item date:', item, error)
          return false
        }
      })
      
      // Sort by date first, then by time (items without time go last)
      const sorted = visibleItems.sort((a, b) => {
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

    // Validate end_date is after date
    if (formData.end_date && formData.end_date < formData.date) {
      alert('Einddatum moet na de begindatum liggen')
      return
    }

    try {
      // Beschrijving + optionele locatie combineren
      const baseDescription = formData.description || ''
      const descriptionWithLocation =
        formData.location && formData.location.trim() !== ''
          ? (baseDescription
              ? `${baseDescription}\nLocatie: ${formData.location.trim()}`
              : `Locatie: ${formData.location.trim()}`)
          : baseDescription

      const itemData = {
        title: formData.title,
        description: descriptionWithLocation || null,
        date: formData.date,
        end_date: formData.end_date || null,
        time: formData.time || null,
        voor_wie: formData.voor_wie || null,
        color: formData.color || '#3b82f6'
      }

      const isEdit = !!editingItem

      if (isEdit) {
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

        // Nieuwe afspraak: stuur optioneel een agenda-uitnodiging per e-mail
        if ((formData.voor_wie && formData.voor_wie !== 'Algemeen') || (formData.extra_emails && formData.extra_emails.trim() !== '')) {
          try {
            await fetch('/api/agenda-send-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...itemData,
                extra_emails: formData.extra_emails || null,
              })
            })
          } catch (inviteError) {
            console.error('Error sending agenda invite email:', inviteError)
            // Geen alert: het agendapunt zelf is wel opgeslagen
          }
        }
      }

      setShowAddDialog(false)
      setEditingItem(null)
      setFormData({
        title: '',
        description: '',
        location: '',
        date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
        end_date: '',
        time: '',
        voor_wie: '',
        extra_emails: '',
        color: '#3b82f6'
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
      location: '',
      date: item.date,
      end_date: item.end_date || '',
      time: item.time || '',
      voor_wie: item.voor_wie || '',
      extra_emails: '',
      color: item.color || '#3b82f6'
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

  // Get items for a specific date (including multi-day items, birthdays en jubilea)
  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dateObj = parse(dateStr, 'yyyy-MM-dd', new Date())
    
    // Regular agenda items
    const regularItems = agendaItems.filter(item => {
      const itemStart = parse(item.date, 'yyyy-MM-dd', new Date())
      const itemEnd = item.end_date ? parse(item.end_date, 'yyyy-MM-dd', new Date()) : itemStart
      
      // Check if date falls within the item's range
      return (
        isSameDay(dateObj, itemStart) ||
        isSameDay(dateObj, itemEnd) ||
        (isAfter(dateObj, itemStart) && isBefore(dateObj, itemEnd))
      )
    })
    
    // Birthday items
    const birthdayItems = birthdays.filter(birthday => birthday.date === dateStr)
    
    // Anniversary items
    const anniversaryItemsForDate = anniversaries.filter(item => item.date === dateStr)
    
    return [...regularItems, ...birthdayItems, ...anniversaryItemsForDate]
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-[100vw] max-h-[100vh] flex flex-col p-4 sm:p-6 rounded-none">
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
              <div>
                <Label htmlFor="location">Locatie (optioneel)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="bijv. kantoor Dordrecht, MS Example, Teams"
                />
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] gap-1">
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
                        border rounded-lg p-1 text-[11px] sm:text-xs md:text-sm relative flex flex-col h-full
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
                          <div className="mt-1 space-y-0.5 overflow-hidden">
                            {dayItems.slice(0, 4).map((item) => {
                              const isBirthday = (item as any).isBirthday
                              const itemColor = isBirthday
                                ? '#ec4899'
                                : ((item as any).color || '#3b82f6')
                              return (
                                <div 
                                  key={item.id} 
                                  className="text-[11px] sm:text-xs text-left truncate px-1 py-0.5 rounded"
                                  style={{ 
                                    backgroundColor: `${itemColor}20`,
                                    borderLeft: `2px solid ${itemColor}`,
                                    color: itemColor
                                  }}
                                  title={item.title}
                                >
                                  {item.time && !isBirthday && <span className="text-gray-600 font-medium">{item.time} </span>}
                                  {item.title}
                                </div>
                              )
                            })}
                            {dayItems.length > 4 && (
                              <div className="text-[10px] text-gray-500">
                                +{dayItems.length - 4} meer
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

          {/* Selected Date Items (alleen tonen als er echt iets geselecteerd is) */}
          {selectedDate && (
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
                          end_date: '',
                          time: '',
                          voor_wie: '',
                          color: '#3b82f6'
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
                          end_date: '',
                          time: '',
                          voor_wie: '',
                          color: '#3b82f6'
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
                      .map(item => {
                        const isBirthday = (item as any).isBirthday
                        const itemColor = isBirthday
                          ? '#ec4899'
                          : ((item as any).color || '#3b82f6')
                        const agendaItem = item as AgendaItem
                        
                        return (
                          <Card 
                            key={item.id}
                            style={{ borderLeft: `4px solid ${itemColor}` }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isBirthday && <Cake className="w-4 h-4" style={{ color: itemColor }} />}
                                    <h3 className="font-semibold">{item.title}</h3>
                                    {agendaItem.time && !isBirthday && (
                                      <Badge variant="outline">{agendaItem.time}</Badge>
                                    )}
                                    {agendaItem.voor_wie && !isBirthday && (
                                      <Badge variant="secondary" className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {agendaItem.voor_wie}
                                      </Badge>
                                    )}
                                    {agendaItem.end_date && (
                                      <Badge variant="outline" style={{ backgroundColor: `${itemColor}20`, color: itemColor }}>
                                        {format(parse(agendaItem.date, 'yyyy-MM-dd', new Date()), 'dd-MM')} - {format(parse(agendaItem.end_date, 'yyyy-MM-dd', new Date()), 'dd-MM')}
                                      </Badge>
                                    )}
                                  </div>
                                  {agendaItem.description && !isBirthday && (
                                    <p className="text-sm text-gray-600 mt-1">{agendaItem.description}</p>
                                  )}
                                </div>
                                {!isBirthday && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditItem(agendaItem)}
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
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                  </div>
                )}
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
                <Label htmlFor="date">Begindatum *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">Einddatum (optioneel - voor meerdere dagen)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.date}
                />
                {formData.end_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Dit item wordt getoond op elke dag tussen {format(parse(formData.date, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')} en {format(parse(formData.end_date, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}
                  </p>
                )}
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
                <Label htmlFor="color">Kleur</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
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
                <Label htmlFor="location">Locatie (optioneel)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="bijv. kantoor Dordrecht, MS Example, Teams"
                />
              </div>
              <div>
                <Label htmlFor="extra_emails">Extra e-mailadressen (optioneel)</Label>
                <Input
                  id="extra_emails"
                  value={formData.extra_emails}
                  onChange={(e) => setFormData({ ...formData, extra_emails: e.target.value })}
                  placeholder="bijv. klant@bedrijf.nl, planner@bedrijf.nl"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Meerdere adressen scheiden met komma, spatie of enter.
                </p>
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

