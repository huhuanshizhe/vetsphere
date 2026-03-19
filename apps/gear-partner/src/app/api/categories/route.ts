import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/categories - Get category tree or flat list
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id');
  const level = searchParams.get('level');
  const flat = searchParams.get('flat') === 'true';

  try {
    // If parent_id is provided, get children of that category
    if (parentId !== null) {
      const query = supabase
        .from('product_categories')
        .select('id, name, name_en, slug, level, parent_id, icon, sort_order')
        .eq('is_active', true)
        .eq('parent_id', parentId === 'null' ? null : parentId)
        .order('sort_order');

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ categories: data });
    }

    // If level is provided, get categories at that level
    if (level !== null) {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, name_en, slug, level, parent_id, icon, sort_order')
        .eq('is_active', true)
        .eq('level', parseInt(level))
        .order('sort_order');

      if (error) throw error;
      return NextResponse.json({ categories: data });
    }

    if (flat) {
      // Return flat list for dropdowns
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, name_en, slug, level, parent_id, icon, sort_order')
        .eq('is_active', true)
        .order('level')
        .order('sort_order');

      if (error) throw error;
      return NextResponse.json({ categories: data });
    }

    // Return tree structure (default)
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name, name_en, slug, level, parent_id, icon, sort_order')
      .eq('is_active', true)
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
