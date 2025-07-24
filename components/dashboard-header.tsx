"use client"

import { Bell, Settings, User, LogOut, Ship, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function DashboardHeader() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo en bedrijfsnaam */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <Ship className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">BAMALITE S.A.</h1>
              <p className="text-sm text-gray-500">HR Management Systeem</p>
            </div>
          </div>

          {/* Navigatie en gebruiker */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/print" className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
              <Printer className="w-4 h-4 mr-1" />
              Print Overzicht
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {/* Meldingen */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">3</Badge>
            </Button>

            {/* Gebruikersmenu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>HR Manager</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mijn Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Instellingen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
