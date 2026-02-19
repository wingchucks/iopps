/**
 * Clean up the .js admin files that conflict with the existing .tsx admin pages.
 * The real admin system is already built in TypeScript — my .js files would 
 * cause build conflicts.
 */
const fs = require('fs');
const path = require('path');

const filesToRemove = [
  'app/admin/page.js',           // conflicts with page.tsx
  'app/admin/layout.js',         // conflicts with layout.tsx
  'app/admin/employers/page.js', // conflicts with page.tsx
  'app/admin/premium-partners/page.js', // no .tsx equivalent but wrong format
  'app/admin/system/page.js',    // wrong format
  'app/admin-access/page.js',    // unnecessary
  'components/AdminNavigation.js', // unnecessary
  'components/EnhancedAdminNavigation.js', // unnecessary
  'hooks/useAdminAuth.js',       // unnecessary
];

console.log('🧹 Cleaning up conflicting .js files...\n');

let removed = 0;
for (const file of filesToRemove) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`  ✅ Removed: ${file}`);
    removed++;
  } else {
    console.log(`  ⏭️  Not found: ${file}`);
  }
}

// Clean up empty directories
const dirsToCheck = [
  'app/admin/system',
  'app/admin/premium-partners',
  'app/admin-access',
];

for (const dir of dirsToCheck) {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    try {
      const files = fs.readdirSync(fullPath);
      if (files.length === 0) {
        fs.rmdirSync(fullPath);
        console.log(`  ✅ Removed empty dir: ${dir}`);
      }
    } catch {}
  }
}

console.log(`\n🧹 Done. Removed ${removed} conflicting files.`);
console.log('   The real admin system lives in the .tsx files.');
