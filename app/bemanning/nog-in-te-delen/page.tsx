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
import { ContractDialog } from "@/components/crew/contract-dialog";
import type { ContractData } from "@/utils/contract-generator";
import { FileText } from "lucide-react";

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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [selectedMemberForContract, setSelectedMemberForContract] = useState<any>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [candidateForm, setCandidateForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    position: "",
    nationality: "NL",
    diplomas: [] as string[],
    notes: "",
    contactVia: "",
    geplaatstDoor: "",
    isStudent: false,
    educationType: "",
    smoking: false,
    drivingLicense: false,
    residence: "",
    birthDate: "",
    startMogelijkheid: "",
    datumGeplaatst: ""
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

  // Filter bemanningsleden zonder schip (exclude aflossers, uit dienst en dummy's)
  const unassignedCrew = crew.filter((member: any) => 
    member.status === "nog-in-te-delen" && 
    !member.is_aflosser &&
    !member.is_dummy &&
    member.status !== 'uit-dienst'
  );

  // Helper functie om checklist status te checken
  const isChecklistComplete = (member: any) => {
    const contractSigned = member.arbeidsovereenkomst === true;
    const luxembourgRegistered = member.ingeschreven_luxembourg === true;
    const insured = member.verzekerd === true;
    return contractSigned && luxembourgRegistered && insured;
  };

  // Helper functie om te checken of iemand een schip heeft
  const hasShip = (member: any) => {
    return member.ship_id && 
           member.ship_id !== 'none' && 
           member.ship_id !== '' && 
           member.ship_id !== null;
  };

  // Categoriseer op basis van sub_status veld - alleen kandidaten die nog niet aangenomen zijn
  const contactStages = [null, undefined, "", "nog-te-benaderen", "benaderen", "in-gesprek", "kennismaking-gepland"];
  const nogTeBenaderen = unassignedCrew.filter((m: any) => 
    contactStages.includes(m.sub_status) &&
    m.status !== 'uit-dienst' &&
    m.recruitment_status !== "aangenomen" &&
    m.sub_status !== "later-terugkomen"
  );

  // Later terugkomen: kandidaten die later terug kunnen komen
  const laterTerugkomen = unassignedCrew.filter((m: any) => 
    m.sub_status === "later-terugkomen" &&
    m.status !== 'uit-dienst' &&
    m.recruitment_status !== "aangenomen"
  );
  
  // Nog Af Te Ronden: alleen mensen MET schip EN incomplete checklist
  const nogAfTeRonden = crew.filter((member: any) => {
    if (member.is_aflosser || member.status === 'uit-dienst' || member.is_dummy) {
      return false;
    }
    
    // Moet aangenomen zijn
    if (member.recruitment_status !== "aangenomen") {
      return false;
    }
    
    // Moet een schip hebben
    if (!hasShip(member)) {
      return false;
    }
    
    // Checklist moet incompleet zijn
    return !isChecklistComplete(member);
  });
  
  // Nog In Te Delen: aangenomen, ZONDER schip (ongeacht checklist status)
  // Dit bevat zowel mensen met complete als incomplete checklist
  const nogInTeDelen = crew.filter((member: any) => {
    if (member.is_aflosser || member.status === 'uit-dienst' || member.is_dummy) return false;
    if (member.recruitment_status !== 'aangenomen') return false;
    
    // Moet GEEN schip hebben
    return !hasShip(member);
  });
  
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

  // Functie om crew member data om te zetten naar ContractData
  const prepareContractData = (member: any): ContractData => {
    const selectedShip = ships.find(ship => ship.id === member.ship_id);
    const shipName = selectedShip ? selectedShip.name : '';

    return {
      firstName: member.first_name || '',
      lastName: member.last_name || '',
      birthDate: member.birth_date || '',
      birthPlace: member.birth_place || '',
      nationality: member.nationality || 'NL',
      address: member.address || {
        street: '',
        city: '',
        postalCode: '',
        country: ''
      },
      phone: member.phone || '',
      email: member.email || '',
      position: member.position || '',
      company: member.company || 'Bamalite S.A.',
      in_dienst_vanaf: member.in_dienst_vanaf || '',
      matricule: member.matricule || '',
      shipName: shipName
    };
  };

  // Functie om contract dialog te openen
  const handleOpenContractDialog = (member: any) => {
    const data = prepareContractData(member);
    setContractData(data);
    setSelectedMemberForContract(member);
    setShowContractDialog(true);
  };

  // Functie die wordt aangeroepen na het sluiten van de contract dialog
  const handleContractDialogComplete = () => {
    setShowContractDialog(false);
    setContractData(null);
    setSelectedMemberForContract(null);
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

  const handleLaterTerugkomen = async (member: any) => {
    try {
      await updateCrew(member.id, {
        sub_status: "later-terugkomen"
      });
    } catch (error) {
      console.error("Fout bij verplaatsen naar later terugkomen:", error);
      alert("Er is een fout opgetreden.");
    }
  };

  const setContactStage = async (member: any, stage: "benaderen" | "in-gesprek" | "kennismaking-gepland") => {
    try {
      let updates: any = { sub_status: stage };
      if (stage === "kennismaking-gepland") {
        const date = window.prompt("Datum kennismaking (DD-MM-YYYY)? Optioneel.", member.expected_start_date || "");
        if (date) {
          const m = date.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (!m) {
            alert("Gebruik formaat DD-MM-YYYY");
            return;
          }
          const [_, dd, mm, yyyy] = m;
          const iso = `${yyyy}-${mm}-${dd}`;
          const dt = new Date(iso);
          // simpele validatie
          if (isNaN(dt.getTime())) {
            alert("Ongeldige datum");
            return;
          }
          updates.expected_start_date = iso;
        }
      }
      await updateCrew(member.id, updates);
    } catch (error) {
      console.error("Fout bij stage opslaan:", error);
      alert("Fout bij opslaan. Probeer opnieuw.");
    }
  };

  const getStageColor = (member: any) => {
    switch (member.sub_status) {
      case "benaderen":
        return { border: "border-yellow-300", bg: "bg-yellow-50", dot: "bg-yellow-400" };
      case "in-gesprek":
        return { border: "border-blue-300", bg: "bg-blue-50", dot: "bg-blue-500" };
      case "kennismaking-gepland":
        return { border: "border-purple-300", bg: "bg-purple-50", dot: "bg-purple-500" };
      default:
        return { border: "border-gray-200", bg: "bg-white", dot: "bg-gray-300" };
    }
  };

  const handleEdit = (member: any) => {
    setEditingMember(member);
    setCandidateForm({
      firstName: member.first_name || "",
      lastName: member.last_name || "",
      phone: member.phone || "",
      email: member.email || "",
      position: member.position || "",
      nationality: member.nationality || "NL",
      diplomas: member.diplomas || [],
      notes: member.notes && member.notes.length > 0 
        ? (typeof member.notes[0] === "string" ? member.notes[0] : member.notes[0]?.content || "")
        : "",
      contactVia: member.contact_via || "",
      geplaatstDoor: member.geplaatst_door || "",
      isStudent: member.is_student || false,
      educationType: member.education_type || "",
      smoking: member.smoking || false,
      drivingLicense: member.driving_license || false,
      residence: member.residence || "",
      birthDate: member.birth_date || "",
      startMogelijkheid: member.start_mogelijkheid || "",
      datumGeplaatst: member.datum_geplaatst || ""
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    try {
      const updateData: any = {
        first_name: candidateForm.firstName,
        last_name: candidateForm.lastName,
        phone: candidateForm.phone || null,
        email: candidateForm.email || null,
        position: candidateForm.position || null,
        nationality: candidateForm.nationality,
        diplomas: candidateForm.diplomas,
        notes: candidateForm.notes ? [candidateForm.notes] : [],
        contact_via: candidateForm.contactVia || null,
        geplaatst_door: candidateForm.geplaatstDoor || null,
        is_student: candidateForm.isStudent || false,
        education_type: candidateForm.isStudent ? candidateForm.educationType : null,
        smoking: candidateForm.smoking || false,
        driving_license: candidateForm.drivingLicense || false,
        residence: candidateForm.residence || null,
        birth_date: candidateForm.birthDate || null,
        start_mogelijkheid: candidateForm.startMogelijkheid || null,
        datum_geplaatst: candidateForm.datumGeplaatst || null
      };

      await updateCrew(editingMember.id, updateData);
      setShowEditDialog(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Fout bij bijwerken:", error);
      alert("Er is een fout opgetreden bij het bijwerken.");
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
      const newCandidate: any = {
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
        created_at: new Date().toISOString(),
        contact_via: candidateForm.contactVia || null,
        geplaatst_door: candidateForm.geplaatstDoor || null,
        is_student: candidateForm.isStudent || false,
        education_type: candidateForm.isStudent ? candidateForm.educationType : null,
        smoking: candidateForm.smoking || false,
        driving_license: candidateForm.drivingLicense || false,
        residence: candidateForm.residence || null,
        birth_date: candidateForm.birthDate || null,
        start_mogelijkheid: candidateForm.startMogelijkheid || null,
        datum_geplaatst: candidateForm.datumGeplaatst || null
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
        notes: "",
        contactVia: "",
        geplaatstDoor: "",
        isStudent: false,
        educationType: "",
        smoking: false,
        drivingLicense: false,
        residence: "",
        birthDate: "",
        startMogelijkheid: "",
        datumGeplaatst: ""
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
        {laterTerugkomen.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gray-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Later terugkomen</p>
                  <p className="text-2xl font-bold text-gray-600">{laterTerugkomen.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Nog in te delen</p>
                <p className="text-2xl font-bold text-blue-600">{nogInTeDelen.length}</p>
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

      {/* Show message if both columns are empty */}
      {nogTeBenaderen.length === 0 && nogAfTeRonden.length === 0 && (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Alle bemanning toegewezen!</h3>
            <p className="text-gray-500 mb-4">Alle bemanningsleden hebben een schip toegewezen gekregen en hun checklist is afgerond.</p>
            <Link href="/bemanning/nieuw">
              <Button className="bg-green-600 hover:bg-green-700">
                <span className="mr-2">➕</span>
                Nieuw Bemanningslid Toevoegen
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Always show the columns, even if empty */}
      <div className="space-y-10">
          {/* 1. NOG TE BENADEREN */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📞 Nog Te Benaderen</h2>
              <Badge className="bg-red-100 text-red-800">{nogTeBenaderen.length}</Badge>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Nieuwe aanmeldingen die nog telefonisch benaderd moeten worden</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-yellow-400 border border-yellow-500"></span>
                  <span>Benaderd</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600"></span>
                  <span>In gesprek</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-purple-500 border border-purple-600"></span>
                  <span>Kennismaking gepland</span>
                </div>
              </div>
            </div>
            {nogTeBenaderen.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  {t('noPersonsToContact')}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nogTeBenaderen.map((member: any) => {
                  const stage = getStageColor(member);
                  return (
                    <Card key={member.id} className={`hover:shadow-lg transition-shadow border ${stage.border} ${stage.bg}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-orange-100 text-orange-700">
                                {(member.first_name?.[0] || "?")}{(member.last_name?.[0] || "")}
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
                          <div className="flex items-center gap-1">
                            <button
                              aria-label="Stage benaderen (geel)"
                              className={`w-4 h-4 rounded-sm border border-yellow-400 ${member.sub_status === "benaderen" ? "bg-yellow-400" : "bg-white"} hover:ring-2 hover:ring-yellow-300`}
                              onClick={() => setContactStage(member, "benaderen")}
                            />
                            <button
                              aria-label="Stage in gesprek (blauw)"
                              className={`w-4 h-4 rounded-sm border border-blue-500 ${member.sub_status === "in-gesprek" ? "bg-blue-500" : "bg-white"} hover:ring-2 hover:ring-blue-300`}
                              onClick={() => setContactStage(member, "in-gesprek")}
                            />
                            <button
                              aria-label="Stage kennismaking gepland (paars)"
                              className={`w-4 h-4 rounded-sm border border-purple-500 ${member.sub_status === "kennismaking-gepland" ? "bg-purple-500" : "bg-white"} hover:ring-2 hover:ring-purple-300`}
                              onClick={() => setContactStage(member, "kennismaking-gepland")}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {member.sub_status === "kennismaking-gepland" && member.expected_start_date && (
                          <div className="text-xs text-purple-700 font-medium">
                            Kennismaking: {formatDate(member.expected_start_date)}
                          </div>
                        )}

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
                        {member.notes && member.notes.length > 0 && (() => {
                          const firstNote = member.notes[0];
                          const noteText = typeof firstNote === "string" ? firstNote : (firstNote?.content || "");
                          if (!noteText) return null;
                          return (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Notities:</span>
                              <p className="italic mt-1">{noteText}</p>
                            </div>
                          );
                        })()}

                        {/* Actions */}
                        <div className="pt-3 border-t">
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 min-w-[140px]"
                              onClick={() => handleEdit(member)}
                            >
                              <span className="mr-1">✏️</span>
                              Bewerken
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 flex-1 min-w-[140px]"
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
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-200 hover:bg-orange-50 flex-1 min-w-[140px]"
                              onClick={() => handleLaterTerugkomen(member)}
                            >
                              <span className="mr-1">⏰</span>
                              Later terugkomen
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 flex-1 min-w-[140px]"
                              onClick={() => handleNoInterest(member.id, `${member.first_name} ${member.last_name}`)}
                            >
                              <span className="mr-1">✕</span>
                              {t('noInterest')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. NOG IN TE DELEN (in dienst, checklist compleet, geen schip) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🧭 Nog In Te Delen</h2>
              <Badge className="bg-blue-100 text-blue-800">{nogInTeDelen.length}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">Aangenomen personeel zonder schip (met complete of incomplete checklist)</p>
            {nogInTeDelen.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  Geen personen die nog ingedeeld moeten worden
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nogInTeDelen.map((member: any) => {
                  const checklistComplete = isChecklistComplete(member);
                  
                  return (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow border-blue-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {(member.first_name?.[0] || "?")}{(member.last_name?.[0] || "")}
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
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Functie:</span> {member.position}
                      </div>

                      {/* Checklist Status - klikbaar als incompleet, alleen status als compleet */}
                      {checklistComplete ? (
                        <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs">
                          <div className="font-medium text-blue-800 mb-1">Checklist compleet</div>
                          <div className="flex items-center justify-between"><span>Contract:</span><span className="text-green-600">✅</span></div>
                          <div className="flex items-center justify-between"><span>Luxembourg:</span><span className="text-green-600">✅</span></div>
                          <div className="flex items-center justify-between"><span>Verzekerd:</span><span className="text-green-600">✅</span></div>
                        </div>
                      ) : (
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
                      )}

                      {/* In dienst vanaf */}
                      {member.in_dienst_vanaf && (
                        <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                          <span className="font-medium text-blue-800">📅 In dienst:</span> 
                          <span className="ml-1 text-blue-900">{formatDate(member.in_dienst_vanaf)}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-3 border-t">
                        <Button 
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 w-full text-xs"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowAssignmentDialog(true);
                          }}
                        >
                          <span className="mr-1">🚢</span>
                          Toewijzen aan Schip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )})}
              </div>
            )}
          </div>

          {/* 4. NOG AF TE RONDEN */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📋 Nog Af Te Ronden</h2>
              <Badge className="bg-orange-100 text-orange-800">{nogAfTeRonden.length}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">Aangenomen personeel met incomplete checklist die al aan een schip zijn toegewezen</p>
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
                        {(member.first_name?.[0] || "?")}{(member.last_name?.[0] || "")}
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

                {/* Contract opstellen knop (alleen als contract nog niet is afgevinkt) */}
                {!member.arbeidsovereenkomst && (
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleOpenContractDialog(member)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Contract opstellen
                    </Button>
                  </div>
                )}

                {/* Checklist kan direct in de kaart worden afgerond door op de items te klikken */}
              </CardContent>
            </Card>
                ))}
              </div>
            )}
          </div>

          {/* 5. LATER TERUGKOMEN */}
          {laterTerugkomen.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">⏰ Later Terugkomen</h2>
                <Badge className="bg-gray-100 text-gray-800">{laterTerugkomen.length}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4">Kandidaten waar we later op terug kunnen komen</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {laterTerugkomen.map((member: any) => (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gray-100 text-gray-700">
                              {(member.first_name?.[0] || "?")}{(member.last_name?.[0] || "")}
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
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Functie:</span> {member.position}
                      </div>
                      {member.phone && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Telefoon:</span> {member.phone}
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 min-w-[140px]"
                            onClick={() => handleEdit(member)}
                          >
                            <span className="mr-1">✏️</span>
                            Bewerken
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 flex-1 min-w-[140px]"
                            onClick={async () => {
                              try {
                                await updateCrew(member.id, {
                                  sub_status: "nog-te-benaderen"
                                });
                              } catch (error) {
                                console.error('Error updating status:', error);
                              }
                            }}
                          >
                            <span className="mr-1">↩️</span>
                            Terug naar benaderen
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

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
                    <SelectItem value="2e kapitein">2e kapitein</SelectItem>
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
                    <SelectItem value="RO">🇷🇴 Roemenië</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactVia">Contact via</Label>
                <Input
                  id="contactVia"
                  value={candidateForm.contactVia}
                  onChange={(e) => setCandidateForm({...candidateForm, contactVia: e.target.value})}
                  placeholder="Bijv: Email, Telefoon, Website, Referral..."
                />
              </div>
              <div>
                <Label htmlFor="geplaatstDoor">Geplaatst door</Label>
                <Select value={candidateForm.geplaatstDoor} onValueChange={(value) => setCandidateForm({...candidateForm, geplaatstDoor: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Willem">Willem</SelectItem>
                    <SelectItem value="Leo">Leo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="residence">Woonplaats</Label>
                <Input
                  id="residence"
                  value={candidateForm.residence}
                  onChange={(e) => setCandidateForm({...candidateForm, residence: e.target.value})}
                  placeholder="Woonplaats"
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Geboortedatum</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={candidateForm.birthDate}
                  onChange={(e) => setCandidateForm({...candidateForm, birthDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startMogelijkheid">Start mogelijkheid</Label>
                <Input
                  id="startMogelijkheid"
                  type="date"
                  value={candidateForm.startMogelijkheid}
                  onChange={(e) => setCandidateForm({...candidateForm, startMogelijkheid: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="datumGeplaatst">Datum geplaatst</Label>
                <Input
                  id="datumGeplaatst"
                  type="date"
                  value={candidateForm.datumGeplaatst}
                  onChange={(e) => setCandidateForm({...candidateForm, datumGeplaatst: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isStudent"
                  checked={candidateForm.isStudent}
                  onCheckedChange={(checked) => setCandidateForm({...candidateForm, isStudent: checked === true})}
                />
                <Label htmlFor="isStudent" className="cursor-pointer">Eventueel leerling</Label>
              </div>
              {candidateForm.isStudent && (
                <div>
                  <Label htmlFor="educationType">Type leerling</Label>
                  <Select value={candidateForm.educationType} onValueChange={(value) => setCandidateForm({...candidateForm, educationType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BBL">BBL</SelectItem>
                      <SelectItem value="BOL">BOL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smoking"
                  checked={candidateForm.smoking}
                  onCheckedChange={(checked) => setCandidateForm({...candidateForm, smoking: checked === true})}
                />
                <Label htmlFor="smoking" className="cursor-pointer">Roken?</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="drivingLicense"
                  checked={candidateForm.drivingLicense}
                  onCheckedChange={(checked) => setCandidateForm({...candidateForm, drivingLicense: checked === true})}
                />
                <Label htmlFor="drivingLicense" className="cursor-pointer">Rijbewijs?</Label>
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


      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kandidaat Bewerken - {editingMember?.first_name} {editingMember?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">Voornaam *</Label>
                <Input
                  id="editFirstName"
                  value={candidateForm.firstName}
                  onChange={(e) => setCandidateForm({...candidateForm, firstName: e.target.value})}
                  placeholder="Voornaam"
                  required
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Achternaam *</Label>
                <Input
                  id="editLastName"
                  value={candidateForm.lastName}
                  onChange={(e) => setCandidateForm({...candidateForm, lastName: e.target.value})}
                  placeholder="Achternaam"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editPhone">Telefoonnummer</Label>
                <Input
                  id="editPhone"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                  placeholder="+31 6 12345678"
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                  placeholder="email@voorbeeld.nl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editPosition">Functie</Label>
                <Select value={candidateForm.position} onValueChange={(value) => setCandidateForm({...candidateForm, position: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer functie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kapitein">Kapitein</SelectItem>
                    <SelectItem value="2e kapitein">2e kapitein</SelectItem>
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
                <Label htmlFor="editNationality">Nationaliteit</Label>
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
                    <SelectItem value="RO">🇷🇴 Roemenië</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editContactVia">Contact via</Label>
                <Input
                  id="editContactVia"
                  value={candidateForm.contactVia}
                  onChange={(e) => setCandidateForm({...candidateForm, contactVia: e.target.value})}
                  placeholder="Bijv: Email, Telefoon, Website, Referral..."
                />
              </div>
              <div>
                <Label htmlFor="editGeplaatstDoor">Geplaatst door</Label>
                <Select value={candidateForm.geplaatstDoor} onValueChange={(value) => setCandidateForm({...candidateForm, geplaatstDoor: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Willem">Willem</SelectItem>
                    <SelectItem value="Leo">Leo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editResidence">Woonplaats</Label>
                <Input
                  id="editResidence"
                  value={candidateForm.residence}
                  onChange={(e) => setCandidateForm({...candidateForm, residence: e.target.value})}
                  placeholder="Woonplaats"
                />
              </div>
              <div>
                <Label htmlFor="editBirthDate">Geboortedatum</Label>
                <Input
                  id="editBirthDate"
                  type="date"
                  value={candidateForm.birthDate}
                  onChange={(e) => setCandidateForm({...candidateForm, birthDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartMogelijkheid">Start mogelijkheid</Label>
                <Input
                  id="editStartMogelijkheid"
                  type="date"
                  value={candidateForm.startMogelijkheid}
                  onChange={(e) => setCandidateForm({...candidateForm, startMogelijkheid: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editDatumGeplaatst">Datum geplaatst</Label>
                <Input
                  id="editDatumGeplaatst"
                  type="date"
                  value={candidateForm.datumGeplaatst}
                  onChange={(e) => setCandidateForm({...candidateForm, datumGeplaatst: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIsStudent"
                  checked={candidateForm.isStudent}
                  onCheckedChange={(checked) => setCandidateForm({...candidateForm, isStudent: checked === true})}
                />
                <Label htmlFor="editIsStudent" className="cursor-pointer">Eventueel leerling</Label>
              </div>
              {candidateForm.isStudent && (
                <div>
                  <Label htmlFor="editEducationType">Type leerling</Label>
                  <Select value={candidateForm.educationType} onValueChange={(value) => setCandidateForm({...candidateForm, educationType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BBL">BBL</SelectItem>
                      <SelectItem value="BOL">BOL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editSmoking"
                  checked={candidateForm.smoking}
                  onCheckedChange={(checked) => setCandidateForm({...candidateForm, smoking: checked === true})}
                />
                <Label htmlFor="editSmoking" className="cursor-pointer">Roken?</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editDrivingLicense"
                  checked={candidateForm.drivingLicense}
                  onCheckedChange={(checked) => setCandidateForm({...candidateForm, drivingLicense: checked === true})}
                />
                <Label htmlFor="editDrivingLicense" className="cursor-pointer">Rijbewijs?</Label>
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
                      id={`edit-${diploma}`}
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
                      htmlFor={`edit-${diploma}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {diploma}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="editNotes">Notities</Label>
              <Input
                id="editNotes"
                value={candidateForm.notes}
                onChange={(e) => setCandidateForm({...candidateForm, notes: e.target.value})}
                placeholder="Bijv: Benaderd via email, heeft interesse in stuurman positie..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={!candidateForm.firstName || !candidateForm.lastName}
              >
                Opslaan
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

      {/* Contract Dialog */}
      {contractData && (
        <ContractDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          crewData={contractData}
          onComplete={handleContractDialogComplete}
        />
      )}
    </div>
  );
} 


