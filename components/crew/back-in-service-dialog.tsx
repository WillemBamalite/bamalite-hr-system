"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User } from "lucide-react"
import { getCombinedShipDatabase } from "@/utils/ship-utils"

interface BackInServiceDialogProps {
  crewMemberId: string
  crewMemberName: string
  onBackInService: (data: BackInServiceData) => void
}

export interface BackInServiceData {
  shipId: string
  position: string
  regime: string
  startDate: string
  notes?: string
}

const POSITION_OPTIONS = [
  "Schipper",
  "Stuurman", 
  "Vol Matroos",
  "Matroos",
  "Lichtmatroos",
  "Deksmann"
]

const REGIME_OPTIONS = ["1/1", "2/2", "3/3"]

export function BackInServiceDialog({ crewMemberId, crewMemberName, onBackInService }: BackInServiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<BackInServiceData>({
    shipId: "",
    position: "",
    regime: "2/2",
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.shipId || !formData.position || !formData.regime || !formData.startDate) {
      alert("Vul alle verplichte velden in")
      return
    }
    
    onBackInService(formData)
    setOpen(false)
  }

  const handleChange = (field: keyof BackInServiceData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <User className="w-4 h-4 mr-2" />Terug in dienst
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Terug in dienst zetten</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            <strong>{crewMemberName}</strong> weer in dienst zetten
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="shipId">Schip *</Label>
              <Select value={formData.shipId} onValueChange={(value) => handleChange('shipId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer schip" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(getCombinedShipDatabase()).map((ship: any) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="position">Functie *</Label>
              <Select value={formData.position} onValueChange={(value) => handleChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer functie" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="regime">Regime *</Label>
              <Select value={formData.regime} onValueChange={(value) => handleChange('regime', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer regime" />
                </SelectTrigger>
                <SelectContent>
                  {REGIME_OPTIONS.map((regime) => (
                    <SelectItem key={regime} value={regime}>
                      {regime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="startDate">Startdatum *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notities (optioneel)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Extra informatie over terug in dienst..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit">
              Terug in dienst zetten
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 