const fs = require('fs');
const path = require('path');

// Read the current database file
const databasePath = path.join(__dirname, 'data', 'crew-database.ts');
let content = fs.readFileSync(databasePath, 'utf8');

console.log('Fixing duplicates in crew database...');

// List of Bacchus crew members that should be kept (only one entry each)
const bacchusCrewToKeep = [
    "koert-van-veen",
    "joao-fonseca", 
    "roy-landsbergen",
    "ernst-van-de-vlucht",
    "alexander-specht",
    "peter-gunter",
    "mike-de-boer",
    "casper-de-ruiter"
];

// Find all crew entries in the database
const crewEntries = content.match(/"([^"]+)":\s*\{[\s\S]*?\n\s*\},?\s*\n/g);

if (crewEntries) {
    console.log(`Found ${crewEntries.length} crew entries`);
    
    // Extract crew IDs
    const crewIds = crewEntries.map(entry => {
        const match = entry.match(/"([^"]+)":/);
        return match ? match[1] : null;
    }).filter(id => id);
    
    console.log('Crew IDs found:', crewIds);
    
    // Find duplicates
    const duplicates = crewIds.filter((id, index) => crewIds.indexOf(id) !== index);
    console.log('Duplicates found:', duplicates);
    
    // Remove duplicate entries
    duplicates.forEach(duplicateId => {
        // Find all occurrences of this crew member
        const regex = new RegExp(`"${duplicateId}":\\s*\\{[\\s\\S]*?\\n\\s*\\},?\\s*\\n`, 'g');
        const matches = content.match(regex);
        
        if (matches && matches.length > 1) {
            console.log(`Removing ${matches.length - 1} duplicate entries for ${duplicateId}`);
            
            // Keep only the first occurrence, remove the rest
            let newContent = content;
            let firstFound = false;
            
            newContent = newContent.replace(regex, (match) => {
                if (!firstFound) {
                    firstFound = true;
                    return match;
                } else {
                    return ''; // Remove duplicate
                }
            });
            
            content = newContent;
        }
    });
}

// Write the fixed content back to the file
fs.writeFileSync(databasePath, content, 'utf8');
console.log('Database file has been fixed!'); 