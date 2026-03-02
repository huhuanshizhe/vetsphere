import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'cover' | 'instructor' | 'video'

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    // 验证文件类型
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 });
    }

    // 验证文件大小
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB for video, 5MB for image
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `文件过大，${isVideo ? '视频' : '图片'}最大 ${isVideo ? '100MB' : '5MB'}` 
      }, { status: 400 });
    }

    // 生成文件名
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `courses/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 尝试上传到 user-avatars bucket（已存在的 bucket）
    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: `上传失败: ${uploadError.message}` 
      }, { status: 500 });
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      url: urlData.publicUrl,
      success: true 
    });

  } catch (err) {
    console.error('Upload API error:', err);
    return NextResponse.json({ 
      error: '服务器错误，请稍后重试' 
    }, { status: 500 });
  }
}
