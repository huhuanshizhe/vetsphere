import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/categories - Get category tree
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteCode = searchParams.get('site_code') || 'global';
  const flat = searchParams.get('flat') === 'true';

  try {
    if (flat) {
      // Return flat list for dropdowns
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, slug, level, parent_id, icon, sort_order')
        .eq('is_active', true)
        .in('site_code', [siteCode, 'global'])
        .order('level')
        .order('sort_order');

      if (error) throw error;
      return NextResponse.json({ categories: data });
    }

    // Return tree structure
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name, slug, level, parent_id, icon, description, sort_order, site_code')
      .eq('is_active', true)
      .in('site_code', [siteCode, 'global'])
      .order('level')
      .order('sort_order');

    if (error) throw error;

    // Build tree
    const tree = buildTree(data || []);
    return NextResponse.json({ categories: tree });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

function buildTree(flatList: any[]) {
  const map = new Map<string, any>();
  const roots: any[] = [];

  flatList.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  flatList.forEach(item => {
    const node = map.get(item.id);
    if (item.parent_id && map.has(item.parent_id)) {
      const parent = map.get(item.parent_id);
      parent.children.push(node);
    } else if (item.level === 1) {
      roots.push(node);
    }
  });

  return roots;
}

// POST /api/categories - Create category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, parent_id, level, icon, description, site_code } = body;

    const id = `cat-${slug}-${Date.now()}`;

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        id,
        name,
        slug,
        parent_id: parent_id || null,
        level: level || 1,
        icon: icon || null,
        description: description || null,
        site_code: site_code || 'global',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ category: data });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
