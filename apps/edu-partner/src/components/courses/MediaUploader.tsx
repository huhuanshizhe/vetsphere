'use client';

import { useState, useRef, useCallback } from 'react';

interface MediaUploaderProps {
  type: 'image' | 'video';
  variant?: 'cover' | 'instructor' | 'preview';  // 用途类型
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  maxSizeMB?: number;
  className?: string;
}

// 图片尺寸建议
const IMAGE_DIMENSIONS = {
  cover: {
    width: 1200,
    height: 675,
    ratio: '16:9',
    desc: '课程封面 (推荐 1200×675px，16:9比例)',
  },
  instructor: {
    width: 400,
    height: 400,
    ratio: '1:1',
    desc: '讲师头像 (推荐 400×400px，正方形)',
  },
  preview: {
    width: 1280,
    height: 720,
    ratio: '16:9',
    desc: '预览视频 (推荐 720p 或 1080p)',
  },
};

export default function MediaUploader({
  type,
  variant = 'cover',
  value,
  onChange,
  label,
  maxSizeMB = type === 'image' ? 5 : 100,
  className = '',
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptTypes = type === 'image' 
    ? 'image/jpeg,image/png,image/webp' 
    : 'video/mp4,video/webm';

  const dimensions = IMAGE_DIMENSIONS[variant];

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件大小
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`文件大小不能超过 ${maxSizeMB}MB，当前 ${sizeMB.toFixed(1)}MB`);
      return;
    }

    // 验证文件类型
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm'];
    const validTypes = type === 'image' ? validImageTypes : validVideoTypes;
    
    if (!validTypes.includes(file.type)) {
      setError(`不支持的格式，请上传 ${type === 'image' ? 'JPG/PNG/WebP' : 'MP4/WebM'}`);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(10);

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85));
      }, 300);

      // 使用 FormData 上传到 API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', variant);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '上传失败');
      }

      setProgress(100);
      onChange(result.url);

    } catch (err: unknown) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : '上传失败，请重试';
      setError(message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [maxSizeMB, onChange, type, variant]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
  }, [onChange]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // 计算预览尺寸样式
  const previewHeight = variant === 'instructor' ? 'h-40 w-40' : 'h-48 w-full';
  const previewImageClass = variant === 'instructor' 
    ? 'w-40 h-40 rounded-full object-cover' 
    : 'w-full h-48 object-cover';

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      
      {/* 尺寸提示 */}
      {type === 'image' && (
        <p className="text-xs text-gray-500">{dimensions.desc}</p>
      )}
      
      <div className="relative">
        {value ? (
          // 预览已上传的媒体
          <div className={`relative ${variant === 'instructor' ? 'inline-block' : ''}`}>
            <div className={`relative overflow-hidden bg-purple-500/10 border border-purple-500/20 ${
              variant === 'instructor' ? 'rounded-full' : 'rounded-xl'
            }`}>
              {type === 'image' ? (
                <img 
                  src={value} 
                  alt="Preview" 
                  className={previewImageClass}
                  onError={() => setError('图片加载失败')}
                />
              ) : (
                <video 
                  src={value} 
                  controls 
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className={`absolute ${variant === 'instructor' ? '-top-1 -right-1' : 'top-2 right-2'} w-8 h-8 bg-red-500/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors shadow-lg`}
            >
              ✕
            </button>
          </div>
        ) : (
          // 上传区域
          <div
            onClick={handleClick}
            className={`
              relative border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
              ${variant === 'instructor' 
                ? 'w-40 h-40 rounded-full' 
                : 'h-48 rounded-xl'
              }
              ${uploading 
                ? 'border-purple-500/50 bg-purple-500/10' 
                : 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5'
              }
            `}
          >
            {uploading ? (
              <>
                <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <span className="text-sm text-purple-400">上传中 {progress}%</span>
                {variant !== 'instructor' && (
                  <div className="absolute bottom-4 left-4 right-4 h-2 bg-purple-500/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-3xl">{variant === 'instructor' ? '👤' : type === 'image' ? '🖼️' : '🎬'}</span>
                <span className="text-xs text-gray-400 text-center px-2">
                  {variant === 'instructor' ? '上传头像' : type === 'image' ? '上传封面图' : '上传视频'}
                </span>
                <span className="text-xs text-gray-500">
                  {type === 'image' ? `JPG/PNG ≤${maxSizeMB}MB` : `MP4/WebM ≤${maxSizeMB}MB`}
                </span>
                {type === 'image' && variant !== 'instructor' && (
                  <span className="text-xs text-purple-400/60">{dimensions.ratio}</span>
                )}
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
