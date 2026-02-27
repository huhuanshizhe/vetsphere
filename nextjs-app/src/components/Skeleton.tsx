'use client';

import React from 'react';

/**
 * Skeleton loading components for better perceived performance
 * Used to display placeholder content while data is loading
 */

interface SkeletonProps {
  className?: string;
}

// Base skeleton with shimmer animation
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// Text line skeleton
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
      />
    ))}
  </div>
);

// Avatar skeleton
export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
};

// Button skeleton
export const SkeletonButton: React.FC<{ width?: string }> = ({ width = 'w-24' }) => (
  <Skeleton className={`h-10 ${width} rounded-xl`} />
);

// Image skeleton
export const SkeletonImage: React.FC<{ aspectRatio?: string; className?: string }> = ({ 
  aspectRatio = 'aspect-video',
  className = ''
}) => (
  <Skeleton className={`${aspectRatio} w-full rounded-2xl ${className}`} />
);

// Course card skeleton
export const CourseCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
    <SkeletonImage aspectRatio="aspect-[16/10]" className="rounded-none" />
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="sm" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-32" />
        </div>
      </div>
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  </div>
);

// Product card skeleton
export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
    <SkeletonImage aspectRatio="aspect-square" className="rounded-none" />
    <div className="p-5 space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-24" />
      <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  </div>
);

// Post card skeleton for community
export const PostCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
    <div className="flex items-center gap-4">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <SkeletonText lines={3} />
    <SkeletonImage aspectRatio="aspect-video" />
    <div className="flex gap-6 pt-2">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-12" />
    </div>
  </div>
);

// FAQ item skeleton
export const FAQItemSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
    <div className="flex justify-between items-center">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="w-6 h-6 rounded" />
    </div>
  </div>
);

// Dashboard stats skeleton
export const DashboardStatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

// Table row skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <div className="flex items-center gap-4 py-4 border-b border-slate-50">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} className="h-4 flex-1" />
    ))}
  </div>
);

// Full page loading skeleton
export const PageLoadingSkeleton: React.FC<{ type?: 'courses' | 'shop' | 'community' | 'default' }> = ({ 
  type = 'default' 
}) => {
  if (type === 'courses') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 pt-32">
        <div className="flex flex-col md:flex-row justify-between mb-16 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'shop') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 pt-32">
        <div className="flex flex-col md:flex-row justify-between mb-12 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'community') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 pt-32 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Default loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-vs border-t-transparent rounded-full animate-spin mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
};

export default Skeleton;
