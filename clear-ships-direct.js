// Direct alle schepen verwijderen
if (typeof window !== 'undefined') {
  localStorage.removeItem('shipDatabase');
  window.dispatchEvent(new Event('localStorageUpdate'));
  window.dispatchEvent(new Event('forceRefresh'));
  console.log('✅ Alle schepen zijn verwijderd uit localStorage!');
} else {
  console.log('❌ Window is niet beschikbaar');
} 