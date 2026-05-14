import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

function normalizeSiteCode(value: string | null): 'cn' | 'intl' | null {
  if (value === 'cn' || value === 'intl') {
    return value;
  }

  return null;
}

function extractAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieToken = req.cookies.get('sb-access-token')?.value;
  return cookieToken || undefined;
}

// GET /api/categories - Get category tree
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteCode = normalizeSiteCode(searchParams.get('site_code'));
  const flat = searchParams.get('flat') === 'true';

  if (!siteCode) {
    return NextResponse.json({ categories: [] });
  }

  try {
    const requestSupabase = getSupabaseAdmin(extractAccessToken(request));

    if (flat) {
      // Return flat list for dropdowns
      const { data, error } = await requestSupabase
        .from('product_categories')
        .select('id, name, slug, level, parent_id, icon, sort_order')
        .eq('is_active', true)
        .eq('site_code', siteCode)
        .order('level')
        .order('sort_order');

      if (error) throw error;
      return NextResponse.json({ categories: data });
    }

    // Return tree structure
    const { data, error } = await requestSupabase
      .from('product_categories')
      .select('id, name, slug, level, parent_id, icon, description, sort_order, site_code')
      .eq('is_active', true)
      .eq('site_code', siteCode)
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

  flatList.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  flatList.forEach((item) => {
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
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  try {
    const body = await request.json();
    const { name, slug, parent_id, level, icon, description, site_code } = body;
    const normalizedSiteCode = normalizeSiteCode(site_code ?? null);

    if (!normalizedSiteCode) {
      return NextResponse.json({ error: 'site_code must be cn or intl' }, { status: 400 });
    }

    const requestSupabase = getSupabaseAdmin(extractAccessToken(request));

    const id = `cat-${slug}-${Date.now()}`;

    const { data, error } = await requestSupabase
      .from('product_categories')
      .insert({
        id,
        name,
        slug,
        parent_id: parent_id || null,
        level: level || 1,
        icon: icon || null,
        description: description || null,
        site_code: normalizedSiteCode,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    writeAuditLog(request, auth.admin, {
      module: 'category',
      action: 'create',
      targetType: 'product_category',
      targetId: id,
      targetName: name,
      newValue: { name, slug, parent_id, level, site_code: normalizedSiteCode },
      changesSummary: `创建商品分类：${name}`,
    });

    return NextResponse.json({ category: data });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
