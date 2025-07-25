import { useState, useEffect } from 'react'
import { crewDatabase } from '@/data/crew-database'

export function useCrewData() {
  const [localStorageCrew, setLocalStorageCrew] = useState<any>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
        // Filter lege of incomplete data uit
        const filteredCrew: any = {}
        Object.keys(storedCrew).forEach(crewId => {
          const member = storedCrew[crewId]
          // Alleen toevoegen als het een geldig object is met minimaal een id
          if (member && typeof member === 'object' && member.id) {
            filteredCrew[crewId] = member
          }
        })
        setLocalStorageCrew(filteredCrew)
      } catch (e) {
        console.error('Error parsing localStorage:', e)
      }
    }
  }, [])

  // Start met de originele database data
  const allCrewData = { ...crewDatabase }
  
  // Voeg localStorage wijzigingen toe, maar behoud originele data als backup
  Object.keys(localStorageCrew).forEach(crewId => {
    const localStorageMember = localStorageCrew[crewId]
    const databaseMember = (crewDatabase as any)[crewId]
    
    if (localStorageMember && databaseMember) {
      // Merge: behoud originele data, voeg alleen wijzigingen toe
      (allCrewData as any)[crewId] = {
        ...databaseMember,  // Start met originele data
        ...localStorageMember,  // Voeg wijzigingen toe
        // Behoud originele datums als ze niet expliciet zijn gewijzigd in localStorage
        onBoardSince: localStorageMember.onBoardSince !== undefined ? localStorageMember.onBoardSince : databaseMember.onBoardSince,
        thuisSinds: localStorageMember.thuisSinds !== undefined ? localStorageMember.thuisSinds : databaseMember.thuisSinds,
        status: localStorageMember.status !== undefined ? localStorageMember.status : databaseMember.status
      }
    }
  })

  return allCrewData
} 