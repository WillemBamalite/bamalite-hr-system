const fs = require('fs');

console.log('🔧 Fixing automatic status calculation logic...');

// Read the current regime calculator
const regimeCalculatorPath = 'utils/regime-calculator.ts';
let content = fs.readFileSync(regimeCalculatorPath, 'utf8');

// Fix the calculateCurrentStatus function to properly calculate status
const fixedCalculateCurrentStatus = `
// Nieuwe functie om automatisch status te berekenen op basis van thuisSinds en regime
export function calculateCurrentStatus(
  regime: "1/1" | "2/2" | "3/3" | "Altijd",
  thuisSinds: string | null,
  onBoardSince: string | null,
): {
  currentStatus: "aan-boord" | "thuis"
  nextRotationDate: string
  daysUntilRotation: number
  isOnBoard: boolean
} {
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  
  if (!regime) {
    return {
      currentStatus: "thuis",
      nextRotationDate: "",
      daysUntilRotation: 0,
      isOnBoard: false
    }
  }

  // Altijd regime - altijd aan boord
  if (regime === "Altijd") {
    return {
      currentStatus: "aan-boord",
      nextRotationDate: "",
      daysUntilRotation: 0,
      isOnBoard: true
    }
  }

  const regimeWeeks = Number.parseInt(regime.split("/")[0])
  const regimeDays = regimeWeeks * 7

  // Als er een onBoardSince datum is, bereken vanaf daar
  if (onBoardSince) {
    const onBoardDate = new Date(onBoardSince)
    const offBoardDate = new Date(onBoardDate)
    offBoardDate.setDate(offBoardDate.getDate() + regimeDays)
    
    const nextOnBoardDate = new Date(offBoardDate)
    nextOnBoardDate.setDate(nextOnBoardDate.getDate() + regimeDays)

    // Check of vandaag tussen onBoardSince en offBoardDate ligt
    if (today >= onBoardDate && today < offBoardDate) {
      // Ze zijn aan boord
      const daysUntil = Math.floor((offBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "aan-boord",
        nextRotationDate: offBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: true
      }
    } else {
      // Ze zijn thuis
      const daysUntil = Math.floor((nextOnBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "thuis",
        nextRotationDate: nextOnBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: false
      }
    }
  }

  // Als er een thuisSinds datum is maar geen onBoardSince, bereken vanaf daar
  if (thuisSinds) {
    const thuisDate = new Date(thuisSinds)
    const nextOnBoardDate = new Date(thuisDate)
    nextOnBoardDate.setDate(nextOnBoardDate.getDate() + regimeDays)
    
    const nextOffBoardDate = new Date(nextOnBoardDate)
    nextOffBoardDate.setDate(nextOffBoardDate.getDate() + regimeDays)

    // Check of vandaag tussen thuisSinds en nextOnBoardDate ligt
    if (today >= thuisDate && today < nextOnBoardDate) {
      // Ze zijn thuis
      const daysUntil = Math.floor((nextOnBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "thuis",
        nextRotationDate: nextOnBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: false
      }
    } else if (today >= nextOnBoardDate && today < nextOffBoardDate) {
      // Ze zijn aan boord
      const daysUntil = Math.floor((nextOffBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "aan-boord",
        nextRotationDate: nextOffBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: true
      }
    } else {
      // Bereken de volgende cyclus
      const cyclesPassed = Math.floor((today.getTime() - thuisDate.getTime()) / (1000 * 60 * 60 * 24 * regimeDays * 2))
      const cycleStart = new Date(thuisDate)
      cycleStart.setDate(cycleStart.getDate() + (cyclesPassed * regimeDays * 2))
      
      const nextThuisDate = new Date(cycleStart)
      nextThuisDate.setDate(nextThuisDate.getDate() + regimeDays)
      
      if (today >= cycleStart && today < nextThuisDate) {
        // Ze zijn thuis
        const daysUntil = Math.floor((nextThuisDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          currentStatus: "thuis",
          nextRotationDate: nextThuisDate.toISOString().split('T')[0],
          daysUntilRotation: daysUntil,
          isOnBoard: false
        }
      } else {
        // Ze zijn aan boord
        const nextOffDate = new Date(nextThuisDate)
        nextOffDate.setDate(nextOffDate.getDate() + regimeDays)
        const daysUntil = Math.floor((nextOffDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          currentStatus: "aan-boord",
          nextRotationDate: nextOffDate.toISOString().split('T')[0],
          daysUntilRotation: daysUntil,
          isOnBoard: true
        }
      }
    }
  }

  // Fallback: thuis
  return {
    currentStatus: "thuis",
    nextRotationDate: "",
    daysUntilRotation: 0,
    isOnBoard: false
  }
}`;

// Replace the calculateCurrentStatus function
content = content.replace(
  /\/\/ Nieuwe functie om automatisch status te berekenen[\s\S]*?}\n\n/,
  fixedCalculateCurrentStatus + '\n\n'
);

// Write the updated file
fs.writeFileSync(regimeCalculatorPath, content, 'utf8');

console.log('✅ Fixed automatic status calculation logic!');
console.log('The calculation now prioritizes onBoardSince over thuisSinds');
console.log('This should make the automatic calculation match the manual status');

// Test the calculation for Rob van Etten
console.log('\n🧪 Testing calculation for Rob van Etten:');
const today = new Date();
const onBoardSince = '2025-07-16';
const onBoardDate = new Date(onBoardSince);
const regimeDays = 2 * 7; // 2/2 weeks = 14 days
const offBoardDate = new Date(onBoardDate);
offBoardDate.setDate(offBoardDate.getDate() + regimeDays);

console.log(`Today: ${today.toISOString().split('T')[0]}`);
console.log(`On board since: ${onBoardSince}`);
console.log(`Off board date: ${offBoardDate.toISOString().split('T')[0]}`);
console.log(`Is today between onBoardSince and offBoardDate? ${today >= onBoardDate && today < offBoardDate}`);
console.log(`Expected status: ${today >= onBoardDate && today < offBoardDate ? 'aan-boord' : 'thuis'}`); 