import { PDFDocument } from 'pdf-lib'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export interface ContractData {
  firstName: string
  lastName: string
  birthDate: string
  birthPlace: string
  nationality: string
  address: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  phone: string
  email: string
  position: string
  company: string
  in_dienst_vanaf: string
  matricule?: string
  shipName?: string // Scheepsnaam
  in_dienst_tot?: string // Einddatum voor contract bepaalde tijd
  // Salaris velden (alleen voor contract, niet in systeem)
  basisSalaris?: string
  kledinggeld?: string
  reiskosten?: string
}

export interface ContractOptions {
  language: 'nl' | 'de'
  company: string
  contractType?: 'onbepaalde_tijd' | 'bepaalde_tijd' // Contract type
}

/**
 * Genereert een contract PDF op basis van de template en vult deze in met de crew member data
 */
export async function generateContract(
  contractData: ContractData,
  options: ContractOptions
): Promise<Blob> {
  try {
    // Bepaal het template bestand op basis van taal, firma en contract type
    const relativePath = getTemplatePath(options.language, options.company, options.contractType)
    
    // In de browser moeten we altijd een absolute URL gebruiken voor betrouwbaarheid
    // Dit werkt zowel lokaal als in productie (Vercel)
    let templatePath = relativePath
    if (typeof window !== 'undefined') {
      // We zijn in de browser - gebruik altijd absolute URL
      templatePath = `${window.location.origin}${relativePath}`
    }
    
    console.log('Loading PDF template from:', templatePath)
    
    // Fetch het template PDF bestand
    const templateResponse = await fetch(templatePath)
    if (!templateResponse.ok) {
      console.error(`Failed to load template: ${templatePath}`, {
        status: templateResponse.status,
        statusText: templateResponse.statusText,
        url: templateResponse.url
      })
      throw new Error(`Kon template niet laden: ${templatePath} (Status: ${templateResponse.status})`)
    }
    
    const templateBytes = await templateResponse.arrayBuffer()
    console.log(`Template loaded successfully, size: ${templateBytes.byteLength} bytes`)
    
    // Controleer of de PDF bytes geldig zijn
    if (templateBytes.byteLength === 0) {
      throw new Error('PDF template is leeg (0 bytes)')
    }
    
    // Controleer of het een geldige PDF is (moet beginnen met %PDF)
    const firstBytes = new Uint8Array(templateBytes.slice(0, 4))
    const pdfHeader = String.fromCharCode(...firstBytes)
    if (pdfHeader !== '%PDF') {
      console.error('⚠️ PDF header check failed. First 4 bytes:', pdfHeader)
      console.error('⚠️ Dit kan betekenen dat de PDF niet correct wordt geladen')
    } else {
      console.log('✓ PDF header check passed (geldige PDF)')
    }
    
    // Laad het PDF document
    console.log('Loading PDF document with pdf-lib...')
    const pdfDoc = await PDFDocument.load(templateBytes)
    console.log('✓ PDF document loaded successfully')
    
    // Probeer formuliervelden te krijgen
    let fieldsFilled = false
    let form: any = null
    let fields: any[] = []
    
    try {
      form = pdfDoc.getForm()
      fields = form.getFields()
      
      console.log('=== PDF ANALYSE ===')
      console.log('Aantal formuliervelden gevonden:', fields.length)
      
      if (fields.length > 0) {
        console.log('Formuliervelden gevonden:')
        fields.forEach((field: any, index: number) => {
          try {
            const fieldName = field.getName()
            const fieldType = field.constructor.name
            console.log(`  [${index + 1}] ${fieldName} (${fieldType})`)
          } catch (e) {
            console.log(`  [${index + 1}] <veld naam kon niet worden opgehaald> (${field.constructor.name})`)
          }
        })
        
        // Als er formuliervelden zijn, vul ze in
        try {
          console.log('=== START VELDEN INVULLEN ===')
          fillContractFields(form, contractData, options)
          
          // VERIFICATIE: Controleer of de velden daadwerkelijk zijn ingevuld
          console.log('=== VERIFICATIE VELDEN ===')
          let verifiedFilledCount = 0
          fields.forEach((field: any) => {
            try {
              if (field.constructor.name === 'PDFTextField') {
                const fieldValue = field.getText()
                const fieldName = field.getName()
                if (fieldValue && fieldValue.trim() !== '') {
                  verifiedFilledCount++
                  console.log(`✓ [${verifiedFilledCount}] Veld "${fieldName}" heeft waarde: "${fieldValue}"`)
                } else {
                  console.warn(`⚠️ Veld "${fieldName}" is nog steeds leeg na invullen`)
                }
              }
            } catch (e) {
              console.warn(`⚠️ Kon waarde van veld niet ophalen:`, e)
            }
          })
          
          if (verifiedFilledCount > 0) {
            fieldsFilled = true
            console.log(`✓ ${verifiedFilledCount} velden zijn daadwerkelijk ingevuld`)
          } else {
            console.error('❌ GEEN ENKEL VELD IS INGEVULD!')
            console.error('Dit betekent dat fillContractFields() de velden niet heeft kunnen invullen')
            fieldsFilled = false
          }
          
          if (fieldsFilled) {
            // Probeer bold font in te stellen na het invullen
            try {
              const helveticaBoldFont = await pdfDoc.embedFont('Helvetica-Bold')
              await setBoldFontForAllFields(fields, helveticaBoldFont, pdfDoc)
              console.log('✓ Bold font ingesteld')
            } catch (fontError) {
              console.warn('⚠️ Kon bold font niet instellen, maar velden zijn wel ingevuld:', fontError)
            }
            
            form.flatten()
            console.log('✓ Contract ingevuld en geflattened')
          }
        } catch (fillError) {
          console.error('❌ FOUT bij het invullen van formuliervelden:', fillError)
          console.error('Error details:', {
            message: fillError instanceof Error ? fillError.message : String(fillError),
            stack: fillError instanceof Error ? fillError.stack : undefined
          })
          fieldsFilled = false
        }
      } else {
        console.warn('⚠️ Geen formuliervelden gevonden in PDF')
        console.warn('Dit betekent dat de PDF geen AcroForm velden heeft')
        console.warn('De PDF moet formuliervelden hebben om automatisch ingevuld te worden')
      }
    } catch (error) {
      console.error('❌ FOUT bij het ophalen van formuliervelden:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      fieldsFilled = false
    }
    
    // Als er geen velden zijn ingevuld, gooi een duidelijke error
    if (!fieldsFilled) {
      const errorMsg = fields.length === 0 
        ? 'De PDF heeft geen formuliervelden. Zorg ervoor dat de PDF AcroForm velden bevat.'
        : 'De formuliervelden konden niet worden ingevuld. Controleer de console logs voor details.'
      
      console.error('❌', errorMsg)
      throw new Error(errorMsg)
    }
    
    // Genereer de PDF bytes
    const pdfBytes = await pdfDoc.save()
    
    // Maak een Blob van de PDF bytes
    // pdfBytes is al een Uint8Array, wat direct gebruikt kan worden in Blob
    return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  } catch (error) {
    console.error('Error generating contract:', error)
    throw new Error(`Fout bij het genereren van het contract: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
  }
}

/**
 * Bepaalt het pad naar het template bestand op basis van taal, firma en contract type
 */
function getTemplatePath(language: 'nl' | 'de', company: string, contractType?: 'onbepaalde_tijd' | 'bepaalde_tijd'): string {
  const langCode = language === 'nl' ? 'nl' : 'de'
  
  // Voor Nederlandse contracten
  if (language === 'nl') {
    // Contract voor bepaalde tijd
    if (contractType === 'bepaalde_tijd') {
      return '/contracts/bamalite-s.a.-nl - Bepaalde tijd.pdf'
    }
    // Contract voor onbepaalde tijd (default)
    return '/contracts/bamalite-s.a.-nl.pdf'
  }
  
  // Voor Duitse contracten: gebruik hetzelfde template voor alle firma's
  // De firma naam en firma nummer worden automatisch ingevuld op basis van de selectie
  if (language === 'de') {
    // Later kunnen we ook Duitse contracten voor bepaalde tijd toevoegen
    return '/contracts/bamalite-s.a.-de.pdf'
  }
  
  // Fallback (zou niet moeten voorkomen)
  const companySlug = company
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/\./g, '')
  
  return `/contracts/${companySlug}-${langCode}.pdf`
}

/**
 * Stelt bold font in voor alle formuliervelden
 */
async function setBoldFontForAllFields(fields: any[], boldFont: any, pdfDoc: PDFDocument) {
  // Haal de font naam op die we moeten gebruiken
  const fontName = 'Helvetica-Bold'
  
  fields.forEach((field: any) => {
    try {
      if (field.constructor.name === 'PDFTextField') {
        const fieldName = field.getName()
        const acroField = (field as any).acroField
        
        if (acroField && acroField.dict) {
          try {
            // Probeer de bestaande font size te vinden uit de DA string
            let fontSize = 12 // Default
            const existingDA = acroField.dict.lookup('DA')
            if (existingDA) {
              const daString = existingDA.toString()
              const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
              if (sizeMatch) {
                fontSize = parseFloat(sizeMatch[1])
              }
            }
            
            // Stel DA (Default Appearance) in met bold font
            // Format: /FontName Size Tf Color
            acroField.dict.set('DA', `/${fontName} ${fontSize} Tf 0 g`)
            
            // Probeer ook de appearance stream te updaten
            try {
              // Forceer update van de appearance na het instellen van de tekst
              if (typeof field.updateAppearances === 'function') {
                field.updateAppearances(boldFont)
              }
            } catch (e) {
              // Negeer als updateAppearances niet werkt
            }
            
            console.log(`✓ Bold font ingesteld voor veld "${fieldName}" (fontSize: ${fontSize})`)
          } catch (error) {
            console.warn(`Kon bold font niet instellen voor veld ${fieldName}:`, error)
          }
        }
      }
    } catch (error) {
      console.warn(`Fout bij instellen bold font voor veld:`, error)
    }
  })
}

/**
 * Vult de formuliervelden in het PDF contract in
 */
function fillContractFields(
  form: any,
  data: ContractData,
  options: ContractOptions
) {
  try {
    // Probeer de velden in te vullen op basis van veelvoorkomende veldnamen
    // Dit moet worden aangepast op basis van de werkelijke veldnamen in het PDF
    
    const companyNumber = getCompanyNumber(data.company)
    
    const fieldMappings: Record<string, string> = {
      // Persoonlijke gegevens
      'voornaam': data.firstName,
      'achternaam': data.lastName,
      'naam': `${data.firstName} ${data.lastName}`,
      'volledigenaam': `${data.firstName} ${data.lastName}`,
      'geboortedatum': formatDate(data.birthDate),
      'geboorteplaats': data.birthPlace || '',
      'nationaliteit': getNationalityLabel(data.nationality),
      'adres': `${data.address.street}, ${data.address.postalCode} ${data.address.city}, ${data.address.country}`,
      'straat': data.address.street,
      'postcode': data.address.postalCode,
      'plaats': data.address.city,
      'land': data.address.country,
      'telefoon': data.phone || '',
      'email': data.email || '',
      'functie': data.position,
      'positie': data.position,
      'bedrijf': data.company,
      'firma': data.company,
      'firmanummer': companyNumber,
      'firmanr': companyNumber,
      'bedrijfsnummer': companyNumber,
      'indiensttreding': (() => {
        const formatted = formatDate(data.in_dienst_vanaf)
        console.log('Indiensttreding datum:', { original: data.in_dienst_vanaf, formatted })
        return formatted
      })(),
      'in_dienst_vanaf': (() => {
        const formatted = formatDate(data.in_dienst_vanaf)
        console.log('In dienst vanaf datum:', { original: data.in_dienst_vanaf, formatted })
        return formatted
      })(),
      // Proeftijd einddatum (3 maanden na indiensttreding) - BEREKEN EERST
      'proeftijd_einddatum': (() => {
        if (!data.in_dienst_vanaf) return ''
        const calculated = calculateDatePlus3Months(data.in_dienst_vanaf)
        console.log('Proeftijd einddatum berekend:', { 
          original: data.in_dienst_vanaf, 
          calculated 
        })
        return calculated
      })(),
      'in_dienst_vanaf_3maanden': (() => {
        if (!data.in_dienst_vanaf) return ''
        const calculated = calculateDatePlus3Months(data.in_dienst_vanaf)
        console.log('Proeftijd einddatum (in_dienst_vanaf_3maanden):', { 
          original: data.in_dienst_vanaf, 
          calculated 
        })
        return calculated
      })(),
      'in_dienst_vanaf_plus_3maanden': (() => {
        if (!data.in_dienst_vanaf) return ''
        const calculated = calculateDatePlus3Months(data.in_dienst_vanaf)
        console.log('Proeftijd einddatum (in_dienst_vanaf_plus_3maanden):', { 
          original: data.in_dienst_vanaf, 
          calculated 
        })
        return calculated
      })(),
      // Alternatieve veldnamen voor proeftijd
      'proeftijd': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
      'proeftijd_datum': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
      'einddatum_proeftijd': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
      // Einddatum voor contract bepaalde tijd
      'in_dienst_tot': data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '',
      'einddatum': data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '',
      'contract_einddatum': data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '',
      'matricule': data.matricule || '',
      // Scheepsnaam
      'scheepsnaam': data.shipName || '',
      'schip': data.shipName || '',
      'scheep': data.shipName || '',
      // Datums
      'datum': format(new Date(), 'dd-MM-yyyy', { locale: nl }),
      'vandaag': format(new Date(), 'dd-MM-yyyy', { locale: nl }),
      'huidigedatum': format(new Date(), 'dd-MM-yyyy', { locale: nl }),
      'contractdatum': format(new Date(), 'dd-MM-yyyy', { locale: nl }),
      'datum_opmaken': format(new Date(), 'dd-MM-yyyy', { locale: nl }), // Contractdatum
      'datumopmaken': format(new Date(), 'dd-MM-yyyy', { locale: nl }),
      'opmaakdatum': format(new Date(), 'dd-MM-yyyy', { locale: nl }),
      'datum_opmak': format(new Date(), 'dd-MM-yyyy', { locale: nl }), // Alternatieve spelling
      // Salaris velden
      'basissalaris': data.basisSalaris || '',
      'salaris': data.basisSalaris || '',
      'kledinggeld': data.kledinggeld || '',
      'reiskosten': data.reiskosten || '',
    }
    
    // Probeer alle velden in het formulier te vinden en in te vullen
    const fields = form.getFields()
    
    console.log('=== START PDF INVULLEN ===')
    console.log('Contract Data:', JSON.stringify(data, null, 2))
    console.log('Contract Options:', JSON.stringify(options, null, 2))
    console.log('Aantal velden om te verwerken:', fields.length)
    
    let filledCount = 0
    
    fields.forEach((field: any) => {
      const fieldName = field.getName().toLowerCase().trim()
      
      // Eerst proberen exacte match
      if (fieldMappings[fieldName]) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              // Stel bold font in VOOR het invullen van de tekst
              try {
                const acroField = (field as any).acroField
                if (acroField && acroField.dict) {
                  // Haal bestaande font size op
                  let fontSize = 12
                  const existingDA = acroField.dict.lookup('DA')
                  if (existingDA) {
                    const daString = existingDA.toString()
                    const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
                    if (sizeMatch) {
                      fontSize = parseFloat(sizeMatch[1])
                    }
                  }
                  // Stel DA in met bold font
                  acroField.dict.set('DA', `/Helvetica-Bold ${fontSize} Tf 0 g`)
                }
              } catch (fontError) {
                console.warn(`Kon bold font niet instellen voor veld ${fieldName}:`, fontError)
              }
              
              // Vul nu de tekst in
              field.setText(fieldMappings[fieldName])
              
              // Probeer de alignment in te stellen voor gecentreerde velden
              // Alleen als het veld daadwerkelijk gecentreerd moet zijn
              // We respecteren de alignment die in het PDF is ingesteld voor andere velden
              try {
                const centerFields = ['volledigenaam', 'naam', 'voornaam', 'achternaam', 'firma', 'bedrijf']
                if (centerFields.some(cf => fieldName.includes(cf))) {
                  // Check eerst wat de huidige alignment is
                  const acroField = (field as any).acroField
                  if (acroField && acroField.dict) {
                    const q = acroField.dict.lookup('Q') // Q = Quadding (alignment)
                    // Als er geen alignment is ingesteld, of als het al gecentreerd is, stel het in
                    if (q === undefined || q === null || q === 1) {
                      if (typeof (field as any).setAlignment === 'function') {
                        (field as any).setAlignment(1) // 1 = center
                        console.log(`✓ Veld "${field.getName()}" uitlijning ingesteld op gecentreerd`)
                      }
                    } else {
                      console.log(`✓ Veld "${field.getName()}" behoudt bestaande uitlijning (${q})`)
                    }
                  }
                }
              } catch (alignError) {
                console.warn(`Kon uitlijning niet instellen voor veld ${fieldName}:`, alignError)
              }
              
              filledCount++
              console.log(`✓ [${filledCount}] Veld "${field.getName()}" (exact match) ingevuld met: "${fieldMappings[fieldName]}"`)
          } else if (field.constructor.name === 'PDFCheckBox') {
            const value = fieldMappings[fieldName]
            if (value === 'true' || value === 'ja' || value === 'yes') {
              field.check()
              console.log(`✓ Checkbox "${field.getName()}" aangevinkt`)
            }
          }
          return // Stop hier, exacte match gevonden
        } catch (err) {
          console.warn(`Kon veld ${fieldName} niet invullen (exact match):`, err)
        }
      }
      
      // Als geen exacte match, probeer partial match
      // Sorteer keys op lengte (langste eerst) zodat specifiekere matches prioriteit krijgen
      // Bijvoorbeeld: "in_dienst_vanaf_3maanden" moet matcht voordat "in_dienst_vanaf" matcht
      const sortedKeys = Object.entries(fieldMappings).sort((a, b) => b[0].length - a[0].length)
      
      for (const [key, value] of sortedKeys) {
        // Probeer verschillende matching strategieën
        const keyLower = key.toLowerCase()
        
        // Skip als dit al exact gematcht is
        if (fieldName === keyLower) {
          continue
        }
        
        // Check verschillende matching strategieën
        // Belangrijk: omdat we gesorteerd hebben op lengte (langste eerst),
        // zal "in_dienst_vanaf_3maanden" eerst worden gecheckt voordat "in_dienst_vanaf"
        const matches = 
          fieldName.includes(keyLower) || // Field name bevat de key (langste keys eerst!)
          keyLower.includes(fieldName) || // Key bevat de field name
          fieldName.replace(/[^a-z0-9]/g, '') === keyLower.replace(/[^a-z0-9]/g, '') // Zonder speciale tekens
        
        if (matches) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              // Stel bold font in VOOR het invullen van de tekst
              try {
                const acroField = (field as any).acroField
                if (acroField && acroField.dict) {
                  // Haal bestaande font size op
                  let fontSize = 12
                  const existingDA = acroField.dict.lookup('DA')
                  if (existingDA) {
                    const daString = existingDA.toString()
                    const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
                    if (sizeMatch) {
                      fontSize = parseFloat(sizeMatch[1])
                    }
                  }
                  // Stel DA in met bold font
                  acroField.dict.set('DA', `/Helvetica-Bold ${fontSize} Tf 0 g`)
                }
              } catch (fontError) {
                console.warn(`Kon bold font niet instellen voor veld ${fieldName}:`, fontError)
              }
              
              // Vul nu de tekst in
              console.log(`  → Probeer veld "${field.getName()}" in te vullen met partial match "${key}": "${value}"`)
              
              try {
                field.setText(value)
                
                // VERIFICATIE: Controleer direct of de waarde is ingesteld
                const verifyValue = field.getText()
                if (verifyValue === value || verifyValue === value.trim()) {
                  console.log(`  ✓ Veld "${field.getName()}" succesvol ingevuld met: "${verifyValue}"`)
                } else {
                  console.warn(`  ⚠️ Veld "${field.getName()}" heeft andere waarde. Verwacht: "${value}", Krijg: "${verifyValue}"`)
                }
              } catch (setTextError) {
                console.error(`  ❌ FOUT bij setText voor veld "${field.getName()}":`, setTextError)
                throw setTextError
              }
              
              // Probeer de alignment in te stellen voor gecentreerde velden
              // Alleen als het veld daadwerkelijk gecentreerd moet zijn
              // We respecteren de alignment die in het PDF is ingesteld voor andere velden
              try {
                const centerFields = ['volledigenaam', 'naam', 'voornaam', 'achternaam', 'firma', 'bedrijf']
                if (centerFields.some(cf => fieldName.includes(cf) || key.includes(cf))) {
                  // Check eerst wat de huidige alignment is
                  const acroField = (field as any).acroField
                  if (acroField && acroField.dict) {
                    const q = acroField.dict.lookup('Q') // Q = Quadding (alignment)
                    // Als er geen alignment is ingesteld, of als het al gecentreerd is, stel het in
                    if (q === undefined || q === null || q === 1) {
                      if (typeof (field as any).setAlignment === 'function') {
                        (field as any).setAlignment(1) // 1 = center
                        console.log(`✓ Veld "${field.getName()}" uitlijning ingesteld op gecentreerd`)
                      }
                    } else {
                      console.log(`✓ Veld "${field.getName()}" behoudt bestaande uitlijning (${q})`)
                    }
                  }
                }
              } catch (alignError) {
                // Als alignment niet kan worden ingesteld, negeer de fout
                console.warn(`Kon uitlijning niet instellen voor veld ${fieldName}:`, alignError)
              }
              
              filledCount++
              console.log(`✓ [${filledCount}] Veld "${field.getName()}" (partial match: "${key}") ingevuld met: "${value}"`)
            } else if (field.constructor.name === 'PDFCheckBox') {
              if (value === 'true' || value === 'ja' || value === 'yes') {
                field.check()
                console.log(`✓ Checkbox "${field.getName()}" aangevinkt`)
              }
            }
            break // Stop bij eerste match
          } catch (err) {
            console.warn(`Kon veld ${fieldName} niet invullen (partial match met "${key}"):`, err)
          }
        }
      }
    })
    
    console.log(`=== EINDE PDF INVULLEN ===`)
    console.log(`Totaal ${filledCount} van ${fields.length} velden ingevuld`)
  } catch (error) {
    console.error('Error filling contract fields:', error)
    // We gooien de fout niet door, zodat het PDF nog steeds wordt gegenereerd
    // zelfs als sommige velden niet kunnen worden ingevuld
  }
}

/**
 * Vult het PDF contract in met tekst op specifieke posities (voor PDF's zonder formuliervelden)
 * 
 * BELANGRIJK: Deze functie moet worden aangepast op basis van de werkelijke posities in het PDF.
 * Je moet eerst het PDF analyseren om te bepalen waar de velden zich bevinden.
 */
async function fillContractWithText(
  pdfDoc: PDFDocument,
  data: ContractData,
  options: ContractOptions
) {
  try {
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()
    
    // Haal het standaard lettertype op
    const helveticaFont = await pdfDoc.embedFont('Helvetica')
    
    // BELANGRIJK: Deze coördinaten moeten worden aangepast op basis van je PDF template!
    // De coördinaten zijn in punten, waarbij (0,0) linksonder is.
    // Je moet het PDF openen en de exacte posities bepalen waar de tekst moet komen.
    
    const fontSize = 10
    
    // Voorbeeld posities (moeten worden aangepast!)
    // Naam
    firstPage.drawText(`${data.firstName} ${data.lastName}`, {
      x: 100,
      y: height - 150,
      size: fontSize,
      font: helveticaFont,
    })
    
    // Geboortedatum
    firstPage.drawText(format(new Date(data.birthDate), 'dd-MM-yyyy', { locale: nl }), {
      x: 100,
      y: height - 170,
      size: fontSize,
      font: helveticaFont,
    })
    
    // Geboorteplaats
    if (data.birthPlace) {
      firstPage.drawText(data.birthPlace, {
        x: 250,
        y: height - 170,
        size: fontSize,
        font: helveticaFont,
      })
    }
    
    // Adres
    firstPage.drawText(`${data.address.street}`, {
      x: 100,
      y: height - 190,
      size: fontSize,
      font: helveticaFont,
    })
    firstPage.drawText(`${data.address.postalCode} ${data.address.city}`, {
      x: 100,
      y: height - 210,
      size: fontSize,
      font: helveticaFont,
    })
    
    // Functie
    firstPage.drawText(data.position, {
      x: 100,
      y: height - 230,
      size: fontSize,
      font: helveticaFont,
    })
    
    // Indiensttreding
    firstPage.drawText(format(new Date(data.in_dienst_vanaf), 'dd-MM-yyyy', { locale: nl }), {
      x: 100,
      y: height - 250,
      size: fontSize,
      font: helveticaFont,
    })
    
    // Salaris velden (als aanwezig)
    if (data.basisSalaris) {
      firstPage.drawText(`€ ${data.basisSalaris}`, {
        x: 100,
        y: height - 270,
        size: fontSize,
        font: helveticaFont,
      })
    }
    
    if (data.kledinggeld) {
      firstPage.drawText(`€ ${data.kledinggeld}`, {
        x: 100,
        y: height - 290,
        size: fontSize,
        font: helveticaFont,
      })
    }
    
    if (data.reiskosten) {
      firstPage.drawText(`€ ${data.reiskosten}`, {
        x: 100,
        y: height - 310,
        size: fontSize,
        font: helveticaFont,
      })
    }
    
    console.log('Tekst toegevoegd aan PDF op specifieke posities')
  } catch (error) {
    console.error('Error filling contract with text:', error)
    throw error
  }
}

/**
 * Berekent een datum + 3 maanden
 */
function calculateDatePlus3Months(dateString: string): string {
  if (!dateString) {
    console.warn('calculateDatePlus3Months: Lege datum string')
    return ''
  }
  
  try {
    console.log('calculateDatePlus3Months input:', dateString)
    
    // Parse de datum - gebruik dezelfde logica als formatDate
    let date: Date
    if (dateString.includes('-')) {
      const parts = dateString.split('-')
      if (parts.length === 3) {
        // yyyy-MM-dd formaat (van HTML date input)
        if (parts[0].length === 4) {
          const year = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1 // Maanden zijn 0-indexed
          const day = parseInt(parts[2])
          date = new Date(year, month, day)
          console.log('Parsed yyyy-MM-dd:', { year, month: month + 1, day, date: date.toISOString() })
        } else {
          // dd-MM-yyyy formaat
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const year = parseInt(parts[2])
          date = new Date(year, month, day)
          console.log('Parsed dd-MM-yyyy:', { year, month: month + 1, day, date: date.toISOString() })
        }
      } else {
        date = new Date(dateString)
      }
    } else {
      date = new Date(dateString)
    }
    
    // Controleer of de datum geldig is
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString)
      return ''
    }
    
    // Voeg 3 maanden toe
    const originalMonth = date.getMonth()
    date.setMonth(date.getMonth() + 3)
    
    // Als de dag niet bestaat in de nieuwe maand (bijv. 31 januari -> 31 april bestaat niet)
    // Dan wordt de datum automatisch aangepast naar de laatste dag van de maand
    if (date.getMonth() !== (originalMonth + 3) % 12) {
      // De datum is aangepast, zet terug naar laatste dag van de juiste maand
      date.setDate(0) // Gaat naar laatste dag van vorige maand
    }
    
    // Formatteer naar dd-MM-yyyy
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    
    const result = `${day}-${month}-${year}`
    console.log('calculateDatePlus3Months result:', result)
    return result
  } catch (error) {
    console.error('Error calculating date + 3 months:', dateString, error)
    return ''
  }
}

/**
 * Formatteert een datum string (yyyy-MM-dd) naar dd-MM-yyyy formaat
 * Voorkomt timezone problemen door de datum direct te parsen
 */
function formatDate(dateString: string): string {
  if (!dateString) {
    console.warn('formatDate: Lege datum string ontvangen')
    return ''
  }
  
  try {
    console.log('formatDate input:', dateString)
    
    // Als de datum al in dd-MM-yyyy formaat is, return direct
    if (dateString.includes('-')) {
      const parts = dateString.split('-')
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2) {
        console.log('formatDate: Datum al in dd-MM-yyyy formaat, return direct')
        return dateString
      }
    }
    
    // Parse yyyy-MM-dd formaat (van HTML date input)
    const parts = dateString.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      const formatted = `${day}-${month}-${year}`
      console.log('formatDate: Geconverteerd van yyyy-MM-dd naar dd-MM-yyyy:', formatted)
      return formatted
    }
    
    // Fallback: gebruik date-fns format
    const fallback = format(new Date(dateString + 'T12:00:00'), 'dd-MM-yyyy', { locale: nl })
    console.log('formatDate: Fallback gebruikt:', fallback)
    return fallback
  } catch (error) {
    console.error('Error formatting date:', dateString, error)
    return dateString
  }
}

/**
 * Converteert nationaliteit code naar label
 */
function getNationalityLabel(code: string): string {
  const nationalityMap: Record<string, string> = {
    'NL': 'Nederlands',
    'CZ': 'Tsjechisch',
    'SLK': 'Slowaaks',
    'EG': 'Egyptisch',
    'PO': 'Pools',
    'SERV': 'Servisch',
    'HUN': 'Hongaars',
    'BE': 'Belgisch',
    'FR': 'Frans',
    'DE': 'Duits',
    'LUX': 'Luxemburgs',
    'RO': 'Roemeens',
  }
  
  return nationalityMap[code] || code
}

/**
 * Haalt het firma nummer op op basis van de firma naam
 */
function getCompanyNumber(company: string): string {
  const companyNumberMap: Record<string, string> = {
    'Bamalite S.A.': 'B 44356',
    'Alcina S.A.': 'B 129072',
    'Europe Shipping AG.': 'B 83558',
    'Brugo Shipping SARL.': 'B 277323',
    'Devel Shipping S.A.': 'B 139046',
  }
  
  return companyNumberMap[company] || ''
}

/**
 * Download het gegenereerde contract
 */
export function downloadContract(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

