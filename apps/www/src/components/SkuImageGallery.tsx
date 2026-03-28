'use client';

import React, { useState } from 'react';

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
  const [activeImage, setActiveImage] = useState<string>(
    selectedSkuImage || images.find(img => img.is_primary)?.url || images[0]?.url || ''
  );

  // Update active image when SKU changes
  React.useEffect(() => {
    if (selectedSkuImage) {
      setActiveImage(selectedSkuImage);
    }
  }, [selectedSkuImage]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const handleMainImageClick = () => {
    if (onImageClick) {
      onImageClick(activeImage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div 
        className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in"
        onClick={handleMainImageClick}
      >
        <img
          src={activeImage}
          alt="Product"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Thumbnail grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image) => (
            <button
              key={image.id}
              onClick={() => setActiveImage(image.url)}
              className={`
                relative aspect-square rounded-md overflow-hidden border-2 transition-all
                ${activeImage === image.url 
                  ? 'border-emerald-600 ring-2 ring-emerald-200' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <img
                src={image.url}
                alt={image.alt_text || 'Product thumbnail'}
                className="w-full h-full object-cover"
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
  );
}
