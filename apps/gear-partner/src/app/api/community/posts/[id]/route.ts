/**
 * 帖子详情 API
 * GET /api/community/posts/[id] - 获取帖子详情
 * PUT /api/community/posts/[id] - 更新帖子
 * DELETE /api/community/posts/[id] - 删除帖子
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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (id, full_name, avatar_url, is_doctor)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !post) {
      return apiResponse(404, '帖子不存在');
    }

    // 增加浏览量
    await supabase
      .from('posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', id);

    const result = {
      ...post,
      author: post.profiles,
      profiles: undefined,
      view_count: (post.view_count || 0) + 1,
    };

    return apiResponse(200, '查询成功', result);

  } catch (error) {
    console.error('帖子详情API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    // 检查是否为作者
    const { data: existingPost } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return apiResponse(403, '无权编辑此帖子');
    }

    const { title, content, category, cover_image_url, tags } = body;
    const excerpt = content ? content.replace(/<[^>]+>/g, '').slice(0, 200) : undefined;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) {
      updateData.content = content;
      updateData.excerpt = excerpt;
    }
    if (category !== undefined) updateData.category = category;
    if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;
    if (tags !== undefined) updateData.tags = tags;

    const { data: post, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新帖子失败:', error);
      return apiResponse(500, '更新失败');
    }

    return apiResponse(200, '更新成功', post);

  } catch (error) {
    console.error('更新帖子API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    // 检查是否为作者
    const { data: existingPost } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return apiResponse(403, '无权删除此帖子');
    }

    // 软删除
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('删除帖子失败:', error);
      return apiResponse(500, '删除失败');
    }

    return apiResponse(200, '删除成功');

  } catch (error) {
    console.error('删除帖子API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
