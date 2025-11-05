import { useState, useEffect } from 'react';

// Hook voor alleen localStorage data - ÉÉN SYSTEEM
export function useLocalStorageData() {
  const [data, setData] = useState<{
    crewDatabase: Record<string, any>;
    sickLeaveDatabase: Record<string, any>;
    sickLeaveHistoryDatabase: Record<string, any>;
    documentDatabase: Record<string, any>;
    shipDatabase: Record<string, any>;
  }>({
    crewDatabase: {},
    sickLeaveDatabase: {},
    sickLeaveHistoryDatabase: {},
    documentDatabase: {},
    shipDatabase: {}
  });

  // Laad data bij component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadData = () => {
        try {
          const crewData = localStorage.getItem('crewDatabase');
          const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
          const sickLeaveHistoryData = localStorage.getItem('sickLeaveHistoryDatabase');
          const documentData = localStorage.getItem('documentDatabase');
          const shipData = localStorage.getItem('shipDatabase');
          
          const combinedData = {
            crewDatabase: crewData ? JSON.parse(crewData) : {},
            sickLeaveDatabase: sickLeaveData ? JSON.parse(sickLeaveData) : {},
            sickLeaveHistoryDatabase: sickLeaveHistoryData ? JSON.parse(sickLeaveHistoryData) : {},
            documentDatabase: documentData ? JSON.parse(documentData) : {},
            shipDatabase: shipData ? JSON.parse(shipData) : {}
          };
          
          setData(combinedData);

        } catch (error) {
          // Silent error handling
        }
      };

      // Laad data direct
      loadData();

      // Luister naar localStorage wijzigingen
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key && (e.key.includes('crewDatabase') || e.key.includes('sickLeaveDatabase') || e.key.includes('documentDatabase') || e.key.includes('shipDatabase'))) {
          loadData();
        }
      };

      // Luister naar storage events (voor andere tabs)
      window.addEventListener('storage', handleStorageChange);

      // Custom event voor real-time updates binnen dezelfde tab
             const handleCustomStorageChange = () => {
         loadData();
       };

       const handleForceRefresh = () => {
         loadData();
       };

      window.addEventListener('localStorageUpdate', handleCustomStorageChange);
      window.addEventListener('forceRefresh', handleForceRefresh);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('localStorageUpdate', handleCustomStorageChange);
        window.removeEventListener('forceRefresh', handleForceRefresh);
      };
    }
  }, []);

  // Functie om data te updaten
  const updateData = (databaseName: keyof typeof data, updates: any) => {
    if (typeof window !== 'undefined') {
      try {
        const currentData = JSON.parse(localStorage.getItem(databaseName) || '{}');
        const updatedData = { ...currentData, ...updates };
        localStorage.setItem(databaseName, JSON.stringify(updatedData));
        
        // Trigger events
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // Functie om item toe te voegen
  const addItem = (databaseName: keyof typeof data, id: string, item: any) => {
    if (typeof window !== 'undefined') {
      try {
        const currentData = JSON.parse(localStorage.getItem(databaseName) || '{}');
        currentData[id] = item;
        localStorage.setItem(databaseName, JSON.stringify(currentData));
        
        // Trigger events
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // Functie om item te verwijderen
  const removeItem = (databaseName: keyof typeof data, id: string) => {
    if (typeof window !== 'undefined') {
      try {
        const currentData = JSON.parse(localStorage.getItem(databaseName) || '{}');
        delete currentData[id];
        localStorage.setItem(databaseName, JSON.stringify(currentData));
        
        // Trigger events
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // Functie om data te forceren te verversen
  const forceRefresh = () => {
    window.dispatchEvent(new Event('forceRefresh'));
  };

  // Functie om localStorage te resetten
  const resetLocalStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('crewDatabase');
        localStorage.removeItem('sickLeaveDatabase');
        localStorage.removeItem('sickLeaveHistoryDatabase');
        localStorage.removeItem('documentDatabase');
        localStorage.removeItem('shipDatabase');
        
        // Trigger events
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        // Silent error handling
      }
    }
  };

  return {
    ...data,
    updateData,
    addItem,
    removeItem,
    forceRefresh,
    resetLocalStorage
  };
}

// Hook voor specifieke crew member
export function useCrewMember(crewMemberId: string) {
  const { crewDatabase, updateData } = useLocalStorageData();

  const updateCrewMember = (updates: any) => {
    if (crewDatabase[crewMemberId]) {
      const updatedMember = { ...crewDatabase[crewMemberId], ...updates };
      updateData('crewDatabase', { [crewMemberId]: updatedMember });
    }
  };

  return {
    crewMember: crewDatabase[crewMemberId] || null,
    updateCrewMember
  };
}

// Hook voor sick leave
export function useSickLeave() {
  const { sickLeaveDatabase, addItem, updateData, removeItem } = useLocalStorageData();

  const addSickLeave = (sickLeave: any) => {
    const id = `sick-${Date.now()}`;
    addItem('sickLeaveDatabase', id, { ...sickLeave, id });
  };

  const updateSickLeave = (id: string, updates: any) => {
    if (sickLeaveDatabase[id]) {
      const updatedSickLeave = { ...sickLeaveDatabase[id], ...updates };
      updateData('sickLeaveDatabase', { [id]: updatedSickLeave });
    }
  };

  const removeSickLeave = (id: string) => {
    removeItem('sickLeaveDatabase', id);
  };

  return {
    sickLeaveDatabase,
    addSickLeave,
    updateSickLeave,
    removeSickLeave
  };
} 