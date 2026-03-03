import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 允许的文件类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST: 上传资质文件
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    // 解析 multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('type') as string || 'license'; // 'license' | 'supplementary'
    
    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }
    
    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件格式，请上传 JPG、PNG、WebP 或 PDF 文件' }, 
        { status: 400 }
      );
    }
    
    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小不能超过 10MB' }, 
        { status: 400 }
      );
    }
    
    // 生成文件名
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${user.id}/${fileType}_${timestamp}.${ext}`;
    
    // 转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // 上传到 Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('doctor-credentials')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      // 如果 bucket 不存在，返回提示
      if (error.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { error: '存储配置错误，请联系管理员' }, 
          { status: 500 }
        );
      }
      return NextResponse.json({ error: '上传失败' }, { status: 500 });
    }
    
    // 获取公开 URL
    const { data: urlData } = supabaseAdmin.storage
      .from('doctor-credentials')
      .getPublicUrl(data.path);
    
    return NextResponse.json({ 
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (err) {
    console.error('Upload credential error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
