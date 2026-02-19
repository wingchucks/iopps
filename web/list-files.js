const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, results);
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        results.push(fullPath.replace(/\\/g, '/'));
      }
    }
  } catch (e) {}
  return results;
}

const appDir = path.join(__dirname, 'app');
const compDir = path.join(__dirname, 'components');
const hooksDir = path.join(__dirname, 'hooks');
const libDir = path.join(__dirname, 'lib');

const output = [];
output.push('=== APP ROUTES ===');
walk(appDir).forEach(f => output.push(f));
output.push('\n=== COMPONENTS ===');
walk(compDir).forEach(f => output.push(f));
output.push('\n=== HOOKS ===');
walk(hooksDir).forEach(f => output.push(f));
output.push('\n=== LIB ===');
walk(libDir).forEach(f => output.push(f));

fs.writeFileSync(path.join(__dirname, 'list-routes.txt'), output.join('\n'));
console.log('Written to list-routes.txt');
