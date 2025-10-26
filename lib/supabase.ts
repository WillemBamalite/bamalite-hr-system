import { createClient } from '@supabase/supabase-js'

// Hardcoded values for local development
const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'

// Create Supabase client with better error handling
let supabase: any

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('✅ Supabase client created successfully')
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error)
  
  // Create a mock Supabase client for local development
  supabase = {
    from: (table: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ error: null }),
      eq: () => ({ data: [], error: null }),
      single: () => ({ data: null, error: null }),
      order: () => ({ data: [], error: null }),
      limit: () => ({ data: [], error: null }),
      not: () => ({ data: [], error: null })
    }),
    auth: {
      getSession: () => ({ data: { session: null }, error: null })
    },
    channel: () => ({
      on: () => ({ subscribe: () => {}, unsubscribe: () => {} })
    })
  }
  console.log('⚠️ Using mock Supabase client for local development')
}

export { supabase }

// Database types
export interface Ship {
  id: string
  name: string
  max_crew: number
  created_at: string
  updated_at: string
}

export interface Crew {
  id: string
  first_name: string
  last_name: string
  nationality: string
  position: string
  ship_id: string
  regime: string
  phone?: string
  email?: string
  status: 'aan-boord' | 'thuis' | 'nog-in-te-delen' | 'ziek' | 'uit-dienst' | 'afwezig'
  on_board_since?: string
  thuis_sinds?: string
  birth_date: string
  address: any
  assignment_history: any[]
  diplomas: string[]
  notes: any[]
  created_at: string
  updated_at: string
}

export interface PlannedTrip {
  id: string
  ship_id: string
  trip_name: string
  start_date: string
  end_date: string
  trip_from: string
  trip_to: string
  aflosser_id?: string
  status: 'gepland' | 'actief' | 'voltooid'
  notes?: string
  created_at: string
  updated_at: string
}

export interface SickLeave {
  id: string
  crew_member_id: string
  start_date: string
  end_date?: string
  certificate_valid_until?: string
  notes: string
  status: 'actief' | 'wacht-op-briefje' | 'afgerond'
  paid_by: string
  salary_percentage: number
  created_at: string
  updated_at: string
}

export interface StandBackRecord {
  id: string
  crew_member_id: string
  start_date: string
  end_date: string
  days_count: number
  description: string
  reason?: string
  notes?: string
  stand_back_days_required: number
  stand_back_days_completed: number
  stand_back_days_remaining: number
  stand_back_status: 'openstaand' | 'voltooid'
  stand_back_history: any[]
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  crew_id: string
  name: string
  period: string
  amount: number
  reason: string
  status: 'open' | 'voltooid'
  created_at: string
  updated_at: string
  completed_at?: string
  notes?: string
}

export interface Trip {
  id: string
  trip_name: string
  ship_id: string
  start_date: string
  end_date?: string
  trip_from: string
  trip_to: string
  notes?: string
  
  // New workflow fields
  status: 'gepland' | 'ingedeeld' | 'actief' | 'voltooid'
  aflosser_id?: string
  
  // Actual boarding/leaving times
  start_datum?: string
  start_tijd?: string
  eind_datum?: string
  eind_tijd?: string
  
  // Aflosser feedback
  aflosser_opmerkingen?: string
  
  // Timestamps
  created_at: string
  updated_at: string
} 