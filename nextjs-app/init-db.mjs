/**
 * VetSphere Database Initialization Script
 * Tries multiple approaches to set up the database:
 * 1. Direct PostgreSQL connection via pg module
 * 2. REST API seeding via service_role key
 */
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
    }
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

console.log(`Project: ${PROJECT_REF}`);
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Service key: ${SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'MISSING'}`);

const sqlContent = fs.readFileSync(path.join(__dirname, 'init-database.sql'), 'utf8');

// Headers for REST API calls
const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function tryDirectPostgres() {
  console.log('\n=== Attempt 1: Direct PostgreSQL connection ===');
  try {
    const { Client } = require('pg');

    // Try multiple connection configurations
    const configs = [
      {
        label: 'Direct connection (service_role as password)',
        connectionString: `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
        ssl: { rejectUnauthorized: false }
      },
      {
        label: 'Direct DB host (service_role as password)',
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false }
      },
      {
        label: 'Pooler transaction mode',
        connectionString: `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
      },
      // Try US regions too
      {
        label: 'Pooler US East',
        connectionString: `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
        ssl: { rejectUnauthorized: false }
      },
      {
        label: 'Pooler US West',
        connectionString: `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
        ssl: { rejectUnauthorized: false }
      },
      {
        label: 'Pooler EU West',
        connectionString: `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
        ssl: { rejectUnauthorized: false }
      },
    ];

    for (const config of configs) {
      const { label, ...pgConfig } = config;
      console.log(`  Trying: ${label}...`);
      const client = new Client(pgConfig);
      try {
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 8000))
        ]);
        console.log(`  Connected via: ${label}`);

        // Execute the full SQL
        await client.query(sqlContent);
        console.log('  SQL executed successfully!');
        await client.end();
        return true;
      } catch (e) {
        console.log(`  Failed: ${e.message.substring(0, 80)}`);
        try { await client.end(); } catch {}
      }
    }
    return false;
  } catch (e) {
    console.log(`  pg module error: ${e.message}`);
    return false;
  }
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, { headers, ...options });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data };
}

async function seedViaRestAPI() {
  console.log('\n=== Attempt 2: Seed data via REST API (service_role key) ===');
  console.log('Note: REST API cannot create tables, only insert/read data.\n');

  // Check which tables exist
  const tables = ['profiles', 'products', 'courses', 'orders', 'shipping_templates', 'posts', 'notifications', 'leads', 'quotes'];
  const existing = {};

  for (const table of tables) {
    const { status, data } = await fetchJSON(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`);
    existing[table] = status === 200;
    console.log(`  ${table}: ${status === 200 ? 'EXISTS' : 'NOT FOUND'} (${status})`);
  }

  const existingTables = Object.entries(existing).filter(([, v]) => v).map(([k]) => k);
  const missingTables = Object.entries(existing).filter(([, v]) => !v).map(([k]) => k);

  console.log(`\n  Existing: [${existingTables.join(', ')}]`);
  console.log(`  Missing:  [${missingTables.join(', ')}]`);

  if (missingTables.length > 0 && missingTables.length >= 7) {
    console.log('\n  Most tables are missing. Tables must be created via SQL Editor.');
    console.log('  Generating individual table creation commands via pg-meta...');

    // Try Supabase pg-meta SQL execution endpoints
    const sqlEndpoints = [
      `${SUPABASE_URL}/pg/query`,
      `${SUPABASE_URL}/pg-meta/default/query`,
    ];

    for (const endpoint of sqlEndpoints) {
      console.log(`  Trying SQL endpoint: ${endpoint}`);
      try {
        const { status, data } = await fetchJSON(endpoint, {
          method: 'POST',
          body: JSON.stringify({ query: 'SELECT version()' })
        });
        console.log(`    Response: ${status} - ${JSON.stringify(data).substring(0, 100)}`);
        if (status === 200) {
          console.log('    SQL endpoint works! Executing full schema...');
          const { status: s2, data: d2 } = await fetchJSON(endpoint, {
            method: 'POST',
            body: JSON.stringify({ query: sqlContent })
          });
          console.log(`    Schema execution: ${s2}`);
          if (s2 === 200) return true;
        }
      } catch (e) {
        console.log(`    Error: ${e.message}`);
      }
    }
  }

  // Seed data into existing tables
  if (existing.products) {
    console.log('\n  Seeding products...');
    const products = [
      { id: 'p1', name: 'TPLO High-Torque Saw System', brand: 'SurgiTech', price: 15800, specialty: 'Orthopedics', group_category: 'PowerTools', image_url: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=600&q=80', description: 'German-engineered oscillating saw optimized for TPLO procedures.', long_description: 'Fully sealed waterproof design, supporting autoclave sterilization.', specs: { 'No-load Speed': '0-15000 rpm', Weight: '820g', Sterilization: '134°C Autoclave' }, supplier_info: { name: 'SurgiTech Germany GmbH', origin: 'Germany', rating: 4.9 }, stock_status: 'In Stock' },
      { id: 'p2', name: 'Titanium Locking Plate System 2.4/2.7/3.5mm', brand: 'VetOrtho', price: 1250, specialty: 'Orthopedics', group_category: 'Implants', image_url: 'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=600&q=80', description: 'Medical Grade 5 Titanium locking plates.', specs: { Material: 'Ti-6Al-4V ELI', Surface: 'Anodized (Type II)' }, supplier_info: { name: 'VetOrtho Precision Mfg', origin: 'China', rating: 4.8 }, stock_status: 'In Stock' },
      { id: 'p3', name: 'Micro-Ophthalmic Forceps', brand: 'PrecisionEye', price: 1880, specialty: 'Eye Surgery', group_category: 'HandInstruments', image_url: 'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=600&q=80', description: 'Swiss-crafted tips for corneal and intraocular maneuvers.', specs: { Length: '115mm', 'Tip Size': '0.1mm' }, supplier_info: { name: 'Precision Eye Instruments', origin: 'USA', rating: 5.0 }, stock_status: 'Low Stock' },
      { id: 'p4', name: 'PGA Absorbable Sutures (Braided)', brand: 'SutureExpert', price: 580, specialty: 'Soft Tissue', group_category: 'Consumables', image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80', description: 'Box of 12. Excellent knot security.', specs: { Sizes: '2-0 / 3-0 / 4-0', Length: '75cm' }, supplier_info: { name: 'Global Medical Supplies', origin: 'Germany', rating: 4.7 }, stock_status: 'In Stock' },
    ];
    for (const p of products) {
      const { status } = await fetchJSON(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(p)
      });
      console.log(`    ${p.id}: ${status === 201 || status === 200 ? 'OK' : status}`);
    }
  }

  if (existing.courses) {
    console.log('\n  Seeding courses...');
    const courses = [
      { id: 'csavs-ultra-basic-2026', title: 'CSAVS Veterinary Ultrasound - Basic', specialty: 'Ultrasound', level: 'Basic', price: 9800, currency: 'CNY', start_date: '2026-03-30', end_date: '2026-04-03', location: { city: 'Maanshan, China', venue: 'CSAVS Practical Training Center' }, instructor: { name: 'Femke Bosma', title: 'DVM, DECVDI' }, image_url: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80', description: 'Systematic abdominal ultrasound training.', status: 'Published', agenda: [] },
      { id: 'csavs-soft-2026', title: 'CSAVS Practical Soft Tissue Surgery', specialty: 'Soft Tissue', level: 'Advanced', price: 4800, currency: 'CNY', start_date: '2026-03-18', end_date: '2026-03-20', location: { city: 'Nanjing, China', venue: 'Nanjing Agri Univ' }, instructor: { name: 'Joachim Proot', title: 'DVM, DECVS' }, image_url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80', description: 'Hands-on soft tissue workshop.', status: 'Published', agenda: [] },
      { id: 'csavs-eye-2026', title: 'European Veterinary Ophthalmology Certification', specialty: 'Eye Surgery', level: 'Master', price: 15000, currency: 'CNY', start_date: '2026-01-03', end_date: '2026-01-05', location: { city: 'Shanghai, China', venue: 'I-VET Center' }, instructor: { name: 'Rick F. Sanchez', title: 'DVM, DECVO' }, image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', description: 'Advanced corneal suturing and phaco.', status: 'Published', agenda: [] },
      { id: 'csavs-joint-2026', title: 'CSAVS Practical Joint Surgery Workshop', specialty: 'Orthopedics', level: 'Advanced', price: 4800, currency: 'CNY', start_date: '2026-03-18', end_date: '2026-03-20', location: { city: 'Maanshan, China', venue: 'CSAVS Training Center' }, instructor: { name: 'Antonio Pozzi', title: 'DVM, DECVS' }, image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', description: 'Joint surgery workshop.', status: 'Published', agenda: [] },
    ];
    for (const c of courses) {
      const { status } = await fetchJSON(`${SUPABASE_URL}/rest/v1/courses`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(c)
      });
      console.log(`    ${c.id}: ${status === 201 || status === 200 ? 'OK' : status}`);
    }
  }

  if (existing.posts) {
    console.log('\n  Seeding posts...');
    const posts = [
      { id: 'case-001', author_info: { name: 'Dr. Zhang', avatar: '', level: 'Expert', hospital: '上海中心宠物医院' }, title: '复杂粉碎性股骨骨折的 TPLO + 锁定钢板联合固定', content: '患犬为3岁拉布拉多...', specialty: 'Orthopedics', media: [], patient_info: { species: 'Canine (Labrador)', age: '3y', weight: '32kg' }, sections: { diagnosis: 'Distal Femoral Comminuted Fracture', plan: 'Dual Plate Fixation', outcome: 'Good weight bearing at 8 weeks' }, stats: { likes: 42, comments: 12, saves: 28 }, is_ai_analyzed: true },
      { id: 'case-002', author_info: { name: 'Dr. Emily Smith', avatar: '', level: 'Surgeon', hospital: 'London Vet Clinic' }, title: '神经外科：L3-L4 椎间盘突出导致的截瘫病例报告', content: '该病例展示了半椎板切除术...', specialty: 'Neurosurgery', media: [], patient_info: { species: 'Canine (Dachshund)', age: '6y', weight: '8kg' }, sections: { diagnosis: 'Acute IVDD (Hansen Type I)', plan: 'Hemilaminectomy at L3-L4', outcome: 'Pain sensation recovered in 48h' }, stats: { likes: 35, comments: 8, saves: 15 }, is_ai_analyzed: true },
    ];
    for (const p of posts) {
      const { status } = await fetchJSON(`${SUPABASE_URL}/rest/v1/posts`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(p)
      });
      console.log(`    ${p.id}: ${status === 201 || status === 200 ? 'OK' : status}`);
    }
  }

  return existingTables.length > 0;
}

async function verifyTables() {
  console.log('\n=== Verification: Check all tables ===');
  const tables = ['profiles', 'products', 'courses', 'orders', 'shipping_templates', 'posts', 'notifications', 'leads', 'quotes'];
  let allOk = true;

  for (const table of tables) {
    const { status, data } = await fetchJSON(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=3`);
    const count = Array.isArray(data) ? data.length : 0;
    const icon = status === 200 ? '[OK]' : '[--]';
    console.log(`  ${icon} ${table.padEnd(20)} status=${status}  rows=${count}`);
    if (status !== 200) allOk = false;
  }

  return allOk;
}

async function main() {
  console.log('=========================================');
  console.log(' VetSphere Database Init');
  console.log('=========================================');

  // Step 1: Try direct Postgres
  const pgSuccess = await tryDirectPostgres();

  if (pgSuccess) {
    console.log('\n Direct PostgreSQL execution succeeded!');
  } else {
    console.log('\n Direct PostgreSQL connection not available.');
    console.log(' Falling back to REST API approach...');
  }

  // Step 2: Seed via REST API (also verifies which tables exist)
  await seedViaRestAPI();

  // Step 3: Final verification
  const allOk = await verifyTables();

  console.log('\n=========================================');
  if (allOk) {
    console.log(' All tables accessible. Database ready!');
  } else {
    console.log(' Some tables are missing.');
    console.log(' Please run init-database.sql in Supabase Dashboard SQL Editor:');
    console.log(` https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  }
  console.log('=========================================');
}

main().catch(console.error);
