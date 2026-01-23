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

export interface AddendumData {
  firstName: string
  lastName: string
  birthDate: string
  birthPlace: string
  address: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  oldCompany: string // Voormalige firma
  newCompany: string // Nieuwe firma
  inDienstVanafEersteWerkgever: string // in dienst vanaf bij eerste werkgever
  wisselingDate: string // Datum van wisseling
  addendumDate: string // Datum van aanmaken addendum
}

/**
 * Normaliseert tekst voor PDF-velden door Unicode-karakters te vervangen met ASCII-equivalenten
 * Dit voorkomt encoding errors met WinAnsi encoding die niet alle Unicode-karakters ondersteunt
 */
function normalizeTextForPDF(text: string): string {
  if (!text) return text
  
  // Unicode normalisatie: vervang speciale karakters met ASCII-equivalenten
  return text
    .normalize('NFD') // Decomposeer Unicode-karakters (bijv. č -> c + ˇ)
    .replace(/[\u0300-\u036f]/g, '') // Verwijder diakritische tekens (accents)
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Vervang overige niet-ASCII karakters met ASCII-equivalenten
      const replacements: Record<string, string> = {
        'č': 'c', 'ć': 'c', 'Č': 'C', 'Ć': 'C',
        'š': 's', 'Š': 'S',
        'ž': 'z', 'Ž': 'Z',
        'đ': 'd', 'Đ': 'D',
        'ñ': 'n', 'Ñ': 'N',
        'ü': 'u', 'Ü': 'U',
        'ö': 'o', 'Ö': 'O',
        'ä': 'a', 'Ä': 'A',
        'ÿ': 'y', 'Ÿ': 'Y',
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o',
        'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O',
        'ù': 'u', 'ú': 'u', 'û': 'u',
        'Ù': 'U', 'Ú': 'U', 'Û': 'U',
        'ý': 'y', 'Ý': 'Y',
        'æ': 'ae', 'Æ': 'AE',
        'œ': 'oe', 'Œ': 'OE',
        'ß': 'ss',
      }
      return replacements[char] || char
    })
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
          // Embed bold font eerst zodat we het kunnen gebruiken
          let helveticaBoldFont: any = null
          try {
            helveticaBoldFont = await pdfDoc.embedFont('Helvetica-Bold')
            console.log('✓ Helvetica-Bold font geëmbed')
          } catch (fontError) {
            console.warn('⚠️ Kon Helvetica-Bold font niet embedden:', fontError)
          }
          fillContractFields(form, contractData, options, helveticaBoldFont)
          
          // VERIFICATIE: Controleer of de velden daadwerkelijk zijn ingevuld (VOOR flatten)
          console.log('=== VERIFICATIE VELDEN (voor flatten) ===')
          let verifiedFilledCount = 0
          fields.forEach((field: any) => {
            try {
              const isTextField = field.constructor.name === 'PDFTextField' || 
                                  field.constructor.name === 'e' ||
                                  typeof (field as any).setText === 'function'
              if (isTextField) {
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
            console.log(`✓ ${verifiedFilledCount} velden zijn daadwerkelijk ingevuld (voor flatten)`)
          } else {
            console.error('❌ GEEN ENKEL VELD IS INGEVULD!')
            console.error('Dit betekent dat fillContractFields() de velden niet heeft kunnen invullen')
            fieldsFilled = false
          }
          
          if (fieldsFilled) {
            // Bold font is al ingesteld in fillContractFields, maar we kunnen het nog een keer proberen
            // voor het geval dat sommige velden gemist zijn
            try {
              if (!helveticaBoldFont) {
                helveticaBoldFont = await pdfDoc.embedFont('Helvetica-Bold')
              }
              await setBoldFontForAllFields(fields, helveticaBoldFont, pdfDoc)
              console.log('✓ Bold font definitief ingesteld voor alle velden')
            } catch (fontError) {
              console.warn('⚠️ Kon bold font niet instellen, maar velden zijn wel ingevuld:', fontError)
            }
            
            // Stel alignment expliciet in voor alle velden VOOR flattenen
            // Dit moet gebeuren NA bold font instellen zodat beide behouden blijven
            try {
              await setAlignmentForAllFields(fields, helveticaBoldFont)
              console.log('✓ Alignment definitief ingesteld voor alle velden (met behoud van bold font)')
              
              // Extra stap: forceer alignment opnieuw vlak voor flatten()
              // Dit is belangrijk omdat sommige operaties de alignment kunnen resetten
              await setAlignmentForAllFields(fields, helveticaBoldFont)
              console.log('✓ Alignment opnieuw gecontroleerd en ingesteld vlak voor flatten()')
            } catch (alignError) {
              console.warn('⚠️ Kon alignment niet instellen:', alignError)
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
 * Stelt alignment in voor alle formuliervelden (centreren voor firma_centreren en werknemer_centreren, links voor anderen)
 * Deze functie wordt aangeroepen NA bold font instellen maar VOOR flattenen
 * Belangrijk: deze functie behoudt de bold font die al is ingesteld
 * @param isAddendum - Als true, worden alle velden links uitgelijnd (geen centreren voor regel1/regel2)
 */
async function setAlignmentForAllFields(fields: any[], boldFont?: any, isAddendum: boolean = false) {
  fields.forEach((field: any) => {
    try {
      const isTextField = field.constructor.name === 'PDFTextField' || 
                          field.constructor.name === 'e' ||
                          typeof (field as any).setText === 'function'
      
      if (isTextField) {
        const originalFieldName = field.getName()
        const fieldNameNormalized = originalFieldName
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '')
          .replace(/[+]/g, 'plus')
          .replace(/[^a-z0-9_]/g, '')
        
        const fieldNamePlain = originalFieldName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')

        // Voor Addendum: alle velden links uitgelijnd
        // Voor contracten: regel1 en regel2 gecentreerd, alle andere links
        const needsCenter = isAddendum ? false : (
          fieldNameNormalized === 'regel1' ||
          fieldNameNormalized === 'regel2' ||
          fieldNamePlain === 'regel1' ||
          fieldNamePlain === 'regel2' ||
          // Backward compatibility met oude veldnamen
          fieldNameNormalized === 'firma_centreren' ||
          fieldNameNormalized === 'werknemer_centreren' ||
          fieldNamePlain === 'firmacentreren' ||
          fieldNamePlain === 'werknemercentreren'
        )

        const acroField = (field as any).acroField
        if (acroField && acroField.dict) {
          const alignmentValue = needsCenter ? 1 : 0 // 0 = left, 1 = center, 2 = right
          
          // Stel Q (Quadding) in - dit bepaalt de tekstuitlijning
          // Dit is de belangrijkste stap voor alignment
          acroField.dict.set('Q', alignmentValue)
          
          // Behoud de bestaande DA (Default Appearance) string - overschrijf alleen als nodig
          // Dit zorgt ervoor dat de bold font behouden blijft
          try {
            const existingDA = acroField.dict.lookup('DA')
            let fontSize = 12
            let fontName = 'Helvetica-Bold' // Default naar bold
            
            if (existingDA) {
              const daString = existingDA.toString()
              // Haal font size op
              const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
              if (sizeMatch) {
                fontSize = parseFloat(sizeMatch[1])
              }
              // Check of er al een font is ingesteld (behoud deze)
              const fontMatch = daString.match(/\/([A-Za-z0-9\-]+)\s+\d+/)
              if (fontMatch) {
                fontName = fontMatch[1]
              }
            }
            // Update DA string met behoud van font maar met juiste alignment via Q
            acroField.dict.set('DA', `/${fontName} ${fontSize} Tf 0 g`)
            
            // Verifieer dat Q correct is ingesteld
            const verifyQ = acroField.dict.lookup('Q')
            if (!verifyQ || verifyQ.toString() !== alignmentValue.toString()) {
              console.warn(`⚠️ Q waarde niet correct voor "${originalFieldName}", opnieuw instellen...`)
              acroField.dict.set('Q', alignmentValue)
            }
          } catch (daError) {
            console.warn(`Kon DA niet instellen voor veld "${originalFieldName}":`, daError)
          }
          
          console.log(`✓ Alignment op ${needsCenter ? 'center' : 'links'} gezet voor veld "${originalFieldName}" (Q=${alignmentValue})`)
        }

        // Probeer ook setAlignment functie als die beschikbaar is (pdf-lib API)
        // Dit is belangrijk omdat sommige versies van pdf-lib deze methode gebruiken
        if (typeof (field as any).setAlignment === 'function') {
          try {
            const alignmentValue = needsCenter ? 1 : 0
            ;(field as any).setAlignment(alignmentValue)
            console.log(`✓ setAlignment(${alignmentValue}) aangeroepen voor veld "${originalFieldName}"`)
            
            // Verifieer dat de alignment correct is ingesteld
            try {
              const currentAlignment = (field as any).getAlignment?.()
              if (currentAlignment !== undefined && currentAlignment !== alignmentValue) {
                console.warn(`⚠️ Alignment mismatch voor "${originalFieldName}": verwacht ${alignmentValue}, kreeg ${currentAlignment}`)
                // Probeer opnieuw
                ;(field as any).setAlignment(alignmentValue)
              }
            } catch (verifyError) {
              // getAlignment bestaat mogelijk niet, dat is ok
            }
          } catch (alignError) {
            console.warn(`setAlignment faalde voor veld "${originalFieldName}":`, alignError)
          }
        }
        
        // Forceer update van appearance met bold font EN alignment
        // Dit is cruciaal om ervoor te zorgen dat de alignment behouden blijft na flatten()
        try {
          const currentValue = field.getText()
          if (currentValue) {
            // Eerst: stel Q (Quadding) opnieuw in om zeker te zijn
            if (acroField && acroField.dict) {
              const alignmentValue = needsCenter ? 1 : 0
              acroField.dict.set('Q', alignmentValue)
              
              // Update de appearance stream expliciet
              // Dit zorgt ervoor dat de alignment wordt toegepast in de visuele weergave
              try {
                // Forceer update door de tekst opnieuw in te stellen
                // Dit triggert een regeneratie van de appearance stream met de juiste alignment
                field.setText('') // Leeg eerst
                field.setText(currentValue) // Vul opnieuw in
                
                // Stel Q opnieuw in na setText (soms wordt het gereset)
                acroField.dict.set('Q', alignmentValue)
                
                // Update appearance met bold font als beschikbaar
                if (boldFont && typeof (field as any).updateAppearances === 'function') {
                  (field as any).updateAppearances(boldFont)
                }
                
                // Verifieer dat Q nog steeds correct is ingesteld
                const verifyQ = acroField.dict.lookup('Q')
                if (verifyQ && verifyQ.toString() !== alignmentValue.toString()) {
                  console.warn(`⚠️ Q waarde werd gereset voor "${originalFieldName}", opnieuw instellen...`)
                  acroField.dict.set('Q', alignmentValue)
                }
              } catch (appearanceError) {
                console.warn(`Kon appearance stream niet updaten voor "${originalFieldName}":`, appearanceError)
              }
            }
          }
        } catch (e) {
          console.warn(`Kon appearance niet updaten voor veld "${originalFieldName}":`, e)
        }
      }
    } catch (error) {
      console.warn(`Fout bij instellen alignment voor veld:`, error)
    }
  })
}

/**
 * Stelt bold font in voor alle formuliervelden
 */
async function setBoldFontForAllFields(fields: any[], boldFont: any, pdfDoc: PDFDocument) {
  // Haal de font naam op die we moeten gebruiken
  const fontName = 'Helvetica-Bold'
  
  fields.forEach((field: any) => {
    try {
      // Check of het een text field is - pdf-lib gebruikt mogelijk andere constructor namen
      const isTextField = field.constructor.name === 'PDFTextField' || 
                          field.constructor.name === 'e' ||
                          typeof (field as any).setText === 'function'
      
      if (isTextField) {
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
                console.log(`✓ updateAppearances() aangeroepen voor veld "${fieldName}"`)
              } else {
                // Als updateAppearances niet bestaat, probeer de appearance handmatig te updaten
                const fieldValue = field.getText()
                if (fieldValue) {
                  // Herstel de tekst om de appearance te forceren
                  field.setText(fieldValue)
                }
              }
            } catch (e) {
              console.warn(`Kon appearance niet updaten voor veld ${fieldName}:`, e)
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
  options: ContractOptions,
  boldFont?: any
) {
  try {
    // Probeer de velden in te vullen op basis van veelvoorkomende veldnamen
    // Dit moet worden aangepast op basis van de werkelijke veldnamen in het PDF
    
    const companyNumber = getCompanyNumber(data.company)
    const fullName = `${data.firstName} ${data.lastName}`
    const address = `${data.address.street}, ${data.address.postalCode} ${data.address.city}, ${data.address.country}`
    const currentDate = format(new Date(), 'dd-MM-yyyy', { locale: nl })
    
    // Nieuwe veldnamen: regel1 tot regel19
    const fieldMappings: Record<string, string> = {
      // Nieuwe regel-gebaseerde veldnamen
      'regel1': data.company, // Firma - Gecentreerd
      'regel2': fullName, // Volledige naam - Gecentreerd
      'regel3': data.company, // Firma - Links
      'regel4': companyNumber, // Firmanummer - Links
      'regel5': fullName, // volledige naam - Links
      'regel6': formatDate(data.birthDate), // geboortedatum - Links
      'regel7': data.birthPlace || '', // Geboorteplaats - Links
      'regel8': address, // Adres - Links
      'regel9': formatDate(data.in_dienst_vanaf), // in dienst vanaf - Links
      'regel10': data.position, // Functie - Links
      'regel11': data.shipName || '', // Scheepsnaam - Links
      // Regel12-regel21 verschillen per contract type en taal:
      // NL bepaalde tijd: regel12=einde datum, regel13=+3 maanden, regel14=einde datum, regel15-17=salaris, regel18-21=firma/datum/naam
      // NL onbepaalde tijd: regel12=+3 maanden, regel13-15=salaris, regel16-19=firma/datum/naam
      // DE: regel12=+3 maanden, regel13-15=salaris, regel16-18=firma/datum/naam
      'regel12': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? (data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '') // NL bepaalde tijd: einde datum contract
        : (() => {
            if (!data.in_dienst_vanaf) return ''
            return calculateDatePlus3Months(data.in_dienst_vanaf)
          })(), // NL onbepaalde tijd / DE: in dienst vanaf + 3 maanden
      'regel13': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? (() => {
            if (!data.in_dienst_vanaf) return ''
            return calculateDatePlus3Months(data.in_dienst_vanaf)
          })() // NL bepaalde tijd: in dienst vanaf + 3 maanden
        : data.basisSalaris || '', // NL onbepaalde tijd / DE: Basissalaris
      'regel14': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? (data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '') // NL bepaalde tijd: einde datum contract
        : data.kledinggeld || '', // NL onbepaalde tijd / DE: Kledinggeld
      'regel15': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? data.basisSalaris || '' // NL bepaalde tijd: Basissalaris
        : data.reiskosten || '', // NL onbepaalde tijd / DE: Reiskosten
      'regel16': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? data.kledinggeld || '' // NL bepaalde tijd: Kledinggeld
        : (options.language === 'de' ? currentDate : data.company), // NL onbepaalde tijd: Firma, DE: Datum opmaken
      'regel17': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? data.reiskosten || '' // NL bepaalde tijd: Reiskosten
        : (options.language === 'de' ? data.company : currentDate), // NL onbepaalde tijd: Datum opmaken, DE: Firma
      'regel18': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? data.company // NL bepaalde tijd: Firma
        : (options.language === 'de' ? fullName : data.company), // NL onbepaalde tijd: Firma, DE: Volledige naam
      'regel19': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? currentDate // NL bepaalde tijd: Datum opmaken
        : (options.language === 'nl' ? fullName : ''), // NL onbepaalde tijd: Volledige naam, DE: (niet gebruikt)
      'regel20': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? data.company // NL bepaalde tijd: Firma
        : '', // Alleen voor NL bepaalde tijd
      'regel21': options.contractType === 'bepaalde_tijd' && options.language === 'nl'
        ? fullName // NL bepaalde tijd: Volledige naam
        : '', // Alleen voor NL bepaalde tijd
      
      // Oude veldnamen (voor backward compatibility)
      'voornaam': data.firstName,
      'achternaam': data.lastName,
      'naam': fullName,
      'volledigenaam': fullName,
      'volledigenaamwerknemer': fullName,
      'werknemer_centreren': fullName,
      'geboortedatum': formatDate(data.birthDate),
      'geboorteplaats': data.birthPlace || '',
      'nationaliteit': getNationalityLabel(data.nationality),
      'adres': address,
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
      'firma_centreren': data.company,
      'firmanummer': companyNumber,
      'firmanr': companyNumber,
      'bedrijfsnummer': companyNumber,
      'indiensttreding': formatDate(data.in_dienst_vanaf),
      'in_dienst_vanaf': formatDate(data.in_dienst_vanaf),
      'proeftijd_einddatum': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
      'in_dienst_vanaf_3maanden': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
      'in_dienst_vanaf_plus_3maanden': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
      'in_dienst_vanafplus3maanden': (() => {
        if (!data.in_dienst_vanaf) return ''
        return calculateDatePlus3Months(data.in_dienst_vanaf)
      })(),
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
      'in_dienst_tot': data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '',
      'einddatum': data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '',
      'contract_einddatum': data.in_dienst_tot ? formatDate(data.in_dienst_tot) : '',
      'matricule': data.matricule || '',
      'schip': data.shipName || '',
      'scheep': data.shipName || '',
      'datum': currentDate,
      'vandaag': currentDate,
      'huidigedatum': currentDate,
      'contractdatum': currentDate,
      'datum_opmaken': currentDate,
      'datumopmaken': currentDate,
      'opmaakdatum': currentDate,
      'datum_opmak': currentDate,
      'basissalaris': data.basisSalaris || '',
      'salaris': data.basisSalaris || '',
      'kledinggeld': data.kledinggeld || '',
      'reiskosten': data.reiskosten || '',
      'scheepsnaam': data.shipName || '',
    }
    
    // Normaliseer alle waarden in fieldMappings voor PDF encoding
    Object.keys(fieldMappings).forEach(key => {
      fieldMappings[key] = normalizeTextForPDF(fieldMappings[key])
    })
    
    // Probeer alle velden in het formulier te vinden en in te vullen
    const fields = form.getFields()
    
    console.log('=== START PDF INVULLEN ===')
    console.log('Contract Data:', JSON.stringify(data, null, 2))
    console.log('Contract Options:', JSON.stringify(options, null, 2))
    console.log('Aantal velden om te verwerken:', fields.length)
    
    // Log alle veldnamen die we gaan proberen te matchen
    console.log('=== VELDNAMEN IN PDF ===')
    fields.forEach((field: any, index: number) => {
      try {
        const fieldName = field.getName()
        const fieldType = field.constructor.name
        console.log(`  [${index + 1}] "${fieldName}" (${fieldType})`)
      } catch (e) {
        console.log(`  [${index + 1}] <veld naam kon niet worden opgehaald> (${field.constructor.name})`)
      }
    })
    
    // Log alle beschikbare mappings
    console.log('=== BESCHIKBARE VELDNAMEN IN MAPPINGS ===')
    Object.keys(fieldMappings).forEach((key, index) => {
      console.log(`  [${index + 1}] "${key}" → "${fieldMappings[key]}"`)
    })
    
    let filledCount = 0
    
    fields.forEach((field: any) => {
      const originalFieldName = field.getName()
      // Normaliseer veldnaam: lowercase, trim, verwijder speciale tekens en spaties
      const fieldName = originalFieldName.toLowerCase().trim()
      // Maak ook een versie zonder spaties en speciale tekens voor matching
      const fieldNameNormalized = fieldName
        .replace(/\s+/g, '') // Verwijder alle spaties
        .replace(/[+]/g, 'plus') // Vervang + met "plus"
        .replace(/[^a-z0-9_]/g, '') // Verwijder alle speciale tekens behalve underscore
      
      console.log(`\n--- Verwerken veld: "${originalFieldName}" (normalized: "${fieldName}", normalized2: "${fieldNameNormalized}") ---`)
      
      // Eerst proberen exacte match (met en zonder spaties)
      let matchedValue: string | undefined = fieldMappings[fieldName] || fieldMappings[fieldNameNormalized]
      
      if (matchedValue) {
        console.log(`  ✓ Exacte match gevonden voor "${fieldName}" of "${fieldNameNormalized}"`)
        console.log(`  → Waarde om in te vullen: "${matchedValue}"`)
        
        try {
          console.log(`  → Field type check: ${field.constructor.name}`)
          // Check of het een text field is - pdf-lib gebruikt mogelijk andere constructor namen
          const isTextField = field.constructor.name === 'PDFTextField' || 
                              field.constructor.name === 'e' ||
                              typeof (field as any).setText === 'function'
          
          if (isTextField) {
            // Vul eerst de tekst in (zonder bold font eerst, dat doen we daarna)
            const valueToSet = matchedValue
            console.log(`  → Probeer veld "${originalFieldName}" in te vullen met: "${valueToSet}"`)
            console.log(`  → Field object exists:`, !!field)
            console.log(`  → Field.setText exists:`, typeof (field as any).setText === 'function')
            
            try {
              console.log(`  → Aanroepen field.setText("${valueToSet}")...`)
              field.setText(valueToSet)
              console.log(`  ✓ setText() uitgevoerd voor "${originalFieldName}"`)
              
              // VERIFICATIE: Controleer direct of de waarde is ingesteld
              const verifyValue = field.getText()
              console.log(`  → Gecontroleerde waarde: "${verifyValue}" (verwacht: "${valueToSet}")`)
              if (verifyValue === valueToSet || verifyValue === valueToSet.trim()) {
                console.log(`  ✓ Veld "${originalFieldName}" succesvol ingevuld met: "${verifyValue}"`)
              } else {
                console.warn(`  ⚠️ Veld "${originalFieldName}" heeft andere waarde. Verwacht: "${valueToSet}", Krijg: "${verifyValue}"`)
              }
            } catch (setTextError) {
              console.error(`  ❌ FOUT bij setText voor veld "${originalFieldName}":`, setTextError)
              console.error(`  Error details:`, setTextError)
              // Gooi de error niet door, probeer door te gaan met andere velden
            }
            
            // Probeer bold font in te stellen NA het invullen van de tekst
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
                
                // Forceer update van de appearance door de tekst opnieuw in te stellen
                try {
                  const currentValue = field.getText()
                  if (currentValue) {
                    // Herstel de tekst om de appearance te forceren met de nieuwe bold font
                    field.setText(currentValue)
                  }
                  
                  // Probeer ook updateAppearances aan te roepen als het beschikbaar is
                  if (typeof (field as any).updateAppearances === 'function' && boldFont) {
                    try {
                      (field as any).updateAppearances(boldFont)
                      console.log(`  ✓ updateAppearances() aangeroepen voor "${originalFieldName}"`)
                    } catch (e) {
                      console.warn(`  ⚠️ updateAppearances() faalde voor "${originalFieldName}":`, e)
                    }
                  }
                } catch (appearanceError) {
                  console.warn(`  ⚠️ Kon appearance niet updaten voor "${originalFieldName}":`, appearanceError)
                }
                
                console.log(`  ✓ Bold font ingesteld voor "${originalFieldName}"`)
              }
            } catch (fontError) {
              console.warn(`  ⚠️ Kon bold font niet instellen voor veld ${fieldName} (niet kritiek):`, fontError)
              // Dit is niet kritiek, ga door
            }

            // Stel uitlijning in: centreren voor firma_centreren en werknemer_centreren, links voor alle andere velden
            // Dit gebeurt NA het instellen van bold font zodat beide behouden blijven
            try {
              // fieldNameNormalized: lowercase, spaties weg, speciale tekens grotendeels weg
              // Maak daarnaast een volledig "plain" variant zonder underscores e.d.
              const fieldNamePlain = originalFieldName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')

              // Regel1 en regel2 moeten gecentreerd worden, alle andere regels links
              const needsCenter =
                fieldNameNormalized === 'regel1' ||
                fieldNameNormalized === 'regel2' ||
                fieldNamePlain === 'regel1' ||
                fieldNamePlain === 'regel2' ||
                // Backward compatibility met oude veldnamen
                fieldNameNormalized === 'firma_centreren' ||
                fieldNameNormalized === 'werknemer_centreren' ||
                fieldNamePlain === 'firmacentreren' ||
                fieldNamePlain === 'werknemercentreren'

              const acroFieldAlign = (field as any).acroField
              if (acroFieldAlign && acroFieldAlign.dict) {
                const alignmentValue = needsCenter ? 1 : 0 // 0 = left, 1 = center, 2 = right
                
                // Stel Q (Quadding) in - dit bepaalt de tekstuitlijning
                acroFieldAlign.dict.set('Q', alignmentValue)
                console.log(`✓ Veld "${originalFieldName}" Q-uitlijning op ${needsCenter ? 'center' : 'links'} gezet (Q=${alignmentValue})`)
                
                // Behoud de bold font in DA string
                try {
                  const existingDA = acroFieldAlign.dict.lookup('DA')
                  if (existingDA) {
                    const daString = existingDA.toString()
                    // Als de DA string al Helvetica-Bold bevat, behoud deze
                    if (!daString.includes('Helvetica-Bold')) {
                      // Update alleen als het nog geen bold font heeft
                      const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
                      const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12
                      acroFieldAlign.dict.set('DA', `/Helvetica-Bold ${fontSize} Tf 0 g`)
                    }
                  }
                } catch (daError) {
                  // Ignore
                }
              }

              // Probeer ook setAlignment functie als die beschikbaar is
              if (typeof (field as any).setAlignment === 'function') {
                try {
                  const alignmentValue = needsCenter ? 1 : 0
                  ;(field as any).setAlignment(alignmentValue)
                  console.log(`✓ Veld "${originalFieldName}" uitlijning ingesteld op ${needsCenter ? 'gecentreerd' : 'links'} via setAlignment`)
                } catch (alignFuncError) {
                  console.warn(`  ⚠️ setAlignment faalde voor "${originalFieldName}":`, alignFuncError)
                }
              }
              
              // Update appearance met bold font als beschikbaar
              if (boldFont) {
                try {
                  if (typeof (field as any).updateAppearances === 'function') {
                    (field as any).updateAppearances(boldFont)
                  }
                } catch (appearanceError) {
                  // Ignore
                }
              }
            } catch (alignError) {
              console.warn(`  ⚠️ Kon uitlijning niet instellen voor "${originalFieldName}" (niet kritiek):`, alignError)
            }

            filledCount++
            console.log(`✓ [${filledCount}] Veld "${originalFieldName}" (exact match) ingevuld met: "${matchedValue}"`)
          } else if (field.constructor.name === 'PDFCheckBox') {
            const value = matchedValue
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
        // Skip als dit al exact gematcht is
        if (fieldName === key.toLowerCase() || fieldNameNormalized === key.toLowerCase()) {
          continue
        }
        
        // Normaliseer key voor matching (verwijder spaties en speciale tekens)
        const keyNormalized = key.toLowerCase()
          .replace(/\s+/g, '') // Verwijder alle spaties
          .replace(/[+]/g, 'plus') // Vervang + met "plus"
          .replace(/[^a-z0-9_]/g, '') // Verwijder alle speciale tekens behalve underscore
        
        // Check verschillende matching strategieën
        // Belangrijk: omdat we gesorteerd hebben op lengte (langste eerst),
        // zal "in_dienst_vanaf_3maanden" eerst worden gecheckt voordat "in_dienst_vanaf"
        const matches = 
          fieldName === key.toLowerCase() || // Exact match (case-insensitive)
          fieldNameNormalized === keyNormalized || // Exact match (genormaliseerd)
          fieldName.includes(key.toLowerCase()) || // Field name bevat de key
          fieldNameNormalized.includes(keyNormalized) || // Field name bevat de key (genormaliseerd)
          key.toLowerCase().includes(fieldName) || // Key bevat de field name
          keyNormalized.includes(fieldNameNormalized) || // Key bevat de field name (genormaliseerd)
          fieldNameNormalized === key.toLowerCase().replace(/[^a-z0-9_]/g, '') || // Zonder speciale tekens
          keyNormalized === fieldName.replace(/[^a-z0-9_]/g, '') // Zonder speciale tekens (omgekeerd)
        
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
              
              // Stel uitlijning in: centreren voor firma_centreren en werknemer_centreren, links voor alle andere velden
              try {
                const originalFieldName = field.getName()
                const fieldNameNormalized = originalFieldName
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, '')
                  .replace(/[+]/g, 'plus')
                  .replace(/[^a-z0-9_]/g, '')
                
                const fieldNamePlain = originalFieldName
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '')

                // Regel1 en regel2 moeten gecentreerd worden, alle andere regels links
                const needsCenter =
                  fieldNameNormalized === 'regel1' ||
                  fieldNameNormalized === 'regel2' ||
                  fieldNamePlain === 'regel1' ||
                  fieldNamePlain === 'regel2' ||
                  // Backward compatibility met oude veldnamen
                  fieldNameNormalized === 'firma_centreren' ||
                  fieldNameNormalized === 'werknemer_centreren' ||
                  fieldNamePlain === 'firmacentreren' ||
                  fieldNamePlain === 'werknemercentreren'

                const acroFieldAlign = (field as any).acroField
                if (acroFieldAlign && acroFieldAlign.dict) {
                  const alignmentValue = needsCenter ? 1 : 0
                  acroFieldAlign.dict.set('Q', alignmentValue)
                  console.log(`✓ Veld "${originalFieldName}" Q-uitlijning op ${needsCenter ? 'center' : 'links'} gezet (partial match, Q=${alignmentValue})`)
                  
                  // Behoud bold font in DA string
                  try {
                    const existingDA = acroFieldAlign.dict.lookup('DA')
                    if (existingDA) {
                      const daString = existingDA.toString()
                      if (!daString.includes('Helvetica-Bold')) {
                        const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
                        const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12
                        acroFieldAlign.dict.set('DA', `/Helvetica-Bold ${fontSize} Tf 0 g`)
                      }
                    }
                  } catch (daError) {
                    // Ignore
                  }
                }

                if (typeof (field as any).setAlignment === 'function') {
                  try {
                    const alignmentValue = needsCenter ? 1 : 0
                    ;(field as any).setAlignment(alignmentValue)
                    console.log(`✓ Veld "${originalFieldName}" uitlijning ingesteld via setAlignment (partial match)`)
                  } catch (alignFuncError) {
                    console.warn(`  ⚠️ setAlignment faalde voor "${originalFieldName}":`, alignFuncError)
                  }
                }
              } catch (alignError) {
                console.warn(`  ⚠️ Kon uitlijning niet instellen voor "${field.getName()}" (niet kritiek):`, alignError)
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
 * Genereert een addendum PDF op basis van het template en vult deze in met de wisseling data
 */
export async function generateAddendum(
  addendumData: AddendumData
): Promise<Blob> {
  try {
    const templatePath = '/contracts/Addendum.pdf'
    
    // In de browser moeten we altijd een absolute URL gebruiken
    let fullTemplatePath = templatePath
    if (typeof window !== 'undefined') {
      fullTemplatePath = `${window.location.origin}${templatePath}`
      // Voeg cache-busting toe om ervoor te zorgen dat het nieuwste bestand wordt geladen
      fullTemplatePath += `?v=${Date.now()}`
    }
    
    console.log('Loading Addendum PDF template from:', fullTemplatePath)
    
    // Fetch het template PDF bestand met cache: 'no-store' om caching te voorkomen
    const templateResponse = await fetch(fullTemplatePath, {
      cache: 'no-store'
    })
    if (!templateResponse.ok) {
      console.error(`Failed to load template: ${fullTemplatePath}`, {
        status: templateResponse.status,
        statusText: templateResponse.statusText,
        url: templateResponse.url
      })
      throw new Error(`Kon template niet laden: ${fullTemplatePath} (Status: ${templateResponse.status})`)
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
          // Embed bold font eerst zodat we het kunnen gebruiken
          let helveticaBoldFont: any = null
          try {
            helveticaBoldFont = await pdfDoc.embedFont('Helvetica-Bold')
            console.log('✓ Helvetica-Bold font geëmbed')
          } catch (fontError) {
            console.warn('⚠️ Kon Helvetica-Bold font niet embedden:', fontError)
          }
          
          fillAddendumFields(form, addendumData, helveticaBoldFont)
          
          // VERIFICATIE: Controleer of de velden daadwerkelijk zijn ingevuld (VOOR flatten)
          console.log('=== VERIFICATIE VELDEN (voor flatten) ===')
          let verifiedFilledCount = 0
          fields.forEach((field: any) => {
            try {
              const isTextField = field.constructor.name === 'PDFTextField' || 
                                  field.constructor.name === 'e' ||
                                  typeof (field as any).setText === 'function'
              if (isTextField) {
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
            console.log(`✓ ${verifiedFilledCount} velden zijn daadwerkelijk ingevuld (voor flatten)`)
          } else {
            console.error('❌ GEEN ENKEL VELD IS INGEVULD!')
            console.error('Dit betekent dat fillAddendumFields() de velden niet heeft kunnen invullen')
            fieldsFilled = false
          }
          
          if (fieldsFilled) {
            // Bold font is al ingesteld in fillAddendumFields, maar we kunnen het nog een keer proberen
            // voor het geval dat sommige velden gemist zijn
            try {
              if (!helveticaBoldFont) {
                helveticaBoldFont = await pdfDoc.embedFont('Helvetica-Bold')
              }
              await setBoldFontForAllFields(fields, helveticaBoldFont, pdfDoc)
              console.log('✓ Bold font definitief ingesteld voor alle velden')
            } catch (fontError) {
              console.warn('⚠️ Kon bold font niet instellen, maar velden zijn wel ingevuld:', fontError)
            }
            
            // Stel alignment expliciet in voor alle velden VOOR flattenen
            // Dit moet gebeuren NA bold font instellen zodat beide behouden blijven
            // Voor Addendum: alle velden links uitgelijnd
            try {
              await setAlignmentForAllFields(fields, helveticaBoldFont, true)
              console.log('✓ Alignment definitief ingesteld voor alle velden (met behoud van bold font)')
              
              // Extra stap: forceer alignment opnieuw vlak voor flatten()
              // Dit is belangrijk omdat sommige operaties de alignment kunnen resetten
              await setAlignmentForAllFields(fields, helveticaBoldFont, true)
              console.log('✓ Alignment opnieuw gecontroleerd en ingesteld vlak voor flatten()')
            } catch (alignError) {
              console.warn('⚠️ Kon alignment niet instellen:', alignError)
            }
            
            form.flatten()
            console.log('✓ Addendum ingevuld en geflattened')
          }
        } catch (fillError) {
          console.error('❌ FOUT bij het invullen van formuliervelden:', fillError)
          fieldsFilled = false
        }
      } else {
        console.warn('⚠️ Geen formuliervelden gevonden in PDF')
      }
    } catch (error) {
      console.error('❌ FOUT bij het ophalen van formuliervelden:', error)
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
    return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  } catch (error) {
    console.error('Error generating addendum:', error)
    throw new Error(`Fout bij het genereren van het addendum: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
  }
}

/**
 * Vult de formuliervelden in het Addendum PDF in
 */
function fillAddendumFields(
  form: any,
  data: AddendumData,
  boldFont?: any
) {
  try {
    const oldCompanyNumber = getCompanyNumber(data.oldCompany)
    const newCompanyNumber = getCompanyNumber(data.newCompany)
    const fullName = `${data.firstName} ${data.lastName}`
    const address = `${data.address.street}, ${data.address.postalCode} ${data.address.city}, ${data.address.country}`
    
    const fieldMappings: Record<string, string> = {
      // Regel-gebaseerde veldnamen voor Addendum
      'regel1': data.oldCompany, // Voormalige Firma - Links
      'regel2': oldCompanyNumber, // Firmanummer voormalige firma - Links
      'regel3': fullName, // volledige naam - Links
      'regel4': formatDate(data.birthDate), // geboortedatum - Links
      'regel5': data.birthPlace || '', // Geboorteplaats - Links
      'regel6': address, // Adres - Links
      'regel7': data.newCompany, // nieuwe werkgever - Links
      'regel8': newCompanyNumber, // firmanummer nieuwe firma - Links
      'regel9': formatDate(data.inDienstVanafEersteWerkgever), // in dienst vanaf (bij eerste werkgever) - Links
      'regel10': data.oldCompany, // voormalige firma - Links
      'regel11': formatDate(data.inDienstVanafEersteWerkgever), // in dienst vanaf (bij eerste werkgever) - Links
      'regel12': formatDate(data.addendumDate), // datum van aanmaken - Links
      'regel13': formatDate(data.wisselingDate), // begin datum nieuwe werkgever - Links
      'regel14': formatDate(data.wisselingDate), // begin datum nieuwe werkgever - Links
      'regel15': data.oldCompany, // Naam voormalige Firma - Links
      'regel16': fullName, // Volledige naam werknemer - Links
      'regel17': data.newCompany, // Naam nieuwe firma - Links
      'regel18': formatDate(data.addendumDate), // datum van aanmaken - Links
    }
    
    // Normaliseer alle waarden in fieldMappings voor PDF encoding
    Object.keys(fieldMappings).forEach(key => {
      fieldMappings[key] = normalizeTextForPDF(fieldMappings[key])
    })
    
    // Probeer alle velden in het formulier te vinden en in te vullen
    const fields = form.getFields()
    
    console.log('=== START ADDENDUM INVULLEN ===')
    console.log('Addendum Data:', JSON.stringify(data, null, 2))
    console.log('Aantal velden om te verwerken:', fields.length)
    
    // Log alle veldnamen die we gaan proberen te matchen
    console.log('=== VELDNAMEN IN PDF ===')
    fields.forEach((field: any, index: number) => {
      try {
        const fieldName = field.getName()
        const fieldType = field.constructor.name
        console.log(`  [${index + 1}] "${fieldName}" (${fieldType})`)
      } catch (e) {
        console.log(`  [${index + 1}] <veld naam kon niet worden opgehaald> (${field.constructor.name})`)
      }
    })
    
    // Log alle beschikbare mappings
    console.log('=== BESCHIKBARE VELDNAMEN IN MAPPINGS ===')
    Object.keys(fieldMappings).forEach((key, index) => {
      console.log(`  [${index + 1}] "${key}" → "${fieldMappings[key]}"`)
    })
    
    let filledCount = 0
    
    fields.forEach((field: any) => {
      const originalFieldName = field.getName()
      // Normaliseer veldnaam: lowercase, trim, verwijder speciale tekens en spaties
      const fieldName = originalFieldName.toLowerCase().trim()
      // Maak ook een versie zonder spaties en speciale tekens voor matching
      const fieldNameNormalized = fieldName
        .replace(/\s+/g, '') // Verwijder alle spaties
        .replace(/[+]/g, 'plus') // Vervang + met "plus"
        .replace(/[^a-z0-9_]/g, '') // Verwijder alle speciale tekens behalve underscore
      
      console.log(`\n--- Verwerken veld: "${originalFieldName}" (normalized: "${fieldName}", normalized2: "${fieldNameNormalized}") ---`)
      
      // Eerst proberen exacte match (met en zonder spaties)
      let matchedValue: string | undefined = fieldMappings[fieldName] || fieldMappings[fieldNameNormalized]
      
      if (matchedValue) {
        console.log(`  ✓ Exacte match gevonden voor "${fieldName}" of "${fieldNameNormalized}"`)
        console.log(`  → Waarde om in te vullen: "${matchedValue}"`)
        
        try {
          console.log(`  → Field type check: ${field.constructor.name}`)
          // Check of het een text field is - pdf-lib gebruikt mogelijk andere constructor namen
          const isTextField = field.constructor.name === 'PDFTextField' || 
                              field.constructor.name === 'e' ||
                              typeof (field as any).setText === 'function'
          
          if (isTextField) {
            // Vul eerst de tekst in (zonder bold font eerst, dat doen we daarna)
            const valueToSet = matchedValue
            console.log(`  → Probeer veld "${originalFieldName}" in te vullen met: "${valueToSet}"`)
            console.log(`  → Field object exists:`, !!field)
            console.log(`  → Field.setText exists:`, typeof (field as any).setText === 'function')
            
            try {
              console.log(`  → Aanroepen field.setText("${valueToSet}")...`)
              field.setText(valueToSet)
              console.log(`  ✓ setText() uitgevoerd voor "${originalFieldName}"`)
              
              // VERIFICATIE: Controleer direct of de waarde is ingesteld
              const verifyValue = field.getText()
              console.log(`  → Gecontroleerde waarde: "${verifyValue}" (verwacht: "${valueToSet}")`)
              if (verifyValue === valueToSet || verifyValue === valueToSet.trim()) {
                console.log(`  ✓ Veld "${originalFieldName}" succesvol ingevuld met: "${verifyValue}"`)
              } else {
                console.warn(`  ⚠️ Veld "${originalFieldName}" heeft andere waarde. Verwacht: "${valueToSet}", Krijg: "${verifyValue}"`)
              }
            } catch (setTextError) {
              console.error(`  ❌ FOUT bij setText voor veld "${originalFieldName}":`, setTextError)
              console.error(`  Error details:`, setTextError)
              // Gooi de error niet door, probeer door te gaan met andere velden
            }
            
            // Probeer bold font in te stellen NA het invullen van de tekst
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
                
                // Forceer update van de appearance door de tekst opnieuw in te stellen
                try {
                  const currentValue = field.getText()
                  if (currentValue) {
                    // Herstel de tekst om de appearance te forceren met de nieuwe bold font
                    field.setText(currentValue)
                  }
                  
                  // Probeer ook updateAppearances aan te roepen als het beschikbaar is
                  if (typeof (field as any).updateAppearances === 'function' && boldFont) {
                    try {
                      (field as any).updateAppearances(boldFont)
                      console.log(`  ✓ updateAppearances() aangeroepen voor "${originalFieldName}"`)
                    } catch (e) {
                      console.warn(`  ⚠️ updateAppearances() faalde voor "${originalFieldName}":`, e)
                    }
                  }
                } catch (appearanceError) {
                  console.warn(`  ⚠️ Kon appearance niet updaten voor "${originalFieldName}":`, appearanceError)
                }
                
                console.log(`  ✓ Bold font ingesteld voor "${originalFieldName}"`)
              }
            } catch (fontError) {
              console.warn(`  ⚠️ Kon bold font niet instellen voor veld ${fieldName} (niet kritiek):`, fontError)
              // Dit is niet kritiek, ga door
            }

            // Stel uitlijning in: voor Addendum zijn alle velden links uitgelijnd
            // Dit gebeurt NA het instellen van bold font zodat beide behouden blijven
            try {
              // fieldNameNormalized: lowercase, spaties weg, speciale tekens grotendeels weg
              // Maak daarnaast een volledig "plain" variant zonder underscores e.d.
              const fieldNamePlain = originalFieldName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')

              // Voor Addendum: alle velden links uitgelijnd (geen centreren)
              const needsCenter = false

              const acroFieldAlign = (field as any).acroField
              if (acroFieldAlign && acroFieldAlign.dict) {
                const alignmentValue = needsCenter ? 1 : 0 // 0 = left, 1 = center, 2 = right
                
                // Stel Q (Quadding) in - dit bepaalt de tekstuitlijning
                acroFieldAlign.dict.set('Q', alignmentValue)
                console.log(`✓ Veld "${originalFieldName}" Q-uitlijning op ${needsCenter ? 'center' : 'links'} gezet (Q=${alignmentValue})`)
                
                // Behoud de bold font in DA string
                try {
                  const existingDA = acroFieldAlign.dict.lookup('DA')
                  if (existingDA) {
                    const daString = existingDA.toString()
                    // Als de DA string al Helvetica-Bold bevat, behoud deze
                    if (!daString.includes('Helvetica-Bold')) {
                      // Update alleen als het nog geen bold font heeft
                      const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
                      const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12
                      acroFieldAlign.dict.set('DA', `/Helvetica-Bold ${fontSize} Tf 0 g`)
                    }
                  }
                } catch (daError) {
                  // Ignore
                }
              }

              // Probeer ook setAlignment functie als die beschikbaar is
              if (typeof (field as any).setAlignment === 'function') {
                try {
                  const alignmentValue = needsCenter ? 1 : 0
                  ;(field as any).setAlignment(alignmentValue)
                  console.log(`✓ Veld "${originalFieldName}" uitlijning ingesteld op ${needsCenter ? 'gecentreerd' : 'links'} via setAlignment`)
                } catch (alignFuncError) {
                  console.warn(`  ⚠️ setAlignment faalde voor "${originalFieldName}":`, alignFuncError)
                }
              }
              
              // Update appearance met bold font als beschikbaar
              if (boldFont) {
                try {
                  if (typeof (field as any).updateAppearances === 'function') {
                    (field as any).updateAppearances(boldFont)
                  }
                } catch (appearanceError) {
                  // Ignore
                }
              }
            } catch (alignError) {
              console.warn(`  ⚠️ Kon uitlijning niet instellen voor "${originalFieldName}" (niet kritiek):`, alignError)
            }

            filledCount++
            console.log(`✓ [${filledCount}] Veld "${originalFieldName}" (exact match) ingevuld met: "${matchedValue}"`)
          } else if (field.constructor.name === 'PDFCheckBox') {
            const value = matchedValue
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
      const sortedKeys = Object.entries(fieldMappings).sort((a, b) => b[0].length - a[0].length)
      
      for (const [key, value] of sortedKeys) {
        // Skip als dit al exact gematcht is
        if (fieldName === key.toLowerCase() || fieldNameNormalized === key.toLowerCase()) {
          continue
        }
        
        // Normaliseer key voor matching (verwijder spaties en speciale tekens)
        const keyNormalized = key.toLowerCase()
          .replace(/\s+/g, '') // Verwijder alle spaties
          .replace(/[+]/g, 'plus') // Vervang + met "plus"
          .replace(/[^a-z0-9_]/g, '') // Verwijder alle speciale tekens behalve underscore
        
        // Check verschillende matching strategieën
        const matches = 
          fieldName === key.toLowerCase() || // Exact match (case-insensitive)
          fieldNameNormalized === keyNormalized || // Exact match (genormaliseerd)
          fieldName.includes(key.toLowerCase()) || // Field name bevat de key
          fieldNameNormalized.includes(keyNormalized) || // Field name bevat de key (genormaliseerd)
          key.toLowerCase().includes(fieldName) || // Key bevat de field name
          keyNormalized.includes(fieldNameNormalized) || // Key bevat de field name (genormaliseerd)
          fieldNameNormalized === key.toLowerCase().replace(/[^a-z0-9_]/g, '') || // Zonder speciale tekens
          keyNormalized === fieldName.replace(/[^a-z0-9_]/g, '') // Zonder speciale tekens (omgekeerd)
        
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
              
              // Stel uitlijning in: voor Addendum zijn alle velden links uitgelijnd
              try {
                const originalFieldName = field.getName()
                const fieldNameNormalized = originalFieldName
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, '')
                  .replace(/[+]/g, 'plus')
                  .replace(/[^a-z0-9_]/g, '')
                
                const fieldNamePlain = originalFieldName
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '')

                // Voor Addendum: alle velden links uitgelijnd (geen centreren)
                const needsCenter = false

                const acroFieldAlign = (field as any).acroField
                if (acroFieldAlign && acroFieldAlign.dict) {
                  const alignmentValue = needsCenter ? 1 : 0
                  acroFieldAlign.dict.set('Q', alignmentValue)
                  console.log(`✓ Veld "${originalFieldName}" Q-uitlijning op ${needsCenter ? 'center' : 'links'} gezet (partial match, Q=${alignmentValue})`)
                  
                  // Behoud bold font in DA string
                  try {
                    const existingDA = acroFieldAlign.dict.lookup('DA')
                    if (existingDA) {
                      const daString = existingDA.toString()
                      if (!daString.includes('Helvetica-Bold')) {
                        const sizeMatch = daString.match(/(\d+(?:\.\d+)?)\s+Tf/)
                        const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12
                        acroFieldAlign.dict.set('DA', `/Helvetica-Bold ${fontSize} Tf 0 g`)
                      }
                    }
                  } catch (daError) {
                    // Ignore
                  }
                }

                if (typeof (field as any).setAlignment === 'function') {
                  try {
                    const alignmentValue = needsCenter ? 1 : 0
                    ;(field as any).setAlignment(alignmentValue)
                    console.log(`✓ Veld "${originalFieldName}" uitlijning ingesteld via setAlignment (partial match)`)
                  } catch (alignFuncError) {
                    console.warn(`  ⚠️ setAlignment faalde voor "${originalFieldName}":`, alignFuncError)
                  }
                }
              } catch (alignError) {
                console.warn(`  ⚠️ Kon uitlijning niet instellen voor "${field.getName()}" (niet kritiek):`, alignError)
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
    
    console.log(`=== EINDE ADDENDUM INVULLEN ===`)
    console.log(`Totaal ${filledCount} van ${fields.length} velden ingevuld`)
  } catch (error) {
    console.error('Error filling addendum fields:', error)
    // We gooien de fout niet door, zodat het PDF nog steeds wordt gegenereerd
    // zelfs als sommige velden niet kunnen worden ingevuld
  }
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

