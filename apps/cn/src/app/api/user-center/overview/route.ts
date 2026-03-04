import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/user-center/overview
 * 
 * 获取用户中心概览数据（双轨制：所有登录用户可访问）
 * 
 * 返回:
 * - learningOverview: 学习概览（购课数、进行中、最近学习）
 * - ordersOverview: 订单概览（各状态订单数、最近订单）
 * - upgradeCard: 医生升级入口卡（仅 doctor 组未认证时显示）
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    // 并行获取各项数据
    const [enrollmentsRes, ordersRes, snapshotRes, pointsRes] = await Promise.allSettled([
      // 课程报名
      supabaseAdmin
        .from('course_enrollments')
        .select('id, course_id, payment_status, completion_status, enrollment_date')
        .eq('user_id', user.id)
        .order('enrollment_date', { ascending: false }),
      
      // 订单
      supabaseAdmin
        .from('orders')
        .select('id, status, total_amount, date, payment_status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      
      // 状态快照（获取身份信息）
      supabaseAdmin
        .from('cn_user_state_snapshots')
        .select('identity_group_v2, doctor_privilege_status')
        .eq('user_id', user.id)
        .eq('site_code', 'cn')
        .single(),
      
      // 积分
      supabaseAdmin
        .from('user_points')
        .select('total_points, level')
        .eq('user_id', user.id)
        .single(),
    ]);

    // 解析结果
    const enrollments = enrollmentsRes.status === 'fulfilled' ? enrollmentsRes.value.data || [] : [];
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data || [] : [];
    const snapshot = snapshotRes.status === 'fulfilled' ? snapshotRes.value.data : null;
    const points = pointsRes.status === 'fulfilled' ? pointsRes.value.data : null;

    // 学习概览
    const paidEnrollments = enrollments.filter((e: any) => e.payment_status === 'paid');
    const learningOverview = {
      purchasedCourseCount: paidEnrollments.length,
      inProgressCount: paidEnrollments.filter((e: any) => e.completion_status === 'in_progress').length,
      completedCount: paidEnrollments.filter((e: any) => e.completion_status === 'completed').length,
      recentItems: paidEnrollments.slice(0, 3).map((e: any) => ({
        courseId: e.course_id,
        enrollmentDate: e.enrollment_date,
        completionStatus: e.completion_status,
      })),
    };

    // 订单概览
    const orderCounts = {
      pendingPayment: orders.filter((o: any) => o.status === 'Pending' || o.payment_status === 'pending').length,
      pendingShipment: orders.filter((o: any) => o.status === 'Paid').length,
      pendingReceipt: orders.filter((o: any) => o.status === 'Shipped').length,
      completed: orders.filter((o: any) => o.status === 'Completed').length,
      total: orders.length,
    };
    const ordersOverview = {
      orderCounts,
      recentOrders: orders.slice(0, 3).map((o: any) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.total_amount,
        date: o.date,
      })),
    };

    // 升级入口卡
    const identityGroupV2 = snapshot?.identity_group_v2;
    const doctorPrivilegeStatus = snapshot?.doctor_privilege_status || 'not_applicable';
    
    // 仅 doctor 组且未 approved 时显示升级卡
    const showDoctorUpgradeCard = identityGroupV2 === 'doctor' && doctorPrivilegeStatus !== 'approved';
    const upgradeCard = {
      showDoctorUpgradeCard,
      doctorUpgradeEligible: identityGroupV2 === 'doctor',
      currentStatus: doctorPrivilegeStatus,
      statusLabel: {
        not_applicable: null,
        not_started: '未开始认证',
        pending_review: '认证审核中',
        approved: '已认证',
        rejected: '认证被驳回',
      }[doctorPrivilegeStatus] || null,
    };

    // 积分概览
    const pointsOverview = {
      totalPoints: points?.total_points || 0,
      level: points?.level || 'Resident',
    };

    return NextResponse.json({
      learningOverview,
      ordersOverview,
      upgradeCard,
      pointsOverview,
    });
    
  } catch (err) {
    console.error('GET /api/user-center/overview error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
