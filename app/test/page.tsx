'use client';

import { CrewQuickActions } from '@/components/crew/crew-quick-actions';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test Pagina - Snelle Acties</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Snelle Acties Component:</h2>
          <CrewQuickActions />
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Directe Links:</h3>
          <div className="space-y-2">
            <a href="/schepen/nieuw" className="block text-blue-600 hover:underline">
              → /schepen/nieuw (Nieuw Schip pagina)
            </a>
            <a href="/" className="block text-blue-600 hover:underline">
              → / (Dashboard)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 