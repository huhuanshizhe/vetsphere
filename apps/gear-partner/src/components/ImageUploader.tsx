'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, GripVertical, ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import type { ProductImage } from '@vetsphere/shared/types';

export type { ProductImage };

interface ImageUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
  mainImageRequired?: boolean;
  disabled?: boolean;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 12,
  mainImageRequired = true,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mainImage = images.find(img => img.type === 'main');
  const detailImages = images.filter(img => img.type === 'detail');
  const canAddMore = images.length < maxImages + 1;

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return '只支持图片文件 (JPEG, PNG, WebP)';
    }
    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过 5MB';
    }
    return null;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('上传失败');
    }

    const data = await res.json();
    return data.url;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const remainingSlots = maxImages - detailImages.length;
    if (validFiles.length > remainingSlots) {
      newErrors.push(`最多还能添加 ${remainingSlots} 张详情图`);
      setErrors(newErrors);
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      const newImages: ProductImage[] = [];
      const hasMainImage = !!mainImage;

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const url = await uploadImage(file);

        if (!hasMainImage && i === 0) {
          newImages.push({
            id: `img-${Date.now()}-main`,
            url,
            type: 'main',
            sortOrder: 0,
          });
        } else {
          newImages.push({
            id: `img-${Date.now()}-${i}`,
            url,
            type: 'detail',
            sortOrder: detailImages.length + newImages.filter(img => img.type === 'detail').length,
          });
        }
      }

      onChange([...images, ...newImages]);
    } catch (error) {
      setErrors(['上传失败，请重试']);
    } finally {
      setUploading(false);
    }
  }, [images, mainImage, detailImages, maxImages, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    newImages.forEach((img, idx) => {
      img.sortOrder = idx;
    });

    onChange(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const removeImage = (id: string) => {
    const newImages = images.filter(img => img.id !== id);
    if (mainImage?.id === id && newImages.length > 0) {
      newImages[0].type = 'main';
    }
    newImages.forEach((img, idx) => {
      img.sortOrder = idx;
    });
    onChange(newImages);
  };

  const setAsMain = (id: string) => {
    const newImages = images.map(img => ({
      ...img,
      type: img.id === id ? 'main' as const : 'detail' as const,
    }));
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable={!disabled}
            onDragStart={() => !disabled && handleImageDragStart(index)}
            onDragOver={(e) => !disabled && handleImageDragOver(e, index)}
            onDrop={(e) => !disabled && handleImageDrop(e, index)}
            onDragEnd={!disabled ? handleImageDragEnd : undefined}
            className={`
              relative aspect-square rounded-xl overflow-hidden group cursor-move
              border-2 transition-all bg-gray-100
              ${image.type === 'main' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
              ${dragOverIndex === index ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${disabled ? 'opacity-75 cursor-default' : ''}
            `}
          >
            <img
              src={image.url}
              alt={image.alt || '商品图片'}
              className="w-full h-full object-cover"
            />

            {/* Main badge */}
            {image.type === 'main' && (
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-md font-medium shadow-sm">
                主图
              </div>
            )}

            {/* Sort number */}
            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-medium">{index + 1}</span>
            </div>

            {/* Drag handle */}
            {!disabled && (
              <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
              </div>
            )}

            {/* Actions overlay */}
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {image.type !== 'main' && image.id && (
                  <button
                    type="button"
                    onClick={() => image.id && setAsMain(image.id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition shadow-sm"
                    title="设为主图"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-700" />
                  </button>
                )}
                {image.id && (
                  <button
                    type="button"
                    onClick={() => image.id && removeImage(image.id)}
                    className="p-2 bg-white rounded-lg hover:bg-red-50 transition shadow-sm"
                    title="删除"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add button */}
        {canAddMore && !disabled && (
          <label
            className={`
              aspect-square rounded-xl border-2 border-dashed border-gray-300
              flex flex-col items-center justify-center cursor-pointer
              bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all
              ${uploading ? 'pointer-events-none opacity-50' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              disabled={uploading || disabled}
            />
            {uploading ? (
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">上传图片</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((error, i) => (
            <p key={i} className="text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">图片要求</p>
            <p className="text-sm text-gray-500 mt-1">
              主图建议 1000×1000px，详情图宽度 800px，支持 JPEG/PNG/WebP 格式，单张最大 5MB
            </p>
            <p className="text-xs text-gray-400 mt-1">
              拖拽图片可调整顺序，点击图标可设为主图或删除
            </p>
          </div>
        </div>
      </div>

      {/* Main image warning */}
      {mainImageRequired && !mainImage && images.length > 0 && (
        <p className="text-amber-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          请设置一张主图
        </p>
      )}
    </div>
  );
}
