"use client";
import { shipDatabase } from "@/data/crew-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCrewData } from "@/hooks/use-crew-data";

export default function NogInTeDelenPage() {
  // Gebruik de hook voor gecombineerde crew data
  const allCrewData = useCrewData()
  
  // Filter bemanningsleden zonder schip
  const crew = Object.values(allCrewData).filter((c: any) => c.shipId === "nog-in-te-delen" && c.status !== "uit-dienst");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-purple-800">Bemanning nog in te delen</h1>
      {crew.length === 0 ? (
        <div className="text-gray-500">Er zijn momenteel geen bemanningsleden die nog ingedeeld moeten worden.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {crew.map((member: any) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle>{member.firstName} {member.lastName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm text-gray-700">Functie: {member.position}</div>
                <div className="mb-2 text-sm text-gray-700">Telefoon: {member.phone}</div>
                <div className="mb-2 text-sm text-gray-700">Diploma's: {member.diplomas?.join(", ")}</div>
                <div className="mb-2 text-sm text-gray-700">Roken: {member.smoking ? "Ja" : "Nee"}</div>
                <div className="mb-2 text-sm text-gray-700">In dienst per: {member.entryDate ? new Date(member.entryDate).toLocaleDateString("nl-NL") : "-"}</div>
                <Button variant="secondary" className="mt-2">Indelen aan schip</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 