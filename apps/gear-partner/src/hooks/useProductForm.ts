'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Product, ProductVariantAttribute, ProductSku, ProductImage } from '@vetsphere/shared/types';

export interface ProductFormData {
  // Basic info
  name: string;
  brand: string;
  price: string;
  stockQuantity: string;
  description: string;
  longDescription: string;
  richDescription: string;

  // Category (三级分类)
  categoryId: string | null;
  subcategoryId: string | null;
  level3CategoryId: string | null;
  categoryName: string;
  subcategoryName: string;
  level3CategoryName: string;

  // Images
  images: ProductImage[];

  // Specs (parameters)
  specs: Array<{ key: string; value: string }>;

  // SKU Variants
  hasVariants: boolean;
  variantAttributes: ProductVariantAttribute[];
  skus: ProductSku[];

  // International Trade Fields (外贸销售场景) - 已移到 SKU 级别
  // weight: string;                    // 产品重量
  // weightUnit: 'g' | 'kg' | 'lb';    // 重量单位
  // suggestedRetailPrice: string;      // 建议销售价
  // sellingPrice: string;              // 销售定价

  // GEO Content Fields (SEO & AI 生成内容)
  faq: Array<{                      // FAQ 问答数组
    question: string;
    answer: string;
    sortOrder?: number;
  }>;
  metaTitle: string;                 // SEO 元标题
  metaDescription: string;           // SEO 元描述
  focusKeyword: string;              // SEO 核心关键词
}

export interface UseProductFormOptions {
  initialData?: Product | null;
}

export interface UseProductFormReturn {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;

  // Individual setters
  setName: (value: string) => void;
  setBrand: (value: string) => void;
  setPrice: (value: string) => void;
  setStockQuantity: (value: string) => void;
  setDescription: (value: string) => void;
  setLongDescription: (value: string) => void;
  setRichDescription: (value: string) => void;
  setCategory: (data: { level1: string | null; level2: string | null; level3?: string | null; level1Name?: string; level2Name?: string; level3Name?: string }) => void;
  setImages: (images: ProductFormData['images']) => void;
  setSpecs: (specs: ProductFormData['specs']) => void;
  setHasVariants: (value: boolean) => void;
  setVariantAttributes: (attrs: ProductVariantAttribute[]) => void;
  setSkus: (skus: ProductSku[]) => void;

  // Computed
  completeness: number;
  isEdit: boolean;

  // Actions
  reset: () => void;
  buildProduct: () => Partial<Product>;
  validate: (step?: number) => string | null;
}

const INITIAL_FORM_DATA: ProductFormData = {
  name: '',
  brand: '',
  price: '',
  stockQuantity: '0',
  description: '',
  longDescription: '',
  richDescription: '',
  categoryId: null,
  subcategoryId: null,
  level3CategoryId: null,
  categoryName: '',
  subcategoryName: '',
  level3CategoryName: '',
  images: [],
  specs: [],
  hasVariants: false,
  variantAttributes: [],
  skus: [],
  // 外贸字段已移到 SKU 级别
  faq: [],
  metaTitle: '',
  metaDescription: '',
  focusKeyword: '',
};

export function useProductForm(options: UseProductFormOptions = {}): UseProductFormReturn {
  const { initialData } = options;
  const isEdit = !!initialData;

  // Initialize form data
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (!initialData) return INITIAL_FORM_DATA;

    return {
      name: initialData.name || '',
      brand: initialData.brand || '',
      price: initialData.price?.toString() || '',
      stockQuantity: initialData.stockQuantity?.toString() || '0',
      description: initialData.description || '',
      longDescription: initialData.longDescription || '',
      richDescription: initialData.richDescription || '',
      categoryId: initialData.category_id || null,
      subcategoryId: initialData.subcategory_id || null,
      level3CategoryId: (initialData as any).level3_category_id || null,
      categoryName: '',
      subcategoryName: '',
      level3CategoryName: '',
      images: initialData.images || (initialData.imageUrl ? [{ id: 'img-main', url: initialData.imageUrl, type: 'main' as const, sortOrder: 0 }] : []),
      specs: initialData.specs ? Object.entries(initialData.specs).map(([key, value]) => ({ key, value: String(value), isCustom: true })) : [],
      hasVariants: initialData.hasVariants || false,
      variantAttributes: initialData.variantAttributes || [],
      skus: initialData.skus || [],
    };
  });

  // Individual setters
  const setName = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
  }, []);

  const setBrand = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, brand: value }));
  }, []);

  const setPrice = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, price: value }));
  }, []);

  const setStockQuantity = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, stockQuantity: value }));
  }, []);

  const setDescription = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
  }, []);

  const setLongDescription = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, longDescription: value }));
  }, []);

  const setRichDescription = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, richDescription: value }));
  }, []);

  const setCategory = useCallback((data: { level1: string | null; level2: string | null; level3?: string | null; level1Name?: string; level2Name?: string; level3Name?: string }) => {
    setFormData(prev => ({
      ...prev,
      categoryId: data.level1,
      subcategoryId: data.level2,
      level3CategoryId: data.level3 || null,
      categoryName: data.level1Name || '',
      subcategoryName: data.level2Name || '',
      level3CategoryName: data.level3Name || '',
    }));
  }, []);

  const setImages = useCallback((images: ProductFormData['images']) => {
    setFormData(prev => ({ ...prev, images }));
  }, []);

  const setSpecs = useCallback((specs: ProductFormData['specs']) => {
    setFormData(prev => ({ ...prev, specs }));
  }, []);

  const setHasVariants = useCallback((value: boolean) => {
    setFormData(prev => ({ ...prev, hasVariants: value }));
  }, []);

  const setVariantAttributes = useCallback((attrs: ProductVariantAttribute[]) => {
    console.log('[useProductForm] setVariantAttributes called with:', attrs.length, 'attributes');
    setFormData(prev => { 
      const newData = { ...prev, variantAttributes: attrs };
      console.log('[useProductForm] setVariantAttributes - new formData variantAttributes:', newData.variantAttributes.length);
      return newData;
    });
  }, []);

  const setSkus = useCallback((skus: ProductSku[]) => {
    console.log('[useProductForm] setSkus called with:', skus.length, 'SKUs');
    setFormData(prev => { 
      const newData = { ...prev, skus };
      console.log('[useProductForm] setSkus - new formData skus:', newData.skus.length);
      return newData;
    });
  }, []);

  // New field setters for international trade
  const setWeight = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, weight: value }));
  }, []);

  const setWeightUnit = useCallback((value: 'g' | 'kg' | 'lb') => {
    setFormData(prev => ({ ...prev, weightUnit: value }));
  }, []);

  const setSuggestedRetailPrice = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, suggestedRetailPrice: value }));
  }, []);

  const setSellingPrice = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, sellingPrice: value }));
  }, []);

  const setFaq = useCallback((faq: ProductFormData['faq']) => {
    setFormData(prev => ({ ...prev, faq }));
  }, []);

  const setMetaTitle = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, metaTitle: value }));
  }, []);

  const setMetaDescription = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, metaDescription: value }));
  }, []);

  const setFocusKeyword = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, focusKeyword: value }));
  }, []);

  // Calculate completeness
  const completeness = useMemo(() => {
    let score = 0;
    const weights = {
      name: 12,
      brand: 8,
      category: 15,
      price: 10,
      stockQuantity: 5,
      description: 10,
      mainImage: 8,
      detailImages: 5,
      specs: 5,
      weight: 5,
      sellingPrice: 8,
      faq: 5,
      seo: 4,
    };

    if (formData.name.trim()) score += weights.name;
    if (formData.brand.trim()) score += weights.brand;
    if (formData.categoryId) score += 10;
    if (formData.subcategoryId) score += 10;
    // Price and stock only count when variants are not enabled
    if (!formData.hasVariants) {
      if (formData.price && parseFloat(formData.price) > 0) score += weights.price;
      if (formData.stockQuantity !== '') score += weights.stockQuantity;
    } else {
      // When variants enabled, give points for having SKUs
      if (formData.skus.length > 0) score += weights.price + weights.stockQuantity;
    }
    if (formData.description.trim()) score += weights.description;
    if (formData.images.some(img => img.type === 'main')) score += weights.mainImage;
    if (formData.images.filter(img => img.type === 'detail').length >= 2) score += weights.detailImages;
    if (formData.specs.some(s => s.key.trim() && s.value.trim())) score += weights.specs;
    
    // International trade fields
    if (formData.weight && parseFloat(formData.weight) > 0) score += weights.weight;
    if (formData.sellingPrice && parseFloat(formData.sellingPrice) > 0) score += weights.sellingPrice;
    
    // GEO content
    if (formData.faq && formData.faq.length >= 3) score += weights.faq;
    else if (formData.faq && formData.faq.length > 0) score += weights.faq * 0.5;
    if (formData.metaTitle && formData.metaDescription && formData.focusKeyword) score += weights.seo;
    else if (formData.metaTitle || formData.metaDescription) score += weights.seo * 0.5;

    return Math.min(score, 100);
  }, [formData]);

  // Build product object for submission
  const buildProduct = useCallback((): Partial<Product> => {
    const specsObj: Record<string, string> = {};
    formData.specs.forEach(s => {
      if (s.key.trim() && s.value.trim()) {
        specsObj[s.key.trim()] = s.value.trim();
      }
    });

    const mainImage = formData.images.find(img => img.type === 'main');

    // When variants are enabled, calculate price range and total stock from SKUs
    let price = parseFloat(formData.price) || 0;
    let stockQuantity = parseInt(formData.stockQuantity) || 0;
    
    if (formData.hasVariants && formData.skus.length > 0) {
      const prices = formData.skus.map(s => s.price);
      price = Math.min(...prices);
      stockQuantity = formData.skus.reduce((sum, sku) => sum + sku.stockQuantity, 0);
    }

    // 自动启用多规格标志：如果有 variantAttributes 或 skus 数据
    const hasVariants = formData.hasVariants || formData.variantAttributes.length > 0 || formData.skus.length > 0;

    const product: Partial<Product> = {
      // 使用 editProductId（如果有）而不是 initialData?.id，这样保存草稿后不会创建新产品
      ...(initialData?.id ? { id: initialData.id } : {}),
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      category_id: formData.categoryId || undefined,
      subcategory_id: formData.subcategoryId || undefined,
      level3_category_id: formData.level3CategoryId || undefined,
      price,
      stockQuantity,
      description: formData.description.trim(),
      longDescription: formData.longDescription.trim(),
      imageUrl: mainImage?.url || '',
      specs: specsObj,
      stockStatus: stockQuantity === 0 ? 'Out of Stock' : stockQuantity < 10 ? 'Low Stock' : 'In Stock',
      images: formData.images.map(img => ({ url: img.url, type: img.type, sortOrder: img.sortOrder })),
      // Variant fields
      hasVariants: hasVariants,
      richDescription: formData.richDescription || undefined,
      variantAttributes: formData.variantAttributes,
      skus: formData.skus,
      // GEO Content Fields
      faq: formData.faq?.filter(f => f.question.trim() && f.answer.trim()) || [],
      metaTitle: formData.metaTitle?.trim() || undefined,
      metaDescription: formData.metaDescription?.trim() || undefined,
      focusKeyword: formData.focusKeyword?.trim() || undefined,
    };

    return product;
  }, [formData, initialData]);

  // Validate form
  const validate = useCallback((step?: number): string | null => {
    // Basic validation (step 0 or all)
    if (step === undefined || step === 0) {
      if (!formData.name.trim()) return '请输入商品名称';
      if (!formData.brand.trim()) return '请输入品牌';
      if (!formData.categoryId) return '请选择一级分类';
      if (!formData.subcategoryId) return '请选择二级分类';
      
      // Price and stock validation only required when variants are not enabled
      if (!formData.hasVariants) {
        if (!formData.price || parseFloat(formData.price) <= 0) return '请输入有效价格';
        if (formData.stockQuantity === '' || parseInt(formData.stockQuantity) < 0) return '库存数量不能为负';
      }
    }

    // Description validation (step 2)
    if (step === undefined || step === 2) {
      if (!formData.description.trim()) return '请输入商品描述';
    }

    // SKU validation - required when variants are enabled
    if (formData.hasVariants) {
      if (formData.skus.length === 0) {
        return '启用多规格时，至少需要创建一个 SKU';
      }
      // Validate each SKU has valid price and stock
      for (let i = 0; i < formData.skus.length; i++) {
        const sku = formData.skus[i];
        if (!sku.price || sku.price <= 0) {
          return `SKU "${sku.skuCode}" 的价格无效`;
        }
        if (sku.stockQuantity < 0) {
          return `SKU "${sku.skuCode}" 的库存不能为负`;
        }
      }
    }

    return null;
  }, [formData]);

  // Reset form
  const reset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
  }, []);

  return {
    formData,
    setFormData,
    setName,
    setBrand,
    setPrice,
    setStockQuantity,
    setDescription,
    setLongDescription,
    setRichDescription,
    setCategory,
    setImages,
    setSpecs,
    setHasVariants,
    setVariantAttributes,
    setSkus,
    completeness,
    isEdit,
    reset,
    buildProduct,
    validate,
  };
}
