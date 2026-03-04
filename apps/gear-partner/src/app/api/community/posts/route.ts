/**
 * 社区帖子列表 API
 * GET /api/community/posts - 获取帖子列表（支持筛选、分页）
 * POST /api/community/posts - 发布新帖子
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
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const postType = searchParams.get('type');
    const category = searchParams.get('category');
    const authorId = searchParams.get('author_id');
    const keyword = searchParams.get('keyword');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const siteCode = searchParams.get('site_code') || 'cn';

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        excerpt,
        post_type,
        category,
        cover_image_url,
        is_pinned,
        is_featured,
        view_count,
        like_count,
        comment_count,
        author_id,
        published_at,
        created_at,
        profiles:author_id (id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null)
      .eq('site_code', siteCode);

    if (postType) {
      query = query.eq('post_type', postType);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (authorId) {
      query = query.eq('author_id', authorId);
    }
    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,excerpt.ilike.%${keyword}%`);
    }

    const ascending = sortOrder === 'asc';
    
    // 置顶帖优先
    query = query.order('is_pinned', { ascending: false });
    query = query.order(sortBy, { ascending });

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: posts, count, error } = await query;

    if (error) {
      console.error('查询帖子列表失败:', error);
      return apiResponse(500, '查询失败');
    }

    const mappedPosts = (posts || []).map((post: any) => ({
      ...post,
      author: post.profiles,
      profiles: undefined,
    }));

    return apiResponse(200, '查询成功', {
      items: mappedPosts,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('帖子列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, post_type, category, cover_image_url, tags, site_code } = body;

    // 从请求头获取用户信息 (需要认证中间件)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    if (!title || !content || !post_type) {
      return apiResponse(400, '缺少必填字段');
    }

    const excerpt = content.replace(/<[^>]+>/g, '').slice(0, 200);

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        post_type,
        category,
        cover_image_url,
        tags,
        site_code: site_code || 'cn',
        author_id: user.id,
        status: 'pending', // 新帖子需要审核
        view_count: 0,
        like_count: 0,
        comment_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('创建帖子失败:', error);
      return apiResponse(500, '创建失败');
    }

    return apiResponse(200, '发布成功，等待审核', post);

  } catch (error) {
    console.error('创建帖子API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
