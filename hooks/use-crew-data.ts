import { useState, useEffect } from 'react';
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase, documentDatabase } from '@/data/crew-database';
import { loadFromStorage, saveToStorage, usePersistentStorage } from '@/utils/persistent-storage';

// Hook voor gecombineerde crew data met automatische synchronisatie
export function useCrewData() {
  const [localData, setLocalData] = useState<{
    crewDatabase: Record<string, any>;
    sickLeaveDatabase: Record<string, any>;
    sickLeaveHistoryDatabase: Record<string, any>;
    documentDatabase: Record<string, any>;
  }>({
    crewDatabase: {},
    sickLeaveDatabase: {},
    sickLeaveHistoryDatabase: {},
    documentDatabase: {}
  });

  // Laad data bij component mount en luister naar localStorage wijzigingen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadData = () => {
        const storedData = loadFromStorage();
        setLocalData(storedData);
      };

      // Laad initiële data
      loadData();

      // Luister naar localStorage wijzigingen
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key && (e.key.includes('crewDatabase') || e.key.includes('sickLeaveDatabase') || e.key.includes('documentDatabase'))) {
          console.log('🔄 localStorage changed, reloading data...');
          loadData();
        }
      };

      // Luister naar storage events (voor andere tabs)
      window.addEventListener('storage', handleStorageChange);

      // Custom event voor real-time updates binnen dezelfde tab
      const handleCustomStorageChange = () => {
        console.log('🔄 Custom storage event, reloading data...');
        loadData();
      };

      window.addEventListener('localStorageUpdate', handleCustomStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('localStorageUpdate', handleCustomStorageChange);
      };
    }
  }, []);

  // Combineer statische database met localStorage data
  const combinedData = {
    crewDatabase: { ...crewDatabase, ...localData.crewDatabase },
    sickLeaveDatabase: { ...sickLeaveDatabase, ...localData.sickLeaveDatabase },
    sickLeaveHistoryDatabase: { ...sickLeaveHistoryDatabase, ...localData.sickLeaveHistoryDatabase },
    documentDatabase: { ...documentDatabase, ...localData.documentDatabase }
  };

  // Functie om data te updaten
  const updateData = (databaseName: keyof typeof localData, updates: any) => {
    const newLocalData = {
      ...localData,
      [databaseName]: { ...localData[databaseName], ...updates }
    };
    
    setLocalData(newLocalData);
    saveToStorage(newLocalData);
  };

  // Functie om item toe te voegen
  const addItem = (databaseName: keyof typeof localData, id: string, item: any) => {
    const newLocalData = {
      ...localData,
      [databaseName]: { ...localData[databaseName], [id]: item }
    };
    
    setLocalData(newLocalData);
    saveToStorage(newLocalData);
  };

  // Functie om item te verwijderen
  const removeItem = (databaseName: keyof typeof localData, id: string) => {
    const { [id]: removed, ...remaining } = localData[databaseName];
    const newLocalData = {
      ...localData,
      [databaseName]: remaining
    };
    
    setLocalData(newLocalData);
    saveToStorage(newLocalData);
  };

  // Force refresh functie
  const forceRefresh = () => {
    console.log('🔄 Force refresh triggered...')
    // Reload data from localStorage
    const storedData = loadFromStorage()
    setLocalData({
      crewDatabase: storedData.crewDatabase || {},
      sickLeaveDatabase: storedData.sickLeaveDatabase || {},
      sickLeaveHistoryDatabase: storedData.sickLeaveHistoryDatabase || {},
      documentDatabase: storedData.documentDatabase || {},
    })
    console.log('🔄 Data reloaded:', storedData)
  }

  // CENTRALE BEREKENDE WAARDEN - Alle componenten gebruiken deze
  const crewMembers = Object.values(combinedData.crewDatabase);
  const activeSickLeaves = Object.values(combinedData.sickLeaveDatabase).filter((s: any) => 
    s.status === "actief" || s.status === "wacht-op-briefje"
  );
  const sickLeavesWithCertificate = Object.values(combinedData.sickLeaveDatabase).filter((s: any) => 
    s.hasCertificate
  );
  

  
  // Statistieken
  const stats = {
    totalCrew: crewMembers.length,
    aflossers: crewMembers.filter((c: any) => 
      c.position?.toLowerCase().includes("aflos") || c.position?.toLowerCase().includes("relief")
    ).length,
    studenten: crewMembers.filter((c: any) => c.isStudent).length,
    aanBoord: crewMembers.filter((c: any) => c.status === "aan-boord").length,
    thuis: crewMembers.filter((c: any) => c.status === "thuis").length,
    actieveZiekmeldingen: activeSickLeaves.length,
    ziekmeldingenMetBriefje: sickLeavesWithCertificate.length,
    nogInTeDelen: crewMembers.filter((c: any) => c.shipId === 'nog-in-te-delen').length
  };

  return {
    data: combinedData,
    updateData,
    addItem,
    removeItem,
    forceRefresh,
    // Directe toegang tot gecombineerde data
    crewDatabase: combinedData.crewDatabase,
    sickLeaveDatabase: combinedData.sickLeaveDatabase,
    sickLeaveHistoryDatabase: combinedData.sickLeaveHistoryDatabase,
    documentDatabase: combinedData.documentDatabase,
    // Berekende waarden
    crewMembers,
    activeSickLeaves,
    sickLeavesWithCertificate,
    stats
  };
}

// Hook voor specifieke crew member data
export function useCrewMember(crewMemberId: string) {
  const { crewDatabase } = useCrewData();
  const crewMember = (crewDatabase as Record<string, any>)[crewMemberId];

  const updateCrewMember = (updates: any) => {
    if (crewMember) {
      const updatedMember = { ...crewMember, ...updates };
      // Update via localStorage
      if (typeof window !== 'undefined') {
        const storedData = loadFromStorage();
        const updatedCrew = { ...storedData.crewDatabase, [crewMemberId]: updatedMember };
        saveToStorage({ crewDatabase: updatedCrew });
        
        // Force re-render van alle componenten die deze data gebruiken
        console.log('🔄 Crew member updated, triggering re-render...');
      }
    }
  };

  return {
    crewMember,
    updateCrewMember
  };
}

// Hook voor ziekmeldingen
export function useSickLeave() {
  const { sickLeaveDatabase } = useCrewData();

  const addSickLeave = (sickLeave: any) => {
    if (typeof window !== 'undefined') {
      const storedData = loadFromStorage();
      const updatedSickLeave = { ...storedData.sickLeaveDatabase, [sickLeave.id]: sickLeave };
      saveToStorage({ sickLeaveDatabase: updatedSickLeave });
    }
  };

  const updateSickLeave = (id: string, updates: any) => {
    if (typeof window !== 'undefined') {
      const storedData = loadFromStorage();
      const currentSickLeave = storedData.sickLeaveDatabase[id];
      if (currentSickLeave) {
        const updatedSickLeave = { ...storedData.sickLeaveDatabase, [id]: { ...currentSickLeave, ...updates } };
        saveToStorage({ sickLeaveDatabase: updatedSickLeave });
      }
    }
  };

  const removeSickLeave = (id: string) => {
    if (typeof window !== 'undefined') {
      const storedData = loadFromStorage();
      const { [id]: removed, ...remaining } = storedData.sickLeaveDatabase;
      saveToStorage({ sickLeaveDatabase: remaining });
    }
  };

  return {
    sickLeaveDatabase,
    addSickLeave,
    updateSickLeave,
    removeSickLeave
  };
} 