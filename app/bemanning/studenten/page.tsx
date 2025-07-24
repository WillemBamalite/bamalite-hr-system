"use client";
import { useState, useEffect } from "react";
import { crewDatabase, shipDatabase } from "@/data/crew-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, UserX, CheckCircle, AlertCircle, GraduationCap } from "lucide-react";
import Link from "next/link";

interface SchoolPeriod {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "active" | "completed";
  createdAt: string;
}

export default function StudentenManagementPage() {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showSchoolPeriodDialog, setShowSchoolPeriodDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Voor het forceren van re-render
  const [newSchoolPeriod, setNewSchoolPeriod] = useState({
    fromDate: "",
    toDate: "",
    reason: "School"
  });

  // Auto-refresh elke 5 seconden om nieuwe studenten te detecteren
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Haal studenten uit database en localStorage
  const [localStorageCrew, setLocalStorageCrew] = useState<any>({});
  
  // Laad localStorage data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}');
        setLocalStorageCrew(storedCrew);
      } catch (e) {
        console.error('Error parsing localStorage crew:', e);
      }
    }
  }, [refreshKey]);

  // Combineer database en localStorage data
  const allCrewData = { ...crewDatabase, ...localStorageCrew };
  
  // Filter alle studenten (met refreshKey dependency voor re-render)
  const studenten = Object.values(allCrewData).filter((c: any) => c.isStudent);
  


  // Bepaal status van elke student
  const studentenWithStatus = studenten.map((student: any) => {
    const today = new Date();
    
    // Check voor actieve schoolperiode uit management systeem (BBL)
    // Voor nu gebruiken we alleen de profiel schoolperiodes
    const activeSchoolPeriod = null;

    // Check voor actieve schoolperiode uit profiel (BBL)
    const activeProfileSchoolPeriod = student.schoolPeriods?.find((period: any) => {
      const periodStart = new Date(period.fromDate);
      const periodEnd = new Date(period.toDate);
      return today >= periodStart && today <= periodEnd;
    });

    // Check voor BOL einddatum
    const isBOLExpired = student.educationType === "BOL" && 
      student.educationEndDate && 
      new Date(student.educationEndDate) < today;

    let status = "aan-boord";
    let statusColor = "bg-green-100 text-green-800";
    let statusIcon = <CheckCircle className="w-4 h-4" />;

    if (activeSchoolPeriod || activeProfileSchoolPeriod) {
      status = "naar-school";
      statusColor = "bg-yellow-100 text-yellow-800";
      statusIcon = <GraduationCap className="w-4 h-4" />;
    } else if (isBOLExpired) {
      // BOL studenten blijven "aan-boord" zelfs als hun stage voorbij is
      // Ze worden alleen uit dienst gehaald via een apart proces
      status = "aan-boord";
      statusColor = "bg-green-100 text-green-800";
      statusIcon = <CheckCircle className="w-4 h-4" />;
    }

    return {
      ...student,
      status,
      statusColor,
      statusIcon,
      activeSchoolPeriod: activeSchoolPeriod || activeProfileSchoolPeriod,
      isBOLExpired
    };
  });

  const aanBoord = studentenWithStatus.filter((s: any) => s.status === "aan-boord");
  const naarSchool = studentenWithStatus.filter((s: any) => s.status === "naar-school");
  


  function handleSetSchoolPeriod(student: any) {
    setSelectedStudent(student);
    setShowSchoolPeriodDialog(true);
  }

  function handleShowHistory(student: any) {
    setSelectedStudent(student);
    setShowHistoryDialog(true);
  }

  function handleCreateSchoolPeriod() {
    if (!selectedStudent || !newSchoolPeriod.fromDate || !newSchoolPeriod.toDate) {
      return;
    }

    // Voeg schoolperiode toe aan de student's profiel in de database
    const newSchoolPeriodData = {
      fromDate: newSchoolPeriod.fromDate,
      toDate: newSchoolPeriod.toDate,
      reason: newSchoolPeriod.reason || "School"
    };

    // Update de student in de database
    if ((crewDatabase as any)[selectedStudent.id]) {
      const currentSchoolPeriods = (crewDatabase as any)[selectedStudent.id].schoolPeriods || [];
      (crewDatabase as any)[selectedStudent.id].schoolPeriods = [...currentSchoolPeriods, newSchoolPeriodData];
      console.log("Schoolperiode toegevoegd:", newSchoolPeriodData);
      console.log("Alle schoolperiodes voor student:", (crewDatabase as any)[selectedStudent.id].schoolPeriods);
    }

    // Update ook localStorage als de student daar staat
    if (localStorageCrew[selectedStudent.id]) {
      try {
        const existingCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}');
        const currentSchoolPeriods = existingCrew[selectedStudent.id].schoolPeriods || [];
        existingCrew[selectedStudent.id].schoolPeriods = [...currentSchoolPeriods, newSchoolPeriodData];
        localStorage.setItem('crewDatabase', JSON.stringify(existingCrew));
        console.log("Schoolperiode toegevoegd aan localStorage:", newSchoolPeriodData);
      } catch (e) {
        console.error('Error updating localStorage:', e);
      }
    }

    setNewSchoolPeriod({ fromDate: "", toDate: "", reason: "School" });
    setShowSchoolPeriodDialog(false);
    setRefreshKey(prev => prev + 1); // Force re-render
  }

  function getStudentHistory(studentId: string) {
    // Voor nu returnen we een lege array omdat we geen aparte history tracking hebben
    // In de toekomst kunnen we hier voltooide schoolperiodes tracken
    return [];
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("nl-NL");
  }

  function getNationalityFlag(nationality: string) {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Studenten Management</h1>
          <p className="text-gray-600 mt-2">Beheer alle studenten en hun schoolperiodes</p>
        </div>
        <Button 
          onClick={() => setRefreshKey(prev => prev + 1)}
          variant="outline"
          size="sm"
        >
          <Clock className="w-4 h-4 mr-2" />
          Ververs
        </Button>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totaal Studenten</p>
                <p className="text-2xl font-bold text-gray-900">{studenten.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aan boord</p>
                <p className="text-2xl font-bold text-green-600">{aanBoord.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Naar school</p>
                <p className="text-2xl font-bold text-yellow-600">{naarSchool.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Studenten overzicht */}
      <div className="space-y-6">
        {/* Aan boord studenten */}
        {aanBoord.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Aan boord ({aanBoord.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aanBoord.map((student: any) => (
                  <div key={student.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Link href={`/bemanning/${student.id}`} className="font-medium text-blue-700 hover:underline">
                          {student.firstName} {student.lastName}
                        </Link>
                        <span className="text-lg">{getNationalityFlag(student.nationality)}</span>
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                          {student.educationType}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Functie: {student.position}</div>
                    <div className="text-sm text-gray-600 mb-2">Schip: {student.shipId ? (shipDatabase as any)[student.shipId]?.name : "Niet toegewezen"}</div>
                    
                    {/* Schoolperiodes voor BBL studenten */}
                    {student.educationType === "BBL" && student.schoolPeriods && student.schoolPeriods.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1">Schoolperiodes:</div>
                        <div className="space-y-1">
                          {[...student.schoolPeriods]
                            .sort((a, b) => new Date(a.fromDate || 0).getTime() - new Date(b.fromDate || 0).getTime())
                            .slice(0, 3) // Toon maximaal 3 periodes
                            .map((period: any, index: number) => {
                              const today = new Date();
                              const periodStart = new Date(period.fromDate);
                              const periodEnd = new Date(period.toDate);
                              const isActive = today >= periodStart && today <= periodEnd;
                              const isPast = today > periodEnd;
                              
                              let statusColor = "text-gray-600";
                              if (isActive) statusColor = "text-green-600 font-medium";
                              else if (isPast) statusColor = "text-gray-400 line-through";
                              
                              return (
                                <div key={index} className={`text-xs ${statusColor}`}>
                                  {formatDate(period.fromDate)} - {formatDate(period.toDate)}
                                  {isActive && <span className="ml-1 text-green-600">●</span>}
                                </div>
                              );
                            })}
                          {student.schoolPeriods.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{student.schoolPeriods.length - 3} meer...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stage periode voor BOL studenten */}
                    {student.educationType === "BOL" && student.educationEndDate && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1">Stage periode:</div>
                        <div className="text-xs text-gray-600">
                          {(() => {
                            const today = new Date();
                            const endDate = new Date(student.educationEndDate);
                            const isExpired = today > endDate;
                            const isExpiringSoon = today > new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dagen voor einddatum
                            
                            let statusColor = "text-gray-600";
                            let statusText = "";
                            
                            if (isExpired) {
                              statusColor = "text-red-600 font-medium";
                              statusText = " (VERLOPEN)";
                            } else if (isExpiringSoon) {
                              statusColor = "text-orange-600 font-medium";
                              statusText = " (EINDIGT BINNENKORT)";
                            }
                            
                            return (
                              <div className={`${statusColor}`}>
                                Tot: {formatDate(student.educationEndDate)}
                                {statusText}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {student.educationType === "BBL" && (
                        <Button size="sm" onClick={() => handleSetSchoolPeriod(student)}>
                          Schoolperiode instellen
                        </Button>
                      )}
                      {student.educationType === "BBL" && (
                        <Button size="sm" variant="outline" onClick={() => handleShowHistory(student)}>
                          Geschiedenis
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Naar school studenten */}
        {naarSchool.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-yellow-600" />
                Naar school ({naarSchool.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {naarSchool.map((student: any) => (
                  <div key={student.id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Link href={`/bemanning/${student.id}`} className="font-medium text-blue-700 hover:underline">
                          {student.firstName} {student.lastName}
                        </Link>
                        <span className="text-lg">{getNationalityFlag(student.nationality)}</span>
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                          {student.educationType}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Functie: {student.position}</div>
                    <div className="text-sm text-gray-600 mb-2">Schip: {student.shipId ? (shipDatabase as any)[student.shipId]?.name : "Niet toegewezen"}</div>
                    
                    {/* Schoolperiodes voor BBL studenten */}
                    {student.educationType === "BBL" && student.schoolPeriods && student.schoolPeriods.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-yellow-700 mb-1">Schoolperiodes:</div>
                        <div className="space-y-1">
                          {[...student.schoolPeriods]
                            .sort((a, b) => new Date(a.fromDate || 0).getTime() - new Date(b.fromDate || 0).getTime())
                            .slice(0, 3) // Toon maximaal 3 periodes
                            .map((period: any, index: number) => {
                              const today = new Date();
                              const periodStart = new Date(period.fromDate);
                              const periodEnd = new Date(period.toDate);
                              const isActive = today >= periodStart && today <= periodEnd;
                              const isPast = today > periodEnd;
                              
                              let statusColor = "text-yellow-600";
                              if (isActive) statusColor = "text-yellow-700 font-medium";
                              else if (isPast) statusColor = "text-gray-400 line-through";
                              
                              return (
                                <div key={index} className={`text-xs ${statusColor}`}>
                                  {formatDate(period.fromDate)} - {formatDate(period.toDate)}
                                  {isActive && <span className="ml-1 text-yellow-600">●</span>}
                                </div>
                              );
                            })}
                          {student.schoolPeriods.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{student.schoolPeriods.length - 3} meer...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stage periode voor BOL studenten */}
                    {student.educationType === "BOL" && student.educationEndDate && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-yellow-700 mb-1">Stage periode:</div>
                        <div className="text-xs text-yellow-600">
                          {(() => {
                            const today = new Date();
                            const endDate = new Date(student.educationEndDate);
                            const isExpired = today > endDate;
                            const isExpiringSoon = today > new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dagen voor einddatum
                            
                            let statusColor = "text-yellow-600";
                            let statusText = "";
                            
                            if (isExpired) {
                              statusColor = "text-red-600 font-medium";
                              statusText = " (VERLOPEN)";
                            } else if (isExpiringSoon) {
                              statusColor = "text-orange-600 font-medium";
                              statusText = " (EINDIGT BINNENKORT)";
                            }
                            
                            return (
                              <div className={`${statusColor}`}>
                                Tot: {formatDate(student.educationEndDate)}
                                {statusText}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {student.educationType === "BBL" && (
                        <Button size="sm" variant="outline" onClick={() => handleShowHistory(student)}>
                          Geschiedenis
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}



        {/* Geen studenten */}
        {studenten.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen studenten</h3>
              <p className="text-gray-600">Er zijn nog geen studenten toegevoegd aan het systeem.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schoolperiode dialog */}
      <Dialog open={showSchoolPeriodDialog} onOpenChange={setShowSchoolPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schoolperiode instellen - {selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
            <DialogDescription>
              Voer de schoolperiode in voor deze BBL student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fromDate">Van datum</Label>
              <Input
                id="fromDate"
                type="date"
                value={newSchoolPeriod.fromDate}
                onChange={(e) => setNewSchoolPeriod({...newSchoolPeriod, fromDate: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="toDate">Tot datum</Label>
              <Input
                id="toDate"
                type="date"
                value={newSchoolPeriod.toDate}
                onChange={(e) => setNewSchoolPeriod({...newSchoolPeriod, toDate: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreateSchoolPeriod} className="flex-1" disabled={!newSchoolPeriod.fromDate || !newSchoolPeriod.toDate}>
              Schoolperiode instellen
            </Button>
            <Button variant="outline" onClick={() => setShowSchoolPeriodDialog(false)}>
              Annuleren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Geschiedenis - {selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Geplande schoolperiodes */}
            {selectedStudent?.educationType === "BBL" && selectedStudent?.schoolPeriods && selectedStudent.schoolPeriods.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schoolperiodes ({selectedStudent.schoolPeriods.length})
                </h3>
                <div className="space-y-2">
                  {[...selectedStudent.schoolPeriods]
                    .sort((a, b) => new Date(a.fromDate || 0).getTime() - new Date(b.fromDate || 0).getTime())
                    .map((period: any, index: number) => {
                      const today = new Date();
                      const periodStart = new Date(period.fromDate);
                      const periodEnd = new Date(period.toDate);
                      const isActive = today >= periodStart && today <= periodEnd;
                      const isPast = today > periodEnd;
                      const isFuture = today < periodStart;
                      
                      let status = "Gepland";
                      let statusColor = "bg-blue-100 text-blue-800";
                      
                      if (isActive) {
                        status = "Actief";
                        statusColor = "bg-green-100 text-green-800";
                      } else if (isPast) {
                        status = "Voltooid";
                        statusColor = "bg-gray-100 text-gray-800";
                      }
                      
                      return (
                        <div key={index} className={`border rounded-lg p-3 ${isActive ? 'bg-green-50' : isPast ? 'bg-gray-50' : 'bg-blue-50'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                #{index + 1}: {formatDate(period.fromDate)} - {formatDate(period.toDate)}
                              </div>
                              <div className="text-sm text-gray-600">{period.reason || "School"}</div>
                            </div>
                            <Badge variant="secondary" className={statusColor}>
                              {status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* School geschiedenis (alleen voor BBL studenten) */}
            {selectedStudent?.educationType === "BBL" && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  School geschiedenis
                </h3>
                {selectedStudent?.schoolPeriods ? (
                  (() => {
                    const today = new Date();
                    const completedPeriods = selectedStudent.schoolPeriods.filter((period: any) => {
                      const periodEnd = new Date(period.toDate);
                      return today > periodEnd;
                    });
                    
                    if (completedPeriods.length === 0) {
                      return (
                        <div>
                          <p className="text-gray-500">Geen voltooide schoolperiodes.</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Hier worden schoolperiodes getoond die al voorbij zijn.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        {completedPeriods.map((period: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {formatDate(period.fromDate)} - {formatDate(period.toDate)}
                                </div>
                                <div className="text-sm text-gray-600">{period.reason || "School"}</div>
                              </div>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                Voltooid
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-gray-500">Geen voltooide schoolperiodes.</p>
                )}
              </div>
            )}

            {/* BOL studenten hebben geen geschiedenis */}
            {selectedStudent?.educationType === "BOL" && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Stage periode
                </h3>
                <p className="text-gray-500">BOL studenten hebben geen school geschiedenis.</p>
                <p className="text-xs text-gray-400 mt-1">
                  BOL studenten hebben één stage periode die eindigt op: {selectedStudent?.educationEndDate ? formatDate(selectedStudent.educationEndDate) : "Niet ingesteld"}
                </p>
              </div>
            )}

            {/* Student informatie */}
            <div>
              <h3 className="font-semibold mb-3">Student informatie</h3>
              <div className="space-y-2">
                <div><strong>Type opleiding:</strong> {selectedStudent?.educationType}</div>
                {selectedStudent?.educationType === "BOL" && selectedStudent?.educationEndDate && (
                  <div><strong>Opleidingsperiode tot:</strong> {formatDate(selectedStudent.educationEndDate)}</div>
                )}
                <div><strong>Functie:</strong> {selectedStudent?.position}</div>
                <div><strong>Schip:</strong> {selectedStudent?.shipId ? (shipDatabase as any)[selectedStudent.shipId]?.name : "Niet toegewezen"}</div>
                <div><strong>Aantal schoolperiodes:</strong> {selectedStudent?.schoolPeriods?.length || 0}</div>
                {selectedStudent?.schoolPeriods && selectedStudent.schoolPeriods.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <strong>Schoolperiodes data:</strong> {JSON.stringify(selectedStudent.schoolPeriods)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 