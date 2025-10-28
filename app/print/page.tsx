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
      '2e kapitein': 2,
      '2e Kapitein': 2,
      'Stuurman': 3,
      'stuurman': 3,
      'Matroos': 4,
      'matroos': 4,
      'Lichtmatroos': 5,
      'lichtmatroos': 5,
      'Deksman': 6,
      'deksman': 6,
      'Aflosser': 7,
      'aflosser': 7
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
          // Als expected_start_date in de toekomst is, zijn ze nog thuis
          if (member.expected_start_date) {
            const startDate = new Date(member.expected_start_date)
            startDate.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (startDate > today) return false // Nog niet aan boord
            // Anders (vandaag of verleden) gebruik berekende status
          }
          if (!member.regime) return member.status === "aan-boord"
          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, false, member.expected_start_date || null)
          return statusCalculation.currentStatus === "aan-boord"
        });

        const thuisCrew = shipCrew.filter((member: any) => {
          if (member.status === "ziek") return false
          // Als expected_start_date in de toekomst is, zijn ze nog thuis
          if (member.expected_start_date) {
            const startDate = new Date(member.expected_start_date)
            startDate.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (startDate > today) return true // Nog thuis (wachten)
            // Anders (vandaag of verleden) gebruik berekende status
          }
          if (!member.regime) return member.status === "thuis"
          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, false, member.expected_start_date || null)
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
                return { text: `Aan boord op: ${format(startDate, 'dd-MM-yyyy')}`, isWaitingForStart: true }
              }
              
              if (!member.regime || member.regime === "Altijd") return null
              
              const statusCalculation = calculateCurrentStatus(
                member.regime as "1/1" | "2/2" | "3/3" | "Altijd", 
                member.thuis_sinds || null, 
                member.on_board_since || null, 
                member.status === "ziek",
                member.expected_start_date || null
              )
              
              if (statusCalculation.nextRotationDate) {
                const nextRotationDate = statusCalculation.nextRotationDate;
                const dateStr = format(new Date(nextRotationDate), 'dd-MM-yyyy');
                // Toon juiste tekst op basis van huidige status
                if (statusCalculation.currentStatus === "aan-boord") {
                  return { 
                    text: `Naar huis op: ${dateStr}`, 
                    isWaitingForStart: false 
                  }
                } else {
                  return { 
                    text: `Aan boord op: ${dateStr}`, 
                    isWaitingForStart: false 
                  }
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
                return { text: `Aan boord op: ${format(startDate, 'dd-MM-yyyy')}`, isWaitingForStart: true }
              }
              
              if (!member.regime || member.regime === "Altijd") return null
              
              const statusCalculation = calculateCurrentStatus(
                member.regime as "1/1" | "2/2" | "3/3" | "Altijd", 
                member.thuis_sinds || null, 
                member.on_board_since || null, 
                member.status === "ziek",
                member.expected_start_date || null
              )
              
              if (statusCalculation.nextRotationDate) {
                const nextRotationDate = statusCalculation.nextRotationDate;
                const dateStr = format(new Date(nextRotationDate), 'dd-MM-yyyy');
                // Toon juiste tekst op basis van huidige status
                if (statusCalculation.currentStatus === "aan-boord") {
                  return { 
                    text: `Naar huis op: ${dateStr}`, 
                    isWaitingForStart: false 
                  }
                } else {
                  return { 
                    text: `Aan boord op: ${dateStr}`, 
                    isWaitingForStart: false 
                  }
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
    const getNationalityFlagForPrint = (nationality: string) => {
      const flags: { [key: string]: string } = {
        NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱",
        SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺"
      };
      return flags[nationality] || "🌍";
    };

    const formatDateForPrint = (dateString: string) => {
      if (!dateString) return '';
      try {
        return format(new Date(dateString), 'dd-MM-yyyy');
      } catch {
        return dateString;
      }
    };

    // Filter and categorize exactly like nog-in-te-delen/page.tsx
    const unassignedCrew = crew.filter((member: any) => 
      member.status === "nog-in-te-delen" && 
      !member.is_aflosser &&
      member.status !== 'uit-dienst'
    );

    const allCrewWithIncompleteChecklist = crew.filter((member: any) => {
      if (member.is_aflosser || member.status === 'uit-dienst') {
        return false;
      }
      if (member.recruitment_status !== "aangenomen") {
        return false;
      }
      const contractSigned = member.arbeidsovereenkomst === true;
      const luxembourgRegistered = member.ingeschreven_luxembourg === true;
      const insured = member.verzekerd === true;
      const isChecklistComplete = contractSigned && luxembourgRegistered && insured;
      const hasShip = member.ship_id && member.ship_id !== 'none' && member.ship_id !== '';
      if (isChecklistComplete && hasShip) {
        return false;
      }
      return !isChecklistComplete;
    });

    const nogTeBenaderen = unassignedCrew.filter((m: any) => 
      (!m.sub_status || m.sub_status === "nog-te-benaderen") &&
      m.status !== 'uit-dienst' &&
      m.recruitment_status !== "aangenomen"
    );

    const nogAfTeRonden = allCrewWithIncompleteChecklist;

    const nogInTeDelen = crew.filter((member: any) => {
      if (member.is_aflosser || member.status === 'uit-dienst') return false;
      if (member.recruitment_status !== 'aangenomen') return false;
      const hasShip = member.ship_id && member.ship_id !== 'none' && member.ship_id !== '';
      if (hasShip) return false;
      const contractSigned = member.arbeidsovereenkomst === true;
      const luxembourgRegistered = member.ingeschreven_luxembourg === true;
      const insured = member.verzekerd === true;
      const isChecklistComplete = contractSigned && luxembourgRegistered && insured;
      return isChecklistComplete;
    });

    let content = `
      <div class="header">
        <h1>Nieuw Personeel Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    // Statistieken
    content += `
      <div style="margin-bottom: 20px; display: flex; gap: 15px;">
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Nog te benaderen</div>
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${nogTeBenaderen.length}</div>
        </div>
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Nog af te ronden</div>
          <div style="font-size: 24px; font-weight: bold; color: #ea580c;">${nogAfTeRonden.length}</div>
        </div>
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Nog in te delen</div>
          <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${nogInTeDelen.length}</div>
        </div>
      </div>
    `;

    // 1. NOG TE BENADEREN
    content += `
      <div class="page-break">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; margin-top: 20px;">📞 Nog Te Benaderen (${nogTeBenaderen.length})</h2>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Nieuwe aanmeldingen die nog telefonisch benaderd moeten worden</p>
    `;
    if (nogTeBenaderen.length === 0) {
      content += `<div class="no-data">Geen personen om te benaderen</div>`;
    } else {
      nogTeBenaderen.forEach((member: any) => {
        content += `
          <div class="list-item" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #fed7aa; color: #ea580c; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">
                ${member.first_name[0]}${member.last_name[0]}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 2px;">
                  ${member.first_name} ${member.last_name} ${getNationalityFlagForPrint(member.nationality)}
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${member.position || 'Geen functie'}</div>
                <div style="font-size: 11px; color: #666;">
                  ${member.regime ? `<div><strong>Regime:</strong> ${member.regime}</div>` : ''}
                  ${member.phone ? `<div><strong>Telefoon:</strong> ${member.phone}</div>` : ''}
                  ${member.email ? `<div><strong>Email:</strong> ${member.email}</div>` : ''}
                  ${member.experience ? `<div><strong>Ervaring:</strong> ${member.experience}</div>` : ''}
                  ${member.diplomas && member.diplomas.length > 0 ? `<div><strong>Diploma's:</strong> ${member.diplomas.join(', ')}</div>` : ''}
                  ${member.notes && member.notes.length > 0 ? `<div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #e5e7eb;"><strong>Notities:</strong> <span style="font-style: italic;">${typeof member.notes === 'string' ? member.notes : member.notes[0] || ''}</span></div>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }
    content += `</div>`;

    // 2. NOG AF TE RONDEN
    content += `
      <div class="page-break">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; margin-top: 20px;">📋 Nog Af Te Ronden (${nogAfTeRonden.length})</h2>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Aangenomen personeel waarbij de administratieve checklist nog niet volledig is afgerond</p>
    `;
    if (nogAfTeRonden.length === 0) {
      content += `<div class="no-data">Geen personen met incomplete checklist</div>`;
    } else {
      nogAfTeRonden.forEach((member: any) => {
        const assignedShip = member.ship_id ? ships.find((s: any) => s.id === member.ship_id) : null;
        content += `
          <div class="list-item" style="margin-bottom: 15px; border-left: 3px solid #ea580c;">
            <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #fed7aa; color: #ea580c; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">
                ${member.first_name[0]}${member.last_name[0]}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 2px;">
                  ${member.first_name} ${member.last_name} ${getNationalityFlagForPrint(member.nationality)}
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${member.position || 'Geen functie'}</div>
                ${assignedShip ? `
                  <div style="background: #dcfce7; padding: 6px; border-radius: 4px; border: 1px solid #86efac; margin-bottom: 8px; font-size: 11px;">
                    <strong style="color: #166534;">🚢 Schip:</strong> <span style="color: #15803d;">${assignedShip.name}</span>
                  </div>
                ` : ''}
                <div style="background: #fff7ed; padding: 8px; border-radius: 4px; border: 1px solid #fed7aa; margin-bottom: 8px;">
                  <div style="font-size: 11px; font-weight: bold; color: #ea580c; margin-bottom: 5px;">Checklist:</div>
                  <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>Contract:</span>
                    <span style="color: ${member.arbeidsovereenkomst ? '#16a34a' : '#dc2626'};">
                      ${member.arbeidsovereenkomst ? '✅' : '❌'}
                    </span>
                  </div>
                  <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>Luxembourg:</span>
                    <span style="color: ${member.ingeschreven_luxembourg ? '#16a34a' : '#dc2626'};">
                      ${member.ingeschreven_luxembourg ? '✅' : '❌'}
                    </span>
                  </div>
                  <div style="font-size: 11px; display: flex; justify-content: space-between;">
                    <span>Verzekerd:</span>
                    <span style="color: ${member.verzekerd ? '#16a34a' : '#dc2626'};">
                      ${member.verzekerd ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
                ${member.in_dienst_vanaf ? `
                  <div style="background: #dbeafe; padding: 6px; border-radius: 4px; border: 1px solid #93c5fd; font-size: 11px; margin-bottom: 8px;">
                    <strong style="color: #1e40af;">📅 In dienst:</strong> <span style="color: #1e3a8a;">${formatDateForPrint(member.in_dienst_vanaf)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });
    }
    content += `</div>`;

    // 3. NOG IN TE DELEN
    content += `
      <div class="page-break">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; margin-top: 20px;">🧭 Nog In Te Delen (${nogInTeDelen.length})</h2>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Aangenomen personeel met volledige checklist maar nog zonder schip</p>
    `;
    if (nogInTeDelen.length === 0) {
      content += `<div class="no-data">Geen personen die nog ingedeeld moeten worden</div>`;
    } else {
      nogInTeDelen.forEach((member: any) => {
        content += `
          <div class="list-item" style="margin-bottom: 15px; border-left: 3px solid #3b82f6;">
            <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #dbeafe; color: #1e40af; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">
                ${member.first_name[0]}${member.last_name[0]}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 2px;">
                  ${member.first_name} ${member.last_name} ${getNationalityFlagForPrint(member.nationality)}
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${member.position || 'Geen functie'}</div>
                <div style="background: #dbeafe; padding: 8px; border-radius: 4px; border: 1px solid #93c5fd;">
                  <div style="font-size: 11px; font-weight: bold; color: #1e40af; margin-bottom: 5px;">Checklist compleet</div>
                  <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>Contract:</span>
                    <span style="color: #16a34a;">✅</span>
                  </div>
                  <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>Luxembourg:</span>
                    <span style="color: #16a34a;">✅</span>
                  </div>
                  <div style="font-size: 11px; display: flex; justify-content: space-between;">
                    <span>Verzekerd:</span>
                    <span style="color: #16a34a;">✅</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }
    content += `</div>`;

    printPage(content);
  };

  const printSickLeave = () => {
    // Helper functions copied from ziekte/page.tsx
    const getStatusColor = (status: string) => {
      switch (status) {
        case "actief": return "bg-red-100 text-red-800";
        case "hersteld": return "bg-green-100 text-green-800";
        case "wacht-op-briefje": return "bg-orange-100 text-orange-800";
        case "afgerond": return "bg-gray-100 text-gray-800";
        default: return "bg-gray-100 text-gray-800";
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case "actief": return "Actief ziek";
        case "hersteld": return "Hersteld";
        case "wacht-op-briefje": return "Wacht op briefje";
        case "afgerond": return "Afgerond";
        default: return status;
      }
    };

    const getNationalityFlag = (nationality: string) => {
      const flags: { [key: string]: string } = {
        NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱",
        SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺"
      };
      return flags[nationality] || "🌍";
    };

    const getCertificateStatus = (record: any) => {
      if (!record.certificate_valid_until) {
        return {
          color: "bg-red-100 text-red-800",
          text: "Geen ziektebriefje"
        };
      }

      if (record.certificate_valid_until) {
        const validUntil = new Date(record.certificate_valid_until);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          return {
            color: "bg-red-100 text-red-800",
            text: `Briefje verlopen (was geldig t/m ${format(validUntil, "dd-MM-yyyy")})`
          };
        } else if (daysUntilExpiry <= 7) {
          return {
            color: "bg-orange-100 text-orange-800",
            text: `Briefje verloopt over ${daysUntilExpiry} dagen (geldig t/m ${format(validUntil, "dd-MM-yyyy")})`
          };
        } else {
          return {
            color: "bg-green-100 text-green-800",
            text: `Briefje geldig t/m ${format(validUntil, "dd-MM-yyyy")}`
          };
        }
      }

      return {
        color: "bg-green-100 text-green-800",
        text: "Briefje aanwezig"
      };
    };

    let content = `
      <div class="header">
        <h1>Ziekte Overzicht</h1>
        <div class="print-date">Geprint op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
      </div>
    `;

    // Build sickLeaveRecords the same way as ziekte/page.tsx
    const sickLeaveRecords = sickMembers.map((sick: any) => {
      const crewMember = crew.find((c) => c.id === sick.crew_member_id);
      const ship = crewMember?.ship_id ? ships.find((s) => s.id === crewMember.ship_id) : null;

      // Bereken dagen ziek
      const startDate = new Date(sick.start_date);
      const today = new Date();
      const daysCount = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...sick,
        crewMember,
        ship,
        daysCount,
      };
    }).filter((record) => record.crewMember && record.crewMember.status !== 'uit-dienst');

    // Statistieken
    const activeSick = sickLeaveRecords.length;
    const waitingForCertificate = sickLeaveRecords.filter((r: any) => r.status === "wacht-op-briefje").length;

    content += `
      <div style="margin-bottom: 20px; display: flex; gap: 15px;">
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Actief ziek</div>
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${activeSick}</div>
        </div>
        <div style="flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Wacht op briefje</div>
          <div style="font-size: 24px; font-weight: bold; color: #ea580c;">${waitingForCertificate}</div>
        </div>
      </div>
    `;

    if (sickLeaveRecords.length === 0) {
      content += `<div class="no-data">Geen actieve ziekmeldingen</div>`;
    } else {
      // Layout cards in grid like the real page
      sickLeaveRecords.forEach((record: any) => {
        const certificateStatus = getCertificateStatus(record);
        const ship = record.crewMember?.ship_id ? ships.find((s: any) => s.id === record.crewMember.ship_id) : null;
        
        content += `
          <div class="list-item" style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #dbeafe; color: #1e40af; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                  ${record.crewMember.first_name[0]}${record.crewMember.last_name[0]}
                </div>
                <div>
                  <div style="font-weight: bold; font-size: 15px; margin-bottom: 2px;">
                    ${record.crewMember.first_name} ${record.crewMember.last_name} ${getNationalityFlag(record.crewMember.nationality)}
                  </div>
                  <div style="font-size: 12px; color: #666;">${record.crewMember.position}</div>
                </div>
              </div>
              <div style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; ${getStatusColor(record.status)}">
                ${getStatusText(record.status)}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
              <div>
                <span style="color: #666;">Start datum:</span>
                <div style="font-weight: 500; margin-top: 2px;">${format(new Date(record.start_date), "dd-MM-yyyy")}</div>
              </div>
              <div>
                <span style="color: #666;">Dagen ziek:</span>
                <div style="font-weight: 500; margin-top: 2px;">${record.daysCount} dagen</div>
              </div>
              <div>
                <span style="color: #666;">Salaris:</span>
                <div style="font-weight: 500; margin-top: 2px;">${record.salary_percentage || 100}%</div>
              </div>
              <div>
                <span style="color: #666;">Betaald door:</span>
                <div style="font-weight: 500; margin-top: 2px;">${record.paid_by || "Bamalite S.A."}</div>
              </div>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 5px; font-size: 12px; color: #666;">
                <span>📄</span>
                <span>Ziektebriefje:</span>
              </div>
              <div style="padding: 4px 8px; border-radius: 4px; font-size: 11px; ${certificateStatus.color}">
                ${certificateStatus.text}
              </div>
            </div>
            ${ship ? `
              <div style="margin-top: 8px; font-size: 12px; color: #666; display: flex; align-items: center; gap: 5px;">
                <span>🚢</span>
                <span>${ship.name}</span>
              </div>
            ` : ''}
            ${record.notes ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Notities:</div>
                <div style="font-size: 12px; color: #374151; font-style: italic;">${record.notes}</div>
              </div>
            ` : ''}
          </div>
        `;
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