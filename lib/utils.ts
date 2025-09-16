import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Safely parse JSON from strings or localStorage values
// Returns the provided fallback on any error
export function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  try {
    if (!input) return fallback
    return JSON.parse(input) as T
  } catch {
    return fallback
  }
}

// Convenience helper to read and parse a JSON value from localStorage
export function getLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return safeJsonParse<T>(raw, fallback)
  } catch {
    return fallback
  }
}

// Centralized function to get ship name with fallback to localStorage
export function getShipName(shipId: string, ships: any[] = []): string {
  if (!shipId) return 'Geen schip toegewezen'
  
  // First try to find in ships array
  const ship = ships.find((s: any) => s.id === shipId)
  if (ship) return ship.name
  
  // If not found, try to get from localStorage as fallback
  if (typeof window !== 'undefined') {
    try {
      const storedShips = getLocalStorageJson<any[]>('ships', [])
      const storedShip = storedShips.find((s: any) => s.id === shipId)
      if (storedShip) return storedShip.name
    } catch (error) {
      console.error('Error reading ships from localStorage:', error)
    }
  }
  
  // Debug logging
  console.warn(`Ship not found for ID: ${shipId}`)
  console.log('Available ships from state:', ships.map(s => ({ id: s.id, name: s.name })))
  
  return 'Onbekend schip'
}
