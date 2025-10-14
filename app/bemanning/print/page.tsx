"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Printer, Download, FileText, Users, Ship, UserPlus, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { BackButton } from "@/components/ui/back-button"

export default function CrewPrintPage() {
  const { crew, ships, sickLeave, loading, error } = useSupabaseData()
  
  // Converteer naar oude formaat voor compatibility
  const allCrewData = crew.reduce((acc: any, c: any) => {
    acc[c.id] = {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      position: c.position,
      nationality: c.nationality,
      status: c.status,
      shipId: c.ship_id,
    }
    return acc
  }, {})
  
  // Bereken stats
  const stats = {
    totalCrew: crew.filter((c: any) => c.status !== 'uit-dienst').length,
    onBoard: crew.filter((c: any) => c.status === 'aan-boord').length,
    atHome: crew.filter((c: any) => c.status === 'thuis').length,
    sick: crew.filter((c: any) => c.status === 'ziek').length,
  }

  const handlePrintAll = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // PDF export functionaliteit
    alert("PDF export functionaliteit wordt binnenkort toegevoegd")
  }

  const handleExportData = () => {
    // Data export functionaliteit
    alert("Data export functionaliteit wordt binnenkort toegevoegd")
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "bg-green-100 text-green-800"
      case "thuis":
        return "bg-blue-100 text-blue-800"
      case "ziek":
        return "bg-red-100 text-red-800"
      case "uit-dienst":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "Aan boord"
      case "thuis":
        return "Thuis"
      case "ziek":
        return "Ziek"
      case "uit-dienst":
        return "Uit dienst"
      default:
        return status
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Print & Export</h1>
            <p className="text-gray-600 mt-1">Bemanning overzichten en export functionaliteit</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handlePrintAll} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print Alles
          </Button>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Crew</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalCrew}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Aflossers</p>
                <p className="text-2xl font-bold text-green-600">{stats.aflossers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Nog in te delen</p>
                <p className="text-2xl font-bold text-orange-600">{stats.nogInTeDelen}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Ziek</p>
                <p className="text-2xl font-bold text-red-600">{stats.actieveZiekmeldingen}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print opties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Bemanning Overzicht</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Print een compleet overzicht van alle bemanningsleden</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrintAll}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span>Aflossers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Print overzicht van alle aflossers</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrintAll}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ship className="w-5 h-5 text-purple-600" />
              <span>Schepen Overzicht</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Print bemanning per schip</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrintAll}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span>Nog in te delen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Print lijst van crew nog in te delen</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrintAll}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Ziekte Overzicht</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Print actieve ziekmeldingen</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrintAll}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-indigo-600" />
              <span>Data Export</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Export alle data naar Excel/CSV</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snelle links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/bemanning/overzicht">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium">Bemanning</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/bemanning/aflossers">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <UserPlus className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium">Aflossers</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ziekte">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="font-medium">Ziekte</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/bemanning/nog-in-te-delen">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="font-medium">In te delen</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
