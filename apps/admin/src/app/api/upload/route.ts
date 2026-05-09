import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getSupabaseAdmin, hasSupabaseServiceRoleKey } from '@/lib/supabase/admin';
import { isOSSConfigured, uploadBufferToOSS } from '@/lib/oss';

export const runtime = 'nodejs';

async function resolveAdminPublicDir() {
  const candidates = [path.join(process.cwd(), 'public'), path.join(process.cwd(), 'apps', 'admin', 'public')];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return candidates[0];
}

async function saveToLocalPublicUploads(buffer: Buffer, type: string, extension: string) {
  const safeType = type.replace(/[^a-z0-9_-]/gi, '-').toLowerCase() || 'product';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const publicDir = await resolveAdminPublicDir();
  const uploadDir = path.join(publicDir, 'uploads', 'products', safeType);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return path.posix.join('/uploads', 'products', safeType, fileName);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = typeof formData.get('type') === 'string' ? String(formData.get('type')) : 'product';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '仅支持图片文件 (JPEG/PNG/WebP/GIF/SVG)' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '图片最大 5MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : undefined;

    let url: string;

    if (isOSSConfigured()) {
      url = await uploadBufferToOSS(buffer, {
        entityId: `${type}-${Date.now()}`,
        contentType: file.type,
        extension,
        prefix: 'vetsphere/products/uploads',
      });
    } else if (hasSupabaseServiceRoleKey()) {
      const supabase = getSupabaseAdmin();
      const safeExtension = extension || '.jpg';
      const objectPath = `products/${type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(objectPath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('[Admin Upload] Storage upload failed:', uploadError);
        return NextResponse.json({ error: `上传失败: ${uploadError.message}` }, { status: 500 });
      }

      const { data } = supabase.storage.from('user-avatars').getPublicUrl(objectPath);
      url = data.publicUrl;
    } else {
      url = await saveToLocalPublicUploads(buffer, type, extension || '.jpg');
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[Admin Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误，请稍后重试' },
      { status: 500 },
    );
  }
}