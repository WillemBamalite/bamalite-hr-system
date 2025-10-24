"use client";
import { useState, useEffect } from "react";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, UserX, CheckCircle, AlertCircle, GraduationCap, Plus, X } from "lucide-react";
import Link from "next/link";
import { format } from 'date-fns';

export default function StudentenManagementPage() {
  const { crew, ships, loading, error, updateCrew } = useSupabaseData();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [showCompleteEducationDialog, setShowCompleteEducationDialog] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [educationType, setEducationType] = useState<string>("");
  const [educationStartDate, setEducationStartDate] = useState<string>("");
  const [educationEndDate, setEducationEndDate] = useState<string>("");
  const [completionDate, setCompletionDate] = useState<string>("");

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">{t('loading')}...</div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">{t('loading')} data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">{t('error')}: {error}</div>
      </div>
    );
  }

  // Filter studenten from crew (only active students)
  const studenten = crew.filter((member: any) => member.is_student && member.status !== 'uit-dienst');
  
  // Filter bestaande bemanningsleden die nog geen student zijn
  const availableCrewMembers = crew.filter((member: any) => 
    !member.is_student && 
    member.status !== 'uit-dienst' && 
    !member.is_aflosser
  );

  const handleCompleteEducation = async () => {
    if (!selectedStudent || !completionDate) {
      alert("Vul een afsluitdatum in");
      return;
    }

    try {
      await updateCrew(selectedStudent.id, {
        is_student: false,
        education_type: null,
        education_start_date: null,
        education_end_date: null,
        school_periods: null
      });
      
      setShowCompleteEducationDialog(false);
      setSelectedStudent(null);
      setCompletionDate("");
    } catch (error) {
      console.error("Fout bij afsluiten opleiding:", error);
      alert("Er is een fout opgetreden bij het afsluiten van de opleiding.");
    }
  };

  const handleAddStudent = async () => {
    if (!selectedCrewMember || !educationType) {
      alert("Selecteer een bemanningslid en opleidingstype");
      return;
    }

    if (educationType === "BOL" && (!educationStartDate || !educationEndDate)) {
      alert("Voor BOL zijn start- en einddatum verplicht");
      return;
    }

    try {
      const updateData: any = {
        is_student: true,
        education_type: educationType
      };

      if (educationType === "BOL") {
        updateData.education_start_date = educationStartDate;
        updateData.education_end_date = educationEndDate;
        updateData.school_periods = [];
      } else {
        updateData.school_periods = [];
      }

      await updateCrew(selectedCrewMember.id, updateData);
      
      setShowAddStudentDialog(false);
      setSelectedCrewMember(null);
      setEducationType("");
      setEducationStartDate("");
      setEducationEndDate("");
    } catch (error) {
      console.error("Fout bij toevoegen student:", error);
      alert("Er is een fout opgetreden bij het toevoegen van de student.");
    }
  };

  const getNationalityFlag = (nationality: string) => {
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
    };
    return flags[nationality] || "🌍";
  };

  const getShipName = (shipId: string) => {
    const ship = ships.find(s => s.id === shipId);
    return ship ? ship.name : "Geen schip";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "bg-green-100 text-green-800";
      case "thuis":
        return "bg-blue-100 text-blue-800";
      case "ziek":
        return "bg-red-100 text-red-800";
      case "uit-dienst":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "Aan boord";
      case "thuis":
        return "Thuis";
      case "ziek":
        return "Ziek";
      case "uit-dienst":
        return "Uit dienst";
      default:
        return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('studentsOverview')}</h1>
            <p className="text-gray-600">Beheer alle studenten in het systeem</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAddStudentDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Student Toevoegen
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('totalStudents')}</p>
                <p className="text-2xl font-bold text-blue-600">{studenten.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Aan boord</p>
                <p className="text-2xl font-bold text-green-600">
                  {studenten.filter((s: any) => s.status === "aan-boord").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Thuis</p>
                <p className="text-2xl font-bold text-blue-600">
                  {studenten.filter((s: any) => s.status === "thuis").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Ziek</p>
                <p className="text-2xl font-bold text-red-600">
                  {studenten.filter((s: any) => s.status === "ziek").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      {studenten.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noStudentsFound')}</h3>
            <p className="text-gray-500 mb-4">Er zijn nog geen studenten toegevoegd aan het systeem.</p>
            <p className="text-sm text-gray-600">
              Ga naar <Link href="/bemanning/nieuw" className="text-blue-600 hover:underline">Nieuw Bemanningslid</Link> om een student toe te voegen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studenten.map((student: any) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <Link 
                        href={`/bemanning/${student.id}`}
                        className="font-medium text-gray-900 hover:text-blue-700"
                      >
                        {student.first_name} {student.last_name}
                      </Link>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{getNationalityFlag(student.nationality)}</span>
                        <span>•</span>
                        <span>{student.nationality}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(student.status)}>
                    {getStatusText(student.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Education Type */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <GraduationCap className="w-4 h-4" />
                  <span>Opleiding: {student.education_type}</span>
                </div>

                {/* Ship Assignment */}
                {student.ship_id && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>Schip: {getShipName(student.ship_id)}</span>
                  </div>
                )}

                {/* Education Dates for BOL */}
                {student.education_type === "BOL" && (
                  <>
                    {student.education_start_date && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Start: {format(new Date(student.education_start_date), 'dd-MM-yyyy')}</span>
                      </div>
                    )}
                    {student.education_end_date && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Eind: {format(new Date(student.education_end_date), 'dd-MM-yyyy')}</span>
                      </div>
                    )}
                  </>
                )}

                {/* School Periods for BBL */}
                {student.education_type === "BBL" && student.school_periods && student.school_periods.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">{t('schoolPeriods')}:</span>
                    <div className="space-y-1">
                      {student.school_periods.slice(0, 2).map((period: any, index: number) => (
                        <div key={index} className="text-xs text-gray-600">
                          {format(new Date(period.fromDate), 'dd-MM-yyyy')} - {format(new Date(period.toDate), 'dd-MM-yyyy')}
                        </div>
                      ))}
                      {student.school_periods.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{student.school_periods.length - 2} meer...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  {student.phone && (
                    <div className="text-gray-600">
                      <span className="font-medium">Telefoon:</span> {student.phone}
                    </div>
                  )}
                  {student.email && (
                    <div className="text-gray-600">
                      <span className="font-medium">Email:</span> {student.email}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {student.notes && student.notes.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notities:</span>
                    <p className="italic mt-1">{student.notes[0]}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowCompleteEducationDialog(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Opleiding Afsluiten
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bestaande Bemanningslid als Student Toevoegen</DialogTitle>
            <DialogDescription>
              Selecteer een bestaand bemanningslid en geef aan welke opleiding zij gaan volgen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="crewMember">Bemanningslid *</Label>
              <Select value={selectedCrewMember?.id || ""} onValueChange={(value) => {
                const member = availableCrewMembers.find(m => m.id === value);
                setSelectedCrewMember(member);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bemanningslid" />
                </SelectTrigger>
                <SelectContent>
                  {availableCrewMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} ({member.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="educationType">Opleidingstype *</Label>
              <Select value={educationType} onValueChange={setEducationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer opleidingstype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BBL">BBL (Beroepsbegeleidende Leerweg)</SelectItem>
                  <SelectItem value="BOL">BOL (Beroepsopleidende Leerweg)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {educationType === "BOL" && (
              <>
                <div>
                  <Label htmlFor="startDate">Begindatum opleiding *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={educationStartDate}
                    onChange={(e) => setEducationStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Einddatum opleiding *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={educationEndDate}
                    onChange={(e) => setEducationEndDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddStudentDialog(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleAddStudent}
                disabled={!selectedCrewMember || !educationType || (educationType === "BOL" && (!educationStartDate || !educationEndDate))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Student Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Education Dialog */}
      <Dialog open={showCompleteEducationDialog} onOpenChange={setShowCompleteEducationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opleiding Afsluiten</DialogTitle>
            <DialogDescription>
              {selectedStudent && `Opleiding van ${selectedStudent.first_name} ${selectedStudent.last_name} afsluiten?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completionDate">Afsluitdatum *</Label>
              <Input
                id="completionDate"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                required
              />
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Let op:</strong> Na het afsluiten van de opleiding wordt de persoon geen student meer en verdwijnt uit deze lijst.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCompleteEducationDialog(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleCompleteEducation}
                disabled={!completionDate}
                className="bg-green-600 hover:bg-green-700"
              >
                Opleiding Afsluiten
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 