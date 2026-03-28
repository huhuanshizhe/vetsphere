'use client';

import React from 'react';

interface SkuPriceDisplayProps {
  minPrice?: number | null;
  maxPrice?: number | null;
  currency?: string;
  hasVariants?: boolean;
  hasPrice?: boolean;
  className?: string;
}

export default function SkuPriceDisplay({
  minPrice,
  maxPrice,
  currency = 'USD',
  hasVariants = false,
  hasPrice = true,
  className = ''
}: SkuPriceDisplayProps) {
  if (!hasPrice) {
    return (
      <div className={`text-xl font-bold text-emerald-600 ${className}`}>
        <span className="text-lg">Inquire for Price</span>
      </div>
    );
  }

  if (!minPrice && !maxPrice) {
    return (
      <div className={`text-xl font-bold text-gray-400 ${className}`}>
        Price Not Available
      </div>
    );
  }

  // Single price (no variants or min === max)
  if (!hasVariants || minPrice === maxPrice) {
    return (
      <div className={`text-2xl font-bold text-emerald-600 ${className}`}>
        <span className="text-base font-normal mr-1">{currency}</span>
        {minPrice?.toFixed(2)}
      </div>
    );
  }

  // Price range for variants
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-2xl font-bold text-emerald-600">
        <span className="text-base font-normal mr-1">{currency}</span>
        {minPrice?.toFixed(2)} - {maxPrice?.toFixed(2)}
      </div>
      <p className="text-sm text-gray-500">
        Price varies by specification
      </p>
    </div>
  );
}
