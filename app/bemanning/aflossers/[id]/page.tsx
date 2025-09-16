"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { format } from "date-fns"
import { 
  Ship, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Clock,
  Anchor,
  FileText
} from "lucide-react"
import Link from "next/link"

export default function AflosserDetailPage() {
  const params = useParams()
  const { crew, ships, loading, error } = useSupabaseData()
  const [mounted, setMounted] = useState(false)
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([])

  // Find the aflosser
  const aflosser = crew.find((member: any) => member.id === params.id)

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load assignment history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && aflosser && aflosser.id) {
      const assignmentHistoryKey = `assignment_history_${aflosser.id}`
      const history = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
      setAssignmentHistory(history)
    }
  }, [aflosser ? aflosser.id : null])

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Laden...</div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Early return after all hooks
  if (!aflosser) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Aflosser niet gevonden</div>
      </div>
    )
  }

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

  const getShipName = (shipId: string) => {
    const ship = ships.find((s: any) => s.id === shipId)
    return ship ? ship.name : 'Onbekend schip'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'bg-red-100 text-red-800'
      case 'thuis': return 'bg-green-100 text-green-800'
      case 'afwezig': return 'bg-orange-100 text-orange-800'
      case 'ziek': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'Aan boord'
      case 'thuis': return 'Beschikbaar'
      case 'afwezig': return 'Afwezig'
      case 'ziek': return 'Ziek'
      default: return status
    }
  }

  // Get vaste dienst info
  const getVasteDienstInfo = () => {
    if (typeof window !== 'undefined' && aflosser) {
      const vasteDienstInfo = localStorage.getItem(`vaste_dienst_info_${aflosser.id}`)
      try {
        return vasteDienstInfo ? JSON.parse(vasteDienstInfo) : null
      } catch {
        return null
      }
    }
    return null
  }

  const vasteDienstInfo = getVasteDienstInfo()

  // Calculate total days worked
  const calculateTotalDays = () => {
    return assignmentHistory
      .filter((entry: any) => entry.type === "assignment" && entry.end_date)
      .reduce((total: number, entry: any) => {
        const start = new Date(entry.start_date)
        const end = new Date(entry.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return total + days
      }, 0)
  }

  const totalDaysWorked = calculateTotalDays()

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <BackButton />
      <DashboardButton />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {aflosser.first_name[0]}{aflosser.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {aflosser.first_name} {aflosser.last_name}
            </h1>
            <p className="text-gray-600">Aflosser</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <Badge className={getStatusColor(aflosser.status)}>
          {getStatusText(aflosser.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Persoonlijke Informatie</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getNationalityFlag(aflosser.nationality)}</span>
                <span className="font-medium">{aflosser.nationality}</span>
              </div>
              
              {aflosser.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{aflosser.phone}</span>
                </div>
              )}
              
              {aflosser.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{aflosser.email}</span>
                </div>
              )}

              {/* Diplomas */}
              {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Diploma's:</h4>
                  <div className="flex flex-wrap gap-1">
                    {aflosser.diplomas.map((diploma: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {diploma}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Vaste Dienst Info */}
              {vasteDienstInfo?.in_vaste_dienst && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center space-x-2 text-sm text-purple-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Vaste Dienst</span>
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    15 dagen per maand
                    {vasteDienstInfo.vaste_dienst_start_date && (
                      <div>Start: {format(new Date(vasteDienstInfo.vaste_dienst_start_date), 'dd-MM-yyyy')}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {aflosser.notes && aflosser.notes.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Notities:</h4>
                  <div className="text-sm text-gray-600">
                    {typeof aflosser.notes[0] === 'string' ? aflosser.notes[0] : aflosser.notes[0]?.text || 'Geen notitie'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Statistieken</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Totaal dagen gewerkt:</span>
                <span className="font-medium">{totalDaysWorked} dagen</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Aantal reizen:</span>
                <span className="font-medium">
                  {assignmentHistory.filter((entry: any) => entry.type === "assignment").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Aantal afwezigheden:</span>
                <span className="font-medium">
                  {assignmentHistory.filter((entry: any) => entry.type === "absence").length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ship History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ship className="w-5 h-5" />
                <span>Schip Geschiedenis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nog geen schip toewijzingen</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignmentHistory
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((entry: any, index: number) => (
                      <div key={entry.id || index} className="border rounded-lg p-4">
                        {entry.type === "assignment" ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Ship className="w-5 h-5 text-blue-600" />
                                <span className="font-medium">
                                  {entry.ship_id ? getShipName(entry.ship_id) : 'Onbekend schip'}
                                </span>
                              </div>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Toewijzing
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span>
                                  {format(new Date(entry.start_date), 'dd-MM-yyyy')}
                                  {entry.end_date && (
                                    <> - {format(new Date(entry.end_date), 'dd-MM-yyyy')}</>
                                  )}
                                </span>
                              </div>
                              
                              {entry.assignment_type === "trip" && entry.trip_from && entry.trip_to && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  <span>{entry.trip_from} → {entry.trip_to}</span>
                                </div>
                              )}
                            </div>

                            {entry.notes && (
                              <div className="flex items-start space-x-2 text-sm">
                                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                                <span className="text-gray-600">{entry.notes}</span>
                              </div>
                            )}

                            {entry.end_date && (
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  const start = new Date(entry.start_date)
                                  const end = new Date(entry.end_date)
                                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                                  return `${days} dagen aan boord`
                                })()}
                              </div>
                            )}
                          </div>
                        ) : entry.type === "absence" ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-5 h-5 text-orange-600" />
                                <span className="font-medium">Afwezigheid</span>
                              </div>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                Afwezig
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>
                                {format(new Date(entry.start_date), 'dd-MM-yyyy')}
                                {entry.end_date && entry.end_date !== entry.start_date && (
                                  <> - {format(new Date(entry.end_date), 'dd-MM-yyyy')}</>
                                )}
                              </span>
                            </div>

                            {entry.reason && (
                              <div className="flex items-start space-x-2 text-sm">
                                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                                <span className="text-gray-600">{entry.reason}</span>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 