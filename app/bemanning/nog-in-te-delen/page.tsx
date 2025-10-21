"use client";
import { useState, useEffect } from "react";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { BackButton } from "@/components/ui/back-button";

export default function NogInTeDelenPage() {
  const { crew, ships, loading, error, updateCrew, addCrew, deleteCrew } = useSupabaseData();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedShip, setSelectedShip] = useState<string>("");
  const [onBoardDate, setOnBoardDate] = useState<string>("");
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [expectedStartDate, setExpectedStartDate] = useState<string>("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newSubStatus, setNewSubStatus] = useState<string>("");
  const [showNewCandidateDialog, setShowNewCandidateDialog] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    position: "",
    nationality: "NL",
    diplomas: [] as string[],
    notes: ""
  });

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
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    );
  }

  // Filter bemanningsleden zonder schip (exclude aflossers en uit dienst)
  const unassignedCrew = crew.filter((member: any) => 
    member.status === "nog-in-te-delen" && 
    !member.is_aflosser
  );

  // Filter alle bemanningsleden met incomplete checklist (ook die aan schip zijn toegewezen)
  const allCrewWithIncompleteChecklist = crew.filter((member: any) => {
    if (member.is_aflosser || member.status === 'uit-dienst') {
      return false;
    }
    
    // Moet aangenomen zijn
    if (member.recruitment_status !== "aangenomen") {
      return false;
    }
    
    // Check checklist - gebruik directe velden (meer betrouwbaar)
    const contractSigned = member.arbeidsovereenkomst === true;
    const luxembourgRegistered = member.ingeschreven_luxembourg === true;
    const insured = member.verzekerd === true;
    
    const isChecklistComplete = contractSigned && luxembourgRegistered && insured;
    const hasShip = member.ship_id && member.ship_id !== 'none' && member.ship_id !== '';
    
    // Als checklist compleet is EN heeft een schip toegewezen, dan niet tonen
    if (isChecklistComplete && hasShip) {
      return false;
    }
    
    // Anders tonen als checklist incompleet is
    return !isChecklistComplete;
  });

  // Categoriseer op basis van sub_status veld
  const nogTeBenaderen = unassignedCrew.filter((m: any) => 
    (!m.sub_status || m.sub_status === "nog-te-benaderen") &&
    m.status !== 'uit-dienst'
  );
  
  
  const nogAfTeRonden = allCrewWithIncompleteChecklist;
  
  // Wachtlijst verwijderd op verzoek; er is geen aparte wachtlijstcategorie meer

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

  // Helper functie om datum te formatteren naar DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString;
    }
  };


  const assignToShip = async () => {
    if (!selectedMember || !selectedShip || !onBoardDate) {
      alert("Vul alle velden in");
      return;
    }

    try {
      // Update de bemanningslid met schip toewijzing
      await updateCrew(selectedMember.id, {
        ship_id: selectedShip,
        status: "thuis", // Start met thuis status
        on_board_since: onBoardDate,
        thuis_sinds: new Date().toISOString().split('T')[0] // Vandaag als thuis sinds
      });

      // Success - no alert needed
      
      setShowAssignmentDialog(false);
      setSelectedMember(null);
      setSelectedShip("");
      setOnBoardDate("");
    } catch (error) {
      console.error("Fout bij toewijzen aan schip:", error);
      alert("Er is een fout opgetreden bij het toewijzen aan schip. Probeer het opnieuw.");
    }
  };

  const updateSubStatus = async () => {
    if (!selectedMember || !newSubStatus) {
      alert("Selecteer een status");
      return;
    }


    try {
      const updates: any = {
        sub_status: newSubStatus
      };

      await updateCrew(selectedMember.id, updates);

      // Status updated - no alert needed
      
      setShowStatusDialog(false);
      setSelectedMember(null);
      setNewSubStatus("");
      setExpectedStartDate("");
    } catch (error) {
      console.error("Fout bij updaten status:", error);
      alert("Er is een fout opgetreden. Probeer het opnieuw.");
    }
  };

  const handleNoInterest = async (memberId: string, memberName: string) => {
    if (!confirm(`Weet je zeker dat je ${memberName} wilt verwijderen? Deze persoon wordt volledig uit het systeem verwijderd.`)) {
      return;
    }

    try {
      await deleteCrew(memberId);
      alert(`${memberName} is verwijderd uit het systeem.`);
    } catch (error) {
      console.error("Fout bij verwijderen:", error);
      alert("Er is een fout opgetreden bij het verwijderen.");
    }
  };

  const handleChecklistToggle = async (memberId: string, field: string, value: boolean) => {
    try {
      await updateCrew(memberId, {
        [field]: value
      });
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const addCandidate = async () => {
    if (!candidateForm.firstName || !candidateForm.lastName) {
      alert("Vul minimaal voor- en achternaam in");
      return;
    }

    try {
      const newCandidate = {
        id: `crew-${Date.now()}`,
        first_name: candidateForm.firstName,
        last_name: candidateForm.lastName,
        phone: candidateForm.phone || "",
        email: candidateForm.email || "",
        position: candidateForm.position || "Onbekend",
        nationality: candidateForm.nationality,
        status: "nog-in-te-delen",
        sub_status: "nog-te-benaderen",
        regime: "",
        notes: candidateForm.notes ? [candidateForm.notes] : [],
        diplomas: candidateForm.diplomas,
        created_at: new Date().toISOString()
      };

      console.log('Adding candidate via Supabase:', newCandidate);
      
      await addCrew(newCandidate);

      // Candidate added - no alert needed
      
      setShowNewCandidateDialog(false);
      setCandidateForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        position: "",
        nationality: "NL",
        diplomas: [],
        notes: ""
      });
    } catch (error) {
      console.error("Fout bij toevoegen kandidaat:", error);
      console.error("Error type:", typeof error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      let errorMessage = "Onbekende fout";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      
      alert("Er is een fout opgetreden bij het toevoegen: " + errorMessage);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <BackButton />

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('newPersonnel')}</h1>
          <p className="text-gray-600">Kandidaten en aangenomen personeel zonder toewijzing</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowNewCandidateDialog(true)}
          >
            <span className="mr-2">👤</span>
            Nieuwe Kandidaat
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Nog te benaderen</p>
                <p className="text-2xl font-bold text-red-600">{nogTeBenaderen.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">{t('toBeCompleted')}</p>
                <p className="text-2xl font-bold text-orange-600">{nogAfTeRonden.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {unassignedCrew.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Alle bemanning toegewezen!</h3>
            <p className="text-gray-500 mb-4">Alle bemanningsleden hebben een schip toegewezen gekregen.</p>
            <Link href="/bemanning/nieuw">
              <Button className="bg-green-600 hover:bg-green-700">
                <span className="mr-2">➕</span>
                Nieuw Bemanningslid Toevoegen
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* 1. NOG TE BENADEREN */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📞 Nog Te Benaderen</h2>
              <Badge className="bg-red-100 text-red-800">{nogTeBenaderen.length}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">Nieuwe aanmeldingen die nog telefonisch benaderd moeten worden</p>
            {nogTeBenaderen.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  {t('noPersonsToContact')}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nogTeBenaderen.map((member: any) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {member.first_name[0]}{member.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/bemanning/${member.id}`}
                        className="font-medium text-gray-900 hover:text-blue-700"
                      >
                        {member.first_name} {member.last_name}
                      </Link>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{getNationalityFlag(member.nationality)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Position */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Functie:</span> {member.position}
                </div>

                {/* Regime */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Regime:</span> {member.regime}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  {member.phone && (
                    <div className="text-gray-600">
                      <span className="font-medium">Telefoon:</span> {member.phone}
                    </div>
                  )}
                  {member.email && (
                    <div className="text-gray-600">
                      <span className="font-medium">Email:</span> {member.email}
                    </div>
                  )}
                </div>

                {/* Experience */}
                {member.experience && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Ervaring:</span> {member.experience}
                  </div>
                )}

                {/* Diplomas */}
                {member.diplomas && member.diplomas.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Diploma's:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.diplomas.map((diploma: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {diploma}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {member.notes && member.notes.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notities:</span>
                    <p className="italic mt-1">{member.notes[0]}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={async () => {
                        try {
                          // Zet status naar aangenomen
                          await updateCrew(member.id, {
                            recruitment_status: "aangenomen"
                          });
                          // Ga naar profiel
                          window.location.href = `/bemanning/${member.id}?edit=true&hired=true`;
                        } catch (error) {
                          console.error('Error updating recruitment status:', error);
                        }
                      }}
                    >
                      <span className="mr-1">✓</span>
                      Aangenomen
                    </Button>
                  </div>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleNoInterest(member.id, `${member.first_name} ${member.last_name}`)}
                  >
                    <span className="mr-1">✕</span>
                    {t('noInterest')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
              </div>
            )}
          </div>


          {/* 3. NOG AF TE RONDEN */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📋 Nog Af Te Ronden</h2>
              <Badge className="bg-orange-100 text-orange-800">{nogAfTeRonden.length}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">Aangenomen personeel waarbij de administratieve checklist nog niet volledig is afgerond (ook als ze al aan een schip zijn toegewezen)</p>
            {nogAfTeRonden.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  {t('noPersonsWithIncompleteChecklist')}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nogAfTeRonden.map((member: any) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow border-orange-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {member.first_name[0]}{member.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/bemanning/${member.id}`}
                        className="font-medium text-gray-900 hover:text-blue-700"
                      >
                        {member.first_name} {member.last_name}
                      </Link>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{getNationalityFlag(member.nationality)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Position */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Functie:</span> {member.position}
                </div>

                {/* Ship assignment */}
                {member.ship_id && (
                  <div className="text-xs bg-green-50 p-2 rounded border border-green-200">
                    <span className="font-medium text-green-800">🚢 Schip:</span> 
                    <span className="ml-1 text-green-900">
                      {ships.find(s => s.id === member.ship_id)?.name || 'Onbekend'}
                    </span>
                  </div>
                )}

                {/* Checklist Status */}
                <div className="bg-orange-50 p-2 rounded border border-orange-200">
                  <div className="text-xs font-medium text-orange-800 mb-1">{t('checklist')}:</div>
                  <div className="space-y-0.5">
                    <div 
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-orange-100 p-1 rounded"
                      onClick={() => handleChecklistToggle(member.id, 'arbeidsovereenkomst', !member.arbeidsovereenkomst)}
                    >
                      <span>Contract:</span>
                      <span className={member.arbeidsovereenkomst ? "text-green-600" : "text-red-600"}>
                        {member.arbeidsovereenkomst ? "✅" : "❌"}
                      </span>
                    </div>
                    <div 
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-orange-100 p-1 rounded"
                      onClick={() => handleChecklistToggle(member.id, 'ingeschreven_luxembourg', !member.ingeschreven_luxembourg)}
                    >
                      <span>Luxembourg:</span>
                      <span className={member.ingeschreven_luxembourg ? "text-green-600" : "text-red-600"}>
                        {member.ingeschreven_luxembourg ? "✅" : "❌"}
                      </span>
                    </div>
                    <div 
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-orange-100 p-1 rounded"
                      onClick={() => handleChecklistToggle(member.id, 'verzekerd', !member.verzekerd)}
                    >
                      <span>Verzekerd:</span>
                      <span className={member.verzekerd ? "text-green-600" : "text-red-600"}>
                        {member.verzekerd ? "✅" : "❌"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* In dienst vanaf */}
                {member.in_dienst_vanaf && (
                  <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                    <span className="font-medium text-blue-800">📅 In dienst:</span> 
                    <span className="ml-1 text-blue-900">{formatDate(member.in_dienst_vanaf)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t">
                  <Link href={`/bemanning/${member.id}?edit=true`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <span className="mr-1">✏️</span>
                      {t('completeChecklistButton')}
                    </Button>
                  </Link>
                  {!member.ship_id && (
                    <Button 
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 w-full text-xs"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowAssignmentDialog(true);
                      }}
                    >
                      <span className="mr-1">🚢</span>
                      Toewijzen aan Schip
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Candidate Dialog */}
      <Dialog open={showNewCandidateDialog} onOpenChange={setShowNewCandidateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nieuwe Kandidaat Toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Snel formulier</strong> voor kandidaten die ons benaderd hebben. 
                Alleen naam is verplicht, rest is optioneel. Later kun je meer details toevoegen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Voornaam *</Label>
                <Input
                  id="firstName"
                  value={candidateForm.firstName}
                  onChange={(e) => setCandidateForm({...candidateForm, firstName: e.target.value})}
                  placeholder="Voornaam"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Achternaam *</Label>
                <Input
                  id="lastName"
                  value={candidateForm.lastName}
                  onChange={(e) => setCandidateForm({...candidateForm, lastName: e.target.value})}
                  placeholder="Achternaam"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefoonnummer</Label>
                <Input
                  id="phone"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                  placeholder="+31 6 12345678"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                  placeholder="email@voorbeeld.nl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Functie</Label>
                <Select value={candidateForm.position} onValueChange={(value) => setCandidateForm({...candidateForm, position: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer functie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kapitein">Kapitein</SelectItem>
                    <SelectItem value="Stuurman">Stuurman</SelectItem>
                    <SelectItem value="Matroos">Matroos</SelectItem>
                    <SelectItem value="Lichtmatroos">Lichtmatroos</SelectItem>
                    <SelectItem value="Deksman">Deksman</SelectItem>
                    <SelectItem value="Kok">Kok</SelectItem>
                    <SelectItem value="Onbekend">Onbekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nationality">Nationaliteit</Label>
                <Select value={candidateForm.nationality} onValueChange={(value) => setCandidateForm({...candidateForm, nationality: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer nationaliteit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NL">🇳🇱 Nederland</SelectItem>
                    <SelectItem value="BE">🇧🇪 België</SelectItem>
                    <SelectItem value="DE">🇩🇪 Duitsland</SelectItem>
                    <SelectItem value="PO">🇵🇱 Polen</SelectItem>
                    <SelectItem value="CZ">🇨🇿 Tsjechië</SelectItem>
                    <SelectItem value="SLK">🇸🇰 Slowakije</SelectItem>
                    <SelectItem value="HUN">🇭🇺 Hongarije</SelectItem>
                    <SelectItem value="SERV">🇷🇸 Servië</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Diploma's (optioneel)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  "Vaarbewijs",
                  "Rijnpatent tot Mannheim",
                  "Rijnpatent tot Iffezheim",
                  "Radar",
                  "ADN",
                  "STCW",
                  "Marifoon",
                  "BHV"
                ].map((diploma) => (
                  <div key={diploma} className="flex items-center space-x-2">
                    <Checkbox
                      id={diploma}
                      checked={candidateForm.diplomas.includes(diploma)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCandidateForm({
                            ...candidateForm,
                            diplomas: [...candidateForm.diplomas, diploma]
                          });
                        } else {
                          setCandidateForm({
                            ...candidateForm,
                            diplomas: candidateForm.diplomas.filter((d) => d !== diploma)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={diploma}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {diploma}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notities</Label>
              <Input
                id="notes"
                value={candidateForm.notes}
                onChange={(e) => setCandidateForm({...candidateForm, notes: e.target.value})}
                placeholder="Bijv: Benaderd via email, heeft interesse in stuurman positie..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewCandidateDialog(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={addCandidate}
                disabled={!candidateForm.firstName || !candidateForm.lastName}
              >
                Kandidaat Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Status Wijzigen - {selectedMember?.first_name} {selectedMember?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subStatus">Nieuwe Status</Label>
              <Select value={newSubStatus} onValueChange={setNewSubStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nog-te-benaderen">Nog te benaderen</SelectItem>
                </SelectContent>
              </Select>
            </div>


            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong><br/>
                • <strong>Nog te benaderen</strong>: Nog niet gebeld, moet nog contact opnemen
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={updateSubStatus} disabled={!newSubStatus}>
                Status Bijwerken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Toewijzen aan schip - {selectedMember?.first_name} {selectedMember?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ship">Schip</Label>
              <Select value={selectedShip} onValueChange={setSelectedShip}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer schip" />
                </SelectTrigger>
                <SelectContent>
                  {ships.map((ship) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="onBoardDate">Aan boord datum</Label>
              <Input
                id="onBoardDate"
                type="date"
                value={onBoardDate}
                onChange={(e) => setOnBoardDate(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={assignToShip}>
                Toewijzen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 