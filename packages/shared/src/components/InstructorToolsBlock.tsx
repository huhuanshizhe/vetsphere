'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CourseProductRelation } from '../types';
import ClinicalConsultationModal from './ClinicalConsultationModal';
import InquiryModal from './InquiryModal';

const translations = {
  en: {
    title: 'Instructor Recommended Tools',
    addToCart: 'Add to Cart',
    requestQuote: 'Request Quote',
    buy: 'Buy',
    bulkQuote: 'Bulk Quote',
    contactForPrice: 'Quote',
    loginToView: 'Login',
    added: 'Added!',
  },
  zh: {
    title: '讲师推荐工具',
    addToCart: '加入购物车',
    requestQuote: '申请报价',
    buy: '购买',
    bulkQuote: '批量询价',
    contactForPrice: '询价',
    loginToView: '登录',
    added: '已添加!',
  },
  th: {
    title: 'เครื่องมือที่วิทยากรแนะนำ',
    addToCart: 'เพิ่มลงตะกร้า',
    requestQuote: 'ขอใบเสนอราคา',
    buy: 'ซื้อ',
    bulkQuote: 'ขอราคาขายส่ง',
    contactForPrice: 'สอบถาม',
    loginToView: 'เข้าสู่ระบบ',
    added: 'เพิ่มแล้ว!',
  },
  ja: {
    title: '講師推奨ツール',
    addToCart: 'カートに追加',
    requestQuote: '見積もり',
    buy: '購入',
    bulkQuote: '大量見積もり',
    contactForPrice: 'お問い合わせ',
    loginToView: 'ログイン',
    added: '追加済み!',
  },
};

interface InstructorToolsBlockProps {
  relations: CourseProductRelation[];
  locale: string;
  instructorName?: string;
}

export default function InstructorToolsBlock({ relations, locale, instructorName }: InstructorToolsBlockProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [addedId, setAddedId] = useState<string | null>(null);
  const [consultationProduct, setConsultationProduct] = useState<CourseProductRelation | null>(null);
  const [inquiryProduct, setInquiryProduct] = useState<CourseProductRelation | null>(null);

  // Filter: instructor picks only, max 2
  const instructorItems = relations
    .filter(r => r.relationType === 'instructor')
    .slice(0, 2);

  if (instructorItems.length === 0) return null;

  const handleAddToCart = (relation: CourseProductRelation) => {
    const product = relation.product;
    if (!product || !isAuthenticated) {
      if (!isAuthenticated) router.push(`/${locale}/auth`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: locale.startsWith('cn') || locale === 'zh' ? 'CNY' : 'USD',
      imageUrl: product.imageUrl,
      type: 'product',
      quantity: 1,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const currencySymbol = locale.startsWith('cn') || locale === 'zh' ? '¥' : '$';

  return (
    <>
      <div id="instructor-tools" className="mt-6 pt-6 border-t border-slate-100">
        <h4 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
          <span>&#9733;</span> {instructorName
            ? (language === 'ja' ? `${instructorName} 推奨ツール` :
               language === 'th' ? `เครื่องมือแนะนำโดย ${instructorName}` :
               language === 'zh' ? `${instructorName} 推荐工具` :
               `Tools Recommended by ${instructorName}`)
            : t.title}
        </h4>
        <div className="space-y-2.5">
          {instructorItems.map(relation => {
            const product = relation.product;
            if (!product) return null;

            const mode = product.purchaseMode || 'direct';
            const isAdded = addedId === product.id;

            return (
              <div
                key={relation.id}
                className="flex items-center gap-3 p-2.5 bg-amber-50/50 rounded-xl border border-amber-100/50 hover:border-amber-200 transition-all group"
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white border border-slate-100 cursor-pointer"
                  onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-vs transition-colors"
                    onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                  >
                    {product.name}
                  </p>
                  <div className="mt-0.5">
                    {mode === 'inquiry' ? (
                      <span className="text-[10px] font-bold text-blue-600">{t.contactForPrice}</span>
                    ) : isAuthenticated ? (
                      <span className="text-xs font-black text-vs">
                        {currencySymbol}{product.price?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-vs">&#128274; {t.loginToView}</span>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="shrink-0 flex gap-1">
                  {mode === 'direct' && (
                    <button
                      onClick={() => handleAddToCart(relation)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-vs text-white hover:bg-emerald-600 active:scale-95'
                      }`}
                    >
                      {isAdded ? t.added : t.addToCart}
                    </button>
                  )}
                  {mode === 'inquiry' && (
                    <button
                      onClick={() => setConsultationProduct(relation)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      {t.requestQuote}
                    </button>
                  )}
                  {mode === 'hybrid' && (
                    <>
                      <button
                        onClick={() => handleAddToCart(relation)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-vs text-white hover:bg-emerald-600 active:scale-95'
                        }`}
                      >
                        {isAdded ? t.added : t.buy}
                      </button>
                      <button
                        onClick={() => setInquiryProduct(relation)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                      >
                        {t.bulkQuote}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {consultationProduct?.product && (
        <ClinicalConsultationModal
          isOpen={!!consultationProduct}
          onClose={() => setConsultationProduct(null)}
          productId={consultationProduct.product.id}
          productName={consultationProduct.product.name}
        />
      )}
      {inquiryProduct?.product && (
        <InquiryModal
          isOpen={!!inquiryProduct}
          onClose={() => setInquiryProduct(null)}
          productId={inquiryProduct.product.id}
          productName={inquiryProduct.product.name}
        />
      )}
    </>
  );
}
