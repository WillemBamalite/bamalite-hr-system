"use client";

import { useState, useEffect } from "react";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { calculateCurrentStatus } from "@/utils/regime-calculator";
import { 
  Ship, 
  Users, 
  GraduationCap, 
  FileText, 
  AlertTriangle,
  Printer,
  Calendar,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

export default function PrintPage() {
  const { crew, ships, sickLeave, loans } = useSupabaseData();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return <div className="p-4">{t('loading')}...</div>;
  }

  // Filter data
  const activeCrew = crew.filter((c) => c.status !== 'uit-dienst');
  const newPersonnel = activeCrew.filter((c) => c.status === "nog-in-te-delen");
  const sickMembers = sickLeave.filter((s: any) => {
    const crewMember = crew.find((c) => c.id === s.crew_member_id);
    return (s.status === "actief" || s.status === "wacht-op-briefje") && crewMember && crewMember.status !== 'uit-dienst';
  });
  const students = crew.filter((c) => c.is_student && c.status !== 'uit-dienst');
  const outstandingLoans = (loans || []).filter((l: any) => l.status === 'open');

  // Helper function to sort crew by rank (same as ship overview)
  const sortCrewByRank = (crew: any[]) => {
    const rankOrder = {
      'Kapitein': 1,
      'kapitein': 1,
      'Stuurman': 2,
      'stuurman': 2,
      'Matroos': 3,
      'matroos': 3,
      'Deksman': 4,
      'deksman': 4,
      'Aflosser': 5,
      'aflosser': 5
    };
    
    return crew.sort((a, b) => {
      const rankA = rankOrder[a.position as keyof typeof rankOrder] || 999;
      const rankB = rankOrder[b.position as keyof typeof rankOrder] || 999;
      return rankA - rankB;
    });
  };

  // Helper function for nationality flags
  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱', 'DE': '🇩🇪', 'PL': '🇵🇱', 'RO': '🇷🇴', 'BG': '🇧🇬',
      'CZ': '🇨🇿', 'SLK': '🇸🇰', 'EG': '🇪🇬', 'SERV': '🇷🇸',
      'HUN': '🇭🇺', 'FR': '🇫🇷', 'LUX': '🇱🇺', 'PO': '🇵🇱'
    }
    return flags[nationality] || '🏳️'
  }

  // Group ships by company
  const shipsByCompany = ships.reduce((acc: any, ship: any) => {
    const company = ship.company || 'Geen Bedrijf';
    if (!acc[company]) {
      acc[company] = [];
    }
    acc[company].push(ship);
    return acc;
  }, {});

  const printPage = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Overzicht</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
            .page-break { page-break-before: always; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
            .ship-section { margin-bottom: 25px; }
            .ship-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #2563eb; }
            .status-columns { display: flex; gap: 15px; margin-bottom: 15px; }
            .status-column { flex: 1; }
            .status-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #374151; }
            .crew-card { border: 1px solid #ddd; padding: 8px; border-radius: 4px; margin-bottom: 8px; }
            .crew-name { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
            .crew-details { font-size: 11px; color: #666; }
            .crew-details div { margin-bottom: 2px; }
            .status-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .status-aan-boord { background-color: #dcfce7; color: #166534; }
            .status-thuis { background-color: #dbeafe; color: #1e40af; }
            .status-ziek { background-color: #fef2f2; color: #dc2626; }
            .status-nog-in-te-delen { background-color: #fef3c7; color: #d97706; }
            .aan-boord-title { color: #166534; }
            .thuis-title { color: #1e40af; }
            .ziek-title { color: #dc2626; }
            .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 15px 0; color: #374151; }
            .list-item { margin-bottom: 10px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; }
            .list-item-header { font-weight: bold; margin-bottom: 3px; }
            .list-item-details { font-size: 11px; color: #666; }
            .no-data { text-align: center; color: #9ca3af; font-style: italic; margin: 15px 0; font-size: 11px; }
            .print-date { text-align: right; font-size: 10px; color: #666; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const printShipOverview = () => {
    let content = `
      <div class="header">
        <h1>Schepen Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    Object.entries(shipsByCompany).forEach(([company, companyShips]: [string, any]) => {
      content += `
        <div class="page-break">
          <div class="company-title">${company}</div>
      `;

      companyShips.forEach((ship: any) => {
        const shipCrew = activeCrew.filter((member: any) => member.ship_id === ship.id);
        
        // Use exact same filtering logic as ship overview
        const aanBoordCrew = shipCrew.filter((member: any) => {
          if (member.status === "ziek") return false
          // Als expected_start_date bestaat, gebruik database status (wacht op startdatum)
          if (member.expected_start_date) return member.status === "aan-boord"
          if (!member.regime) return member.status === "aan-boord"
          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null)
          return statusCalculation.currentStatus === "aan-boord"
        });

        const thuisCrew = shipCrew.filter((member: any) => {
          if (member.status === "ziek") return false
          // Als expected_start_date bestaat, gebruik database status (wacht op startdatum)
          if (member.expected_start_date) return member.status === "thuis"
          if (!member.regime) return member.status === "thuis"
          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null)
          return statusCalculation.currentStatus === "thuis"
        });

        const ziekCrew = shipCrew.filter((member: any) => member.status === "ziek");
        
        content += `
          <div class="ship-section">
            <div class="ship-title">${ship.name}</div>
            <div class="status-columns">
        `;

        // Aan boord column
        content += `
          <div class="status-column">
            <div class="status-title aan-boord-title">Aan Boord (${aanBoordCrew.length})</div>
        `;
        if (aanBoordCrew.length === 0) {
          content += `<div class="no-data">Geen bemanning</div>`;
        } else {
          sortCrewByRank(aanBoordCrew).forEach((member: any) => {
            // Calculate rotation info (same logic as ship overview)
            const getRotationInfo = () => {
              if (member.expected_start_date) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const startDate = new Date(member.expected_start_date)
                startDate.setHours(0, 0, 0, 0)
                const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return { text: `Aan boord: ${format(startDate, 'dd-MM-yyyy')}`, isWaitingForStart: true }
              }
              
              if (!member.regime || member.regime === "Altijd") return null
              
              const statusCalculation = calculateCurrentStatus(
                member.regime as "1/1" | "2/2" | "3/3" | "Altijd", 
                member.thuis_sinds || null, 
                member.on_board_since || null, 
                member.status === "ziek"
              )
              
              if (statusCalculation.daysUntilRotation !== null) {
                const nextRotationDate = statusCalculation.nextRotationDate;
                return { 
                  text: `Naar huis: ${nextRotationDate ? format(new Date(nextRotationDate), 'dd-MM-yyyy') : ''}`, 
                  isWaitingForStart: false 
                }
              }
              
              return null
            }

            const rotationInfo = getRotationInfo()

            content += `
              <div class="crew-card">
                <div class="crew-name">${member.first_name} ${member.last_name} ${getNationalityFlag(member.nationality)}</div>
                <div class="crew-details">
                  <div><strong>Functie:</strong> ${member.position}</div>
                  ${member.diplomas && member.diplomas.length > 0 ? `<div><strong>Diploma's:</strong> ${member.diplomas.join(', ')}</div>` : ''}
                  ${member.position !== "Aflosser" ? `<div><strong>Regime:</strong> ${member.regime || 'Geen'}</div>` : ''}
                  ${rotationInfo && member.position !== "Aflosser" ? `
                    <div><strong>${rotationInfo.text}</strong></div>
                  ` : ''}
                  ${member.active_notes && member.active_notes.length > 0 ? `
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                      <div style="font-size: 10px; color: #ea580c; font-weight: 500;">Notities:</div>
                      ${member.active_notes.map((note: any) => `
                        <div style="font-size: 10px; color: #6b7280; background: #fef3c7; padding: 2px 4px; margin: 1px 0; border-left: 2px solid #f59e0b;">
                          ${note.content}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          });
        }
        content += `</div>`;

        // Thuis column
        content += `
          <div class="status-column">
            <div class="status-title thuis-title">Thuis (${thuisCrew.length})</div>
        `;
        if (thuisCrew.length === 0) {
          content += `<div class="no-data">Geen bemanning</div>`;
        } else {
          sortCrewByRank(thuisCrew).forEach((member: any) => {
            // Calculate rotation info (same logic as ship overview)
            const getRotationInfo = () => {
              if (member.expected_start_date) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const startDate = new Date(member.expected_start_date)
                startDate.setHours(0, 0, 0, 0)
                const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return { text: `Aan boord: ${format(startDate, 'dd-MM-yyyy')}`, isWaitingForStart: true }
              }
              
              if (!member.regime || member.regime === "Altijd") return null
              
              const statusCalculation = calculateCurrentStatus(
                member.regime as "1/1" | "2/2" | "3/3" | "Altijd", 
                member.thuis_sinds || null, 
                member.on_board_since || null, 
                member.status === "ziek"
              )
              
              if (statusCalculation.daysUntilRotation !== null) {
                const nextRotationDate = statusCalculation.nextRotationDate;
                return { 
                  text: `Naar huis: ${nextRotationDate ? format(new Date(nextRotationDate), 'dd-MM-yyyy') : ''}`, 
                  isWaitingForStart: false 
                }
              }
              
              return null
            }

            const rotationInfo = getRotationInfo()

            content += `
              <div class="crew-card">
                <div class="crew-name">${member.first_name} ${member.last_name} ${getNationalityFlag(member.nationality)}</div>
                <div class="crew-details">
                  <div><strong>Functie:</strong> ${member.position}</div>
                  ${member.diplomas && member.diplomas.length > 0 ? `<div><strong>Diploma's:</strong> ${member.diplomas.join(', ')}</div>` : ''}
                  ${member.position !== "Aflosser" ? `<div><strong>Regime:</strong> ${member.regime || 'Geen'}</div>` : ''}
                  ${rotationInfo && member.position !== "Aflosser" ? `
                    <div><strong>${rotationInfo.text}</strong></div>
                  ` : ''}
                  ${member.active_notes && member.active_notes.length > 0 ? `
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                      <div style="font-size: 10px; color: #ea580c; font-weight: 500;">Notities:</div>
                      ${member.active_notes.map((note: any) => `
                        <div style="font-size: 10px; color: #6b7280; background: #fef3c7; padding: 2px 4px; margin: 1px 0; border-left: 2px solid #f59e0b;">
                          ${note.content}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          });
        }
        content += `</div>`;

        // Ziek column
        content += `
          <div class="status-column">
            <div class="status-title ziek-title">Ziek (${ziekCrew.length})</div>
        `;
        if (ziekCrew.length === 0) {
          content += `<div class="no-data">Geen bemanning</div>`;
        } else {
          sortCrewByRank(ziekCrew).forEach((member: any) => {
            // Get sick info for sick crew members
            const getSickInfo = () => {
              if (member.status !== "ziek") return null
              
              const sickLeaveRecord = sickLeave.find((sick: any) => 
                sick.crew_member_id === member.id && 
                (sick.status === "actief" || sick.status === "wacht-op-briefje")
              )
              
              return sickLeaveRecord
            }

            const sickInfo = getSickInfo()

            content += `
              <div class="crew-card">
                <div class="crew-name">${member.first_name} ${member.last_name} ${getNationalityFlag(member.nationality)}</div>
                <div class="crew-details">
                  <div><strong>Functie:</strong> ${member.position}</div>
                  ${sickInfo ? `
                    <div><strong>Ziekinformatie:</strong></div>
                    <div>Ziek vanaf: ${format(new Date(sickInfo.start_date), 'dd-MM-yyyy')}</div>
                    ${sickInfo.certificate_valid_until ? `<div>Briefje tot: ${format(new Date(sickInfo.certificate_valid_until), 'dd-MM-yyyy')}</div>` : '<div>Geen briefje</div>'}
                    ${sickInfo.notes ? `<div>Reden: ${sickInfo.notes}</div>` : ''}
                  ` : ''}
                  ${member.active_notes && member.active_notes.length > 0 ? `
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                      <div style="font-size: 10px; color: #ea580c; font-weight: 500;">Notities:</div>
                      ${member.active_notes.map((note: any) => `
                        <div style="font-size: 10px; color: #6b7280; background: #fef3c7; padding: 2px 4px; margin: 1px 0; border-left: 2px solid #f59e0b;">
                          ${note.content}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          });
        }
        content += `</div>`;

        content += `
            </div>
          </div>
        `;
      });

      content += `</div>`;
    });

    printPage(content);
  };

  const printNewPersonnel = () => {
    let content = `
      <div class="header">
        <h1>Nieuw Personeel Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    if (newPersonnel.length === 0) {
      content += `<div class="no-data">Geen nieuw personeel</div>`;
    } else {
      newPersonnel.forEach((member: any) => {
        content += `
          <div class="list-item">
            <div class="list-item-header">${member.first_name} ${member.last_name}</div>
            <div class="list-item-details">
              <div><strong>Functie:</strong> ${member.position}</div>
              <div><strong>Telefoon:</strong> ${member.phone || 'Niet ingevuld'}</div>
              <div><strong>Email:</strong> ${member.email || 'Niet ingevuld'}</div>
              <div><strong>Status:</strong> ${member.status}</div>
            </div>
          </div>
        `;
      });
    }

    printPage(content);
  };

  const printSickLeave = () => {
    let content = `
      <div class="header">
        <h1>Ziekte Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    if (sickMembers.length === 0) {
      content += `<div class="no-data">Geen actieve ziekmeldingen</div>`;
    } else {
      sickMembers.forEach((sickRecord: any) => {
        const crewMember = crew.find((c) => c.id === sickRecord.crew_member_id);
        if (crewMember) {
          content += `
            <div class="list-item">
              <div class="list-item-header">${crewMember.first_name} ${crewMember.last_name}</div>
              <div class="list-item-details">
                <div><strong>Functie:</strong> ${crewMember.position}</div>
                <div><strong>Ziek vanaf:</strong> ${format(new Date(sickRecord.start_date), 'dd-MM-yyyy')}</div>
                <div><strong>Status:</strong> ${sickRecord.status}</div>
                <div><strong>Ziektebriefje:</strong> ${sickRecord.sick_certificate ? 'Ja' : 'Nee'}</div>
              </div>
            </div>
          `;
        }
      });
    }

    printPage(content);
  };

  const printStudents = () => {
    let content = `
      <div class="header">
        <h1>Studenten Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    if (students.length === 0) {
      content += `<div class="no-data">Geen actieve studenten</div>`;
    } else {
      students.forEach((student: any) => {
        content += `
          <div class="list-item">
            <div class="list-item-header">${student.first_name} ${student.last_name}</div>
            <div class="list-item-details">
              <div><strong>Functie:</strong> ${student.position}</div>
              <div><strong>Opleidingstype:</strong> ${student.education_type || 'Niet ingevuld'}</div>
              <div><strong>Start opleiding:</strong> ${student.education_start_date ? format(new Date(student.education_start_date), 'dd-MM-yyyy') : 'Niet ingevuld'}</div>
              <div><strong>Eind opleiding:</strong> ${student.education_end_date ? format(new Date(student.education_end_date), 'dd-MM-yyyy') : 'Niet ingevuld'}</div>
              <div><strong>Telefoon:</strong> ${student.phone || 'Niet ingevuld'}</div>
            </div>
          </div>
        `;
      });
    }

    printPage(content);
  };

  const printLoans = () => {
    let content = `
      <div class="header">
        <h1>Openstaande Leningen Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    if (outstandingLoans.length === 0) {
      content += `<div class="no-data">Geen openstaande leningen</div>`;
    } else {
      outstandingLoans.forEach((loan: any) => {
        const crewMember = crew.find((c) => c.id === loan.crew_member_id);
        if (crewMember) {
          content += `
            <div class="list-item">
              <div class="list-item-header">${crewMember.first_name} ${crewMember.last_name}</div>
              <div class="list-item-details">
                <div><strong>Bedrag:</strong> €${loan.amount.toFixed(2)}</div>
                <div><strong>Periode:</strong> ${format(new Date(loan.start_date), 'dd-MM-yyyy')} - ${format(new Date(loan.end_date), 'dd-MM-yyyy')}</div>
                <div><strong>Openstaand bedrag:</strong> €${loan.outstanding_amount.toFixed(2)}</div>
                <div><strong>Status:</strong> ${loan.status}</div>
              </div>
            </div>
          `;
        }
      });
    }

    printPage(content);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Print Overzicht</h1>
          <p className="text-gray-600 mt-2">Selecteer wat je wilt printen</p>
            </div>
            
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Ship Overview */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ship className="w-5 h-5 text-blue-600" />
                <span>Schepen Overzicht</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Print alle schepen met bemanning, gegroepeerd per bedrijf
              </p>
              <div className="text-xs text-gray-500 mb-4">
                <div>• {ships.length} schepen</div>
                <div>• {Object.keys(shipsByCompany).length} bedrijven</div>
                <div>• {activeCrew.length} actieve bemanningsleden</div>
              </div>
              <Button 
                onClick={printShipOverview}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Schepen
              </Button>
            </CardContent>
          </Card>

          {/* New Personnel */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span>Nieuw Personeel</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Print lijst van nieuw personeel dat nog ingedeeld moet worden
              </p>
              <div className="text-xs text-gray-500 mb-4">
                <div>• {newPersonnel.length} personen</div>
              </div>
              <Button 
                onClick={printNewPersonnel}
                className="w-full bg-gray-600 hover:bg-gray-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Nieuw Personeel
              </Button>
            </CardContent>
          </Card>

          {/* Sick Leave */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Ziekte Overzicht</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Print lijst van actieve ziekmeldingen
              </p>
              <div className="text-xs text-gray-500 mb-4">
                <div>• {sickMembers.length} ziekmeldingen</div>
      </div>
              <Button 
                onClick={printSickLeave}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Ziekte
              </Button>
            </CardContent>
          </Card>

          {/* Students */}
          <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <span>Studenten</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Print lijst van actieve studenten
              </p>
              <div className="text-xs text-gray-500 mb-4">
                <div>• {students.length} studenten</div>
              </div>
              <Button 
                onClick={printStudents}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Studenten
              </Button>
            </CardContent>
          </Card>

          {/* Loans */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-yellow-600" />
                <span>Openstaande Leningen</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Print lijst van openstaande leningen
              </p>
              <div className="text-xs text-gray-500 mb-4">
                <div>• {outstandingLoans.length} leningen</div>
                <div>• Totaal: €{outstandingLoans.reduce((sum: number, loan: any) => sum + loan.outstanding_amount, 0).toFixed(2)}</div>
              </div>
              <Button 
                onClick={printLoans}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Leningen
              </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
} 