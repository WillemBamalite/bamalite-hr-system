import { useState, useEffect } from 'react';
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase, documentDatabase } from '@/data/crew-database';

// Hook voor gecombineerde crew data - ALTIJD volledige data tonen
export function useCrewData() {
  const [localData, setLocalData] = useState<{
    crewDatabase: Record<string, any>;
    sickLeaveDatabase: Record<string, any>;
    sickLeaveHistoryDatabase: Record<string, any>;
    documentDatabase: Record<string, any>;
  }>({
    crewDatabase: crewDatabase, // ALTIJD de volledige crew database gebruiken
    sickLeaveDatabase: sickLeaveDatabase,
    sickLeaveHistoryDatabase: sickLeaveHistoryDatabase,
    documentDatabase: documentDatabase
  });

  // Laad data bij component mount - ALTIJD volledige database gebruiken
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadData = () => {
        // Haal localStorage data op
        let localStorageCrew: Record<string, any> = {};
        let localStorageSickLeave: Record<string, any> = {};
        let localStorageDocuments: Record<string, any> = {};
        
        try {
          const storedCrew = localStorage.getItem('crewDatabase');
          if (storedCrew) {
            localStorageCrew = JSON.parse(storedCrew);
          }
          
          const storedSickLeave = localStorage.getItem('sickLeaveDatabase');
          if (storedSickLeave) {
            localStorageSickLeave = JSON.parse(storedSickLeave);
          }
          
          const storedDocuments = localStorage.getItem('documentDatabase');
          if (storedDocuments) {
            localStorageDocuments = JSON.parse(storedDocuments);
          }
        } catch (e) {
          console.error('Error reading localStorage:', e);
        }
        
        // COMBINEER volledige database met localStorage
        const combinedCrew = { ...crewDatabase, ...localStorageCrew };
        const combinedSickLeave = { ...sickLeaveDatabase, ...localStorageSickLeave };
        const combinedDocuments = { ...documentDatabase, ...localStorageDocuments };
        
        const combinedData = {
          crewDatabase: combinedCrew,
          sickLeaveDatabase: combinedSickLeave,
          sickLeaveHistoryDatabase: sickLeaveHistoryDatabase,
          documentDatabase: combinedDocuments
        };
        
        setLocalData(combinedData);
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

  // Automatisch terugkeer datums controleren
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkReturnDates = () => {
        const today = new Date().toISOString().split('T')[0];
        const crew = localData.crewDatabase;
        let hasUpdates = false;
        
        Object.values(crew).forEach((member: any) => {
          if (member.terugkeerDatum && member.terugkeerDatum <= today && member.status === "thuis") {
            console.log(`🔄 Auto-updating ${member.firstName} ${member.lastName} to aan-boord (terugkeer datum: ${member.terugkeerDatum})`);
            
            // Update status naar aan-boord
            member.status = "aan-boord";
            member.terugkeerDatum = undefined; // Verwijder terugkeer datum
            
            hasUpdates = true;
          }
        });
        
        if (hasUpdates) {
          // Update localStorage
          localStorage.setItem('crewDatabase', JSON.stringify(crew));
          
          // Trigger update
          setLocalData(prev => ({
            ...prev,
            crewDatabase: crew
          }));
          
          // Dispatch event voor andere componenten
          window.dispatchEvent(new Event('localStorageUpdate'));
        }
      };
      
      // Check elke keer als de data laadt
      checkReturnDates();
    }
  }, [localData.crewDatabase]);

  // Automatisch Rob van Etten fixen bij app start - UITGESCHAKELD
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     // Fix Rob van Etten direct
  //     fixRobVanEtten();
  //   }
  // }, []);

  // PERMANENTE FIX: Rob van Etten altijd op de Bellona
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fixRobPermanently = () => {
        try {
          const crewData = localStorage.getItem('crewDatabase');
          if (!crewData) return;
          
          const crew = JSON.parse(crewData);
          const rob = Object.values(crew).find((member: any) => 
            member.firstName === "Rob" && member.lastName === "van Etten"
          );
          
          if (rob && rob.shipId !== "ms-bellona") {
            console.log('🔧 PERMANENTE FIX: Rob van Etten terug naar Bellona');
            rob.shipId = "ms-bellona";
            localStorage.setItem('crewDatabase', JSON.stringify(crew));
            
            // Update lokale state
            setLocalData({
              ...localData,
              crewDatabase: crew
            });
          }
        } catch (error) {
          console.error('Error in permanente Rob fix:', error);
        }
      };
      
      // Fix direct bij laden
      fixRobPermanently();
      
      // Fix elke 5 seconden
      const interval = setInterval(fixRobPermanently, 5000);
      
      return () => clearInterval(interval);
    }
  }, [localData]);

  // PERMANENTE FIX: Alle bemanningsleden behouden hun shipId
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fixAllCrewShipIds = () => {
        try {
          const crewData = localStorage.getItem('crewDatabase');
          if (!crewData) return;
          
          const crew = JSON.parse(crewData);
          let hasChanges = false;
          
          // Loop door alle crew members
          Object.values(crew).forEach((member: any) => {
            // Als ze een geldige shipId hebben maar status "nog-in-te-delen" is
            if (member.shipId && member.shipId !== "nog-in-te-delen" && member.status === "nog-in-te-delen") {
              console.log(`🔧 PERMANENTE FIX: ${member.firstName} ${member.lastName} terug naar schip ${member.shipId}`);
              member.status = "aan-boord";
              hasChanges = true;
            }
            
            // Specifieke fix voor Rob van Etten
            if (member.firstName === "Rob" && member.lastName === "van Etten" && member.shipId !== "ms-bellona") {
              console.log('🔧 PERMANENTE FIX: Rob van Etten terug naar Bellona');
              member.shipId = "ms-bellona";
              member.status = "aan-boord";
              hasChanges = true;
            }
          });
          
          if (hasChanges) {
            localStorage.setItem('crewDatabase', JSON.stringify(crew));
            
            // Update lokale state
            setLocalData({
              ...localData,
              crewDatabase: crew
            });
            
            // Trigger events
            window.dispatchEvent(new Event('localStorageUpdate'));
            window.dispatchEvent(new Event('forceRefresh'));
          }
        } catch (error) {
          console.error('Error in permanente crew fix:', error);
        }
      };
      
      // Fix direct bij laden
      fixAllCrewShipIds();
      
      // Fix elke 3 seconden
      const interval = setInterval(fixAllCrewShipIds, 3000);
      
      return () => clearInterval(interval);
    }
  }, [localData]);

  // Functie om Rob van Etten automatisch te fixen - UITGESCHAKELD
  // const fixRobVanEtten = () => {
  //   try {
  //     const crewData = localStorage.getItem('crewDatabase');
  //     const crew = crewData ? JSON.parse(crewData) : {};
  //     
  //     // Zoek Rob van Etten
  //     const rob = Object.values(crew).find((member: any) => 
  //       member.firstName === "Rob" && member.lastName === "van Etten"
  //     );
  //     
  //     if (rob && rob.shipId !== "ms-bellona") {
  //       console.log('🔧 Auto-fixing Rob van Etten shipId...');
  //       console.log('📝 Huidige shipId:', rob.shipId);
  //       
  //       // Fix Rob van Etten - zet hem op de Bellona
  //       rob.shipId = "ms-bellona";
  //       
  //       // Sla op in localStorage
  //       localStorage.setItem('crewDatabase', JSON.stringify(crew));
  //       
  //       // Update lokale state direct
  //       setLocalData({
  //         ...localData,
  //         crewDatabase: crew
  //       });
  //       
  //       // Trigger events voor real-time updates
  //       window.dispatchEvent(new Event('localStorageUpdate'));
  //       window.dispatchEvent(new Event('forceRefresh'));
  //       
  //       console.log('✅ Rob van Etten gefixed! Nu op ms-bellona');
  //     }
  //   } catch (error) {
  //     console.error('Error fixing Rob van Etten:', error);
  //   }
  // };

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

  // Functie om alle aflossers te verwijderen
  const removeAllAflossers = () => {
    if (typeof window !== 'undefined') {
      try {
        const crewData = localStorage.getItem('crewDatabase');
        if (!crewData) return;

        const crewDatabase = JSON.parse(crewData);
        const cleanedCrewDatabase = {};
        
        Object.keys(crewDatabase).forEach(key => {
          const crew = crewDatabase[key];
          const isAflosser = crew.isAflosser === true || 
                           crew.position === "Aflosser" ||
                           crew.function === "Aflosser";
          
          if (!isAflosser) {
            cleanedCrewDatabase[key] = crew;
          }
        });

        localStorage.setItem('crewDatabase', JSON.stringify(cleanedCrewDatabase));
        window.dispatchEvent(new Event('localStorageUpdate'));
        window.dispatchEvent(new Event('forceRefresh'));
        
        console.log('✅ Alle aflossers verwijderd!');
      } catch (error) {
        console.error('Error removing aflossers:', error);
      }
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
  // Bereken aflossers count - gebruik dezelfde logica als aflossers pagina
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
    aanBoord: crewMembers.filter((c: any) => c.status === "aan-boord").length,
    thuis: crewMembers.filter((c: any) => c.status === "thuis").length,
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
    removeAllAflossers,
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