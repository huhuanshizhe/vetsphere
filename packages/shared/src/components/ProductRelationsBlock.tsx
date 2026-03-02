'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import type { Product } from '../types';

interface ProductRelation {
  id: string;
  courseId: string;
  productId: string;
  relationshipType: 'required' | 'recommended' | 'mentioned';
  instructorNoteEn?: string;
  instructorNoteTh?: string;
  instructorNoteJa?: string;
  displayOrder: number;
  product: Product | null;
}

interface ProductRelationsBlockProps {
  courseId: string;
  locale: string;
}

const translations = {
  en: {
    title: 'Equipment Used in This Training',
    subtitle: 'Professional equipment featured and recommended in this course',
    required: 'Required',
    recommended: 'Recommended',
    mentioned: 'Featured',
    viewProduct: 'View Product',
    instructorNote: 'Instructor Note',
    noRelations: 'No equipment recommendations for this course yet.',
    loading: 'Loading equipment recommendations...',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    contactForPrice: 'Contact for Pricing',
  },
  th: {
    title: 'อุปกรณ์ที่ใช้ในการฝึกอบรมนี้',
    subtitle: 'อุปกรณ์ระดับมืออาชีพที่แนะนำในหลักสูตรนี้',
    required: 'จำเป็น',
    recommended: 'แนะนำ',
    mentioned: 'กล่าวถึง',
    viewProduct: 'ดูสินค้า',
    instructorNote: 'หมายเหตุจากวิทยากร',
    noRelations: 'ยังไม่มีคำแนะนำอุปกรณ์สำหรับหลักสูตรนี้',
    loading: 'กำลังโหลดคำแนะนำอุปกรณ์...',
    inStock: 'มีสินค้า',
    lowStock: 'สินค้าใกล้หมด',
    outOfStock: 'สินค้าหมด',
    contactForPrice: 'ติดต่อสอบถามราคา',
  },
  ja: {
    title: 'このトレーニングで使用する機器',
    subtitle: 'このコースで紹介・推奨されるプロフェッショナル機器',
    required: '必須',
    recommended: '推奨',
    mentioned: '紹介',
    viewProduct: '製品を見る',
    instructorNote: '講師のコメント',
    noRelations: 'このコースにはまだ機器の推奨がありません',
    loading: '機器推奨を読み込み中...',
    inStock: '在庫あり',
    lowStock: '残りわずか',
    outOfStock: '在庫切れ',
    contactForPrice: '価格はお問い合わせください',
  },
  zh: {
    title: '本课程使用的设备',
    subtitle: '本课程推荐使用的专业设备',
    required: '必备',
    recommended: '推荐',
    mentioned: '提及',
    viewProduct: '查看产品',
    instructorNote: '讲师备注',
    noRelations: '暂无设备推荐',
    loading: '加载设备推荐中...',
    inStock: '有库存',
    lowStock: '库存紧张',
    outOfStock: '无库存',
    contactForPrice: '联系询价',
  },
};

// Fetch products for a course
async function getCourseProducts(courseId: string): Promise<ProductRelation[]> {
  try {
    const response = await fetch(`/api/courses/${courseId}/products`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.relations || [];
  } catch {
    return [];
  }
}

export default function ProductRelationsBlock({ courseId, locale }: ProductRelationsBlockProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [relations, setRelations] = useState<ProductRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourseProducts(courseId).then(data => {
      setRelations(data);
      setLoading(false);
    });
  }, [courseId]);

  const getRelationLabel = (type: string) => {
    switch (type) {
      case 'required': return t.required;
      case 'recommended': return t.recommended;
      default: return t.mentioned;
    }
  };

  const getRelationColor = (type: string) => {
    switch (type) {
      case 'required': return 'bg-red-100 text-red-700';
      case 'recommended': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'text-emerald-600';
      case 'Low Stock': return 'text-amber-600';
      case 'Out of Stock': return 'text-red-600';
      default: return 'text-slate-500';
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'In Stock': return t.inStock;
      case 'Low Stock': return t.lowStock;
      case 'Out of Stock': return t.outOfStock;
      default: return status;
    }
  };

  const getInstructorNote = (relation: ProductRelation) => {
    switch (language) {
      case 'th': return relation.instructorNoteTh || relation.instructorNoteEn;
      case 'ja': return relation.instructorNoteJa || relation.instructorNoteEn;
      case 'zh': return relation.instructorNoteEn; // fallback to English
      default: return relation.instructorNoteEn;
    }
  };

  // Don't render if no relations and not loading
  if (!loading && relations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <span className="text-3xl">&#128736;</span> {t.title}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-vs border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">{t.loading}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {relations.map(relation => {
            const product = relation.product;
            if (!product) return null;

            const instructorNote = getInstructorNote(relation);
            const isInquiryOnly = product.purchaseMode === 'inquiry';

            return (
              <div 
                key={relation.id}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-vs/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => router.push(`/${locale}/shop/${product.id}`)}
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-white border border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRelationColor(relation.relationshipType)}`}>
                        {getRelationLabel(relation.relationshipType)}
                      </span>
                      <span className={`text-[10px] font-bold ${getStockColor(product.stockStatus || 'In Stock')}`}>
                        {getStockLabel(product.stockStatus || 'In Stock')}
                      </span>
                    </div>
                    
                    {/* Name & Brand */}
                    <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-vs transition-colors text-sm">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 mb-2">{product.brand}</p>
                    
                    {/* Price */}
                    <div className="flex items-center justify-between">
                      {isInquiryOnly ? (
                        <span className="text-xs font-bold text-amber-600">{t.contactForPrice}</span>
                      ) : (
                        <span className="text-sm font-black text-vs">
                          &#165;{product.price?.toLocaleString()}
                        </span>
                      )}
                      <span className="text-slate-300 group-hover:text-vs transition-colors">&#8594;</span>
                    </div>
                  </div>
                </div>

                {/* Instructor Note */}
                {instructorNote && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                      {t.instructorNote}
                    </p>
                    <p className="text-xs text-amber-900 italic line-clamp-2">&quot;{instructorNote}&quot;</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
