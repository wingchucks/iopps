const fs = require('fs'), p = require('path');
function find(d, r = []) {
  try {
    fs.readdirSync(d).forEach(f => {
      if (['node_modules', '.next', '.git', '.vercel'].includes(f)) return;
      const fp = p.join(d, f);
      try {
        if (fs.statSync(fp).isDirectory()) find(fp, r);
        else if (/Master|Brief|Spec|admin|prototype|Implementation|super.admin|journey|showcase/i.test(f)) r.push(fp);
      } catch {}
    });
  } catch {}
  return r;
}
const results = find('C:\\Users\\natha\\iopps');
fs.writeFileSync(p.join(__dirname, 'spec-files-list.txt'), results.join('\n'));
console.log(`Found ${results.length} files`);
results.forEach(f => console.log(f));
