/**
 * 用户通知 API
 * GET /api/notifications - 获取用户通知列表
 * PUT /api/notifications - 标记通知为已读
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function apiResponse<T>(code: number, message: string, data?: T) {
  return NextResponse.json({
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const type = searchParams.get('type');
    const isRead = searchParams.get('is_read');
    const siteCode = searchParams.get('site_code') || 'cn';

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('site_code', siteCode);

    if (type) {
      query = query.eq('type', type);
    }
    if (isRead === 'true') {
      query = query.eq('is_read', true);
    } else if (isRead === 'false') {
      query = query.eq('is_read', false);
    }

    query = query.order('sent_at', { ascending: false });

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: notifications, count, error } = await query;

    if (error) {
      console.error('查询通知列表失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 获取未读数量
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('site_code', siteCode)
      .eq('is_read', false);

    return apiResponse(200, '查询成功', {
      items: notifications || [],
      unread_count: unreadCount || 0,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('通知列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    const body = await request.json();
    const { notification_ids, mark_all } = body;

    if (mark_all) {
      // 标记所有为已读
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('标记全部已读失败:', error);
        return apiResponse(500, '操作失败');
      }

      return apiResponse(200, '已全部标记为已读');
    }

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return apiResponse(400, '请指定要标记的通知');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('id', notification_ids);

    if (error) {
      console.error('标记已读失败:', error);
      return apiResponse(500, '操作失败');
    }

    return apiResponse(200, '标记成功');

  } catch (error) {
    console.error('标记通知API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
