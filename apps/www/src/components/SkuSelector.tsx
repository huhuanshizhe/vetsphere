'use client';

import React, { useState, useMemo } from 'react';

interface SkuAttribute {
  name: string;
  values: string[];
}

interface Sku {
  id: string;
  sku_code: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  image_url?: string;
  is_active: boolean;
}

interface SkuSelectorProps {
  attributes: SkuAttribute[];
  skus: Sku[];
  currency?: string;
  onSelectSku: (sku: Sku) => void;
  selectedSku?: Sku | null;
}

export default function SkuSelector({
  attributes,
  skus,
  currency = 'USD',
  onSelectSku,
  selectedSku
}: SkuSelectorProps) {
  // Track selected attribute values
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Find matching SKU for current selection
  const matchingSku = useMemo(() => {
    if (Object.keys(selectedAttributes).length === 0) return null;
    
    return skus.find(sku => {
      return Object.entries(selectedAttributes).every(([attrName, attrValue]) => {
        return sku.attributes[attrName] === attrValue;
      });
    });
  }, [selectedAttributes, skus]);

  // Check if an attribute value is available (has stock)
  const isAttributeValueAvailable = (attrName: string, attrValue: string) => {
    const testSelection = { ...selectedAttributes, [attrName]: attrValue };
    
    return skus.some(sku => {
      return Object.entries(testSelection).every(([name, value]) => {
        return sku.attributes[name] === value;
      }) && sku.is_active && sku.stock > 0;
    });
  };

  // Handle attribute value click
  const handleAttributeValueClick = (attrName: string, attrValue: string) => {
    const newSelection = {
      ...selectedAttributes,
      [attrName]: attrValue
    };
    
    setSelectedAttributes(newSelection);
    
    // Find and notify parent about the new matching SKU
    const matchedSku = skus.find(sku => {
      return Object.entries(newSelection).every(([name, value]) => {
        return sku.attributes[name] === value;
      });
    });
    
    if (matchedSku && matchedSku.is_active) {
      onSelectSku(matchedSku);
    }
  };

  // Check if all attributes are selected
  const allAttributesSelected = Object.keys(selectedAttributes).length === attributes.length;
  const currentSku = matchingSku || selectedSku;

  return (
    <div className="space-y-4">
      {/* Attribute selectors */}
      {attributes.map((attr) => (
        <div key={attr.name} className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {attr.name}
          </label>
          <div className="flex flex-wrap gap-2">
            {attr.values.map((value) => {
              const isSelected = selectedAttributes[attr.name] === value;
              const isAvailable = isAttributeValueAvailable(attr.name, value);
              
              return (
                <button
                  key={value}
                  onClick={() => handleAttributeValueClick(attr.name, value)}
                  disabled={!isAvailable}
                  className={`
                    px-4 py-2 text-sm border rounded-md transition-all
                    ${isSelected 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : isAvailable
                        ? 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500 hover:text-emerald-600'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }
                  `}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected SKU info - B2B simplified (hide SKU code and stock quantity) */}
      {currentSku && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {currentSku.is_active ? '✓ Available for order' : '✗ Currently unavailable'}
            </span>
            {currentSku.price > 0 && (
              <span className="text-lg font-semibold text-emerald-600">
                {currency} {currentSku.price.toFixed(2)}
              </span>
            )}
          </div>
          {!currentSku.is_active && (
            <p className="text-xs text-gray-500 mt-2">
              This variant is not available for purchase. Please contact us for bulk orders.
            </p>
          )}
        </div>
      )}

      {/* Selection guide */}
      {!allAttributesSelected && attributes.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Please select {attributes.length - Object.keys(selectedAttributes).length} more option(s)
        </p>
      )}
    </div>
  );
}
