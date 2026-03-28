import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

/**
 * GET /api/addresses - 获取用户所有地址
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch addresses:', error);
      return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Addresses API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/addresses - 添加新地址
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      company, 
      email, 
      phone, 
      country, 
      state, 
      city, 
      address_line1, 
      address_line2, 
      postal_code,
      tax_id,
      is_default 
    } = body;

    // 验证必填字段
    if (!name || !email || !phone || !country || !city || !address_line1) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, email, phone, country, city, address_line1' 
      }, { status: 400 });
    }

    // 如果设为默认地址，先取消其他默认地址
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        name,
        company,
        email,
        phone,
        country,
        state,
        city,
        address_line1,
        address_line2,
        postal_code,
        tax_id,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create address:', error);
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error('Addresses API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/addresses - 更新地址
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    // 验证地址属于当前用户
    const { data: existingAddress, error: fetchError } = await supabase
      .from('addresses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (existingAddress.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 如果设为默认地址，先取消其他默认地址
    if (updates.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update address:', error);
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error('Addresses API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/addresses - 删除地址
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    // 验证地址属于当前用户
    const { data: existingAddress, error: fetchError } = await supabase
      .from('addresses')
      .select('user_id, is_default')
      .eq('id', id)
      .single();

    if (fetchError || !existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (existingAddress.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete address:', error);
      return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Addresses API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}