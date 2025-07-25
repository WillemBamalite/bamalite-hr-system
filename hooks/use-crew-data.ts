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

  // Laad data bij component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedData = loadFromStorage();
      setLocalData(storedData);
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

  return {
    data: combinedData,
    updateData,
    addItem,
    removeItem,
    // Directe toegang tot gecombineerde data
    crewDatabase: combinedData.crewDatabase,
    sickLeaveDatabase: combinedData.sickLeaveDatabase,
    sickLeaveHistoryDatabase: combinedData.sickLeaveHistoryDatabase,
    documentDatabase: combinedData.documentDatabase
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