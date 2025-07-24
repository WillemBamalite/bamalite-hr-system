"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Upload, Download, AlertTriangle, CheckCircle, Plus, Calendar, Eye, ArrowLeft, Edit } from "lucide-react"
import { useRouter } from "next/navigation"
import { documentDatabase } from "@/data/crew-database"
import { getCustomCrewDocuments, setCustomCrewDocuments } from "@/utils/out-of-service-storage"

interface Props {
  crewMemberId: string
}

export function CrewMemberDocuments({ crewMemberId }: Props) {
  const router = useRouter()
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editDocId, setEditDocId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState({
    expiryDate: "",
    file: null as File | null,
  })
  const [form, setForm] = useState({
    type: "",
    name: "",
    expiryDate: "",
    doesNotExpire: false,
    kmRange: "",
    isChemie: false,
    file: null as File | null,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Stateful documentenlijst (client-side)
  const [documents, setDocuments] = useState<any[]>([])
  const today = new Date()
  useEffect(() => {
    // Probeer eerst uit localStorage te halen
    const customDocs = getCustomCrewDocuments(crewMemberId)
    const baseDocs = Object.values(documentDatabase).filter((doc: any) => doc.crewMemberId === crewMemberId)
    const docs = (customDocs || baseDocs).map((doc: any) => {
      let daysUntilExpiry: number | null = null
      if (doc.expiryDate) {
        const expiry = new Date(doc.expiryDate)
        daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
      return {
        ...doc,
        daysUntilExpiry,
        doesNotExpire: !doc.expiryDate,
      }
    })
    setDocuments(docs)
  }, [crewMemberId])

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "vaarbewijs":
        return "Vaarbewijs"
      case "medisch":
        return "Medische Keuring"
      case "identiteit":
        return "Identiteitsbewijs"
      case "certificaat":
        return "Certificaat"
      case "contract":
        return "Contract"
      default:
        return "Document"
    }
  }

  const getExpiryStatus = (daysUntilExpiry: number|null) => {
    if (daysUntilExpiry === null) {
      return {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "Verloopt niet",
      }
    }
    if (daysUntilExpiry < 0) {
      return {
        color: "bg-red-100 text-red-800",
        icon: AlertTriangle,
        text: `Verlopen (${Math.abs(daysUntilExpiry)} dagen geleden)`
      }
    } else if (daysUntilExpiry <= 30) {
      return {
        color: "bg-orange-100 text-orange-800",
        icon: AlertTriangle,
        text: `Verloopt over ${daysUntilExpiry} dagen`,
      }
    } else {
      return {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: `Geldig tot ${new Date(today.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000).toLocaleDateString("nl-NL")}`,
      }
    }
  }

  // Bewerken opslaan (client-side)
  const handleEditSave = (docId: string) => {
    setDocuments((prevDocs: any[]) => {
      const updated = prevDocs.map((doc: any) =>
        doc.id === docId
          ? {
              ...doc,
              expiryDate: editForm.expiryDate,
              daysUntilExpiry: editForm.expiryDate && editForm.expiryDate !== "" ? Math.ceil((new Date(editForm.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
            }
          : doc
      )
      setCustomCrewDocuments(crewMemberId, updated)
      return updated
    })
    setEditDocId(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Documenten & Certificaten</span>
          </CardTitle>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Document Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nieuw Document Uploaden</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="document-type">Type Document</Label>
                  <Select value={form.name} onValueChange={val => setForm(f => ({ ...f, name: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vaarbewijs">Vaarbewijs</SelectItem>
                      <SelectItem value="Rijnpatent tot Wesel">Rijnpatent tot Wesel</SelectItem>
                      <SelectItem value="Rijnpatent tot Koblenz">Rijnpatent tot Koblenz</SelectItem>
                      <SelectItem value="Rijnpatent tot Mannheim">Rijnpatent tot Mannheim</SelectItem>
                      <SelectItem value="Rijnpatent tot Iffezheim">Rijnpatent tot Iffezheim</SelectItem>
                      <SelectItem value="Elbe patent">Elbe patent</SelectItem>
                      <SelectItem value="Donau patent">Donau patent</SelectItem>
                      <SelectItem value="Dienstboek">Dienstboek</SelectItem>
                      <SelectItem value="Legitimatie">Legitimatie</SelectItem>
                      <SelectItem value="ADN Certificaat">ADN Certificaat</SelectItem>
                      <SelectItem value="ADN Chemie Certificaat">ADN Chemie Certificaat</SelectItem>
                      <SelectItem value="Radar Certificaat">Radar Certificaat</SelectItem>
                      <SelectItem value="Marifoon Certificaat">Marifoon Certificaat</SelectItem>
                      <SelectItem value="Overig">Overig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(form.name === "Rijnpatent tot Wesel" || form.name === "Rijnpatent tot Koblenz" || form.name === "Rijnpatent tot Mannheim" || form.name === "Rijnpatent tot Iffezheim") && (
                  <div>
                    <Label htmlFor="kmRange">Bereik (tot km ...)</Label>
                    <Input id="kmRange" value={form.kmRange} onChange={e => setForm(f => ({ ...f, kmRange: e.target.value }))} placeholder="Bijv. tot km 980" />
                  </div>
                )}
                {form.name === "ADN Chemie Certificaat" && (
                  <div className="text-xs text-purple-700">Dit is een aanvulling op het ADN Certificaat</div>
                )}
                {form.name === "Overig" && (
                  <div>
                    <Label htmlFor="overigNaam">Naam document</Label>
                    <Input id="overigNaam" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="Bijv. Veiligheidscertificaat" />
                  </div>
                )}
                <div>
                  <Label htmlFor="expiry-date">Vervaldatum</Label>
                  <Input id="expiry-date" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} disabled={form.doesNotExpire} />
                  <div className="flex items-center mt-1">
                    <input type="checkbox" id="doesNotExpire" checked={form.doesNotExpire} onChange={e => setForm(f => ({ ...f, doesNotExpire: e.target.checked, expiryDate: e.target.checked ? "" : f.expiryDate }))} className="mr-2" />
                    <Label htmlFor="doesNotExpire">Verloopt niet</Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="file-upload">Bestand</Label>
                  <input ref={fileInputRef} id="file-upload" type="file" className="hidden" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Sleep bestand hierheen of klik om te selecteren</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, of afbeelding (max 10MB)</p>
                    {form.file && <div className="mt-2 text-xs text-blue-700">Geselecteerd: {form.file.name}</div>}
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button className="flex-1" onClick={() => setIsUploadOpen(false)}>Uploaden (mock)</Button>
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Annuleren
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => {
            const status = doc.doesNotExpire
              ? { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "Verloopt niet" }
              : typeof doc.daysUntilExpiry === "number"
                ? getExpiryStatus(doc.daysUntilExpiry)
                : { color: "bg-gray-200 text-gray-500", icon: CheckCircle, text: "Onbekend" }
            const StatusIcon = status.icon

            return (
              <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      <p className="text-sm text-gray-500">{getDocumentTypeLabel(doc.type)}</p>
                      {(doc.name === "Rijnpatent tot Wesel" || doc.name === "Rijnpatent tot Koblenz" || doc.name === "Rijnpatent tot Mannheim" || doc.name === "Rijnpatent tot Iffezheim") && doc.extra?.kmRange && (
                        <span className="text-xs text-blue-700">Bereik: {doc.extra.kmRange}</span>
                      )}
                      {doc.name === "ADN Chemie Certificaat" && (
                        <span className="text-xs text-purple-700 ml-2">(Chemie aanvulling)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3 mr-1" />
                      Bekijken
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Dialog open={editDocId === doc.id} onOpenChange={open => { setEditDocId(open ? doc.id : null); if (!open) setEditForm({ expiryDate: "", file: null }) }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditForm({ expiryDate: doc.expiryDate || "", file: null })}>
                          <Edit className="w-3 h-3 mr-1" />
                          Bewerken
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Document aanpassen</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-expiry-date">Vervaldatum</Label>
                            <Input id="edit-expiry-date" type="date" value={editForm.expiryDate} onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))} />
                          </div>
                          <div>
                            <Label htmlFor="edit-file-upload">Bestand vervangen</Label>
                            <input ref={editFileInputRef} id="edit-file-upload" type="file" className="hidden" onChange={e => setEditForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer" onClick={() => editFileInputRef.current?.click()}>
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Sleep bestand hierheen of klik om te selecteren</p>
                              {editForm.file && <div className="mt-2 text-xs text-blue-700">Geselecteerd: {editForm.file.name}</div>}
                            </div>
                          </div>
                          <div className="flex space-x-2 pt-4">
                            <Button className="flex-1" onClick={() => handleEditSave(doc.id)}>
                              Opslaan
                            </Button>
                            <Button variant="outline" onClick={() => setEditDocId(null)}>
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Geüpload: {new Date(doc.uploadDate).toLocaleDateString("nl-NL")}</span>
                    </div>
                    <span>•</span>
                    <span>{doc.fileName}</span>
                  </div>
                  <Badge className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.text}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        {documents.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nog geen documenten geüpload</p>
            <Button variant="outline" className="mt-2 bg-transparent" onClick={() => setIsUploadOpen(true)}>
              Eerste document toevoegen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

