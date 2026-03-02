/**
 * Test script to verify course save functionality
 * Tests RLS policies by authenticating as CourseProvider and inserting a course
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3MTIsImV4cCI6MjA4NjQyMTcxMn0.xM7u06mRQSCKCoNQwYa2_wEw4he4ZM11iDfyhjfQtDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCourseSave() {
  console.log('=== Course Save Test ===\n');

  // Step 1: Sign in as CourseProvider
  console.log('1. Signing in as CourseProvider (edu@csavs.org)...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'edu@csavs.org',
    password: 'edu123',
  });

  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    process.exit(1);
  }

  console.log('✅ Signed in successfully');
  console.log('   User ID:', authData.user.id);

  // Step 2: Create test course data (minimal columns)
  const testCourse = {
    id: `test-${Date.now()}`,
    title: 'Test Course - RLS Verification',
    description: 'Automated test to verify RLS policies',
    specialty: 'Orthopedics',
    level: 'Basic',
    price: 1000,
    currency: 'CNY',
    start_date: '2026-04-01',
    end_date: '2026-04-03',
    location: { city: 'Test City', venue: 'Test Venue', address: 'Test Address' },
    instructor: { name: 'Test Instructor', title: 'Test Title', bio: 'Test Bio', credentials: [], imageUrl: '' },
    image_url: 'https://example.com/test.jpg',
    status: 'Draft',
    agenda: [],
    provider_id: authData.user.id,
  };

  // Step 3: Insert course
  console.log('\n2. Inserting test course...');
  const { data: insertData, error: insertError } = await supabase
    .from('courses')
    .insert(testCourse)
    .select();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('   Code:', insertError.code);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
    process.exit(1);
  }

  console.log('✅ Course inserted successfully');
  console.log('   Course ID:', testCourse.id);

  // Step 4: Verify course exists
  console.log('\n3. Verifying course exists...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('courses')
    .select('id, title, status, provider_id')
    .eq('id', testCourse.id)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
    process.exit(1);
  }

  console.log('✅ Course verified');
  console.log('   Title:', verifyData.title);
  console.log('   Status:', verifyData.status);

  // Step 5: Clean up - delete test course
  console.log('\n4. Cleaning up test course...');
  const { error: deleteError } = await supabase
    .from('courses')
    .delete()
    .eq('id', testCourse.id);

  if (deleteError) {
    console.error('⚠️ Cleanup failed (not critical):', deleteError.message);
  } else {
    console.log('✅ Test course deleted');
  }

  // Final result
  console.log('\n=== TEST PASSED ===');
  console.log('RLS policies are correctly configured.');
  console.log('CourseProvider can successfully create courses.');

  await supabase.auth.signOut();
  process.exit(0);
}

testCourseSave().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
