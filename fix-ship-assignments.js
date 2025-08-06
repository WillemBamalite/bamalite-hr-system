const fs = require('fs');
const path = require('path');

// Read the current database file
const databasePath = path.join(__dirname, 'data', 'crew-database.ts');
let content = fs.readFileSync(databasePath, 'utf8');

console.log('Fixing ship assignments in crew database...');

// Define correct ship assignments
const correctShipAssignments = {
    // MTS Bellona
    "frank-hennekam": "ms-bellona",
    "yovanni-smith": "ms-bellona", 
    "dominik-medulan": "ms-bellona",
    "jakub-misar": "ms-bellona",
    "jack-suiker": "ms-bellona",
    "rob-van-etten": "ms-bellona",
    "alexander-gyori": "ms-bellona",
    "lucien-de-grauw": "ms-bellona",
    "david-gyori": "ms-bellona",

    // MTS Bacchus
    "koert-van-veen": "ms-bacchus",
    "joao-fonseca": "ms-bacchus",
    "roy-landsbergen": "ms-bacchus", 
    "ernst-van-de-vlucht": "ms-bacchus",
    "alexander-specht": "ms-bacchus",
    "peter-gunter": "ms-bacchus",
    "mike-de-boer": "ms-bacchus",
    "casper-de-ruiter": "ms-bacchus"
};

// Fix each crew member's ship assignment
Object.entries(correctShipAssignments).forEach(([crewId, correctShipId]) => {
    // Find the crew member entry
    const regex = new RegExp(`("${crewId}":\\s*\\{[\\s\\S]*?shipId:\\s*)"[^"]*"([\\s\\S]*?\\n\\s*\\},?\\s*\\n)`, 'g');
    
    if (content.match(regex)) {
        // Replace the shipId
        content = content.replace(regex, `$1"${correctShipId}"$2`);
        console.log(`Fixed ${crewId}: → ${correctShipId}`);
    } else {
        console.log(`Warning: Could not find ${crewId} in database`);
    }
});

// Write the fixed content back to the file
fs.writeFileSync(databasePath, content, 'utf8');
console.log('Database file has been fixed!'); 