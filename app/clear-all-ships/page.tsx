'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAllShipsFromDatabase } from '@/utils/ship-utils';

export default function ClearAllShipsPage() {
  const router = useRouter();

  useEffect(() => {
    // Verwijder alle schepen
    clearAllShipsFromDatabase();
    
    // Redirect na 2 seconden
    setTimeout(() => {
      router.push('http://localhost:3001');
    }, 2000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <div className="mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">🗑️</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Alle schepen worden verwijderd...
        </h1>
        
        <p className="text-gray-600 mb-6">
          Alle schepen worden permanent uit het systeem verwijderd.
        </p>
        
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
        
        <p className="text-sm text-gray-500">
          Je wordt automatisch doorgestuurd naar het dashboard.
        </p>
      </div>
    </div>
  );
} 