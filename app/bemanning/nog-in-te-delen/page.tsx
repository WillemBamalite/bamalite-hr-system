"use client";
import { useState, useEffect } from "react";
import { getCombinedShipDatabase } from "@/utils/ship-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocalStorageData } from "@/hooks/use-localStorage-data";
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NogInTeDelenPage() {
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedShip, setSelectedShip] = useState<string>("");
  const [onBoardDate, setOnBoardDate] = useState<string>("");
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  
  // Gebruik de hook voor gecombineerde crew data
  const { crewDatabase: allCrewData, forceRefresh } = useLocalStorageData()
  
  // Veilige check voor allCrewData
  if (!allCrewData) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <MobileHeaderNav />
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Laden van bemanningsdata...</div>
        </div>
      </div>
    );
  }
  
  // Directe cleanup van bemanningsleden met "Onbekend" namen
  useEffect(() => {
    const cleanupUnknownCrew = () => {
      try {
        const crewData = localStorage.getItem('crewDatabase');
        if (!crewData) {
          return;
        }
        
        const crew = JSON.parse(crewData);
        if (!crew || typeof crew !== 'object') {
          return;
        }
        
        let hasChanges = false;
        
        Object.keys(crew).forEach((memberId) => {
          const member = crew[memberId];
          if (!member || typeof member !== 'object') {
            return;
          }
          
          // Verwijder ALLE bemanningsleden met "Onbekend" in de naam
          if (member.firstName === "Onbekend" || member.lastName === "Onbekend" || 
              !member.firstName || !member.lastName || 
              member.firstName === "" || member.lastName === "") {
            delete crew[memberId];
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          localStorage.setItem('crewDatabase', JSON.stringify(crew));
          window.dispatchEvent(new Event('localStorageUpdate'));
          forceRefresh();
        }
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
    };
    
    // Voer cleanup direct uit
    cleanupUnknownCrew();
    
    // En ook elke 5 seconden (minder frequent)
    const interval = setInterval(cleanupUnknownCrew, 5000);
    
    return () => clearInterval(interval);
  }, [forceRefresh]);
  
  // Debug: Check out-of-service storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const outOfServiceData = localStorage.getItem('bamalite-out-of-service-crew');
    
      } catch (error) {
        console.error('Error reading out-of-service data:', error);
      }
    }
  }, []);
  
  // Filter bemanningsleden zonder schip (exclude aflossers en uit dienst)
  const crew = Object.values(allCrewData || {}).filter((c: any) => {

    
    // Check if crew member is in out-of-service storage
    let isOutOfService = false;
    if (typeof window !== 'undefined') {
      try {
        const outOfServiceData = localStorage.getItem('bamalite-out-of-service-crew');
        const outOfServiceList = outOfServiceData ? JSON.parse(outOfServiceData) : [];
        isOutOfService = outOfServiceList.some((record: any) => record.crewMemberId === c.id);
      } catch (error) {
        console.error('Error checking out-of-service status:', error);
      }
    }
    
    return c && (c.shipId === "nog-in-te-delen" || !c.shipId || c.shipId === null) &&
    c.status !== "uit-dienst" &&
    c.status !== "ziek" &&
    c.isAflosser !== true &&
    c.position !== "Aflosser" &&
    c.function !== "Aflosser" &&
    !isOutOfService
  });

  // Haal operationele schepen op
  const operationalShips = Object.values(getCombinedShipDatabase()).filter((ship: any) => ship.status === "Operationeel");

  // Functie om bemanningslid in te delen aan schip
  const assignToShip = () => {
    if (!selectedMember || !selectedShip || !onBoardDate) return;

    try {
      // Update crew database in localStorage
      const crewData = localStorage.getItem('crewDatabase');
      const crew = crewData ? JSON.parse(crewData) : {};
      
      // Haal het volledige profiel op uit de database
      const fullProfile = crew[selectedMember.id] || selectedMember;
      
      // Bepaal de juiste status op basis van de startdatum
      const today = new Date();
      const startDate = new Date(onBoardDate);
      const initialStatus = today >= startDate ? "aan-boord" : "thuis";
      
      // Behoud het volledige profiel en voeg alleen de nieuwe velden toe
      const updatedMember = {
        ...fullProfile, // Behoud ALLE bestaande profiel data
        shipId: selectedShip,
        status: initialStatus,
        onBoardSince: onBoardDate,
        // Voeg toe aan assignment history
        assignmentHistory: [
          ...(fullProfile.assignmentHistory || []),
          {
            date: new Date().toISOString().split("T")[0],
            shipId: selectedShip,
            action: "toegewezen",
            note: `Toegewezen aan ${getCombinedShipDatabase()[selectedShip]?.name || "Onbekend schip"} met status: ${initialStatus}`,
          }
        ]
      };
      
      // Update het bemanningslid
      crew[selectedMember.id] = updatedMember;

      // Sla op in localStorage
      localStorage.setItem('crewDatabase', JSON.stringify(crew));
      
      // Trigger events voor UI update
      window.dispatchEvent(new Event('localStorageUpdate'));
      forceRefresh();
      
      // Reset dialog
      setShowAssignmentDialog(false);
      setSelectedMember(null);
      setSelectedShip("");
      setOnBoardDate("");
      
      // Toon success message
      const shipName = getCombinedShipDatabase()[selectedShip]?.name || "Onbekend schip";
      const statusText = initialStatus === "aan-boord" ? "aan boord" : `thuis tot ${new Date(onBoardDate).toLocaleDateString("nl-NL")}`;
      alert(`${fullProfile.firstName} ${fullProfile.lastName} is succesvol toegewezen aan ${shipName}. Status: ${statusText}.`);
      
      // Forceer een volledige refresh van de pagina om ervoor te zorgen dat alles wordt bijgewerkt
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error assigning crew member to ship:', error);
      alert('Er is een fout opgetreden bij het toewijzen van het bemanningslid aan het schip.');
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
    }
    return flags[nationality] || "🌍"
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-800">Bemanning nog in te delen</h1>
          <p className="text-sm text-gray-600">Bemanningsleden die nog toegewezen moeten worden aan een schip</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-purple-600">
            {crew.length} leden
          </Badge>
        </div>
      </div>

      {crew.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Er zijn momenteel geen bemanningsleden die nog ingedeeld moeten worden.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crew.map((member: any) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {member.firstName?.[0] || '?'}{member.lastName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/bemanning/${member.id}`} className="font-medium text-gray-900 hover:text-purple-700">
                          {member.firstName || 'Onbekend'} {member.lastName || 'Onbekend'}
                        </Link>
                        <span className="text-lg">{getNationalityFlag(member.nationality)}</span>
                      </div>
                      <p className="text-sm text-gray-500">{member.position}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-700">
                  <div><strong>Regime:</strong> {member.regime || "Niet gespecificeerd"}</div>
                  <div><strong>Telefoon:</strong> {member.phone || "Niet bekend"}</div>
                  <div><strong>Email:</strong> {member.email || "Niet bekend"}</div>
                  <div><strong>In dienst per:</strong> {member.entryDate ? new Date(member.entryDate).toLocaleDateString("nl-NL") : "Niet bekend"}</div>
                  <div><strong>Diploma's:</strong> {member.qualifications?.join(", ") || "Geen diploma's"}</div>
                  <div><strong>Roken:</strong> {member.smoking ? "Ja" : "Nee"}</div>
                  
                  {/* Verschuldigde dagen sectie */}
                  {member.standBackDaysRemaining && member.standBackDaysRemaining > 0 && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                      <div className="text-sm font-medium text-orange-800">
                        Verschuldigde dagen: {member.standBackDaysRemaining} van {member.standBackDaysRequired || 7}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedMember(member);
                      setSelectedShip("");
                      setOnBoardDate("");
                      setShowAssignmentDialog(true);
                    }}
                  >
                    Indelen aan schip
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Toewijzen Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Toewijzen: {selectedMember?.firstName} {selectedMember?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Selecteer schip
              </Label>
              <Select value={selectedShip} onValueChange={setSelectedShip}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een schip..." />
                </SelectTrigger>
                <SelectContent>
                  {operationalShips.map((ship: any) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Aanvangsdatum op schip
              </Label>
              <Input
                type="date"
                value={onBoardDate}
                onChange={(e) => setOnBoardDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Vanaf deze datum gaat het regime automatisch lopen
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={assignToShip}
                disabled={!selectedShip || !onBoardDate}
                className="flex-1"
              >
                Toewijzen
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAssignmentDialog(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 