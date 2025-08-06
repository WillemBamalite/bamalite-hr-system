import { useState, useEffect } from 'react';
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase, documentDatabase, shipDatabase } from '@/data/crew-database';

// Hook voor gecombineerde crew data - SCHOON EN EENVOUDIG
export function useCrewData() {
  const [localData, setLocalData] = useState<{
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
        // Gebruik localStorage data
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
        
        setLocalData(combinedData);
        console.log('🔄 Fresh data loaded from localStorage');
      };

      // Laad data direct
      loadData();

      // Luister naar localStorage wijzigingen
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key && (e.key.includes('crewDatabase') || e.key.includes('sickLeaveDatabase') || e.key.includes('documentDatabase'))) {
          loadData();
        }
      };

      // Luister naar storage events (voor andere tabs)
      window.addEventListener('storage', handleStorageChange);

      // Custom event voor real-time updates binnen dezelfde tab
      const handleCustomStorageChange = () => {
        console.log('🔄 localStorageUpdate event received, reloading data...');
        loadData();
      };

      const handleForceRefresh = () => {
        console.log('🔄 forceRefresh event received, reloading data...');
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

  // Gebruik alleen localStorage data
  const combinedData = {
    crewDatabase: localData.crewDatabase,
    sickLeaveDatabase: localData.sickLeaveDatabase,
    sickLeaveHistoryDatabase: localData.sickLeaveHistoryDatabase,
    documentDatabase: localData.documentDatabase
  };

  // Functie om data te updaten
  const updateData = (databaseName: keyof typeof localData, updates: any) => {
    // Direct localStorage updaten
    if (typeof window !== 'undefined') {
      try {
        const crewData = localStorage.getItem('crewDatabase');
        const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
        const sickLeaveHistoryData = localStorage.getItem('sickLeaveHistoryDatabase');
        const documentData = localStorage.getItem('documentDatabase');
        
        const storedData = {
          crewDatabase: crewData ? JSON.parse(crewData) : {},
          sickLeaveDatabase: sickLeaveData ? JSON.parse(sickLeaveData) : {},
          sickLeaveHistoryDatabase: sickLeaveHistoryData ? JSON.parse(sickLeaveHistoryData) : {},
          documentDatabase: documentData ? JSON.parse(documentData) : {}
        };
        
        const updatedData = {
          ...storedData,
          [databaseName]: { ...storedData[databaseName], ...updates }
        };
        
        // Sla op in localStorage
        localStorage.setItem('crewDatabase', JSON.stringify(updatedData.crewDatabase));
        localStorage.setItem('sickLeaveDatabase', JSON.stringify(updatedData.sickLeaveDatabase));
        localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(updatedData.sickLeaveHistoryDatabase));
        localStorage.setItem('documentDatabase', JSON.stringify(updatedData.documentDatabase));
        
        // Update lokale state direct
        setLocalData(updatedData);
        
        // Trigger events voor real-time updates
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        console.error('Error updating data:', error);
      }
    }
  };

  // Functie om item toe te voegen
  const addItem = (databaseName: keyof typeof localData, id: string, item: any) => {
    // Direct localStorage updaten
    if (typeof window !== 'undefined') {
      try {
        const crewData = localStorage.getItem('crewDatabase');
        const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
        const sickLeaveHistoryData = localStorage.getItem('sickLeaveHistoryDatabase');
        const documentData = localStorage.getItem('documentDatabase');
        
        const storedData = {
          crewDatabase: crewData ? JSON.parse(crewData) : {},
          sickLeaveDatabase: sickLeaveData ? JSON.parse(sickLeaveData) : {},
          sickLeaveHistoryDatabase: sickLeaveHistoryData ? JSON.parse(sickLeaveHistoryData) : {},
          documentDatabase: documentData ? JSON.parse(documentData) : {}
        };
        
        const updatedData = {
          ...storedData,
          [databaseName]: { ...storedData[databaseName], [id]: item }
        };
        
        // Sla op in localStorage
        localStorage.setItem('crewDatabase', JSON.stringify(updatedData.crewDatabase));
        localStorage.setItem('sickLeaveDatabase', JSON.stringify(updatedData.sickLeaveDatabase));
        localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(updatedData.sickLeaveHistoryDatabase));
        localStorage.setItem('documentDatabase', JSON.stringify(updatedData.documentDatabase));
        
        // Update lokale state direct
        setLocalData(updatedData);
        
        // Trigger events voor real-time updates
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  };

  // Functie om item te verwijderen
  const removeItem = (databaseName: keyof typeof localData, id: string) => {
    // Direct localStorage updaten
    if (typeof window !== 'undefined') {
      try {
        const crewData = localStorage.getItem('crewDatabase');
        const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
        const sickLeaveHistoryData = localStorage.getItem('sickLeaveHistoryDatabase');
        const documentData = localStorage.getItem('documentDatabase');
        
        const storedData = {
          crewDatabase: crewData ? JSON.parse(crewData) : {},
          sickLeaveDatabase: sickLeaveData ? JSON.parse(sickLeaveData) : {},
          sickLeaveHistoryDatabase: sickLeaveHistoryData ? JSON.parse(sickLeaveHistoryData) : {},
          documentDatabase: documentData ? JSON.parse(documentData) : {}
        };
        
        const { [id]: removed, ...remaining } = storedData[databaseName];
        const updatedData = {
          ...storedData,
          [databaseName]: remaining
        };
        
        // Sla op in localStorage
        localStorage.setItem('crewDatabase', JSON.stringify(updatedData.crewDatabase));
        localStorage.setItem('sickLeaveDatabase', JSON.stringify(updatedData.sickLeaveDatabase));
        localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(updatedData.sickLeaveHistoryDatabase));
        localStorage.setItem('documentDatabase', JSON.stringify(updatedData.documentDatabase));
        
        // Trigger events voor real-time updates
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
      } catch (error) {
        console.error('Error removing item:', error);
      }
    }
  };

  // Force refresh functie
  const forceRefresh = () => {
    if (typeof window !== 'undefined') {
      // Trigger re-render van alle componenten
      window.dispatchEvent(new Event('forceRefresh'));
    }
  };

  // Functie om localStorage te resetten met statische data
  const resetLocalStorage = () => {
    if (typeof window !== 'undefined') {
      console.log('🔄 Resetting localStorage with static data...');
      const updatedData = {
        crewDatabase: crewDatabase,
        sickLeaveDatabase: sickLeaveDatabase,
        sickLeaveHistoryDatabase: sickLeaveHistoryDatabase,
        documentDatabase: documentDatabase
      };
      
      localStorage.setItem('crewDatabase', JSON.stringify(updatedData.crewDatabase));
      localStorage.setItem('sickLeaveDatabase', JSON.stringify(updatedData.sickLeaveDatabase));
      localStorage.setItem('sickLeaveHistoryDatabase', JSON.stringify(updatedData.sickLeaveHistoryDatabase));
      localStorage.setItem('documentDatabase', JSON.stringify(updatedData.documentDatabase));
      
      setLocalData(updatedData);
      window.dispatchEvent(new Event('localStorageUpdate'));
      window.dispatchEvent(new Event('forceRefresh'));
    }
  };

  // CENTRALE BEREKENDE WAARDEN - Alle componenten gebruiken deze
  const crewMembers = Object.values(combinedData.crewDatabase);
  
  // Filter out deleted crew members
  const finalCrewMembers = crewMembers.filter((c: any) => !c.deleted);
  const activeSickLeaves = Object.values(combinedData.sickLeaveDatabase).filter((s: any) => 
    s.status === "actief" || s.status === "wacht-op-briefje"
  );
  const sickLeavesWithCertificate = Object.values(combinedData.sickLeaveDatabase).filter((s: any) => 
    s.hasCertificate
  );
  
  // Statistieken
  // Bereken aflossers count
  const aflossersCount = Object.values(combinedData.crewDatabase).filter((c: any) => 
    !c.deleted && (
      c.isAflosser === true || 
      c.position === "Aflosser" ||
      c.function === "Aflosser"
    )
  ).length;
  
  const stats = {
    totalCrew: crewMembers.length,
    aflossers: aflossersCount,
    studenten: crewMembers.filter((c: any) => c.isStudent).length,
    aanBoord: crewMembers.filter((c: any) => {
      if (c.status === "ziek") return false
      return c.status === "aan-boord"
    }).length,
    thuis: crewMembers.filter((c: any) => {
      if (c.status === "ziek") return false
      return c.status === "thuis"
    }).length,
    actieveZiekmeldingen: activeSickLeaves.length,
    ziekmeldingenMetBriefje: sickLeavesWithCertificate.length,
    nogInTeDelen: crewMembers.filter((c: any) => 
      c.status === "nog-in-te-delen" && 
      c.status !== "uit-dienst" && 
      c.status !== "ziek"
    ).length
  };

  return {
    data: combinedData,
    updateData,
    addItem,
    removeItem,
    forceRefresh,
    resetLocalStorage,
    // Directe toegang tot localStorage data
    crewDatabase: localData.crewDatabase,
    sickLeaveDatabase: localData.sickLeaveDatabase,
    sickLeaveHistoryDatabase: localData.sickLeaveHistoryDatabase,
    documentDatabase: localData.documentDatabase,
    // Berekende waarden
    crewMembers: finalCrewMembers,
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
        try {
          const crewData = localStorage.getItem('crewDatabase');
          const storedData = crewData ? JSON.parse(crewData) : {};
          const updatedCrew = { ...storedData, [crewMemberId]: updatedMember };
          localStorage.setItem('crewDatabase', JSON.stringify(updatedCrew));
          
          // Force re-render van alle componenten die deze data gebruiken
          console.log('🔄 Crew member updated, triggering re-render...');
          window.dispatchEvent(new Event('localStorageUpdate'));
          window.dispatchEvent(new Event('forceRefresh'));
        } catch (error) {
          console.error('Error updating crew member:', error);
        }
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
      try {
        const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
        const storedData = sickLeaveData ? JSON.parse(sickLeaveData) : {};
        const updatedSickLeave = { ...storedData, [sickLeave.id]: sickLeave };
        localStorage.setItem('sickLeaveDatabase', JSON.stringify(updatedSickLeave));
        window.dispatchEvent(new Event('localStorageUpdate'));
      } catch (error) {
        console.error('Error adding sick leave:', error);
      }
    }
  };

  const updateSickLeave = (id: string, updates: any) => {
    if (typeof window !== 'undefined') {
      try {
        const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
        const storedData = sickLeaveData ? JSON.parse(sickLeaveData) : {};
        const currentSickLeave = storedData[id];
        if (currentSickLeave) {
          const updatedSickLeave = { ...storedData, [id]: { ...currentSickLeave, ...updates } };
          localStorage.setItem('sickLeaveDatabase', JSON.stringify(updatedSickLeave));
          window.dispatchEvent(new Event('localStorageUpdate'));
        }
      } catch (error) {
        console.error('Error updating sick leave:', error);
      }
    }
  };

  const removeSickLeave = (id: string) => {
    if (typeof window !== 'undefined') {
      try {
        const sickLeaveData = localStorage.getItem('sickLeaveDatabase');
        const storedData = sickLeaveData ? JSON.parse(sickLeaveData) : {};
        const { [id]: removed, ...remaining } = storedData;
        localStorage.setItem('sickLeaveDatabase', JSON.stringify(remaining));
        window.dispatchEvent(new Event('localStorageUpdate'));
      } catch (error) {
        console.error('Error removing sick leave:', error);
      }
    }
  };

  return {
    sickLeaveDatabase,
    addSickLeave,
    updateSickLeave,
    removeSickLeave
  };
} 