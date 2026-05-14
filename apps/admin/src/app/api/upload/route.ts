import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getSupabaseAdmin, hasSupabaseServiceRoleKey } from '@/lib/supabase/admin';
import { isOSSConfigured, uploadBufferToOSS } from '@/lib/oss';

export const runtime = 'nodejs';

const DEFAULT_INTERACTIVE_UPLOAD_WAIT_MS = 20000;

function resolveInteractiveUploadWaitMs() {
  const raw = Number(process.env.ADMIN_UPLOAD_WAIT_MS || DEFAULT_INTERACTIVE_UPLOAD_WAIT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERACTIVE_UPLOAD_WAIT_MS;
}

async function resolveAdminPublicDir() {
  const candidates = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'apps', 'admin', 'public'),
  ];

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

async function uploadToSupabaseStorage(
  buffer: Buffer,
  type: string,
  extension: string,
  contentType: string,
) {
  const supabase = getSupabaseAdmin();
  const safeExtension = extension || '.jpg';
  const objectPath = `products/${type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from('user-avatars')
    .upload(objectPath, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('user-avatars').getPublicUrl(objectPath);
  return data.publicUrl;
}

async function uploadToOssWithFastFallback(
  buffer: Buffer,
  type: string,
  extension: string,
  contentType: string,
) {
  const timeoutMs = resolveInteractiveUploadWaitMs();
  const ossUpload = uploadBufferToOSS(buffer, {
    entityId: `${type}-${Date.now()}`,
    contentType,
    extension,
    prefix: 'vetsphere/products/uploads',
  });

  return await Promise.race<string>([
    ossUpload,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`OSS 上传等待超过 ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type =
      typeof formData.get('type') === 'string' ? String(formData.get('type')) : 'product';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '仅支持图片文件 (JPEG/PNG/WebP/GIF/SVG)' },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '图片最大 5MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name.includes('.')
      ? file.name.slice(file.name.lastIndexOf('.'))
      : undefined;

    let url: string;
    let storage: 'oss' | 'supabase' | 'local' = 'local';

    if (isOSSConfigured()) {
      try {
        url = await uploadToOssWithFastFallback(buffer, type, extension || '.jpg', file.type);
        storage = 'oss';
      } catch (ossError) {
        console.warn('[Admin Upload] OSS upload failed, trying fallback storage:', ossError);

        if (hasSupabaseServiceRoleKey()) {
          try {
            url = await uploadToSupabaseStorage(buffer, type, extension || '.jpg', file.type);
            storage = 'supabase';
          } catch (storageError) {
            console.warn(
              '[Admin Upload] Supabase storage fallback failed, using local uploads:',
              storageError,
            );
            url = await saveToLocalPublicUploads(buffer, type, extension || '.jpg');
            storage = 'local';
          }
        } else {
          url = await saveToLocalPublicUploads(buffer, type, extension || '.jpg');
          storage = 'local';
        }
      }
    } else if (hasSupabaseServiceRoleKey()) {
      url = await uploadToSupabaseStorage(buffer, type, extension || '.jpg', file.type);
      storage = 'supabase';
    } else {
      url = await saveToLocalPublicUploads(buffer, type, extension || '.jpg');
      storage = 'local';
    }

    return NextResponse.json({ success: true, url, storage });
  } catch (error) {
    console.error('[Admin Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误，请稍后重试' },
      { status: 500 },
    );
  }
}
