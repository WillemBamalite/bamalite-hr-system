/**
 * Offline-first sync queue
 * 
 * Beheert operaties die moeten worden gesynchroniseerd met Supabase.
 * Als Supabase offline is, worden operaties in een queue opgeslagen
 * en automatisch gesynchroniseerd zodra de verbinding hersteld is.
 */

export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  table: 'crew' | 'ships' | 'sick_leave' | 'loans' | 'stand_back'
  data: any
  timestamp: number
  retries: number
}

const SYNC_QUEUE_KEY = 'bamalite-sync-queue'
const MAX_RETRIES = 5

/**
 * Voeg een operatie toe aan de sync queue
 */
export function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>) {
  if (typeof window === 'undefined') return

  const queue = getSyncQueue()
  const newOp: SyncOperation = {
    ...operation,
    id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    retries: 0
  }
  
  queue.push(newOp)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  
  console.log(`📝 Added to sync queue: ${operation.type} ${operation.table}`, newOp)
  
  // Trigger sync attempt
  window.dispatchEvent(new Event('sync-queue-updated'))
}

/**
 * Haal de huidige sync queue op
 */
export function getSyncQueue(): SyncOperation[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Verwijder een operatie uit de queue
 */
export function removeFromSyncQueue(operationId: string) {
  if (typeof window === 'undefined') return
  
  const queue = getSyncQueue()
  const filtered = queue.filter(op => op.id !== operationId)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
  
  console.log(`✅ Removed from sync queue: ${operationId}`)
}

/**
 * Markeer een operatie als gefaald en verhoog retry counter
 */
export function markOperationFailed(operationId: string) {
  if (typeof window === 'undefined') return
  
  const queue = getSyncQueue()
  const operation = queue.find(op => op.id === operationId)
  
  if (!operation) return
  
  operation.retries++
  
  if (operation.retries >= MAX_RETRIES) {
    console.error(`❌ Operation ${operationId} failed after ${MAX_RETRIES} retries, removing from queue`)
    removeFromSyncQueue(operationId)
  } else {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
    console.warn(`⚠️ Operation ${operationId} failed, retry ${operation.retries}/${MAX_RETRIES}`)
  }
}

/**
 * Clear de hele queue (gebruik met voorzichtigheid!)
 */
export function clearSyncQueue() {
  if (typeof window === 'undefined') return
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]))
  console.log('🗑️ Sync queue cleared')
}

/**
 * Check of er pending operaties zijn
 */
export function hasPendingOperations(): boolean {
  return getSyncQueue().length > 0
}

