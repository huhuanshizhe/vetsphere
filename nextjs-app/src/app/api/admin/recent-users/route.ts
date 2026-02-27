import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const users = (data || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.display_name || '',
      role: u.role || 'User',
      createdAt: new Date(u.created_at).toISOString().split('T')[0]
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch recent users:', error);
    return NextResponse.json([]);
  }
}
