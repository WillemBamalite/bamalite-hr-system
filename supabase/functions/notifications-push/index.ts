// Supabase Edge Function: Push notifications for app users
// Calculates notifications (birthdays, probation, unvisited ships) and sends push notifications via Expo Push API
// Runs daily at 10:00 via cron

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function differenceInDays(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing Supabase env', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1. Get all device tokens
  const { data: deviceTokens, error: tokensError } = await supabase
    .from('device_tokens')
    .select('user_id, token, platform')

  if (tokensError) {
    return new Response(`Error fetching device tokens: ${JSON.stringify(tokensError)}`, { status: 500 })
  }

  if (!deviceTokens || deviceTokens.length === 0) {
    return new Response('No device tokens found', { status: 200 })
  }

  // 2. Load all data
  const [crewRes, shipsRes, visitsRes] = await Promise.all([
    supabase.from('crew').select('*'),
    supabase.from('ships').select('*'),
    supabase.from('ship_visits').select('*').order('visit_date', { ascending: false }),
  ])

  if (crewRes.error) {
    return new Response(`Error loading crew: ${JSON.stringify(crewRes.error)}`, { status: 500 })
  }
  if (shipsRes.error) {
    return new Response(`Error loading ships: ${JSON.stringify(shipsRes.error)}`, { status: 500 })
  }
  if (visitsRes.error) {
    return new Response(`Error loading visits: ${JSON.stringify(visitsRes.error)}`, { status: 500 })
  }

  const crew = crewRes.data || []
  const ships = shipsRes.data || []
  const visits = visitsRes.data || []

  // 3. Calculate notifications (EXACT same logic as web version)

  // 3a. Birthdays today
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()
  const birthdaysToday = crew.filter((member: any) => {
    if (member.is_dummy === true) return false
    if (!member.birth_date) return false
    try {
      const birthDate = new Date(member.birth_date)
      const birthMonth = birthDate.getMonth() + 1
      const birthDay = birthDate.getDate()
      return birthMonth === todayMonth && birthDay === todayDay
    } catch {
      return false
    }
  })

  // 3b. Probation ending (day 70 = 20 days remaining)
  const probationEnding = crew.filter((member: any) => {
    if (member.is_dummy || member.is_aflosser || !member.in_dienst_vanaf) return false
    const startDate = new Date(member.in_dienst_vanaf)
    startDate.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - startDate.getTime()
    const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return daysSinceStart === 70
  })

  // 3c. Ships not visited in 50+ days (EXACT same logic as web version)
  const getVisitsByShip = (shipId: string) => {
    return visits.filter((v: any) => v.ship_id === shipId)
  }

  const getShipsNotVisitedInDays = (days: number, allShips: any[]) => {
    return allShips.filter(ship => {
      const shipVisits = getVisitsByShip(ship.id)
      
      // Check of beide ploegen bezocht zijn
      const visitedPloegen = new Set(shipVisits.map((v: any) => v.ploeg).filter(Boolean))
      const hasPloegA = visitedPloegen.has('A')
      const hasPloegB = visitedPloegen.has('B')
      
      // Als niet beide ploegen bezocht zijn, telt het schip als "niet bezocht"
      if (!hasPloegA || !hasPloegB) {
        return true
      }
      
      // Als beide ploegen bezocht zijn, check de laatste bezoekdatum van beide
      const lastVisitA = shipVisits.filter((v: any) => v.ploeg === 'A').sort((a: any, b: any) => 
        new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
      )[0]
      const lastVisitB = shipVisits.filter((v: any) => v.ploeg === 'B').sort((a: any, b: any) => 
        new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
      )[0]
      
      // Neem de meest recente bezoekdatum van beide ploegen
      const lastVisit = lastVisitA && lastVisitB
        ? (new Date(lastVisitA.visit_date) > new Date(lastVisitB.visit_date) ? lastVisitA : lastVisitB)
        : (lastVisitA || lastVisitB)
      
      if (!lastVisit) return true
      
      const visitDate = new Date(lastVisit.visit_date)
      visitDate.setHours(0, 0, 0, 0)
      
      const diffTime = today.getTime() - visitDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays >= days
    })
  }

  const getUnvisitedPloegen = (shipId: string): ('A' | 'B')[] => {
    const shipVisits = getVisitsByShip(shipId)
    const unvisited: ('A' | 'B')[] = []
    
    // Check Ploeg A
    const visitsA = shipVisits.filter((v: any) => v.ploeg === 'A').sort((a: any, b: any) => 
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    )
    const lastVisitA = visitsA[0]
    if (!lastVisitA) {
      unvisited.push('A')
    } else {
      const visitDateA = new Date(lastVisitA.visit_date)
      visitDateA.setHours(0, 0, 0, 0)
      const diffDaysA = Math.floor((today.getTime() - visitDateA.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDaysA >= 50) {
        unvisited.push('A')
      }
    }
    
    // Check Ploeg B
    const visitsB = shipVisits.filter((v: any) => v.ploeg === 'B').sort((a: any, b: any) => 
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    )
    const lastVisitB = visitsB[0]
    if (!lastVisitB) {
      unvisited.push('B')
    } else {
      const visitDateB = new Date(lastVisitB.visit_date)
      visitDateB.setHours(0, 0, 0, 0)
      const diffDaysB = Math.floor((today.getTime() - visitDateB.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDaysB >= 50) {
        unvisited.push('B')
      }
    }
    
    return unvisited
  }

  const shipsNotVisited50Days = getShipsNotVisitedInDays(50, ships)

  // 4. Build notification message
  const notificationParts: string[] = []
  
  if (birthdaysToday.length > 0) {
    const names = birthdaysToday.map((m: any) => `${m.first_name} ${m.last_name}`).join(', ')
    notificationParts.push(`🎂 ${birthdaysToday.length} ${birthdaysToday.length === 1 ? 'verjaardag' : 'verjaardagen'}: ${names}`)
  }
  
  if (probationEnding.length > 0) {
    const names = probationEnding.map((m: any) => `${m.first_name} ${m.last_name}`).join(', ')
    notificationParts.push(`⚠️ Proeftijd verloopt: ${names}`)
  }
  
  if (shipsNotVisited50Days.length > 0) {
    const shipNames = shipsNotVisited50Days.map((ship: any) => {
      const unvisitedPloegen = getUnvisitedPloegen(ship.id)
      if (unvisitedPloegen.length === 2) {
        return `${ship.name} (A+B)`
      } else if (unvisitedPloegen.length === 1) {
        return `${ship.name} (${unvisitedPloegen[0]})`
      }
      return ship.name
    }).join(', ')
    notificationParts.push(`🚢 ${shipsNotVisited50Days.length} ${shipsNotVisited50Days.length === 1 ? 'schip' : 'schepen'} niet bezocht: ${shipNames}`)
  }

  if (notificationParts.length === 0) {
    // No notifications, don't send push
    return new Response('No notifications to send', { status: 200 })
  }

  const notificationTitle = 'Bemanningslijst Meldingen'
  const notificationBody = notificationParts.join('\n')

  // 5. Send push notifications to all devices
  const pushMessages = deviceTokens.map((dt: any) => ({
    to: dt.token,
    sound: 'default',
    title: notificationTitle,
    body: notificationBody,
    data: {
      type: 'notifications',
      timestamp: new Date().toISOString(),
    },
  }))

  // Send in batches (Expo allows up to 100 per request)
  const batchSize = 100
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < pushMessages.length; i += batchSize) {
    const batch = pushMessages.slice(i, i + batchSize)
    
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error sending push batch: ${errorText}`)
        errorCount += batch.length
      } else {
        const result = await response.json()
        // Check for individual errors in the response
        if (result.data) {
          result.data.forEach((item: any) => {
            if (item.status === 'ok') {
              successCount++
            } else {
              errorCount++
              console.error(`Push error for token ${item.id}: ${item.message}`)
            }
          })
        }
      }
    } catch (err) {
      console.error(`Exception sending push batch: ${err}`)
      errorCount += batch.length
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      notifications: {
        birthdays: birthdaysToday.length,
        probation: probationEnding.length,
        ships: shipsNotVisited50Days.length,
      },
      push: {
        sent: successCount,
        failed: errorCount,
        total: deviceTokens.length,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})


