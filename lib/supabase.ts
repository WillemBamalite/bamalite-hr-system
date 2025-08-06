import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Ship {
  id: string
  name: string
  status: 'Operationeel' | 'In onderhoud' | 'Uit dienst'
  max_crew: number
  location: string
  route: string
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
  status: 'aan-boord' | 'thuis' | 'nog-in-te-delen' | 'ziek' | 'uit-dienst'
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