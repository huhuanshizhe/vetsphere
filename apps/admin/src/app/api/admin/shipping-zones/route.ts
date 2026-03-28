import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - 获取所有配送区域
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('shipping_zones')
      .select('*')
      .order('display_order');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch shipping zones:', error);
    return NextResponse.json({ error: 'Failed to fetch shipping zones' }, { status: 500 });
  }
}

// POST - 创建配送区域
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('shipping_zones')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create shipping zone:', error);
    return NextResponse.json({ error: 'Failed to create shipping zone', details: error }, { status: 500 });
  }
}

// PUT - 更新配送区域
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shipping_zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update shipping zone:', error);
    return NextResponse.json({ error: 'Failed to update shipping zone', details: error }, { status: 500 });
  }
}

// DELETE - 删除配送区域
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('shipping_zones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete shipping zone:', error);
    return NextResponse.json({ error: 'Failed to delete shipping zone' }, { status: 500 });
  }
}
