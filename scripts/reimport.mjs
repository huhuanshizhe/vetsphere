/**
 * 重新导入 Excel 产品数据的脚本
 * 使用 Node.js 原生 http 模块，超时不受限
 */
import XLSX from 'xlsx';
import http from 'node:http';
import { resolve } from 'path';

const ADMIN_URL = 'http://localhost:3002';
const EXCEL_FILE = resolve(process.cwd(), 'alibaba_products_template_v2.xlsx');

function parsePrice(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseIntSafe(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 0,  // No timeout
    }, (res) => {
      resolve(res);
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== 重新导入产品 ===');
  console.log('Excel file:', EXCEL_FILE);

  // Step 1: Parse Excel
  const wb = XLSX.readFile(EXCEL_FILE, { raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
  console.log(`Parsed ${rawRows.length} rows from Excel`);

  // Step 2: Transform rows (same as frontend page.tsx)
  const rows = rawRows.map((row, index) => {
    const attributes = [];
    for (let i = 1; i <= 9; i++) {
      const name = row[`Attribute ${i} Name`];
      const value = row[`Attribute ${i} Value`];
      if (name && value) attributes.push({ name: String(name), value: String(value) });
    }

    const faqs = [];
    for (let i = 1; i <= 3; i++) {
      const question = row[`FAQ Question ${i}`];
      const answer = row[`FAQ Answer ${i}`];
      if (question && answer) faqs.push({ question: String(question), answer: String(answer) });
    }

    return {
      _rowIndex: index + 2,
      sku: String(row.SKU || ''),
      name: String(row.Name || ''),
      brand: String(row.Brand || ''),
      l1Category: String(row['L1 Category'] || ''),
      l2Category: String(row['L2 Category'] || ''),
      l3Category: String(row['L3 Category'] || ''),
      shortDescription: String(row['Short Description'] || ''),
      fullDescription: String(row['Full Description'] || ''),
      primaryImageUrl: String(row['Primary Image URL'] || ''),
      additionalImages: String(row['Additional Images'] || ''),
      costPriceCny: parsePrice(row['Cost Price (CNY)']),
      sellingPriceUsd: parsePrice(row['Selling Price (USD)']),
      minOrderQty: parseIntSafe(row['Min Order Qty']) || 1,
      packageQty: parseIntSafe(row['Package Qty']) || 1,
      packageUnit: String(row['Package Unit'] || 'Each'),
      weight: parsePrice(row['Weight (kg)']),
      weightUnit: String(row['Weight Unit'] || 'kg'),
      leadTime: String(row['Lead Time'] || '2-4 weeks'),
      availability: String(row['Availability'] || 'In Stock'),
      status: String(row['Status'] || 'published'),
      purchaseMode: String(row['Purchase Mode'] || 'Buy Online + RFQ'),
      attributes,
      metaTitle: String(row['Meta Title'] || ''),
      metaDescription: String(row['Meta Description'] || ''),
      focusKeyword: String(row['Focus Keyword'] || ''),
      sourceUrl: String(row['Source URL'] || ''),
      faqs,
      _errors: [],
    };
  });

  // Show first row for debug
  const r = rows[0];
  console.log(`\nFirst row: ${r.name}`);
  console.log(`  Cost: ${r.costPriceCny}, Sell: ${r.sellingPriceUsd}, Weight: ${r.weight}`);
  console.log(`  Attrs: ${r.attributes.length}, FAQs: ${r.faqs.length}`);
  console.log(`  Full Desc length: ${r.fullDescription.length}, has newlines: ${r.fullDescription.includes('\n')}`);

  // Step 3: Call batch-import API using native http (no timeout)
  console.log(`\nSending ${rows.length} products to batch-import API...`);
  console.log('(translateAfterImport: false - import only, no translation)\n');

  const res = await httpPost(`${ADMIN_URL}/api/admin/products/batch-import`, {
    rows,
    translateAfterImport: false,
  });

  console.log('Response status:', res.statusCode);

  if (res.statusCode !== 200) {
    let body = '';
    for await (const chunk of res) body += chunk;
    console.error('Import failed:', body);
    process.exit(1);
  }

  // Read streaming response
  let buffer = '';
  let successCount = 0;
  let failCount = 0;

  for await (const chunk of res) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();  // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.type === 'progress') {
          process.stdout.write(`\r  [${event.current}/${event.total}] ${event.product || ''}                    `);
        } else if (event.type === 'success') {
          successCount++;
          console.log(`\n  OK: ${event.product || 'product'}`);
        } else if (event.type === 'error') {
          failCount++;
          console.log(`\n  FAIL row ${event.row}: ${event.message}`);
        } else if (event.type === 'complete') {
          console.log(`\n\n=== Import Complete ===`);
          console.log(`  Success: ${event.success}`);
          console.log(`  Failed: ${event.failed}`);
          console.log(`  Total: ${event.total}`);
        }
      } catch {}
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer);
      if (event.type === 'complete') {
        console.log(`\n=== Import Complete ===`);
        console.log(`  Success: ${event.success}`);
        console.log(`  Failed: ${event.failed}`);
        console.log(`  Total: ${event.total}`);
      }
    } catch {}
  }

  console.log(`\nDone! Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(e => {
  console.error('Script error:', e);
  process.exit(1);
});
