'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X, ZoomIn } from 'lucide-react';

interface Image {
  id: string;
  url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

interface SkuImageGalleryProps {
  images: Image[];
  selectedSkuImage?: string | null;
  onImageClick?: (imageUrl: string) => void;
}

export default function SkuImageGallery({
  images,
  selectedSkuImage,
  onImageClick
}: SkuImageGalleryProps) {
  const galleryImages = useMemo(() => {
    const normalizedImages = images.filter((image) => Boolean(image?.url));

    if (selectedSkuImage && !normalizedImages.some((image) => image.url === selectedSkuImage)) {
      return [
        {
          id: 'selected-sku-image',
          url: selectedSkuImage,
          alt_text: 'SKU image',
          is_primary: false,
        },
        ...normalizedImages,
      ];
    }

    return normalizedImages;
  }, [images, selectedSkuImage]);

  const [activeImage, setActiveImage] = useState<string>(
    selectedSkuImage || galleryImages.find(img => img.is_primary)?.url || galleryImages[0]?.url || ''
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const activeImageIndex = Math.max(
    galleryImages.findIndex((image) => image.url === activeImage),
    0,
  );
  const activeImageItem = galleryImages[activeImageIndex] || galleryImages[0] || null;

  // Update active image when SKU changes
  useEffect(() => {
    if (selectedSkuImage) {
      setActiveImage(selectedSkuImage);
      return;
    }

    if (!galleryImages.some((image) => image.url === activeImage)) {
      setActiveImage(galleryImages[0]?.url || '');
    }
  }, [activeImage, galleryImages, selectedSkuImage]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false);
        return;
      }

      if (galleryImages.length <= 1) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        setActiveImage(
          galleryImages[(activeImageIndex - 1 + galleryImages.length) % galleryImages.length]?.url ||
            activeImage,
        );
      }

      if (event.key === 'ArrowRight') {
        setActiveImage(
          galleryImages[(activeImageIndex + 1) % galleryImages.length]?.url || activeImage,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImage, activeImageIndex, galleryImages, isLightboxOpen]);

  if (!galleryImages || galleryImages.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const handleMainImageClick = () => {
    setIsLightboxOpen(true);
    if (onImageClick) {
      onImageClick(activeImageItem?.url || activeImage);
    }
  };

  const showPreviousImage = () => {
    if (galleryImages.length <= 1) return;
    setActiveImage(
      galleryImages[(activeImageIndex - 1 + galleryImages.length) % galleryImages.length]?.url ||
        activeImage,
    );
  };

  const showNextImage = () => {
    if (galleryImages.length <= 1) return;
    setActiveImage(galleryImages[(activeImageIndex + 1) % galleryImages.length]?.url || activeImage);
  };

  return (
    <>
    <div className="space-y-4">
      {/* Main image */}
      <div 
        className="relative flex w-full aspect-square items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 shadow-sm cursor-zoom-in"
        onClick={handleMainImageClick}
      >
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
            放大
          </button>
          {activeImageItem?.url ? (
            <a
              href={activeImageItem.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              原图
            </a>
          ) : null}
        </div>
        <img
          src={activeImageItem?.url || activeImage}
          alt={activeImageItem?.alt_text || 'Product'}
          className="max-h-full max-w-full object-contain select-none"
        />
      </div>

      {/* Thumbnail grid */}
      {galleryImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setActiveImage(image.url)}
              className={`
                relative aspect-square rounded-2xl overflow-hidden border transition-all bg-white p-2 shadow-sm
                ${activeImage === image.url 
                  ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-emerald-100/80' 
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
              title={`查看第 ${index + 1} 张图片`}
            >
              <img
                src={image.url}
                alt={image.alt_text || 'Product thumbnail'}
                className="w-full h-full object-contain"
              />
              {image.is_primary && (
                <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  Main
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
    {isLightboxOpen && activeImageItem ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 sm:p-6"
        onClick={() => setIsLightboxOpen(false)}
      >
        <button
          type="button"
          onClick={() => setIsLightboxOpen(false)}
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          aria-label="关闭预览"
        >
          <X className="h-5 w-5" />
        </button>
        {galleryImages.length > 1 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPreviousImage();
            }}
            className="absolute left-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="查看上一张图片"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div
          className="flex max-h-full w-full max-w-6xl flex-col items-center gap-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex max-h-[78vh] w-full items-center justify-center overflow-hidden rounded-3xl bg-white/5 p-4 sm:p-8">
            <img
              src={activeImageItem.url}
              alt={activeImageItem.alt_text || 'Product'}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>
          <div className="flex w-full items-center justify-between gap-4 text-white">
            <div>
              <p className="text-sm font-medium">图片预览</p>
              <p className="text-xs text-slate-300">
                {activeImageIndex + 1} / {galleryImages.length}
              </p>
            </div>
            <a
              href={activeImageItem.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4" />
              在新窗口查看原图
            </a>
          </div>
        </div>
        {galleryImages.length > 1 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNextImage();
            }}
            className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="查看下一张图片"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    ) : null}
    </>
  );
}
