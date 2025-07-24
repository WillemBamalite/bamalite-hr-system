"use client"

import { useState, useEffect } from "react"
import { crewDatabase, sickLeaveHistoryDatabase, shipDatabase } from "@/data/crew-database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { History, Calendar, CheckCircle, AlertTriangle, Ship, ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SickLeaveHistoryPage() {
  const [localStorageCrew, setLocalStorageCrew] = useState<any>({});
  const [afboekenDialog, setAfboekenDialog] = useState<string | null>(null);
  const [afboekenData, setAfboekenData] = useState({
    daysCompleted: 1,
    note: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    ship: ""
  });
  
  // Laad localStorage data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}');
        setLocalStorageCrew(storedCrew);
      } catch (e) {
        console.error('Error parsing localStorage crew:', e);
      }
    }
  }, []);

  // Combineer database en localStorage data
  const allCrewData = { ...crewDatabase, ...localStorageCrew };

  // Combineer history data met bemanning data
  const historyRecords = Object.values(sickLeaveHistoryDatabase)
    .map((record: any) => {
      const crewMember = allCrewData[record.crewMemberId]
      const ship = crewMember?.shipId ? shipDatabase[crewMember.shipId] : null
      return {
        ...record,
        crewMember,
        ship,
      }
    })
    .filter((record) => record.crewMember && record.crewMember.status !== "uit-dienst")
    .filter((record) => record.standBackStatus !== "voltooid") // Alleen openstaande records
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

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

  const getStandBackStatusColor = (status: string) => {
    switch (status) {
      case "voltooid":
        return "bg-green-100 text-green-800"
      case "openstaand":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStandBackStatusIcon = (status: string) => {
    switch (status) {
      case "voltooid":
        return <CheckCircle className="w-3 h-3" />
      case "openstaand":
        return <AlertTriangle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getStandBackStatusText = (status: string) => {
    switch (status) {
      case "voltooid":
        return "Voltooid"
      case "openstaand":
        return "Openstaand"
      default:
        return status
    }
  }

  // Afboeken functionaliteit
  const handleAfboeken = (recordId: string) => {
    const record = historyRecords.find(r => r.id === recordId);
    if (!record) return;

    // Update de record in de database
    const updatedRecord = {
      ...record,
      standBackDaysCompleted: record.standBackDaysCompleted + afboekenData.daysCompleted,
      standBackDaysRemaining: Math.max(0, record.standBackDaysRemaining - afboekenData.daysCompleted),
      standBackStatus: record.standBackDaysCompleted + afboekenData.daysCompleted >= record.standBackDaysRequired ? "voltooid" : "openstaand",
      standBackHistory: [
        ...record.standBackHistory,
        {
          daysCompleted: afboekenData.daysCompleted,
          startDate: afboekenData.startDate,
          endDate: afboekenData.endDate,
          note: afboekenData.note || "Afgeboekt",
          ship: afboekenData.ship
        }
      ]
    };

    // Update in database
    (sickLeaveHistoryDatabase as any)[recordId] = updatedRecord;

    // Reset form
    setAfboekenData({ daysCompleted: 1, note: "", startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], ship: "" });
    setAfboekenDialog(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/ziekte" className="flex items-center text-sm text-gray-700 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Ziekte
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Terug Te Staan Overzicht</h1>
            <p className="text-sm text-gray-600">Openstaande terug staan dagen management</p>
          </div>
        </div>
      </div>

      {/* Desktop weergave */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {historyRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {record.crewMember.firstName[0]}{record.crewMember.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {record.crewMember.firstName} {record.crewMember.lastName}
                        </h3>
                        <span className="text-lg">{getNationalityFlag(record.crewMember.nationality)}</span>
                      </div>
                      <p className="text-sm text-gray-500">{record.crewMember.position}</p>
                    </div>
                  </div>
                  <Badge className={getStandBackStatusColor(record.standBackStatus)}>
                    {getStandBackStatusIcon(record.standBackStatus)}
                    <span className="ml-1">{getStandBackStatusText(record.standBackStatus)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ziekte periode */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Periode:</span>
                    <div className="flex items-center space-x-1 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">
                        {new Date(record.startDate).toLocaleDateString("nl-NL")} - {new Date(record.endDate).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Duur:</span>
                    <p className="font-medium mt-1">{record.daysCount} dagen</p>
                  </div>
                </div>

                {/* Reden van ziekte */}
                <div>
                  <span className="text-gray-500 text-sm">Reden van ziekte:</span>
                  <p className="text-sm text-gray-700 mt-1 font-medium">{record.description}</p>
                </div>

                {/* Terug staan dagen */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Vereist:</span>
                      <p className="font-medium mt-1">{record.standBackDaysRequired} dagen</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Voltooid:</span>
                      <p className="font-medium mt-1">{record.standBackDaysCompleted} dagen</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Resterend:</span>
                      <p className="font-medium mt-1 text-red-600">{record.standBackDaysRemaining} dagen</p>
                    </div>
                  </div>
                  
                  {/* Voortgangsbalk */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Voortgang</span>
                      <span>{record.standBackDaysCompleted}/{record.standBackDaysRequired} dagen</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${record.standBackStatus === "voltooid" ? "bg-green-500" : "bg-orange-500"}`}
                        style={{ width: `${(record.standBackDaysCompleted / record.standBackDaysRequired) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Afboeken knop */}
                {record.standBackStatus !== "voltooid" && (
                  <Dialog open={afboekenDialog === record.id} onOpenChange={(open) => setAfboekenDialog(open ? record.id : null)}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Afboeken
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dagen afboeken voor {record.crewMember.firstName} {record.crewMember.lastName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="daysCompleted">Aantal dagen afboeken</Label>
                          <Input
                            id="daysCompleted"
                            type="number"
                            min="1"
                            max={record.standBackDaysRemaining}
                            value={afboekenData.daysCompleted}
                            onChange={(e) => setAfboekenData({...afboekenData, daysCompleted: parseInt(e.target.value) || 1})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="startDate">Start datum</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={afboekenData.startDate}
                            onChange={(e) => setAfboekenData({...afboekenData, startDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">Eind datum</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={afboekenData.endDate}
                            onChange={(e) => setAfboekenData({...afboekenData, endDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship">Schip</Label>
                          <Select value={afboekenData.ship} onValueChange={(value) => setAfboekenData({...afboekenData, ship: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer een schip" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(shipDatabase).map((ship: any) => (
                                <SelectItem key={ship.id} value={ship.name}>
                                  {ship.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="note">Notitie (optioneel)</Label>
                          <Textarea
                            id="note"
                            placeholder="Reden van afboeken..."
                            value={afboekenData.note}
                            onChange={(e) => setAfboekenData({...afboekenData, note: e.target.value})}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleAfboeken(record.id)}
                            className="flex-1"
                          >
                            Afboeken
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setAfboekenDialog(null)}
                            className="flex-1"
                          >
                            Annuleren
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Afboek history */}
                {record.standBackHistory && record.standBackHistory.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Afboek History</span>
                      <span className="text-xs text-gray-500">{record.standBackHistory.length} entries</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {record.standBackHistory.map((entry: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs bg-green-50 p-2 rounded border border-green-200"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="font-medium text-green-700">{entry.daysCompleted} dagen afgeboekt</span>
                          </div>
                          <div className="text-gray-600">
                            {new Date(entry.startDate).toLocaleDateString("nl-NL")} - {new Date(entry.endDate).toLocaleDateString("nl-NL")}
                            {entry.ship && (
                              <span className="ml-2 text-gray-500">• {entry.ship}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schip info */}
                {record.ship && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Ship className="w-4 h-4" />
                    <span>{record.ship.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mobiele weergave */}
      <div className="block md:hidden space-y-4">
        {historyRecords.map((record) => (
          <Card key={record.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                      {record.crewMember.firstName[0]}{record.crewMember.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-sm">
                        {record.crewMember.firstName} {record.crewMember.lastName}
                      </h3>
                      <span className="text-lg">{getNationalityFlag(record.crewMember.nationality)}</span>
                    </div>
                    <p className="text-xs text-gray-500">{record.crewMember.position}</p>
                  </div>
                </div>
                <Badge className={`${getStandBackStatusColor(record.standBackStatus)} text-xs`}>
                  {getStandBackStatusText(record.standBackStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ziekte periode */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Periode:</span>
                  <p className="font-medium mt-1">
                    {new Date(record.startDate).toLocaleDateString("nl-NL")} - {new Date(record.endDate).toLocaleDateString("nl-NL")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Duur:</span>
                  <p className="font-medium mt-1">{record.daysCount} dagen</p>
                </div>
              </div>

              {/* Reden van ziekte */}
              <div>
                <span className="text-gray-500 text-xs">Reden van ziekte:</span>
                <p className="text-xs text-gray-700 mt-1 font-medium">{record.description}</p>
              </div>

              {/* Terug staan dagen */}
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-500">Vereist:</span>
                    <p className="font-medium mt-1">{record.standBackDaysRequired}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Voltooid:</span>
                    <p className="font-medium mt-1">{record.standBackDaysCompleted}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Resterend:</span>
                    <p className="font-medium mt-1 text-red-600">{record.standBackDaysRemaining}</p>
                  </div>
                </div>
                
                {/* Voortgangsbalk */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Voortgang</span>
                    <span>{record.standBackDaysCompleted}/{record.standBackDaysRequired}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${record.standBackStatus === "voltooid" ? "bg-green-500" : "bg-orange-500"}`}
                      style={{ width: `${(record.standBackDaysCompleted / record.standBackDaysRequired) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Afboeken knop */}
              {record.standBackStatus !== "voltooid" && (
                <Dialog open={afboekenDialog === record.id} onOpenChange={(open) => setAfboekenDialog(open ? record.id : null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline" size="sm">
                      <Plus className="w-3 h-3 mr-1" />
                      Afboeken
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dagen afboeken voor {record.crewMember.firstName} {record.crewMember.lastName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="daysCompleted">Aantal dagen afboeken</Label>
                        <Input
                          id="daysCompleted"
                          type="number"
                          min="1"
                          max={record.standBackDaysRemaining}
                          value={afboekenData.daysCompleted}
                          onChange={(e) => setAfboekenData({...afboekenData, daysCompleted: parseInt(e.target.value) || 1})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="startDate">Start datum</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={afboekenData.startDate}
                          onChange={(e) => setAfboekenData({...afboekenData, startDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">Eind datum</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={afboekenData.endDate}
                          onChange={(e) => setAfboekenData({...afboekenData, endDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ship">Schip</Label>
                        <Select value={afboekenData.ship} onValueChange={(value) => setAfboekenData({...afboekenData, ship: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer een schip" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(shipDatabase).map((ship: any) => (
                              <SelectItem key={ship.id} value={ship.name}>
                                {ship.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="note">Notitie (optioneel)</Label>
                        <Textarea
                          id="note"
                          placeholder="Reden van afboeken..."
                          value={afboekenData.note}
                          onChange={(e) => setAfboekenData({...afboekenData, note: e.target.value})}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => handleAfboeken(record.id)}
                          className="flex-1"
                        >
                          Afboeken
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setAfboekenDialog(null)}
                          className="flex-1"
                        >
                          Annuleren
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Afboek history */}
              {record.standBackHistory && record.standBackHistory.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Afboek History</span>
                    <span className="text-xs text-gray-500">{record.standBackHistory.length} entries</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {record.standBackHistory.map((entry: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs bg-green-50 p-2 rounded border border-green-200"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="font-medium text-green-700">{entry.daysCompleted} dagen afgeboekt</span>
                        </div>
                        <div className="text-gray-600">
                          {new Date(entry.startDate).toLocaleDateString("nl-NL")} - {new Date(entry.endDate).toLocaleDateString("nl-NL")}
                          {entry.ship && (
                            <span className="ml-2 text-gray-500">• {entry.ship}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schip info */}
              {record.ship && (
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Ship className="w-3 h-3" />
                  <span>{record.ship.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {historyRecords.length === 0 && (
        <div className="text-center py-8">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Geen ziekte history gevonden</p>
        </div>
      )}
    </div>
  )
}
