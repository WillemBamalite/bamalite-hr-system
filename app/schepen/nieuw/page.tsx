'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Ship, Plus, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getCombinedShipDatabase, addShipToDatabase } from '@/utils/ship-utils';

export default function NewShipPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentShips, setCurrentShips] = useState<any>({});
  const [formData, setFormData] = useState({
    shipId: '',
    shipName: ''
  });

  // Load current ships from localStorage
  useEffect(() => {
    const ships = getCombinedShipDatabase();
    setCurrentShips(ships);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Voeg het schip toe aan localStorage via de utility functie
      const newShip = {
        id: formData.shipId,
        name: formData.shipName,
        status: 'Operationeel'
      };
      
      addShipToDatabase(newShip);
      
      setIsSuccess(true);
      
      // Reset form
      setFormData({
        shipId: '',
        shipName: ''
      });
      
      // Ga terug naar dashboard na 2 seconden
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding ship:', error);
      alert('Er is een fout opgetreden bij het toevoegen van het schip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateShipId = (shipName: string) => {
    // Genereer een ship ID op basis van de naam
    const cleanName = shipName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '-');
    
    return `ms-${cleanName}`;
  };

  const handleShipNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      shipName: name,
      shipId: generateShipId(name)
    }));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Schip Toegevoegd!</h2>
          <p className="text-gray-600 mb-4">
            Het schip "{formData.shipName}" is succesvol toegevoegd aan het systeem.
          </p>
          <p className="text-sm text-gray-500">
            Je wordt automatisch doorgestuurd naar het dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nieuw Schip Toevoegen</h1>
            <p className="text-gray-600">Voeg een nieuw schip toe aan het systeem</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Schip Informatie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Schip Naam */}
              <div className="space-y-2">
                <Label htmlFor="shipName">Schip Naam *</Label>
                <Input
                  id="shipName"
                  type="text"
                  placeholder="Bijv. MTS Nieuw Schip"
                  value={formData.shipName}
                  onChange={(e) => handleShipNameChange(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">
                  Voer de volledige naam in (bijv. "MTS Nieuw Schip")
                </p>
              </div>

              {/* Schip ID */}
              <div className="space-y-2">
                <Label htmlFor="shipId">Schip ID</Label>
                <Input
                  id="shipId"
                  type="text"
                  value={formData.shipId}
                  onChange={(e) => setFormData(prev => ({ ...prev, shipId: e.target.value }))}
                  placeholder="ms-nieuw-schip"
                />
                <p className="text-sm text-gray-500">
                  Automatisch gegenereerd op basis van de naam. Kan handmatig aangepast worden.
                </p>
              </div>





              {/* Voorbeeld */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Voorbeeld:</h4>
                                 <div className="text-sm text-blue-800 space-y-1">
                   <p><strong>Naam:</strong> MTS Nieuw Schip</p>
                   <p><strong>ID:</strong> ms-nieuw-schip</p>
                 </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.shipName}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    'Bezig met toevoegen...'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Schip Toevoegen
                    </>
                  )}
                </Button>
                <Link href="/">
                  <Button variant="outline" type="button">
                    Annuleren
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Huidige Schepen</CardTitle>
          </CardHeader>
          <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {Object.entries(currentShips).map(([id, ship]: [string, any]) => (
                  <div key={id}>• {ship.name}</div>
                ))}
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 