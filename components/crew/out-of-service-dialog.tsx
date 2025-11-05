"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, UserX } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface OutOfServiceDialogProps {
  crewMemberId: string
  crewMemberName: string
  onOutOfService: (date: Date, reason: string) => void
}

export function OutOfServiceDialog({ crewMemberId, crewMemberName, onOutOfService }: OutOfServiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date>()
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!date || !reason.trim()) {
      alert("Vul zowel een datum als reden in")
      return
    }

    setIsSubmitting(true)
    
    try {
      await onOutOfService(date, reason)
      setOpen(false)
      setDate(undefined)
      setReason("")
    } catch (error) {
      console.error("Error setting out of service:", error)
      alert("Er is een fout opgetreden bij het uit dienst zetten")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <UserX className="w-4 h-4 mr-2" />
          Uit dienst zetten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Uit dienst zetten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="crew-member">Bemanningslid</Label>
            <Input
              id="crew-member"
              value={crewMemberName}
              disabled
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="date">Datum uit dienst</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: nl }) : "Selecteer datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={nl}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label htmlFor="reason">Reden van vertrek</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. Pensioen, andere baan, ziekte, etc."
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!date || !reason.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Bezig..." : "Uit dienst zetten"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 