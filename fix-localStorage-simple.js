const fs = require('fs');
const path = require('path');

// Read the database file to get the correct data
const databasePath = path.join(__dirname, 'data', 'crew-database.ts');
let content = fs.readFileSync(databasePath, 'utf8');

console.log('Creating localStorage fix script...');

// Extract crew data from the database file
const crewEntries = content.match(/"([^"]+)":\s*\{[\s\S]*?\n\s*\},?\s*\n/g);

if (crewEntries) {
    console.log(`Found ${crewEntries.length} crew entries in database file`);
    
    // Create a simple HTML file to fix localStorage
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Fix localStorage Simple</title>
</head>
<body>
    <h1>Fix localStorage Simple</h1>
    <button onclick="fixLocalStorage()">Fix localStorage</button>
    <div id="output"></div>

    <script>
        function fixLocalStorage() {
            // Clear localStorage and reload from database
            localStorage.removeItem('crewDatabase');
            
            // Reload the page to get fresh data from database
            window.location.reload();
        }
    </script>
</body>
</html>`;

    fs.writeFileSync('fix-localStorage-simple.html', htmlContent, 'utf8');
    console.log('Created fix-localStorage-simple.html');
    console.log('Open this file in your browser and click the button to clear localStorage');
    console.log('Then reload your application to get fresh data from the database');
    
} else {
    console.log('No crew entries found');
} 