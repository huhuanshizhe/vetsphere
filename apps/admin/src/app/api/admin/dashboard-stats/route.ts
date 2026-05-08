import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { getAdminUserKpis } from '@/lib/user-directory';

/**
 * GET /api/admin/dashboard-stats?site_code=cn|intl|global
 *
 * 仪表盘聚合接口：一次返回所有 KPI，按站点过滤。
 * - global：不过滤站点，看全量数据
 * - cn / intl：通过 *_site_views 表过滤
 *
 * 内存级缓存：5 分钟，按 site_code 分键
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ts: number; payload: unknown }>();

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  const siteCode = url.searchParams.get('site_code') || 'global';
  const forceRefresh = url.searchParams.get('refresh') === '1';
  const filterSite = siteCode === 'cn' || siteCode === 'intl';

  const cached = cache.get(siteCode);
  if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, {
      headers: { 'X-Cache': 'HIT', 'X-Cache-Age': String(Date.now() - cached.ts) },
    });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const normalizedSiteCode = siteCode === 'cn' || siteCode === 'intl' ? siteCode : 'global';

    // ---- 课程：按站点过滤通过 course_site_views ----
    const coursesTotalQ = filterSite
      ? supabase
          .from('course_site_views')
          .select('course_id', { count: 'exact', head: true })
          .eq('site_code', siteCode)
      : supabase.from('courses').select('id', { count: 'exact', head: true }).is('deleted_at', null);

    const coursesPublishedQ = filterSite
      ? supabase
          .from('course_site_views')
          .select('course_id', { count: 'exact', head: true })
          .eq('site_code', siteCode)
          .eq('publish_status', 'published')
          .eq('is_enabled', true)
      : supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'published');

    // ---- 商品：按站点过滤通过 product_site_views ----
    const productsTotalQ = filterSite
      ? supabase
          .from('product_site_views')
          .select('product_id', { count: 'exact', head: true })
          .eq('site_code', siteCode)
      : supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null);

    const productsPublishedQ = filterSite
      ? supabase
          .from('product_site_views')
          .select('product_id', { count: 'exact', head: true })
          .eq('site_code', siteCode)
          .eq('publish_status', 'published')
          .eq('is_enabled', true)
      : supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'published');

    const userKpisPromise = getAdminUserKpis(normalizedSiteCode, todayStart);

    const [
      userKpis,
      totalCoursesR,
      publishedCoursesR,
      totalProductsR,
      publishedProductsR,
      newLeadsR,
      totalLeadsR,
      todayLeadsR,
      logsR,
    ] = await Promise.all([
      userKpisPromise,
      coursesTotalQ,
      coursesPublishedQ,
      productsTotalQ,
      productsPublishedQ,
      supabase.from('purchase_leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('purchase_leads').select('id', { count: 'exact', head: true }),
      supabase
        .from('purchase_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const payload = {
      site_code: siteCode,
      stats: {
        totalUsers: userKpis.totalUsers,
        totalDoctors: userKpis.approvedUsers,
        pendingVerifications: userKpis.pendingUsers,
        totalCourses: totalCoursesR.count || 0,
        publishedCourses: publishedCoursesR.count || 0,
        totalProducts: totalProductsR.count || 0,
        publishedProducts: publishedProductsR.count || 0,
        newLeads: newLeadsR.count || 0,
        totalLeads: totalLeadsR.count || 0,
        todayUsers: userKpis.todayUsers,
        todayLeads: todayLeadsR.count || 0,
      },
      recentLogs: logsR.data || [],
    };

    cache.set(siteCode, { ts: Date.now(), payload });

    return NextResponse.json(payload, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
