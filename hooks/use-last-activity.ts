import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface LastActivity {
  user: string | null
  timestamp: Date | null
  type: string | null
}

export function useLastActivity() {
  const [lastActivity, setLastActivity] = useState<LastActivity>({
    user: null,
    timestamp: null,
    type: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLastActivity = async () => {
      try {
        setLoading(true)
        
        // Fetch all last activities in parallel
        const [
          tasksResult,
          crewResult,
          shipsResult,
          tripsResult,
          sickLeaveResult
        ] = await Promise.all([
          // Check tasks (has created_by)
          supabase
            .from('tasks')
            .select('created_at, created_by, updated_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          
          // Check crew
          supabase
            .from('crew')
            .select('updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          
          // Check ships
          supabase
            .from('ships')
            .select('updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          
          // Check trips
          supabase
            .from('trips')
            .select('updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          
          // Check sick_leave
          supabase
            .from('sick_leave')
            .select('updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ])

        // Collect all activities
        const activities: Array<{ user: string | null; timestamp: Date; type: string }> = []

        // Process tasks - prioritize updated_at (last change) but show created_by (best we have)
        if (tasksResult.data && !tasksResult.error) {
          // Use updated_at if available (last modification), otherwise created_at
          const timestamp = tasksResult.data.updated_at || tasksResult.data.created_at
          if (timestamp) {
            activities.push({
              user: tasksResult.data.created_by || null,
              timestamp: new Date(timestamp),
              type: 'taak'
            })
          }
        }

        // Process crew
        if (crewResult.data && !crewResult.error) {
          const timestamp = crewResult.data.updated_at || crewResult.data.created_at
          if (timestamp) {
            activities.push({
              user: null,
              timestamp: new Date(timestamp),
              type: 'bemanning'
            })
          }
        }

        // Process ships
        if (shipsResult.data && !shipsResult.error) {
          const timestamp = shipsResult.data.updated_at || shipsResult.data.created_at
          if (timestamp) {
            activities.push({
              user: null,
              timestamp: new Date(timestamp),
              type: 'schip'
            })
          }
        }

        // Process trips
        if (tripsResult.data && !tripsResult.error) {
          const timestamp = tripsResult.data.updated_at || tripsResult.data.created_at
          if (timestamp) {
            activities.push({
              user: null,
              timestamp: new Date(timestamp),
              type: 'reis'
            })
          }
        }

        // Process sick_leave
        if (sickLeaveResult.data && !sickLeaveResult.error) {
          const timestamp = sickLeaveResult.data.updated_at || sickLeaveResult.data.created_at
          if (timestamp) {
            activities.push({
              user: null,
              timestamp: new Date(timestamp),
              type: 'ziekte'
            })
          }
        }

        // Find the most recent activity
        if (activities.length > 0) {
          const mostRecent = activities.reduce((latest, current) => {
            return current.timestamp > latest.timestamp ? current : latest
          })

          setLastActivity({
            user: mostRecent.user,
            timestamp: mostRecent.timestamp,
            type: mostRecent.type
          })
        } else {
          // No activity found, reset
          setLastActivity({
            user: null,
            timestamp: null,
            type: null
          })
        }
      } catch (error) {
        console.error('Error fetching last activity:', error)
        // On error, keep existing state or reset
        setLastActivity({
          user: null,
          timestamp: null,
          type: null
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLastActivity()

    // Refresh every 60 seconds (less frequent to reduce load)
    const interval = setInterval(fetchLastActivity, 60000)

    return () => clearInterval(interval)
  }, [])

  return { lastActivity, loading }
}

