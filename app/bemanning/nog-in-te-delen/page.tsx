"use client";
import { useState, useEffect } from "react";
import { useSupabaseData } from "@/hooks/use-supabase-data";
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
import { format } from "date-fns";
import { BackButton } from "@/components/ui/back-button";

export default function NogInTeDelenPage() {
  const { crew, ships, loading, error, updateCrew } = useSupabaseData();
  const [mounted, setMounted] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedShip, setSelectedShip] = useState<string>("");
  const [onBoardDate, setOnBoardDate] = useState<string>("");
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Laden...</div>
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

      alert(`${selectedMember.first_name} ${selectedMember.last_name} is succesvol toegewezen aan het schip!`);
      
      setShowAssignmentDialog(false);
      setSelectedMember(null);
      setSelectedShip("");
      setOnBoardDate("");
    } catch (error) {
      console.error("Fout bij toewijzen aan schip:", error);
      alert("Er is een fout opgetreden bij het toewijzen aan schip. Probeer het opnieuw.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <BackButton />

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nog In Te Delen</h1>
          <p className="text-gray-600">Bemanningsleden die nog geen schip hebben toegewezen</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bemanning/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <span className="mr-2">➕</span>
              Nieuw Bemanningslid
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Nog in te delen</p>
                <p className="text-2xl font-bold text-orange-600">{unassignedCrew.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Toegewezen</p>
                <p className="text-2xl font-bold text-green-600">
                  {crew.filter((c: any) => c.ship_id && c.status !== "nog-in-te-delen").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Totaal bemanning</p>
                <p className="text-2xl font-bold text-blue-600">{crew.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Crew List */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unassignedCrew.map((member: any) => (
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
                        <span>•</span>
                        <span>{member.nationality}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    Nog in te delen
                  </Badge>
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
                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <Link href={`/bemanning/${member.id}`}>
                    <Button variant="outline" size="sm">
                      <span className="mr-1">👁️</span>
                      Bekijk
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setSelectedMember(member);
                      setShowAssignmentDialog(true);
                    }}
                  >
                    <span className="mr-1">🚢</span>
                    Toewijzen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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