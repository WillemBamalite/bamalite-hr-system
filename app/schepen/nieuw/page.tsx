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
import { useSupabaseData } from '@/hooks/use-supabase-data';
import { BackButton } from '@/components/ui/back-button';
import { DashboardButton } from '@/components/ui/dashboard-button';

export default function NewShipPage() {
  const router = useRouter();
  const { ships, addShip, loading, error } = useSupabaseData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    shipId: '',
    shipName: '',
    company: 'Bamalite S.A.'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Voeg het schip toe aan Supabase
      const newShip = {
        id: formData.shipId,
        name: formData.shipName,
        max_crew: 8,
        status: 'Operationeel', // Required field in Supabase
        location: '', // Required field in Supabase
        route: '', // Required field in Supabase
        company: formData.company
      };
      
      await addShip(newShip);
      
      setIsSuccess(true);
      
      // Reset form
      setFormData({
        shipId: '',
        shipName: '',
        company: 'Bamalite S.A.'
      });
      
      // Ga terug naar dashboard na 2 seconden
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding ship:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Er is een fout opgetreden bij het toevoegen van het schip: ${error?.message || 'Onbekende fout'}`);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nieuw Schip</h1>
              <p className="text-sm text-gray-600">Voeg een nieuw schip toe aan het systeem</p>
            </div>
          </div>
        </div>
      </header>
      <DashboardButton />

      {/* Main content */}
      <main className="w-full px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ship className="w-5 h-5" />
                <span>Schip Informatie</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="shipName">Schip Naam *</Label>
                  <Input
                    id="shipName"
                    type="text"
                    value={formData.shipName}
                    onChange={(e) => handleShipNameChange(e.target.value)}
                    placeholder="Bijv. Bellona, Fraternite, etc."
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Firma *</Label>
                  <Select value={formData.company} onValueChange={(v) => setFormData(prev => ({ ...prev, company: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies firma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bamalite S.A.">Bamalite S.A.</SelectItem>
                      <SelectItem value="Devel Shipping S.A.">Devel Shipping S.A.</SelectItem>
                      <SelectItem value="Brugo Shipping SARL.">Brugo Shipping SARL.</SelectItem>
                      <SelectItem value="Europe Shipping AG.">Europe Shipping AG.</SelectItem>
                      <SelectItem value="Alcina S.A.">Alcina S.A.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipId">Schip ID</Label>
                  <Input
                    id="shipId"
                    type="text"
                    value={formData.shipId}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipId: e.target.value }))}
                    placeholder="Automatisch gegenereerd"
                    className="w-full bg-gray-50"
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Dit ID wordt automatisch gegenereerd op basis van de schip naam
                  </p>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <Link href="/">
                    <Button type="button" variant="outline">
                      Annuleren
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !formData.shipName}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Toevoegen...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Schip Toevoegen</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Huidige Schepen */}
          <Card>
            <CardHeader>
              <CardTitle>Huidige Schepen ({ships.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-gray-500">Schepen laden...</div>
              ) : error ? (
                <div className="text-center py-4 text-red-500">Fout: {error}</div>
              ) : ships.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nog geen schepen toegevoegd</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ships.map((ship) => (
                    <div key={ship.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Ship className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{ship.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 