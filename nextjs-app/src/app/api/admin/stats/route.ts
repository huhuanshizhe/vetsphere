import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Parallel queries for stats
    const [
      usersResult,
      usersTodayResult,
      usersWeekResult,
      ordersResult,
      ordersPendingResult,
      ordersPaidResult,
      ordersShippedResult,
      revenueResult,
      revenueMonthResult,
      coursesResult,
      coursesPublishedResult,
      enrollmentsResult,
      enrollmentsMonthResult,
      productsResult,
      productsPublishedResult,
      lowStockResult,
      postsResult,
      postsWeekResult,
      moderationResult
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Paid'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Shipped'),
      supabase.from('orders').select('total_amount'),
      supabase.from('orders').select('total_amount').gte('created_at', monthStart).eq('status', 'Paid'),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
      supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
      supabase.from('course_enrollments').select('id', { count: 'exact', head: true }).gte('enrollment_date', monthStart),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
      supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock', 5),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('content_moderation').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    // Calculate total revenue
    const totalRevenue = revenueResult.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const monthRevenue = revenueMonthResult.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const stats = {
      users: {
        total: usersResult.count || 0,
        newToday: usersTodayResult.count || 0,
        newThisWeek: usersWeekResult.count || 0,
        activeToday: Math.floor((usersResult.count || 0) * 0.3) // Estimate
      },
      orders: {
        total: ordersResult.count || 0,
        pending: ordersPendingResult.count || 0,
        paid: ordersPaidResult.count || 0,
        shipped: ordersShippedResult.count || 0,
        revenue: totalRevenue,
        revenueThisMonth: monthRevenue
      },
      courses: {
        total: coursesResult.count || 0,
        published: coursesPublishedResult.count || 0,
        enrollments: enrollmentsResult.count || 0,
        enrollmentsThisMonth: enrollmentsMonthResult.count || 0
      },
      products: {
        total: productsResult.count || 0,
        published: productsPublishedResult.count || 0,
        lowStock: lowStockResult.count || 0
      },
      community: {
        posts: postsResult.count || 0,
        postsThisWeek: postsWeekResult.count || 0,
        pendingModeration: moderationResult.count || 0
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    
    // Return fallback stats
    return NextResponse.json({
      users: { total: 0, newToday: 0, newThisWeek: 0, activeToday: 0 },
      orders: { total: 0, pending: 0, paid: 0, shipped: 0, revenue: 0, revenueThisMonth: 0 },
      courses: { total: 0, published: 0, enrollments: 0, enrollmentsThisMonth: 0 },
      products: { total: 0, published: 0, lowStock: 0 },
      community: { posts: 0, postsThisWeek: 0, pendingModeration: 0 }
    });
  }
}
