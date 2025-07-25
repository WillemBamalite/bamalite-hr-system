"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Users, CheckCircle, Clock, UserX } from "lucide-react"
import { shipDatabase } from "@/data/crew-database"
import { isCrewMemberOutOfService } from "@/utils/out-of-service-storage"
import { useState, useEffect } from "react"
import Link from "next/link"
import { calculateRegimeStatus } from "@/utils/regime-calculator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCrewData } from "@/hooks/use-crew-data"

export function ShipOverview() {
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

  // Gebruik de hook voor gecombineerde crew data
  const { crewDatabase: allCrewData } = useCrewData()

  // Alle 15 operationele schepen met volledige bemanning details
  const ships = Object.values(shipDatabase)
    .filter((ship) => ship.status === "Operationeel")
    .map((ship) => {
      // Haal alle bemanning op voor dit schip (inclusief aflossers en zieke mensen)
      const allShipCrew = Object.values(allCrewData).filter((crew: any) => 
        crew.shipId === ship.id
      )

      const aanBoord = allShipCrew.filter((crew: any) => crew.status === "aan-boord")
      const thuis = allShipCrew.filter((crew: any) => crew.status === "thuis")
      const ziek = allShipCrew.filter((crew: any) => crew.status === "ziek")

      return {
        ...ship,
        aanBoord,
        thuis,
        ziek,
        totalCrew: allShipCrew.length,
        nextRotation: `2024-01-${15 + Math.floor(Math.random() * 15)}`, // Random rotatie datum
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

  // Helper voor bemanningsgegevens (mock)
  function getCrewDetails(crew: any) {
    return {
      name: crew.firstName + " " + crew.lastName,
      birthDate: "1980-01-01",
      birthPlace: "Rotterdam",
      address: "Voorbeeldstraat 1, 1234 AB Rotterdam",
      phone: crew.phone || "+31 6 12345678",
      email: crew.email || "voorbeeld@email.com",
      bank: "NL12BANK0123456789",
      function: crew.position,
      smoking: false,
      experience: "10 jaar binnenvaart, 5 jaar als kapitein",
      diplomas: ["Groot Vaarbewijs A", "Radar Diploma", "ADN Basis"],
      salary: "€3500,-",
      ship: crew.shipId || "-",
      company: "Bamalite S.A.",
      matricule: "123456789",
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
        
        console.log("Quick note opgeslagen:", newNote);
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
      console.log("Notitie verwijderd:", deleteNoteDialog.noteId);
    }
    
    setDeleteNoteDialog({ isOpen: false, crewId: "", noteId: "", noteContent: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Ship className="w-5 h-5" />
          <span>Schepen Overzicht - {ships.length} Operationele Schepen</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {ships.map((ship) => (
          <div key={ship.name} className="border rounded-lg p-4">
            <div className="flex flex-col items-center justify-center mb-4">
              <h3 className="font-bold text-lg text-center text-blue-900">{ship.name}</h3>
            </div>

            {/* Aan boord bemanning */}
            {ship.aanBoord.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">Aan boord ({ship.aanBoord.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ship.aanBoord.map((crew: any) => (
                    <div 
                      key={crew.id} 
                      className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                      onDoubleClick={() => handleDoubleClick(crew.id, `${crew.firstName} ${crew.lastName}`)}
                      title="Dubbelklik om notitie toe te voegen"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                          {crew.firstName[0]}{crew.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 font-medium text-sm text-gray-900 truncate">
                          <Link href={`/bemanning/${crew.id}`} className="hover:underline text-blue-700">{crew.firstName} {crew.lastName}</Link>
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
                        {crew.position?.toLowerCase().includes("aflos") && crew.assignmentHistory ? (
                          (() => {
                            const today = new Date()
                            const periode = [...crew.assignmentHistory]
                              .filter((entry: any) => entry.shipId === ship.id && entry.from && entry.to && new Date(entry.from) <= today && new Date(entry.to) >= today)
                              .sort((a: any, b: any) => new Date(b.from).getTime() - new Date(a.from).getTime())[0]
                            return periode ? (
                              <div className="text-xs text-blue-700">Periode: {periode.from && new Date(periode.from).toLocaleDateString("nl-NL")} t/m {periode.to && new Date(periode.to).toLocaleDateString("nl-NL")}</div>
                            ) : null
                          })()
                        ) : (
                          <div className="text-xs text-gray-600">Vaarregime: {crew.regime}</div>
                        )}
                        {crew.status === "aan-boord" && !crew.position?.toLowerCase().includes("aflos") && (
                          (() => {
                            if (crew.onBoardSince) {
                              const calc = calculateRegimeStatus(crew.regime, crew.onBoardSince, crew.status)
                              return (
                                <div className="text-xs text-gray-500">
                                  <span className="mr-2">Aan boord sinds: {new Date(crew.onBoardSince).toLocaleDateString("nl-NL")}</span>
                                  <span>Naar huis op: {calc.offBoardDate ? new Date(calc.offBoardDate).toLocaleDateString("nl-NL") : "-"}</span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="text-xs text-gray-400 italic">
                                  <span>Geen aan boord datum</span>
                                </div>
                              )
                            }
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
                  {ship.thuis.map((crew: any) => (
                    <div 
                      key={crew.id} 
                      className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                      onDoubleClick={() => handleDoubleClick(crew.id, `${crew.firstName} ${crew.lastName}`)}
                      title="Dubbelklik om notitie toe te voegen"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {crew.firstName[0]}{crew.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 font-medium text-sm text-gray-900 truncate">
                          <Link href={`/bemanning/${crew.id}`} className="hover:underline text-blue-700">{crew.firstName} {crew.lastName}</Link>
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
                            if (crew.thuisSinds) {
                              const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
                              const homeSince = new Date(crew.thuisSinds)
                              const nextOnBoard = new Date(homeSince)
                              nextOnBoard.setDate(homeSince.getDate() + regimeWeeks * 7)
                              return (
                                <div className="text-xs text-gray-500">
                                  <span className="mr-2">Naar huis sinds: {homeSince.toLocaleDateString("nl-NL")}</span>
                                  <span>Aan boord op: {nextOnBoard.toLocaleDateString("nl-NL")}</span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="text-xs text-gray-400 italic">
                                  <span>Geen thuis datum</span>
                                </div>
                              )
                            }
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
            {ship.ziek.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <UserX className="w-4 h-4 text-red-600" />
                  <h4 className="font-medium text-gray-900">Ziek ({ship.ziek.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ship.ziek.map((crew: any) => (
                    <div 
                      key={crew.id} 
                      className="flex items-center space-x-3 p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                      onDoubleClick={() => handleDoubleClick(crew.id, `${crew.firstName} ${crew.lastName}`)}
                      title="Dubbelklik om notitie toe te voegen"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                          {crew.firstName[0]}{crew.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 font-medium text-sm text-gray-900 truncate">
                          <Link href={`/bemanning/${crew.id}`} className="hover:underline text-red-700">{crew.firstName} {crew.lastName}</Link>
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

            <div className="pt-3 border-t text-xs text-gray-500 flex justify-between">
              <span>Volgende rotatie: <SafeDate date={ship.nextRotation} /></span>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full mt-4 bg-transparent">
          Alle schepen beheren
        </Button>

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
                  {ship.aanBoord.length > 0 ? ship.aanBoord.map((crew: any) => (
                    <div key={crew.id} className="flex flex-col border-b last:border-b-0 py-0.5">
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
                  {ship.thuis.length > 0 ? ship.thuis.map((crew: any) => (
                    <div key={crew.id} className="flex flex-col border-b last:border-b-0 py-0.5">
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
  )
}
