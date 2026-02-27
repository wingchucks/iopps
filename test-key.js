const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim();
});
const raw = envVars.FIREBASE_PRIVATE_KEY;
const pk = raw.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
console.log('starts with:', pk.substring(0, 40));
console.log('ends with:', pk.substring(pk.length - 40));
console.log('has newlines:', pk.includes('\n'));
