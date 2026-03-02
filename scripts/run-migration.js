/**
 * VetSphere Database Migration Script
 * 使用 Supabase service role 执行数据库迁移
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0NTcxMiwiZXhwIjoyMDg2NDIxNzEyfQ.4MJZdR7l2OmAtW1gXpXvJtk5LFqXN7Y8kn7NiFtzsc8';

async function checkTable(tableName) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=0`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  return response.ok;
}

async function main() {
  console.log('VetSphere 数据库迁移检查\n');
  console.log('=====================================');
  
  const tables = [
    'user_profiles',
    'user_points', 
    'point_transactions',
    'course_enrollments',
    'post_interactions',
    'post_comments'
  ];
  
  const missingTables = [];
  
  for (const table of tables) {
    const exists = await checkTable(table);
    const status = exists ? '✓ 存在' : '✗ 缺失';
    console.log(`${table}: ${status}`);
    if (!exists) {
      missingTables.push(table);
    }
  }
  
  console.log('\n=====================================');
  
  if (missingTables.length === 0) {
    console.log('所有必需的表都已存在！');
    return;
  }
  
  console.log(`\n发现 ${missingTables.length} 个缺失的表:`);
  missingTables.forEach(t => console.log(`  - ${t}`));
  
  console.log('\n请在 Supabase Dashboard 中执行以下迁移脚本:');
  console.log('  1. 打开 https://supabase.com/dashboard/project/tvxrgbntiksskywsroax/sql');
  console.log('  2. 复制 supabase_migration_001.sql 的内容');
  console.log('  3. 点击 Run 执行');
}

main().catch(console.error);
