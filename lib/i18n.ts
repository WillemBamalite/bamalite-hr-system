export type Locale = 'nl' | 'de' | 'fr'

export interface Translations {
  // Navigation
  dashboard: string
  crew: string
  reliefCrew: string
  students: string
  loans: string
  documents: string
  sick: string
  newPersonnel: string
  quickActions: string
  
  // Common actions
  new: string
  edit: string
  save: string
  cancel: string
  delete: string
  search: string
  filter: string
  print: string
  logout: string
  loading: string
  error: string
  yes: string
  no: string
  back: string
  next: string
  previous: string
  close: string
  open: string
  show: string
  hide: string
  add: string
  remove: string
  update: string
  create: string
  submit: string
  reset: string
  confirm: string
  select: string
  choose: string
  upload: string
  download: string
  view: string
  details: string
  overview: string
  summary: string
  total: string
  active: string
  inactive: string
  available: string
  unavailable: string
  assigned: string
  unassigned: string
  complete: string
  incomplete: string
  pending: string
  approved: string
  rejected: string
  draft: string
  published: string
  archived: string
  
  // Quick Actions
  newCrewMember: string
  addANewCrewMember: string
  newShip: string
  addANewShip: string
  
  // New Personnel Page
  candidates: string
  toBeCompleted: string
  accept: string
  forceOnBoard: string
  completeChecklist: string
  noPersonsToContact: string
  noInterest: string
  noPersonsWithIncompleteChecklist: string
  checklist: string
  completeChecklistButton: string
  
  // Students Page
  studentsOverview: string
  totalStudents: string
  noStudentsFound: string
  viewProfile: string
  educationStartDate: string
  educationEndDate: string
  schoolPeriods: string
  
  // Relief Crew Page
  tripsAndReliefCrewManagement: string
  fourStepWorkflow: string
  trips: string
  reliefCrew: string
  plannedTrips: string
  assignedTrips: string
  activeTrips: string
  completedTrips: string
  newTrip: string
  completedTripsCount: string
  assign: string
  onBoard: string
  newReliefCrewMember: string
  reliefCrewInPermanentService: string
  independentReliefCrew: string
  reliefCrewFromAgencies: string
  createNewTrip: string
  assignReliefCrew: string
  
  // Sick Leave Page
  sickLeaveOverview: string
  activeSick: string
  noValidCertificate: string
  sickLeaveDetails: string
  daysSick: string
  sickCertificate: string
  noSickLeaveFound: string
  sickCertificateProvided: string
  activeSickStatus: string
  recoveredStatus: string
  waitingForCertificate: string
  noSickCertificate: string
  edit: string
  recovery: string
  
  // Loans Page
  loansAndTraining: string
  newLoan: string
  totalLoans: string
  completed: string
  outstandingAmount: string
  completedCount: string
  noOutstandingLoans: string
  noLoansFoundWithCriteria: string
  period: string
  totalAmount: string
  outstanding: string
  paymentHistory: string
  noCompletedLoans: string
  noCrewMembersAvailable: string
  noCrewMembersLoaded: string
  amount: string
  addNewLoan: string
  registerPayment: string
  paymentForLoan: string
  amountMax: string
  paymentNote: string
  confirmPayment: string
  
  // Forms
  crewMemberAdded: string
  crewMemberAddedSuccess: string
  requiredWhenShipSelected: string
  studentInformation: string
  isStudent: string
  educationType: string
  bblDescription: string
  bolDescription: string
  educationStartDateRequired: string
  educationEndDateRequired: string
  educationStartDateRequiredBOL: string
  educationEndDateRequiredBOL: string
  
  // Dialogs
  quickNoteFor: string
  addQuickNote: string
  quickNotePlaceholder: string
  deleteNote: string
  confirmDeleteNote: string
  noteContent: string
  setUnavailability: string
  unavailableFrom: string
  unavailableTo: string
  reason: string
  reasonPlaceholder: string
  setUnavailable: string
  close: string
  
  // Profile
  profile: string
  personalInformation: string
  contactInformation: string
  workInformation: string
  educationInformation: string
  additionalInformation: string
  editProfile: string
  saveChanges: string
  cancelEdit: string
  markOutOfService: string
  outOfServiceDate: string
  outOfServiceReason: string
  fillDateAndReason: string
  profileUpdated: string
  errorUpdatingProfile: string
  errorUpdatingCrewMember: string
  errorDetails: string
  inServiceFrom: string
  contractSigned: string
  registeredLuxembourg: string
  insured: string
  checklist: string
  completeChecklist: string
  newHireTip: string
  newHireTipText: string
  archivedNotes: string
  noArchivedNotes: string
  noteCreated: string
  noteArchived: string
  fillRequiredFields: string
  regimeRequired: string
  statusRequired: string
  regime: string
  status: string
  phoneNumber: string
  dateOfBirth: string
  expectedStartDate: string
  placeOfBirth: string
  
  // Status
  atHome: string
  sick: string
  outOfService: string
  toBeAssigned: string
  
  // Positions
  captain: string
  firstMate: string
  engineer: string
  deckhand: string
  cook: string
  reliefCrewMember: string
  lightDeckhand: string
  deckman: string
  
  // Student types
  bbl: string
  bol: string
  
  // Statistics
  totalCrewMembers: string
  reliefCrewMembers: string
  sickMembers: string
  newPersonnelMembers: string
  outstandingLoans: string
  oldEmployees: string
  
  // Forms
  firstName: string
  lastName: string
  nationality: string
  position: string
  phone: string
  email: string
  birthDate: string
  birthPlace: string
  startDate: string
  smoking: string
  experience: string
  notes: string
  
  // Student fields
  isStudent: string
  educationType: string
  educationStartDate: string
  educationEndDate: string
  schoolPeriods: string
  
  // Checklist
  contractSigned: string
  registeredLuxembourg: string
  insured: string
  inServiceFrom: string
  
  // Messages
  profileUpdated: string
  memberAdded: string
  memberDeleted: string
  assignmentSuccessful: string
  statusUpdated: string
  candidateAdded: string
  tripCreated: string
  reliefAssigned: string
  onBoardReported: string
  tripCompleted: string
  recoveryRegistered: string
  sickLeaveRegistered: string
  loanAdded: string
  paymentProcessed: string
  loanCompleted: string
  
  // Errors
  errorUpdatingProfile: string
  errorAddingMember: string
  errorDeletingMember: string
  errorAssignment: string
  errorStatusUpdate: string
  errorAddingCandidate: string
  errorCreatingTrip: string
  errorAssigningRelief: string
  errorReportingOnBoard: string
  errorCompletingTrip: string
  errorRegisteringRecovery: string
  errorRegisteringSickLeave: string
  errorAddingLoan: string
  errorProcessingPayment: string
  errorCompletingLoan: string
  
  // Validation
  firstNameRequired: string
  lastNameRequired: string
  nationalityRequired: string
  positionRequired: string
  phoneRequired: string
  birthDateRequired: string
  startDateRequired: string
  inServiceFromRequired: string
  educationTypeRequired: string
  educationStartDateRequired: string
  educationEndDateRequired: string
}

export const translations: Record<Locale, Translations> = {
  nl: {
    // Navigation
    dashboard: 'Dashboard',
    crew: 'Bemanning',
    reliefCrew: 'Aflossers',
    students: 'Studenten',
    loans: 'Leningen',
    documents: 'Documenten',
    sick: 'Ziekte',
    newPersonnel: 'Nieuw Personeel',
    quickActions: 'Snelle acties',
    
    // Common actions
    new: 'Nieuw',
    edit: 'Bewerken',
    save: 'Opslaan',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    search: 'Zoeken',
    filter: 'Filteren',
    print: 'Printen',
    logout: 'Uitloggen',
    loading: 'Laden',
    error: 'Fout',
    yes: 'Ja',
    no: 'Nee',
    back: 'Terug',
    next: 'Volgende',
    previous: 'Vorige',
    close: 'Sluiten',
    open: 'Openen',
    show: 'Tonen',
    hide: 'Verbergen',
    add: 'Toevoegen',
    remove: 'Verwijderen',
    update: 'Bijwerken',
    create: 'Aanmaken',
    submit: 'Verzenden',
    reset: 'Resetten',
    confirm: 'Bevestigen',
    select: 'Selecteren',
    choose: 'Kiezen',
    upload: 'Uploaden',
    download: 'Downloaden',
    view: 'Bekijken',
    details: 'Details',
    overview: 'Overzicht',
    summary: 'Samenvatting',
    total: 'Totaal',
    active: 'Actief',
    inactive: 'Inactief',
    available: 'Beschikbaar',
    unavailable: 'Niet beschikbaar',
    assigned: 'Toegewezen',
    unassigned: 'Niet toegewezen',
    complete: 'Volledig',
    incomplete: 'Onvolledig',
    pending: 'In behandeling',
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen',
    draft: 'Concept',
    published: 'Gepubliceerd',
    archived: 'Gearchiveerd',
    
    // Quick Actions
    newCrewMember: 'Nieuw Bemanningslid',
    addANewCrewMember: 'Voeg een nieuw bemanningslid toe',
    newShip: 'Nieuw Schip',
    addANewShip: 'Voeg een nieuw schip toe',
    
    // New Personnel Page
    candidates: 'Kandidaten',
    toBeCompleted: 'Nog af te ronden',
    accept: 'Aannemen',
    forceOnBoard: 'Forceer Aan Boord',
    completeChecklist: 'Checklist Afronden',
    noPersonsToContact: 'Geen personen om te benaderen',
    noInterest: 'Geen Interesse',
    noPersonsWithIncompleteChecklist: 'Geen personen met incomplete checklist',
    checklist: 'Checklist',
    completeChecklistButton: 'Checklist Afronden',
    
    // Students Page
    studentsOverview: 'Studenten Overzicht',
    totalStudents: 'Totaal Studenten',
    noStudentsFound: 'Geen studenten gevonden',
    viewProfile: 'Bekijk profiel',
    educationStartDate: 'Begindatum opleiding',
    educationEndDate: 'Einddatum opleiding',
    schoolPeriods: 'Schoolperiodes',
    
    // Relief Crew Page
    tripsAndReliefCrewManagement: 'Reizen & Aflossers Beheer',
    fourStepWorkflow: '4-stappen workflow: Gepland → Ingedeeld → Actief → Voltooid',
    trips: 'Reizen',
    reliefCrew: 'Aflossers',
    plannedTrips: 'Geplande Reizen',
    assignedTrips: 'Ingedeelde Reizen',
    activeTrips: 'Actieve Reizen',
    completedTrips: 'Voltooide Reizen',
    newTrip: 'Nieuwe Reis',
    completedTripsCount: 'Voltooide Reizen',
    assign: 'Toewijzen',
    onBoard: 'Aan boord',
    newReliefCrewMember: 'Nieuwe Aflosser',
    reliefCrewInPermanentService: 'Aflossers in Vaste Dienst',
    independentReliefCrew: 'Zelfstandige Aflossers',
    reliefCrewFromAgencies: 'Aflossers van Uitzendbureaus',
    createNewTrip: 'Nieuwe Reis Aanmaken',
    assignReliefCrew: 'Aflosser Toewijzen',
    
    // Sick Leave Page
    sickLeaveOverview: 'Ziekte Overzicht',
    activeSick: 'Actief ziek',
    noValidCertificate: 'Geen geldig briefje',
    sickLeaveDetails: 'Ziekte details',
    daysSick: 'Dagen ziek',
    sickCertificate: 'Ziektebriefje',
    noSickLeaveFound: 'Geen ziekmeldingen gevonden',
    sickCertificateProvided: 'Ziektebriefje aangeleverd',
    activeSickStatus: 'Actief ziek',
    recoveredStatus: 'Hersteld',
    waitingForCertificate: 'Wacht op briefje',
    noSickCertificate: 'Geen ziektebriefje',
    edit: 'Bewerken',
    recovery: 'Herstel',
    
    // Loans Page
    loansAndTraining: 'Leningen & Opleidingen',
    newLoan: 'Nieuwe Lening',
    totalLoans: 'Totaal Leningen',
    completed: 'Voltooid',
    outstandingAmount: 'Openstaand Bedrag',
    completedCount: 'Voltooid',
    noOutstandingLoans: 'Geen openstaande leningen',
    noLoansFoundWithCriteria: 'Geen leningen gevonden met deze zoekcriteria.',
    period: 'Periode',
    totalAmount: 'Totaal Bedrag',
    outstanding: 'Openstaand',
    paymentHistory: 'Betalingshistorie',
    noCompletedLoans: 'Geen voltooide leningen',
    noCrewMembersAvailable: 'Geen bemanningsleden beschikbaar',
    noCrewMembersLoaded: 'Geen bemanningsleden geladen. Controleer of de data correct wordt geladen.',
    amount: 'Bedrag',
    addNewLoan: 'Nieuwe Lening Toevoegen',
    registerPayment: 'Betaling Registreren',
    paymentForLoan: 'Betaling voor lening',
    amountMax: 'Bedrag (max €',
    paymentNote: 'Bijv. Betaling maand januari',
    confirmPayment: 'Betaling Bevestigen',
    
    // Forms
    crewMemberAdded: 'Bemanningslid Toegevoegd!',
    crewMemberAddedSuccess: 'Het nieuwe bemanningslid is succesvol toegevoegd aan het systeem.',
    requiredWhenShipSelected: 'Verplicht als er een schip is geselecteerd',
    studentInformation: 'Student Informatie',
    isStudent: 'Is student',
    educationType: 'Opleidingstype',
    bblDescription: 'BBL (Beroepsbegeleidende Leerweg)',
    bolDescription: 'BOL (Beroepsopleidende Leerweg)',
    educationStartDateRequired: 'Begindatum opleiding is verplicht voor BOL studenten',
    educationEndDateRequired: 'Einddatum opleiding is verplicht voor BOL studenten',
    educationStartDateRequiredBOL: 'Begindatum opleiding *',
    educationEndDateRequiredBOL: 'Einddatum opleiding *',
    
    // Dialogs
    quickNoteFor: 'Snelle notitie voor',
    addQuickNote: 'Snelle notitie toevoegen',
    quickNotePlaceholder: 'Voeg een snelle notitie toe...',
    deleteNote: 'Notitie verwijderen',
    confirmDeleteNote: 'Weet je zeker dat je deze notitie wilt verwijderen?',
    noteContent: 'Notitie inhoud',
    setUnavailability: 'Afwezigheid instellen',
    unavailableFrom: 'Afwezig van',
    unavailableTo: 'Afwezig tot',
    reason: 'Reden',
    reasonPlaceholder: 'Reden van niet beschikbaarheid',
    setUnavailable: 'Instellen',
    close: 'Sluiten',
    
    // Profile
    profile: 'Profiel',
    personalInformation: 'Persoonlijke Informatie',
    contactInformation: 'Contact Informatie',
    workInformation: 'Werk Informatie',
    educationInformation: 'Opleiding Informatie',
    additionalInformation: 'Aanvullende Informatie',
    editProfile: 'Profiel Bewerken',
    saveChanges: 'Wijzigingen Opslaan',
    cancelEdit: 'Bewerken Annuleren',
    markOutOfService: 'Uit Dienst Zetten',
    outOfServiceDate: 'Uit Dienst Datum',
    outOfServiceReason: 'Reden Uit Dienst',
    fillDateAndReason: 'Vul een datum en reden in',
    profileUpdated: 'Profiel succesvol bijgewerkt!',
    errorUpdatingProfile: 'Fout bij het bijwerken van het profiel:',
    errorUpdatingCrewMember: 'Fout bij het bijwerken van bemanningslid:',
    errorDetails: 'Fout details:',
    inServiceFrom: 'In dienst vanaf',
    contractSigned: 'Arbeidsovereenkomst ondertekend',
    registeredLuxembourg: 'Ingeschreven in Luxembourg',
    insured: 'Verzekerd',
    checklist: 'Checklist',
    completeChecklist: 'Checklist Afronden',
    newHireTip: '💡 Tip voor nieuwe aanwervingen',
    newHireTipText: 'Vul de ontbrekende velden in en zorg ervoor dat de checklist volledig is ingevuld.',
    archivedNotes: 'Gearchiveerde Notities',
    noArchivedNotes: 'Geen gearchiveerde notities',
    noteCreated: 'Notitie aangemaakt',
    noteArchived: 'Notitie gearchiveerd',
    fillRequiredFields: 'Vul de volgende verplichte velden in',
    regimeRequired: 'Regime is verplicht',
    statusRequired: 'Status is verplicht',
    regime: 'Regime',
    status: 'Status',
    phoneNumber: 'Telefoonnummer',
    dateOfBirth: 'Geboortedatum',
    expectedStartDate: 'Verwachte Startdatum',
    placeOfBirth: 'Geboorteplaats',
    
    // Status
    atHome: 'Thuis',
    sick: 'Ziek',
    outOfService: 'Uit dienst',
    toBeAssigned: 'Nog in te delen',
    
    // Positions
    captain: 'Kapitein',
    firstMate: 'Eerste stuurman',
    engineer: 'Machinist',
    deckhand: 'Matroos',
    cook: 'Kok',
    reliefCrewMember: 'Aflosser',
    lightDeckhand: 'Lichtmatroos',
    deckman: 'Deksman',
    
    // Student types
    bbl: 'BBL',
    bol: 'BOL',
    
    // Statistics
    totalCrewMembers: 'Totaal bemanningsleden',
    reliefCrewMembers: 'Aflossers',
    sickMembers: 'Zieken',
    newPersonnelMembers: 'Nieuw Personeel',
    outstandingLoans: 'Openstaande leningen',
    oldEmployees: 'Oude medewerkers',
    
    // Forms
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    nationality: 'Nationaliteit',
    position: 'Functie',
    phone: 'Telefoonnummer',
    email: 'E-mail',
    birthDate: 'Geboortedatum',
    birthPlace: 'Geboorteplaats',
    startDate: 'Startdatum',
    smoking: 'Rookt',
    experience: 'Ervaring',
    notes: 'Notities',
    
    // Student fields
    isStudent: 'Is student',
    educationType: 'Opleidingstype',
    educationStartDate: 'Begindatum opleiding',
    educationEndDate: 'Einddatum opleiding',
    schoolPeriods: 'Schoolperiodes',
    
    // Checklist
    contractSigned: 'Arbeidsovereenkomst',
    registeredLuxembourg: 'Ingeschreven Luxembourg',
    insured: 'Verzekerd',
    inServiceFrom: 'In dienst vanaf',
    
    // Messages
    profileUpdated: 'Profiel succesvol bijgewerkt!',
    memberAdded: 'Bemanningslid succesvol toegevoegd!',
    memberDeleted: 'Bemanningslid succesvol verwijderd!',
    assignmentSuccessful: 'Toewijzing succesvol!',
    statusUpdated: 'Status succesvol bijgewerkt!',
    candidateAdded: 'Kandidaat succesvol toegevoegd!',
    tripCreated: 'Reis succesvol aangemaakt!',
    reliefAssigned: 'Aflosser succesvol toegewezen!',
    onBoardReported: 'Aflosser succesvol aan boord gemeld!',
    tripCompleted: 'Reis succesvol afgesloten!',
    recoveryRegistered: 'Herstel succesvol geregistreerd!',
    sickLeaveRegistered: 'Ziekmelding succesvol geregistreerd!',
    loanAdded: 'Lening succesvol toegevoegd!',
    paymentProcessed: 'Betaling succesvol verwerkt!',
    loanCompleted: 'Lening succesvol afgerond!',
    
    // Errors
    errorUpdatingProfile: 'Fout bij het bijwerken van het profiel',
    errorAddingMember: 'Fout bij het toevoegen van bemanningslid',
    errorDeletingMember: 'Fout bij het verwijderen van bemanningslid',
    errorAssignment: 'Fout bij toewijzing',
    errorStatusUpdate: 'Fout bij status update',
    errorAddingCandidate: 'Fout bij het toevoegen van kandidaat',
    errorCreatingTrip: 'Fout bij het aanmaken van reis',
    errorAssigningRelief: 'Fout bij toewijzen aflosser',
    errorReportingOnBoard: 'Fout bij aan boord melden',
    errorCompletingTrip: 'Fout bij afsluiten reis',
    errorRegisteringRecovery: 'Fout bij registreren herstel',
    errorRegisteringSickLeave: 'Fout bij registreren ziekmelding',
    errorAddingLoan: 'Fout bij het toevoegen van lening',
    errorProcessingPayment: 'Fout bij het verwerken van betaling',
    errorCompletingLoan: 'Fout bij het afronden van lening',
    
    // Validation
    firstNameRequired: 'Voornaam is verplicht',
    lastNameRequired: 'Achternaam is verplicht',
    nationalityRequired: 'Nationaliteit is verplicht',
    positionRequired: 'Functie is verplicht',
    phoneRequired: 'Telefoonnummer is verplicht',
    birthDateRequired: 'Geboortedatum is verplicht',
    startDateRequired: 'Startdatum is verplicht',
    inServiceFromRequired: 'In dienst vanaf is verplicht',
    educationTypeRequired: 'Opleidingstype is verplicht voor studenten',
    educationStartDateRequired: 'Begindatum opleiding is verplicht voor BOL studenten',
    educationEndDateRequired: 'Einddatum opleiding is verplicht voor BOL studenten',
  },
  
  de: {
    // Navigation
    dashboard: 'Dashboard',
    crew: 'Besatzung',
    reliefCrew: 'Ablöser',
    students: 'Studenten',
    loans: 'Darlehen',
    documents: 'Dokumente',
    sick: 'Krankheit',
    newPersonnel: 'Neues Personal',
    quickActions: 'Schnelle Aktionen',
    
    // Common actions
    new: 'Neu',
    edit: 'Bearbeiten',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    search: 'Suchen',
    filter: 'Filtern',
    print: 'Drucken',
    logout: 'Abmelden',
    loading: 'Laden',
    error: 'Fehler',
    yes: 'Ja',
    no: 'Nein',
    back: 'Zurück',
    next: 'Weiter',
    previous: 'Vorherige',
    close: 'Schließen',
    open: 'Öffnen',
    show: 'Anzeigen',
    hide: 'Verbergen',
    add: 'Hinzufügen',
    remove: 'Entfernen',
    update: 'Aktualisieren',
    create: 'Erstellen',
    submit: 'Senden',
    reset: 'Zurücksetzen',
    confirm: 'Bestätigen',
    select: 'Auswählen',
    choose: 'Wählen',
    upload: 'Hochladen',
    download: 'Herunterladen',
    view: 'Ansehen',
    details: 'Details',
    overview: 'Übersicht',
    summary: 'Zusammenfassung',
    total: 'Gesamt',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    available: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    assigned: 'Zugewiesen',
    unassigned: 'Nicht zugewiesen',
    complete: 'Vollständig',
    incomplete: 'Unvollständig',
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    draft: 'Entwurf',
    published: 'Veröffentlicht',
    archived: 'Archiviert',
    
    // Quick Actions
    newCrewMember: 'Neues Besatzungsmitglied',
    addANewCrewMember: 'Ein neues Besatzungsmitglied hinzufügen',
    newShip: 'Neues Schiff',
    addANewShip: 'Ein neues Schiff hinzufügen',
    
    // New Personnel Page
    candidates: 'Kandidaten',
    toBeCompleted: 'Noch zu erledigen',
    accept: 'Annehmen',
    forceOnBoard: 'An Bord zwingen',
    completeChecklist: 'Checkliste abschließen',
    noPersonsToContact: 'Keine Personen zu kontaktieren',
    noInterest: 'Kein Interesse',
    noPersonsWithIncompleteChecklist: 'Keine Personen mit unvollständiger Checkliste',
    checklist: 'Checkliste',
    completeChecklistButton: 'Checkliste abschließen',
    
    // Students Page
    studentsOverview: 'Studenten Übersicht',
    totalStudents: 'Gesamt Studenten',
    noStudentsFound: 'Keine Studenten gefunden',
    viewProfile: 'Profil ansehen',
    educationStartDate: 'Ausbildungsbeginn',
    educationEndDate: 'Ausbildungsende',
    schoolPeriods: 'Schulperioden',
    
    // Relief Crew Page
    tripsAndReliefCrewManagement: 'Reisen & Ablöser Verwaltung',
    fourStepWorkflow: '4-Schritte Workflow: Geplant → Zugewiesen → Aktiv → Abgeschlossen',
    trips: 'Reisen',
    reliefCrew: 'Ablöser',
    plannedTrips: 'Geplante Reisen',
    assignedTrips: 'Zugewiesene Reisen',
    activeTrips: 'Aktive Reisen',
    completedTrips: 'Abgeschlossene Reisen',
    newTrip: 'Neue Reise',
    completedTripsCount: 'Abgeschlossene Reisen',
    assign: 'Zuweisen',
    onBoard: 'An Bord',
    newReliefCrewMember: 'Neuer Ablöser',
    reliefCrewInPermanentService: 'Ablöser im Festdienst',
    independentReliefCrew: 'Selbstständige Ablöser',
    reliefCrewFromAgencies: 'Ablöser von Zeitarbeitsfirmen',
    createNewTrip: 'Neue Reise erstellen',
    assignReliefCrew: 'Ablöser zuweisen',
    
    // Sick Leave Page
    sickLeaveOverview: 'Krankheitsübersicht',
    activeSick: 'Aktiv krank',
    noValidCertificate: 'Kein gültiges Attest',
    sickLeaveDetails: 'Krankheitsdetails',
    daysSick: 'Tage krank',
    sickCertificate: 'Krankmeldung',
    noSickLeaveFound: 'Keine Krankmeldungen gefunden',
    sickCertificateProvided: 'Krankmeldung vorgelegt',
    activeSickStatus: 'Aktiv krank',
    recoveredStatus: 'Genesen',
    waitingForCertificate: 'Warten auf Attest',
    noSickCertificate: 'Kein Krankmeldung',
    edit: 'Bearbeiten',
    recovery: 'Genesung',
    
    // Loans Page
    loansAndTraining: 'Darlehen & Schulungen',
    newLoan: 'Neues Darlehen',
    totalLoans: 'Gesamt Darlehen',
    completed: 'Abgeschlossen',
    outstandingAmount: 'Ausstehender Betrag',
    completedCount: 'Abgeschlossen',
    noOutstandingLoans: 'Keine ausstehenden Darlehen',
    noLoansFoundWithCriteria: 'Keine Darlehen mit diesen Suchkriterien gefunden.',
    period: 'Zeitraum',
    totalAmount: 'Gesamtbetrag',
    outstanding: 'Ausstehend',
    paymentHistory: 'Zahlungshistorie',
    noCompletedLoans: 'Keine abgeschlossenen Darlehen',
    noCrewMembersAvailable: 'Keine Besatzungsmitglieder verfügbar',
    noCrewMembersLoaded: 'Keine Besatzungsmitglieder geladen. Überprüfen Sie, ob die Daten korrekt geladen werden.',
    amount: 'Betrag',
    addNewLoan: 'Neues Darlehen hinzufügen',
    registerPayment: 'Zahlung registrieren',
    paymentForLoan: 'Zahlung für Darlehen',
    amountMax: 'Betrag (max €',
    paymentNote: 'Z.B. Zahlung Monat Januar',
    confirmPayment: 'Zahlung bestätigen',
    
    // Forms
    crewMemberAdded: 'Besatzungsmitglied hinzugefügt!',
    crewMemberAddedSuccess: 'Das neue Besatzungsmitglied wurde erfolgreich zum System hinzugefügt.',
    requiredWhenShipSelected: 'Erforderlich wenn ein Schiff ausgewählt ist',
    studentInformation: 'Studenteninformationen',
    isStudent: 'Ist Student',
    educationType: 'Ausbildungstyp',
    bblDescription: 'BBL (Berufsbegleitende Ausbildung)',
    bolDescription: 'BOL (Berufsausbildende Ausbildung)',
    educationStartDateRequired: 'Ausbildungsbeginn ist für BOL-Studenten erforderlich',
    educationEndDateRequired: 'Ausbildungsende ist für BOL-Studenten erforderlich',
    educationStartDateRequiredBOL: 'Ausbildungsbeginn *',
    educationEndDateRequiredBOL: 'Ausbildungsende *',
    
    // Dialogs
    quickNoteFor: 'Schnelle Notiz für',
    addQuickNote: 'Schnelle Notiz hinzufügen',
    quickNotePlaceholder: 'Fügen Sie eine schnelle Notiz hinzu...',
    deleteNote: 'Notiz löschen',
    confirmDeleteNote: 'Sind Sie sicher, dass Sie diese Notiz löschen möchten?',
    noteContent: 'Notizinhalt',
    setUnavailability: 'Abwesenheit einstellen',
    unavailableFrom: 'Abwesend von',
    unavailableTo: 'Abwesend bis',
    reason: 'Grund',
    reasonPlaceholder: 'Grund der Nichtverfügbarkeit',
    setUnavailable: 'Einstellen',
    close: 'Schließen',
    
    // Profile
    profile: 'Profil',
    personalInformation: 'Persönliche Informationen',
    contactInformation: 'Kontaktinformationen',
    workInformation: 'Arbeitsinformationen',
    educationInformation: 'Ausbildungsinformationen',
    additionalInformation: 'Zusätzliche Informationen',
    editProfile: 'Profil bearbeiten',
    saveChanges: 'Änderungen speichern',
    cancelEdit: 'Bearbeitung abbrechen',
    markOutOfService: 'Außer Dienst setzen',
    outOfServiceDate: 'Außer Dienst Datum',
    outOfServiceReason: 'Grund Außer Dienst',
    fillDateAndReason: 'Datum und Grund eingeben',
    profileUpdated: 'Profil erfolgreich aktualisiert!',
    errorUpdatingProfile: 'Fehler beim Aktualisieren des Profils:',
    errorUpdatingCrewMember: 'Fehler beim Aktualisieren des Besatzungsmitglieds:',
    errorDetails: 'Fehlerdetails:',
    inServiceFrom: 'Im Dienst seit',
    contractSigned: 'Arbeitsvertrag unterzeichnet',
    registeredLuxembourg: 'In Luxemburg registriert',
    insured: 'Versichert',
    checklist: 'Checkliste',
    completeChecklist: 'Checkliste abschließen',
    newHireTip: '💡 Tipp für neue Einstellungen',
    newHireTipText: 'Füllen Sie die fehlenden Felder aus und stellen Sie sicher, dass die Checkliste vollständig ausgefüllt ist.',
    archivedNotes: 'Archivierte Notizen',
    noArchivedNotes: 'Keine archivierten Notizen',
    noteCreated: 'Notiz erstellt',
    noteArchived: 'Notiz archiviert',
    fillRequiredFields: 'Füllen Sie die folgenden Pflichtfelder aus',
    regimeRequired: 'Regime ist erforderlich',
    statusRequired: 'Status ist erforderlich',
    regime: 'Regime',
    status: 'Status',
    phoneNumber: 'Telefonnummer',
    dateOfBirth: 'Geburtsdatum',
    expectedStartDate: 'Erwartetes Startdatum',
    placeOfBirth: 'Geburtsort',
    
    // Status
    atHome: 'Zu Hause',
    sick: 'Krank',
    outOfService: 'Außer Dienst',
    toBeAssigned: 'Noch zuzuweisen',
    
    // Positions
    captain: 'Kapitän',
    firstMate: 'Erster Offizier',
    engineer: 'Maschinist',
    deckhand: 'Matrose',
    cook: 'Koch',
    reliefCrewMember: 'Ablöser',
    lightDeckhand: 'Leichtmatrose',
    deckman: 'Deckmann',
    
    // Student types
    bbl: 'BBL',
    bol: 'BOL',
    
    // Statistics
    totalCrewMembers: 'Gesamt Besatzungsmitglieder',
    reliefCrewMembers: 'Ablöser',
    sickMembers: 'Kranke',
    newPersonnelMembers: 'Neues Personal',
    outstandingLoans: 'Ausstehende Darlehen',
    oldEmployees: 'Alte Mitarbeiter',
    
    // Forms
    firstName: 'Vorname',
    lastName: 'Nachname',
    nationality: 'Nationalität',
    position: 'Position',
    phone: 'Telefonnummer',
    email: 'E-Mail',
    birthDate: 'Geburtsdatum',
    birthPlace: 'Geburtsort',
    startDate: 'Startdatum',
    smoking: 'Raucher',
    experience: 'Erfahrung',
    notes: 'Notizen',
    
    // Student fields
    isStudent: 'Ist Student',
    educationType: 'Ausbildungstyp',
    educationStartDate: 'Ausbildungsbeginn',
    educationEndDate: 'Ausbildungsende',
    schoolPeriods: 'Schulperioden',
    
    // Checklist
    contractSigned: 'Arbeitsvertrag',
    registeredLuxembourg: 'In Luxemburg registriert',
    insured: 'Versichert',
    inServiceFrom: 'Im Dienst seit',
    
    // Messages
    profileUpdated: 'Profil erfolgreich aktualisiert!',
    memberAdded: 'Besatzungsmitglied erfolgreich hinzugefügt!',
    memberDeleted: 'Besatzungsmitglied erfolgreich gelöscht!',
    assignmentSuccessful: 'Zuweisung erfolgreich!',
    statusUpdated: 'Status erfolgreich aktualisiert!',
    candidateAdded: 'Kandidat erfolgreich hinzugefügt!',
    tripCreated: 'Reise erfolgreich erstellt!',
    reliefAssigned: 'Ablöser erfolgreich zugewiesen!',
    onBoardReported: 'Ablöser erfolgreich an Bord gemeldet!',
    tripCompleted: 'Reise erfolgreich abgeschlossen!',
    recoveryRegistered: 'Genesung erfolgreich registriert!',
    sickLeaveRegistered: 'Krankmeldung erfolgreich registriert!',
    loanAdded: 'Darlehen erfolgreich hinzugefügt!',
    paymentProcessed: 'Zahlung erfolgreich verarbeitet!',
    loanCompleted: 'Darlehen erfolgreich abgeschlossen!',
    
    // Errors
    errorUpdatingProfile: 'Fehler beim Aktualisieren des Profils',
    errorAddingMember: 'Fehler beim Hinzufügen des Besatzungsmitglieds',
    errorDeletingMember: 'Fehler beim Löschen des Besatzungsmitglieds',
    errorAssignment: 'Fehler bei der Zuweisung',
    errorStatusUpdate: 'Fehler bei der Status-Aktualisierung',
    errorAddingCandidate: 'Fehler beim Hinzufügen des Kandidaten',
    errorCreatingTrip: 'Fehler beim Erstellen der Reise',
    errorAssigningRelief: 'Fehler bei der Ablöser-Zuweisung',
    errorReportingOnBoard: 'Fehler bei der Bordmeldung',
    errorCompletingTrip: 'Fehler beim Abschließen der Reise',
    errorRegisteringRecovery: 'Fehler bei der Genesungsregistrierung',
    errorRegisteringSickLeave: 'Fehler bei der Krankmeldungsregistrierung',
    errorAddingLoan: 'Fehler beim Hinzufügen des Darlehens',
    errorProcessingPayment: 'Fehler bei der Zahlungsverarbeitung',
    errorCompletingLoan: 'Fehler beim Abschließen des Darlehens',
    
    // Validation
    firstNameRequired: 'Vorname ist erforderlich',
    lastNameRequired: 'Nachname ist erforderlich',
    nationalityRequired: 'Nationalität ist erforderlich',
    positionRequired: 'Position ist erforderlich',
    phoneRequired: 'Telefonnummer ist erforderlich',
    birthDateRequired: 'Geburtsdatum ist erforderlich',
    startDateRequired: 'Startdatum ist erforderlich',
    inServiceFromRequired: 'Im Dienst seit ist erforderlich',
    educationTypeRequired: 'Ausbildungstyp ist für Studenten erforderlich',
    educationStartDateRequired: 'Ausbildungsbeginn ist für BOL-Studenten erforderlich',
    educationEndDateRequired: 'Ausbildungsende ist für BOL-Studenten erforderlich',
  },
  
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    crew: 'Équipage',
    reliefCrew: 'Relèves',
    students: 'Étudiants',
    loans: 'Prêts',
    documents: 'Documents',
    sick: 'Maladie',
    newPersonnel: 'Nouveau Personnel',
    quickActions: 'Actions rapides',
    
    // Common actions
    new: 'Nouveau',
    edit: 'Modifier',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    search: 'Rechercher',
    filter: 'Filtrer',
    print: 'Imprimer',
    logout: 'Déconnexion',
    loading: 'Chargement',
    error: 'Erreur',
    yes: 'Oui',
    no: 'Non',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    close: 'Fermer',
    open: 'Ouvrir',
    show: 'Afficher',
    hide: 'Masquer',
    add: 'Ajouter',
    remove: 'Supprimer',
    update: 'Mettre à jour',
    create: 'Créer',
    submit: 'Soumettre',
    reset: 'Réinitialiser',
    confirm: 'Confirmer',
    select: 'Sélectionner',
    choose: 'Choisir',
    upload: 'Télécharger',
    download: 'Télécharger',
    view: 'Voir',
    details: 'Détails',
    overview: 'Aperçu',
    summary: 'Résumé',
    total: 'Total',
    active: 'Actif',
    inactive: 'Inactif',
    available: 'Disponible',
    unavailable: 'Indisponible',
    assigned: 'Assigné',
    unassigned: 'Non assigné',
    complete: 'Complet',
    incomplete: 'Incomplet',
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    draft: 'Brouillon',
    published: 'Publié',
    archived: 'Archivé',
    
    // Quick Actions
    newCrewMember: 'Nouveau Membre d\'équipage',
    addANewCrewMember: 'Ajouter un nouveau membre d\'équipage',
    newShip: 'Nouveau Navire',
    addANewShip: 'Ajouter un nouveau navire',
    
    // New Personnel Page
    candidates: 'Candidats',
    toBeCompleted: 'À terminer',
    accept: 'Accepter',
    forceOnBoard: 'Forcer à bord',
    completeChecklist: 'Terminer la liste de contrôle',
    noPersonsToContact: 'Aucune personne à contacter',
    noInterest: 'Pas d\'intérêt',
    noPersonsWithIncompleteChecklist: 'Aucune personne avec liste de contrôle incomplète',
    checklist: 'Liste de contrôle',
    completeChecklistButton: 'Terminer la liste de contrôle',
    
    // Students Page
    studentsOverview: 'Aperçu des Étudiants',
    totalStudents: 'Total Étudiants',
    noStudentsFound: 'Aucun étudiant trouvé',
    viewProfile: 'Voir le profil',
    educationStartDate: 'Début de formation',
    educationEndDate: 'Fin de formation',
    schoolPeriods: 'Périodes scolaires',
    
    // Relief Crew Page
    tripsAndReliefCrewManagement: 'Gestion des Voyages & Remplacements',
    fourStepWorkflow: 'Workflow en 4 étapes: Planifié → Assigné → Actif → Terminé',
    trips: 'Voyages',
    reliefCrew: 'Remplacements',
    plannedTrips: 'Voyages Planifiés',
    assignedTrips: 'Voyages Assignés',
    activeTrips: 'Voyages Actifs',
    completedTrips: 'Voyages Terminés',
    newTrip: 'Nouveau Voyage',
    completedTripsCount: 'Voyages Terminés',
    assign: 'Assigner',
    onBoard: 'À bord',
    newReliefCrewMember: 'Nouveau Remplacement',
    reliefCrewInPermanentService: 'Remplacements en Service Permanent',
    independentReliefCrew: 'Remplacements Indépendants',
    reliefCrewFromAgencies: 'Remplacements d\'Agences',
    createNewTrip: 'Créer un Nouveau Voyage',
    assignReliefCrew: 'Assigner un Remplacement',
    
    // Sick Leave Page
    sickLeaveOverview: 'Aperçu des Maladies',
    activeSick: 'Malade actif',
    noValidCertificate: 'Aucun certificat valide',
    sickLeaveDetails: 'Détails de maladie',
    daysSick: 'Jours malade',
    sickCertificate: 'Certificat médical',
    noSickLeaveFound: 'Aucune déclaration de maladie trouvée',
    sickCertificateProvided: 'Certificat médical fourni',
    activeSickStatus: 'Malade actif',
    recoveredStatus: 'Rétabli',
    waitingForCertificate: 'En attente de certificat',
    noSickCertificate: 'Aucun certificat médical',
    edit: 'Modifier',
    recovery: 'Rétablissement',
    
    // Loans Page
    loansAndTraining: 'Prêts & Formations',
    newLoan: 'Nouveau Prêt',
    totalLoans: 'Total Prêts',
    completed: 'Terminé',
    outstandingAmount: 'Montant en Attente',
    completedCount: 'Terminé',
    noOutstandingLoans: 'Aucun prêt en attente',
    noLoansFoundWithCriteria: 'Aucun prêt trouvé avec ces critères de recherche.',
    period: 'Période',
    totalAmount: 'Montant Total',
    outstanding: 'En Attente',
    paymentHistory: 'Historique des Paiements',
    noCompletedLoans: 'Aucun prêt terminé',
    noCrewMembersAvailable: 'Aucun membre d\'équipage disponible',
    noCrewMembersLoaded: 'Aucun membre d\'équipage chargé. Vérifiez que les données sont chargées correctement.',
    amount: 'Montant',
    addNewLoan: 'Ajouter un Nouveau Prêt',
    registerPayment: 'Enregistrer le Paiement',
    paymentForLoan: 'Paiement pour prêt',
    amountMax: 'Montant (max €',
    paymentNote: 'Ex. Paiement mois janvier',
    confirmPayment: 'Confirmer le Paiement',
    
    // Forms
    crewMemberAdded: 'Membre d\'équipage ajouté!',
    crewMemberAddedSuccess: 'Le nouveau membre d\'équipage a été ajouté avec succès au système.',
    requiredWhenShipSelected: 'Requis si un navire est sélectionné',
    studentInformation: 'Informations Étudiant',
    isStudent: 'Est étudiant',
    educationType: 'Type de formation',
    bblDescription: 'BBL (Formation en alternance)',
    bolDescription: 'BOL (Formation professionnelle)',
    educationStartDateRequired: 'Le début de formation est requis pour les étudiants BOL',
    educationEndDateRequired: 'La fin de formation est requise pour les étudiants BOL',
    educationStartDateRequiredBOL: 'Début de formation *',
    educationEndDateRequiredBOL: 'Fin de formation *',
    
    // Dialogs
    quickNoteFor: 'Note rapide pour',
    addQuickNote: 'Ajouter une note rapide',
    quickNotePlaceholder: 'Ajoutez une note rapide...',
    deleteNote: 'Supprimer la note',
    confirmDeleteNote: 'Êtes-vous sûr de vouloir supprimer cette note?',
    noteContent: 'Contenu de la note',
    setUnavailability: 'Définir l\'absence',
    unavailableFrom: 'Absent du',
    unavailableTo: 'Absent jusqu\'au',
    reason: 'Raison',
    reasonPlaceholder: 'Raison de l\'indisponibilité',
    setUnavailable: 'Définir',
    close: 'Fermer',
    
    // Profile
    profile: 'Profil',
    personalInformation: 'Informations Personnelles',
    contactInformation: 'Informations de Contact',
    workInformation: 'Informations de Travail',
    educationInformation: 'Informations de Formation',
    additionalInformation: 'Informations Supplémentaires',
    editProfile: 'Modifier le Profil',
    saveChanges: 'Enregistrer les Modifications',
    cancelEdit: 'Annuler la Modification',
    markOutOfService: 'Mettre Hors Service',
    outOfServiceDate: 'Date Hors Service',
    outOfServiceReason: 'Raison Hors Service',
    fillDateAndReason: 'Remplir une date et une raison',
    profileUpdated: 'Profil mis à jour avec succès!',
    errorUpdatingProfile: 'Erreur lors de la mise à jour du profil:',
    errorUpdatingCrewMember: 'Erreur lors de la mise à jour du membre d\'équipage:',
    errorDetails: 'Détails de l\'erreur:',
    inServiceFrom: 'En service depuis',
    contractSigned: 'Contrat de travail signé',
    registeredLuxembourg: 'Enregistré au Luxembourg',
    insured: 'Assuré',
    checklist: 'Liste de contrôle',
    completeChecklist: 'Terminer la liste de contrôle',
    newHireTip: '💡 Conseil pour les nouveaux recrutements',
    newHireTipText: 'Remplissez les champs manquants et assurez-vous que la liste de contrôle est complètement remplie.',
    archivedNotes: 'Notes Archivées',
    noArchivedNotes: 'Aucune note archivée',
    noteCreated: 'Note créée',
    noteArchived: 'Note archivée',
    fillRequiredFields: 'Remplissez les champs obligatoires suivants',
    regimeRequired: 'Le régime est requis',
    statusRequired: 'Le statut est requis',
    regime: 'Régime',
    status: 'Statut',
    phoneNumber: 'Numéro de téléphone',
    dateOfBirth: 'Date de naissance',
    expectedStartDate: 'Date de début prévue',
    placeOfBirth: 'Lieu de naissance',
    
    // Status
    atHome: 'À la maison',
    sick: 'Malade',
    outOfService: 'Hors service',
    toBeAssigned: 'À assigner',
    
    // Positions
    captain: 'Capitaine',
    firstMate: 'Premier officier',
    engineer: 'Mécanicien',
    deckhand: 'Matelot',
    cook: 'Cuisinier',
    reliefCrewMember: 'Relève',
    lightDeckhand: 'Matelot léger',
    deckman: 'Homme de pont',
    
    // Student types
    bbl: 'BBL',
    bol: 'BOL',
    
    // Statistics
    totalCrewMembers: 'Total membres d\'équipage',
    reliefCrewMembers: 'Relèves',
    sickMembers: 'Malades',
    newPersonnelMembers: 'Nouveau Personnel',
    outstandingLoans: 'Prêts en cours',
    oldEmployees: 'Anciens employés',
    
    // Forms
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    nationality: 'Nationalité',
    position: 'Poste',
    phone: 'Numéro de téléphone',
    email: 'E-mail',
    birthDate: 'Date de naissance',
    birthPlace: 'Lieu de naissance',
    startDate: 'Date de début',
    smoking: 'Fumeur',
    experience: 'Expérience',
    notes: 'Notes',
    
    // Student fields
    isStudent: 'Est étudiant',
    educationType: 'Type de formation',
    educationStartDate: 'Début de formation',
    educationEndDate: 'Fin de formation',
    schoolPeriods: 'Périodes scolaires',
    
    // Checklist
    contractSigned: 'Contrat de travail',
    registeredLuxembourg: 'Enregistré au Luxembourg',
    insured: 'Assuré',
    inServiceFrom: 'En service depuis',
    
    // Messages
    profileUpdated: 'Profil mis à jour avec succès!',
    memberAdded: 'Membre d\'équipage ajouté avec succès!',
    memberDeleted: 'Membre d\'équipage supprimé avec succès!',
    assignmentSuccessful: 'Attribution réussie!',
    statusUpdated: 'Statut mis à jour avec succès!',
    candidateAdded: 'Candidat ajouté avec succès!',
    tripCreated: 'Voyage créé avec succès!',
    reliefAssigned: 'Relève assignée avec succès!',
    onBoardReported: 'Relève signalée à bord avec succès!',
    tripCompleted: 'Voyage terminé avec succès!',
    recoveryRegistered: 'Récupération enregistrée avec succès!',
    sickLeaveRegistered: 'Arrêt maladie enregistré avec succès!',
    loanAdded: 'Prêt ajouté avec succès!',
    paymentProcessed: 'Paiement traité avec succès!',
    loanCompleted: 'Prêt terminé avec succès!',
    
    // Errors
    errorUpdatingProfile: 'Erreur lors de la mise à jour du profil',
    errorAddingMember: 'Erreur lors de l\'ajout du membre d\'équipage',
    errorDeletingMember: 'Erreur lors de la suppression du membre d\'équipage',
    errorAssignment: 'Erreur lors de l\'attribution',
    errorStatusUpdate: 'Erreur lors de la mise à jour du statut',
    errorAddingCandidate: 'Erreur lors de l\'ajout du candidat',
    errorCreatingTrip: 'Erreur lors de la création du voyage',
    errorAssigningRelief: 'Erreur lors de l\'assignation de la relève',
    errorReportingOnBoard: 'Erreur lors du signalement à bord',
    errorCompletingTrip: 'Erreur lors de la finalisation du voyage',
    errorRegisteringRecovery: 'Erreur lors de l\'enregistrement de la récupération',
    errorRegisteringSickLeave: 'Erreur lors de l\'enregistrement de l\'arrêt maladie',
    errorAddingLoan: 'Erreur lors de l\'ajout du prêt',
    errorProcessingPayment: 'Erreur lors du traitement du paiement',
    errorCompletingLoan: 'Erreur lors de la finalisation du prêt',
    
    // Validation
    firstNameRequired: 'Le prénom est requis',
    lastNameRequired: 'Le nom de famille est requis',
    nationalityRequired: 'La nationalité est requise',
    positionRequired: 'Le poste est requis',
    phoneRequired: 'Le numéro de téléphone est requis',
    birthDateRequired: 'La date de naissance est requise',
    startDateRequired: 'La date de début est requise',
    inServiceFromRequired: 'En service depuis est requis',
    educationTypeRequired: 'Le type de formation est requis pour les étudiants',
    educationStartDateRequired: 'Le début de formation est requis pour les étudiants BOL',
    educationEndDateRequired: 'La fin de formation est requise pour les étudiants BOL',
  },
}

export function getTranslation(locale: Locale, key: keyof Translations): string {
  return translations[locale][key] || translations.nl[key] || key
}
