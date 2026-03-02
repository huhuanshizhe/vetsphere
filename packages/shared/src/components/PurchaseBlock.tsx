'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Product, PurchaseMode } from '../types';
import InquiryModal from './InquiryModal';
import ClinicalConsultationModal from './ClinicalConsultationModal';

interface PurchaseBlockProps {
  product: Product;
  locale: string;
  onAddToCart?: () => void;
}

const translations = {
  en: {
    priceLabel: 'Price excl. tax',
    contactPricing: 'Contact for Pricing',
    loginToView: 'Login to view price',
    addToCart: 'Add to Cart',
    added: 'Added!',
    buyNow: 'Buy Now',
    requestQuote: 'Request Quote',
    requestConsultation: 'Request Clinical Consultation',
    bulkQuote: 'Request Bulk Quote',
    outOfStock: 'Out of Stock',
    lowStock: 'Only {count} left',
    inStock: 'In Stock',
    loginRequired: 'Login required',
    directPurchase: 'Direct Purchase',
    inquiryNote: 'High-value clinical equipment. Our specialists will provide personalized consultation.',
    hybridNote: 'Need larger quantities? Request a bulk quote for volume pricing.',
  },
  th: {
    priceLabel: 'ราคาไม่รวมภาษี',
    contactPricing: 'ติดต่อสอบถามราคา',
    loginToView: 'เข้าสู่ระบบเพื่อดูราคา',
    addToCart: 'เพิ่มลงตะกร้า',
    added: 'เพิ่มแล้ว!',
    buyNow: 'ซื้อเลย',
    requestQuote: 'ขอใบเสนอราคา',
    requestConsultation: 'ขอคำปรึกษาทางคลินิก',
    bulkQuote: 'ขอราคาพิเศษสำหรับจำนวนมาก',
    outOfStock: 'สินค้าหมด',
    lowStock: 'เหลือเพียง {count} ชิ้น',
    inStock: 'มีสินค้า',
    loginRequired: 'กรุณาเข้าสู่ระบบ',
    directPurchase: 'ซื้อโดยตรง',
    inquiryNote: 'อุปกรณ์คลินิกมูลค่าสูง ผู้เชี่ยวชาญของเราจะให้คำปรึกษาเฉพาะบุคคล',
    hybridNote: 'ต้องการจำนวนมาก? ขอราคาพิเศษสำหรับการสั่งซื้อจำนวนมาก',
  },
  ja: {
    priceLabel: '税抜価格',
    contactPricing: '価格はお問い合わせください',
    loginToView: 'ログインして価格を見る',
    addToCart: 'カートに追加',
    added: '追加しました！',
    buyNow: '今すぐ購入',
    requestQuote: '見積もりをリクエスト',
    requestConsultation: '臨床コンサルテーションを依頼',
    bulkQuote: '大量注文の見積もり',
    outOfStock: '在庫切れ',
    lowStock: '残り{count}点',
    inStock: '在庫あり',
    loginRequired: 'ログインが必要です',
    directPurchase: '直接購入',
    inquiryNote: '高額医療機器です。専門スタッフがカスタマイズされたコンサルテーションを提供します。',
    hybridNote: '大量注文が必要ですか？ボリューム価格の見積もりをリクエストしてください。',
  },
};

export default function PurchaseBlock({ product, locale, onAddToCart }: PurchaseBlockProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [addedToCart, setAddedToCart] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);

  const purchaseMode: PurchaseMode = product.purchaseMode || 'direct';
  const isOutOfStock = product.stockStatus === 'Out of Stock';
  const isLowStock = product.stockStatus === 'Low Stock';

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'product',
      currency: 'USD',
      imageUrl: product.imageUrl,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    onAddToCart?.();
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'product',
      currency: 'USD',
      imageUrl: product.imageUrl,
    });

    router.push(`/${locale}/checkout`);
  };

  const getStockLabel = () => {
    if (isOutOfStock) return t.outOfStock;
    if (isLowStock) return t.lowStock.replace('{count}', String(product.stockQuantity ?? 0));
    return t.inStock;
  };

  const getStockColor = () => {
    if (isOutOfStock) return 'text-red-500 bg-red-50';
    if (isLowStock) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Stock Status */}
        <div className={`inline-block px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${getStockColor()}`}>
          {getStockLabel()}
        </div>

        {/* Price Section */}
        <div className="space-y-1">
          {purchaseMode === 'inquiry' ? (
            // Inquiry mode: No price shown
            <div>
              <p className="text-2xl font-black text-blue-600">{t.contactPricing}</p>
              <p className="text-sm text-slate-500 mt-2">{t.inquiryNote}</p>
            </div>
          ) : (
            // Direct or Hybrid mode: Show price
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.priceLabel}</p>
              {isAuthenticated ? (
                <p className="text-3xl font-black text-slate-900">${product.price.toLocaleString()}</p>
              ) : (
                <button 
                  onClick={() => router.push(`/${locale}/auth`)}
                  className="text-lg font-black text-vs hover:underline flex items-center gap-2"
                >
                  🔒 {t.loginToView}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {purchaseMode === 'direct' && (
            // Direct purchase mode
            <>
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider transition-all ${
                    isOutOfStock 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : addedToCart
                      ? 'bg-slate-900 text-white'
                      : 'bg-vs text-white hover:bg-vs/90 shadow-lg shadow-vs/20'
                  }`}
                >
                  {addedToCart ? t.added : t.addToCart}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider transition-all ${
                    isOutOfStock 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {t.buyNow}
                </button>
              </div>
            </>
          )}

          {purchaseMode === 'inquiry' && (
            // Inquiry only mode - Professional consultation
            <button
              onClick={() => setConsultationOpen(true)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-black uppercase tracking-wider hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <span>&#128138;</span> {t.requestConsultation}
            </button>
          )}

          {purchaseMode === 'hybrid' && (
            // Hybrid mode: Both purchase and inquiry
            <>
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider transition-all ${
                    isOutOfStock 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : addedToCart
                      ? 'bg-slate-900 text-white'
                      : 'bg-vs text-white hover:bg-vs/90 shadow-lg shadow-vs/20'
                  }`}
                >
                  {addedToCart ? t.added : t.addToCart}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider transition-all ${
                    isOutOfStock 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {t.buyNow}
                </button>
              </div>
              
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">{t.hybridNote}</p>
                <button
                  onClick={() => setInquiryOpen(true)}
                  className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-black uppercase tracking-wider hover:bg-blue-50 transition-all"
                >
                  {t.bulkQuote}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inquiry Modal (for bulk quotes in hybrid mode) */}
      <InquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        productId={product.id}
        productName={product.name}
        productBrand={product.brand}
      />

      {/* Clinical Consultation Modal (for inquiry mode) */}
      <ClinicalConsultationModal
        isOpen={consultationOpen}
        onClose={() => setConsultationOpen(false)}
        productId={product.id}
        productName={product.name}
        productBrand={product.brand}
        productImageUrl={product.imageUrl}
      />
    </>
  );
}
