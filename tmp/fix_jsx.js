const fs = require('fs');
const path = require('path');

const filePath = path.join('e:\\连川科技\\vetsphere', 'apps', 'admin', 'src', 'app', '(admin)', 'products', '[id]', 'page.tsx');
console.log('Path:', filePath);
console.log('Exists:', fs.existsSync(filePath));

const raw = fs.readFileSync(filePath, 'utf-8');
const lines = raw.split('\n');
console.log('Total lines:', lines.length);
console.log('Line 1038:', JSON.stringify(lines[1037]));
console.log('Line 1039:', JSON.stringify(lines[1038]));
console.log('Line 1048:', JSON.stringify(lines[1047]));

// Remove lines 1038, 1039, 1048 (0-indexed: 1037, 1038, 1047)
const toRemove = new Set([1037, 1038, 1047]);
const newLines = lines.filter((_, i) => !toRemove.has(i));

console.log('\nAfter fix:');
console.log('New total lines:', newLines.length);
for (let i = 1036; i < 1047; i++) {
  console.log(`${i+1}: ${newLines[i]}`);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('\nFile fixed!');
