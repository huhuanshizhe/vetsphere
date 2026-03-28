const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const databaseUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const migrationFile = path.join(__dirname, '../supabase/migrations/20260325000002_enhance_checkout_flow.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('正在执行迁移: 20260325000002_enhance_checkout_flow.sql');
    console.log('---');
    
    await pool.query(sql);
    
    console.log('✅ 迁移执行成功！');
    
    // 验证新表
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('product_price_tiers', 'payment_records', 'bank_transfer_configs', 'shopping_cart', 'shopping_cart_items')
      ORDER BY table_name;
    `);
    
    console.log('/n验证新表:');
    tables.rows.forEach(r => console.log('  ✓ ' + r.table_name));
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
