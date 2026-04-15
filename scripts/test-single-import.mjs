/**
 * 单产品导入测试 - 验证 API 是否正常
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
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

function parseIntSafe(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    return parseInt(cleaned, 10) || 0;
  }
  return 0;
}

async function main() {
  const wb = XLSX.readFile(EXCEL_FILE, { raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

  // Take only first row
  const row = rawRows[0];
  const attributes = [];
  for (let i = 1; i <= 9; i++) {
    const name = row[`Attribute ${i} Name`];
    const value = row[`Attribute ${i} Value`];
    if (name && value) attributes.push({ name: String(name), value: String(value) });
  }
  const faqs = [];
  for (let i = 1; i <= 3; i++) {
    const q = row[`FAQ Question ${i}`];
    const a = row[`FAQ Answer ${i}`];
    if (q && a) faqs.push({ question: String(q), answer: String(a) });
  }

  const testRow = {
    _rowIndex: 2,
    sku: String(row.SKU || ''),
    name: String(row.Name || ''),
    brand: String(row.Brand || ''),
    l1Category: '', l2Category: '', l3Category: '',
    shortDescription: String(row['Short Description'] || ''),
    fullDescription: String(row['Full Description'] || ''),
    primaryImageUrl: String(row['Primary Image URL'] || ''),
    additionalImages: '', // Skip additional images to be faster
    costPriceCny: parsePrice(row['Cost Price (CNY)']),
    sellingPriceUsd: parsePrice(row['Selling Price (USD)']),
    minOrderQty: parseIntSafe(row['Min Order Qty']) || 1,
    packageQty: parseIntSafe(row['Package Qty']) || 1,
    packageUnit: String(row['Package Unit'] || 'Each'),
    weight: parsePrice(row['Weight (kg)']),
    weightUnit: 'kg',
    leadTime: String(row['Lead Time'] || '2-4 weeks'),
    availability: 'In Stock',
    status: 'published',
    purchaseMode: 'Buy Online + RFQ',
    attributes,
    metaTitle: String(row['Meta Title'] || ''),
    metaDescription: String(row['Meta Description'] || ''),
    focusKeyword: String(row['Focus Keyword'] || ''),
    sourceUrl: String(row['Source URL'] || ''),
    faqs,
    _errors: [],
  };

  console.log('Testing with 1 product:', testRow.name);
  console.log('Full Desc has newlines:', testRow.fullDescription.includes('\n'));
  console.log('Cost:', testRow.costPriceCny, 'Sell:', testRow.sellingPriceUsd);

  const body = JSON.stringify({ rows: [testRow], translateAfterImport: false });
  console.log('Request body size:', (body.length / 1024).toFixed(1), 'KB');

  return new Promise((resolve, reject) => {
    const u = new URL(`${ADMIN_URL}/api/admin/products/batch-import`);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      console.log('\nResponse status:', res.statusCode);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        console.log('Chunk:', chunk.toString().trim().substring(0, 200));
      });
      res.on('end', () => {
        console.log('\nResponse complete. Total data length:', data.length);
        resolve();
      });
    });
    req.setTimeout(300000); // 5 min
    req.on('timeout', () => { console.log('REQUEST TIMEOUT'); req.destroy(); reject(new Error('timeout')); });
    req.on('error', (e) => { console.error('Request error:', e.message); reject(e); });
    req.write(body);
    req.end();
    console.log('Request sent, waiting for response...');
  });
}

main().catch(e => { console.error(e); process.exit(1); });
