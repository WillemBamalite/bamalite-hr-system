// Helper functie om diploma afkortingen om te zetten naar volledige namen
const convertDiplomaAbbreviations = (abbreviations: string): string[] => {
  const diplomaMap: { [key: string]: string } = {
    'Iffezheim': 'Rijnpatent tot Iffezheim',
    'Manh': 'Rijnpatent tot Mannheim',
    'Kobl': 'Rijnpatent tot Koblenz',
    'ADN': 'ADN',
    'C': 'ADN C',
    'R': 'Radar',
    'VB': 'Vaarbewijs',
    'Donau': 'Donaupatent',
    'Elbe': 'Elbepatent',
    'M': 'Marifoon',
    'GEEN': ''
  }

  if (abbreviations === 'GEEN') return []
  
  return abbreviations.split('/').map(abbr => {
    const trimmed = abbr.trim()
    return diplomaMap[trimmed] || trimmed
  }).filter(diploma => diploma !== '')
}

// Volledige BAMALITE bemanning database - LEEG OM OPNIEUW TE BEGINNEN
export const crewDatabase = {
  // Alle bemanningsleden zijn verwijderd - begin opnieuw met "Nieuw bemanningslid toevoegen"
}

export const shipDatabase = {
  // Alle schepen zijn verwijderd - begin opnieuw met "Nieuw Schip toevoegen"
}

// Document database
export const documentDatabase = {
  // Leeg - documenten worden toegevoegd via het systeem
}

// Ziekte database - huidige actieve ziekmeldingen
export const sickLeaveDatabase = {
  // Leeg - ziekmeldingen worden toegevoegd via het systeem
}

// Nieuwe database voor ziekte history en terug staan dagen
export const sickLeaveHistoryDatabase = {
  // Leeg - ziekte history wordt toegevoegd via het systeem
}
