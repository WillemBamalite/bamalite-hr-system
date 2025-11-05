// Utility voor het opslaan en ophalen van uit dienst bemanningsleden
const OUT_OF_SERVICE_KEY = 'bamalite-out-of-service-crew'

export interface OutOfServiceRecord {
  crewMemberId: string
  outOfServiceDate: string
  outOfServiceReason: string
}

export function getOutOfServiceCrew(): OutOfServiceRecord[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(OUT_OF_SERVICE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading out of service crew:', error)
    return []
  }
}

export function addOutOfServiceCrew(record: OutOfServiceRecord) {
  if (typeof window === 'undefined') return
  
  try {
    const current = getOutOfServiceCrew()
    const updated = current.filter(r => r.crewMemberId !== record.crewMemberId)
    updated.push(record)
    localStorage.setItem(OUT_OF_SERVICE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving out of service crew:', error)
  }
}

export function removeOutOfServiceCrew(crewMemberId: string) {
  if (typeof window === 'undefined') return
  
  try {
    const current = getOutOfServiceCrew()
    const updated = current.filter(r => r.crewMemberId !== crewMemberId)
    localStorage.setItem(OUT_OF_SERVICE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error removing out of service crew:', error)
  }
}

export function isCrewMemberOutOfService(crewMemberId: string): boolean {
  const outOfServiceCrew = getOutOfServiceCrew()
  return outOfServiceCrew.some(record => record.crewMemberId === crewMemberId)
}

export function getOutOfServiceRecord(crewMemberId: string): OutOfServiceRecord | null {
  const outOfServiceCrew = getOutOfServiceCrew()
  return outOfServiceCrew.find(record => record.crewMemberId === crewMemberId) || null
} 

/**
 * Ophalen van aangepaste documenten voor een crew member uit localStorage.
 * @param crewMemberId
 * @returns Array van documenten, of null als niet aanwezig
 */
export function getCustomCrewDocuments(crewMemberId: string): any[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `bamalite-crew-documents_${crewMemberId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading custom crew documents:', error);
    return null;
  }
}

/**
 * Sla aangepaste documenten voor een crew member op in localStorage.
 * @param crewMemberId
 * @param docs
 */
export function setCustomCrewDocuments(crewMemberId: string, docs: any[]) {
  if (typeof window === 'undefined') return;
  try {
    const key = `bamalite-crew-documents_${crewMemberId}`;
    localStorage.setItem(key, JSON.stringify(docs));
  } catch (error) {
    console.error('Error saving custom crew documents:', error);
  }
}

/**
 * Verwijder aangepaste documenten voor een crew member uit localStorage.
 * @param crewMemberId
 */
export function removeCustomCrewDocuments(crewMemberId: string) {
  if (typeof window === 'undefined') return;
  try {
    const key = `bamalite-crew-documents_${crewMemberId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing custom crew documents:', error);
  }
} 