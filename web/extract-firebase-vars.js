// Extract Firebase environment variables for Vercel
const base64 = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiaW9wcHMtYzIyMjQiLAogICJwcml2YXRlX2tleV9pZCI6ICJkNTJiNzE5YmU3MTY5MzQ2NTEwYmI5MTA5ZmViYzcyNGFmNzk4MjFjIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdmdJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLZ3dnZ1NrQWdFQUFvSUJBUUM5M3V1MWM3dnpRck9VXG5QMmR0UE1EYkt6VHEzRHg2STNQQVZ4NwV8BvSDF0nCZ4dkSGt4+bPkBWalJHAVBsNaKCxNMIgBrZBCi6+REXKhSGJvKPLk5kESI/CQi4VCHnXs99/JZGFQF13Rp\nnb/Hf9Wj7xDMAaoPcf4gNKQ9LEBCNYLOFLKiWMvqCRoSUYR5OqPMkpxeRGt5qHkHRUSFwdKGTMCsVLqUWgFoLEASCBKgwggSkAgEAAoIBAQC93uu1c7vzQrOU+kQnPr79qQmBkZrF7WTn05dOjN1yOPrPGaF2S9pQD/vULuqFYdkvD/j/DKMRGDhNg4oGJj1s+nXf3OVV2EPKGAh1T9R7eBkBjt8BuI8Jaf1fUKNu0eHF1w5zppCnFYnJZQJYZ7yK3+1r1QZgLZCMcuYOyeUKLxvKFOPvRiJsOKFyIBwT7YRpgUPUAd73d4N8Md5+9a3k\n-----END PRIVATE KEY-----\n",\n  \"client_email\": \"firebase-adminsdk-fbsvc@iopps-c2224.iam.gserviceaccount.com\",\n  \"client_id\": \"107430404711965522242\",\n  \"auth_uri\": \"https://accounts.google.com/o/oauth2/auth\",\n  \"token_uri\": \"https://oauth2.googleapis.com/token\",\n  \"auth_provider_x509_cert_url\": \"https://www.googleapis.com/oauth2/v1/certs\",\n  \"client_x509_cert_url\": \"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40iopps-c2224.iam.gserviceaccount.com\",\n  \"universe_domain\": \"googleapis.com\"\n}";

const serviceAccount = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

console.log("=== VERCEL ENVIRONMENT VARIABLES ===\n");

console.log("1. FIREBASE_PROJECT_ID");
console.log(`   Value: ${serviceAccount.project_id}\n`);

console.log("2. FIREBASE_CLIENT_EMAIL");  
console.log(`   Value: ${serviceAccount.client_email}\n`);

console.log("3. FIREBASE_PRIVATE_KEY");
console.log(`   Value: ${serviceAccount.private_key}\n`);

console.log("=== COPY THESE VALUES TO VERCEL ===");