'use client';

import React, { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { useSite } from '@/context/SiteContext';
import {
  Card,
  Button,
  LoadingState,
  ConfirmDialog,
  Toast,
  ToastContainer,
  useToast,
} from '@/components/ui';
import RichTextEditor from '@/components/RichTextEditor';
import {
  ChevronRight,
  ChevronUp,
  GripVertical,
  Upload,
  X,
  Settings2,
  Image as ImageIcon,
  Plus,
  Trash2,
} from 'lucide-react';

type Lang = 'en' | 'zh' | 'th' | 'ja';
type ProductImageType = 'main' | 'detail';

type ProductImageRecord = {
  id?: string;
  url: string;
  type: ProductImageType;
  sort_order: number;
};

type VariantAttributeRecord = {
  id?: string;
  product_id?: string;
  attribute_name: string;
  attribute_values: string[];
  sort_order?: number;
};

type NormalizedVariantAttributeRecord = VariantAttributeRecord & {
  sort_order: number;
};

type ProductSkuRecord = {
  id: string;
  sku_code: string;
  attribute_combination: Record<string, string>;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  weight: number | null;
  weight_unit: string | null;
  suggested_retail_price: number | null;
  selling_price: number | null;
  selling_price_usd: number | null;
  selling_price_jpy: number | null;
  selling_price_thb: number | null;
  image_url: string | null;
  barcode: string | null;
  specs: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
};

type PendingLeaveAction =
  | {
      type: 'route';
      href: string;
    }
  | {
      type: 'refresh';
    }
  | null;

// SKU规格参数预设
const SKU_SPEC_PRESETS = [
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
  '尺寸(mm)',
  '重量',
  '颜色',
  '型号',
  '规格',
  '包装',
  '认证',
];

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNonNegativeInteger(value: unknown): number {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function createTempImageId(prefix = 'temp-image'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTempSkuId(): string {
  return `new-sku-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getVariantAttributeDraftKey(attribute: VariantAttributeRecord, index: number): string {
  return attribute.id || `variant-attribute-${index}`;
}

function splitVariantAttributeValues(input: string): string[] {
  return input
    .split(/[\r\n,，;；、]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeVariantAttributeValueList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.flatMap((entry) => splitVariantAttributeValues(normalizeOptionalString(entry)))),
  );
}

function hydrateVariantAttributesForEditor(
  attributes: VariantAttributeRecord[],
): VariantAttributeRecord[] {
  return attributes.map((attribute, index) => ({
    ...attribute,
    attribute_name: normalizeOptionalString(attribute.attribute_name),
    attribute_values: normalizeVariantAttributeValueList(attribute.attribute_values),
    sort_order:
      typeof attribute.sort_order === 'number' && Number.isFinite(attribute.sort_order)
        ? attribute.sort_order
        : index,
  }));
}

function isProductImageType(value: unknown): value is ProductImageType {
  return value === 'main' || value === 'detail';
}

function normalizeProductImages(images: unknown[]): ProductImageRecord[] {
  const normalizedImages = images
    .map((image, index) => {
      if (!image || typeof image !== 'object') return null;

      const imageRecord = image as Record<string, unknown>;
      const url = normalizeOptionalString(imageRecord.url);
      if (!url) return null;

      return {
        id: normalizeOptionalString(imageRecord.id) || undefined,
        url,
        type: isProductImageType(imageRecord.type) ? imageRecord.type : 'detail',
        sort_order:
          typeof imageRecord.sort_order === 'number' && Number.isFinite(imageRecord.sort_order)
            ? imageRecord.sort_order
            : index,
      } satisfies ProductImageRecord;
    })
    .filter(Boolean) as ProductImageRecord[];

  if (normalizedImages.length === 0) return [];

  let mainAssigned = false;
  const dedupedImages = normalizedImages.map((image, index) => {
    const shouldBeMain = image.type === 'main' && !mainAssigned;
    if (shouldBeMain) {
      mainAssigned = true;
    }

    return {
      ...image,
      type: shouldBeMain ? 'main' : 'detail',
      sort_order: index,
    } satisfies ProductImageRecord;
  });

  if (!mainAssigned) {
    dedupedImages[0] = {
      ...dedupedImages[0],
      type: 'main',
      sort_order: 0,
    };
  }

  return dedupedImages.map((image, index) => ({
    ...image,
    sort_order: index,
  }));
}

function getProductImagesFromFormState(
  source:
    | {
        images?: unknown;
        image_url?: unknown;
        cover_image_url?: unknown;
      }
    | null
    | undefined,
): ProductImageRecord[] {
  const normalizedImages = Array.isArray(source?.images)
    ? normalizeProductImages(source.images)
    : [];

  if (normalizedImages.length > 0) {
    return normalizedImages;
  }

  const fallbackUrl =
    normalizeOptionalString(source?.image_url) || normalizeOptionalString(source?.cover_image_url);

  return fallbackUrl
    ? [
        {
          id: createTempImageId('temp-main-url'),
          url: fallbackUrl,
          type: 'main',
          sort_order: 0,
        },
      ]
    : [];
}

function getMainProductImage(images: ProductImageRecord[]): ProductImageRecord | null {
  return images.find((image) => image.type === 'main') || null;
}

function getProductImageKey(image: ProductImageRecord, index: number): string {
  return image.id || `${image.type}-${index}-${image.url}`;
}

function normalizeVariantAttributesForSkuSync(
  attributes: VariantAttributeRecord[],
): NormalizedVariantAttributeRecord[] {
  return attributes
    .map((attribute, index) => {
      const attributeName = normalizeOptionalString(attribute.attribute_name);
      const attributeValues = normalizeVariantAttributeValueList(attribute.attribute_values);

      if (!attributeName || attributeValues.length === 0) {
        return null;
      }

      return {
        ...attribute,
        attribute_name: attributeName,
        attribute_values: attributeValues,
        sort_order: index,
      } satisfies NormalizedVariantAttributeRecord;
    })
    .filter((attribute): attribute is NormalizedVariantAttributeRecord => attribute !== null);
}

function buildAttributeCombinationKey(combination: Record<string, unknown>): string {
  return Object.entries(combination)
    .map(([key, value]) => [normalizeOptionalString(key), normalizeOptionalString(value)] as const)
    .filter(([key, value]) => key && value)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, 'zh-CN'))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}

function generateAttributeCombinations(
  attributes: NormalizedVariantAttributeRecord[],
): Record<string, string>[] {
  if (attributes.length === 0) return [];

  return attributes.reduce<Record<string, string>[]>((combinations, attribute) => {
    if (combinations.length === 0) {
      return attribute.attribute_values.map((value) => ({ [attribute.attribute_name]: value }));
    }

    return combinations.flatMap((combination) =>
      attribute.attribute_values.map((value) => ({
        ...combination,
        [attribute.attribute_name]: value,
      })),
    );
  }, []);
}

function generateSkuCode(combination: Record<string, string>, index: number): string {
  const prefix = Object.values(combination)
    .map((value) =>
      normalizeOptionalString(value)
        .replace(/[^a-zA-Z0-9]+/g, '')
        .slice(0, 4),
    )
    .filter(Boolean)
    .map((value) => value.toUpperCase())
    .join('-');
  const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    .slice(-10)
    .toUpperCase();

  return `${prefix || 'SKU'}-${uniqueSuffix}-${index + 1}`;
}

function createSkuRecord(
  combination: Record<string, string>,
  index: number,
  templateSku: Partial<ProductSkuRecord> | null,
  options: { preserveIdentity?: boolean } = {},
): ProductSkuRecord {
  const preserveIdentity = options.preserveIdentity === true;
  const templateSpecs =
    templateSku?.specs && typeof templateSku.specs === 'object' && !Array.isArray(templateSku.specs)
      ? { ...(templateSku.specs as Record<string, unknown>) }
      : null;

  return {
    id:
      preserveIdentity && normalizeOptionalString(templateSku?.id)
        ? normalizeOptionalString(templateSku?.id)
        : createTempSkuId(),
    sku_code:
      preserveIdentity && normalizeOptionalString(templateSku?.sku_code)
        ? normalizeOptionalString(templateSku?.sku_code)
        : generateSkuCode(combination, index),
    attribute_combination: combination,
    price: normalizeNullableNumber(templateSku?.price) ?? 0,
    original_price: normalizeNullableNumber(templateSku?.original_price),
    stock_quantity: preserveIdentity ? normalizeNonNegativeInteger(templateSku?.stock_quantity) : 0,
    weight: normalizeNullableNumber(templateSku?.weight),
    weight_unit: normalizeOptionalString(templateSku?.weight_unit) || null,
    suggested_retail_price: normalizeNullableNumber(templateSku?.suggested_retail_price),
    selling_price: normalizeNullableNumber(templateSku?.selling_price),
    selling_price_usd: normalizeNullableNumber(templateSku?.selling_price_usd),
    selling_price_jpy: normalizeNullableNumber(templateSku?.selling_price_jpy),
    selling_price_thb: normalizeNullableNumber(templateSku?.selling_price_thb),
    image_url: preserveIdentity ? normalizeOptionalString(templateSku?.image_url) || null : null,
    barcode: preserveIdentity ? normalizeOptionalString(templateSku?.barcode) || null : null,
    specs: preserveIdentity ? templateSpecs : null,
    is_active: templateSku?.is_active !== false,
    sort_order: index,
  };
}

function syncSkusFromVariantAttributes(
  attributes: VariantAttributeRecord[],
  currentSkus: ProductSkuRecord[],
  basePriceSource: unknown,
): ProductSkuRecord[] {
  const normalizedAttributes = normalizeVariantAttributesForSkuSync(attributes);
  const nextCombinations = generateAttributeCombinations(normalizedAttributes);
  const emptyCombinationSku =
    currentSkus.find(
      (sku) => buildAttributeCombinationKey(sku.attribute_combination || {}) === '',
    ) || null;
  const templateSkuForNew: Partial<ProductSkuRecord> = emptyCombinationSku ||
    currentSkus[0] || {
      price: normalizeNullableNumber(basePriceSource) ?? 0,
      is_active: true,
    };

  if (nextCombinations.length === 0) {
    const fallbackSku = currentSkus[0] || null;
    return [
      createSkuRecord({}, 0, fallbackSku || templateSkuForNew, {
        preserveIdentity: Boolean(fallbackSku),
      }),
    ];
  }

  const existingByKey = new Map(
    currentSkus.map((sku) => [buildAttributeCombinationKey(sku.attribute_combination || {}), sku]),
  );
  let reusableEmptyCombinationSku = emptyCombinationSku;

  return nextCombinations.map((combination, index) => {
    const combinationKey = buildAttributeCombinationKey(combination);
    const existingSku = existingByKey.get(combinationKey);
    if (existingSku) {
      return createSkuRecord(combination, index, existingSku, { preserveIdentity: true });
    }

    if (reusableEmptyCombinationSku) {
      const skuToReuse = reusableEmptyCombinationSku;
      reusableEmptyCombinationSku = null;
      return createSkuRecord(combination, index, skuToReuse, { preserveIdentity: true });
    }

    return createSkuRecord(combination, index, templateSkuForNew, { preserveIdentity: false });
  });
}

function skusMatchVariantAttributes(
  attributes: VariantAttributeRecord[],
  currentSkus: ProductSkuRecord[],
): boolean {
  const normalizedAttributes = normalizeVariantAttributesForSkuSync(attributes);
  const expectedCombinations = generateAttributeCombinations(normalizedAttributes);

  if (expectedCombinations.length === 0) {
    if (currentSkus.length === 0) return true;
    if (currentSkus.length === 1) {
      return buildAttributeCombinationKey(currentSkus[0].attribute_combination || {}) === '';
    }
    return false;
  }

  if (currentSkus.length !== expectedCombinations.length) {
    return false;
  }

  const expectedKeys = expectedCombinations
    .map((combination) => buildAttributeCombinationKey(combination))
    .sort();
  const currentKeys = currentSkus
    .map((sku) => buildAttributeCombinationKey(sku.attribute_combination || {}))
    .sort();

  return expectedKeys.every((key, index) => key === currentKeys[index]);
}

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const { currentSite, isCN, isINTL, isGLOBAL } = useSite();
  const isNewProduct = productId === 'new';

  // 数据状态
  const [product, setProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [editLang, setEditLang] = useState<Lang>('zh');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // AI 翻译状态
  const [translating, setTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // 翻译进度状态
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translateStep, setTranslateStep] = useState(0);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [translateSteps, setTranslateSteps] = useState<
    { step: number; text: string; progress: number }[]
  >([]);
  const [translateTargetLangs, setTranslateTargetLangs] = useState<
    { code: string; name: string }[]
  >([]);

  // UI 状态
  const [activeTab, setActiveTab] = useState('basic');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = useState<PendingLeaveAction>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([
    currentSite === 'global' ? 'cn' : currentSite,
  ]);
  const [publishing, setPublishing] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [uploadingSkuImageIds, setUploadingSkuImageIds] = useState<Set<string>>(new Set());
  const [draggedProductImageKey, setDraggedProductImageKey] = useState<string | null>(null);
  const [dragOverProductImageKey, setDragOverProductImageKey] = useState<string | null>(null);
  const skipBeforeUnloadRef = useRef(false);
  const variantSyncReadyRef = useRef(isNewProduct);
  const variantSyncInitializedRef = useRef(false);
  const lastVariantSignatureRef = useRef('');

  // Toast 通知
  const { toasts, addToast, removeToast, success, error: toastError, warning } = useToast();

  // 分类和 SKU 状态
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [variantAttributes, setVariantAttributes] = useState<VariantAttributeRecord[]>([]);
  const [variantAttributeDrafts, setVariantAttributeDrafts] = useState<Record<string, string>>({});
  const [productSkus, setProductSkus] = useState<ProductSkuRecord[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // SKU展开状态
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  // 阶梯价格状态
  const [priceTiers, setPriceTiers] = useState<Record<string, any[]>>({});
  const [loadingTiers, setLoadingTiers] = useState<Record<string, boolean>>({});

  // Admin 可以编辑所有状态的产品
  const isReadOnly = false;

  useEffect(() => {
    variantSyncReadyRef.current = isNewProduct;
    variantSyncInitializedRef.current = false;
    lastVariantSignatureRef.current = '';
  }, [isNewProduct, productId]);

  // 加载产品数据
  useEffect(() => {
    if (isNewProduct) {
      // 新建模式：初始化空表单
      const emptyProduct = {
        id: 'new',
        name: '',
        name_en: '',
        name_zh: '',
        brand: '',
        description: '',
        description_en: '',
        rich_description: '',
        rich_description_en: '',
        category_id: '',
        status: 'draft',
        has_price: true,
        min_order_quantity: 1,
        weight: 0,
        specifications: {},
        faq: [],
        variant_attributes: [],
        skus: [],
        images: [],
        site_views: [],
      };
      setProduct(emptyProduct);
      setEditForm({ ...emptyProduct });
      loadCategories();
      setLoading(false);
    } else {
      loadProduct();
    }
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetch<{ view: 'base'; data: any }>(
        `/api/v1/admin/products/${productId}?view=base`,
      );
      const data = json.data;
      setProduct(data);
      setEditForm({ ...data });

      // 加载分类数据
      await loadCategories(data);

      // 加载 SKU 变体数据
      await loadVariantData(data);
    } catch (err) {
      setError(getErrorMessage(err) || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(productData?: any) {
    setLoadingCategories(true);
    try {
      if (currentSite === 'global') {
        setCategories([]);
        return;
      }

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .eq('site_code', currentSite)
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const scopedCategories = data || [];
      const currentCategoryIds = [
        productData?.category_id,
        productData?.subcategory_id,
        productData?.level3_category_id,
      ].filter(Boolean);
      const missingCategoryIds = currentCategoryIds.filter(
        (categoryId: string) => !scopedCategories.some((category) => category.id === categoryId),
      );

      let mergedCategories = scopedCategories;
      if (missingCategoryIds.length > 0) {
        const { data: legacyCategories, error: legacyError } = await supabase
          .from('product_categories')
          .select('*')
          .in('id', missingCategoryIds);

        if (legacyError) throw legacyError;

        const mergedMap = new Map(scopedCategories.map((category) => [category.id, category]));
        (legacyCategories || []).forEach((category) => {
          mergedMap.set(category.id, category);
        });
        mergedCategories = Array.from(mergedMap.values());
      }

      setCategories(mergedCategories);
      console.log(
        '[ProductEdit] Loaded categories:',
        mergedCategories.length,
        'site:',
        currentSite,
      );
    } catch (err) {
      console.error('[ProductEdit] Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    if (isNewProduct) {
      void loadCategories(editForm);
      return;
    }

    if (product) {
      void loadCategories(editForm);
    }
  }, [currentSite]);

  async function loadVariantData(productData?: any) {
    variantSyncReadyRef.current = false;
    variantSyncInitializedRef.current = false;
    lastVariantSignatureRef.current = '';
    setVariantAttributeDrafts({});
    setLoadingVariants(true);
    try {
      const sourceProduct = productData || product;

      // 如果 API 已经返回了数据，直接使用
      if (sourceProduct?.skus && sourceProduct.skus.length > 0) {
        setProductSkus(sourceProduct.skus);
        console.log('[ProductEdit] Using SKUs from API response:', sourceProduct.skus.length);

        // 同时加载规格属性（如果 API 没有返回）
        if (!sourceProduct.variant_attributes || sourceProduct.variant_attributes.length === 0) {
          const { data: attrs, error: attrsError } = await supabase
            .from('product_variant_attributes')
            .select('*')
            .eq('product_id', productId)
            .order('sort_order');

          if (attrsError) throw attrsError;
          setVariantAttributes(hydrateVariantAttributesForEditor(attrs || []));
        } else {
          setVariantAttributes(
            hydrateVariantAttributesForEditor(sourceProduct.variant_attributes || []),
          );
        }
        setLoadingVariants(false);
        return;
      }

      // 如果 API 没有返回数据，单独查询
      const { data: attrs, error: attrsError } = await supabase
        .from('product_variant_attributes')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (attrsError) throw attrsError;
      setVariantAttributes(hydrateVariantAttributesForEditor(attrs || []));

      const { data: skus, error: skusError } = await supabase
        .from('product_skus')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (skusError) throw skusError;
      setProductSkus(skus || []);

      console.log('[ProductEdit] Loaded variants from DB:', {
        attrs: attrs?.length,
        skus: skus?.length,
      });
    } catch (err) {
      console.error('[ProductEdit] Failed to load variant data:', err);
    } finally {
      variantSyncReadyRef.current = true;
      setLoadingVariants(false);
    }
  }

  useEffect(() => {
    if (!variantSyncReadyRef.current || loadingVariants) {
      return;
    }

    const normalizedAttributes = normalizeVariantAttributesForSkuSync(variantAttributes);
    const nextVariantSignature = JSON.stringify(
      normalizedAttributes.map((attribute) => [
        attribute.attribute_name,
        attribute.attribute_values,
      ]),
    );

    if (!variantSyncInitializedRef.current) {
      lastVariantSignatureRef.current = nextVariantSignature;
      variantSyncInitializedRef.current = true;

      if (!skusMatchVariantAttributes(variantAttributes, productSkus)) {
        const nextSkus = syncSkusFromVariantAttributes(
          variantAttributes,
          productSkus,
          editForm.price,
        );
        setProductSkus(nextSkus);
        setExpandedSkus(
          new Set(
            Array.from(expandedSkus).filter((skuId) => nextSkus.some((sku) => sku.id === skuId)),
          ),
        );
        setIsDirty(true);
      }

      return;
    }

    if (nextVariantSignature === lastVariantSignatureRef.current) {
      return;
    }

    lastVariantSignatureRef.current = nextVariantSignature;

    const nextSkus = syncSkusFromVariantAttributes(variantAttributes, productSkus, editForm.price);
    setProductSkus(nextSkus);
    setExpandedSkus(
      new Set(Array.from(expandedSkus).filter((skuId) => nextSkus.some((sku) => sku.id === skuId))),
    );
    setIsDirty(true);
  }, [editForm.price, expandedSkus, loadingVariants, productSkus, variantAttributes]);

  // SKU展开/收起
  const toggleSkuExpanded = useCallback((skuId: string) => {
    setExpandedSkus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(skuId)) {
        newSet.delete(skuId);
      } else {
        newSet.add(skuId);
      }
      return newSet;
    });
  }, []);

  // 更新SKU规格参数
  const updateSkuSpec = useCallback((skuId: string, specKey: string, specValue: string) => {
    setProductSkus((prev) =>
      prev.map((sku) => {
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
      }),
    );
    setIsDirty(true);
  }, []);

  // 添加SKU规格参数键
  const addSkuSpecKey = useCallback((skuId: string, specKey: string) => {
    if (!specKey.trim()) return;
    setProductSkus((prev) =>
      prev.map((sku) => {
        if (sku.id === skuId) {
          const newSpecs = { ...(sku.specs || {}) };
          if (!(specKey in newSpecs)) {
            newSpecs[specKey.trim()] = '';
          }
          return { ...sku, specs: newSpecs };
        }
        return sku;
      }),
    );
    setIsDirty(true);
  }, []);

  // 删除SKU规格参数键
  const removeSkuSpecKey = useCallback((skuId: string, specKey: string) => {
    setProductSkus((prev) =>
      prev.map((sku) => {
        if (sku.id === skuId) {
          const newSpecs = { ...(sku.specs || {}) };
          delete newSpecs[specKey];
          return { ...sku, specs: newSpecs };
        }
        return sku;
      }),
    );
    setIsDirty(true);
  }, []);

  const uploadImageThroughAdminApi = useCallback(async (file: File, type: string) => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      try {
        return await apiFetch<{ url: string }>('/api/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        lastError = err;
        const message = getErrorMessage(err);
        const isNetworkError = /Failed to fetch|NetworkError|Load failed/i.test(message);
        if (!isNetworkError || attempt === 1) {
          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('图片上传失败');
  }, []);

  const getUploadFailureMessage = useCallback((err: unknown) => {
    const message = getErrorMessage(err);
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return '图片上传请求未成功到达服务端，请重试；若仍失败，请检查生产环境 admin 域名下 /api/upload 的反向代理与 HTTPS 配置。';
    }
    return message || '图片上传失败，请重试';
  }, []);

  // 上传SKU图片
  const uploadSkuImage = useCallback(
    async (skuId: string, file: File) => {
      setUploadingSkuImageIds((prev) => new Set(prev).add(skuId));
      try {
        const data = await uploadImageThroughAdminApi(file, 'product');

        setProductSkus((prev) =>
          prev.map((sku) => {
            if (sku.id === skuId) {
              return { ...sku, image_url: data.url };
            }
            return sku;
          }),
        );
        setIsDirty(true);
        success('SKU图片上传成功');
      } catch (err) {
        toastError(getUploadFailureMessage(err));
      } finally {
        setUploadingSkuImageIds((prev) => {
          const next = new Set(prev);
          next.delete(skuId);
          return next;
        });
      }
    },
    [getUploadFailureMessage, success, toastError, uploadImageThroughAdminApi],
  );

  const updateProductImages = useCallback(
    (updater: (images: ProductImageRecord[]) => ProductImageRecord[]) => {
      setEditForm((prev: any) => {
        const currentImages = getProductImagesFromFormState(prev);
        const nextImages = normalizeProductImages(updater(currentImages));
        const mainImage = getMainProductImage(nextImages);

        return {
          ...prev,
          image_url: mainImage?.url || '',
          cover_image_url: mainImage?.url || '',
          images: nextImages,
        };
      });
      setIsDirty(true);
    },
    [],
  );

  // 上传商品图片（首图为主图，其余为详情图）
  const uploadProductImages = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (fileList.length === 0) return;

      setUploadingProductImages(true);
      try {
        const uploadedImages: ProductImageRecord[] = [];

        for (const file of fileList) {
          const data = await uploadImageThroughAdminApi(file, 'product-gallery');

          uploadedImages.push({
            id: createTempImageId('temp-image'),
            url: data.url,
            type: 'detail',
            sort_order: 0,
          });
        }

        updateProductImages((currentImages) => {
          const hasMainImage = currentImages.some((image) => image.type === 'main');
          return [
            ...currentImages,
            ...uploadedImages.map(
              (image, index): ProductImageRecord => ({
                ...image,
                type: !hasMainImage && index === 0 ? 'main' : 'detail',
              }),
            ),
          ];
        });

        success(
          fileList.length === 1
            ? '商品图片上传成功'
            : `商品图片上传成功，已新增 ${fileList.length} 张图片`,
        );
      } catch (err) {
        toastError(getUploadFailureMessage(err));
      } finally {
        setUploadingProductImages(false);
      }
    },
    [getUploadFailureMessage, success, toastError, updateProductImages, uploadImageThroughAdminApi],
  );

  const setMainProductImage = useCallback(
    (imageKey: string) => {
      updateProductImages((images) => {
        const selectedImage = images.find(
          (image, index) => getProductImageKey(image, index) === imageKey,
        );
        if (!selectedImage) return images;

        const remainingImages = images.filter(
          (image, index) => getProductImageKey(image, index) !== imageKey,
        );
        return [
          { ...selectedImage, type: 'main' },
          ...remainingImages.map((image) => ({ ...image, type: 'detail' as const })),
        ];
      });
    },
    [updateProductImages],
  );

  const removeProductImage = useCallback(
    (imageKey: string) => {
      updateProductImages((images) =>
        images.filter((image, index) => getProductImageKey(image, index) !== imageKey),
      );
    },
    [updateProductImages],
  );

  const handleProductImageDragStart = useCallback((imageKey: string) => {
    setDraggedProductImageKey(imageKey);
    setDragOverProductImageKey(null);
  }, []);

  const handleProductImageDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, imageKey: string) => {
      event.preventDefault();

      if (!draggedProductImageKey || draggedProductImageKey === imageKey) {
        return;
      }

      setDragOverProductImageKey(imageKey);
    },
    [draggedProductImageKey],
  );

  const handleProductImageDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, targetImageKey: string) => {
      event.preventDefault();

      if (!draggedProductImageKey || draggedProductImageKey === targetImageKey) {
        setDraggedProductImageKey(null);
        setDragOverProductImageKey(null);
        return;
      }

      updateProductImages((images) => {
        const reorderedImages = [...images];
        const draggedIndex = reorderedImages.findIndex(
          (image, index) => getProductImageKey(image, index) === draggedProductImageKey,
        );
        const targetIndex = reorderedImages.findIndex(
          (image, index) => getProductImageKey(image, index) === targetImageKey,
        );

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
          return images;
        }

        const [draggedImage] = reorderedImages.splice(draggedIndex, 1);
        reorderedImages.splice(targetIndex, 0, draggedImage);
        return reorderedImages;
      });

      setDraggedProductImageKey(null);
      setDragOverProductImageKey(null);
    },
    [draggedProductImageKey, updateProductImages],
  );

  const handleProductImageDragEnd = useCallback(() => {
    setDraggedProductImageKey(null);
    setDragOverProductImageKey(null);
  }, []);

  // 更新SKU字段
  const updateSkuField = useCallback((skuId: string, field: string, value: any) => {
    setProductSkus((prev) =>
      prev.map((sku) => {
        if (sku.id === skuId) {
          return { ...sku, [field]: value };
        }
        return sku;
      }),
    );
    setIsDirty(true);
  }, []);

  // 加载 SKU 阶梯价格
  const loadPriceTiers = useCallback(
    async (skuId: string) => {
      setLoadingTiers((prev) => ({ ...prev, [skuId]: true }));
      try {
        const { data, error } = await supabase
          .from('product_price_tiers')
          .select('*')
          .eq('sku_id', skuId)
          .order('min_quantity', { ascending: true });

        if (error) throw error;
        setPriceTiers((prev) => ({ ...prev, [skuId]: data || [] }));
      } catch (err) {
        console.error('加载阶梯价格失败:', err);
      } finally {
        setLoadingTiers((prev) => ({ ...prev, [skuId]: false }));
      }
    },
    [supabase],
  );

  // 添加阶梯价格
  const addPriceTier = useCallback((skuId: string) => {
    setPriceTiers((prev) => {
      const tiers = prev[skuId] || [];
      const lastTier = tiers[tiers.length - 1];
      const newMin = lastTier ? (lastTier.max_quantity || lastTier.min_quantity + 10) + 1 : 1;
      const newMax = lastTier ? newMin + 9 : 10;

      return {
        ...prev,
        [skuId]: [
          ...tiers,
          {
            id: `new-${Date.now()}`,
            sku_id: skuId,
            min_quantity: newMin,
            max_quantity: newMax,
            price_usd: 0,
            price_cny: 0,
            price_jpy: null,
            price_thb: null,
            _isNew: true,
          },
        ],
      };
    });
    setIsDirty(true);
  }, []);

  // 更新阶梯价格
  const updatePriceTier = useCallback(
    (skuId: string, tierId: string, field: string, value: any) => {
      setPriceTiers((prev) => ({
        ...prev,
        [skuId]: (prev[skuId] || []).map((tier) => {
          if (tier.id === tierId) {
            return { ...tier, [field]: value };
          }
          return tier;
        }),
      }));
      setIsDirty(true);
    },
    [],
  );

  // 删除阶梯价格
  const removePriceTier = useCallback((skuId: string, tierId: string) => {
    setPriceTiers((prev) => ({
      ...prev,
      [skuId]: (prev[skuId] || []).filter((tier) => tier.id !== tierId),
    }));
    setIsDirty(true);
  }, []);

  // 保存阶梯价格
  const savePriceTiers = useCallback(
    async (skuId: string) => {
      const tiers = priceTiers[skuId] || [];
      if (tiers.length === 0) return;

      try {
        // 删除已存在的阶梯价格
        await supabase.from('product_price_tiers').delete().eq('sku_id', skuId);

        // 插入新的阶梯价格
        const tiersToInsert = tiers.map((tier) => ({
          sku_id: skuId,
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity || null,
          price_usd: tier.price_usd || 0,
          price_cny: tier.price_cny || null,
          price_jpy: tier.price_jpy || null,
          price_thb: tier.price_thb || null,
        }));

        const { error } = await supabase.from('product_price_tiers').insert(tiersToInsert);

        if (error) throw error;
        success('阶梯价格保存成功');
        await loadPriceTiers(skuId);
      } catch (err) {
        console.error('保存阶梯价格失败:', err);
        toastError('保存阶梯价格失败');
      }
    },
    [priceTiers, supabase, success, toastError, loadPriceTiers],
  );

  // 多语言读写逻辑
  const getPublishLang = () =>
    ((editForm as any).publish_language || (editForm as any).publishLanguage || 'zh') as string;

  const getLocalizedValue = (baseField: string, obj: any = editForm): string => {
    const publishLang = getPublishLang();

    // 优先检查带语言后缀的字段（包括源语言）
    const suffixKey = `${baseField}_${editLang}`;
    if (obj && suffixKey in obj) {
      const suffixValue = obj[suffixKey];
      if (suffixValue !== undefined && suffixValue !== null) {
        return String(suffixValue);
      }
    }

    // 回退到基础字段：源语言 或 中文（中文内容始终存储在基础字段，数据库无 _zh 列）
    if (editLang === publishLang || editLang === 'zh') {
      const baseValue = obj?.[baseField];
      if (baseValue !== undefined && baseValue !== null) {
        return String(baseValue);
      }
    }

    return '';
  };

  const setLocalizedValue = (baseField: string, value: string) => {
    const publishLang = getPublishLang();

    // 如果带后缀的字段存在，优先使用带后缀的字段（包括源语言）
    const suffixKey = `${baseField}_${editLang}`;
    const useSuffix = editForm && suffixKey in editForm;
    // 中文始终写入基础字段（数据库无 _zh 列）
    const field = useSuffix
      ? suffixKey
      : editLang === publishLang || editLang === 'zh'
        ? baseField
        : `${baseField}_${editLang}`;

    setEditForm((prev: any) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // JSONB 多语言读写（用于 specifications、faq 等 JSONB 字段）
  const getLocalizedJsonValue = (baseField: string): any => {
    const publishLang = getPublishLang();
    const suffixKey = `${baseField}_${editLang}`;
    // 优先检查带后缀的字段
    if (editForm && suffixKey in editForm) {
      const val = editForm[suffixKey];
      if (val !== undefined && val !== null) return val;
    }
    // 回退到基础字段（中文或源语言）
    if (editLang === publishLang || editLang === 'zh') {
      return editForm?.[baseField];
    }
    return undefined;
  };

  const setLocalizedJsonValue = (baseField: string, value: any) => {
    const publishLang = getPublishLang();
    const suffixKey = `${baseField}_${editLang}`;
    const useSuffix = editForm && suffixKey in editForm;
    const field = useSuffix
      ? suffixKey
      : editLang === publishLang || editLang === 'zh'
        ? baseField
        : `${baseField}_${editLang}`;
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // 检查产品是否已发布到任何站点
  const isProductPublished = (): boolean => {
    return product?.site_views?.some((sv: any) => sv.publish_status === 'published') || false;
  };

  // 获取产品已发布的站点名称
  const getPublishedSiteNames = (): string => {
    const sites: string[] = [];
    if (
      product?.site_views?.some(
        (sv: any) => sv.site_code === 'cn' && sv.publish_status === 'published',
      )
    ) {
      sites.push('中国站');
    }
    if (
      product?.site_views?.some(
        (sv: any) => sv.site_code === 'intl' && sv.publish_status === 'published',
      )
    ) {
      sites.push('国际站');
    }
    return sites.join('、');
  };

  // 点击保存按钮
  function handleSaveClick() {
    if (!product) return;
    // 如果产品已发布，显示确认对话框
    if (isProductPublished()) {
      setShowSaveConfirmDialog(true);
    } else {
      performSave();
    }
  }

  const buildPersistPayload = useCallback(
    (overrides: Record<string, unknown> = {}) => ({
      ...editForm,
      variant_attributes: variantAttributes,
      skus: productSkus,
      ...overrides,
      updated_at: new Date().toISOString(),
    }),
    [editForm, productSkus, variantAttributes],
  );

  // 保存
  async function performSave(options: { skipPostSaveRefresh?: boolean } = {}) {
    const { skipPostSaveRefresh = false } = options;

    if (!product) return false;
    setShowSaveConfirmDialog(false);
    setSaving(true);
    setSaveError(null);

    // 调试日志：检查 specs 字段
    console.log('[Product Save] About to save:', {
      isNewProduct,
      hasSpecs: 'specs' in editForm,
      specsValue: editForm.specs,
      specsType: typeof editForm.specs,
      specsStringified: editForm.specs ? JSON.stringify(editForm.specs) : 'undefined',
    });

    try {
      let newProductId = productId;
      const basePersistPayload = buildPersistPayload();

      // 1. 保存产品基本信息
      if (isNewProduct) {
        const { id: _unusedId, ...createPayload } = basePersistPayload || {};
        // 新建产品：使用 POST 创建
        const newData = await apiFetch<any>(`/api/v1/admin/products`, {
          method: 'POST',
          body: JSON.stringify({
            ...createPayload,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        newProductId = newData.id;

        await apiFetch(`/api/v1/admin/products/${newProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(buildPersistPayload({ id: newProductId })),
        });

        // 常规保存时跳转到新产品编辑页；保存后离开则跳过
        if (!skipPostSaveRefresh) {
          router.replace(`/products/${newProductId}`);
        }
      } else {
        // 更新产品：使用 PATCH
        await apiFetch(`/api/v1/admin/products/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify(basePersistPayload),
        });
      }

      setSaveSuccess(true);
      setIsDirty(false);
      success(
        isNewProduct
          ? '产品创建成功'
          : '产品修改已保存' + (isProductPublished() ? '，商城内容已更新' : ''),
      );
      setTimeout(() => setSaveSuccess(false), 2000);

      if (!skipPostSaveRefresh) {
        if (isNewProduct) {
          // 重新加载新产品数据
          const json = await apiFetch<{ view: 'base'; data: any }>(
            `/api/v1/admin/products/${newProductId}?view=base`,
          );
          setProduct(json.data);
          setEditForm({ ...json.data });
        } else {
          await loadProduct(); // 重新加载产品数据
        }
      }

      console.log('[Product Save] Save completed, reloaded product specs:', product.specs);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '保存失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // 兼容旧代码
  async function handleSave() {
    await performSave();
  }

  // 保存并上架
  async function handleSaveAndPublish() {
    if (!product || selectedSites.length === 0) return;
    setPublishing(true);
    setSaveError(null);
    try {
      console.log('[Publish] Step 1: Saving product...');
      // 1. 保存产品基本信息、规格属性与 SKU
      await apiFetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(buildPersistPayload()),
      });
      console.log('[Publish] Step 1 complete');

      // 2. 创建站点视图并发布
      console.log('[Publish] Step 2: Creating site views...');
      const siteViewErrors: string[] = [];
      for (const site of selectedSites) {
        console.log(`[Publish] Creating site view for site: ${site}, product: ${productId}`);
        try {
          const data = await apiFetch(
            `/api/v1/admin/products/${productId}/site-view?site_code=${site}`,
            {
              method: 'POST',
              body: JSON.stringify({
                site_code: site,
                publish_status: 'published',
                is_enabled: true,
              }),
            },
          );
          console.log(`[Publish] Site view created successfully for ${site}:`, data);
        } catch (err) {
          console.error(`[Publish] Site view error for ${site}:`, err);
          siteViewErrors.push(`${site}: ${getErrorMessage(err)}`);
        }
      }
      if (siteViewErrors.length > 0)
        throw new Error(`站点视图创建失败：${siteViewErrors.join(', ')}`);
      console.log('[Publish] Step 2 complete');

      // 3. 更新产品状态为已发布
      console.log('[Publish] Step 3: Updating product status...');
      await apiFetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }),
      });
      console.log('[Publish] Step 3 complete');

      // 4. 记录审计日志
      console.log('[Publish] Step 4: Recording audit log...');
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error: auditError } = await supabase.from('admin_audit_logs').insert({
          admin_user_id: user?.id,
          module: 'product',
          action: 'publish',
          target_type: 'product',
          target_id: productId,
          target_name: product.name,
          changes_summary: `上架产品：${product.name}，站点：${selectedSites.join(', ').toUpperCase()}`,
        });
        if (auditError) {
          console.error('[Publish] Step 4 audit log failed (non-critical):', auditError);
        }
      } catch (auditError) {
        console.error('[Publish] Step 4 audit log threw (non-critical):', auditError);
      }
      console.log('[Publish] Step 4 complete');

      setShowPublishDialog(false);
      setIsDirty(false);
      await loadProduct();
      // 获取站点名称
      const siteNames = selectedSites.map((s) => (s === 'cn' ? '中国站' : '国际站')).join('、');
      success(`产品已成功上架到 ${siteNames}`);
      console.log('[Publish] All steps completed successfully!');
    } catch (err) {
      console.error('[Publish] Publish failed:', err);
      const errorMsg = err instanceof Error ? err.message : '上架失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setPublishing(false);
    }
  }

  // AI 翻译
  async function handleTranslate() {
    if (!product) return;

    // 根据源语言动态计算目标语言
    const currentPublishLang = getPublishLang();
    const allLangs: { code: string; name: string }[] = [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'th', name: 'ภาษาไทย' },
      { code: 'ja', name: '日本語' },
    ];
    const targets = allLangs.filter((l) => l.code !== currentPublishLang);
    setTranslateTargetLangs(targets);

    // 动态生成进度步骤
    const dynamicSteps = [
      { step: 1, text: '正在分析产品内容...', progress: 5 },
      ...targets.map((t, i) => ({
        step: i + 2,
        text: `正在翻译到 ${t.name}...`,
        progress: Math.round(5 + ((i + 1) / (targets.length + 1)) * 85),
      })),
      { step: targets.length + 2, text: '正在保存翻译结果...', progress: 92 },
    ];
    setTranslateSteps(dynamicSteps);

    // 显示翻译进度弹框
    setShowTranslateModal(true);
    setTranslating(true);
    setTranslateError(null);
    setTranslateStep(1);
    setTranslateProgress(0);

    // 模拟进度更新：逐步切换步骤，模拟逐语言翻译
    let currentStepIdx = 0;
    const stepDuration = 15000; // 每个语言约 15 秒
    const progressInterval = setInterval(() => {
      setTranslateProgress((prev) => {
        if (prev >= 88) return prev; // 等待实际完成
        // 计算当前应该在哪个步骤
        const elapsed = prev;
        const expectedStep = dynamicSteps.find((s) => s.progress > elapsed);
        if (expectedStep && expectedStep.step > currentStepIdx + 1) {
          currentStepIdx = expectedStep.step - 1;
          setTranslateStep(expectedStep.step);
        }
        return prev + Math.random() * 2 + 0.5;
      });
    }, 800);

    // 逐步推进步骤（基于时间估算）
    const stepTimers: NodeJS.Timeout[] = [];
    targets.forEach((_, i) => {
      const timer = setTimeout(
        () => {
          setTranslateStep(i + 2);
        },
        1000 + i * stepDuration,
      );
      stepTimers.push(timer);
    });

    try {
      // 调用翻译 API（后端逐语言翻译，总耗时较长）
      const result = await apiFetch<any>('/api/products/translate', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });

      // 清理步骤定时器
      stepTimers.forEach((t) => clearTimeout(t));

      // 保存步骤
      setTranslateStep(dynamicSteps[dynamicSteps.length - 1].step);
      setTranslateProgress(95);
      await new Promise((r) => setTimeout(r, 500));

      // 完成
      clearInterval(progressInterval);
      setTranslateProgress(100);
      setTranslateSuccess(true);
      await loadProduct();

      // 动态成功消息
      const langNamesZh: Record<string, string> = {
        en: '英文',
        zh: '中文',
        th: '泰文',
        ja: '日文',
      };
      if (result.failedLangs && result.failedLangs.length > 0) {
        const failedNames = result.failedLangs.map((l: string) => langNamesZh[l] || l).join('、');
        const completedNames = (result.completedLangs || [])
          .map((l: string) => langNamesZh[l] || l)
          .join('、');
        // 部分成功也更新已翻译的目标语言显示
        setTranslateTargetLangs(
          targets.filter((t) => (result.completedLangs || []).includes(t.code)),
        );
        setTimeout(() => {
          setShowTranslateModal(false);
          warning(`已完成${completedNames}翻译，${failedNames}翻译失败`);
        }, 1500);
      } else {
        const targetNames = targets.map((t) => langNamesZh[t.code] || t.name).join('、');
        setTimeout(() => {
          setShowTranslateModal(false);
          success(`AI 翻译完成，已自动补全${targetNames}内容`);
        }, 1000);
      }
    } catch (err) {
      clearInterval(progressInterval);
      stepTimers.forEach((t) => clearTimeout(t));
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
      toastError(err instanceof Error ? err.message : '翻译失败');
      setTimeout(() => {
        setShowTranslateModal(false);
      }, 2000);
    } finally {
      setTranslating(false);
    }
  }

  // 批准
  async function handleApprove() {
    if (!confirm('确定要批准这个产品吗？')) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/products/${productId}?action=approve`, { method: 'POST' });
      await loadProduct();
      success('产品已通过审核');
    } catch (err) {
      const errorMsg = getErrorMessage(err) || '批准失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // 拒绝
  async function handleReject() {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/products/${productId}?action=reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await loadProduct();
      warning('产品已拒绝');
    } catch (err) {
      const errorMsg = getErrorMessage(err) || '拒绝失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // 下架
  async function handleOfflineFromSite(siteCode: string) {
    const siteName = siteCode === 'cn' ? '中国站' : '国际站';
    if (
      !confirm(
        `确定要从 ${siteName} 下架这个产品吗？\n\n下架后，该产品将无法在 ${siteName} 商城购买。`,
      )
    )
      return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('product_site_views')
        .update({
          publish_status: 'offline',
          is_enabled: false,
        })
        .eq('product_id', productId)
        .eq('site_code', siteCode);

      if (error) throw error;
      await loadProduct();
      success(`产品已从 ${siteName} 下架`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '下架失败';
      setSaveError(errorMsg);
      toastError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  const performLeaveAction = useCallback(
    (action: Exclude<PendingLeaveAction, null>) => {
      skipBeforeUnloadRef.current = true;
      setShowLeaveDialog(false);
      setPendingLeaveAction(null);

      window.setTimeout(() => {
        skipBeforeUnloadRef.current = false;
      }, 1500);

      if (action.type === 'refresh') {
        window.location.reload();
        return;
      }

      router.push(action.href);
    },
    [router],
  );

  const requestLeave = useCallback(
    (action: Exclude<PendingLeaveAction, null>) => {
      if (!isDirty) {
        performLeaveAction(action);
        return;
      }

      setPendingLeaveAction(action);
      setShowLeaveDialog(true);
    },
    [isDirty, performLeaveAction],
  );

  const handleStayOnPage = useCallback(() => {
    setShowLeaveDialog(false);
    setPendingLeaveAction(null);
  }, []);

  const handleLeaveWithoutSave = useCallback(() => {
    if (!pendingLeaveAction) return;
    performLeaveAction(pendingLeaveAction);
  }, [pendingLeaveAction, performLeaveAction]);

  const handleSaveAndLeave = useCallback(async () => {
    if (!pendingLeaveAction) return;

    const saved = await performSave({ skipPostSaveRefresh: true });
    if (saved) {
      performLeaveAction(pendingLeaveAction);
    }
  }, [pendingLeaveAction, performLeaveAction]);

  // 返回列表
  function handleBack() {
    requestLeave({ type: 'route', href: '/products' });
  }

  // 浏览器原生离开确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !skipBeforeUnloadRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 刷新快捷键拦截：提供“保存并刷新 / 直接刷新”选择
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDirty || skipBeforeUnloadRef.current) return;

      const isRefreshShortcut =
        event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');

      if (!isRefreshShortcut) return;

      event.preventDefault();
      requestLeave({ type: 'refresh' });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, requestLeave]);

  // 页面内跳转拦截：例如侧边栏或其它链接跳转
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty || skipBeforeUnloadRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const rawHref = anchor.getAttribute('href');
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      requestLeave({ type: 'route', href: nextPath });
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [isDirty, requestLeave]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState />
      </div>
    );

  if (error || !product) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{error || '产品不存在'}</h2>
            <p className="text-slate-500 mb-6">无法加载产品数据</p>
            <Button onClick={handleBack}>返回产品列表</Button>
          </div>
        </Card>
      </div>
    );
  }

  const publishLang = getPublishLang();
  const productImages = getProductImagesFromFormState(editForm);
  const mainProductImage = getMainProductImage(productImages);
  const leaveTargetLabel = pendingLeaveAction?.type === 'refresh' ? '刷新页面' : '离开当前页面';

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate max-w-md">
              {editForm.name || '编辑产品'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  product.status === 'pending_review' || product.status === 'Pending'
                    ? 'bg-amber-100 text-amber-700'
                    : product.status === 'approved' || product.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : product.status === 'rejected' || product.status === 'Rejected'
                        ? 'bg-red-100 text-red-600'
                        : product.status === 'published' || product.status === 'Published'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                }`}
              >
                {product.status === 'pending_review' || product.status === 'Pending'
                  ? '待审核'
                  : product.status === 'approved' || product.status === 'Approved'
                    ? '已通过'
                    : product.status === 'rejected' || product.status === 'Rejected'
                      ? '已拒绝'
                      : product.status === 'published' || product.status === 'Published'
                        ? '已发布'
                        : product.status}
              </span>
              {product.translationsComplete ? (
                <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded text-xs font-bold">
                  已翻译
                </span>
              ) : (
                <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded text-xs font-bold">
                  待翻译
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleTranslate}
            loading={translating}
            className={
              translateSuccess
                ? '!bg-emerald-500 !text-white'
                : '!bg-purple-600 hover:!bg-purple-500 !text-white'
            }
          >
            {translating ? 'AI 翻译中...' : translateSuccess ? '翻译完成 ✓' : 'AI 补全翻译'}
          </Button>
          {(product.status === 'pending_review' || product.status === 'Pending') && (
            <>
              <Button
                variant="secondary"
                onClick={handleApprove}
                loading={saving}
                className="!bg-green-600 hover:!bg-green-500 !text-white"
              >
                ✓ 通过
              </Button>
              <Button
                variant="secondary"
                onClick={handleReject}
                loading={saving}
                className="!bg-red-600 hover:!bg-red-500 !text-white"
              >
                ✕ 拒绝
              </Button>
            </>
          )}
          <Button
            onClick={handleSaveClick}
            loading={saving}
            className={saveSuccess ? '!bg-green-500' : ''}
          >
            {saving ? '保存中...' : saveSuccess ? '已保存 ✓' : '保存修改'}
          </Button>
          {(product.status === 'pending_review' ||
            product.status === 'Pending' ||
            product.status === 'rejected' ||
            product.status === 'Rejected' ||
            product.status === 'draft' ||
            product.status === 'Draft') && (
            <Button
              onClick={() => setShowPublishDialog(true)}
              className="!bg-emerald-600 hover:!bg-emerald-500 !text-white"
            >
              保存并上架
            </Button>
          )}
        </div>
      </div>

      {(saveError || translateError) && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
          {saveError || translateError}
        </div>
      )}

      {/* 语言切换 */}
      <div className="flex gap-2 flex-wrap sticky top-0 bg-[var(--admin-bg)] py-3 z-10">
        {(['en', 'zh', 'th', 'ja'] as const).map((lang) => {
          const isSource = lang === publishLang;
          return (
            <button
              key={lang}
              onClick={() => setEditLang(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                editLang === lang
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {lang === 'en'
                ? 'English'
                : lang === 'zh'
                  ? '中文'
                  : lang === 'th'
                    ? 'ไทย'
                    : '日本語'}
              {isSource && <span className="ml-1 text-xs opacity-70">(源)</span>}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'basic', label: '基本信息', icon: '📋' },
          { id: 'category', label: '商品分类', icon: '🏷️' },
          { id: 'variants', label: '变体维度与 SKU', icon: '📦' },
          { id: 'specs', label: '产品公共参数', icon: '⚙️' },
          { id: 'seo', label: 'SEO 优化', icon: '🔍' },
          { id: 'publish', label: '发布管理', icon: '🌐' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-black'
                : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section 1: 基本信息 */}
      {activeTab === 'basic' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">📋</span> 基本信息
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500">发布语言:</span>
              <span className="text-sm text-slate-900 font-medium">
                {publishLang === 'zh'
                  ? '中文'
                  : publishLang === 'en'
                    ? 'English'
                    : publishLang === 'ja'
                      ? '日本語'
                      : 'ภาษาไทย'}
              </span>
              <span className="text-xs text-slate-600">(AI 翻译将从此语言翻译到其他语言)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  商品名称 ({editLang === publishLang ? `${editLang} - 源` : editLang})
                </label>
                <input
                  type="text"
                  value={getLocalizedValue('name')}
                  onChange={(e) => setLocalizedValue('name', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  品牌 Brand
                </label>
                <input
                  type="text"
                  value={editForm.brand || ''}
                  onChange={(e) => {
                    setEditForm((prev: any) => ({ ...prev, brand: e.target.value }));
                    setIsDirty(true);
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品描述 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <textarea
                value={getLocalizedValue('description')}
                onChange={(e) => setLocalizedValue('description', e.target.value)}
                rows={4}
                className="w-full min-h-[100px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品详情 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <RichTextEditor
                value={getLocalizedValue('rich_description') || ''}
                onChange={(value) => {
                  setLocalizedValue('rich_description', value);
                  setIsDirty(true);
                }}
                placeholder="请输入商品详情内容..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                商品图片
              </label>
              {productImages.length > 0 ? (
                <div className="flex flex-wrap gap-3 mb-3">
                  {productImages.map((img, idx) => {
                    const imageKey = getProductImageKey(img, idx);
                    const isDragged = draggedProductImageKey === imageKey;
                    const isDragOver = dragOverProductImageKey === imageKey;

                    return (
                      <div key={imageKey} className="w-24">
                        <div
                          draggable
                          onDragStart={() => handleProductImageDragStart(imageKey)}
                          onDragOver={(event) => handleProductImageDragOver(event, imageKey)}
                          onDrop={(event) => handleProductImageDrop(event, imageKey)}
                          onDragEnd={handleProductImageDragEnd}
                          className={`relative group cursor-move rounded-lg transition-all ${
                            isDragOver
                              ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-white'
                              : ''
                          } ${isDragged ? 'opacity-50' : ''}`}
                        >
                          <img
                            src={img.url}
                            alt={img.type || `图片 ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-slate-200/50"
                          />
                          <div className="absolute top-1 left-1 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            <GripVertical className="h-3 w-3" />
                            拖拽
                          </div>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                            {img.type === 'main' ? '主图' : '详情图'}
                          </span>
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                          {img.type === 'main' ? (
                            <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                              当前主图
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMainProductImage(imageKey)}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-600"
                            >
                              设为主图
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeProductImage(imageKey)}
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : mainProductImage ? (
                <img
                  src={mainProductImage.url}
                  alt="商品"
                  className="w-32 h-32 object-cover rounded-lg mb-2 border border-slate-200/50"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 rounded-lg mb-2 flex items-center justify-center text-slate-400 text-sm">
                  暂无图片
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${uploadingProductImages ? 'cursor-wait border-slate-200 bg-slate-100 text-slate-400' : 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-600'}`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    disabled={uploadingProductImages}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files?.length) {
                        void uploadProductImages(files);
                      }
                      e.currentTarget.value = '';
                    }}
                  />
                  <Upload className="h-4 w-4" />
                  {uploadingProductImages ? '上传中...' : '上传商品图片'}
                </label>
                {productImages.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => updateProductImages(() => [])}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                    清空图片
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                value={mainProductImage?.url || ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  updateProductImages((images) => {
                    const detailImages = images.filter((image) => image.type !== 'main');
                    return nextValue
                      ? [
                          {
                            id: createTempImageId('temp-main-url'),
                            url: nextValue,
                            type: 'main',
                            sort_order: 0,
                          },
                          ...detailImages,
                        ]
                      : detailImages;
                  });
                }}
                placeholder="主图 URL"
                className="mt-3 w-full px-4 py-2 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                支持一次上传多张图片。系统会保留 1
                张主图用于列表展示，其余图片保存为详情图；你也可以手动切换主图或直接拖拽调整图片顺序。
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                专科分类 Specialty
              </label>
              <input
                type="text"
                value={editForm.specialty || ''}
                onChange={(e) => {
                  setEditForm((prev: any) => ({ ...prev, specialty: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="例如：Orthodontics, Oral Surgery"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                来源 URL Source URL
              </label>
              <input
                type="url"
                value={editForm.source_url || ''}
                onChange={(e) => {
                  setEditForm((prev: any) => ({ ...prev, source_url: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="例如：https://www.alibaba.com/product-detail/..."
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                产品来源链接，用于追溯原始供应商或采购渠道
              </p>
            </div>

            {/* 物流与贸易信息 */}
            <div className="border-t pt-4 mt-4">
              <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">🚚</span> 物流与贸易信息
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    定价模式
                  </label>
                  <select
                    value={editForm.pricing_mode || 'fixed'}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({ ...prev, pricing_mode: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                  >
                    <option value="fixed">固定价格</option>
                    <option value="inquiry">询价模式</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    发货时间
                  </label>
                  <input
                    type="text"
                    value={getLocalizedValue('delivery_time') || editForm.delivery_time_en || ''}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({
                        ...prev,
                        delivery_time: e.target.value,
                        delivery_time_en: e.target.value,
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    placeholder="如：3-5个工作日"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    最小起订量
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.min_order_quantity || ''}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({
                        ...prev,
                        min_order_quantity: Number(e.target.value),
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    包装信息
                  </label>
                  <input
                    type="text"
                    value={editForm.packaging_info || ''}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({ ...prev, packaging_info: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    placeholder="如：纸箱包装，每箱10件"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    保修信息
                  </label>
                  <input
                    type="text"
                    value={editForm.warranty_info || ''}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({ ...prev, warranty_info: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    placeholder="如：整机保修1年"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    产品尺寸
                  </label>
                  <input
                    type="text"
                    value={editForm.dimensions || ''}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({ ...prev, dimensions: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    placeholder="如：30x20x15 cm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    产品视频
                  </label>
                  <input
                    type="url"
                    value={editForm.video_url || ''}
                    onChange={(e) => {
                      setEditForm((prev: any) => ({ ...prev, video_url: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section 2: 商品分类 */}
      {activeTab === 'category' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">🏷️</span> 商品分类
          </h4>
          <div className="space-y-4">
            {isGLOBAL && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                当前是 Global
                视角。产品分类已经改为站点独立，请先切换到中国站或国际站，再为该产品选择对应站点的分类。
              </div>
            )}
            {loadingCategories ? (
              <div className="flex items-center justify-center py-12">
                <LoadingState />
              </div>
            ) : isGLOBAL ? null : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      一级分类
                    </label>
                    <select
                      value={editForm.category_id || ''}
                      onChange={(e) => {
                        const categoryId = e.target.value;
                        setEditForm((prev: any) => ({
                          ...prev,
                          category_id: categoryId,
                          subcategory_id: '',
                        }));
                        setIsDirty(true);
                      }}
                      disabled={isGLOBAL}
                      className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    >
                      <option value="">选择一级分类</option>
                      {categories
                        .filter((c) => c.level === 1)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      二级分类
                    </label>
                    <select
                      value={editForm.subcategory_id || ''}
                      onChange={(e) => {
                        setEditForm((prev: any) => ({ ...prev, subcategory_id: e.target.value }));
                        setIsDirty(true);
                      }}
                      disabled={isGLOBAL || !editForm.category_id}
                      className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                    >
                      <option value="">选择二级分类</option>
                      {categories
                        .filter((c) => c.level === 2 && c.parent_id === editForm.category_id)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {editForm.category_id && (
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-sm text-slate-600 mb-2">当前分类路径:</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {categories.find((c) => c.id === editForm.category_id)?.name || '未知'}
                      </span>
                      {editForm.subcategory_id && (
                        <>
                          <span className="text-slate-400">/</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {categories.find((c) => c.id === editForm.subcategory_id)?.name ||
                              '未知'}
                          </span>
                        </>
                      )}
                    </div>
                    {categories.find((c) => c.id === editForm.category_id)?.site_code ===
                      'global' && (
                      <p className="mt-3 text-sm text-amber-700">
                        该产品当前仍引用 legacy global
                        分类。请重新选择当前站点的分类，完成站点隔离迁移。
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Section 3: 变体维度与 SKU */}
      {activeTab === 'variants' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">📦</span> 变体维度与 SKU
          </h4>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="space-y-2 text-sm text-blue-800">
                <p>
                  💡 <strong>填写规则：</strong>先区分“产品公共参数”和“变体维度”。
                </p>
                <p>
                  产品公共参数：所有 SKU
                  共用的信息，例如材质、灭菌方式、适用动物、包装规格，请填写到“产品公共参数”页。
                </p>
                <p>
                  变体维度：客户下单前需要选择的项，例如颜色、尺寸、型号、长度，在这里填写，系统会据此生成
                  SKU 组合。
                </p>
                <p>SKU：每个组合独立的编码、价格、库存、图片和阶梯价格，在下方 SKU 列表维护。</p>
              </div>
            </div>

            {/* 规格属性列表 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold text-slate-900">变体维度（生成 SKU 组合）</h5>
                <button
                  onClick={() =>
                    setVariantAttributes((prev) => [
                      ...prev,
                      {
                        id: `new-${Date.now()}`,
                        attribute_name: '',
                        attribute_values: [],
                        product_id: productId,
                      },
                    ])
                  }
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  + 添加变体维度
                </button>
              </div>
              <div className="space-y-3">
                {variantAttributes.map((attr, idx) => (
                  <div key={attr.id || idx} className="border rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        value={attr.attribute_name || ''}
                        onChange={(e) => {
                          const newAttrs = [...variantAttributes];
                          newAttrs[idx].attribute_name = e.target.value;
                          setVariantAttributes(newAttrs);
                          setIsDirty(true);
                        }}
                        placeholder="变体维度名称（如：颜色、尺寸、型号）"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          const attributeDraftKey = getVariantAttributeDraftKey(
                            variantAttributes[idx],
                            idx,
                          );
                          const newAttrs = variantAttributes.filter((_, i) => i !== idx);
                          setVariantAttributes(newAttrs);
                          setVariantAttributeDrafts((prev) => {
                            if (!(attributeDraftKey in prev)) {
                              return prev;
                            }

                            const next = { ...prev };
                            delete next[attributeDraftKey];
                            return next;
                          });
                          setIsDirty(true);
                        }}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        维度值（用逗号分隔）
                      </label>
                      {(() => {
                        const attributeDraftKey = getVariantAttributeDraftKey(attr, idx);
                        const inputValue = Object.prototype.hasOwnProperty.call(
                          variantAttributeDrafts,
                          attributeDraftKey,
                        )
                          ? variantAttributeDrafts[attributeDraftKey]
                          : attr.attribute_values?.join(', ') || '';

                        return (
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => {
                              const nextDraft = e.target.value;
                              const values = splitVariantAttributeValues(nextDraft);
                              setVariantAttributeDrafts((prev) => ({
                                ...prev,
                                [attributeDraftKey]: nextDraft,
                              }));
                              const newAttrs = [...variantAttributes];
                              newAttrs[idx].attribute_values = values;
                              setVariantAttributes(newAttrs);
                              setIsDirty(true);
                            }}
                            onBlur={() => {
                              setVariantAttributeDrafts((prev) => {
                                if (!(attributeDraftKey in prev)) {
                                  return prev;
                                }

                                const next = { ...prev };
                                delete next[attributeDraftKey];
                                return next;
                              });
                            }}
                            placeholder="例如：红色，蓝色，白色 或 S、M、L、XL（支持中英文逗号、分号、换行）"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          />
                        );
                      })()}
                    </div>
                  </div>
                ))}
                {variantAttributes.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>暂无变体维度，点击“添加变体维度”开始设置</p>
                  </div>
                )}
              </div>
            </div>

            {/* SKU 列表 - 无论有没有规格维度都显示 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold text-slate-900">
                  SKU 列表 ({productSkus.length} 个)
                </h5>
                <p className="text-xs text-slate-400">
                  维度值变化后会自动同步 SKU 组合；点击展开行可编辑补充参数、图片和阶梯价格
                </p>
              </div>
              {productSkus.length > 0 ? (
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-10 px-2 py-3"></th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                          SKU 编码
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                          变体组合
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                          供货价
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                          建议零售价
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-emerald-600 uppercase bg-emerald-50">
                          CNY 销售价
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-blue-600 uppercase bg-blue-50">
                          USD 销售价
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-purple-600 uppercase bg-purple-50">
                          JPY 销售价
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-amber-600 uppercase bg-amber-50">
                          THB 销售价
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                          库存
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productSkus.map((sku) => {
                        const isExpanded = expandedSkus.has(sku.id);
                        const isUploadingSkuImage = uploadingSkuImageIds.has(sku.id);
                        return (
                          <React.Fragment key={sku.id}>
                            <tr className="hover:bg-slate-50">
                              <td className="px-2 py-3">
                                <button
                                  onClick={() => toggleSkuExpanded(sku.id)}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                  title={isExpanded ? '收起' : '展开编辑规格参数和图片'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className="px-3 py-3 text-slate-900 font-mono text-xs">
                                {sku.sku_code}
                              </td>
                              <td className="px-3 py-3">
                                {sku.attribute_combination &&
                                Object.keys(sku.attribute_combination).length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {Object.entries(sku.attribute_combination).map(
                                      ([key, value]) => (
                                        <span
                                          key={key}
                                          className="px-2 py-1 bg-slate-100 rounded text-xs"
                                        >
                                          {key}: {String(value)}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">默认SKU</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-slate-900">¥{sku.price}</td>
                              <td className="px-3 py-3 text-slate-500">
                                {sku.suggested_retail_price
                                  ? `¥${sku.suggested_retail_price}`
                                  : '-'}
                              </td>
                              {/* CNY 销售价 */}
                              <td className="px-3 py-2 bg-emerald-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-emerald-600 text-xs">¥</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={sku.selling_price || ''}
                                    onChange={(e) =>
                                      updateSkuField(
                                        sku.id,
                                        'selling_price',
                                        parseFloat(e.target.value) || null,
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-emerald-200 rounded text-sm text-center"
                                    placeholder="CNY"
                                  />
                                </div>
                              </td>
                              {/* USD 销售价 */}
                              <td className="px-3 py-2 bg-blue-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 text-xs">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={sku.selling_price_usd || ''}
                                    onChange={(e) =>
                                      updateSkuField(
                                        sku.id,
                                        'selling_price_usd',
                                        parseFloat(e.target.value) || null,
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-blue-200 rounded text-sm text-center"
                                    placeholder="USD"
                                  />
                                </div>
                              </td>
                              {/* JPY 销售价 */}
                              <td className="px-3 py-2 bg-purple-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-purple-600 text-xs">¥</span>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={sku.selling_price_jpy || ''}
                                    onChange={(e) =>
                                      updateSkuField(
                                        sku.id,
                                        'selling_price_jpy',
                                        parseFloat(e.target.value) || null,
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-purple-200 rounded text-sm text-center"
                                    placeholder="JPY"
                                  />
                                </div>
                              </td>
                              {/* THB 销售价 */}
                              <td className="px-3 py-2 bg-amber-50/50">
                                <div className="flex items-center gap-1">
                                  <span className="text-amber-600 text-xs">฿</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={sku.selling_price_thb || ''}
                                    onChange={(e) =>
                                      updateSkuField(
                                        sku.id,
                                        'selling_price_thb',
                                        parseInt(e.target.value) || null,
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-amber-200 rounded text-sm text-center"
                                    placeholder="THB(整数)"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={sku.stock_quantity ?? ''}
                                  onChange={(e) =>
                                    updateSkuField(
                                      sku.id,
                                      'stock_quantity',
                                      e.target.value === ''
                                        ? 0
                                        : Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                                    )
                                  }
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-center"
                                  placeholder="库存"
                                />
                              </td>
                            </tr>
                            {/* 展开行 - 图片和规格参数编辑 */}
                            {isExpanded && (
                              <tr key={`${sku.id}-expanded`} className="bg-slate-50">
                                <td colSpan={10} className="px-6 py-4">
                                  <div className="flex gap-8">
                                    {/* SKU 图片 */}
                                    <div className="flex-shrink-0">
                                      <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        SKU 图片
                                      </p>
                                      <div className="relative w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors bg-white">
                                        {sku.image_url ? (
                                          <>
                                            <img
                                              src={sku.image_url}
                                              alt="SKU"
                                              className="w-full h-full object-cover"
                                            />
                                            <button
                                              onClick={() =>
                                                updateSkuField(sku.id, 'image_url', null)
                                              }
                                              className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </>
                                        ) : (
                                          <label
                                            className={`w-full h-full flex flex-col items-center justify-center ${isUploadingSkuImage ? 'cursor-wait text-slate-300' : 'cursor-pointer'}`}
                                          >
                                            <input
                                              type="file"
                                              accept="image/jpeg,image/png,image/webp"
                                              className="hidden"
                                              disabled={isUploadingSkuImage}
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void uploadSkuImage(sku.id, file);
                                              }}
                                            />
                                            <Upload className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs text-slate-400 mt-1">
                                              {isUploadingSkuImage ? '上传中...' : '上传'}
                                            </span>
                                          </label>
                                        )}
                                      </div>
                                    </div>

                                    {/* SKU 重量 */}
                                    <div className="flex-shrink-0">
                                      <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <Settings2 className="w-3 h-3" />
                                        重量（运费计算）
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={sku.weight ?? ''}
                                          onChange={(e) =>
                                            updateSkuField(
                                              sku.id,
                                              'weight',
                                              parseFloat(e.target.value) || null,
                                            )
                                          }
                                          className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center"
                                          placeholder="0.00"
                                        />
                                        <select
                                          value={sku.weight_unit || 'kg'}
                                          onChange={(e) =>
                                            updateSkuField(sku.id, 'weight_unit', e.target.value)
                                          }
                                          className="px-2 py-2 border border-slate-200 rounded-lg text-sm"
                                        >
                                          <option value="kg">kg</option>
                                          <option value="g">g</option>
                                          <option value="lb">lb</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* SKU 规格参数 */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                          <Settings2 className="w-3 h-3" />
                                          SKU 补充参数
                                        </p>
                                        <span className="text-[11px] text-slate-400">
                                          仅当某个 SKU
                                          有独有参数时填写；颜色、尺寸、型号不要在这里重复录入。
                                        </span>
                                        <div className="flex gap-2">
                                          <select
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                addSkuSpecKey(sku.id, e.target.value);
                                                e.target.value = '';
                                              }
                                            }}
                                            className="text-xs border border-slate-300 rounded px-2 py-1"
                                          >
                                            <option value="">添加补充参数...</option>
                                            {SKU_SPEC_PRESETS.filter(
                                              (p) => !(sku.specs && p in sku.specs),
                                            ).map((preset) => (
                                              <option key={preset} value={preset}>
                                                {preset}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            type="text"
                                            placeholder="自定义补充参数"
                                            className="text-xs border border-slate-300 rounded px-2 py-1 w-24"
                                            onKeyDown={(e) => {
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
                                        {sku.specs &&
                                          Object.entries(sku.specs).map(([key, value]) => (
                                            <div
                                              key={key}
                                              className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1.5"
                                            >
                                              <span className="text-xs text-slate-500 w-14 truncate">
                                                {key}:
                                              </span>
                                              <input
                                                type="text"
                                                value={String(value)}
                                                onChange={(e) =>
                                                  updateSkuSpec(sku.id, key, e.target.value)
                                                }
                                                className="flex-1 text-xs border-none outline-none bg-transparent"
                                                placeholder="值"
                                              />
                                              <button
                                                onClick={() => removeSkuSpecKey(sku.id, key)}
                                                className="text-slate-400 hover:text-red-500"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ))}
                                        {(!sku.specs || Object.keys(sku.specs).length === 0) && (
                                          <p className="text-xs text-slate-400 col-span-full py-2">
                                            暂无 SKU
                                            补充参数；若只是颜色、尺寸、型号差异，不要在这里重复填写。
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 阶梯价格设置 */}
                                  <div className="mt-6 border-t border-slate-200 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <span className="text-sm">📊</span>
                                        阶梯价格（批量折扣）
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => loadPriceTiers(sku.id)}
                                          className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-100"
                                        >
                                          加载
                                        </button>
                                        <button
                                          onClick={() => addPriceTier(sku.id)}
                                          className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1"
                                        >
                                          <Plus className="w-3 h-3" /> 添加阶梯
                                        </button>
                                      </div>
                                    </div>

                                    {loadingTiers[sku.id] ? (
                                      <p className="text-xs text-slate-400">加载中...</p>
                                    ) : priceTiers[sku.id] && priceTiers[sku.id].length > 0 ? (
                                      <div className="space-y-3">
                                        {/* 折扣率快速设置 */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-xs font-bold text-blue-700">
                                              快捷设置折扣：
                                            </span>
                                            <div className="flex items-center gap-1">
                                              {[5, 10, 15, 20, 25, 30].map((discount) => (
                                                <button
                                                  key={discount}
                                                  onClick={() => {
                                                    // 获取所有币种的基准价格
                                                    const baseUsd =
                                                      sku.selling_price_usd || sku.price || 0;
                                                    const baseCny = sku.selling_price || 0;
                                                    const baseJpy = sku.selling_price_jpy || 0;
                                                    const baseThb = sku.selling_price_thb || 0;

                                                    const newTiers = (priceTiers[sku.id] || []).map(
                                                      (tier, idx) => {
                                                        const tierDiscount = discount + idx * 5; // 每级递增5%
                                                        const multiplier =
                                                          (100 - tierDiscount) / 100;

                                                        return {
                                                          ...tier,
                                                          // USD: 支持小数，保留两位
                                                          price_usd: baseUsd
                                                            ? Math.round(
                                                                baseUsd * multiplier * 100,
                                                              ) / 100
                                                            : tier.price_usd,
                                                          // CNY: 支持小数，保留两位
                                                          price_cny: baseCny
                                                            ? Math.round(
                                                                baseCny * multiplier * 100,
                                                              ) / 100
                                                            : tier.price_cny,
                                                          // JPY: 取整数
                                                          price_jpy: baseJpy
                                                            ? Math.round(baseJpy * multiplier)
                                                            : tier.price_jpy,
                                                          // THB: 取整数
                                                          price_thb: baseThb
                                                            ? Math.round(baseThb * multiplier)
                                                            : tier.price_thb,
                                                        };
                                                      },
                                                    );

                                                    setPriceTiers((prev) => ({
                                                      ...prev,
                                                      [sku.id]: newTiers,
                                                    }));
                                                    setIsDirty(true);
                                                  }}
                                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                  -{discount}%
                                                </button>
                                              ))}
                                            </div>
                                            <span className="text-xs text-blue-500">
                                              （每级递增5%）
                                            </span>
                                          </div>
                                          <p className="text-xs text-blue-500 mt-2">
                                            💡
                                            点击折扣率会自动计算所有币种的阶梯价格（USD/CNY/THB保留两位小数，JPY取整数）
                                          </p>
                                        </div>

                                        <div className="grid grid-cols-8 gap-2 text-xs font-bold text-slate-500 bg-white p-2 rounded border">
                                          <span>起订量</span>
                                          <span>截止量</span>
                                          <span className="text-blue-600">USD $</span>
                                          <span className="text-emerald-600">CNY ¥</span>
                                          <span className="text-purple-600">JPY ¥</span>
                                          <span className="text-amber-600">THB ฿</span>
                                          <span>折扣</span>
                                          <span>操作</span>
                                        </div>
                                        {priceTiers[sku.id].map((tier, idx) => {
                                          // 计算各币种的折扣
                                          const baseUsd = sku.selling_price_usd || sku.price || 0;
                                          const baseCny = sku.selling_price || 0;
                                          const baseJpy = sku.selling_price_jpy || 0;
                                          const baseThb = sku.selling_price_thb || 0;

                                          const discountUsd =
                                            baseUsd > 0 && tier.price_usd
                                              ? Math.round((1 - tier.price_usd / baseUsd) * 100)
                                              : 0;
                                          const discountCny =
                                            baseCny > 0 && tier.price_cny
                                              ? Math.round((1 - tier.price_cny / baseCny) * 100)
                                              : 0;
                                          const discountJpy =
                                            baseJpy > 0 && tier.price_jpy
                                              ? Math.round((1 - tier.price_jpy / baseJpy) * 100)
                                              : 0;
                                          const discountThb =
                                            baseThb > 0 && tier.price_thb
                                              ? Math.round((1 - tier.price_thb / baseThb) * 100)
                                              : 0;

                                          // 取第一个有值的折扣显示
                                          const discountPercent =
                                            discountUsd ||
                                            discountCny ||
                                            discountJpy ||
                                            discountThb ||
                                            0;

                                          return (
                                            <div
                                              key={tier.id}
                                              className="grid grid-cols-8 gap-2 text-xs bg-white p-2 rounded border border-slate-200"
                                            >
                                              <input
                                                type="number"
                                                min="1"
                                                value={tier.min_quantity}
                                                onChange={(e) =>
                                                  updatePriceTier(
                                                    sku.id,
                                                    tier.id,
                                                    'min_quantity',
                                                    parseInt(e.target.value) || 1,
                                                  )
                                                }
                                                className="px-2 py-1 border border-slate-300 rounded w-full"
                                              />
                                              <input
                                                type="number"
                                                min="1"
                                                value={tier.max_quantity || ''}
                                                onChange={(e) =>
                                                  updatePriceTier(
                                                    sku.id,
                                                    tier.id,
                                                    'max_quantity',
                                                    parseInt(e.target.value) || null,
                                                  )
                                                }
                                                className="px-2 py-1 border border-slate-300 rounded w-full"
                                                placeholder="∞"
                                              />
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={tier.price_usd || ''}
                                                  onChange={(e) =>
                                                    updatePriceTier(
                                                      sku.id,
                                                      tier.id,
                                                      'price_usd',
                                                      parseFloat(e.target.value) || 0,
                                                    )
                                                  }
                                                  className="px-2 py-1 border border-blue-200 rounded w-full"
                                                />
                                                {discountUsd > 0 && (
                                                  <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">
                                                    -{discountUsd}%
                                                  </span>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={tier.price_cny || ''}
                                                  onChange={(e) =>
                                                    updatePriceTier(
                                                      sku.id,
                                                      tier.id,
                                                      'price_cny',
                                                      parseFloat(e.target.value) || null,
                                                    )
                                                  }
                                                  className="px-2 py-1 border border-emerald-200 rounded w-full"
                                                />
                                                {discountCny > 0 && (
                                                  <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">
                                                    -{discountCny}%
                                                  </span>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  value={tier.price_jpy || ''}
                                                  onChange={(e) =>
                                                    updatePriceTier(
                                                      sku.id,
                                                      tier.id,
                                                      'price_jpy',
                                                      parseInt(e.target.value) || null,
                                                    )
                                                  }
                                                  className="px-2 py-1 border border-purple-200 rounded w-full"
                                                  placeholder="整数"
                                                />
                                                {discountJpy > 0 && (
                                                  <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">
                                                    -{discountJpy}%
                                                  </span>
                                                )}
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  value={tier.price_thb || ''}
                                                  onChange={(e) =>
                                                    updatePriceTier(
                                                      sku.id,
                                                      tier.id,
                                                      'price_thb',
                                                      parseInt(e.target.value) || null,
                                                    )
                                                  }
                                                  className="px-2 py-1 border border-amber-200 rounded w-full"
                                                  placeholder="整数"
                                                />
                                                {discountThb > 0 && (
                                                  <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-1 rounded">
                                                    -{discountThb}%
                                                  </span>
                                                )}
                                              </div>
                                              <span
                                                className={`px-2 py-1 text-center font-bold rounded ${
                                                  discountPercent > 0
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'text-slate-400'
                                                }`}
                                              >
                                                {discountPercent > 0 ? `-${discountPercent}%` : '-'}
                                              </span>
                                              <button
                                                onClick={() => removePriceTier(sku.id, tier.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                        <button
                                          onClick={() => savePriceTiers(sku.id)}
                                          className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                                        >
                                          保存阶梯价格
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400">
                                        暂无阶梯价格设置。点击"添加阶梯"设置批量折扣价格。
                                      </p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-2">
                                      💡
                                      设置不同数量的批发价格，例如：1-9件原价，10-49件95折，50+件9折
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 mb-3">暂无 SKU 数据</p>
                </div>
              )}

              {/* 批量定价工具 */}
              {productSkus.length > 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                  <h6 className="text-sm font-bold text-slate-700 mb-3">批量定价工具</h6>
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">按供货价倍数设置</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          defaultValue="1.5"
                          id="priceMultiplier"
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-sm text-slate-500">倍</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">目标币种</label>
                      <select id="targetCurrency" className="px-2 py-1 border rounded text-sm">
                        <option value="cny">CNY 人民币</option>
                        <option value="usd">USD 美元</option>
                        <option value="jpy">JPY 日元</option>
                        <option value="thb">THB 泰铢</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const multiplier = parseFloat(
                          (document.getElementById('priceMultiplier') as HTMLInputElement)?.value ||
                            '1.5',
                        );
                        const currency =
                          (document.getElementById('targetCurrency') as HTMLSelectElement)?.value ||
                          'cny';
                        const fieldMap: Record<string, string> = {
                          cny: 'selling_price',
                          usd: 'selling_price_usd',
                          jpy: 'selling_price_jpy',
                          thb: 'selling_price_thb',
                        };
                        const field = fieldMap[currency];
                        const updatedSkus = productSkus.map((s: any) => ({
                          ...s,
                          [field]: Math.round(s.price * multiplier * 100) / 100,
                        }));
                        setProductSkus(updatedSkus);
                        setIsDirty(true);
                        success(`已按供货价的 ${multiplier} 倍设置${currency.toUpperCase()}销售价`);
                      }}
                      className="px-4 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700"
                    >
                      批量应用
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">提示：销售价 = 供货价 × 倍数</p>
                </div>
              )}
            </div>

            {/* 保存提示 */}
            {variantAttributes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  💡 <strong>提示：</strong>变体维度决定客户怎么选，SKU 列表决定每个组合怎么卖。所有
                  SKU 共用的参数请放到“产品公共参数”页。
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Section 5: 产品公共参数 */}
      {activeTab === 'specs' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">⚙️</span> 产品公共参数
          </h4>
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 space-y-2">
              <p>
                这里填写所有 SKU 共用的产品事实参数，例如材质、灭菌方式、适用动物、功率、包装规格。
              </p>
              <p>
                不要把颜色、尺寸、型号、长度这类会让客户选择并影响价格或库存的内容写在这里；这些应放到“变体维度与
                SKU”页。
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                产品公共参数 (JSON 格式) (
                {editLang === getPublishLang() ? `${editLang} - 源` : editLang})
              </label>
              <textarea
                value={JSON.stringify(getLocalizedJsonValue('specifications') || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const specifications = JSON.parse(e.target.value);
                    setLocalizedJsonValue('specifications', specifications);
                  } catch {
                    return;
                  }
                }}
                rows={10}
                className="w-full min-h-[200px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm font-mono text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50"
                placeholder={`{\n  "material": "医用级不锈钢",\n  "sterilization": "高温高压",\n  "package_spec": "10支/盒"\n}`}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Section 6: SEO 优化 */}
      {activeTab === 'seo' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">🔍</span> SEO 优化与 FAQ
          </h4>
          <div className="space-y-6">
            {/* SEO 字段 */}
            <div className="space-y-4">
              <h5 className="text-sm font-bold text-slate-900">SEO 元数据</h5>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  核心关键词 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                </label>
                <input
                  type="text"
                  value={getLocalizedValue('focus_keyword')}
                  onChange={(e) => setLocalizedValue('focus_keyword', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                  placeholder="例如：兽用手术器械，宠物医疗耗材"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Meta 标题 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                </label>
                <input
                  type="text"
                  value={getLocalizedValue('meta_title')}
                  onChange={(e) => setLocalizedValue('meta_title', e.target.value)}
                  maxLength={60}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none disabled:opacity-50"
                  placeholder="搜索引擎结果中显示的标题"
                />
                <p className="mt-1 text-xs text-slate-500">
                  建议长度：50-60 个字符，当前长度：{(getLocalizedValue('meta_title') || '').length}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Meta 描述 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                </label>
                <textarea
                  value={getLocalizedValue('meta_description')}
                  onChange={(e) => setLocalizedValue('meta_description', e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none disabled:opacity-50"
                  placeholder="搜索引擎结果中显示的产品描述"
                />
                <p className="mt-1 text-xs text-slate-500">
                  建议长度：150-160 个字符，当前长度：
                  {(getLocalizedValue('meta_description') || '').length}
                </p>
              </div>
            </div>

            {/* FAQ 字段 */}
            <div className="border-t pt-6">
              <h5 className="text-sm font-bold text-slate-900 mb-4">
                FAQ 常见问题 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
              </h5>
              <div className="space-y-3">
                {(getLocalizedJsonValue('faq') || []).map((faqItem: any, idx: number) => (
                  <div key={idx} className="border rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-900">问题 {idx + 1}</span>
                      <button
                        onClick={() => {
                          const currentFaq = getLocalizedJsonValue('faq') || [];
                          const newFaq = currentFaq.filter((_: any, i: number) => i !== idx);
                          setLocalizedJsonValue('faq', newFaq);
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">问题</label>
                        <input
                          type="text"
                          value={faqItem.question || ''}
                          onChange={(e) => {
                            const currentFaq = getLocalizedJsonValue('faq') || [];
                            const newFaq = [...currentFaq];
                            newFaq[idx] = { ...newFaq[idx], question: e.target.value };
                            setLocalizedJsonValue('faq', newFaq);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          placeholder="客户可能会问的问题"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">回答</label>
                        <textarea
                          value={faqItem.answer || ''}
                          onChange={(e) => {
                            const currentFaq = getLocalizedJsonValue('faq') || [];
                            const newFaq = [...currentFaq];
                            newFaq[idx] = { ...newFaq[idx], answer: e.target.value };
                            setLocalizedJsonValue('faq', newFaq);
                          }}
                          rows={3}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          placeholder="详细、专业的回答"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const currentFaq = getLocalizedJsonValue('faq') || [];
                  setLocalizedJsonValue('faq', [...currentFaq, { question: '', answer: '' }]);
                }}
                className="mt-3 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                + 添加 FAQ
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Section 4: 发布管理 */}
      {activeTab === 'publish' && (
        <Card>
          <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">🌐</span> 发布管理
          </h4>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">站点发布状态</h3>
              <div className="space-y-3">
                {[
                  { code: 'cn', label: '中国站 (CN)', desc: 'vetsphere.cn' },
                  { code: 'intl', label: '国际站 (INTL)', desc: 'vetsphere.net' },
                ]
                  .filter((site) => isGLOBAL || site.code === currentSite)
                  .map((site) => {
                    const isPublished = product.site_views?.some(
                      (sv: any) => sv.site_code === site.code && sv.publish_status === 'published',
                    );
                    return (
                      <div
                        key={site.code}
                        className="flex items-center justify-between p-4 border rounded-xl"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{site.label}</p>
                          <p className="text-sm text-slate-500">{site.desc}</p>
                          {isPublished && (
                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                              已发布
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!isPublished ? (
                            <button
                              onClick={() => {
                                setSelectedSites([site.code]);
                                handleSaveAndPublish();
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              发布
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOfflineFromSite(site.code)}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-slate-500 text-white hover:bg-slate-600"
                            >
                              下架
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            {(product.approved_at || product.rejection_reason || product.published_at) && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-bold text-slate-900 mb-3">审核信息</h4>
                <div className="space-y-2 text-sm">
                  {product.approved_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">批准时间:</span>
                      <span className="text-slate-900">
                        {new Date(product.approved_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {product.rejection_reason && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">拒绝原因:</span>
                      <span className="text-red-600">{product.rejection_reason}</span>
                    </div>
                  )}
                  {product.published_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">发布时间:</span>
                      <span className="text-slate-900">
                        {new Date(product.published_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 离开确认对话框 */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={saving ? undefined : handleStayOnPage}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">当前页面尚未保存</h3>
                <p className="text-sm text-slate-500">
                  检测到未保存的修改。您可以先保存再{leaveTargetLabel}，也可以直接
                  {leaveTargetLabel.toLowerCase()}并放弃这些修改。
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="secondary" onClick={handleStayOnPage} disabled={saving}>
                取消
              </Button>
              <button
                type="button"
                onClick={handleLeaveWithoutSave}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                直接{pendingLeaveAction?.type === 'refresh' ? '刷新' : '离开'}
              </button>
              <Button onClick={handleSaveAndLeave} loading={saving}>
                保存并{pendingLeaveAction?.type === 'refresh' ? '刷新' : '离开'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 上架站点选择弹窗 */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">保存并上架产品</h3>
            <p className="text-sm text-slate-500 mb-5">
              请选择要上架的站点，产品将保存并发布到所选站点。
            </p>
            <div className="space-y-3 mb-6">
              {[
                { code: 'cn', label: '中国站 (CN)', desc: '面向中国大陆用户' },
                { code: 'intl', label: '国际站 (INTL)', desc: '面向海外用户' },
              ]
                .filter((site) => isGLOBAL || site.code === currentSite)
                .map((site) => (
                  <label
                    key={site.code}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedSites.includes(site.code)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site.code)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSites((prev) => [...prev, site.code]);
                        else setSelectedSites((prev) => prev.filter((s) => s !== site.code));
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{site.label}</div>
                      <div className="text-xs text-slate-500">{site.desc}</div>
                    </div>
                  </label>
                ))}
            </div>
            {saveError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {saveError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPublishDialog(false);
                  setSaveError(null);
                }}
                disabled={publishing}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveAndPublish}
                disabled={publishing || selectedSites.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? '上架中...' : `确认上架 (${selectedSites.length} 个站点)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 通知容器 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* 保存确认对话框 - 已发布产品修改确认 */}
      <ConfirmDialog
        open={showSaveConfirmDialog}
        title="确认修改已发布产品"
        message={`此产品已在 ${getPublishedSiteNames()} 上架，您的修改将直接影响商城中在售的商品内容。确定要保存修改吗？`}
        confirmText="确认保存"
        cancelText="取消"
        variant="warning"
        onConfirm={performSave}
        onCancel={() => setShowSaveConfirmDialog(false)}
        loading={saving}
      />

      {/* AI 翻译进度弹框 */}
      {showTranslateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              {/* 动态图标 */}
              <div className="w-16 h-16 mx-auto mb-4 relative">
                {translateProgress >= 100 ? (
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : translateError ? (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                )}
              </div>

              {/* 标题 */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {translateError
                  ? '翻译失败'
                  : translateProgress >= 100
                    ? '翻译完成'
                    : 'AI 智能翻译中'}
              </h3>

              {/* 当前步骤 */}
              {!translateError && translateProgress < 100 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-3">
                    {translateSteps.find((s) => s.step === translateStep)?.text || '处理中...'}
                  </p>

                  {/* 进度条 */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${translateProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">{Math.round(translateProgress)}%</p>
                </div>
              )}

              {/* 完成状态 */}
              {translateProgress >= 100 && !translateError && (
                <div className="text-left bg-emerald-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-emerald-700 font-medium mb-2">已完成翻译：</p>
                  <div className="flex flex-wrap gap-2">
                    {translateTargetLangs.map((t) => (
                      <span
                        key={t.code}
                        className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full"
                      >
                        ✓ {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 错误状态 */}
              {translateError && (
                <div className="text-left bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-600">{translateError}</p>
                </div>
              )}

              {/* 翻译说明 */}
              {translateProgress < 100 && !translateError && (
                <p className="text-xs text-slate-400">
                  正在使用通义千问 AI 进行多语言翻译，请稍候...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
