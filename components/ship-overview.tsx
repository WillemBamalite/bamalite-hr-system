"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Users, CheckCircle, Clock, UserX, Trash2, GraduationCap, MessageSquare, X, Plus, AlertCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { format } from "date-fns"
import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { useDashboardSearch } from "@/contexts/DashboardSearchContext"

type SailingRegime = "A1" | "A2" | "B"

// Helper functie om lokale datum + tijd te parsen (geen UTC conversie)
function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const parts = dateStr.split(/[-/]/)
  let year: number, month: number, day: number
  
  if (parts[0].length === 4) {
    year = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    day = parseInt(parts[2])
  } else {
    day = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    year = parseInt(parts[2])
  }
  
  const [hours, minutes, seconds] = (timeStr || '00:00:00').split(':').map(Number)
  
  const date = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0, 0)
  return date
}

// Sorteringsfunctie voor bemanningsleden op rang
const sortCrewByRank = (crew: any[]) => {
  const rankOrder = {
    'Kapitein': 1,
    '2e kapitein': 2,
    'Stuurman': 3,
    'Vol Matroos': 4,
    'Matroos': 5,
    'Lichtmatroos': 6,
    'Licht Matroos': 6,
    'Deksman': 7,
    'Aflosser': 8
  }
  
  return crew.sort((a, b) => {
    const rankA = rankOrder[a.position as keyof typeof rankOrder] || 999
    const rankB = rankOrder[b.position as keyof typeof rankOrder] || 999
    return rankA - rankB
  })
}

export function ShipOverview() {
  const { ships, crew, sickLeave, trips, tasks, loading, error, addNoteToCrew, removeNoteFromCrew, crewColorTags, setCrewColorTag, loadData } = useSupabaseData()
  const { t, locale } = useLanguage()
  const { role } = useAuth()
  const { searchQuery, setSearchQuery, setSearchRunner } = useDashboardSearch()
  const [mounted, setMounted] = useState(false);
  const [highlightTargetId, setHighlightTargetId] = useState<string | null>(null)
  const [sailingRegimeByShipId, setSailingRegimeByShipId] = useState<Record<string, SailingRegime>>({})
  const uiText = {
    shipsOverview: locale === "de" ? "Schiffsübersicht" : locale === "fr" ? "Aperçu des navires" : "Schepen Overzicht",
    noShips: locale === "de" ? "Noch keine Schiffe hinzugefügt" : locale === "fr" ? "Aucun navire ajouté" : "Nog geen schepen toegevoegd",
    shipSingle: locale === "de" ? "Schiff" : locale === "fr" ? "navire" : "schip",
    shipPlural: locale === "de" ? "Schiffe" : locale === "fr" ? "navires" : "schepen",
    openTasks: locale === "de" ? "Offene Aufgaben" : locale === "fr" ? "Tâches ouvertes" : "Openstaande taken",
    priority: locale === "de" ? "Priorität" : locale === "fr" ? "Priorité" : "Prioriteit",
    assignedTo: locale === "de" ? "Zugewiesen an" : locale === "fr" ? "Assigné à" : "Toegewezen aan",
    deadline: locale === "de" ? "Frist" : locale === "fr" ? "Échéance" : "Deadline",
    sailingRegime: locale === "de" ? "Fahrregime" : locale === "fr" ? "Régime de navigation" : "Vaarregime",
    addDummy: locale === "de" ? "Dummy hinzufügen" : locale === "fr" ? "Ajouter un dummy" : "Dummy toevoegen",
    crew: locale === "de" ? "Besatzung:" : locale === "fr" ? "Équipage :" : "Bemanning:",
    onBoard: locale === "de" ? "An Bord" : locale === "fr" ? "À bord" : "Aan Boord",
    atHome: locale === "de" ? "Zuhause" : locale === "fr" ? "À la maison" : "Thuis",
    sick: locale === "de" ? "Krank" : locale === "fr" ? "Malade" : "Ziek",
    absent: locale === "de" ? "Abwesend" : locale === "fr" ? "Absent" : "Afwezig",
    sickInfo: locale === "de" ? "Krankheitsinfo:" : locale === "fr" ? "Infos maladie :" : "Ziekinformatie:",
    absentInfo: locale === "de" ? "Abwesenheitsinfo:" : locale === "fr" ? "Infos d'absence :" : "Afwezigheidsinformatie:",
    sickSince: locale === "de" ? "Krank seit" : locale === "fr" ? "Malade depuis" : "Ziek vanaf",
    addDummyTitle: locale === "de" ? "Dummy hinzufügen" : locale === "fr" ? "Ajouter un dummy" : "Dummy toevoegen",
    creating: locale === "de" ? "Erstellen..." : locale === "fr" ? "Création..." : "Aanmaken...",
  }
  const ABSENT_MARKER = "[AFWEZIG]"

  const isAbsentLeaveRecord = (record: any) =>
    String(record?.notes || "").toUpperCase().includes(ABSENT_MARKER)

  const getActiveLeaveForMember = (memberId: string) =>
    sickLeave.find(
      (record: any) =>
        record.crew_member_id === memberId &&
        (record.status === "actief" || record.status === "wacht-op-briefje")
    ) || null

  const isUnavailableCrewMember = (member: any) => {
    if (!member) return false
    if (member.status === "afwezig" || member.status === "ziek") return true
    const activeLeave = getActiveLeaveForMember(member.id)
    return !!activeLeave
  }
  
  // Notes functionality state
  const [notesDialog, setNotesDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [quickNoteDialog, setQuickNoteDialog] = useState<{
    isOpen: boolean;
    crewId: string;
    crewName: string;
  }>({
    isOpen: false,
    crewId: "",
    crewName: ""
  });
  const [quickNote, setQuickNote] = useState("");
  const [deleteNoteDialog, setDeleteNoteDialog] = useState<{
    isOpen: boolean;
    crewId: string;
    noteId: string;
    noteContent: string;
  }>({
    isOpen: false,
    crewId: "",
    noteId: "",
    noteContent: ""
  });

  // Dummy functionality state
  const [dummyDialog, setDummyDialog] = useState<{
    isOpen: boolean;
    shipId: string;
    shipName: string;
  }>({
    isOpen: false,
    shipId: "",
    shipName: ""
  });
  const [dummyForm, setDummyForm] = useState({
    sourceMode: "empty" as "empty" | "copy",
    sourceCrewId: "",
    expectedStartDate: "",
    abDesignation: "" as "" | "A" | "B",
    position: "",
    nationality: "",
    diplomas: "",
    notes: ""
  });
  const [isCreatingDummy, setIsCreatingDummy] = useState(false);
  
  // Drag and drop state for dummies
  const [draggedDummyId, setDraggedDummyId] = useState<string | null>(null);
  const [dummyLocations, setDummyLocations] = useState<Record<string, 'thuis' | 'aan-boord'>>({});

  const isCopiedCrewMember = (member: any) => {
    const notePool = [
      ...(Array.isArray(member?.active_notes) ? member.active_notes : []),
      ...(Array.isArray(member?.notes) ? member.notes : []),
    ]
    return notePool.some((n: any) => {
      const content = String(n?.content || "")
      return content.startsWith("COPIED_FROM:") || content.startsWith("Gekopieerd van:")
    })
  }

  // Scroll position preservation
  const scrollPositionRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(Date.now());
  const isUserScrollingRef = useRef(false);
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);

    // Load saved sailing regimes (A1/A2/B) per ship
    try {
      const raw = localStorage.getItem("shipSailingRegimes")
      if (raw) {
        const parsed = JSON.parse(raw || "{}")
        if (parsed && typeof parsed === "object") {
          setSailingRegimeByShipId(parsed)
        }
      }
    } catch {
      // ignore
    }
    
    // Restore scroll position after page reload or navigation back
    const savedScrollPosition = sessionStorage.getItem('shipOverviewScrollPosition')
    const savedCrewId = sessionStorage.getItem('shipOverviewScrollToCrewId')
    
    if (savedScrollPosition) {
      scrollPositionRef.current = parseInt(savedScrollPosition, 10)
      
      // Restore scroll position after content loads
      const restoreScroll = () => {
        if (scrollPositionRef.current > 0 && typeof window !== 'undefined') {
          window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' })
          
          // If we have a specific crew member ID, try to scroll to that element
          if (savedCrewId) {
            const crewElement = document.getElementById(`crew-${savedCrewId}`)
            if (crewElement) {
              crewElement.scrollIntoView({ behavior: 'instant', block: 'center' })
              // Update scroll position ref to the actual position after scrolling to element
              setTimeout(() => {
                scrollPositionRef.current = window.scrollY
              }, 50)
            }
          }
        }
      }
      
      // Try multiple times with increasing delays - more attempts for navigation back
      [0, 50, 150, 300, 500, 800, 1200, 1500, 2000].forEach((delay, index) => {
        setTimeout(() => {
          restoreScroll()
          // Only clear after last attempt and if scroll was successfully restored
          if (index === 8) {
            // Check if scroll position is close to saved position (within 50px)
            const currentScroll = window.scrollY
            const savedPos = scrollPositionRef.current
            if (Math.abs(currentScroll - savedPos) < 50) {
              sessionStorage.removeItem('shipOverviewScrollPosition')
              sessionStorage.removeItem('shipOverviewScrollToCrewId')
            }
          }
        }, delay)
      })
    }
  }, []);

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem("shipSailingRegimes", JSON.stringify(sailingRegimeByShipId || {}))
    } catch {
      // ignore
    }
  }, [mounted, sailingRegimeByShipId])

  // Continuously track and preserve scroll position
  useEffect(() => {
    if (typeof window === 'undefined') return

    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      isUserScrollingRef.current = true
      lastScrollTimeRef.current = Date.now()
      
      // Save current scroll position
      scrollPositionRef.current = window.scrollY
      
      // Clear any pending restore
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current)
        restoreTimeoutRef.current = null
      }
      
      // Mark user scrolling as done after a short delay
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 150)
    }

    const handleClick = () => {
      // Save scroll position on any click (before potential updates)
      scrollPositionRef.current = window.scrollY
    }

    // Watch for unexpected scroll resets
    const checkScrollPosition = () => {
      const currentScroll = window.scrollY
      const timeSinceLastScroll = Date.now() - lastScrollTimeRef.current
      
      // If scroll jumped to top unexpectedly (not user action and not during restore)
      if (currentScroll === 0 && scrollPositionRef.current > 100 && !isUserScrollingRef.current && timeSinceLastScroll > 500) {
        // Restore scroll position
        if (restoreTimeoutRef.current) clearTimeout(restoreTimeoutRef.current)
        restoreTimeoutRef.current = setTimeout(() => {
          window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' })
        }, 50)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleClick, true)
    
    // Check scroll position periodically
    const scrollCheckInterval = setInterval(checkScrollPosition, 100)

    // Save scroll position before unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem('shipOverviewScrollPosition', window.scrollY.toString())
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(scrollCheckInterval)
      if (scrollTimeout) clearTimeout(scrollTimeout)
      if (restoreTimeoutRef.current) clearTimeout(restoreTimeoutRef.current)
    }
  }, [])

  // Restore scroll after data updates - more aggressive
  useEffect(() => {
    if (loading || !mounted) return
    
    // Check both ref and sessionStorage for saved position
    const savedPos = scrollPositionRef.current || parseInt(sessionStorage.getItem('shipOverviewScrollPosition') || '0', 10)
    const savedCrewId = sessionStorage.getItem('shipOverviewScrollToCrewId')
    
    if (savedPos > 0) {
      // Restore function that tries both scroll position and crew member element
      const restoreScroll = () => {
        const currentSavedPos = scrollPositionRef.current || parseInt(sessionStorage.getItem('shipOverviewScrollPosition') || '0', 10)
        if (currentSavedPos > 0) {
          // First try to scroll to the specific crew member element if we have an ID
          if (savedCrewId) {
            const crewElement = document.getElementById(`crew-${savedCrewId}`)
            if (crewElement) {
              crewElement.scrollIntoView({ behavior: 'instant', block: 'center' })
              // Update scroll position ref to the actual position after scrolling
              setTimeout(() => {
                scrollPositionRef.current = window.scrollY
              }, 50)
              return
            }
          }
          
          // Fallback to saved scroll position
          if (window.scrollY !== currentSavedPos && !isUserScrollingRef.current) {
            window.scrollTo({ top: currentSavedPos, behavior: 'instant' })
            scrollPositionRef.current = currentSavedPos
          }
        }
      }
      
      // Immediately restore if scroll position is wrong
      if (window.scrollY !== savedPos && !isUserScrollingRef.current) {
        restoreScroll()
      }
      
      // Multiple attempts to restore scroll position with longer delays
      const restoreAttempts = [10, 50, 100, 200, 300, 500, 800, 1200, 1500, 2000]
      const timeouts = restoreAttempts.map((delay, index) => 
        setTimeout(() => {
          restoreScroll()
          // Clear saved position after last attempt if scroll was successfully restored
          if (index === restoreAttempts.length - 1) {
            const currentScroll = window.scrollY
            const finalSavedPos = scrollPositionRef.current || parseInt(sessionStorage.getItem('shipOverviewScrollPosition') || '0', 10)
            // If scroll position is close to saved position (within 100px), clear the saved position
            if (Math.abs(currentScroll - finalSavedPos) < 100 && !isUserScrollingRef.current) {
              sessionStorage.removeItem('shipOverviewScrollPosition')
              sessionStorage.removeItem('shipOverviewScrollToCrewId')
            }
          }
        }, delay)
      )
      
      return () => {
        timeouts.forEach(clearTimeout)
      }
    }
  }, [loading, crew, ships, mounted])

  // Initialize dummy locations from crew data (check notes for stored location)
  useEffect(() => {
    if (crew) {
      const locations: Record<string, 'thuis' | 'aan-boord'> = {}
      crew.forEach((member: any) => {
        if (member.is_dummy || isCopiedCrewMember(member)) {
          // Check if location is stored in notes
          const locationNote = member.active_notes?.find((n: any) => 
            n.content?.startsWith('DUMMY_LOCATION:')
          )
          if (locationNote) {
            const location = locationNote.content.replace('DUMMY_LOCATION:', '') as 'thuis' | 'aan-boord'
            locations[member.id] = location || 'thuis'
          } else {
            // Default: copied crew follows status, dummy defaults thuis
            if (isCopiedCrewMember(member)) {
              locations[member.id] = member.status === 'aan-boord' ? 'aan-boord' : 'thuis'
            } else {
              locations[member.id] = 'thuis'
            }
          }
        }
      })
      setDummyLocations(locations)
    }
  }, [crew])

  // Helper function to reload page while preserving scroll position
  const reloadWithScrollPosition = () => {
    if (typeof window !== 'undefined') {
      const currentScroll = window.scrollY
      sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString())
      scrollPositionRef.current = currentScroll
      window.location.reload()
    }
  }

  // Helper function to preserve scroll position during async operations
  const preserveScrollPosition = (asyncOperation: () => Promise<void>) => {
    const savedScroll = window.scrollY
    scrollPositionRef.current = savedScroll
    
    return asyncOperation().finally(() => {
      // Restore scroll after operation completes
      setTimeout(() => {
        if (scrollPositionRef.current > 0) {
          window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' })
        }
      }, 100)
    })
  }

  const performSearch = useCallback(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return
    const shipMatch = ships.find((s: any) => (s.name || "").toLowerCase().includes(q))
    if (shipMatch) {
      const elId = `ship-${shipMatch.id}`
      const el = typeof window !== "undefined" ? document.getElementById(elId) : null
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        setHighlightTargetId(elId)
        setTimeout(() => setHighlightTargetId(null), 2000)
      }
      return
    }
    const crewMatch = crew.find((m: any) =>
      `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase().includes(q)
    )
    if (crewMatch) {
      const elId = `crew-${crewMatch.id}`
      const el = typeof window !== "undefined" ? document.getElementById(elId) : null
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setHighlightTargetId(elId)
        setTimeout(() => setHighlightTargetId(null), 2000)
      }
    }
  }, [searchQuery, ships, crew])

  useEffect(() => {
    setSearchRunner(performSearch)
    return () => setSearchRunner(null)
  }, [performSearch, setSearchRunner])

  // Don't render until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen {t('overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">{t('loading')}...</div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen {t('overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">{t('loading')} data...</div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen {t('overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Fout: {error}</div>
        </CardContent>
      </Card>
    );
  }

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  // Crew Card Component
  const CrewCard = ({ 
    member, 
    onDoubleClick, 
    sickLeave, 
    borderColor, 
    tasks,
    draggedDummyId,
    onDragStart,
    onDragEnd
  }: { 
    member: any; 
    onDoubleClick: (id: string, name: string) => void; 
    sickLeave: any[]; 
    borderColor?: string; 
    tasks: any[];
    draggedDummyId?: string | null;
    onDragStart?: (e: React.DragEvent, id: string) => void;
    onDragEnd?: () => void;
  }) => {
    const [paletteOpen, setPaletteOpen] = useState(false)
    const COLOR_OPTIONS = [
      "#FEE2E2", // red-100
      "#FFEDD5", // orange-100
      "#FEF3C7", // amber-100
      "#E0E7FF", // indigo-100
      "#F3E8FF", // purple-100
    ]
    const getNextRotation = () => {
      // Als er een expected_start_date is, bereken dagen tot startdatum
      if (member.expected_start_date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDate = new Date(member.expected_start_date)
        startDate.setHours(0, 0, 0, 0)
        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilStart
      }
      
      if (!member.regime || member.regime === "Altijd") return null
      const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
      return statusCalculation.daysUntilRotation
    }

    const nextRotation = getNextRotation()
    // isWaitingForStart = true alleen als expected_start_date in de toekomst is
    const isWaitingForStart = member.expected_start_date ? (() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(member.expected_start_date)
      startDate.setHours(0, 0, 0, 0)
      return startDate > today
    })() : false

    // Haal afwezig/ziek-informatie op
    const sickInfo = getActiveLeaveForMember(member.id)
    const isAbsent = member.status === "afwezig" || (sickInfo ? isAbsentLeaveRecord(sickInfo) : false)

    const isDummy = member.is_dummy === true
    const notePool = [
      ...(Array.isArray(member.active_notes) ? member.active_notes : []),
      ...(Array.isArray(member.notes) ? member.notes : []),
    ]
    const copiedMetaNote = notePool.find((n: any) => {
      const content = String(n?.content || "")
      return content.startsWith("COPIED_FROM:") || content.startsWith("Gekopieerd van:")
    })
    const copiedFromName = copiedMetaNote
      ? String(copiedMetaNote.content || "")
          .replace("COPIED_FROM:", "")
          .replace("Gekopieerd van:", "")
          .trim()
      : ""
    const isCopied = !!copiedFromName
    const isPurePlaceholderDummy = isDummy && !isCopied
    const isMovableLikeDummy = isDummy || isCopied
    const isAflosser = member.position === "Aflosser" || member.is_aflosser === true
    const isOverigPersoneel = member.ship_id?.toString().toLowerCase().trim() === 'overig'
    
    // Get A/B designation (niet voor aflossers of overig personeel)
    const abDesignation = !isAflosser && !isOverigPersoneel ? getCrewABDesignation(member) : null
    const [abSelectorOpen, setAbSelectorOpen] = useState(false)
    const abSelectorRef = useRef<HTMLDivElement>(null)

    // Close A/B selector when clicking outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (abSelectorRef.current && !abSelectorRef.current.contains(event.target as Node)) {
          setAbSelectorOpen(false)
        }
      }

      if (abSelectorOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [abSelectorOpen])

    return (
      <div
        id={`crew-${member.id}`}
        className={`p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative ${isMovableLikeDummy ? 'opacity-75 border-dashed cursor-move' : ''} ${draggedDummyId === member.id ? 'opacity-50' : ''}`}
        style={{
          backgroundColor: isMovableLikeDummy ? '#f9fafb' : (crewColorTags[member.id] || undefined),
          boxShadow: crewColorTags[member.id] && !isDummy ? "inset 0 0 0 2px rgba(0,0,0,0.05)" : undefined,
          borderColor: isCopied ? "#eab308" : (highlightTargetId === `crew-${member.id}` ? "#f59e0b" : (borderColor || "#e5e7eb")),
          borderWidth: "2px",
          transition: 'border-color 0.2s ease',
          backgroundImage: isMovableLikeDummy ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)' : undefined
        }}
        onDoubleClick={() => !isMovableLikeDummy && onDoubleClick(member.id, `${member.first_name} ${member.last_name}`)}
        draggable={isMovableLikeDummy}
        onDragStart={(e) => isMovableLikeDummy && onDragStart && onDragStart(e, member.id)}
        onDragEnd={isMovableLikeDummy ? onDragEnd : undefined}
      >
        {/* Top-right controls: A/B designation + color button + optional student badge + dummy delete button */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {/* A/B Designation - Prominent indicator (niet voor aflossers of overig personeel) */}
          {!isAflosser && !isOverigPersoneel && (
            <div ref={abSelectorRef} className="z-10">
              {abSelectorOpen ? (
                <div className="bg-white shadow-lg border-2 border-gray-300 rounded-lg p-2 flex gap-2">
                  <button
                    type="button"
                    className={`w-12 h-12 rounded-lg font-bold text-xl border-2 transition-all flex items-center justify-center ${
                      abDesignation === 'A'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-100 hover:border-blue-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleABDesignationChange(member.id, abDesignation === 'A' ? null : 'A');
                      setAbSelectorOpen(false);
                    }}
                    title={abDesignation === 'A' ? 'A verwijderen' : 'A selecteren'}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    className={`w-12 h-12 rounded-lg font-bold text-xl border-2 transition-all flex items-center justify-center ${
                      abDesignation === 'B'
                        ? 'bg-yellow-500 text-white border-yellow-600 shadow-md'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-yellow-100 hover:border-yellow-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleABDesignationChange(member.id, abDesignation === 'B' ? null : 'B');
                      setAbSelectorOpen(false);
                    }}
                    title={abDesignation === 'B' ? 'B verwijderen' : 'B selecteren'}
                  >
                    B
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAbSelectorOpen(true);
                  }}
                  className={`w-12 h-12 rounded-lg font-bold text-xl border-2 flex items-center justify-center shadow-md transition-all ${
                    abDesignation === 'A'
                      ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                      : abDesignation === 'B'
                      ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600'
                      : 'bg-gray-200 text-gray-600 border-gray-400 hover:bg-gray-300'
                  }`}
                  title={abDesignation ? `${abDesignation} - Klik om te wijzigen` : 'A/B selecteren'}
                >
                  {abDesignation || '?'}
                </button>
              )}
            </div>
          )}
          {(isDummy || isCopied) && (
            <button
              type="button"
              className="w-6 h-6 rounded border bg-white flex items-center justify-center shadow-sm text-red-600 hover:bg-red-50"
              title={isDummy ? "Dummy verwijderen" : "Kopie verwijderen"}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDummy(member.id, isDummy ? "dummy" : "kopie");
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!isDummy && (
            <button
              type="button"
              className="w-6 h-6 rounded border bg-white flex items-center justify-center shadow-sm"
              title="Kleur instellen"
              onClick={(e) => { e.stopPropagation(); setPaletteOpen((v) => !v) }}
            >
              <span
                className="inline-block w-4 h-4 rounded-sm border"
                style={{ backgroundColor: crewColorTags[member.id] || '#ffffff' }}
              />
            </button>
          )}
          {member.is_student && member.education_type && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              member.education_type === 'BOL' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {member.education_type}
            </span>
          )}
        </div>

        {paletteOpen && (
          <div className="absolute top-10 right-2 bg-white shadow-lg border rounded-md p-2 z-10">
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: c }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const currentScroll = window.scrollY;
                    scrollPositionRef.current = currentScroll;
                    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
                    setCrewColorTag(member.id, c); 
                    setPaletteOpen(false);
                    // Restore scroll after color tag update
                    setTimeout(() => {
                      if (scrollPositionRef.current > 0) {
                        window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
                      }
                    }, 100);
                  }}
                  title="Kleur instellen"
                />
              ))}
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const currentScroll = window.scrollY;
                  scrollPositionRef.current = currentScroll;
                  sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
                  setCrewColorTag(member.id, null); 
                  setPaletteOpen(false);
                  // Restore scroll after color tag update
                  setTimeout(() => {
                    if (scrollPositionRef.current > 0) {
                      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
                    }
                  }, 100);
                }}
              >
                Geen
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className={`text-xs ${isPurePlaceholderDummy ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
              {isPurePlaceholderDummy ? '?' : (member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Name and Nationality */}
            <div className="flex items-center space-x-2 mb-1">
              {isCopied && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700 bg-blue-50">
                  KOPIE
                </Badge>
              )}
              {isPurePlaceholderDummy ? (
                <span className="font-medium text-gray-500 italic text-sm">
                  Ontbreekt: {member.position || 'Onbekende functie'}
                  {member.nationality && ` (${member.nationality})`}
                </span>
              ) : (
                <>
                  <Link 
                    href={`/bemanning/${member.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 truncate text-sm"
                    onClick={() => {
                      const currentScroll = window.scrollY
                      sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString())
                      sessionStorage.setItem('shipOverviewScrollToCrewId', member.id)
                      scrollPositionRef.current = currentScroll
                    }}
                  >
                    {member.first_name} {member.last_name}
                  </Link>
                  <span className="text-sm">{getNationalityFlag(member.nationality)}</span>
                </>
              )}
              {(() => {
                const crewTasks = tasks.filter((t: any) => !t.completed && t.related_crew_id === member.id)
                if (crewTasks.length === 0) return null
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="focus:outline-none">
                        <AlertCircle className="w-6 h-6 text-red-600 animate-pulse cursor-pointer flex-shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="max-w-sm">
                      <div className="space-y-2">
                        <div className="font-semibold text-sm mb-2">{uiText.openTasks} ({crewTasks.length}):</div>
                        {crewTasks.map((task: any) => (
                          <Link 
                            key={task.id} 
                            href={`/taken?taskId=${task.id}`}
                            className="block border-l-2 border-orange-500 pl-2 text-xs mb-2 hover:bg-orange-50 p-2 rounded cursor-pointer transition-colors"
                          >
                            <div className="font-medium">{task.title}</div>
                            {task.priority && (
                              <div className="text-gray-600">{uiText.priority}: {task.priority}</div>
                            )}
                            {task.assigned_to && (
                              <div className="text-gray-600">{uiText.assignedTo}: {task.assigned_to}</div>
                            )}
                            {task.deadline && (
                              <div className="text-gray-600">{uiText.deadline}: {format(new Date(task.deadline), "dd-MM-yyyy")}</div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              })()}
            </div>

            {/* Function - alleen tonen als geen dummy */}
            {!isDummy && (
              <div className="text-xs text-gray-600 mb-1">
                {member.position}
              </div>
            )}
            
            {/* Dummy specifieke info */}
            {isDummy && (
              <>
                {member.diplomas && member.diplomas.length > 0 && (
                  <div className="mb-1">
                    <div className="text-xs text-gray-500 font-medium mb-1">Gevraagde diploma's:</div>
                    <div className="flex flex-wrap gap-1">
                      {member.diplomas.map((diploma: string, index: number) => (
                        <span key={index} className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded border border-dashed">
                          {diploma}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Dummy opmerking */}
                {member.active_notes && member.active_notes.filter((note: any) => !note.content?.startsWith('DUMMY_LOCATION:') && !note.content?.startsWith('CREW_AB_DESIGNATION:') && !note.content?.startsWith('COPIED_FROM:') && !note.content?.startsWith('Gekopieerd van:')).length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <div className="text-xs text-orange-800 font-semibold flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      OPMERKING:
                    </div>
                    {member.active_notes.filter((note: any) => !note.content?.startsWith('DUMMY_LOCATION:') && !note.content?.startsWith('CREW_AB_DESIGNATION:') && !note.content?.startsWith('COPIED_FROM:') && !note.content?.startsWith('Gekopieerd van:')).map((note: any) => (
                      <div key={note.id} className="text-xs text-orange-950 bg-amber-200 p-2 rounded border-2 border-amber-500 shadow-sm font-medium">
                        {note.content}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Diplomas (alleen voor niet-zieke bemanningsleden en geen dummy's) */}
            {!sickInfo && !isDummy && member.diplomas && member.diplomas.length > 0 && (
              <div className="mb-1">
                <div className="flex flex-wrap gap-1">
                  {member.diplomas.map((diploma: string, index: number) => (
                    <span key={index} className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                      {diploma}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isCopied && member.expected_start_date && (
              <div className="mb-1">
                <Badge className="bg-yellow-100 text-yellow-900 border border-yellow-400 text-[11px] font-semibold">
                  Gaat aan boord vanaf: {format(new Date(member.expected_start_date), 'dd-MM-yyyy')}
                </Badge>
              </div>
            )}

            {/* Regime en Next Rotation (alleen voor niet-zieke bemanningsleden, geen aflossers en geen pure placeholder dummy's) */}
            {!sickInfo && !isPurePlaceholderDummy && member.position !== "Aflosser" && (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  Regime: {member.regime || "Geen"}
                </div>

                {nextRotation !== null && (
                  <div className="text-xs text-blue-600 mb-1">
                    {isWaitingForStart ? (
                      <>
                        Gaat aan boord vanaf: {format(new Date(member.expected_start_date), 'dd-MM-yyyy')}
                      </>
                    ) : (
                      <>
                        {(() => {
                          if (!member.regime || member.regime === "Altijd") return ""
                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
                          if (!statusCalculation.nextRotationDate) return ""
                          const dateStr = format(new Date(statusCalculation.nextRotationDate), 'dd-MM-yyyy')
                          // Toon juiste tekst op basis van huidige status
                          if (statusCalculation.currentStatus === "aan-boord") {
                            return <>Naar huis op: {dateStr}</>
                          } else {
                            return <>Gaat aan boord vanaf: {dateStr}</>
                          }
                        })()}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Ziekinformatie voor zieke bemanningsleden */}
            {sickInfo && (
              <div className="mt-2 space-y-1 border-t pt-2">
                <div className="text-xs text-red-600 font-medium">
                  {isAbsent ? uiText.absentInfo : uiText.sickInfo}
                </div>
                <div className="text-xs text-gray-600">
                  Status: {isAbsent ? uiText.absent : uiText.sick}
                </div>
                <div className="text-xs text-gray-600">
                  {isAbsent ? "Afwezig vanaf" : uiText.sickSince}: {format(new Date(sickInfo.start_date), 'dd-MM-yyyy')}
                </div>
                {!isAbsent && (
                  <div className="text-xs text-gray-600">
                    {sickInfo.certificate_valid_until ? (() => {
                      const certDate = new Date(sickInfo.certificate_valid_until)
                      const today = new Date()
                      certDate.setHours(0, 0, 0, 0)
                      today.setHours(0, 0, 0, 0)
                      const isExpired = certDate < today
                      return (
                        <>
                          Briefje tot:{" "}
                          <span className={isExpired ? "text-red-600 font-semibold" : ""}>
                            {format(certDate, 'dd-MM-yyyy')}
                          </span>
                        </>
                      )
                    })() : (
                      <>Geen briefje</>
                    )}
                  </div>
                )}
                {sickInfo.notes && (
                  <div className="text-xs text-gray-600">
                    Reden: {String(sickInfo.notes).replace("[AFWEZIG]", "").trim()}
                  </div>
                )}
                <div className="text-xs text-gray-600">
                  {sickInfo.salary_percentage}% betaald door {sickInfo.paid_by}
                </div>
              </div>
            )}

            {/* Aflosser informatie */}
            {member.position === "Aflosser" && (() => {
              // Get assignment history from localStorage
              let assignmentHistory: any[] = []
              if (typeof window !== 'undefined') {
                const assignmentHistoryKey = `assignment_history_${member.id}`
                assignmentHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
              }

              const currentAssignment = assignmentHistory
                ?.filter((entry: any) => entry.type === "assignment")
                ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

              if (currentAssignment) {
                return (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <div className="text-xs text-blue-600 font-medium">Aflosser Toewijzing:</div>
                    {currentAssignment.assignment_type === "trip" && currentAssignment.trip_from && currentAssignment.trip_to ? (
                      <>
                        <div className="text-xs text-gray-600">
                          Reis: {currentAssignment.trip_from} → {currentAssignment.trip_to}
                        </div>
                        <div className="text-xs text-gray-600">
                          Vanaf: {format(new Date(currentAssignment.start_date), 'dd-MM-yyyy')}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-gray-600">
                          Periode: {format(new Date(currentAssignment.start_date), 'dd-MM-yyyy')}
                          {currentAssignment.end_date && ` - ${format(new Date(currentAssignment.end_date), 'dd-MM-yyyy')}`}
                        </div>
                      </>
                    )}
                    {currentAssignment.notes && (
                      <div className="text-xs text-gray-600">
                        {currentAssignment.notes}
                      </div>
                    )}
                  </div>
                )
              }
              return null
            })()}

            {/* Active Notes */}
            {member.active_notes && member.active_notes.filter((note: any) => !note.content?.startsWith('DUMMY_LOCATION:') && !note.content?.startsWith('CREW_AB_DESIGNATION:') && !note.content?.startsWith('COPIED_FROM:') && !note.content?.startsWith('Gekopieerd van:')).length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2">
                <div className="text-xs text-orange-800 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  OPMERKINGEN:
                </div>
                {member.active_notes.filter((note: any) => !note.content?.startsWith('DUMMY_LOCATION:') && !note.content?.startsWith('CREW_AB_DESIGNATION:') && !note.content?.startsWith('COPIED_FROM:') && !note.content?.startsWith('Gekopieerd van:')).map((note: any) => (
                  <div key={note.id} className="text-xs text-orange-950 bg-amber-200 p-2 rounded border-2 border-amber-500 shadow-sm font-medium flex items-start justify-between gap-2">
                    <span className="flex-1">{note.content}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNote(member.id, note.id, note.content);
                      }}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                      title="Notitie verwijderen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  function getCrewDetails(crew: any) {
    const onBoard = crew.filter((member: any) => member.status === "aan-boord").length
    const atHome = crew.filter((member: any) => member.status === "thuis").length
    const sick = crew.filter((member: any) => member.status === "ziek").length
    const notAssigned = crew.filter((member: any) => member.status === "nog-in-te-delen").length

    return { onBoard, atHome, sick, notAssigned }
  }

  function SafeDate({ date }: { date: string }) {
    if (!date) return <span className="text-gray-400">Niet ingevuld</span>
    try {
      return <span>{format(new Date(date), 'dd-MM-yyyy')}</span>
    } catch {
      return <span className="text-gray-400">Ongeldige datum</span>
    }
  }

  function handleDoubleClick(crewId: string, crewName: string) {
    setQuickNoteDialog({
      isOpen: true,
      crewId,
      crewName
    });
    setQuickNote("");
  }

  async function handleSaveQuickNote() {
    if (!quickNote.trim()) return;

    if (typeof window === 'undefined') return;
    
    // Save scroll position before action
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;
    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
    
    // Prevent scroll jump during update by temporarily locking scroll
    isUserScrollingRef.current = true;
    
    // Immediately restore scroll position if it changes - aggressive watcher
    const scrollWatcher = setInterval(() => {
      if (window.scrollY !== currentScroll) {
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
        scrollPositionRef.current = currentScroll;
      }
    }, 10);

    try {
      await addNoteToCrew(quickNoteDialog.crewId, quickNote.trim());
      
      setQuickNoteDialog({
        isOpen: false,
        crewId: "",
        crewName: ""
      });
      setQuickNote("");

      // Keep scroll watcher active during data reload
      // Continue watching and restoring scroll for a bit longer
      const continueWatching = setInterval(() => {
        if (window.scrollY !== currentScroll) {
          window.scrollTo({ top: currentScroll, behavior: 'instant' });
          scrollPositionRef.current = currentScroll;
        }
      }, 10);
      
      // Stop watching after data has fully loaded and rendered
      setTimeout(() => {
        clearInterval(scrollWatcher);
        clearInterval(continueWatching);
        
        // Final restore
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
        scrollPositionRef.current = currentScroll;
        
        // Re-enable user scrolling
        setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 200);
      }, 2500);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Fout bij het opslaan van de notitie');
      clearInterval(scrollWatcher);
      isUserScrollingRef.current = false;
    }
  }

  function handleRemoveNote(crewId: string, noteId: string, noteContent: string) {
    setDeleteNoteDialog({
      isOpen: true,
      crewId,
      noteId,
      noteContent
    });
  }

  // Get A/B designation from crew member notes
  function getCrewABDesignation(member: any): 'A' | 'B' | null {
    if (!member.active_notes) return null
    const abNote = member.active_notes.find((n: any) => 
      n.content?.startsWith('CREW_AB_DESIGNATION:')
    )
    if (abNote) {
      const designation = abNote.content.replace('CREW_AB_DESIGNATION:', '').trim() as 'A' | 'B'
      return (designation === 'A' || designation === 'B') ? designation : null
    }
    return null
  }

  // Handle A/B designation change
  async function handleABDesignationChange(crewId: string, designation: 'A' | 'B' | null) {
    // Save scroll position before update - prevent any scroll jumps
    if (typeof window === 'undefined') return;
    
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;
    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
    
    // Prevent scroll jump during update by temporarily locking scroll
    isUserScrollingRef.current = true;
    
    // Immediately restore scroll position if it changes - aggressive watcher
    const scrollWatcher = setInterval(() => {
      if (window.scrollY !== currentScroll) {
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
        scrollPositionRef.current = currentScroll;
      }
    }, 10);
    
    try {
      const member = crew.find((m: any) => m.id === crewId)
      if (!member) {
        clearInterval(scrollWatcher);
        isUserScrollingRef.current = false;
        return;
      }

      const existingNotes = member.active_notes || []
      const abNote = existingNotes.find((n: any) => n.content?.startsWith('CREW_AB_DESIGNATION:'))
      
      let updatedNotes = [...existingNotes]
      
      // Remove existing A/B note if it exists
      if (abNote) {
        updatedNotes = updatedNotes.filter((n: any) => n.id !== abNote.id)
      }
      
      // Add new A/B note if designation is provided
      if (designation) {
        updatedNotes.push({
          id: crypto.randomUUID(),
          content: `CREW_AB_DESIGNATION:${designation}`,
          created_at: new Date().toISOString(),
          created_by: 'System'
        })
      }

      const { error } = await supabase
        .from('crew')
        .update({ active_notes: updatedNotes })
        .eq('id', crewId)

      if (error) {
        console.error('Error updating A/B designation:', error)
        alert('Fout bij het bijwerken van A/B aanduiding')
        clearInterval(scrollWatcher);
        isUserScrollingRef.current = false;
      } else {
        // Keep scroll watcher active during data reload
        // Reload data without full page reload to preserve scroll position
        await loadData()
        
        // Continue watching and restoring scroll for a bit longer
        const continueWatching = setInterval(() => {
          if (window.scrollY !== currentScroll) {
            window.scrollTo({ top: currentScroll, behavior: 'instant' });
            scrollPositionRef.current = currentScroll;
          }
        }, 10);
        
        // Stop watching after data has fully loaded and rendered
        setTimeout(() => {
          clearInterval(scrollWatcher);
          clearInterval(continueWatching);
          
          // Final restore
          window.scrollTo({ top: currentScroll, behavior: 'instant' });
          scrollPositionRef.current = currentScroll;
          
          // Re-enable user scrolling
          setTimeout(() => {
            isUserScrollingRef.current = false;
          }, 200);
        }, 2500);
      }
    } catch (err) {
      console.error('Error updating A/B designation:', err)
      alert('Er is een fout opgetreden bij het bijwerken van A/B aanduiding')
      clearInterval(scrollWatcher);
      isUserScrollingRef.current = false;
    }
  }

  async function handleConfirmDeleteNote() {
    if (typeof window === 'undefined') return;
    
    // Save scroll position before action
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;
    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
    
    // Prevent scroll jump during update by temporarily locking scroll
    isUserScrollingRef.current = true;
    
    // Immediately restore scroll position if it changes - aggressive watcher
    const scrollWatcher = setInterval(() => {
      if (window.scrollY !== currentScroll) {
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
        scrollPositionRef.current = currentScroll;
      }
    }, 10);

    try {
      await removeNoteFromCrew(deleteNoteDialog.crewId, deleteNoteDialog.noteId);
      
      setDeleteNoteDialog({
        isOpen: false,
        crewId: "",
        noteId: "",
        noteContent: ""
      });

      // Keep scroll watcher active during data reload
      // Continue watching and restoring scroll for a bit longer
      const continueWatching = setInterval(() => {
        if (window.scrollY !== currentScroll) {
          window.scrollTo({ top: currentScroll, behavior: 'instant' });
          scrollPositionRef.current = currentScroll;
        }
      }, 10);
      
      // Stop watching after data has fully loaded and rendered
      setTimeout(() => {
        clearInterval(scrollWatcher);
        clearInterval(continueWatching);
        
        // Final restore
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
        scrollPositionRef.current = currentScroll;
        
        // Re-enable user scrolling
        setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 200);
      }, 2500);
    } catch (error) {
      console.error('Error removing note:', error);
      alert('Fout bij het verwijderen van de notitie');
      clearInterval(scrollWatcher);
      isUserScrollingRef.current = false;
    }
  }

  async function handleDeleteShip(shipId: string, shipName: string) {
    if (confirm(`Weet je zeker dat je het schip "${shipName}" wilt verwijderen?`)) {
      // Save scroll position before action
      const currentScroll = window.scrollY;
      scrollPositionRef.current = currentScroll;
      sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
      
      try {
        // Delete ship from Supabase
        const { error } = await supabase
          .from('ships')
          .delete()
          .eq('id', shipId)

        if (error) {
          console.error('Error deleting ship:', error)
          alert(`Fout bij het verwijderen van het schip: ${error.message}`)
          return
        }

        // Success message
        alert(`Schip "${shipName}" is succesvol verwijderd.`)
        
        // Reload the data while preserving scroll position
        reloadWithScrollPosition()
      } catch (err) {
        console.error('Error deleting ship:', err)
        alert('Er is een fout opgetreden bij het verwijderen van het schip.')
      }
    }
  }

  async function handleCreateDummy() {
    const sourceCrew =
      dummyForm.sourceMode === "copy"
        ? crew.find((m: any) => m.id === dummyForm.sourceCrewId && !m.is_dummy)
        : null

    if (dummyForm.sourceMode === "copy" && !sourceCrew) {
      alert("Selecteer eerst een bestaand bemanningslid om te kopieren")
      return
    }

    if (!dummyForm.position.trim()) {
      alert('Selecteer een functie')
      return
    }

    // Save scroll position before action
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;
    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());

    setIsCreatingDummy(true)
    try {
      // Parse diplomas from comma-separated string
      const diplomasArray = dummyForm.diplomas
        ? dummyForm.diplomas.split(',').map(d => d.trim()).filter(d => d.length > 0)
        : []

      // Create notes array if notes are provided
      const notesArray = dummyForm.notes.trim()
        ? [{
            id: Date.now().toString(),
            content: dummyForm.notes.trim(),
            created_at: new Date().toISOString(),
            created_by: 'System'
          }]
        : []

      if (sourceCrew) {
        notesArray.unshift({
          id: `${Date.now()}-source`,
          content: `COPIED_FROM:${`${sourceCrew.first_name || ""} ${sourceCrew.last_name || ""}`.trim()}`,
          created_at: new Date().toISOString(),
          created_by: 'System'
        })
      }
      if (dummyForm.abDesignation === "A" || dummyForm.abDesignation === "B") {
        notesArray.push({
          id: `${Date.now()}-ab`,
          content: `CREW_AB_DESIGNATION:${dummyForm.abDesignation}`,
          created_at: new Date().toISOString(),
          created_by: 'System'
        })
      }

      // Generate UUID for the dummy
      const dummyId = crypto.randomUUID()
      
      const isCopyMode = dummyForm.sourceMode === "copy" && !!sourceCrew

      const dummyData = {
        id: dummyId,
        first_name: isCopyMode ? String(sourceCrew.first_name || "") : 'DUMMY',
        last_name: isCopyMode ? String(sourceCrew.last_name || "") : '',
        position: dummyForm.position,
        nationality: dummyForm.nationality || null,
        ship_id: dummyDialog.shipId,
        status: isCopyMode ? 'thuis' : 'nog-in-te-delen',
        expected_start_date: isCopyMode ? (dummyForm.expectedStartDate || null) : null,
        // Kopieen tellen ook als dummy (nooit als echte bemanning meetellen)
        is_dummy: true,
        diplomas: diplomasArray,
        regime: isCopyMode ? (sourceCrew.regime || 'Altijd') : 'Altijd',
        birth_date: isCopyMode ? (sourceCrew.birth_date || null) : '1900-01-01',
        address: isCopyMode ? (sourceCrew.address || {}) : {},
        assignment_history: [],
        phone: isCopyMode ? (sourceCrew.phone || null) : null,
        email: isCopyMode ? (sourceCrew.email || null) : null,
        notes: [],
        active_notes: notesArray
      }
      
      console.log('Creating dummy with data:', JSON.stringify(dummyData, null, 2))
      
      const { data, error } = await supabase
        .from('crew')
        .insert([dummyData])
        .select()
        .single()

      if (error) {
        console.error('Error creating dummy:', error)
        console.error('Error code:', error.code)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Error message:', error.message)
        
        let errorMsg = error.message || 'Onbekende fout'
        if (error.code === '42703' || error.message?.includes('is_dummy') || error.details?.includes('is_dummy') || error.hint?.includes('is_dummy')) {
          errorMsg = 'De is_dummy kolom bestaat nog niet in de database. Voeg deze toe in Supabase SQL Editor:\n\nALTER TABLE crew ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT FALSE;'
        }
        
        alert(`Fout bij het aanmaken van dummy: ${errorMsg}`)
        return
      }

      // Success - close dialog and reload
      setDummyDialog({
        isOpen: false,
        shipId: "",
        shipName: ""
      })
      setDummyForm({
        sourceMode: "empty",
        sourceCrewId: "",
        expectedStartDate: "",
        abDesignation: "",
        position: "",
        nationality: "",
        diplomas: "",
        notes: ""
      })

      // Reload the data while preserving scroll position
      reloadWithScrollPosition()
    } catch (err: any) {
      console.error('Error creating dummy:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      
      let errorMsg = 'Er is een fout opgetreden bij het aanmaken van de dummy.'
      if (err?.message?.includes('is_dummy') || err?.code === '42703') {
        errorMsg = 'De is_dummy kolom bestaat nog niet in de database. Voeg deze toe in Supabase SQL Editor met:\n\nALTER TABLE crew ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT FALSE;'
      } else if (err?.message) {
        errorMsg = `Fout: ${err.message}`
      }
      
      alert(errorMsg)
    } finally {
      setIsCreatingDummy(false)
    }
  }

  async function handleDeleteDummy(crewId: string, label: "dummy" | "kopie" = "dummy") {
    if (confirm(`Weet je zeker dat je deze ${label} wilt verwijderen?`)) {
      // Save scroll position before action
      const currentScroll = window.scrollY;
      scrollPositionRef.current = currentScroll;
      sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());
      
      try {
        const { error } = await supabase
          .from('crew')
          .delete()
          .eq('id', crewId)

        if (error) {
          console.error('Error deleting dummy:', error)
          // Fallback: verberg de kopie/dummy uit overzicht als harde delete niet kan
          const { error: softError } = await supabase
            .from('crew')
            .update({ status: 'uit-dienst', ship_id: null })
            .eq('id', crewId)
          if (softError) {
            alert(`Fout bij verwijderen van ${label}: ${error.message}`)
            return
          }
          alert(`Kon ${label} niet hard verwijderen, maar is wel uit overzicht gehaald.`)
        }
        
        // Remove from dummyLocations state
        setDummyLocations(prev => {
          const newLocations = { ...prev }
          delete newLocations[crewId]
          return newLocations
        })

        // Reload the data while preserving scroll position
        reloadWithScrollPosition()
      } catch (err) {
        console.error('Error deleting dummy:', err)
        alert(`Er is een fout opgetreden bij het verwijderen van de ${label}.`)
      }
    }
  }

  async function handleSetCopiedLocation(crewId: string, targetStatus: "thuis" | "aan-boord") {
    // Save scroll position before action
    const currentScroll = window.scrollY
    scrollPositionRef.current = currentScroll
    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString())

    try {
      const { error } = await supabase
        .from('crew')
        .update({ status: targetStatus })
        .eq('id', crewId)

      if (error) {
        console.error('Error updating copied crew location:', error)
        alert('Fout bij wijzigen van thuis/aan-boord')
        return
      }

      reloadWithScrollPosition()
    } catch (err) {
      console.error('Error updating copied crew location:', err)
      alert('Fout bij wijzigen van thuis/aan-boord')
    }
  }

  const dummySourceCandidates = [...(crew || [])]
    .filter((member: any) => member && !member.is_dummy && member.status !== "uit-dienst")
    .sort((a: any, b: any) => {
      const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase()
      const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase()
      return aName.localeCompare(bName)
    })

  // Handle dummy drag start
  function handleDummyDragStart(e: React.DragEvent, dummyId: string) {
    setDraggedDummyId(dummyId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dummyId)
  }

  // Handle dummy drag end
  function handleDummyDragEnd() {
    setDraggedDummyId(null)
  }

  // Handle drop on column
  async function handleDummyDrop(e: React.DragEvent, targetColumn: 'thuis' | 'aan-boord') {
    e.preventDefault()
    
    if (!draggedDummyId) return

    // Save scroll position before update
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;
    sessionStorage.setItem('shipOverviewScrollPosition', currentScroll.toString());

    // Update location in state immediately for UI feedback
    setDummyLocations(prev => ({
      ...prev,
      [draggedDummyId]: targetColumn
    }))

    // Update database - we'll store this in a note or metadata
    // For now, we can store it in active_notes as a special marker
    try {
      const draggedMember = crew.find((m: any) => m.id === draggedDummyId)
      if (!draggedMember) return
      const isDraggedDummy = draggedMember.is_dummy === true
      const isDraggedCopied = isCopiedCrewMember(draggedMember)
      if (!isDraggedDummy && !isDraggedCopied) return

      // Store location in notes as metadata (or we could add a field later)
      const existingNotes = draggedMember.active_notes || []
      const locationNote = existingNotes.find((n: any) => n.content?.startsWith('DUMMY_LOCATION:'))
      
      let updatedNotes = [...existingNotes]
      if (locationNote) {
        updatedNotes = updatedNotes.filter((n: any) => n.id !== locationNote.id)
      }
      
      updatedNotes.push({
        id: crypto.randomUUID(),
        content: `DUMMY_LOCATION:${targetColumn}`,
        created_at: new Date().toISOString(),
        created_by: 'System'
      })

      const updatePayload: Record<string, unknown> = { active_notes: updatedNotes }
      if (isDraggedCopied) {
        updatePayload.status = targetColumn === 'aan-boord' ? 'aan-boord' : 'thuis'
      }

      const { error } = await supabase
        .from('crew')
        .update(updatePayload)
        .eq('id', draggedDummyId)

      if (error) {
        console.error('Error updating dummy location:', error)
        // Revert state on error
        setDummyLocations(prev => ({
          ...prev,
          [draggedDummyId]: prev[draggedDummyId] === 'thuis' ? 'aan-boord' : 'thuis'
        }))
        alert('Fout bij het verplaatsen van de dummy')
      } else {
        // Restore scroll position after update - multiple attempts
        const restoreScroll = () => {
          if (scrollPositionRef.current > 0) {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
          }
        };
        
        [100, 300, 500, 800, 1200, 1500].forEach((delay) => {
          setTimeout(restoreScroll, delay);
        });
      }
    } catch (err) {
      console.error('Error updating dummy location:', err)
      // Revert state on error
      setDummyLocations(prev => ({
        ...prev,
        [draggedDummyId]: prev[draggedDummyId] === 'thuis' ? 'aan-boord' : 'thuis'
      }))
    } finally {
      setDraggedDummyId(null)
    }
  }

  // Handle drag over (to allow drop)
  function handleDummyDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ship className="w-5 h-5" />
            <span>{uiText.shipsOverview}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ships.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{uiText.noShips}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                // Group ships by company
                const shipsByCompany = ships.reduce((acc: any, ship: any) => {
                  const company = ship.company || 'Overig'
                  if (!acc[company]) {
                    acc[company] = []
                  }
                  acc[company].push(ship)
                  return acc
                }, {})

                return Object.entries(shipsByCompany).map(([company, companyShips]: [string, any], companyIndex: number) => (
                  <div 
                    key={company} 
                    className={`space-y-4 company-section ${companyIndex > 0 ? 'print-new-page' : ''}`}
                  >
                    {/* Company Header */}
                    <div className="border-b pb-3 text-center company-header">
                      <h3 className="text-2xl font-bold text-gray-900">{company}</h3>
                      <p className="text-sm text-gray-600 mt-1">{companyShips.length} {companyShips.length === 1 ? uiText.shipSingle : uiText.shipPlural}</p>
                    </div>

                    {/* Ships for this company */}
                    <div className="space-y-6 company-ships">
                      {companyShips.map((ship: any) => {
                        const shipCrew = crew.filter((member: any) => {
                          // Toon dummy's alleen als ze bij dit schip horen
                          if (member.is_dummy === true) {
                            return member.ship_id === ship.id
                          }
                          
                          // Verberg leden die uit dienst zijn
                          if (member.status === "uit-dienst") return false
                          // Verberg leden die nog niet gestart zijn (behalve dummy's)
                          if (member.status === "nog-in-te-delen" && !member.is_dummy) return false
                          
                          // For aflossers, check if they have an active trip for this ship FIRST
                          if (member.position === "Aflosser") {
                            // Check for active trips for this aflosser and ship
                            const activeTrips = trips?.filter((trip: any) => {
                              if (trip.aflosser_id !== member.id || trip.status !== 'actief' || trip.ship_id !== ship.id) {
                                return false
                              }
                              
                              // Check if start date/time has been reached
                              if (!trip.start_datum || !trip.start_tijd) {
                                return false
                              }
                              
                              // Parse start date and time (lokaal, geen UTC)
                              const startDateTime = parseLocalDateTime(trip.start_datum, trip.start_tijd)
                              
                              const now = new Date()
                              
                              // Alleen tonen als start datum/tijd is aangebroken (vandaag of verleden)
                              return startDateTime <= now
                            }) || []
                            
                            // Als er een actieve reis is voor dit schip EN de start tijd is aangebroken, toon de aflosser
                            if (activeTrips.length > 0) {
                              return true
                            }
                            
                            // Als er geen actieve reis is, check of crew member is assigned to this ship
                            if (member.ship_id !== ship.id) {
                              return false
                            }
                            
                            // Als er geen actieve reis is, check de status
                            // Alleen tonen als status "aan-boord" is (niet "thuis")
                            if (member.status !== "aan-boord") {
                              return false
                            }
                            
                            return true
                          }
                          
                          // For non-aflossers: Only show crew members assigned to this ship
                          if (member.ship_id !== ship.id) return false
                          
                          return true
                        })
                        const crewDetails = getCrewDetails(shipCrew)

                        return (
                          <div key={ship.id} id={`ship-${ship.id}`} className="border rounded-lg p-6 bg-white shadow-sm ship-card" style={{
                            borderColor: highlightTargetId === `ship-${ship.id}` ? '#f59e0b' : '#e5e7eb',
                            borderWidth: '2px',
                            transition: 'border-color 0.2s ease'
                          }}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <Ship className="w-6 h-6 text-blue-600" />
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold">{ship.name}</h3>
                                  {(() => {
                                    const shipTasks = tasks.filter((t: any) => !t.completed && t.related_ship_id === ship.id)
                                    if (shipTasks.length === 0) return null
                                    return (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button type="button" className="focus:outline-none">
                                            <AlertCircle className="w-7 h-7 text-red-600 animate-pulse cursor-pointer" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="right" className="max-w-sm">
                                          <div className="space-y-2">
                                            <div className="font-semibold text-sm mb-2">{uiText.openTasks} ({shipTasks.length}):</div>
                                            {shipTasks.map((task: any) => (
                                              <Link 
                                                key={task.id} 
                                                href={`/taken?taskId=${task.id}`}
                                                className="block border-l-2 border-orange-500 pl-2 text-xs mb-2 hover:bg-orange-50 p-2 rounded cursor-pointer transition-colors"
                                              >
                                                <div className="font-medium">{task.title}</div>
                                                {task.priority && (
                                                  <div className="text-gray-600">{uiText.priority}: {task.priority}</div>
                                                )}
                                                {task.assigned_to && (
                                                  <div className="text-gray-600">{uiText.assignedTo}: {task.assigned_to}</div>
                                                )}
                                                {task.deadline && (
                                                  <div className="text-gray-600">{uiText.deadline}: {format(new Date(task.deadline), "dd-MM-yyyy")}</div>
                                                )}
                                              </Link>
                                            ))}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )
                                  })()}
                                </div>
                              </div>
                              {role === "admin_full" && (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center gap-2 pr-2">
                                    <span className="text-xs text-gray-500">{uiText.sailingRegime}</span>
                                    <Select
                                      value={sailingRegimeByShipId[ship.id] || "A1"}
                                      onValueChange={(value) =>
                                        setSailingRegimeByShipId((prev) => ({
                                          ...(prev || {}),
                                          [ship.id]: value as SailingRegime,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-7 w-20 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A1">A1</SelectItem>
                                        <SelectItem value="A2">A2</SelectItem>
                                        <SelectItem value="B">B</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setDummyDialog({
                                        isOpen: true,
                                        shipId: ship.id,
                                        shipName: ship.name
                                      });
                                      setDummyForm({
                                        sourceMode: "empty",
                                        sourceCrewId: "",
                                        expectedStartDate: "",
                                        abDesignation: "",
                                        position: "",
                                        nationality: "",
                                        diplomas: "",
                                        notes: ""
                                      });
                                    }}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    {uiText.addDummy}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteShip(ship.id, ship.name)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Crew List - Organized by Status */}
                            {shipCrew.length > 0 ? (
                              <div className="space-y-4 mt-6">
                                <h4 className="font-medium text-gray-700">{uiText.crew}</h4>
                                
                                {/* Status Columns - desktop is 3 cols; on mobile override via CSS to also show 3 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ship-status-grid">
                                  {/* Aan Boord Column */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <h5 className="font-medium text-green-700">{uiText.onBoard}</h5>
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        {shipCrew.filter((member: any) => {
                                          // Dummy's en kopieen met location 'aan-boord'
                                          if (member.is_dummy === true || isCopiedCrewMember(member)) {
                                            return dummyLocations[member.id] === 'aan-boord'
                                          }
                                          if (isUnavailableCrewMember(member)) return false
                                          // Als expected_start_date in de toekomst is, zijn ze nog thuis
                                          if (member.expected_start_date) {
                                            const startDate = new Date(member.expected_start_date)
                                            startDate.setHours(0, 0, 0, 0)
                                            const today = new Date()
                                            today.setHours(0, 0, 0, 0)
                                            if (startDate > today) return false // Nog niet aan boord
                                            // Anders (vandaag of verleden) gebruik berekende status
                                          }
                                          if (!member.regime) return member.status === "aan-boord"
                                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, false, member.expected_start_date || null)
                                          return statusCalculation.currentStatus === "aan-boord"
                                        }).length}
                                      </Badge>
                                    </div>
                                    <div 
                                      className="space-y-3 min-h-[100px] border-2 border-dashed border-transparent hover:border-green-300 transition-colors rounded-lg p-2"
                                      onDragOver={handleDummyDragOver}
                                      onDrop={(e) => handleDummyDrop(e, 'aan-boord')}
                                    >
                                      {/* Normale crew */}
                                      {sortCrewByRank(shipCrew.filter((member: any) => {
                                        // Geen dummy's/kopieen hier (die worden apart getoond)
                                        if (member.is_dummy === true || isCopiedCrewMember(member)) return false
                                        if (isUnavailableCrewMember(member)) return false
                                        // Als expected_start_date in de toekomst is, zijn ze nog thuis (wachten)
                                        if (member.expected_start_date) {
                                          const startDate = new Date(member.expected_start_date)
                                          startDate.setHours(0, 0, 0, 0)
                                          const today = new Date()
                                          today.setHours(0, 0, 0, 0)
                                          // Als startdatum nog in de toekomst is, zijn ze nog thuis
                                          if (startDate > today) {
                                            return false // Nog niet aan boord
                                          }
                                          // Anders (vandaag of verleden) gebruik berekende status
                                        }
                                        if (!member.regime) return member.status === "aan-boord"
                                        const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
                                        return statusCalculation.currentStatus === "aan-boord"
                                      })).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#22c55e" /* Aan boord = groen */
                                          tasks={tasks}
                                        />
                                      ))}
                                      {/* Dummy's/kopieen in "aan-boord" kolom */}
                                      {shipCrew.filter((member: any) => 
                                        (member.is_dummy === true || isCopiedCrewMember(member)) &&
                                        dummyLocations[member.id] === 'aan-boord'
                                      ).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#22c55e" /* Aan boord = groen */
                                          tasks={tasks}
                                          draggedDummyId={draggedDummyId}
                                          onDragStart={handleDummyDragStart}
                                          onDragEnd={handleDummyDragEnd}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Thuis Column */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      <h5 className="font-medium text-blue-700">{uiText.atHome}</h5>
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        {shipCrew.filter((member: any) => {
                                          // Dummy's en kopieen met location 'thuis' (of niet ingesteld, default naar thuis)
                                          if (member.is_dummy === true || isCopiedCrewMember(member)) {
                                            return !dummyLocations[member.id] || dummyLocations[member.id] === 'thuis'
                                          }
                                          if (isUnavailableCrewMember(member)) return false
                                          // Als expected_start_date in de toekomst is, zijn ze nog thuis
                                          if (member.expected_start_date) {
                                            const startDate = new Date(member.expected_start_date)
                                            startDate.setHours(0, 0, 0, 0)
                                            const today = new Date()
                                            today.setHours(0, 0, 0, 0)
                                            if (startDate > today) return true // Nog thuis (wachten)
                                            // Anders (vandaag of verleden) gebruik berekende status
                                          }
                                          if (!member.regime) return member.status === "thuis"
                                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, false, member.expected_start_date || null)
                                          return statusCalculation.currentStatus === "thuis"
                                        }).length}
                                      </Badge>
                                    </div>
                                    <div 
                                      className="space-y-3 min-h-[100px] border-2 border-dashed border-transparent hover:border-blue-300 transition-colors rounded-lg p-2"
                                      onDragOver={handleDummyDragOver}
                                      onDrop={(e) => handleDummyDrop(e, 'thuis')}
                                    >
                                      {/* Normale crew (thuis) */}
                                      {sortCrewByRank(shipCrew.filter((member: any) => {
                                        // Geen dummy's/kopieen hier (die worden apart getoond)
                                        if (member.is_dummy === true || isCopiedCrewMember(member)) return false
                                        if (isUnavailableCrewMember(member)) return false
                                        // Als expected_start_date in de toekomst is, zijn ze nog thuis
                                        if (member.expected_start_date) {
                                          const startDate = new Date(member.expected_start_date)
                                          startDate.setHours(0, 0, 0, 0)
                                          const today = new Date()
                                          today.setHours(0, 0, 0, 0)
                                          if (startDate > today) return true // Nog thuis (wachten)
                                          // Anders (vandaag of verleden) gebruik berekende status
                                        }
                                        if (!member.regime) return member.status === "thuis"
                                        const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
                                        return statusCalculation.currentStatus === "thuis"
                                      })).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#3b82f6" /* Thuis = blauw */
                                          tasks={tasks}
                                        />
                                      ))}
                                      {/* Dummy's/kopieen in "thuis" kolom */}
                                      {shipCrew.filter((member: any) => 
                                        (member.is_dummy === true || isCopiedCrewMember(member)) &&
                                        (!dummyLocations[member.id] || dummyLocations[member.id] === 'thuis')
                                      ).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#3b82f6" /* Thuis = blauw */
                                          tasks={tasks}
                                          draggedDummyId={draggedDummyId}
                                          onDragStart={handleDummyDragStart}
                                          onDragEnd={handleDummyDragEnd}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Afwezig/Ziek Column */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                                      <UserX className="w-4 h-4 text-red-600" />
                                      <h5 className="font-medium text-red-700">{uiText.absent}</h5>
                                      <Badge className="bg-red-100 text-red-800 text-xs">
                                        {shipCrew.filter((member: any) => isUnavailableCrewMember(member)).length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-3 min-h-[100px]">
                                      {sortCrewByRank(shipCrew.filter((member: any) => isUnavailableCrewMember(member))).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#ef4444" /* Ziek = rood */
                                          tasks={tasks}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>Geen bemanning toegewezen</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overig Personeel Sectie */}
      {(() => {
        // Filter crew members met ship_id = 'overig'
        const overigPersoneel = crew.filter((member: any) => {
          // Check of ship_id 'overig' is (case-insensitive en met trim)
          const shipId = member.ship_id?.toString().toLowerCase().trim()
          const isOverig = shipId === 'overig'
          
          // Debug logging voor elke crew member
          if (process.env.NODE_ENV === 'development' && member.ship_id) {
            console.log('Crew member ship_id check:', {
              id: member.id,
              name: `${member.first_name} ${member.last_name}`,
              ship_id: member.ship_id,
              ship_id_lower: shipId,
              isOverig: isOverig,
              is_dummy: member.is_dummy,
              is_aflosser: member.is_aflosser,
              status: member.status
            })
          }
          
          return isOverig && 
            !member.is_dummy && 
            !member.is_aflosser &&
            member.status !== 'uit-dienst'
        })
        
        // Debug logging
        console.log('Overig personeel filter result:', {
          totalCrew: crew.length,
          overigPersoneel: overigPersoneel.length,
          allShipIds: crew.map((m: any) => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            ship_id: m.ship_id,
            ship_id_type: typeof m.ship_id
          })),
          crewWithOverig: crew.filter((m: any) => {
            const sid = m.ship_id?.toString().toLowerCase().trim()
            return sid === 'overig'
          }).map((m: any) => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            ship_id: m.ship_id,
            status: m.status,
            is_dummy: m.is_dummy,
            is_aflosser: m.is_aflosser
          }))
        })

        // Split in afwezig/ziek en overig
        const overigAfwezig = overigPersoneel.filter((member: any) => isUnavailableCrewMember(member))
        const overigNietAfwezig = overigPersoneel.filter((member: any) => !isUnavailableCrewMember(member))

        return (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Overig Personeel</span>
                <Badge variant="outline" className="ml-2">
                  {overigPersoneel.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Grid layout: Algemene lijst + Ziek kolom */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Algemene lijst (niet-afwezig personeel) */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                      <Users className="w-4 h-4 text-gray-600" />
                      <h5 className="font-medium text-gray-700">Personeel</h5>
                      <Badge className="bg-gray-100 text-gray-800 text-xs">
                        {overigNietAfwezig.length}
                      </Badge>
                    </div>
                    <div className="space-y-3 min-h-[100px]">
                      {overigNietAfwezig.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          Geen personeel
                        </div>
                      ) : (
                        sortCrewByRank(overigNietAfwezig).map((member: any) => (
                          <CrewCard
                            key={member.id}
                            member={member}
                            onDoubleClick={handleDoubleClick}
                            sickLeave={sickLeave}
                            borderColor="#e5e7eb"
                            tasks={tasks}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Afwezig/Ziek Column */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                      <UserX className="w-4 h-4 text-red-600" />
                      <h5 className="font-medium text-red-700">{uiText.absent}</h5>
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        {overigAfwezig.length}
                      </Badge>
                    </div>
                    <div className="space-y-3 min-h-[100px]">
                      {overigAfwezig.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          Geen afwezig personeel
                        </div>
                      ) : (
                        sortCrewByRank(overigAfwezig).map((member: any) => (
                          <CrewCard
                            key={member.id}
                            member={member}
                            onDoubleClick={handleDoubleClick}
                            sickLeave={sickLeave}
                            borderColor="#ef4444" /* Ziek = rood */
                            tasks={tasks}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Quick Note Dialog */}
      <Dialog open={quickNoteDialog.isOpen} onOpenChange={(open) => setQuickNoteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('quickNoteFor')} {quickNoteDialog.crewName}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder={t('quickNotePlaceholder')}
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setQuickNoteDialog(prev => ({ ...prev, isOpen: false }))}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveQuickNote}>
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={deleteNoteDialog.isOpen} onOpenChange={(open) => setDeleteNoteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteNote')}</DialogTitle>
          </DialogHeader>
          <p>{t('confirmDeleteNote')}</p>
          <p className="text-sm text-gray-600 italic">"{deleteNoteDialog.noteContent}"</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteNoteDialog(prev => ({ ...prev, isOpen: false }))}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteNote}>
              {t('delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dummy Dialog */}
      <Dialog open={dummyDialog.isOpen} onOpenChange={(open) => setDummyDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uiText.addDummyTitle} - {dummyDialog.shipName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dummy-source-mode">Type dummy</Label>
              <Select
                value={dummyForm.sourceMode}
                onValueChange={(value) =>
                  setDummyForm(prev => ({
                    ...prev,
                    sourceMode: value as "empty" | "copy",
                    sourceCrewId: value === "copy" ? prev.sourceCrewId : "",
                  }))
                }
              >
                <SelectTrigger id="dummy-source-mode" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Lege dummy</SelectItem>
                  <SelectItem value="copy">Kopie van bestaand bemanningslid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dummyForm.sourceMode === "copy" && (
              <div>
                <Label htmlFor="dummy-source-crew">Kopieer van bemanningslid</Label>
                <Select
                  value={dummyForm.sourceCrewId}
                  onValueChange={(value) => {
                    const source = dummySourceCandidates.find((m: any) => m.id === value)
                    setDummyForm(prev => ({
                      ...prev,
                      sourceCrewId: value,
                      expectedStartDate: source?.expected_start_date || prev.expectedStartDate,
                      abDesignation: (() => {
                        const abNote = (source?.active_notes || []).find((n: any) =>
                          String(n?.content || "").startsWith("CREW_AB_DESIGNATION:")
                        )
                        const parsed = String(abNote?.content || "").replace("CREW_AB_DESIGNATION:", "").trim()
                        return parsed === "A" || parsed === "B" ? (parsed as "A" | "B") : prev.abDesignation
                      })(),
                      position: source?.position || prev.position,
                      nationality: source?.nationality || prev.nationality,
                      diplomas: Array.isArray(source?.diplomas) ? source.diplomas.join(", ") : prev.diplomas,
                    }))
                  }}
                >
                  <SelectTrigger id="dummy-source-crew" className="mt-2">
                    <SelectValue placeholder="Selecteer bemanningslid (incl. nog in te delen/te benaderen)" />
                  </SelectTrigger>
                  <SelectContent>
                    {dummySourceCandidates.map((member: any) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} - {member.position} ({member.status}
                        {member.sub_status ? ` / ${member.sub_status}` : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dummyForm.sourceMode === "copy" && (
              <div>
                <Label htmlFor="dummy-expected-start">Gaat aan boord vanaf</Label>
                <Input
                  id="dummy-expected-start"
                  type="date"
                  value={dummyForm.expectedStartDate}
                  onChange={(e) =>
                    setDummyForm((prev) => ({ ...prev, expectedStartDate: e.target.value }))
                  }
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label htmlFor="dummy-ab">Ploeg (optioneel)</Label>
              <Select
                value={dummyForm.abDesignation || "none"}
                onValueChange={(value) =>
                  setDummyForm(prev => ({
                    ...prev,
                    abDesignation: value === "A" || value === "B" ? value : "",
                  }))
                }
              >
                <SelectTrigger id="dummy-ab" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen ploeg</SelectItem>
                  <SelectItem value="A">Ploeg A</SelectItem>
                  <SelectItem value="B">Ploeg B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dummy-position">Functie *</Label>
              <Select
                value={dummyForm.position}
                onValueChange={(value) => setDummyForm(prev => ({ ...prev, position: value }))}
              >
                <SelectTrigger id="dummy-position" className="mt-2">
                  <SelectValue placeholder="Selecteer functie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kapitein">Kapitein</SelectItem>
                  <SelectItem value="2e kapitein">2e kapitein</SelectItem>
                  <SelectItem value="Stuurman">Stuurman</SelectItem>
                  <SelectItem value="Vol Matroos">Vol Matroos</SelectItem>
                  <SelectItem value="Matroos">Matroos</SelectItem>
                  <SelectItem value="Lichtmatroos">Lichtmatroos</SelectItem>
                  <SelectItem value="Deksman">Deksman</SelectItem>
                  <SelectItem value="Aflosser">Aflosser</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dummy-nationality">Nationaliteit (optioneel)</Label>
              <Input
                id="dummy-nationality"
                value={dummyForm.nationality}
                onChange={(e) => setDummyForm(prev => ({ ...prev, nationality: e.target.value }))}
                placeholder="Bijv: NL, BE, DE"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="dummy-diplomas">Diploma's (optioneel, gescheiden door komma's)</Label>
              <Input
                id="dummy-diplomas"
                value={dummyForm.diplomas}
                onChange={(e) => setDummyForm(prev => ({ ...prev, diplomas: e.target.value }))}
                placeholder="Bijv: Binnenvaartdiploma, VCA"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="dummy-notes">Opmerking (optioneel)</Label>
              <Textarea
                id="dummy-notes"
                value={dummyForm.notes}
                onChange={(e) => setDummyForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Bijv: Zoeken naar iemand met ervaring in tankvaart"
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setDummyDialog(prev => ({ ...prev, isOpen: false }))}>
              Annuleren
            </Button>
            <Button
              onClick={handleCreateDummy}
              disabled={
                isCreatingDummy ||
                !dummyForm.position ||
                (dummyForm.sourceMode === "copy" && !dummyForm.sourceCrewId)
              }
            >
              {isCreatingDummy ? uiText.creating : uiText.addDummy}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
