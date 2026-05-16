'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { getImageUrl, getAccessTokenSafe } from '../../services/supabase';
import { translateSpecs } from '../../lib/spec-translations';
import { getLocaleCurrency, formatPrice } from '../../lib/currency';
import {
  getIntlProductBySlug,
  getIntlProductImages,
  getIntlProductCourses,
  getIntlRelatedProducts,
  getIntlProductSkus,
  getIntlProductVariantAttributes,
  submitIntlLead,
  IntlProduct,
  IntlCourse,
  IntlProductSku,
} from '../../services/intl-api';
import SkuSelector from '../../components/intl/SkuSelector';
import PriceTierDisplay from '../../components/intl/PriceTierDisplay';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  GraduationCap,
  Wrench,
  ChevronRight,
  Star,
  MessageSquareQuote,
  ShoppingCart,
  CheckCircle2,
  Send,
  X,
  Check,
  Heart,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';

interface IntlProductDetailClientProps {
  productSlug: string;
}

const HTML_CONTENT_PATTERN =
  /<(p|div|img|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|figure|figcaption|iframe|br|strong|em|span|a)\b[^>]*>/i;

function normalizeRichDescription(content: string) {
  return content
    .replace(
      /src="\/uploads\//g,
      'src="https://tvxrgbntiksskywsroax.supabase.co/storage/v1/object/public/uploads/',
    )
    .replace(/<p>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '');
}

// ============================================
// Component
// ============================================

export default function IntlProductDetailClient({ productSlug }: IntlProductDetailClientProps) {
  const { locale, t } = useLanguage();
  const { addToCart } = useCart();
  const currency = getLocaleCurrency(locale);
  const pd = t.productDetail;

  const [product, setProduct] = useState<IntlProduct | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<IntlCourse[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<IntlProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  // SKU state
  const [skus, setSkus] = useState<IntlProductSku[]>([]);
  const [variantAttributes, setVariantAttributes] = useState<{ name: string; values: string[] }[]>(
    [],
  );
  const [selectedSku, setSelectedSku] = useState<IntlProductSku | null>(null);

  // Quote modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ name: '', email: '', clinic: '', message: '' });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  // Add to cart state
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tierPrice, setTierPrice] = useState<number | null>(null); // 阶梯价格（根据数量计算）
  const shouldSyncToSelectedSkuImage = useRef(false);

  // Use global wishlist context for persistent state
  const { isInWishlist: globalIsInWishlist, toggleWishlist: globalToggleWishlist } = useWishlist();
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Determine if current product is in wishlist (computed from global state)
  const isInWishlist = product?.product_id ? globalIsInWishlist(product.product_id) : false;

  // Handle wishlist toggle - uses global context
  const handleToggleWishlist = async () => {
    if (!product?.product_id) return;

    const token = await getAccessTokenSafe();
    if (!token) {
      window.location.href = `/${locale}/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setWishlistLoading(true);
    try {
      await globalToggleWishlist(product.product_id, 'product');
    } catch (error) {
      console.error('Wishlist error:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Memoized values - must be before conditional returns per React Rules of Hooks
  // Translate specs to current locale
  const translatedSpecs = useMemo(() => {
    if (!product?.specs || Object.keys(product.specs).length === 0) return {};
    return translateSpecs(product.specs, locale);
  }, [product?.specs, locale]);

  // Localized rich description (HTML with images from Admin)
  const localizedRichDescription = useMemo(() => {
    if (!product) return null;
    return product.rich_description;
  }, [product]);

  useEffect(() => {
    let isCancelled = false;

    setLoading(true);
    setActiveImage(0);
    setShowImageLightbox(false);
    shouldSyncToSelectedSkuImage.current = false;

    getIntlProductBySlug(productSlug, locale)
      .then((data) => {
        if (isCancelled) return;

        setProduct(data);

        if (!data) {
          setImages([]);
          setRelatedCourses([]);
          setRelatedProducts([]);
          setSkus([]);
          setVariantAttributes([]);
          setSelectedSku(null);
          setLoading(false);
          return;
        }

        Promise.all([
          getIntlProductImages(data.product_id),
          getIntlProductCourses(data.product_id),
          getIntlRelatedProducts(data.product_id, data.scene_code),
          getIntlProductSkus(data.product_id),
          getIntlProductVariantAttributes(data.product_id),
        ]).then(([imgs, courses, related, productSkus, variantAttrs]) => {
          if (isCancelled) return;

          setImages(imgs);
          setRelatedCourses(courses);
          setRelatedProducts(related);
          setSkus(productSkus);
          setVariantAttributes(variantAttrs);
          setSelectedSku(productSkus.length > 0 ? productSkus[0] : null);
          setActiveImage(0);
          setLoading(false);
        });
      })
      .catch(() => {
        if (isCancelled) return;

        setProduct(null);
        setImages([]);
        setRelatedCourses([]);
        setRelatedProducts([]);
        setSkus([]);
        setVariantAttributes([]);
        setSelectedSku(null);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [locale, productSlug]);

  // Quote form handlers
  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setQuoteSubmitting(true);
    const result = await submitIntlLead({
      lead_type: 'quote_request',
      contact_name: quoteForm.name,
      email: quoteForm.email,
      clinic_name: quoteForm.clinic,
      requirement_text: quoteForm.message,
      source_page: `product/${productSlug}`,
      source_product_id: product.product_id,
    });
    setQuoteSubmitting(false);
    if (result.success) {
      setQuoteSuccess(true);
    }
  };

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);

    try {
      // Get price: use tier price if available, otherwise use SKU price
      let price = 0;
      if (tierPrice !== null && tierPrice > 0) {
        // 使用阶梯价格（根据数量和货币计算后的价格）
        price = tierPrice;
      } else if (selectedSku) {
        // 没有阶梯价格时使用 SKU 销售价（根据货币选择）
        // 注意：不要 fallback 到 price（采购价），只使用销售价
        switch (currency.toUpperCase()) {
          case 'CNY':
            price = selectedSku.selling_price || selectedSku.selling_price_usd || 0;
            break;
          case 'JPY':
            price = selectedSku.selling_price_jpy || selectedSku.selling_price_usd || 0;
            break;
          case 'THB':
            price = selectedSku.selling_price_thb || selectedSku.selling_price_usd || 0;
            break;
          default:
            price = selectedSku.selling_price_usd || selectedSku.selling_price || 0;
        }
      } else {
        // 没有 SKU 时使用产品价格（这些字段应该是销售价）
        price = product.display_price || product.price_min || 0;
      }

      // Get image URL
      const imageUrl =
        selectedSku?.image_url || (images.length > 0 ? getImageUrl(images[0].url) : null);

      // Create cart item
      const cartItem = {
        id: selectedSku ? `${product.product_id}_${selectedSku.id}` : product.product_id,
        productId: product.product_id,
        skuId: selectedSku?.id,
        name: product.display_name || product.base_name,
        price,
        currency,
        type: 'product' as const,
        imageUrl: imageUrl || '',
        quantity,
        skuCode: selectedSku?.sku_code,
        attributeCombination: selectedSku?.attribute_combination,
        supplierId: product.supplier_id,
        supplierName: product.supplier_name,
        weight: product.weight || undefined,
        weightUnit: (product.weight_unit as 'g' | 'kg' | 'lb') || 'kg',
        minOrderQuantity: 1,
      };

      await addToCart(cartItem);
      setAddedToCart(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setAddedToCart(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  // Check if URL has ?action=quote
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'quote') {
        setShowQuoteModal(true);
      }
    }
  }, []);

  // Determine pricing mode: inquiry products require quote request
  const isInquiryMode = product?.pricing_mode === 'inquiry' || product?.purchase_type === 'quote';
  const isFixedMode = product?.pricing_mode === 'fixed' && !isInquiryMode;
  void isFixedMode;

  // All images: cover + product_images (with full URLs)
  const allImages = useMemo(() => {
    const productDisplayName = product?.display_name || '';
    const galleryImages =
      images.length > 0
        ? images.map((img) => ({ ...img, url: getImageUrl(img.url) }))
        : [
            ...(selectedSku?.image_url
              ? [{ url: getImageUrl(selectedSku.image_url), alt_text: productDisplayName }]
              : []),
            ...(product?.cover_image_url
              ? [{ url: getImageUrl(product.cover_image_url), alt_text: productDisplayName }]
              : []),
          ];

    const merged = galleryImages.filter((image): image is { url: string; alt_text?: string } =>
      Boolean(image?.url),
    );

    const seenUrls = new Set<string>();
    return merged.filter((image) => {
      if (seenUrls.has(image.url)) {
        return false;
      }

      seenUrls.add(image.url);
      return true;
    });
  }, [images, product?.cover_image_url, product?.display_name, selectedSku?.image_url]);

  useEffect(() => {
    if (allImages.length === 0) {
      if (activeImage !== 0) {
        setActiveImage(0);
      }
      return;
    }

    if (activeImage >= allImages.length) {
      setActiveImage(0);
    }
  }, [activeImage, allImages.length]);

  useEffect(() => {
    if (
      !shouldSyncToSelectedSkuImage.current ||
      !selectedSku?.image_url ||
      allImages.length === 0
    ) {
      return;
    }

    const preferredSkuImage = getImageUrl(selectedSku.image_url);
    const preferredIndex = allImages.findIndex((image) => image.url === preferredSkuImage);
    shouldSyncToSelectedSkuImage.current = false;

    if (preferredIndex >= 0) {
      setActiveImage(preferredIndex);
    }
  }, [allImages, selectedSku?.image_url]);

  useEffect(() => {
    if (!showImageLightbox || allImages.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowImageLightbox(false);
        return;
      }

      if (allImages.length <= 1) return;

      if (event.key === 'ArrowLeft') {
        setActiveImage((prev) => (prev - 1 + allImages.length) % allImages.length);
      }

      if (event.key === 'ArrowRight') {
        setActiveImage((prev) => (prev + 1) % allImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, showImageLightbox]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-32 pb-16">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-slate-100 rounded w-48" />
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-slate-100 rounded-3xl" />
            <div className="space-y-4">
              <div className="h-10 bg-slate-100 rounded w-3/4" />
              <div className="h-6 bg-slate-100 rounded w-1/2" />
              <div className="h-40 bg-slate-100 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-32 pb-16 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-slate-700 mb-4">{pd.notFound}</h1>
        <p className="text-slate-500 mb-8">{pd.notFoundDesc}</p>
        <Link
          href={`/${locale}/shop`}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition"
        >
          {pd.browseAll}
        </Link>
      </div>
    );
  }

  // Compute price display based on pricing_mode and selling_price
  // 价格显示逻辑：
  // 1. 询价模式（pricing_mode === 'inquiry'）→ 显示询价按钮
  // 2. 有销售价 → 显示价格
  // 3. 无销售价 → 显示询价按钮
  const priceDisplay = (() => {
    // Inquiry mode: no price shown
    if (isInquiryMode) {
      return null;
    }

    // 根据语言获取对应币种的销售价
    const getSellingPrice = (sku: IntlProductSku | null) => {
      if (!sku) return null;
      switch (locale) {
        case 'en':
          return sku.selling_price_usd;
        case 'ja':
          return sku.selling_price_jpy;
        case 'th':
          return sku.selling_price_thb;
        default:
          return sku.selling_price;
      }
    };

    // 检查是否有任何SKU有销售价
    const hasSellingPrice = skus.some((sku) => {
      const price = getSellingPrice(sku);
      return price !== null && price !== undefined;
    });

    // 如果没有销售价，返回 null（显示询价按钮）
    if (!hasSellingPrice && skus.length > 0) {
      return null;
    }

    // 如果有选中的SKU，显示其价格
    if (selectedSku) {
      const price = getSellingPrice(selectedSku);
      // 价格必须 > 0 才算有效
      if (price !== null && price !== undefined && price > 0) {
        const currencySymbols: Record<string, string> = {
          en: '$',
          ja: '¥',
          th: '฿',
          zh: '¥',
        };
        const sym = currencySymbols[locale] || '$';
        return `${sym}${price.toLocaleString()}`;
      }
      // 选中的 SKU 没有有效价格，返回 null（显示询价）
      return null;
    }

    // 没有选中 SKU 时，显示价格区间（只显示有效价格 > 0）
    const prices = skus
      .map((sku) => getSellingPrice(sku))
      .filter((p): p is number => p !== null && p !== undefined && p > 0);

    if (prices.length === 0) {
      return null; // 无有效销售价，显示询价
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const currencySymbols: Record<string, string> = {
      en: '$',
      ja: '¥',
      th: '฿',
      zh: '¥',
    };
    const sym = currencySymbols[locale] || '$';

    if (minPrice === maxPrice) {
      return `${sym}${minPrice.toLocaleString()}`;
    }
    return `${sym}${minPrice.toLocaleString()} - ${sym}${maxPrice.toLocaleString()}`;
  })();

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-28 pb-4">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/${locale}`} className="hover:text-emerald-600 transition">
            {pd.home}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/${locale}/shop`} className="hover:text-emerald-600 transition">
            {pd.equipment}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-600 font-medium truncate max-w-[300px]">
            {product.display_name}
          </span>
        </nav>
      </div>

      {/* Product Detail Grid */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pb-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="relative aspect-square w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-sm cursor-zoom-in"
              onClick={() => allImages.length > 0 && setShowImageLightbox(true)}
            >
              {allImages.length > 0 ? (
                <>
                  <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowImageLightbox(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      Zoom
                    </button>
                    <a
                      href={allImages[activeImage]?.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Original
                    </a>
                  </div>
                  <div className="absolute inset-0 p-5 sm:p-8">
                    <div className="relative h-full w-full">
                      <Image
                        src={allImages[activeImage]?.url}
                        alt={allImages[activeImage]?.alt_text || product.display_name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 720px"
                        className="object-contain"
                        priority
                        quality={85}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-slate-200" />
                </div>
              )}
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {product.is_featured && (
                  <span className="px-3 py-1.5 bg-amber-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> {pd.featured}
                  </span>
                )}
                {product.display_tags.slice(0, 2).map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {isInquiryMode && (
                <div className="absolute bottom-4 right-4 bg-amber-50/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-amber-700 border border-amber-100 flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4" /> {pd.quoteOnly}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white p-2 shadow-sm transition ${
                      activeImage === idx
                        ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={img.url}
                        alt={img.alt_text || ''}
                        fill
                        sizes="80px"
                        className="object-contain"
                        loading="lazy"
                        quality={75}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {product.brand && (
              <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                {product.brand}
              </span>
            )}
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {product.display_name}
            </h1>
            {product.summary && (
              <p className="text-lg text-slate-500 leading-relaxed">{product.summary}</p>
            )}

            {/* Price */}
            <div className="pt-2">
              {priceDisplay ? (
                <div className="text-3xl font-extrabold text-slate-900">{priceDisplay}</div>
              ) : (
                <div className="text-lg font-bold text-amber-600">{pd.contactForPricing}</div>
              )}
            </div>

            {/* SKU Selector */}
            {variantAttributes.length > 0 && (
              <div className="py-4">
                <SkuSelector
                  variantAttributes={variantAttributes}
                  skus={skus}
                  selectedSku={selectedSku}
                  onSkuSelect={(sku) => {
                    shouldSyncToSelectedSkuImage.current = true;
                    setSelectedSku(sku);
                  }}
                  locale={locale}
                />
              </div>
            )}

            {/* Price Tier Display (B2B Wholesale) - with quantity selector and total calculation */}
            {selectedSku && priceDisplay && !isInquiryMode && (
              <div className="py-4 border-t border-slate-200">
                <PriceTierDisplay
                  skuId={selectedSku.id}
                  currency={currency.toUpperCase()}
                  basePrice={selectedSku.selling_price_usd || selectedSku.price || 0}
                  onQuantityChange={(qty) => setQuantity(qty)}
                />
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-4">
              {/* Wishlist button - always show */}
              <button
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base transition-all ${
                  isInWishlist
                    ? 'bg-red-50 text-red-500 border border-red-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                }`}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                {isInWishlist ? pd.inWishlist : pd.addToWishlist}
              </button>

              {isInquiryMode || !priceDisplay ? (
                <>
                  <button
                    onClick={() => setShowQuoteModal(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
                  >
                    <MessageSquareQuote className="w-5 h-5" /> {pd.requestQuote}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-emerald-900/10 ${
                      addedToCart
                        ? 'bg-green-500 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {addedToCart ? (
                      <>
                        <Check className="w-5 h-5" /> {pd.addedToCart}
                      </>
                    ) : addingToCart ? (
                      <>
                        <ShoppingCart className="w-5 h-5 animate-pulse" /> {pd.addingToCart}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" /> {pd.addToCart}
                      </>
                    )}
                  </button>
                  {addedToCart && (
                    <Link
                      href={`/${locale}/cart`}
                      className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-500 transition-all"
                    >
                      {pd.viewCart} <ArrowRight className="w-5 h-5" />
                    </Link>
                  )}
                  <button
                    onClick={() => setShowQuoteModal(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition"
                  >
                    <MessageSquareQuote className="w-5 h-5" /> {pd.requestQuoteShort}
                  </button>
                </>
              )}
            </div>

            {/* Recommendation Reason */}
            {product.recommendation_reason && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 font-medium">
                  {product.recommendation_reason}
                </p>
              </div>
            )}

            {/* Specs */}
            {translatedSpecs && Object.keys(translatedSpecs).length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <h3 className="px-6 py-4 bg-slate-50 text-sm font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  {pd.specifications}
                </h3>
                <div className="divide-y divide-slate-100">
                  {Object.entries(translatedSpecs).map(([key, value]) => (
                    <div key={key} className="flex px-6 py-3">
                      <span className="w-1/3 text-sm text-slate-500 font-medium">{key}</span>
                      <span className="w-2/3 text-sm text-slate-900 font-medium">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {(product.description || localizedRichDescription) && (
              <div className="prose prose-slate max-w-none">
                <h3 className="text-lg font-bold text-slate-900 mb-3">{pd.productDetails}</h3>
                {(() => {
                  const content = (localizedRichDescription || product.description || '').trim();
                  const isHtml = HTML_CONTENT_PATTERN.test(content);

                  if (isHtml) {
                    const normalizedContent = normalizeRichDescription(content);
                    return (
                      <div className="overflow-x-auto">
                        <div
                          className="text-slate-600 leading-relaxed [&_table]:min-w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-200 [&_table]:rounded-xl [&_thead]:bg-slate-50 [&_th]:border [&_th]:border-slate-200 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-slate-200 [&_td]:px-4 [&_td]:py-3 [&_p]:leading-7 [&_img]:rounded-xl"
                          dangerouslySetInnerHTML={{ __html: normalizedContent }}
                        />
                      </div>
                    );
                  }

                  // Plain text
                  return (
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{content}</p>
                  );
                })()}
              </div>
            )}

            {/* Meta Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {product.specialty && (
                <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                  {product.specialty}
                </span>
              )}
              {product.clinical_category && (
                <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                  {product.clinical_category}
                </span>
              )}
              {product.scene_code && (
                <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                  {product.scene_code}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showImageLightbox && allImages.length > 0 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/92 p-4 sm:p-6"
          onClick={() => setShowImageLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setShowImageLightbox(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          {allImages.length > 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveImage((prev) => (prev - 1 + allImages.length) % allImages.length);
              }}
              className="absolute left-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Previous image"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div
            className="flex w-full max-w-6xl flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex max-h-[80vh] w-full items-center justify-center overflow-hidden rounded-3xl bg-white/5 p-4 sm:p-8">
              <img
                src={allImages[activeImage]?.url}
                alt={allImages[activeImage]?.alt_text || product.display_name}
                className="max-h-[72vh] max-w-full object-contain"
              />
            </div>
            <div className="flex w-full items-center justify-between gap-4 text-white">
              <div>
                <p className="text-sm font-medium">{product.display_name}</p>
                <p className="text-xs text-slate-300">
                  {activeImage + 1} / {allImages.length}
                </p>
              </div>
              <a
                href={allImages[activeImage]?.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                <ExternalLink className="h-4 w-4" />
                Open original
              </a>
            </div>
          </div>
          {allImages.length > 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveImage((prev) => (prev + 1) % allImages.length);
              }}
              className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Next image"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ============================================ */}
      {/* RELATED TRAINING SECTION */}
      {/* ============================================ */}
      {relatedCourses.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-100 py-16">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{pd.relatedTraining}</h2>
                <p className="text-sm text-slate-500">{pd.relatedTrainingDesc}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/${locale}/courses/${course.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="h-40 overflow-hidden bg-slate-100 relative">
                    {course.cover_image_url ? (
                      <img
                        src={getImageUrl(course.cover_image_url)}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-12 h-12 text-slate-200" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {course.specialty && (
                        <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                          {course.specialty}
                        </span>
                      )}
                      {course.level && (
                        <span className="px-2.5 py-1 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm">
                          {course.level}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">
                      {course.title}
                    </h3>
                    {course.summary && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.summary}</p>
                    )}
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                      {pd.viewTraining} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RELATED PRODUCTS SECTION */}
      {relatedProducts.length > 0 && (
        <div className="py-16 border-t border-slate-100">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{pd.similarEquipment}</h2>
                <p className="text-sm text-slate-500">{pd.similarEquipmentDesc}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/${locale}/shop/${rp.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="aspect-square overflow-hidden bg-slate-50">
                    {rp.cover_image_url ? (
                      <img
                        src={getImageUrl(rp.cover_image_url)}
                        alt={rp.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-slate-200" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {rp.brand && (
                      <span className="text-xs text-slate-400 font-bold uppercase">{rp.brand}</span>
                    )}
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 text-sm mt-1">
                      {rp.display_name}
                    </h4>
                    <div className="mt-2 flex items-center justify-between">
                      {rp.display_price ? (
                        <span className="text-sm font-bold text-slate-900">
                          ${rp.display_price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{pd.contact}</span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pb-16">
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> {pd.backToAll}
        </Link>
      </div>

      {/* ============================================ */}
      {/* QUOTE REQUEST MODAL */}
      {/* ============================================ */}
      {showQuoteModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQuoteModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">{pd.quoteModalTitle}</h2>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {quoteSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">{pd.quoteSubmitted}</h3>
                <p className="text-slate-500 mb-6">{pd.quoteSubmittedDesc}</p>
                <button
                  onClick={() => {
                    setShowQuoteModal(false);
                    setQuoteSuccess(false);
                    setQuoteForm({ name: '', email: '', clinic: '', message: '' });
                  }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition"
                >
                  {pd.done}
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                  {product.cover_image_url && (
                    <img
                      src={product.cover_image_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-sm line-clamp-1">
                      {product.display_name}
                    </p>
                    {product.brand && <p className="text-xs text-slate-400">{product.brand}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {pd.yourName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteForm.name}
                    onChange={(e) => setQuoteForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {pd.email} *
                  </label>
                  <input
                    type="email"
                    required
                    value={quoteForm.email}
                    onChange={(e) => setQuoteForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {pd.clinicName}
                  </label>
                  <input
                    type="text"
                    value={quoteForm.clinic}
                    onChange={(e) => setQuoteForm((f) => ({ ...f, clinic: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {pd.messageRequirements}
                  </label>
                  <textarea
                    rows={3}
                    value={quoteForm.message}
                    onChange={(e) => setQuoteForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder={pd.messagePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={quoteSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quoteSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> {pd.submitQuoteRequest}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
