// Persistent Storage Utility
// Deze utility zorgt ervoor dat data persistent wordt opgeslagen in JSON bestanden
// en automatisch wordt gesynchroniseerd met localStorage

export interface PersistentStorage {
  crewDatabase: any;
  sickLeaveDatabase: any;
  sickLeaveHistoryDatabase: any;
  documentDatabase: any;
  outOfServiceDatabase: any;
}

const STORAGE_KEYS = {
  CREW: 'crewDatabase',
  SICK_LEAVE: 'sickLeaveDatabase', 
  SICK_LEAVE_HISTORY: 'sickLeaveHistoryDatabase',
  DOCUMENTS: 'documentDatabase',
  OUT_OF_SERVICE: 'outOfServiceDatabase'
} as const;

// Laad data uit localStorage
export function loadFromStorage(): PersistentStorage {
  if (typeof window === 'undefined') {
    return {
      crewDatabase: {},
      sickLeaveDatabase: {},
      sickLeaveHistoryDatabase: {},
      documentDatabase: {},
      outOfServiceDatabase: {}
    };
  }

  try {
    return {
      crewDatabase: JSON.parse(localStorage.getItem(STORAGE_KEYS.CREW) || '{}'),
      sickLeaveDatabase: JSON.parse(localStorage.getItem(STORAGE_KEYS.SICK_LEAVE) || '{}'),
      sickLeaveHistoryDatabase: JSON.parse(localStorage.getItem(STORAGE_KEYS.SICK_LEAVE_HISTORY) || '{}'),
      documentDatabase: JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTS) || '{}'),
      outOfServiceDatabase: JSON.parse(localStorage.getItem(STORAGE_KEYS.OUT_OF_SERVICE) || '{}')
    };
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return {
      crewDatabase: {},
      sickLeaveDatabase: {},
      sickLeaveHistoryDatabase: {},
      documentDatabase: {},
      outOfServiceDatabase: {}
    };
  }
}

// Sla data op in localStorage
export function saveToStorage(data: Partial<PersistentStorage>): void {
  if (typeof window === 'undefined') return;

  console.log("🔧 saveToStorage aangeroepen:", data);

  try {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        console.log("🔧 Saving to localStorage:", key, value);
        localStorage.setItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS], JSON.stringify(value));
      }
    });
    
    // Trigger custom event voor real-time updates
    window.dispatchEvent(new CustomEvent('localStorageUpdate'));
    console.log("🔧 localStorageUpdate event dispatched");
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Update specifieke database
export function updateDatabase<T extends keyof PersistentStorage>(
  databaseName: T, 
  updates: Partial<PersistentStorage[T]>
): void {
  const currentData = loadFromStorage();
  const updatedData = { ...currentData[databaseName], ...updates };
  
  saveToStorage({
    [databaseName]: updatedData
  });
}

// Voeg item toe aan database
export function addToDatabase<T extends keyof PersistentStorage>(
  databaseName: T,
  id: string,
  item: any
): void {
  const currentData = loadFromStorage();
  const updatedData = { ...currentData[databaseName], [id]: item };
  
  saveToStorage({
    [databaseName]: updatedData
  });
}

// Verwijder item uit database
export function removeFromDatabase<T extends keyof PersistentStorage>(
  databaseName: T,
  id: string
): void {
  const currentData = loadFromStorage();
  const { [id]: removed, ...updatedData } = currentData[databaseName];
  
  saveToStorage({
    [databaseName]: updatedData
  });
}

// Exporteer data naar JSON bestand (alleen bij handmatige backup)
export function exportData(): void {
  console.log('🔍 exportData called - this should only happen on manual backup');
  const data = loadFromStorage();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bamalite-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Lokale backup zonder download (voor auto-backup)
export function createLocalBackup(): void {
  console.log('🔍 createLocalBackup called - auto-backup without download');
  const data = loadFromStorage();
  const backupKey = `bamalite-backup-${new Date().toISOString().split('T')[0]}`;
  
  if (typeof window !== 'undefined') {
    try {
      // Bewaar backup in localStorage met timestamp
      localStorage.setItem(backupKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        data: data
      }));
      
      // Behoud alleen de laatste 5 backups (verwijder oudere)
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('bamalite-backup-'));
      if (backupKeys.length > 5) {
        backupKeys.sort().slice(0, backupKeys.length - 5).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('Error creating local backup:', error);
    }
  }
}

// Importeer data uit JSON bestand
export function importData(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        saveToStorage(data);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Auto-save hook voor React components
export function usePersistentStorage() {
  const getData = () => loadFromStorage();
  
  const saveData = (data: Partial<PersistentStorage>) => {
    saveToStorage(data);
  };
  
  const updateCrew = (updates: any) => updateDatabase('crewDatabase', updates);
  const updateSickLeave = (updates: any) => updateDatabase('sickLeaveDatabase', updates);
  const updateSickLeaveHistory = (updates: any) => updateDatabase('sickLeaveHistoryDatabase', updates);
  const updateDocuments = (updates: any) => updateDatabase('documentDatabase', updates);
  const updateOutOfService = (updates: any) => updateDatabase('outOfServiceDatabase', updates);

  // Functie om localStorage volledig op te schonen
  const clearAllStorage = (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CREW)
      localStorage.removeItem(STORAGE_KEYS.SICK_LEAVE)
      localStorage.removeItem(STORAGE_KEYS.SICK_LEAVE_HISTORY)
      localStorage.removeItem(STORAGE_KEYS.DOCUMENTS)
      localStorage.removeItem(STORAGE_KEYS.OUT_OF_SERVICE)
      console.log('🧹 Alle localStorage data opgeschoond')
    }
  }
  
  return {
    getData,
    saveData,
    updateCrew,
    updateSickLeave,
    updateSickLeaveHistory,
    updateDocuments,
    updateOutOfService,
    exportData,
    importData,
    clearAllStorage
  };
} 