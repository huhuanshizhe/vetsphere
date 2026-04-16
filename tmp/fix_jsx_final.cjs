const fs = require('fs');

const filePath = 'e:\\连川科技\\vetsphere\\apps\\admin\\src\\app\\(admin)\\products\\[id]\\page.tsx';
const raw = fs.readFileSync(filePath, 'utf-8');
const lines = raw.split('\n');

console.log('Total lines:', lines.length);
console.log('Line 1038:', lines[1037]);
console.log('Line 1039:', lines[1038]);
console.log('Line 1048:', lines[1047]);

// Remove: line 1038 (comment {/* 编辑模式 */}), line 1039 (blank), line 1048 (stray )})
const toRemove = new Set([1037, 1038, 1047]);
const newLines = lines.filter((_, i) => !toRemove.has(i));

console.log('\nNew total:', newLines.length);
console.log('Verify around fix area:');
for (let i = 1035; i < 1047; i++) {
  console.log(`  ${i+1}: ${newLines[i]}`);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('\nDone!');
