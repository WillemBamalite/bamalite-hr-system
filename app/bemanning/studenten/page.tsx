"use client";
import { useState, useEffect } from "react";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, UserX, CheckCircle, AlertCircle, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function StudentenManagementPage() {
  const { crew, ships, loading, error } = useSupabaseData();
  const [mounted, setMounted] = useState(false);

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

  // Filter studenten from crew
  const studenten = crew.filter((member: any) => member.is_student);

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
        <h1 className="text-3xl font-bold text-gray-900">Studenten Overzicht</h1>
        <p className="text-gray-600">Beheer alle studenten in het systeem</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Studenten</p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen studenten gevonden</h3>
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
                        <span>Start: {new Date(student.education_start_date).toLocaleDateString('nl-NL')}</span>
                      </div>
                    )}
                    {student.education_end_date && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Eind: {new Date(student.education_end_date).toLocaleDateString('nl-NL')}</span>
                      </div>
                    )}
                  </>
                )}

                {/* School Periods for BBL */}
                {student.education_type === "BBL" && student.school_periods && student.school_periods.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Schoolperiodes:</span>
                    <div className="space-y-1">
                      {student.school_periods.slice(0, 2).map((period: any, index: number) => (
                        <div key={index} className="text-xs text-gray-600">
                          {new Date(period.fromDate).toLocaleDateString('nl-NL')} - {new Date(period.toDate).toLocaleDateString('nl-NL')}
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
                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <Link 
                    href={`/bemanning/${student.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Bekijk profiel →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 