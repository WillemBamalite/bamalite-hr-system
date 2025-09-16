import { useState, useEffect } from 'react'
import { supabase, Ship, Crew, SickLeave, StandBackRecord, Loan } from '@/lib/supabase'

export function useSupabaseData() {
  const [ships, setShips] = useState<Ship[]>([])
  const [crew, setCrew] = useState<Crew[]>([])
  const [sickLeave, setSickLeave] = useState<SickLeave[]>([])
  const [standBackRecords, setStandBackRecords] = useState<StandBackRecord[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load ships
      const { data: shipsData, error: shipsError } = await supabase
        .from('ships')
        .select('*')
        .order('name')
      
      if (shipsError) throw shipsError
      
      // Load crew
      const { data: crewData, error: crewError } = await supabase
        .from('crew')
        .select('*')
        .order('first_name')
      
      if (crewError) throw crewError
      
      // Load sick leave
      const { data: sickLeaveData, error: sickLeaveError } = await supabase
        .from('sick_leave')
        .select('*')
        .in('status', ['actief', 'wacht-op-briefje'])
        .order('start_date')
      
      if (sickLeaveError) throw sickLeaveError
      
      // Load loans
      let loansData: any[] = []
      try {
        const { data, error: loansError } = await supabase
          .from('loans')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (loansError) {
          console.warn('Loans table might not exist yet:', loansError)
          loansData = []
        } else {
          loansData = data || []
        }
      } catch (err) {
        console.warn('Error loading loans, table might not exist:', err)
        loansData = []
      }

      // Merge with localStorage loans as fallback (keeps app usable offline/when DB missing)
      let localLoans: any[] = []
      if (typeof window !== 'undefined') {
        try { localLoans = JSON.parse(localStorage.getItem('loansLocal') || '[]') } catch {}
      }
      const byId: Record<string, any> = {}
      for (const l of [...localLoans, ...loansData]) { if (l && (l as any).id) byId[(l as any).id] = l }
      const mergedLoans = Object.values(byId)
      
      // ALTIJD localStorage checken voor stand back records
      let standBackData: any[] = []
      if (typeof window !== 'undefined') {
        const localStorageData = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
        standBackData = Object.values(localStorageData)
        console.log('ALTIJD localStorage geladen:', standBackData.length, 'records')
      }
      
      // Local fallback for ships when Supabase is empty
      let localShips: any[] = []
      if (typeof window !== 'undefined') {
        try { localShips = JSON.parse(localStorage.getItem('ships') || '[]') } catch {}
      }
      const shipsToUse = (shipsData && shipsData.length > 0) ? shipsData : localShips
      setShips(shipsToUse || [])
      if (typeof window !== 'undefined' && shipsData && shipsData.length > 0) {
        try { localStorage.setItem('ships', JSON.stringify(shipsData)) } catch {}
      }
      // Local fallback for crew from localStorage ('crewDatabase' as object map)
      let localCrew: any[] = []
      if (typeof window !== 'undefined') {
        try {
          const stored = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
          localCrew = Object.values(stored || {})
        } catch {}
      }
      const crewToUse = (crewData && crewData.length > 0) ? crewData : localCrew
      // Auto-rotatie: herbereken status op basis van startdatum en regime
      const recalculateStatus = (startDate: string | null | undefined, regime: string | null | undefined) => {
        if (!startDate || !regime) return null as any
        const toLocalYMD = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const startRaw = new Date(startDate)
        if (isNaN(startRaw.getTime())) return null as any
        const start = toLocalYMD(startRaw)
        const today = toLocalYMD(new Date())
        // Regimes zijn in weken (1/1, 2/2, 3/3)
        const msPerDay = 24 * 60 * 60 * 1000
        const daysSince = Math.floor((today.getTime() - start.getTime()) / msPerDay)
        let cycleDays = 0
        if (regime === '1/1') cycleDays = 14    // 1 week op, 1 week af
        else if (regime === '2/2') cycleDays = 28 // 2 weken op, 2 weken af
        else if (regime === '3/3') cycleDays = 42 // 3 weken op, 3 weken af
        if (!cycleDays) return null as any
        const dayInCycle = ((daysSince % cycleDays) + cycleDays) % cycleDays
        const half = cycleDays / 2
        return dayInCycle < half ? 'aan-boord' : 'thuis'
      }

      const recalculatedCrew = (crewToUse || []).map((m: any) => {
        const status = recalculateStatus(m.on_board_since || m.startDate, m.regime)
        if (!status) return m
        if (m.status === status) return m
        return { ...m, status }
      })

      setCrew(recalculatedCrew)
      // Schrijf terug naar localStorage map zodat overzichten direct up-to-date zijn
      if (typeof window !== 'undefined') {
        try {
          const map: Record<string, any> = {}
          for (const row of recalculatedCrew as any[]) {
            map[row.id] = {
              id: row.id,
              firstName: row.first_name || row.firstName,
              lastName: row.last_name || row.lastName,
              nationality: row.nationality,
              position: row.position,
              shipId: row.ship_id || row.shipId || null,
              regime: row.regime,
              status: row.status,
              onBoardSince: row.on_board_since || row.startDate || null,
              thuisSinds: row.thuis_sinds || null,
              phone: row.phone || null,
              email: row.email || null,
              birthDate: row.birth_date || row.birthDate || null,
              address: row.address || null,
              assignmentHistory: row.assignment_history || row.assignmentHistory || [],
              diplomas: row.diplomas || [],
              notes: row.notes || []
            }
          }
          localStorage.setItem('crewDatabase', JSON.stringify(map))
        } catch {}
      }

      // Plan automatische herberekening op de eerstvolgende dagwisseling
      try {
        const scheduleNextMidnight = () => {
          const now = new Date()
          const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0) // 00:05 lokale tijd
          const delay = Math.max(1000, next.getTime() - now.getTime())
          window.setTimeout(() => {
            // Trigger herberekening door loadData opnieuw te draaien (lichtgewicht)
            loadData()
          }, delay)
        }
        if (typeof window !== 'undefined') {
          scheduleNextMidnight()
          // Ook bij terugkeren naar het tabblad direct herberekenen
          const onVisible = () => { if (document.visibilityState === 'visible') loadData() }
          document.addEventListener('visibilitychange', onVisible)
          // Best-effort cleanup als de pagina verlaat
          window.addEventListener('beforeunload', () => {
            document.removeEventListener('visibilitychange', onVisible)
          })
        }
      } catch {}
      if (typeof window !== 'undefined' && crewData && crewData.length > 0) {
        try {
          // Persist fresh Supabase crew into localStorage map keyed by id
          const map: Record<string, any> = {}
          for (const member of crewData) { map[(member as any).id] = member }
          localStorage.setItem('crewDatabase', JSON.stringify(map))
        } catch {}
      }
      setSickLeave(sickLeaveData || [])
      setLoans(mergedLoans || [])
      setStandBackRecords(standBackData)
      
    } catch (err) {
      const message = (err && typeof err === 'object' && 'message' in (err as any)) 
        ? String((err as any).message) 
        : JSON.stringify(err)
      console.warn('Data laden mislukt:', message)
      // Soft-fail: show UI; fallback to local ships
      let localShipsErrorPath: any[] = []
      if (typeof window !== 'undefined') {
        try { localShipsErrorPath = JSON.parse(localStorage.getItem('ships') || '[]') } catch {}
      }
      setShips(localShipsErrorPath || [])
      // Fallback crew from localStorage
      let localCrewErrorPath: any[] = []
      if (typeof window !== 'undefined') {
        try {
          const stored = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
          localCrewErrorPath = Object.values(stored || {})
        } catch {}
      }
      setCrew(localCrewErrorPath || [])
      setSickLeave([])
      setLoans([])
      // Keep a minimal message in console but do not block the UI
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  // Clear all data
  const clearAllData = async () => {
    try {
      setLoading(true)
      
      // Delete all crew
      const { error: crewError } = await supabase
        .from('crew')
        .delete()
        .neq('id', '') // Delete all
      
      if (crewError) throw crewError
      
      // Delete all ships
      const { error: shipsError } = await supabase
        .from('ships')
        .delete()
        .neq('id', '') // Delete all
      
      if (shipsError) throw shipsError
      
      // Delete all sick leave
      const { error: sickLeaveError } = await supabase
        .from('sick_leave')
        .delete()
        .neq('id', '') // Delete all
      
      if (sickLeaveError) throw sickLeaveError
      
      // Reload data (should be empty now)
      await loadData()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Add ship
  const addShip = async (ship: Omit<Ship, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .insert([ship])
        .select()
      
      if (error) throw error
      
      await loadData()
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Add crew member
  const addCrew = async (crewMember: Omit<Crew, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .insert([crewMember])
        .select()
      
      if (error) {
        console.warn('Kon bemanningslid niet in Supabase opslaan, val terug op localStorage:', error)
        throw error
      }
      
      // Update local state directly
      setCrew(prevCrew => {
        const next = [...prevCrew, data[0] as any]
        try {
          if (typeof window !== 'undefined') {
            const map: Record<string, any> = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
            const row: any = data[0]
            map[row.id] = {
              id: row.id,
              firstName: row.first_name,
              lastName: row.last_name,
              nationality: row.nationality,
              position: row.position,
              shipId: row.ship_id,
              regime: row.regime,
              status: row.status,
              onBoardSince: row.on_board_since,
              thuisSinds: row.thuis_sinds,
              phone: row.phone,
              email: row.email,
              birthDate: row.birth_date,
              address: row.address,
              assignmentHistory: row.assignment_history,
              diplomas: row.diplomas,
              notes: row.notes,
              matricule: row.matricule
            }
            localStorage.setItem('crewDatabase', JSON.stringify(map))
          }
        } catch {}
        return next
      })
      return data?.[0]
    } catch (err) {
      // Fallback: sla lokaal op zodat de app bruikbaar blijft
      try {
        if (typeof window !== 'undefined') {
          const map: Record<string, any> = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
          const id = (crewMember as any).id || (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
          const localRow = {
            id,
            firstName: (crewMember as any).first_name,
            lastName: (crewMember as any).last_name,
            nationality: (crewMember as any).nationality || 'NL',
            position: (crewMember as any).position || 'Aflosser',
            shipId: (crewMember as any).ship_id || null,
            regime: (crewMember as any).regime || '2/2',
            status: (crewMember as any).status || 'nog-in-te-delen',
            onBoardSince: (crewMember as any).on_board_since || null,
            thuisSinds: (crewMember as any).thuis_sinds || null,
            phone: (crewMember as any).phone || null,
            email: (crewMember as any).email || null,
            birthDate: (crewMember as any).birth_date || null,
            address: (crewMember as any).address || null,
            assignmentHistory: (crewMember as any).assignment_history || [],
            diplomas: (crewMember as any).diplomas || [],
            notes: Array.isArray((crewMember as any).notes) ? (crewMember as any).notes : [] ,
            matricule: (crewMember as any).matricule || null
          }
          map[id] = localRow
          localStorage.setItem('crewDatabase', JSON.stringify(map))
          const crewShape: any = {
            id,
            first_name: localRow.firstName,
            last_name: localRow.lastName,
            nationality: localRow.nationality,
            position: localRow.position,
            ship_id: localRow.shipId,
            regime: localRow.regime,
            status: localRow.status,
            on_board_since: localRow.onBoardSince,
            thuis_sinds: localRow.thuisSinds,
            phone: localRow.phone,
            email: localRow.email,
            birth_date: localRow.birthDate,
            address: localRow.address,
            assignment_history: localRow.assignmentHistory,
            diplomas: localRow.diplomas,
            notes: localRow.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setCrew(prev => [...prev, crewShape])
          return crewShape
        }
      } catch {}
      const message = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err))
      setError(message || 'Unknown error')
      throw new Error(message || 'Unknown error')
    }
  }

  // Add loan
  const addLoan = async (loan: Omit<Loan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .insert([loan])
        .select()
      
      if (error) {
        console.warn('Kon lening niet in Supabase opslaan, val terug op localStorage:', error)
        const message = (error as any)?.message || ''
        const code = (error as any)?.code || ''

        // FK constraint: crew_id bestaat niet in Supabase (bijv. alleen localStorage)
        const looksLikeForeignKeyIssue = message.toLowerCase().includes('foreign key') || code === '23503'
        if (looksLikeForeignKeyIssue && typeof window !== 'undefined') {
          try {
            const localCrewMap = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
            const localCrew = localCrewMap?.[loan.crew_id as any]
            if (localCrew) {
              // Map localStorage structuur naar DB structuur
              const crewRow: Partial<Crew> = {
                id: localCrew.id,
                first_name: localCrew.firstName || localCrew.first_name,
                last_name: localCrew.lastName || localCrew.last_name,
                nationality: localCrew.nationality || 'NL',
                position: localCrew.position || 'Aflosser',
                ship_id: localCrew.shipId || null,
                regime: localCrew.regime || '2/2',
                status: localCrew.status || 'nog-in-te-delen',
                on_board_since: localCrew.onBoardSince || null,
                thuis_sinds: localCrew.thuisSinds || null,
                phone: localCrew.phone || null,
                email: localCrew.email || null,
                birth_date: localCrew.birthDate || null,
                address: localCrew.address || null,
                assignment_history: localCrew.assignmentHistory || [],
                diplomas: localCrew.diplomas || [],
                notes: Array.isArray(localCrew.notes) ? localCrew.notes : (localCrew.notes ? [String(localCrew.notes)] : [])
              } as any

              // Upsert bemanningslid in Supabase en probeer lening opnieuw
              const { error: upsertErr } = await supabase
                .from('crew')
                .upsert([crewRow as any], { onConflict: 'id' })
              if (!upsertErr) {
                const retry = await supabase
                  .from('loans')
                  .insert([loan])
                  .select()
                if (!retry.error && retry.data) {
                  setLoans(prevLoans => [retry.data[0], ...prevLoans])
                  return retry.data?.[0]
                }
              }
            }
          } catch (e) {
            console.warn('Fallback upsert crew before adding loan failed:', e)
          }
        }

        if (message.includes('relation "loans" does not exist')) {
          throw new Error('Loans tabel bestaat nog niet. Voer eerst het SQL script uit in Supabase.')
        }
        const fullMessage = message || 'Fout bij het toevoegen van de lening (onbekende fout)'
        throw new Error(fullMessage)
      }
      
      setLoans(prevLoans => {
        const next = [data[0], ...prevLoans]
        try { if (typeof window !== 'undefined') localStorage.setItem('loansLocal', JSON.stringify(next)) } catch {}
        return next
      })
      return data?.[0]
    } catch (err) {
      // Fallback: schrijf naar localStorage zodat de app bruikbaar blijft
      try {
        if (typeof window !== 'undefined') {
          const current = JSON.parse(localStorage.getItem('loansLocal') || '[]')
          const offlineLoan = {
            id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            ...loan,
            status: loan.status || 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          const next = [offlineLoan, ...current]
          localStorage.setItem('loansLocal', JSON.stringify(next))
          setLoans(next)
          return offlineLoan as any
        }
      } catch {}
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      throw err
    }
  }

  // Update loan
  const updateLoan = async (id: string, updates: Partial<Loan>) => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      
      setLoans(prevLoans => {
        const next = prevLoans.map(loan => loan.id === id ? { ...loan, ...updates } : loan)
        try { if (typeof window !== 'undefined') localStorage.setItem('loansLocal', JSON.stringify(next)) } catch {}
        return next
      })
      
      return data?.[0]
    } catch (err) {
      // Fallback update in localStorage
      try {
        if (typeof window !== 'undefined') {
          const current: any[] = JSON.parse(localStorage.getItem('loansLocal') || '[]')
          const next = current.map(l => l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l)
          localStorage.setItem('loansLocal', JSON.stringify(next))
          setLoans(next)
          return next.find(l => l.id === id)
        }
      } catch {}
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Complete loan
  const completeLoan = async (id: string, notes?: string) => {
    try {
      const updates = {
        status: 'voltooid' as const,
        completed_at: new Date().toISOString(),
        notes: notes || undefined
      }
      
      return await updateLoan(id, updates)
    } catch (err) {
      // Fallback complete in localStorage
      try {
        if (typeof window !== 'undefined') {
          const current: any[] = JSON.parse(localStorage.getItem('loansLocal') || '[]')
          const next = current.map(l => l.id === id ? { ...l, ...updates } : l)
          localStorage.setItem('loansLocal', JSON.stringify(next))
          setLoans(next)
          return next.find(l => l.id === id)
        }
      } catch {}
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Safe status update function
  const safeUpdateStatus = async (id: string, status: string) => {
    try {
      // Try the update with the provided status
      const { data, error } = await supabase
        .from('crew')
        .update({ status })
        .eq('id', id)
        .select()
      
      if (error) {
        console.warn("Status update failed, trying fallback:", error)
        // Fallback: try with a safe status
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('crew')
          .update({ status: 'thuis' })
          .eq('id', id)
          .select()
        
        if (fallbackError) {
          throw fallbackError
        }
        
        return fallbackData?.[0]
      }
      
      return data?.[0]
    } catch (err) {
      console.error("Safe status update failed:", err)
      throw err
    }
  }

  // Update crew member
  const updateCrew = async (id: string, updates: Partial<Crew>) => {
    try {
      console.log("updateCrew called with id:", id, "updates:", updates)
      
      // Simple update without complex logic to avoid infinite loops
      const { data, error } = await supabase
        .from('crew')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) {
        console.error("Supabase error:", error)
        throw error
      }
      
      console.log("updateCrew successful, data:", data)
      
      // Update local state directly instead of reloading all data
      setCrew(prevCrew => 
        prevCrew.map(member => 
          member.id === id ? { ...member, ...updates } : member
        )
      )
      
      return data?.[0]
    } catch (err) {
      console.error("updateCrew error:", err)
      
      let errorMessage = "Unknown error"
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        try {
          errorMessage = JSON.stringify(err, null, 2)
        } catch {
          errorMessage = 'Object error'
        }
      } else {
        errorMessage = String(err)
      }
      
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Delete crew member
  const deleteCrew = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crew')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Add sick leave
  const addSickLeave = async (sickLeave: Omit<SickLeave, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('sick_leave')
        .insert([sickLeave])
        .select()
      
      if (error) throw error
      
      await loadData()
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Update sick leave
  const updateSickLeave = async (id: string, updates: Partial<SickLeave>) => {
    try {
      const { data, error } = await supabase
        .from('sick_leave')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      
      await loadData()
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Add or update stand back record
  const addStandBackRecord = async (standBackRecord: any) => {
    try {
      console.log('addStandBackRecord called with:', standBackRecord)
      
      // ALTIJD localStorage gebruiken
      if (typeof window !== 'undefined') {
        const currentStandBack = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
        
        // Check of er al een record bestaat voor deze crew member
        const existingRecord = Object.values(currentStandBack).find((record: any) => 
          record.crewMemberId === standBackRecord.crew_member_id
        ) as any
        
        if (existingRecord) {
          // Update bestaand record
          const updatedRecord = {
            ...existingRecord,
            standBackDaysRequired: existingRecord.standBackDaysRequired + standBackRecord.stand_back_days_required,
            standBackDaysRemaining: existingRecord.standBackDaysRemaining + standBackRecord.stand_back_days_required,
            standBackStatus: "openstaand",
            standBackHistory: [
              ...(existingRecord.standBackHistory || []),
              {
                startDate: standBackRecord.start_date,
                endDate: standBackRecord.end_date,
                description: standBackRecord.description,
                daysCount: standBackRecord.days_count,
                addedDays: standBackRecord.stand_back_days_required
              }
            ]
          }
          currentStandBack[existingRecord.id] = updatedRecord
          console.log('Updated existing record in localStorage:', updatedRecord)
        } else {
          // Nieuwe record toevoegen
          const localStorageRecord = {
            id: standBackRecord.id,
            crewMemberId: standBackRecord.crew_member_id,
            startDate: standBackRecord.start_date,
            endDate: standBackRecord.end_date,
            daysCount: standBackRecord.days_count,
            description: standBackRecord.description,
            standBackDaysRequired: standBackRecord.stand_back_days_required,
            standBackDaysCompleted: standBackRecord.stand_back_days_completed,
            standBackDaysRemaining: standBackRecord.stand_back_days_remaining,
            standBackStatus: standBackRecord.stand_back_status,
            standBackHistory: standBackRecord.stand_back_history || []
          }
          currentStandBack[standBackRecord.id] = localStorageRecord
          console.log('Created new record in localStorage:', localStorageRecord)
        }
        
        localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(currentStandBack))
        
        // DIRECT state updaten
        const recordsArray = Object.values(currentStandBack) as StandBackRecord[]
        setStandBackRecords(recordsArray)
        console.log('State updated with:', recordsArray.length, 'records')
        
        return standBackRecord
      }
    } catch (err) {
      console.error('Error in addStandBackRecord:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Update stand back record
  const updateStandBackRecord = async (id: string, updates: Partial<StandBackRecord>) => {
    try {
      console.log('updateStandBackRecord called with:', id, updates)
      
      // ALTIJD localStorage gebruiken
      if (typeof window !== 'undefined') {
        const currentStandBack = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
        
        // Zoek het record op basis van ID
        const recordToUpdate = currentStandBack[id]
        
        if (!recordToUpdate) {
          throw new Error(`Record met ID ${id} niet gevonden`)
        }
        
        // Update het record
        const updatedRecord = {
          ...recordToUpdate,
          standBackDaysCompleted: updates.stand_back_days_completed || recordToUpdate.standBackDaysCompleted,
          standBackDaysRemaining: updates.stand_back_days_remaining || recordToUpdate.standBackDaysRemaining,
          standBackStatus: updates.stand_back_status || recordToUpdate.standBackStatus,
          standBackHistory: updates.stand_back_history || recordToUpdate.standBackHistory || []
        }
        
        currentStandBack[id] = updatedRecord
        localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(currentStandBack))
        
        // DIRECT state updaten
        const recordsArray = Object.values(currentStandBack) as StandBackRecord[]
        setStandBackRecords(recordsArray)
        console.log('Record updated in localStorage:', updatedRecord)
        
        return updatedRecord
      }
    } catch (err) {
      console.error('Error in updateStandBackRecord:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  return {
    ships,
    crew,
    sickLeave,
    standBackRecords,
    loans,
    loading,
    error,
    loadData,
    clearAllData,
    addShip,
    addCrew,
    updateCrew,
    deleteCrew,
    addSickLeave,
    updateSickLeave,
    addStandBackRecord,
    updateStandBackRecord,
    addLoan,
    updateLoan,
    completeLoan
  }
} 