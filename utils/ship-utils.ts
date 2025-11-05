// Statische shipDatabase is verwijderd - alleen localStorage wordt gebruikt

export function getCombinedShipDatabase() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const localStorageShips = localStorage.getItem('shipDatabase');
    if (localStorageShips) {
      return JSON.parse(localStorageShips);
    }
  } catch (error) {
    console.error('Error parsing shipDatabase from localStorage:', error);
  }
  
  return {};
}

export function addShipToDatabase(ship: any) {
  if (typeof window === 'undefined') return;

  try {
    const currentShips = JSON.parse(localStorage.getItem('shipDatabase') || '{}');
    currentShips[ship.id] = ship;
    localStorage.setItem('shipDatabase', JSON.stringify(currentShips));
    
    // Trigger update event
    window.dispatchEvent(new Event('localStorageUpdate'));
  } catch (error) {
    // Silent error handling
  }
}

export function removeShipFromDatabase(shipId: string) {
  if (typeof window === 'undefined') return;

  try {
    const currentShips = JSON.parse(localStorage.getItem('shipDatabase') || '{}');
    delete currentShips[shipId];
    localStorage.setItem('shipDatabase', JSON.stringify(currentShips));
    
    // Trigger update event
    window.dispatchEvent(new Event('localStorageUpdate'));
  } catch (error) {
    // Silent error handling
  }
}

export function clearAllShipsFromDatabase() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('shipDatabase');
    
    // Trigger update events
    window.dispatchEvent(new Event('localStorageUpdate'));
    window.dispatchEvent(new Event('forceRefresh'));
  } catch (error) {
    // Silent error handling
  }
} 