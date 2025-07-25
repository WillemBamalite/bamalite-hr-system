"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Database, Save, AlertTriangle } from 'lucide-react';
import { usePersistentStorage } from '@/utils/persistent-storage';
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase, documentDatabase } from '@/data/crew-database';

export function DataBackup() {
  const { exportData, importData } = usePersistentStorage();
  const [lastBackup, setLastBackup] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'backing-up' | 'success' | 'error'>('idle');

  // Auto-backup elke 5 minuten
  useEffect(() => {
    const autoBackup = () => {
      setBackupStatus('backing-up');
      try {
        exportData();
        setLastBackup(new Date().toLocaleString('nl-NL'));
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 3000);
      } catch (error) {
        console.error('Auto-backup failed:', error);
        setBackupStatus('error');
        setTimeout(() => setBackupStatus('idle'), 3000);
      }
    };

    // Eerste backup bij mount
    autoBackup();

    // Auto-backup elke 5 minuten
    const interval = setInterval(autoBackup, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualBackup = () => {
    setBackupStatus('backing-up');
    try {
      exportData();
      setLastBackup(new Date().toLocaleString('nl-NL'));
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 3000);
    } catch (error) {
      console.error('Manual backup failed:', error);
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 3000);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importData(file);
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 3000);
      // Force page refresh om nieuwe data te laden
      window.location.reload();
    } catch (error) {
      console.error('Import failed:', error);
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusColor = () => {
    switch (backupStatus) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'backing-up': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (backupStatus) {
      case 'success': return 'Backup succesvol';
      case 'error': return 'Backup mislukt';
      case 'backing-up': return 'Backup bezig...';
      default: return 'Klaar voor backup';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Backup & Herstel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
            {backupStatus === 'backing-up' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
          </div>
          {lastBackup && (
            <span className="text-sm text-gray-500">
              Laatste backup: {lastBackup}
            </span>
          )}
        </div>

        {/* Auto-backup info */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Auto-backup actief</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Data wordt automatisch elke 5 minuten opgeslagen in je browser
          </p>
        </div>

        {/* Manual backup */}
        <div className="flex gap-2">
          <Button 
            onClick={handleManualBackup}
            disabled={backupStatus === 'backing-up'}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Handmatige Backup
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
              disabled={isImporting}
            />
            <label htmlFor="import-file">
              <Button 
                variant="outline"
                disabled={isImporting}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importeren...' : 'Importeer Data'}
              </Button>
            </label>
          </div>
        </div>

        {/* Data statistieken */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(crewDatabase).length}
            </div>
            <div className="text-sm text-gray-600">Bemanningsleden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {Object.keys(sickLeaveDatabase).length}
            </div>
            <div className="text-sm text-gray-600">Ziekmeldingen</div>
          </div>
        </div>

        {/* Waarschuwing */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Belangrijk</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Maak regelmatig backups van je data. Browser data kan verloren gaan bij het wissen van cache of cookies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 