-- ==========================================
-- VetSphere Migration 019: Supabase Storage Buckets
-- 创建文件上传所需的存储桶及 RLS 策略
-- 日期: 2026-03-05
-- 
-- 执行方式: Supabase Dashboard > SQL Editor
-- ==========================================

-- ============================================
-- 1. 创建 user-avatars 存储桶（公开）
--    用途: 用户头像、课程封面、讲师头像、产品图片、预览视频
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  104857600,  -- 100MB (视频文件需要)
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm'
  ];

-- ============================================
-- 2. 创建 doctor-credentials 存储桶（私有）
--    用途: 医生资质证书、执照等敏感文件
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-credentials',
  'doctor-credentials',
  false,
  10485760,  -- 10MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
  ];

-- ============================================
-- 3. user-avatars RLS 策略
-- ============================================

-- 公开读取（桶已设为 public，但仍需 SELECT 策略）
CREATE POLICY "user_avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

-- 已认证用户可上传
CREATE POLICY "user_avatars_authenticated_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
);

-- 已认证用户可更新自己上传的文件
CREATE POLICY "user_avatars_authenticated_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
);

-- 已认证用户可删除自己上传的文件
CREATE POLICY "user_avatars_authenticated_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- 4. doctor-credentials RLS 策略
-- ============================================

-- 用户只能上传到自己的目录 {user_id}/*
CREATE POLICY "credentials_user_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-credentials'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 用户只能读取自己的文件
CREATE POLICY "credentials_user_read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'doctor-credentials'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 用户可以更新自己目录下的文件
CREATE POLICY "credentials_user_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'doctor-credentials'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 用户可以删除自己目录下的文件
CREATE POLICY "credentials_user_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'doctor-credentials'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 管理员可读取所有资质文件
CREATE POLICY "credentials_admin_read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'doctor-credentials'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'Admin'
  )
);
