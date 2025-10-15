"use client"

import { ShipPrintOverview } from "@/components/ship-print-overview"
import { Button } from "@/components/ui/button"
import { Printer, Download, ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/ui/back-button"

export default function PrintPage() {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Hier zou je een PDF kunnen genereren

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Print Controls - alleen zichtbaar op scherm */}
      <div className="no-print bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <BackButton href="/" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Print Overzicht</h1>
                <p className="text-sm text-gray-600">Professioneel schepen en bemanning overzicht</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Overzicht
              </Button>
              <Button 
                onClick={handleDownload}
                variant="outline"
                className="border-gray-300 hover:border-gray-400 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="w-full px-4 py-8">
        <ShipPrintOverview />
      </div>

      {/* Print Instructions - alleen zichtbaar op scherm */}
      <div className="no-print w-full px-4 pb-8">
        <Card className="bg-white shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Print Instructies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Voorbereiding:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Zorg dat je printer is ingesteld op A4 formaat
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Voor beste resultaat: gebruik "Landscape" oriëntatie
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Controleer of alle bemanning correct wordt weergegeven
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Inhoud:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Elke schip krijgt een eigen pagina met volledige details
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Bemanning wordt gegroepeerd per status (Aan boord, Thuis, Ziek)
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Professionele layout met BAMALITE S.A. branding
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 