import { useEffect, useState } from 'react'
import { executeAutomaticRotations, DailyRotationSummary } from '@/utils/automatic-rotation-engine'
import { useCrewData } from './use-crew-data'

export function useAutomaticRotation() {
  const [hasExecuted, setHasExecuted] = useState(false)
  const [rotationResult, setRotationResult] = useState<DailyRotationSummary | null>(null)
  const { crewDatabase } = useCrewData()

  useEffect(() => {
    // Voer automatische rotatie uit bij het laden van de applicatie
    const executeRotation = () => {
      try {
        console.log('🔄 Uitvoeren automatische rotatie...')
        const result = executeAutomaticRotations()
        
        if (result.totalChanges > 0) {
          console.log(`✅ Automatische rotatie uitgevoerd: ${result.totalChanges} wijzigingen`)
          setRotationResult(result)
          
          // Sla de rotatie resultaten op in localStorage
          const today = new Date().toISOString().split('T')[0]
          const rotationHistory = JSON.parse(localStorage.getItem('rotationHistory') || '{}')
          rotationHistory[today] = result
          localStorage.setItem('rotationHistory', JSON.stringify(rotationHistory))
        } else {
          console.log('ℹ️ Geen rotaties vandaag')
        }
        
        setHasExecuted(true)
      } catch (error) {
        console.error('❌ Fout bij automatische rotatie:', error)
        setHasExecuted(true)
      }
    }

    // Controleer of we al rotaties hebben uitgevoerd vandaag
    const today = new Date().toISOString().split('T')[0]
    const rotationHistory = JSON.parse(localStorage.getItem('rotationHistory') || '{}')
    
    if (!rotationHistory[today] && !hasExecuted) {
      // Voer rotatie uit als we het nog niet hebben gedaan vandaag
      executeRotation()
    } else {
      setHasExecuted(true)
      if (rotationHistory[today]) {
        setRotationResult(rotationHistory[today])
      }
    }
  }, [crewDatabase, hasExecuted])

  return {
    hasExecuted,
    rotationResult,
    executeRotation: () => {
      const result = executeAutomaticRotations()
      setRotationResult(result)
      return result
    }
  }
} 