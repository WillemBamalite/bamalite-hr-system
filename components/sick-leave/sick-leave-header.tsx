"use client"

import { useState } from "react"
import { ArrowLeft, Download, Filter, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NewSickLeaveForm } from "./new-sick-leave-form"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function SickLeaveHeader() {
  const router = useRouter()
  const [isNewSickLeaveOpen, setIsNewSickLeaveOpen] = useState(false)

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ziekteregistratie</h1>
              <p className="text-sm text-gray-500">Luxemburgse regelgeving - 80% doorbetaling</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isNewSickLeaveOpen} onOpenChange={setIsNewSickLeaveOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserX className="w-4 h-4 mr-2" />
                  Nieuwe Ziekmelding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuwe Ziekmelding Registreren</DialogTitle>
                </DialogHeader>
                <NewSickLeaveForm onClose={() => setIsNewSickLeaveOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <Input placeholder="Zoek bemanningslid..." />
          </div>
          <Select defaultValue="alle-statussen">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle-statussen">Alle statussen</SelectItem>
              <SelectItem value="actief-ziek">Actief ziek</SelectItem>
              <SelectItem value="hersteld">Hersteld</SelectItem>
              <SelectItem value="zonder-briefje">Zonder ziektebriefje</SelectItem>
              <SelectItem value="briefje-verloopt">Briefje verloopt binnenkort</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="alle-schepen">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle-schepen">Alle schepen</SelectItem>
              <SelectItem value="ms-bellona">MTS Bellona</SelectItem>
              <SelectItem value="ms-bacchus">MTS Bacchus</SelectItem>
              <SelectItem value="ms-pluto">MTS Pluto</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
