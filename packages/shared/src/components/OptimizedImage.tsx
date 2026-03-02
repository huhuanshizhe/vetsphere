'use client';

import React, { useState } from 'react';
import NextImage, { ImageProps as NextImageProps } from 'next/image';
import { Skeleton } from './Skeleton';

interface OptimizedImageProps extends Omit<NextImageProps, 'onLoadingComplete'> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  aspectRatio?: string;
  containerClassName?: string;
}

/**
 * Optimized Image component with:
 * - Loading skeleton
 * - Error fallback
 * - Blur placeholder
 * - Lazy loading by default
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = '/placeholder.jpg',
  showSkeleton = true,
  aspectRatio,
  containerClassName = '',
  className = '',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageSrc = hasError ? fallbackSrc : src;

  return (
    <div className={`relative overflow-hidden ${aspectRatio || ''} ${containerClassName}`}>
      {showSkeleton && isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      <NextImage
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        loading="lazy"
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;

/**
 * Responsive image sizes for common use cases
 */
export const imageSizes = {
  // Card thumbnails
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  // Full width hero images
  hero: '100vw',
  // Product gallery
  product: '(max-width: 640px) 100vw, 50vw',
  // Avatar/profile images
  avatar: '48px',
  // Instructor/author images
  instructor: '96px',
};

/**
 * Common image quality presets
 */
export const imageQuality = {
  low: 60,
  medium: 75,
  high: 85,
  max: 100,
};
