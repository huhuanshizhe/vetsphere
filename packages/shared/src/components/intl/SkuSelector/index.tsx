'use client';

import React, { useMemo, useCallback } from 'react';
import { Check } from 'lucide-react';
import { IntlProductSku } from '../../../services/intl-api';

// ============================================
// Types
// ============================================

export interface VariantAttribute {
  name: string;
  values: string[];
}

interface SkuSelectorProps {
  variantAttributes: VariantAttribute[];
  skus: IntlProductSku[];
  selectedSku: IntlProductSku | null;
  onSkuSelect: (sku: IntlProductSku) => void;
  locale: string;
  // 价格获取函数（保留用于未来可能的扩展）
  getSellingPrice?: (sku: IntlProductSku, locale: string) => number | null;
}

// ============================================
// Component
// ============================================

export default function SkuSelector({
  variantAttributes,
  skus,
  selectedSku,
  onSkuSelect,
  locale,
}: SkuSelectorProps) {
  // 当前选中的规格组合
  const selectedAttributes = useMemo(() => {
    return selectedSku?.attribute_combination || {};
  }, [selectedSku]);

  // 根据选中的规格查找匹配的SKU
  const findMatchingSku = useCallback((attrs: Record<string, string>) => {
    return skus.find(sku => {
      const skuAttrs = sku.attribute_combination;
      return Object.keys(attrs).every(key => skuAttrs[key] === attrs[key]);
    });
  }, [skus]);

  // 处理规格选择
  const handleAttributeSelect = (attrName: string, value: string) => {
    const newAttrs = { ...selectedAttributes, [attrName]: value };
    const matchingSku = findMatchingSku(newAttrs);
    if (matchingSku) {
      onSkuSelect(matchingSku);
    }
  };

  // 检查某个规格值是否可选（是否有对应SKU有库存）
  const isValueAvailable = (attrName: string, value: string) => {
    const testAttrs = { ...selectedAttributes, [attrName]: value };
    const sku = findMatchingSku(testAttrs);
    return sku && sku.stock_quantity > 0 && sku.is_active;
  };

  // 检查某个规格值是否被选中
  const isValueSelected = (attrName: string, value: string) => {
    return selectedAttributes[attrName] === value;
  };

  if (variantAttributes.length === 0 || skus.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* 规格选择 */}
      {variantAttributes.map((attr) => (
        <div key={attr.name}>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {attr.name}
            {selectedAttributes[attr.name] && (
              <span className="ml-2 font-normal text-slate-500">
                : {selectedAttributes[attr.name]}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {attr.values.map((value) => {
              const isSelected = isValueSelected(attr.name, value);
              const isAvailable = isValueAvailable(attr.name, value);
              
              return (
                <button
                  key={value}
                  onClick={() => handleAttributeSelect(attr.name, value)}
                  disabled={!isAvailable}
                  className={`
                    relative px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                    ${isSelected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : isAvailable
                        ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                    }
                  `}
                >
                  {value}
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}