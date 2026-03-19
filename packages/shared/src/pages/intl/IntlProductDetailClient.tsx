'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import {
  getIntlProductBySlug,
  getIntlProductImages,
  getIntlProductCourses,
  getIntlRelatedProducts,
  submitIntlLead,
  IntlProduct,
  IntlCourse,
} from '../../services/intl-api';
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
} from 'lucide-react';

interface IntlProductDetailClientProps {
  productSlug: string;
}

// ============================================
// Component
// ============================================

export default function IntlProductDetailClient({ productSlug }: IntlProductDetailClientProps) {
  const { locale } = useLanguage();

  const [product, setProduct] = useState<IntlProduct | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<IntlCourse[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<IntlProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Quote modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ name: '', email: '', clinic: '', message: '' });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  useEffect(() => {
    getIntlProductBySlug(productSlug).then(data => {
      setProduct(data);
      setLoading(false);
      if (data) {
        Promise.all([
          getIntlProductImages(data.product_id),
          getIntlProductCourses(data.product_id),
          getIntlRelatedProducts(data.product_id, data.scene_code),
        ]).then(([imgs, courses, related]) => {
          setImages(imgs);
          setRelatedCourses(courses);
          setRelatedProducts(related);
        });
      }
    });
  }, [productSlug]);

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
        <h1 className="text-2xl font-bold text-slate-700 mb-4">Product Not Found</h1>
        <p className="text-slate-500 mb-8">This product may no longer be available.</p>
        <Link href={`/${locale}/shop`} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition">
          Browse All Equipment
        </Link>
      </div>
    );
  }

  // Compute price display based on pricing_mode
  const priceDisplay = (() => {
    // Inquiry mode: no price shown
    if (isInquiryMode) {
      return null;
    }
    // Fixed mode: show price
    if (product.display_price) {
      const sym = product.currency_code === 'USD' ? '$' : product.currency_code === 'EUR' ? '€' : product.currency_code === 'GBP' ? '£' : product.currency_code || '$';
      return `${sym}${product.display_price.toLocaleString()}`;
    }
    if (product.price_min && product.price_max && product.price_min !== product.price_max) {
      return `$${product.price_min.toLocaleString()} - $${product.price_max.toLocaleString()}`;
    }
    if (product.price_min) return `From $${product.price_min.toLocaleString()}`;
    return null;
  })();

  // All images: cover + product_images
  const allImages = [
    ...(product.cover_image_url ? [{ image_url: product.cover_image_url, alt_text: product.display_name }] : []),
    ...images,
  ];

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-28 pb-4">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/${locale}`} className="hover:text-emerald-600 transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/${locale}/shop`} className="hover:text-emerald-600 transition">Equipment</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-600 font-medium truncate max-w-[300px]">{product.display_name}</span>
        </nav>
      </div>

      {/* Product Detail Grid */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pb-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-50 aspect-square">
              {allImages.length > 0 ? (
                <img
                  src={allImages[activeImage]?.image_url}
                  alt={allImages[activeImage]?.alt_text || product.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-slate-200" />
                </div>
              )}
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {product.is_featured && (
                  <span className="px-3 py-1.5 bg-amber-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Featured
                  </span>
                )}
                {product.display_tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">{tag}</span>
                ))}
              </div>
              {isInquiryMode && (
                <div className="absolute bottom-4 right-4 bg-amber-50/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-amber-700 border border-amber-100 flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4" /> Quote Only
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
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                      activeImage === idx ? 'border-emerald-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={img.image_url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {product.brand && (
              <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">{product.brand}</span>
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
                <div className="text-lg font-bold text-slate-500">Contact for pricing</div>
              )}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-4">
              {isInquiryMode ? (
                <button
                  onClick={() => setShowQuoteModal(true)}
                  className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
                >
                  <MessageSquareQuote className="w-5 h-5" /> Request a Quote
                </button>
              ) : (
                <>
                  <Link
                    href={`/${locale}/checkout?product=${product.product_id}`}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
                  >
                    <ShoppingCart className="w-5 h-5" /> Add to Cart
                  </Link>
                  <button
                    onClick={() => setShowQuoteModal(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition"
                  >
                    <MessageSquareQuote className="w-5 h-5" /> Request Quote
                  </button>
                </>
              )}
            </div>

            {/* Recommendation Reason */}
            {product.recommendation_reason && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 font-medium">{product.recommendation_reason}</p>
              </div>
            )}

            {/* Specs */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <h3 className="px-6 py-4 bg-slate-50 text-sm font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  Specifications
                </h3>
                <div className="divide-y divide-slate-100">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex px-6 py-3">
                      <span className="w-1/3 text-sm text-slate-500 font-medium">{key}</span>
                      <span className="w-2/3 text-sm text-slate-900 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {(product.description || product.long_description) && (
              <div className="prose prose-slate max-w-none">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Product Details</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.long_description || product.description}
                </p>
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
                <h2 className="text-xl font-bold text-slate-900">Related Training</h2>
                <p className="text-sm text-slate-500">Training programs that use or recommend this equipment</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCourses.map(course => (
                <Link
                  key={course.id}
                  href={`/${locale}/courses/${course.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="h-40 overflow-hidden bg-slate-100 relative">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
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
                        <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">{course.specialty}</span>
                      )}
                      {course.level && (
                        <span className="px-2.5 py-1 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm">{course.level}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">{course.title}</h3>
                    {course.summary && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.summary}</p>
                    )}
                    <span className="text-sm font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                      View Training <ArrowRight className="w-3.5 h-3.5" />
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
                <h2 className="text-xl font-bold text-slate-900">Similar Equipment</h2>
                <p className="text-sm text-slate-500">Other equipment for the same clinical use case</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(rp => (
                <Link
                  key={rp.id}
                  href={`/${locale}/shop/${rp.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="aspect-square overflow-hidden bg-slate-50">
                    {rp.cover_image_url ? (
                      <img
                        src={rp.cover_image_url}
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
                    {rp.brand && <span className="text-xs text-slate-400 font-bold uppercase">{rp.brand}</span>}
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 text-sm mt-1">{rp.display_name}</h4>
                    <div className="mt-2 flex items-center justify-between">
                      {rp.display_price ? (
                        <span className="text-sm font-bold text-slate-900">${rp.display_price.toLocaleString()}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Contact</span>
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
          <ArrowLeft className="w-4 h-4" /> Back to All Equipment
        </Link>
      </div>

      {/* ============================================ */}
      {/* QUOTE REQUEST MODAL */}
      {/* ============================================ */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQuoteModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Request a Quote</h2>
              <button onClick={() => setShowQuoteModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {quoteSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Quote Request Submitted</h3>
                <p className="text-slate-500 mb-6">Our team will get back to you within 1-2 business days.</p>
                <button
                  onClick={() => { setShowQuoteModal(false); setQuoteSuccess(false); setQuoteForm({ name: '', email: '', clinic: '', message: '' }); }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                  {product.cover_image_url && (
                    <img src={product.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-sm line-clamp-1">{product.display_name}</p>
                    {product.brand && <p className="text-xs text-slate-400">{product.brand}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.name}
                    onChange={e => setQuoteForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={quoteForm.email}
                    onChange={e => setQuoteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={quoteForm.clinic}
                    onChange={e => setQuoteForm(f => ({ ...f, clinic: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Message / Requirements</label>
                  <textarea
                    rows={3}
                    value={quoteForm.message}
                    onChange={e => setQuoteForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Quantity, configuration, or other requirements..."
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
                      <Send className="w-5 h-5" /> Submit Quote Request
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
