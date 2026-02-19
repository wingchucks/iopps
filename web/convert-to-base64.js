const fs = require('fs');

// Read the JSON file
const jsonContent = fs.readFileSync('firebase-service-account.json', 'utf8');

// Convert to base64
const base64String = Buffer.from(jsonContent).toString('base64');

console.log('FIREBASE_SERVICE_ACCOUNT_BASE64="' + base64String + '"');