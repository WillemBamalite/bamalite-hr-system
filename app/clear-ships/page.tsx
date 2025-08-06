'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearShipsPage() {
  const router = useRouter();

  useEffect(() => {
    // Verwijder alle schepen uit localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shipDatabase');
      
      // Trigger events om UI bij te werken
      window.dispatchEvent(new Event('localStorageUpdate'));
      window.dispatchEvent(new Event('forceRefresh'));
      
      // Redirect naar dashboard
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Alle schepen worden verwijderd...
        </h1>
        <p className="text-gray-600 mb-4">
          Je wordt automatisch doorgestuurd naar het dashboard.
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
} 