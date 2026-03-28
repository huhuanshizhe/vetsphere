'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Plus, X, ChevronDown, GripVertical, AlertCircle, CheckCircle, RefreshCw, Upload, Settings2, ChevronRight, ChevronUp } from 'lucide-react';
import type { ProductSku, ProductVariantAttribute } from '@vetsphere/shared/types';

// 常用规格参数预设
const SPEC_PRESETS = [
  '功率',
  '电压',
  '尺寸',
  '材质',
  '容量',
  '精度',
  '速度',
  '频率',
  '温度范围',
  '压力范围',
];

// Common attribute name presets
const ATTRIBUTE_PRESETS = [
  { name: '颜色', examples: ['红色', '蓝色', '白色', '黑色', '灰色'] },
  { name: '尺寸', examples: ['S', 'M', 'L', 'XL', 'XXL'] },
  { name: '型号', examples: ['标准版', '专业版', '旗舰版'] },
  { name: '材质', examples: ['不锈钢', '钛合金', '塑料', '陶瓷'] },
  { name: '规格', examples: ['小号', '中号', '大号'] },
  { name: '电压', examples: ['110V', '220V', '电池供电'] },
  { name: '包装', examples: ['单只装', '盒装', '套装'] },
];

interface SkuVariantEditorProps {
  hasVariants: boolean;
  onHasVariantsChange: (value: boolean) => void;
  variantAttributes: ProductVariantAttribute[];
  onVariantAttributesChange: (attrs: ProductVariantAttribute[]) => void;
  skus: ProductSku[];
  onSkusChange: (skus: ProductSku[]) => void;
  basePrice?: number;
  disabled?: boolean;
}

export default function SkuVariantEditor({
  hasVariants,
  onHasVariantsChange,
  variantAttributes,
  onVariantAttributesChange,
  skus,
  onSkusChange,
  basePrice = 0,
  disabled = false,
}: SkuVariantEditorProps) {
  const [newAttrName, setNewAttrName] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  
  // 使用 ref 来跟踪是否已经处理过初始数据
  const hasLoadedDataRef = useRef(false);
  // 跟踪上一次的属性数量，用于检测删除操作
  const prevAttrsLengthRef = useRef(0);
  // 跟踪上一次的属性值总数量
  const prevAttrValuesCountRef = useRef(0);

  // Generate SKU code from attribute combination
  const generateSkuCode = useCallback((combination: Record<string, string>, index: number): string => {
    const parts = Object.values(combination).map(v => v.charAt(0).toUpperCase());
    const timestamp = Date.now().toString(36).slice(-4);
    return `${parts.join('')}-${timestamp}-${index + 1}`;
  }, []);

  // Generate Cartesian product of all attribute values
  const generateSkusFromAttributes = useCallback((attrs: ProductVariantAttribute[]): ProductSku[] => {
    if (attrs.length === 0) return [];

    // Get all value arrays
    const valueArrays = attrs.map(attr => attr.attributeValues).filter(arr => arr.length > 0);
    if (valueArrays.length === 0) return [];

    // Cartesian product
    const cartesian = valueArrays.reduce<ProductSku[]>(
      (acc, values, attrIndex) => {
        if (acc.length === 0) {
          return values.map(value => ({
            id: `sku-temp-${Date.now()}-${value}`,
            productId: '',
            skuCode: '',
            attributeCombination: { [attrs[attrIndex].attributeName]: value },
            price: basePrice,
            stockQuantity: 0,
            isActive: true,
            sortOrder: 0,
          }));
        }

        return acc.flatMap(sku =>
          values.map(value => ({
            ...sku,
            id: `sku-temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            attributeCombination: {
              ...sku.attributeCombination,
              [attrs[attrIndex].attributeName]: value,
            },
          }))
        );
      },
      []
    );

    // Generate SKU codes and set sort order
    return cartesian.map((sku, index) => ({
      ...sku,
      skuCode: generateSkuCode(sku.attributeCombination, index),
      sortOrder: index,
    }));
  }, [basePrice, generateSkuCode]);

  // 检测数据加载和用户操作
  useEffect(() => {
    const currentAttrValuesCount = variantAttributes.reduce((sum, attr) => sum + attr.attributeValues.length, 0);
    
    console.log('[SkuVariantEditor] Effect:', { 
      hasVariants,
      variantAttributesLen: variantAttributes.length, 
      skusLen: skus.length, 
      hasLoadedData: hasLoadedDataRef.current,
      prevAttrsLength: prevAttrsLengthRef.current,
      currentAttrValuesCount,
      prevAttrValuesCount: prevAttrValuesCountRef.current
    });

    // 不处理多规格未启用的情况
    if (!hasVariants) {
      return;
    }

    // 情况1：初始加载已有数据（编辑模式）
    // 当同时有 variantAttributes 和 skus 数据时，说明是从数据库加载的
    if (variantAttributes.length > 0 && skus.length > 0 && !hasLoadedDataRef.current) {
      console.log('[SkuVariantEditor] Initial data loaded, preserving existing SKUs');
      hasLoadedDataRef.current = true;
      prevAttrsLengthRef.current = variantAttributes.length;
      prevAttrValuesCountRef.current = currentAttrValuesCount;
      return; // 不重新生成
    }

    // 情况2：数据已加载，检查是否需要重新生成
    if (hasLoadedDataRef.current) {
      // 检查属性数量是否减少（用户删除了属性）
      const attrsDecreased = variantAttributes.length < prevAttrsLengthRef.current;
      // 检查属性值数量是否变化（用户添加/删除了属性值）
      const valuesChanged = currentAttrValuesCount !== prevAttrValuesCountRef.current;
      
      // 只有当属性或属性值变化时才重新生成
      if (attrsDecreased || (valuesChanged && skus.length === 0)) {
        console.log('[SkuVariantEditor] User modified attributes, regenerating SKUs');
        const newSkus = generateSkusFromAttributes(variantAttributes);
        onSkusChange(newSkus);
      } else if (valuesChanged) {
        // 用户添加了新的属性值，生成新SKU但保留已有数据
        console.log('[SkuVariantEditor] User added attribute values, merging SKUs');
        const newSkus = generateSkusFromAttributes(variantAttributes);
        const preservedSkus = newSkus.map(newSku => {
          const existing = skus.find(s =>
            JSON.stringify(s.attributeCombination) === JSON.stringify(newSku.attributeCombination)
          );
          return existing ? { ...newSku, price: existing.price, stockQuantity: existing.stockQuantity, skuCode: existing.skuCode, isActive: existing.isActive } : newSku;
        });
        onSkusChange(preservedSkus);
      }
      
      prevAttrsLengthRef.current = variantAttributes.length;
      prevAttrValuesCountRef.current = currentAttrValuesCount;
      return;
    }

    // 情况3：新建模式，根据属性生成SKUs
    if (variantAttributes.length > 0 && !hasLoadedDataRef.current) {
      // 计算属性值总数
      const totalValues = variantAttributes.reduce((sum, attr) => sum + attr.attributeValues.length, 0);
      
      // 只有当有属性值时才生成
      if (totalValues > 0 && skus.length === 0) {
        console.log('[SkuVariantEditor] New product, generating SKUs');
        const newSkus = generateSkusFromAttributes(variantAttributes);
        onSkusChange(newSkus);
        hasLoadedDataRef.current = true;
      }
    }
    
    prevAttrsLengthRef.current = variantAttributes.length;
    prevAttrValuesCountRef.current = currentAttrValuesCount;
  }, [variantAttributes, skus, hasVariants, generateSkusFromAttributes, onSkusChange]);

  // 重置加载状态（当 hasVariants 变化时）
  useEffect(() => {
    hasLoadedDataRef.current = false;
    prevAttrsLengthRef.current = 0;
    prevAttrValuesCountRef.current = 0;
  }, [hasVariants]);

  // Add new attribute
  const addAttribute = useCallback((name: string) => {
    if (!name.trim()) return;
    if (variantAttributes.some(a => a.attributeName === name.trim())) return;
    if (variantAttributes.length >= 3) {
      alert('最多支持3个规格维度');
      return;
    }

    const newAttr: ProductVariantAttribute = {
      id: `attr-temp-${Date.now()}`,
      productId: '',
      attributeName: name.trim(),
      attributeValues: [],
      sortOrder: variantAttributes.length,
    };

    console.log('[SkuVariantEditor] Current state:', { hasVariants, variantAttributesLen: variantAttributes.length, skusLen: skus.length });
    onVariantAttributesChange([...variantAttributes, newAttr]);
    setNewAttrName('');
    setShowPresetDropdown(false);
  }, [variantAttributes, onVariantAttributesChange]);

  // Remove attribute
  const removeAttribute = useCallback((attrName: string) => {
    onVariantAttributesChange(variantAttributes.filter(a => a.attributeName !== attrName));
  }, [variantAttributes, onVariantAttributesChange]);

  // Add value to attribute
  const addAttributeValue = useCallback((attrName: string, value: string) => {
    if (!value.trim()) return;

    onVariantAttributesChange(
      variantAttributes.map(attr =>
        attr.attributeName === attrName
          ? {
              ...attr,
              attributeValues: [...attr.attributeValues, value.trim()],
            }
          : attr
      )
    );
  }, [variantAttributes, onVariantAttributesChange]);

  // Remove value from attribute
  const removeAttributeValue = useCallback((attrName: string, value: string) => {
    onVariantAttributesChange(
      variantAttributes.map(attr =>
        attr.attributeName === attrName
          ? {
              ...attr,
              attributeValues: attr.attributeValues.filter(v => v !== value),
            }
          : attr
      )
    );
  }, [variantAttributes, onVariantAttributesChange]);

  // Update SKU field
  const updateSku = useCallback((skuId: string, field: keyof ProductSku, value: any) => {
    onSkusChange(
      skus.map(sku =>
        sku.id === skuId ? { ...sku, [field]: value } : sku
      )
    );
  }, [skus, onSkusChange]);

  // Batch update prices
  const batchUpdatePrices = useCallback((price: number) => {
    onSkusChange(skus.map(sku => ({ ...sku, price })));
  }, [skus, onSkusChange]);

  // Batch update stock
  const batchUpdateStock = useCallback((stock: number) => {
    onSkusChange(skus.map(sku => ({ ...sku, stockQuantity: stock })));
  }, [skus, onSkusChange]);

  // Upload SKU image
  const uploadSkuImage = useCallback(async (skuId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('上传失败');

      const data = await res.json();
      updateSku(skuId, 'imageUrl', data.url);
    } catch (error) {
      alert('图片上传失败，请重试');
    }
  }, [updateSku]);

  // Update SKU spec
  const updateSkuSpec = useCallback((skuId: string, specKey: string, specValue: string) => {
    onSkusChange(
      skus.map(sku => {
        if (sku.id === skuId) {
          const newSpecs = { ...(sku.specs || {}) };
          if (specValue.trim()) {
            newSpecs[specKey] = specValue.trim();
          } else {
            delete newSpecs[specKey];
          }
          return { ...sku, specs: newSpecs };
        }
        return sku;
      })
    );
  }, [skus, onSkusChange]);

  // Add spec key to SKU
  const addSkuSpecKey = useCallback((skuId: string, specKey: string) => {
    if (!specKey.trim()) return;
    onSkusChange(
      skus.map(sku => {
        if (sku.id === skuId) {
          const newSpecs = { ...(sku.specs || {}) };
          if (!(specKey in newSpecs)) {
            newSpecs[specKey.trim()] = '';
          }
          return { ...sku, specs: newSpecs };
        }
        return sku;
      })
    );
  }, [skus, onSkusChange]);

  // Remove spec key from SKU
  const removeSkuSpecKey = useCallback((skuId: string, specKey: string) => {
    onSkusChange(
      skus.map(sku => {
        if (sku.id === skuId) {
          const newSpecs = { ...(sku.specs || {}) };
          delete newSpecs[specKey];
          return { ...sku, specs: newSpecs };
        }
        return sku;
      })
    );
  }, [skus, onSkusChange]);

  // Track expanded SKU rows for specs editing
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  const toggleSkuExpanded = useCallback((skuId: string) => {
    setExpandedSkus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skuId)) {
        newSet.delete(skuId);
      } else {
        newSet.add(skuId);
      }
      return newSet;
    });
  }, []);

  // Calculate totals
  const totalStock = useMemo(() =>
    skus.reduce((sum, sku) => sum + sku.stockQuantity, 0),
    [skus]
  );

  const priceRange = useMemo(() => {
    if (skus.length === 0) return { min: 0, max: 0 };
    const prices = skus.filter(s => s.isActive).map(s => s.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [skus]);

  if (!hasVariants) {
    // 单 SKU 模式：显示一个默认 SKU 编辑区域
    const singleSku = skus[0] || {
      id: 'single-sku',
      productId: '',
      skuCode: 'DEFAULT',
      attributeCombination: {},
      price: 0,
      stockQuantity: 0,
      weight: undefined,
      weightUnit: 'g' as const,
      suggestedRetailPrice: undefined,
      isActive: true,
      sortOrder: 0,
      specs: {},
      barcode: undefined,
      imageUrl: undefined,
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">SKU 信息</h4>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hasVariants"
              checked={hasVariants}
              onChange={e => !disabled && onHasVariantsChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="hasVariants" className="text-sm text-gray-700">
              启用多规格（如颜色、尺寸等）
            </label>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                供货价 (¥) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={singleSku.price || ''}
                onChange={e => {
                  const newSku = { ...singleSku, price: parseFloat(e.target.value) || 0 };
                  onSkusChange([newSku]);
                }}
                className="input"
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                建议零售价 (¥)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={singleSku.suggestedRetailPrice || ''}
                onChange={e => {
                  const newSku = { ...singleSku, suggestedRetailPrice: parseFloat(e.target.value) || undefined };
                  onSkusChange([newSku]);
                }}
                className="input"
                placeholder="可选"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                重量
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={singleSku.weight || ''}
                  onChange={e => {
                    const newSku = { ...singleSku, weight: parseFloat(e.target.value) || undefined };
                    onSkusChange([newSku]);
                  }}
                  className="input flex-1"
                  placeholder="0"
                  disabled={disabled}
                />
                <select
                  value={singleSku.weightUnit || 'g'}
                  onChange={e => {
                    const newSku = { ...singleSku, weightUnit: e.target.value as 'g' | 'kg' | 'lb' };
                    onSkusChange([newSku]);
                  }}
                  className="input w-16 px-1"
                  disabled={disabled}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                库存数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={singleSku.stockQuantity || ''}
                onChange={e => {
                  const newSku = { ...singleSku, stockQuantity: parseInt(e.target.value) || 0 };
                  onSkusChange([newSku]);
                }}
                className="input"
                placeholder="0"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Barcode row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                条形码
              </label>
              <input
                type="text"
                value={singleSku.barcode || ''}
                onChange={e => {
                  const newSku = { ...singleSku, barcode: e.target.value };
                  onSkusChange([newSku]);
                }}
                className="input"
                placeholder="可选"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Specs section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Settings2 className="w-4 h-4" />
                规格参数
              </p>
              <div className="flex gap-2">
                <select
                  onChange={e => {
                    if (e.target.value) {
                      const newSpecs = { ...(singleSku.specs || {}) };
                      if (!(e.target.value in newSpecs)) {
                        newSpecs[e.target.value] = '';
                      }
                      onSkusChange([{ ...singleSku, specs: newSpecs }]);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  disabled={disabled}
                >
                  <option value="">添加参数...</option>
                  {SPEC_PRESETS.filter(p => !(singleSku.specs && p in singleSku.specs)).map(preset => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="自定义参数名"
                  className="text-xs border border-gray-300 rounded px-2 py-1 w-28"
                  disabled={disabled}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      if (value.trim()) {
                        const newSpecs = { ...(singleSku.specs || {}) };
                        if (!(value in newSpecs)) {
                          newSpecs[value.trim()] = '';
                        }
                        onSkusChange([{ ...singleSku, specs: newSpecs }]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {singleSku.specs && Object.entries(singleSku.specs).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1.5">
                  <span className="text-xs text-gray-500 w-12 truncate">{key}:</span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => {
                      const newSpecs = { ...(singleSku.specs || {}) };
                      newSpecs[key] = e.target.value;
                      onSkusChange([{ ...singleSku, specs: newSpecs }]);
                    }}
                    className="flex-1 text-xs border-none outline-none bg-transparent"
                    placeholder="值"
                    disabled={disabled}
                  />
                  <button
                    onClick={() => {
                      const newSpecs = { ...(singleSku.specs || {}) };
                      delete newSpecs[key];
                      onSkusChange([{ ...singleSku, specs: newSpecs }]);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!singleSku.specs || Object.keys(singleSku.specs).length === 0) && (
                <p className="text-xs text-gray-400 col-span-full py-2">
                  暂无规格参数，可从上方添加
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
        <input
          type="checkbox"
          id="hasVariants"
          checked={hasVariants}
          onChange={e => onHasVariantsChange(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="hasVariants" className="text-sm text-gray-700 font-medium">
          启用多规格SKU
        </label>
        <span className="text-xs text-gray-500 ml-auto">
          最多支持3个规格维度
        </span>
      </div>

      {/* Attribute Dimensions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">规格维度</h4>
          {variantAttributes.length < 3 && (
            <div className="relative">
              <button
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="btn btn-secondary text-sm inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                添加规格
                <ChevronDown className="w-4 h-4" />
              </button>

              {showPresetDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  {ATTRIBUTE_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => addAttribute(preset.name)}
                      disabled={variantAttributes.some(a => a.attributeName === preset.name)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {preset.name}
                      <span className="text-gray-400 text-xs ml-2">
                        {preset.examples.slice(0, 3).join('、')}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-gray-200 p-2">
                    <input
                      type="text"
                      value={newAttrName}
                      onChange={e => setNewAttrName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addAttribute(newAttrName)}
                      placeholder="自定义规格名..."
                      className="input text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attribute List */}
        {variantAttributes.map((attr, index) => (
          <AttributeDimension
            key={attr.id || attr.attributeName}
            attribute={attr}
            index={index}
            onAddValue={(value) => addAttributeValue(attr.attributeName, value)}
            onRemoveValue={(value) => removeAttributeValue(attr.attributeName, value)}
            onRemove={() => removeAttribute(attr.attributeName)}
          />
        ))}

        {variantAttributes.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">请添加至少一个规格维度</p>
            <p className="text-xs text-gray-400 mt-1">如：颜色、尺寸、型号等</p>
          </div>
        )}
      </div>

      {/* SKU Table */}
      {skus.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              SKU列表
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({skus.filter(s => s.isActive).length} 个有效)
              </span>
            </h4>

            {/* Batch Operations */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">批量设置:</span>
                <input
                  type="number"
                  placeholder="价格"
                  className="input w-24 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      batchUpdatePrices(parseFloat((e.target as HTMLInputElement).value) || 0);
                    }
                  }}
                />
                <input
                  type="number"
                  placeholder="库存"
                  className="input w-24 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      batchUpdateStock(parseInt((e.target as HTMLInputElement).value) || 0);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">总SKU数</p>
              <p className="text-lg font-semibold text-gray-900">{skus.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">价格区间</p>
              <p className="text-lg font-semibold text-gray-900">
                ¥{priceRange.min.toLocaleString()}
                {priceRange.min !== priceRange.max && ` ~ ¥${priceRange.max.toLocaleString()}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">总库存</p>
              <p className="text-lg font-semibold text-gray-900">{totalStock}</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 w-10"></th> {/* Expand button */}
                  {variantAttributes.map(attr => (
                    <th key={attr.attributeName} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {attr.attributeName}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU编码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供货价 (¥)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">建议零售价</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">重量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">库存</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">条形码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {skus.map((sku, index) => {
                  const isExpanded = expandedSkus.has(sku.id);
                  return (
                    <>
                      <tr key={sku.id} className={!sku.isActive ? 'bg-gray-50 opacity-60' : ''}>
                        <td className="px-2 py-3">
                          <button
                            onClick={() => toggleSkuExpanded(sku.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title={isExpanded ? '收起规格参数' : '展开规格参数'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                        {variantAttributes.map(attr => (
                          <td key={attr.attributeName} className="px-4 py-3 text-sm text-gray-900">
                            {sku.attributeCombination[attr.attributeName] || '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={sku.skuCode}
                            onChange={e => updateSku(sku.id, 'skuCode', e.target.value)}
                            className="input text-sm w-32"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={sku.price}
                            onChange={e => updateSku(sku.id, 'price', parseFloat(e.target.value) || 0)}
                            className="input text-sm w-24"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={sku.suggestedRetailPrice || ''}
                            onChange={e => updateSku(sku.id, 'suggestedRetailPrice', parseFloat(e.target.value) || undefined)}
                            className="input text-sm w-24"
                            placeholder="可选"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={sku.weight || ''}
                              onChange={e => updateSku(sku.id, 'weight', parseFloat(e.target.value) || undefined)}
                              className="input text-sm w-16"
                              placeholder="0"
                            />
                            <select
                              value={sku.weightUnit || 'g'}
                              onChange={e => updateSku(sku.id, 'weightUnit', e.target.value as 'g' | 'kg' | 'lb')}
                              className="input text-sm w-14 px-1"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="lb">lb</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={sku.stockQuantity}
                            onChange={e => updateSku(sku.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                            className="input text-sm w-20"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={sku.barcode || ''}
                            onChange={e => updateSku(sku.id, 'barcode', e.target.value)}
                            className="input text-sm w-28"
                            placeholder="条形码"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => updateSku(sku.id, 'isActive', !sku.isActive)}
                            className={`text-xs px-2 py-1 rounded ${
                              sku.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {sku.isActive ? '启用' : '禁用'}
                          </button>
                        </td>
                      </tr>
                      {/* Expanded row for SKU specs and image */}
                      {isExpanded && (
                        <tr key={`${sku.id}-expanded`} className="bg-gray-50">
                          <td colSpan={variantAttributes.length + 9} className="px-6 py-4">
                            <div className="flex gap-6">
                              {/* SKU Image */}
                              <div className="flex-shrink-0">
                                <p className="text-xs font-medium text-gray-500 mb-2">SKU图片</p>
                                <div className="relative w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors">
                                  {sku.imageUrl ? (
                                    <>
                                      <img
                                        src={sku.imageUrl}
                                        alt="SKU"
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        onClick={() => updateSku(sku.id, 'imageUrl', undefined)}
                                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadSkuImage(sku.id, file);
                                        }}
                                      />
                                      <Upload className="w-5 h-5 text-gray-400" />
                                      <span className="text-xs text-gray-400 mt-1">上传</span>
                                    </label>
                                  )}
                                </div>
                              </div>

                              {/* SKU Specs */}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <Settings2 className="w-3 h-3" />
                                    SKU规格参数
                                  </p>
                                  <div className="flex gap-1">
                                    <select
                                      onChange={e => {
                                        if (e.target.value) {
                                          addSkuSpecKey(sku.id, e.target.value);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="text-xs border border-gray-300 rounded px-2 py-1"
                                    >
                                      <option value="">添加参数...</option>
                                      {SPEC_PRESETS.filter(p => !(sku.specs && p in sku.specs)).map(preset => (
                                        <option key={preset} value={preset}>{preset}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="自定义参数名"
                                      className="text-xs border border-gray-300 rounded px-2 py-1 w-24"
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          const value = (e.target as HTMLInputElement).value;
                                          if (value.trim()) {
                                            addSkuSpecKey(sku.id, value);
                                            (e.target as HTMLInputElement).value = '';
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {sku.specs && Object.entries(sku.specs).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                                      <span className="text-xs text-gray-500 w-12 truncate">{key}:</span>
                                      <input
                                        type="text"
                                        value={value}
                                        onChange={e => updateSkuSpec(sku.id, key, e.target.value)}
                                        className="flex-1 text-xs border-none outline-none bg-transparent"
                                        placeholder="值"
                                      />
                                      <button
                                        onClick={() => removeSkuSpecKey(sku.id, key)}
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {(!sku.specs || Object.keys(sku.specs).length === 0) && (
                                    <p className="text-xs text-gray-400 col-span-full py-2">
                                      暂无规格参数，可从上方添加
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prerequisite Note */}
      <div className="text-xs text-gray-500 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <strong>注意:</strong> SKU功能需要执行数据库迁移 <code className="bg-amber-100 px-1 rounded">supabase_migration_027_product_variants.sql</code>
      </div>
    </div>
  );
}

// ============================================
// Attribute Dimension Sub-component
// ============================================

interface AttributeDimensionProps {
  attribute: ProductVariantAttribute;
  index: number;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
  onRemove: () => void;
}

function AttributeDimension({
  attribute,
  index,
  onAddValue,
  onRemoveValue,
  onRemove,
}: AttributeDimensionProps) {
  const [newValue, setNewValue] = useState('');
  const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700'];
  const colorClass = colors[index % colors.length];

  const handleAddValue = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue('');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${colorClass}`}>
            {attribute.attributeName}
          </span>
          <span className="text-xs text-gray-500">
            {attribute.attributeValues.length} 个值
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Value Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {attribute.attributeValues.map(value => (
          <span
            key={value}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
          >
            {value}
            <button
              onClick={() => onRemoveValue(value)}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Add Value Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddValue()}
          placeholder="输入规格值，按回车添加..."
          className="input text-sm flex-1"
        />
        <button
          onClick={handleAddValue}
          className="btn btn-secondary text-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}