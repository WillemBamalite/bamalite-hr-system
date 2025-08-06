"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Users, CheckCircle, Clock, UserX, Trash2 } from "lucide-react"
import { getCombinedShipDatabase, removeShipFromDatabase } from "@/utils/ship-utils"
import { isCrewMemberOutOfService } from "@/utils/out-of-service-storage"
import { useState, useEffect } from "react"
import Link from "next/link"
import { calculateRegimeStatus, autoAdvanceCrewDatabase, calculateCurrentStatus } from "@/utils/regime-calculator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useLocalStorageData } from "@/hooks/use-localStorage-data"

export function ShipOverview() {
  const [mounted, setMounted] = useState(false);
  const [quickNoteDialog, setQuickNoteDialog] = useState<{
    isOpen: boolean;
    crewId: string;
    crewName: string;
  }>({
    isOpen: false,
    crewId: "",
    crewName: ""
  });
  const [quickNote, setQuickNote] = useState("");
  const [deleteNoteDialog, setDeleteNoteDialog] = useState<{
    isOpen: boolean;
    crewId: string;
    noteId: string;
    noteContent: string;
  }>({
    isOpen: false,
    crewId: "",
    noteId: "",
    noteContent: ""
  });

  // Gebruik de hook voor localStorage crew data
  const { crewDatabase: allCrewData } = useLocalStorageData()
  
  // Combineer statische schepen met localStorage schepen
  const [localShips, setLocalShips] = useState<any>({});
  
  // Prevent hydration errors - MOET BOVENAAN STAAN
  useEffect(() => {
    setMounted(true);
  }, []);

  // AUTOMATISCHE STATUS UPDATE: Update alle crew members op basis van regime
  useEffect(() => {
    const updateCrewStatuses = () => {
      try {
        // Verwijder bemanningsleden met "Onbekend" namen
        const crewData = localStorage.getItem('crewDatabase');
        const crew = crewData ? JSON.parse(crewData) : {};
        let hasChanges = false;
        
        Object.keys(crew).forEach((memberId) => {
          const member = crew[memberId];
          if (member.firstName === "Onbekend" || member.lastName === "Onbekend" || 
              !member.firstName || !member.lastName || 
              member.firstName === "" || member.lastName === "") {
            delete crew[memberId];
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          localStorage.setItem('crewDatabase', JSON.stringify(crew));
        }
        
        // Automatische datum doorloop op basis van regime
        const updated = autoAdvanceCrewDatabase();
        
        // Specifieke fix voor Rob van Etten
        const updatedCrewData = localStorage.getItem('crewDatabase');
        const updatedCrew = updatedCrewData ? JSON.parse(updatedCrewData) : {};
        
        Object.values(updatedCrew).forEach((member: any) => {
          if (member.firstName === "Rob" && member.lastName === "van Etten" && member.shipId !== "ms-bellona") {
            member.shipId = "ms-bellona";
            member.status = "aan-boord";
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          localStorage.setItem('crewDatabase', JSON.stringify(updatedCrew));
          window.dispatchEvent(new Event('localStorageUpdate'));
          window.dispatchEvent(new Event('forceRefresh'));
        }
      } catch (error) {
        console.error('Error updating crew statuses:', error);
      }
    };
    
    updateCrewStatuses();
    
    // Check elke 2 seconden
    const interval = setInterval(updateCrewStatuses, 2000);
    return () => clearInterval(interval);
  }, []) // Lege dependency array om infinite loop te voorkomen

  // Load local ships
  useEffect(() => {
    const loadLocalShips = () => {
      try {
        const storedShips = localStorage.getItem('shipDatabase');
        if (storedShips) {
          setLocalShips(JSON.parse(storedShips));
        }
      } catch (error) {
        console.error('Error loading local ships:', error);
      }
    };
    
    loadLocalShips();
    
    // Luister naar localStorage updates
    const handleStorageUpdate = () => {
      loadLocalShips();
    };
    
    window.addEventListener('localStorageUpdate', handleStorageUpdate);
    return () => window.removeEventListener('localStorageUpdate', handleStorageUpdate);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ship className="w-5 h-5" />
            <span>Schepen Overzicht</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Laden...</div>
        </CardContent>
      </Card>
    );
  }
  
  // Gebruik alleen localStorage ship database
  const allShips = getCombinedShipDatabase();
  
  // Alle operationele schepen met volledige bemanning details
  const ships = Object.values(allShips)
    .filter((ship) => ship.status === "Operationeel")
    .map((ship) => {
      // Haal alle bemanning op voor dit schip (inclusief aflossers en zieke mensen)
      const allShipCrew = Object.values(allCrewData).filter((crew: any) => 
        crew.shipId === ship.id
      )

      const aanBoord = allShipCrew.filter((crew: any) => {
        if (crew.status === "ziek") return false
        if (!crew.regime) return crew.status === "aan-boord"
        
        const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
        return statusCalculation.currentStatus === "aan-boord"
      })
      const thuis = allShipCrew.filter((crew: any) => {
        if (crew.status === "ziek") return false
        if (!crew.regime) return crew.status === "thuis"
        
        const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
        return statusCalculation.currentStatus === "thuis"
      })
      const ziek = allShipCrew.filter((crew: any) => crew.status === "ziek")



      // Haal actieve aflossers op voor dit schip
      const today = new Date()
      const activeAflossers = Object.values(allCrewData)
        .filter((crew: any) => 
          (crew.position?.toLowerCase().includes("aflos") || crew.position?.toLowerCase().includes("relief")) &&
          crew.aflosserAssignments?.some((assignment: any) => 
            assignment.shipId === ship.id && 
            assignment.status === "active" &&
            new Date(assignment.fromDate) <= today &&
            (!assignment.toDate || new Date(assignment.toDate) >= today)
          )
        )
        .map((aflosser: any) => {
          const activeAssignment = aflosser.aflosserAssignments?.find((assignment: any) => 
            assignment.shipId === ship.id && 
            assignment.status === "active" &&
            new Date(assignment.fromDate) <= today &&
            (!assignment.toDate || new Date(assignment.toDate) >= today)
          )
          return {
            ...aflosser,
            status: "aan-boord", // Tijdelijk status voor weergave
            activeAssignment
          }
        })

      // Debug: log aflossers voor dit schip
      if (activeAflossers.length > 0) {
        // Debug info verwijderd
      }

      // Combineer reguliere bemanning met actieve aflossers
      const allAanBoord = [...aanBoord, ...activeAflossers]



              return {
          ...ship,
          aanBoord: allAanBoord,
          thuis,
          ziek,
          totalCrew: allShipCrew.length + activeAflossers.length,
          nextRotation: `2024-01-15`, // Vaste datum om hydration error te voorkomen
        }
    })

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
      EG: "🇪🇬",
    }
    return flags[nationality] || "🌍"
  }

  // Helper voor bemanningsgegevens
  function getCrewDetails(crew: any) {
    return {
      name: crew.firstName + " " + crew.lastName,
      birthDate: crew.birthDate || "",
      birthPlace: crew.birthPlace || "",
      address: crew.address?.street ? `${crew.address.street}, ${crew.address.postalCode} ${crew.address.city}` : "",
      phone: crew.phone || "",
      email: crew.email || "",
      bank: crew.bank || "",
      function: crew.position,
      smoking: crew.smoking || false,
      experience: crew.experience || "",
      diplomas: crew.diplomas || [],
      salary: crew.salary || "",
      ship: crew.shipId || "-",
      company: crew.company || "",
      matricule: crew.matricule || "",
      entryDate: "2015-06-01",
      notes: "Ervaren schipper, werkt graag met internationale bemanning. Interesse in verdere opleiding voor chemicaliën transport.",
    }
  }

  // Helper om datum veilig te tonen zonder hydration error
  function SafeDate({ date }: { date: string }) {
    const [formatted, setFormatted] = useState(date)
    useEffect(() => {
      if (date) {
        setFormatted(new Date(date).toLocaleDateString("nl-NL"))
      }
    }, [date])
    return <>{formatted}</>
  }

  // Quick note functies
  function handleDoubleClick(crewId: string, crewName: string) {
    setQuickNoteDialog({
      isOpen: true,
      crewId,
      crewName
    });
    setQuickNote("");
  }

  function handleSaveQuickNote() {
    if (quickNote.trim() && quickNoteDialog.crewId) {
      const crewMember = (allCrewData as any)[quickNoteDialog.crewId];
      if (crewMember) {
        const newNote = {
          id: `note-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          author: "HR Manager",
          type: "neutraal",
          content: quickNote.trim()
        };
        
        const currentNotes = Array.isArray(crewMember.notes) ? crewMember.notes : [];
        crewMember.notes = [...currentNotes, newNote];
        
        // Update localStorage
        try {
          const crewData = localStorage.getItem('crewDatabase')
          const crew = crewData ? JSON.parse(crewData) : {}
          crew[quickNoteDialog.crewId] = crewMember
          localStorage.setItem('crewDatabase', JSON.stringify(crew))
          
          // Trigger events voor UI update
          window.dispatchEvent(new Event('localStorageUpdate'))
          window.dispatchEvent(new Event('forceRefresh'))
        } catch (error) {
          console.error('Error updating crew database:', error)
        }
      }
    }
    
    setQuickNoteDialog({ isOpen: false, crewId: "", crewName: "" });
    setQuickNote("");
  }

  function handleRemoveNote(crewId: string, noteId: string, noteContent: string) {
    setDeleteNoteDialog({
      isOpen: true,
      crewId,
      noteId,
      noteContent
    });
  }

  function handleConfirmDeleteNote() {
    const crewMember = (allCrewData as any)[deleteNoteDialog.crewId];
    if (crewMember && Array.isArray(crewMember.notes)) {
      // Verwijder de notitie uit de array
      crewMember.notes = crewMember.notes.filter((note: any) => note.id !== deleteNoteDialog.noteId);
      
      // Update localStorage
      try {
        const crewData = localStorage.getItem('crewDatabase')
        const crew = crewData ? JSON.parse(crewData) : {}
        crew[deleteNoteDialog.crewId] = crewMember
        localStorage.setItem('crewDatabase', JSON.stringify(crew))
        
        // Trigger events voor UI update
        window.dispatchEvent(new Event('localStorageUpdate'))
        window.dispatchEvent(new Event('forceRefresh'))
      } catch (error) {
        console.error('Error updating crew database:', error)
      }
    }
    
    setDeleteNoteDialog({ isOpen: false, crewId: "", noteId: "", noteContent: "" });
  }

  function handleDeleteShip(shipId: string, shipName: string) {
    if (confirm(`Weet je zeker dat je het schip "${shipName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      try {
        removeShipFromDatabase(shipId);
        alert(`Schip "${shipName}" is succesvol verwijderd.`);
      } catch (error) {
        console.error('Error deleting ship:', error);
        alert('Er is een fout opgetreden bij het verwijderen van het schip.');
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-2">



      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ship className="w-5 h-5" />
                              <span>Schepen Overzicht</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {ships.map((ship) => (
              <div key={ship.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-blue-900">{ship.name}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteShip(ship.id, ship.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Verwijder schip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Aan boord bemanning */}
                {ship.aanBoord.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <h4 className="font-medium text-gray-900">Aan boord ({ship.aanBoord.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ship.aanBoord.map((crew: any, index: number) => (
                        <div 
                          key={crew.id || `crew-${ship.id}-${index}-${crew.firstName}-${crew.lastName}`} 
                          className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                          onDoubleClick={() => handleDoubleClick(crew.id, `${crew.firstName} ${crew.lastName}`)}
                          title="Dubbelklik om notitie toe te voegen"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {crew.firstName?.[0] || '?'}{crew.lastName?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 font-medium text-sm text-gray-900 truncate">
                              <Link href={`/bemanning/${crew.id}`} className="hover:underline text-blue-700">{crew.firstName || 'Onbekend'} {crew.lastName || 'Onbekend'}</Link>
                              <span className="text-lg">{getNationalityFlag(crew.nationality)}</span>
                              {crew.position?.toLowerCase().includes("aflos") && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                  Aflosser
                                </Badge>
                              )}
                              {crew.isStudent && crew.educationType && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                                  {crew.educationType}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">Functie: {crew.position}</div>
                            {crew.position?.toLowerCase().includes("aflos") && crew.aflosserAssignments ? (
                              (() => {
                                const today = new Date()
                                const activeAssignment = crew.aflosserAssignments
                                  .filter((assignment: any) => 
                                    assignment.shipId === ship.id && 
                                    assignment.status === "active" &&
                                    new Date(assignment.fromDate) <= today && 
                                    (assignment.toDate ? new Date(assignment.toDate) >= today : true)
                                  )[0]
                                return activeAssignment ? (
                                  <div className="text-xs text-blue-700">
                                    Periode: {new Date(activeAssignment.fromDate).toLocaleDateString("nl-NL")} 
                                    {activeAssignment.toDate ? ` t/m ${new Date(activeAssignment.toDate).toLocaleDateString("nl-NL")}` : " (flexibel)"}
                                    {activeAssignment.route && ` - ${activeAssignment.route}`}
                                  </div>
                                ) : null
                              })()
                            ) : (
                              <div className="text-xs text-gray-600">Vaarregime: {crew.regime}</div>
                            )}
                            {crew.status === "aan-boord" && !crew.position?.toLowerCase().includes("aflos") && (
                              (() => {
                                if (!crew.regime) return (
                                  <div className="text-xs text-gray-400 italic">
                                    <span>Geen regime ingesteld</span>
                                  </div>
                                )
                                
                                const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
                                return (
                                  <div className="text-xs text-gray-500">
                                    <span>Volgende wissel: {statusCalculation.nextRotationDate ? new Date(statusCalculation.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"}</span>
                                    <span className="ml-2">Over {statusCalculation.daysUntilRotation} dagen</span>
                                  </div>
                                )
                              })()
                            )}
                            <div className="flex flex-wrap gap-2 mt-1">
                              {crew.diplomas && crew.diplomas.length > 0 ? (
                                crew.diplomas.map((diploma: string, idx: number) => (
                                  <span key={idx} className="flex items-center bg-green-50 border border-green-200 rounded px-2 py-0.5 text-xs text-green-800">
                                    {diploma}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">Geen diploma's</span>
                              )}
                            </div>
                            {crew.notes && (
                              <div className="flex items-center justify-between">
                                <span className="text-orange-600 text-[10px] italic truncate max-w-[100px]">
                                  {Array.isArray(crew.notes) 
                                    ? crew.notes[crew.notes.length - 1]?.content || crew.notes
                                    : crew.notes
                                  }
                                </span>
                                {Array.isArray(crew.notes) && crew.notes.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveNote(crew.id, crew.notes[crew.notes.length - 1].id, crew.notes[crew.notes.length - 1].content);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-[8px] ml-1"
                                    title="Verwijder notitie"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thuis bemanning */}
                {ship.thuis.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Thuis ({ship.thuis.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ship.thuis.map((crew: any, index: number) => (
                        <div 
                          key={crew.id || `thuis-${ship.id}-${index}-${crew.firstName}-${crew.lastName}`} 
                          className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                          onDoubleClick={() => handleDoubleClick(crew.id, `${crew.firstName} ${crew.lastName}`)}
                          title="Dubbelklik om notitie toe te voegen"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {crew.firstName?.[0] || '?'}{crew.lastName?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 font-medium text-sm text-gray-900 truncate">
                              <Link href={`/bemanning/${crew.id}`} className="hover:underline text-blue-700">{crew.firstName || 'Onbekend'} {crew.lastName || 'Onbekend'}</Link>
                              <span className="text-lg">{getNationalityFlag(crew.nationality)}</span>
                              {crew.position?.toLowerCase().includes("aflos") && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                  Aflosser
                                </Badge>
                              )}
                              {crew.isStudent && crew.educationType && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                                  {crew.educationType}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">Functie: {crew.position}</div>
                            <div className="text-xs text-gray-600">Vaarregime: {crew.regime}</div>
                            {crew.status === "thuis" && (
                              (() => {
                                if (!crew.regime) return (
                                  <div className="text-xs text-gray-400 italic">
                                    <span>Geen regime ingesteld</span>
                                  </div>
                                )
                                
                                const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
                                return (
                                  <div className="text-xs text-gray-500">
                                    <span>Volgende wissel: {statusCalculation.nextRotationDate ? new Date(statusCalculation.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"}</span>
                                    <span className="ml-2">Over {statusCalculation.daysUntilRotation} dagen</span>
                                  </div>
                                )
                              })()
                            )}
                            <div className="flex flex-wrap gap-2 mt-1">
                              {crew.diplomas && crew.diplomas.length > 0 ? (
                                crew.diplomas.map((diploma: string, idx: number) => (
                                  <span key={idx} className="flex items-center bg-blue-50 border border-blue-200 rounded px-2 py-0.5 text-xs text-blue-800">
                                    {diploma}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">Geen diploma's</span>
                              )}
                            </div>
                            {crew.notes && (
                              <div className="flex items-center justify-between">
                                <span className="text-orange-600 text-[10px] italic truncate max-w-[100px]">
                                  {Array.isArray(crew.notes) 
                                    ? crew.notes[crew.notes.length - 1]?.content || crew.notes
                                    : crew.notes
                                  }
                                </span>
                                {Array.isArray(crew.notes) && crew.notes.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveNote(crew.id, crew.notes[crew.notes.length - 1].id, crew.notes[crew.notes.length - 1].content);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-[8px] ml-1"
                                    title="Verwijder notitie"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ziek bemanning */}
                {/* Debug: {ship.name} - Ziek count: {ship.ziek.length} */}
                {ship.ziek.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserX className="w-4 h-4 text-red-600" />
                      <h4 className="font-medium text-gray-900">Ziek ({ship.ziek.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ship.ziek.map((crew: any, index: number) => (
                        <div 
                          key={crew.id || `ziek-${ship.id}-${index}-${crew.firstName}-${crew.lastName}`} 
                          className="flex items-center space-x-3 p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                          onDoubleClick={() => handleDoubleClick(crew.id, `${crew.firstName} ${crew.lastName}`)}
                          title="Dubbelklik om notitie toe te voegen"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                              {crew.firstName?.[0] || '?'}{crew.lastName?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 font-medium text-sm text-gray-900 truncate">
                              <Link href={`/bemanning/${crew.id}`} className="hover:underline text-red-700">{crew.firstName || 'Onbekend'} {crew.lastName || 'Onbekend'}</Link>
                              <span className="text-lg">{getNationalityFlag(crew.nationality)}</span>
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 border-red-200">
                                Ziek
                              </Badge>
                              {crew.position?.toLowerCase().includes("aflos") && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                  Aflosser
                                </Badge>
                              )}
                              {crew.isStudent && crew.educationType && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                                  {crew.educationType}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">Functie: {crew.position}</div>
                            <div className="text-xs text-gray-600">Vaarregime: {crew.regime}</div>
                            {crew.onBoardSince && (
                              <div className="text-xs text-gray-500">
                                <span>Laatste aan boord: {new Date(crew.onBoardSince).toLocaleDateString("nl-NL")}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-1">
                              {crew.qualifications && crew.qualifications.length > 0 ? (
                                crew.qualifications.map((diploma: string, idx: number) => (
                                  <span key={idx} className="flex items-center bg-red-50 border border-red-200 rounded px-2 py-0.5 text-xs text-red-800">
                                    {diploma}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">Geen diploma's</span>
                              )}
                            </div>
                            {crew.notes && (
                              <div className="flex items-center justify-between">
                                <span className="text-orange-600 text-[10px] italic truncate max-w-[100px]">
                                  {Array.isArray(crew.notes) 
                                    ? crew.notes[crew.notes.length - 1]?.content || crew.notes
                                    : crew.notes
                                  }
                                </span>
                                {Array.isArray(crew.notes) && crew.notes.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveNote(crew.id, crew.notes[crew.notes.length - 1].id, crew.notes[crew.notes.length - 1].content);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-[8px] ml-1"
                                    title="Verwijder notitie"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geen bemanning */}
                {ship.totalCrew === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Geen bemanning toegewezen</p>
                  </div>
                )}


              </div>
            ))}



            {/* Mobiele compacte weergave */}
            <div className="block md:hidden space-y-3">
              {ships.map((ship) => (
                <div key={ship.name} className="bg-white border-2 border-blue-200 shadow-md rounded-lg p-2 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-blue-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow text-center">{ship.name}</div>
                  <div className="flex items-center justify-between mb-1 mt-2">
                    <span className="font-bold text-[9px]">Totale bemanning: {ship.aanBoord.length + ship.thuis.length}</span>
                  </div>
                  <div className="flex gap-1">
                    {/* Aan boord */}
                    <div className="flex-1">
                      <div className="font-semibold text-[9px] mb-0.5">Aan boord</div>
                      {ship.aanBoord.length > 0 ? ship.aanBoord.map((crew: any, index: number) => (
                        <div key={crew.id || `mobile-aanboord-${ship.id}-${index}-${crew.firstName}-${crew.lastName}`} className="flex flex-col border-b last:border-b-0 py-0.5">
                          <div className="flex items-center gap-0.5 text-[9px]">
                            <span className="font-medium">{crew.firstName} {crew.lastName}</span>
                            <span className="text-gray-500">{crew.position}</span>
                            <span className={
                              crew.status === "aan-boord" ? "bg-green-100 text-green-800 px-0.5 py-0.5 rounded text-[8px]" :
                              crew.status === "thuis" ? "bg-blue-100 text-blue-800 px-0.5 py-0.5 rounded text-[8px]" :
                              crew.status === "ziek" ? "bg-red-100 text-red-800 px-0.5 py-0.5 rounded text-[8px]" :
                              "bg-gray-100 text-gray-800 px-0.5 py-0.5 rounded text-[8px]"
                            }>{crew.status}</span>
                          </div>
                          {crew.notes && (
                            <div className="flex items-center justify-between">
                              <span className="text-orange-600 text-[8px] italic truncate max-w-[80px]">
                                {Array.isArray(crew.notes) 
                                  ? crew.notes[crew.notes.length - 1]?.content || crew.notes
                                  : crew.notes
                                }
                              </span>
                              {Array.isArray(crew.notes) && crew.notes.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveNote(crew.id, crew.notes[crew.notes.length - 1].id, crew.notes[crew.notes.length - 1].content);
                                  }}
                                  className="text-red-500 hover:text-red-700 text-[6px] ml-1"
                                  title="Verwijder notitie"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )) : <div className="text-[9px] text-gray-400 italic">-</div>}
                    </div>
                    {/* Thuis */}
                    <div className="flex-1">
                      <div className="font-semibold text-[9px] mb-0.5">Thuis</div>
                      {ship.thuis.length > 0 ? ship.thuis.map((crew: any, index: number) => (
                        <div key={crew.id || `mobile-thuis-${ship.id}-${index}-${crew.firstName}-${crew.lastName}`} className="flex flex-col border-b last:border-b-0 py-0.5">
                          <div className="flex items-center gap-0.5 text-[9px]">
                            <span className="font-medium">{crew.firstName} {crew.lastName}</span>
                            <span className="text-gray-500">{crew.position}</span>
                            <span className={
                              crew.status === "aan-boord" ? "bg-green-100 text-green-800 px-0.5 py-0.5 rounded text-[8px]" :
                              crew.status === "thuis" ? "bg-blue-100 text-blue-800 px-0.5 py-0.5 rounded text-[8px]" :
                              crew.status === "ziek" ? "bg-red-100 text-red-800 px-0.5 py-0.5 rounded text-[8px]" :
                              "bg-gray-100 text-gray-800 px-0.5 py-0.5 rounded text-[8px]"
                            }>{crew.status}</span>
                          </div>
                          {crew.notes && (
                            <div className="flex items-center justify-between">
                              <span className="text-orange-600 text-[8px] italic truncate max-w-[80px]">
                                {Array.isArray(crew.notes) 
                                  ? crew.notes[crew.notes.length - 1]?.content || crew.notes
                                  : crew.notes
                                }
                              </span>
                              {Array.isArray(crew.notes) && crew.notes.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveNote(crew.id, crew.notes[crew.notes.length - 1].id, crew.notes[crew.notes.length - 1].content);
                                  }}
                                  className="text-red-500 hover:text-red-700 text-[6px] ml-1"
                                  title="Verwijder notitie"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )) : <div className="text-[9px] text-gray-400 italic">-</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          {/* Quick Note Dialog */}
          <Dialog open={quickNoteDialog.isOpen} onOpenChange={(open) => setQuickNoteDialog(prev => ({ ...prev, isOpen: open }))}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notitie toevoegen voor {quickNoteDialog.crewName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Type je notitie hier..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setQuickNoteDialog({ isOpen: false, crewId: "", crewName: "" })}
                  >
                    Annuleren
                  </Button>
                  <Button onClick={handleSaveQuickNote}>
                    Opslaan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Note Confirmation Dialog */}
          <Dialog open={deleteNoteDialog.isOpen} onOpenChange={(open) => setDeleteNoteDialog(prev => ({ ...prev, isOpen: open }))}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notitie verwijderen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Weet je zeker dat je deze notitie wilt verwijderen?
                </p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm italic">"{deleteNoteDialog.noteContent}"</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteNoteDialog({ isOpen: false, crewId: "", noteId: "", noteContent: "" })}
                  >
                    Annuleren
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleConfirmDeleteNote}
                  >
                    Verwijderen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </div>
  )
}
