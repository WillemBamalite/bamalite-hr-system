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
import { Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function NewShipPage() {
  const router = useRouter();
  const { ships, addShip, crew, updateCrew, loading, error } = useSupabaseData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    shipId: '',
    shipName: '',
    company: 'Bamalite S.A.'
  });
  const [selectedOverigPersoneel, setSelectedOverigPersoneel] = useState<string[]>([]);
  const [successData, setSuccessData] = useState<{shipName: string; personeelCount: number} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Zorg ervoor dat het "overig" schip bestaat voordat we personeel toewijzen
      if (selectedOverigPersoneel.length > 0) {
        try {
          // Check of "overig" schip bestaat, zo niet, maak het aan
          const { data: existingShip, error: checkError } = await supabase
            .from('ships')
            .select('id')
            .eq('id', 'overig')
            .single();

          if (checkError && checkError.code === 'PGRST116') {
            // Schip bestaat niet, maak het aan
            const { error: insertError } = await supabase
              .from('ships')
              .insert([{
                id: 'overig',
                name: 'Overig Personeel',
                max_crew: 0,
                status: 'Operationeel',
                location: '',
                route: '',
                company: 'Bamalite S.A.'
              }]);

            if (insertError) {
              console.error('Fout bij aanmaken overig schip:', insertError);
              throw insertError;
            }
          } else if (checkError) {
            console.error('Fout bij controleren overig schip:', checkError);
            throw checkError;
          }

          // Wijs personeel toe aan "overig personeel"
          const updateResults = await Promise.all(
            selectedOverigPersoneel.map(async (memberId) => {
              try {
                console.log('Updating crew member to overig:', memberId)
                const result = await updateCrew(memberId, {
                  ship_id: 'overig',
                  status: 'thuis'
                })
                console.log('Update result:', result)
                return result
              } catch (error) {
                console.error('Error updating crew member:', memberId, error)
                throw error
              }
            })
          );
          
          console.log('All updates completed:', updateResults)
          
          // Verify the updates by checking the database
          const { data: verifyData, error: verifyError } = await supabase
            .from('crew')
            .select('id, first_name, last_name, ship_id')
            .in('id', selectedOverigPersoneel)
          
          if (verifyError) {
            console.error('Error verifying updates:', verifyError)
          } else {
            console.log('Verified crew members after update:', verifyData)
          }
        } catch (error) {
          console.error('Fout bij toewijzen personeel aan overig:', error);
          alert('Er is een fout opgetreden bij het toewijzen van personeel aan overig personeel.');
        }
      }

      // Voeg het schip toe aan Supabase (alleen als er een schip naam is)
      if (formData.shipName && formData.shipName.trim() !== '') {
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
      }
      
      // Voeg het schip toe aan Supabase (alleen als er een schip naam is)
      if (formData.shipName && formData.shipName.trim() !== '') {
        await addShip(newShip);
      }
      
      // Sla success data op voordat we resetten
      setSuccessData({
        shipName: formData.shipName,
        personeelCount: selectedOverigPersoneel.length
      });
      
      setIsSuccess(true);
      
      // Reset form
      setFormData({
        shipId: '',
        shipName: '',
        company: 'Bamalite S.A.'
      });
      setSelectedOverigPersoneel([]);
      
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {successData?.shipName && successData.personeelCount > 0
              ? 'Succesvol Opgeslagen!'
              : successData?.shipName 
              ? 'Schip Toegevoegd!' 
              : 'Personeel Toegewezen!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {successData?.shipName && successData.personeelCount > 0
              ? `Het schip "${successData.shipName}" is toegevoegd en ${successData.personeelCount} persoon(en) ${successData.personeelCount === 1 ? 'is' : 'zijn'} toegewezen aan overig personeel.`
              : successData?.shipName 
              ? `Het schip "${successData.shipName}" is succesvol toegevoegd aan het systeem.`
              : `Het personeel is succesvol toegewezen aan overig personeel.`
            }
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
                  <Label htmlFor="shipName">Schip Naam</Label>
                  <Input
                    id="shipName"
                    type="text"
                    value={formData.shipName}
                    onChange={(e) => handleShipNameChange(e.target.value)}
                    placeholder="Bijv. Bellona, Fraternite, etc."
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Optioneel: Laat leeg als je alleen personeel wilt toewijzen aan "overig personeel"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Firma {formData.shipName ? '*' : ''}</Label>
                  <Select 
                    value={formData.company} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, company: v }))}
                  >
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
                    disabled={isSubmitting || (!formData.shipName && selectedOverigPersoneel.length === 0)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Opslaan...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>
                          {formData.shipName && selectedOverigPersoneel.length > 0 
                            ? 'Schip Toevoegen & Personeel Toewijzen'
                            : formData.shipName 
                            ? 'Schip Toevoegen' 
                            : 'Personeel Toewijzen'}
                        </span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Overig Personeel Sectie */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Overig Personeel</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Selecteer personeel dat je wilt toewijzen aan "overig personeel" (niet aan een specifiek schip).
                </p>
                
                <div className="space-y-2">
                  <Label>Selecteer Personeel</Label>
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !selectedOverigPersoneel.includes(value)) {
                        setSelectedOverigPersoneel([...selectedOverigPersoneel, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kies personeel om toe te voegen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {crew
                        .filter((member: any) => 
                          !member.is_aflosser && 
                          !member.is_dummy && 
                          member.status !== 'uit-dienst' &&
                          !selectedOverigPersoneel.includes(member.id) &&
                          (!member.ship_id || member.ship_id === '' || member.ship_id === null)
                        )
                        .map((member: any) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name} - {member.position}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOverigPersoneel.length > 0 && (
                  <div className="space-y-2">
                    <Label>Geselecteerd Personeel ({selectedOverigPersoneel.length})</Label>
                    <div className="space-y-2">
                      {selectedOverigPersoneel.map((memberId) => {
                        const member = crew.find((m: any) => m.id === memberId);
                        if (!member) return null;
                        return (
                          <div 
                            key={memberId} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{member.position}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOverigPersoneel(
                                  selectedOverigPersoneel.filter(id => id !== memberId)
                                );
                              }}
                            >
                              Verwijderen
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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