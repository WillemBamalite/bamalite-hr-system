export interface Database {
  public: {
    Tables: {
      crew: {
        Row: {
          id: string
          first_name: string
          last_name: string
          nationality: string
          position: string
          ship_id: string
          regime: string
          phone: string
          email: string
          status: 'aan-boord' | 'thuis' | 'nog-in-te-delen' | 'ziek' | 'uit-dienst'
          on_board_since: string | null
          thuis_sinds: string | null
          birth_date: string
          address: {
            street: string
            city: string
            postal_code: string
            country: string
          }
          assignment_history: Array<{
            date: string
            ship_id: string
            action: string
            note: string
          }>
          diplomas: string[]
          notes: Array<{
            id: string
            content: string
            date: string
            author: string
          }>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          nationality: string
          position: string
          ship_id: string
          regime: string
          phone: string
          email: string
          status: 'aan-boord' | 'thuis' | 'nog-in-te-delen' | 'ziek' | 'uit-dienst'
          on_board_since?: string | null
          thuis_sinds?: string | null
          birth_date: string
          address: {
            street: string
            city: string
            postal_code: string
            country: string
          }
          assignment_history?: Array<{
            date: string
            ship_id: string
            action: string
            note: string
          }>
          diplomas?: string[]
          notes?: Array<{
            id: string
            content: string
            date: string
            author: string
          }>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          nationality?: string
          position?: string
          ship_id?: string
          regime?: string
          phone?: string
          email?: string
          status?: 'aan-boord' | 'thuis' | 'nog-in-te-delen' | 'ziek' | 'uit-dienst'
          on_board_since?: string | null
          thuis_sinds?: string | null
          birth_date?: string
          address?: {
            street: string
            city: string
            postal_code: string
            country: string
          }
          assignment_history?: Array<{
            date: string
            ship_id: string
            action: string
            note: string
          }>
          diplomas?: string[]
          notes?: Array<{
            id: string
            content: string
            date: string
            author: string
          }>
          created_at?: string
          updated_at?: string
        }
      }
      ships: {
        Row: {
          id: string
          name: string
          status: 'Operationeel' | 'In onderhoud' | 'Uit dienst'
          max_crew: number
          location: string
          route: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          status: 'Operationeel' | 'In onderhoud' | 'Uit dienst'
          max_crew: number
          location: string
          route: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'Operationeel' | 'In onderhoud' | 'Uit dienst'
          max_crew?: number
          location?: string
          route?: string
          created_at?: string
          updated_at?: string
        }
      }
      sick_leave: {
        Row: {
          id: string
          crew_member_id: string
          start_date: string
          end_date: string | null
          certificate_valid_until: string | null
          expiry_email_sent_at: string | null
          notes: string
          status: 'actief' | 'wacht-op-briefje' | 'afgerond'
          paid_by: string
          salary_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          crew_member_id: string
          start_date: string
          end_date?: string | null
          certificate_valid_until?: string | null
          expiry_email_sent_at?: string | null
          notes: string
          status: 'actief' | 'wacht-op-briefje' | 'afgerond'
          paid_by: string
          salary_percentage: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          crew_member_id?: string
          start_date?: string
          end_date?: string | null
          certificate_valid_until?: string | null
          expiry_email_sent_at?: string | null
          notes?: string
          status?: 'actief' | 'wacht-op-briefje' | 'afgerond'
          paid_by?: string
          salary_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      sick_leave_history: {
        Row: {
          id: string
          crew_member_id: string
          type: 'ziek' | 'terug-staan'
          start_date: string
          end_date: string | null
          note: string
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          crew_member_id: string
          type: 'ziek' | 'terug-staan'
          start_date: string
          end_date?: string | null
          note: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          crew_member_id?: string
          type?: 'ziek' | 'terug-staan'
          start_date?: string
          end_date?: string | null
          note?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ship_visits: {
        Row: {
          id: string
          ship_id: string
          visit_date: string
          visit_time: string | null
          visited_by: 'Leo' | 'Jos' | 'Willem' | 'Bart' | 'Nautic'
          ploeg: 'A' | 'B' | null
          notes: string | null
          follow_up_needed: boolean
          follow_up_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ship_id: string
          visit_date: string
          visit_time?: string | null
          visited_by: 'Leo' | 'Jos' | 'Willem' | 'Bart' | 'Nautic'
          ploeg?: 'A' | 'B' | null
          notes?: string | null
          follow_up_needed?: boolean
          follow_up_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ship_id?: string
          visit_date?: string
          visit_time?: string | null
          visited_by?: 'Leo' | 'Jos' | 'Willem' | 'Bart' | 'Nautic'
          ploeg?: 'A' | 'B' | null
          notes?: string | null
          follow_up_needed?: boolean
          follow_up_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      aflosser_availability_periods: {
        Row: {
          id: string
          crew_id: string
          start_date: string
          end_date: string | null
          type: 'beschikbaar' | 'afwezig'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          crew_id: string
          start_date: string
          end_date?: string | null
          type: 'beschikbaar' | 'afwezig'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          crew_id?: string
          start_date?: string
          end_date?: string | null
          type?: 'beschikbaar' | 'afwezig'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 