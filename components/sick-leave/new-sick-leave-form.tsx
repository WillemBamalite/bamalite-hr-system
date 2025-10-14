"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, User, Euro } from "lucide-react"

interface Props {
  onClose: () => void
}

export function NewSickLeaveForm({ onClose }: Props) {
  const [selectedCrewMember, setSelectedCrewMember] = useState("")
  const [startDate, setStartDate] = useState("")
  const [description, setDescription] = useState("")
  const [hasCertificate, setHasCertificate] = useState(false)
  const [certificateValidUntil, setCertificateValidUntil] = useState("")
  const [sickLocation, setSickLocation] = useState("")

  // Gebruik echte crew data
  const crewMembers = [
    {
      id: "frank-hennekam",
      name: "Frank Hennekam",
      position: "Kapitein",
      ship: "MTS Bellona",
      nationality: "NL",
      dailySalary: 180,
    },
    {
      id: "michal-dudka",
      name: "Michal Dudka",
      position: "Stuurman",
      ship: "MS Pluto",
      nationality: "CZ",
      dailySalary: 150,
    },
    {
      id: "peter-jakus",
      name: "Peter Jakus",
      position: "Matroos",
      ship: "MS Primera",
      nationality: "SLK",
      dailySalary: 120,
    },
  ]

  const selectedMember = crewMembers.find((member) => member.id === selectedCrewMember)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Hier zou je de ziekmelding opslaan
    console.log('Sick leave data:', {
      crewMemberId: selectedCrewMember,
      startDate,
      description,
      hasCertificate,
      certificateValidUntil,
      sickLocation,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bemanningslid selecteren */}
      <div>
        <Label htmlFor="crew-member">Bemanningslid *</Label>
        <Select value={selectedCrewMember} onValueChange={setSelectedCrewMember}>
          <SelectTrigger>
            <SelectValue placeholder="Selecteer bemanningslid..." />
          </SelectTrigger>
          <SelectContent>
            {crewMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center space-x-2">
                  <span>{member.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {member.position}
                  </Badge>
                  <span className="text-xs text-gray-500">({member.ship})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Geselecteerd bemanningslid tonen */}
      {selectedMember && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {selectedMember.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900">{selectedMember.name}</h4>
                  <Badge variant="outline">{selectedMember.nationality}</Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{selectedMember.position}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Ship className="w-3 h-3" />
                    <span>{selectedMember.ship}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Euro className="w-3 h-3" />
                    <span>€{selectedMember.dailySalary}/dag</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Startdatum */}
        <div>
          <Label htmlFor="start-date">Startdatum ziekte *</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {/* Ziektebriefje */}
        <div className="space-y-3">
          <Label>Ziektebriefje</Label>
          <div className="flex items-center space-x-2">
            <Checkbox id="has-certificate" checked={hasCertificate} onCheckedChange={setHasCertificate} />
            <Label htmlFor="has-certificate" className="text-sm">
              Ziektebriefje aanwezig
            </Label>
          </div>

          {hasCertificate && (
            <div>
              <Label htmlFor="certificate-valid-until" className="text-sm">
                Geldig tot
              </Label>
              <Input
                id="certificate-valid-until"
                type="date"
                value={certificateValidUntil}
                onChange={(e) => setCertificateValidUntil(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Klacht beschrijving */}
      <div>
        <Label htmlFor="description">Klacht beschrijving (optioneel)</Label>
        <Textarea
          id="description"
          placeholder="Bijv. griep, rugklachten, hoofdpijn..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Locatie ziekte */}
      <div>
        <Label htmlFor="sick-location">Waar werd de persoon ziek? *</Label>
        <Select value={sickLocation} onValueChange={setSickLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Selecteer locatie..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aan-boord">Aan boord (100% doorbetaling)</SelectItem>
            <SelectItem value="thuis">Thuis (80% doorbetaling)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sickLocation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="w-4 h-4 text-blue-600" />
              <span className="font-medium">
                {sickLocation === "aan-boord" ? "100% doorbetaling (ziek aan boord)" : "80% doorbetaling (ziek thuis)"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acties */}
      <div className="flex space-x-3 pt-4 border-t">
        <Button type="submit" className="flex-1" disabled={!selectedCrewMember || !startDate}>
          Ziekmelding Registreren
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Annuleren
        </Button>
      </div>
    </form>
  )
}
