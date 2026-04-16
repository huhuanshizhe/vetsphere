const fs = require('fs');
const path = require('path');

const logPath = 'C:\\tmp\\fix_result.txt';
const log = [];

const filePath = path.join('e:\\连川科技\\vetsphere', 'apps', 'admin', 'src', 'app', '(admin)', 'products', '[id]', 'page.tsx');
log.push('Path: ' + filePath);
log.push('Exists: ' + fs.existsSync(filePath));

const raw = fs.readFileSync(filePath, 'utf-8');
const lines = raw.split('\n');
log.push('Total lines: ' + lines.length);
log.push('Line 1038: ' + JSON.stringify(lines[1037]));
log.push('Line 1039: ' + JSON.stringify(lines[1038]));
log.push('Line 1048: ' + JSON.stringify(lines[1047]));

// Remove lines 1038, 1039, 1048 (0-indexed: 1037, 1038, 1047)
const toRemove = new Set([1037, 1038, 1047]);
const newLines = lines.filter((_, i) => !toRemove.has(i));
log.push('New total: ' + newLines.length);

for (let i = 1036; i < 1047; i++) {
  log.push((i+1) + ': ' + newLines[i]);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
log.push('File fixed!');

fs.writeFileSync(logPath, log.join('\n'), 'utf-8');
