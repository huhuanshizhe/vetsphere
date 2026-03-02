'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CourseProductRelation, Course } from '../types';
import ClinicalConsultationModal from './ClinicalConsultationModal';
import InquiryModal from './InquiryModal';

const translations = {
  en: {
    title: 'Equipment & Consumables by Training Module',
    subtitle: 'Professional equipment organized by training day and module',
    generalGroup: 'General Recommendations',
    dayPrefix: 'Day',
    usedInDay: 'Used in Day',
    addToCart: 'Add to Cart',
    requestQuote: 'Request Quote',
    buy: 'Buy',
    bulkQuote: 'Bulk Quote',
    required: 'Required',
    recommended: 'Recommended',
    mentioned: 'Featured',
    contactForPrice: 'Contact for Pricing',
    loginToView: 'Login to View',
    added: 'Added!',
    noEquipment: 'No equipment recommendations for this course yet.',
  },
  zh: {
    title: '按培训模块分类的设备与耗材',
    subtitle: '按培训日和模块整理的专业设备',
    generalGroup: '通用推荐',
    dayPrefix: '第',
    usedInDay: '用于第',
    addToCart: '加入购物车',
    requestQuote: '申请报价',
    buy: '购买',
    bulkQuote: '批量询价',
    required: '必备',
    recommended: '推荐',
    mentioned: '提及',
    contactForPrice: '联系询价',
    loginToView: '登录查看',
    added: '已添加!',
    noEquipment: '暂无设备推荐',
  },
  th: {
    title: 'อุปกรณ์และวัสดุสิ้นเปลืองตามโมดูลการฝึกอบรม',
    subtitle: 'อุปกรณ์ระดับมืออาชีพจัดตามวันและโมดูลการฝึกอบรม',
    generalGroup: 'คำแนะนำทั่วไป',
    dayPrefix: 'วันที่',
    usedInDay: 'ใช้ในวันที่',
    addToCart: 'เพิ่มลงตะกร้า',
    requestQuote: 'ขอใบเสนอราคา',
    buy: 'ซื้อ',
    bulkQuote: 'ขอราคาขายส่ง',
    required: 'จำเป็น',
    recommended: 'แนะนำ',
    mentioned: 'กล่าวถึง',
    contactForPrice: 'ติดต่อสอบถามราคา',
    loginToView: 'เข้าสู่ระบบเพื่อดู',
    added: 'เพิ่มแล้ว!',
    noEquipment: 'ยังไม่มีคำแนะนำอุปกรณ์สำหรับหลักสูตรนี้',
  },
  ja: {
    title: 'トレーニングモジュール別の機器・消耗品',
    subtitle: 'トレーニング日とモジュールごとに整理されたプロフェッショナル機器',
    generalGroup: '一般的な推奨',
    dayPrefix: 'Day',
    usedInDay: 'Day',
    addToCart: 'カートに追加',
    requestQuote: '見積もり依頼',
    buy: '購入',
    bulkQuote: '大量見積もり',
    required: '必須',
    recommended: '推奨',
    mentioned: '紹介',
    contactForPrice: '価格はお問い合わせ',
    loginToView: 'ログインして確認',
    added: '追加済み!',
    noEquipment: 'このコースにはまだ機器の推奨がありません',
  },
};

interface CourseEquipmentByModuleProps {
  relations: CourseProductRelation[];
  locale: string;
  agenda: Course['agenda'];
}

interface GroupedEquipment {
  key: string;
  label: string;
  dayIndex: number | null;
  items: CourseProductRelation[];
}

export default function CourseEquipmentByModule({ relations, locale, agenda }: CourseEquipmentByModuleProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [addedId, setAddedId] = useState<string | null>(null);
  const [consultationProduct, setConsultationProduct] = useState<CourseProductRelation | null>(null);
  const [inquiryProduct, setInquiryProduct] = useState<CourseProductRelation | null>(null);

  // Exclude instructor-only items
  const equipmentRelations = relations.filter(r => r.relationType !== 'instructor');

  // Group by dayIndex
  const groups = useMemo<GroupedEquipment[]>(() => {
    const dayGroups = new Map<number | null, CourseProductRelation[]>();

    equipmentRelations.forEach(r => {
      const key = r.dayIndex ?? null;
      if (!dayGroups.has(key)) dayGroups.set(key, []);
      dayGroups.get(key)!.push(r);
    });

    const result: GroupedEquipment[] = [];

    // Day-specific groups first (sorted by day index)
    const dayKeys = Array.from(dayGroups.keys())
      .filter((k): k is number => k !== null)
      .sort((a, b) => a - b);

    dayKeys.forEach(dayIdx => {
      const agendaDay = agenda[dayIdx - 1]; // 1-based to 0-based
      const dayLabel = agendaDay
        ? `${agendaDay.day} - ${agendaDay.date}`
        : `${t.dayPrefix} ${dayIdx}`;
      result.push({
        key: `day-${dayIdx}`,
        label: dayLabel,
        dayIndex: dayIdx,
        items: dayGroups.get(dayIdx) || [],
      });
    });

    // General group last
    const generalItems = dayGroups.get(null);
    if (generalItems && generalItems.length > 0) {
      result.push({
        key: 'general',
        label: t.generalGroup,
        dayIndex: null,
        items: generalItems,
      });
    }

    return result;
  }, [equipmentRelations, agenda, t.dayPrefix, t.generalGroup]);

  if (equipmentRelations.length === 0) return null;

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

  const getRelationBadge = (type: string) => {
    switch (type) {
      case 'required': return { label: t.required, color: 'bg-red-100 text-red-700' };
      case 'recommended': return { label: t.recommended, color: 'bg-green-100 text-green-700' };
      default: return { label: t.mentioned, color: 'bg-slate-100 text-slate-600' };
    }
  };

  const currencySymbol = locale.startsWith('cn') || locale === 'zh' ? '¥' : '$';

  return (
    <>
      <div id="module-equipment" className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <span className="text-3xl">&#128736;</span> {t.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Grouped Sections */}
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.key}>
              {/* Group Header */}
              <div className="flex items-center gap-3 mb-4">
                {group.dayIndex !== null && (
                  <span className="bg-vs/10 text-vs px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest">
                    {t.dayPrefix} {group.dayIndex}
                  </span>
                )}
                <h3 className="text-lg font-black text-slate-800">{group.label}</h3>
                <span className="text-xs font-bold text-slate-400">({group.items.length})</span>
              </div>

              {/* Product Cards Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {group.items.map(relation => {
                  const product = relation.product;
                  if (!product) return null;

                  const mode = product.purchaseMode || 'direct';
                  const badge = getRelationBadge(relation.relationshipType);
                  const isAdded = addedId === product.id;

                  return (
                    <div
                      key={relation.id}
                      className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-vs/50 hover:shadow-md transition-all group"
                    >
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div
                          className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white border border-slate-100 cursor-pointer"
                          onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          {/* Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badge.color}`}>
                              {badge.label}
                            </span>
                            {relation.dayIndex && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">
                                {t.usedInDay} {relation.dayIndex}{language === 'zh' ? '天' : ''}
                              </span>
                            )}
                            {product.clinicalCategory && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                {product.clinicalCategory}
                              </span>
                            )}
                          </div>

                          {/* Name & Brand */}
                          <h4
                            className="font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-vs transition-colors text-sm"
                            onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                          >
                            {product.name}
                          </h4>
                          <p className="text-xs text-slate-400">{product.brand}</p>

                          {/* Price + CTA */}
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              {mode === 'inquiry' ? (
                                <span className="text-xs font-bold text-blue-600">{t.contactForPrice}</span>
                              ) : isAuthenticated ? (
                                <span className="text-sm font-black text-vs">
                                  {currencySymbol}{product.price?.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-vs">&#128274; {t.loginToView}</span>
                              )}
                            </div>

                            <div className="flex gap-1.5">
                              {mode === 'direct' && (
                                <button
                                  onClick={() => handleAddToCart(relation)}
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
                                  onClick={() => setConsultationProduct(relation)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all"
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
