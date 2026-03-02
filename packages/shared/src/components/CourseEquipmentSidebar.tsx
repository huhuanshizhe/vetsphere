'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CourseProductRelation } from '../types';
import { useSiteConfig } from '../context/SiteConfigContext';
import ClinicalConsultationModal from './ClinicalConsultationModal';
import InquiryModal from './InquiryModal';

const translations = {
  en: {
    title: 'Equipment & Kits Used in This Course',
    intlTitle: 'Essential Equipment for This Training',
    addToCart: 'Add to Cart',
    requestQuote: 'Request Quote',
    buy: 'Buy',
    bulkQuote: 'Bulk Quote',
    viewAll: 'View all recommended items',
    required: 'Required',
    direct: 'Buy Now',
    inquiry: 'Quote Only',
    hybrid: 'Buy / Quote',
    contactForPrice: 'Contact for Pricing',
    loginToView: 'Login to View',
    added: 'Added!',
  },
  zh: {
    title: '本课程使用的设备套件',
    intlTitle: '本课程使用的设备套件',
    addToCart: '加入购物车',
    requestQuote: '申请报价',
    buy: '购买',
    bulkQuote: '批量询价',
    viewAll: '查看全部推荐设备',
    required: '必备',
    direct: '直接购买',
    inquiry: '仅询价',
    hybrid: '购买/询价',
    contactForPrice: '联系询价',
    loginToView: '登录查看',
    added: '已添加!',
  },
  th: {
    title: 'อุปกรณ์และชุดเครื่องมือที่ใช้ในหลักสูตรนี้',
    intlTitle: 'อุปกรณ์ที่จำเป็นสำหรับการฝึกอบรมนี้',
    addToCart: 'เพิ่มลงตะกร้า',
    requestQuote: 'ขอใบเสนอราคา',
    buy: 'ซื้อ',
    bulkQuote: 'ขอราคาขายส่ง',
    viewAll: 'ดูสินค้าแนะนำทั้งหมด',
    required: 'จำเป็น',
    direct: 'ซื้อเลย',
    inquiry: 'ขอใบเสนอราคา',
    hybrid: 'ซื้อ / ขอราคา',
    contactForPrice: 'ติดต่อสอบถามราคา',
    loginToView: 'เข้าสู่ระบบเพื่อดู',
    added: 'เพิ่มแล้ว!',
  },
  ja: {
    title: 'このコースで使用する機器・キット',
    intlTitle: 'このトレーニングに必要な機器',
    addToCart: 'カートに追加',
    requestQuote: '見積もり依頼',
    buy: '購入',
    bulkQuote: '大量見積もり',
    viewAll: 'すべての推奨アイテムを見る',
    required: '必須',
    direct: '今すぐ購入',
    inquiry: '見積もりのみ',
    hybrid: '購入 / 見積もり',
    contactForPrice: '価格はお問い合わせ',
    loginToView: 'ログインして確認',
    added: '追加済み!',
  },
};

interface CourseEquipmentSidebarProps {
  relations: CourseProductRelation[];
  locale: string;
}

export default function CourseEquipmentSidebar({ relations, locale }: CourseEquipmentSidebarProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { isINTL } = useSiteConfig();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [addedId, setAddedId] = useState<string | null>(null);
  const [consultationProduct, setConsultationProduct] = useState<CourseProductRelation | null>(null);
  const [inquiryProduct, setInquiryProduct] = useState<CourseProductRelation | null>(null);

  // Filter: required items, exclude instructor-only picks
  const requiredItems = relations
    .filter(r => r.relationshipType === 'required' && r.relationType !== 'instructor')
    .slice(0, 3);

  const totalCount = relations.filter(r => r.relationType !== 'instructor').length;

  if (requiredItems.length === 0) return null;

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

  const getModeBadge = (mode: string | undefined) => {
    switch (mode) {
      case 'inquiry': return { label: t.inquiry, color: 'bg-blue-50 text-blue-600' };
      case 'hybrid': return { label: t.hybrid, color: 'bg-purple-50 text-purple-600' };
      default: return { label: t.direct, color: 'bg-emerald-50 text-emerald-600' };
    }
  };

  return (
    <>
      <div id="equipment-kits" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-black text-sm text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-lg">&#128736;</span> {isINTL ? t.intlTitle : t.title}
        </h3>

        <div className="space-y-3">
          {requiredItems.map(relation => {
            const product = relation.product;
            if (!product) return null;
            const mode = product.purchaseMode || 'direct';
            const badge = getModeBadge(mode);
            const isAdded = addedId === product.id;

            return (
              <div
                key={relation.id}
                className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-vs/40 transition-all group"
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0 bg-white border border-slate-100 cursor-pointer"
                  onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                />

                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-700">
                      {t.required}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Name */}
                  <p
                    className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-vs transition-colors"
                    onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                  >
                    {product.name}
                  </p>

                  {/* Price */}
                  <div className="mt-1">
                    {mode === 'inquiry' ? (
                      <span className="text-[10px] font-bold text-blue-600">{t.contactForPrice}</span>
                    ) : isAuthenticated ? (
                      <span className="text-xs font-black text-vs">
                        {locale.startsWith('cn') || locale === 'zh' ? '¥' : '$'}{product.price?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-vs">&#128274; {t.loginToView}</span>
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-1.5 mt-2">
                    {mode === 'direct' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(relation); }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
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
                        onClick={(e) => { e.stopPropagation(); setConsultationProduct(relation); }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        {t.requestQuote}
                      </button>
                    )}
                    {mode === 'hybrid' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(relation); }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            isAdded
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-vs text-white hover:bg-emerald-600 active:scale-95'
                          }`}
                        >
                          {isAdded ? t.added : t.buy}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setInquiryProduct(relation); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          {t.bulkQuote}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Link */}
        {totalCount > 0 && (
          <a
            href="#equipment-modules"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('equipment-modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="mt-4 flex items-center justify-center gap-1 text-xs font-bold text-vs hover:text-emerald-700 transition-colors py-2"
          >
            {t.viewAll} ({totalCount}) &#8595;
          </a>
        )}
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
