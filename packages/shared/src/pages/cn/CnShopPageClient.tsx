'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search, RefreshCcw, Stethoscope, Target, TrendingUp, GraduationCap,
  Building2, ShoppingCart, Filter, Grid3X3, List, ChevronDown, ChevronUp,
  X, Check, MessageCircle, Sparkles, Shield, Wrench, Users, BookOpen,
  ArrowRight, Phone, Mail, ArrowLeft
} from 'lucide-react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Product, Specialty } from '../../types';
import ClinicalConsultationModal from '../../components/ClinicalConsultationModal';
import InquiryModal from '../../components/InquiryModal';
import { AIShopAdvisor } from '../../components/cn/AIShopAdvisor';

// ============================================================================
// 类型定义
// ============================================================================

/** 采购场景 */
type PurchaseScene = 'all' | 'frequent' | 'basic' | 'specialty' | 'upgrade' | 'course-gear' | 'startup';

/** 客单级别 */
type PriceRange = 'all' | 'low' | 'medium' | 'high' | 'solution';

/** 采购方式 */
type PurchaseMode = 'all' | 'direct' | 'login-price' | 'inquiry' | 'consultation';

/** 课程关联类型 */
type CourseRelationType = 'all' | 'same-as-course' | 'instructor-pick' | 'post-course';

/** 课程来源链接类型 */
type CourseLinkType = 'core-kit' | 'module-supplies' | 'mentor-picks' | 'next-step';

/** 课程上下文（来自课程详情页跳转） */
interface CourseContext {
  source: 'course-detail' | null;
  courseId: string | null;
  courseName: string | null;
  stage: string | null;
  specialty: string | null;
  linkType: CourseLinkType | null;
}

/** 筛选状态 */
interface FilterState {
  purchaseScene: PurchaseScene;
  specialty: string;
  category: string;
  purchaseMode: PurchaseMode;
  priceRange: PriceRange;
  courseRelation: CourseRelationType;
  search: string;
}

/** 扩展产品数据 */
interface ExtendedProduct extends Product {
  purchaseScene?: PurchaseScene;
  purchaseSceneLabel?: string;
  targetAudience?: 'beginner' | 'specialist' | 'clinic-upgrade';
  targetAudienceLabel?: string;
  purchaseModeType?: PurchaseMode;
  purchaseModeLabel?: string;
  priceRangeType?: PriceRange;
  usageScenario?: string;
  whyRecommend?: string;
  courseRelation?: {
    type: CourseRelationType;
    typeLabel: string;
    courseId?: string;
    courseName?: string;
    instructorName?: string;
  };
}

// ============================================================================
// 常量配置
// ============================================================================

/** 采购场景配置 */
const SCENE_CONFIG: Record<PurchaseScene, {
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bgColor: string;
}> = {
  'all': {
    name: '全部商品',
    icon: <Grid3X3 className="w-5 h-5" />,
    description: '浏览所有商品',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
  },
  'frequent': {
    name: '高频补货',
    icon: <RefreshCcw className="w-5 h-5" />,
    description: '诊所日常消耗品',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  'basic': {
    name: '基础诊疗工具',
    icon: <Stethoscope className="w-5 h-5" />,
    description: '新手门诊必备',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  'specialty': {
    name: '专科器械',
    icon: <Target className="w-5 h-5" />,
    description: '专科方向进阶',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
  'upgrade': {
    name: '设备升级',
    icon: <TrendingUp className="w-5 h-5" />,
    description: '诊所设备升级',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  'course-gear': {
    name: '课程同款',
    icon: <GraduationCap className="w-5 h-5" />,
    description: '课程中使用的器械',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
  },
  'startup': {
    name: '开业方案',
    icon: <Building2 className="w-5 h-5" />,
    description: '新诊所配套采购',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
  },
};

/** 专科方向选项 */
const SPECIALTY_OPTIONS = [
  { key: 'all', label: '全部专科' },
  { key: 'orthopedics', label: '骨科' },
  { key: 'soft-tissue', label: '软组织外科' },
  { key: 'eye', label: '眼科' },
  { key: 'ultrasound', label: '超声影像' },
  { key: 'anesthesia', label: '麻醉' },
  { key: 'general', label: '综合' },
];

/** 传统分类选项（降级） */
const CATEGORY_OPTIONS = [
  { key: 'all', label: '全部类型' },
  { key: 'power-tools', label: '电动工具' },
  { key: 'implants', label: '植入物' },
  { key: 'instruments', label: '手术器械' },
  { key: 'consumables', label: '耗材' },
  { key: 'equipment', label: '设备' },
];

/** 采购方式选项 */
const PURCHASE_MODE_OPTIONS = [
  { key: 'all', label: '全部方式' },
  { key: 'direct', label: '直接下单' },
  { key: 'login-price', label: '登录看价' },
  { key: 'inquiry', label: '询价采购' },
  { key: 'consultation', label: '方案咨询' },
];

/** 客单级别选项 */
const PRICE_RANGE_OPTIONS = [
  { key: 'all', label: '全部价位' },
  { key: 'low', label: '低客单 (<¥500)' },
  { key: 'medium', label: '中客单 (¥500-5000)' },
  { key: 'high', label: '高客单 (¥5000-50000)' },
  { key: 'solution', label: '方案单 (¥50000+)' },
];

/** 课程关联选项 */
const COURSE_RELATION_OPTIONS = [
  { key: 'all', label: '全部关联' },
  { key: 'same-as-course', label: '课程同款' },
  { key: 'instructor-pick', label: '讲师常用' },
  { key: 'post-course', label: '课后进阶' },
];

/** 示例课程同款商品 */
const SAMPLE_COURSE_GEAR: ExtendedProduct[] = [
  {
    id: 'cg-1',
    name: 'TPLO 锯片套装',
    brand: 'SYNTHES',
    price: 3200,
    imageUrl: '/images/products/tplo-saw.jpg',
    description: 'TPLO手术专用锯片',
    longDescription: '',
    specialty: Specialty.ORTHOPEDICS,
    group: 'HandInstruments',
    specs: { '材质': '钛合金', '规格': '2.0mm' },
    stockStatus: 'In Stock',
    supplier: { name: 'SYNTHES', origin: '瑞士', rating: 5 },
    purchaseScene: 'course-gear',
    purchaseSceneLabel: '课程同款',
    targetAudience: 'specialist',
    targetAudienceLabel: '专科进阶',
    usageScenario: 'TPLO手术主力工具',
    whyRecommend: '训练营同款，导师首推',
    courseRelation: {
      type: 'same-as-course',
      typeLabel: '课程同款',
      courseId: 'csavs-joint-2026',
      courseName: 'CSAVS 关节外科训练营',
      instructorName: '李医生',
    },
  },
  {
    id: 'cg-2',
    name: '动力钻系统',
    brand: 'B.BRAUN',
    price: 12800,
    imageUrl: '/images/products/power-drill.jpg',
    description: '骨科专用动力钻',
    longDescription: '',
    specialty: Specialty.ORTHOPEDICS,
    group: 'PowerTools',
    specs: { '转速': '0-1200rpm', '电池': '锂电池' },
    stockStatus: 'In Stock',
    supplier: { name: 'B.BRAUN', origin: '德国', rating: 5 },
    purchaseScene: 'specialty',
    purchaseSceneLabel: '专科器械',
    targetAudience: 'specialist',
    targetAudienceLabel: '专科进阶',
    usageScenario: '骨折复位手术',
    whyRecommend: '导师日常使用款',
    courseRelation: {
      type: 'instructor-pick',
      typeLabel: '讲师常用',
      courseId: 'csavs-joint-2026',
      courseName: 'CSAVS 骨科训练营',
      instructorName: '王医生',
    },
  },
  {
    id: 'cg-3',
    name: '骨折复位钳套装',
    brand: 'IMEX',
    price: 2800,
    imageUrl: '/images/products/reduction-forceps.jpg',
    description: '多规格复位钳',
    longDescription: '',
    specialty: Specialty.ORTHOPEDICS,
    group: 'HandInstruments',
    specs: { '数量': '6件套', '材质': '医用不锈钢' },
    stockStatus: 'In Stock',
    supplier: { name: 'IMEX', origin: '美国', rating: 5 },
    purchaseScene: 'course-gear',
    purchaseSceneLabel: '课程同款',
    targetAudience: 'specialist',
    targetAudienceLabel: '专科进阶',
    usageScenario: '骨折复位手术',
    whyRecommend: '课后进阶必备',
    courseRelation: {
      type: 'post-course',
      typeLabel: '课后进阶',
      courseId: 'csavs-joint-2026',
      courseName: 'CSAVS 骨科训练营',
      instructorName: '王医生',
    },
  },
];

// ============================================================================
// 辅助函数
// ============================================================================

/** 推断产品元数据 */
function inferProductMetadata(product: Product): ExtendedProduct {
  const price = product.price;
  
  // 推断客单级别
  let priceRangeType: PriceRange = 'medium';
  if (price < 500) priceRangeType = 'low';
  else if (price >= 500 && price < 5000) priceRangeType = 'medium';
  else if (price >= 5000 && price < 50000) priceRangeType = 'high';
  else priceRangeType = 'solution';
  
  // 推断采购方式
  let purchaseModeType: PurchaseMode = 'direct';
  if (priceRangeType === 'low') purchaseModeType = 'direct';
  else if (priceRangeType === 'medium') purchaseModeType = 'login-price';
  else if (priceRangeType === 'high') purchaseModeType = 'inquiry';
  else purchaseModeType = 'consultation';
  
  // 推断采购场景
  let purchaseScene: PurchaseScene = 'basic';
  const group = product.group?.toLowerCase() || '';
  if (group.includes('consumable') || price < 200) purchaseScene = 'frequent';
  else if (group.includes('equipment') || price > 10000) purchaseScene = 'upgrade';
  else if (group.includes('power') || group.includes('implant')) purchaseScene = 'specialty';
  
  // 推断适合对象
  let targetAudience: 'beginner' | 'specialist' | 'clinic-upgrade' = 'beginner';
  let targetAudienceLabel = '新手门诊';
  if (purchaseScene === 'specialty') {
    targetAudience = 'specialist';
    targetAudienceLabel = '专科进阶';
  } else if (purchaseScene === 'upgrade') {
    targetAudience = 'clinic-upgrade';
    targetAudienceLabel = '诊所升级';
  }
  
  return {
    ...product,
    purchaseScene,
    purchaseSceneLabel: SCENE_CONFIG[purchaseScene].name,
    priceRangeType,
    purchaseModeType,
    purchaseModeLabel: PURCHASE_MODE_OPTIONS.find(o => o.key === purchaseModeType)?.label,
    targetAudience,
    targetAudienceLabel,
    usageScenario: inferUsageScenario(product),
    whyRecommend: inferWhyRecommend(product),
  };
}

/** 推断使用场景 */
function inferUsageScenario(product: Product): string {
  const specialty = product.specialty?.toLowerCase() || '';
  const name = product.name.toLowerCase();
  
  if (specialty.includes('ortho') || name.includes('bone') || name.includes('tplo')) {
    return '骨科手术';
  }
  if (specialty.includes('soft') || name.includes('tissue')) {
    return '软组织手术';
  }
  if (specialty.includes('eye') || name.includes('ophthal')) {
    return '眼科手术';
  }
  if (specialty.includes('ultra') || name.includes('ultrasound')) {
    return '超声诊断';
  }
  return '日常诊疗';
}

/** 推断推荐理由 */
function inferWhyRecommend(product: Product): string {
  const price = product.price;
  if (price < 500) return '高性价比，诊所必备';
  if (price < 5000) return '品质可靠，临床常用';
  if (price < 50000) return '专业级别，专科首选';
  return '旗舰配置，诊所升级';
}

/** 链接类型标签映射 */
const LINK_TYPE_LABELS: Record<CourseLinkType, string> = {
  'core-kit': '核心器械套装',
  'module-supplies': '模块配套耗材',
  'mentor-picks': '讲师常用工具',
  'next-step': '课后进阶器械',
};

/** 链接类型推荐排序权重 */
const LINK_TYPE_PRIORITY: Record<CourseLinkType, CourseRelationType[]> = {
  'core-kit': ['same-as-course', 'instructor-pick', 'post-course'],
  'module-supplies': ['same-as-course', 'instructor-pick', 'post-course'],
  'mentor-picks': ['instructor-pick', 'same-as-course', 'post-course'],
  'next-step': ['post-course', 'instructor-pick', 'same-as-course'],
};

/** 获取 CTA 配置 */
function getCTAConfig(product: ExtendedProduct, isAuthenticated: boolean) {
  const priceRange = product.priceRangeType || 'medium';
  
  switch (priceRange) {
    case 'low':
      return {
        showPrice: true,
        priceLabel: `¥${product.price.toLocaleString()}`,
        primary: { label: '加入购物车', action: 'add-to-cart', style: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
        secondary: { label: '立即购买', action: 'buy-now', style: 'border border-emerald-500 text-emerald-600 hover:bg-emerald-50' },
      };
    case 'medium':
      return {
        showPrice: isAuthenticated,
        priceLabel: isAuthenticated ? `¥${product.price.toLocaleString()}` : '🔒 登录看价',
        primary: isAuthenticated
          ? { label: '加入购物车', action: 'add-to-cart', style: 'bg-blue-500 hover:bg-blue-600 text-white' }
          : { label: '登录看价', action: 'login', style: 'bg-blue-500 hover:bg-blue-600 text-white' },
        secondary: { label: '询价采购', action: 'inquiry', style: 'border border-blue-500 text-blue-600 hover:bg-blue-50' },
      };
    case 'high':
      return {
        showPrice: false,
        priceLabel: '询价',
        primary: { label: '询价采购', action: 'inquiry', style: 'bg-purple-500 hover:bg-purple-600 text-white' },
        secondary: { label: '咨询顾问', action: 'consultation', style: 'border border-purple-500 text-purple-600 hover:bg-purple-50' },
      };
    case 'solution':
      return {
        showPrice: false,
        priceLabel: '方案报价',
        primary: { label: '获取配置建议', action: 'solution-quote', style: 'bg-slate-900 hover:bg-slate-800 text-white' },
        secondary: { label: '预约顾问', action: 'book-advisor', style: 'border border-slate-900 text-slate-900 hover:bg-slate-50' },
      };
    default:
      return {
        showPrice: true,
        priceLabel: `¥${product.price.toLocaleString()}`,
        primary: { label: '加入购物车', action: 'add-to-cart', style: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
        secondary: null,
      };
  }
}

// ============================================================================
// 子组件
// ============================================================================

/** 课程来源提示条 */
const CourseContextBanner: React.FC<{
  courseContext: CourseContext;
  locale: string;
  onClose: () => void;
}> = ({ courseContext, locale, onClose }) => {
  const router = useRouter();
  
  if (!courseContext.source || courseContext.source !== 'course-detail') return null;
  
  const linkTypeLabel = courseContext.linkType 
    ? LINK_TYPE_LABELS[courseContext.linkType] 
    : '课程同款器械';
  
  return (
    <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-b border-rose-100">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                正在查看：{linkTypeLabel}
              </p>
              {courseContext.courseName && (
                <p className="text-xs text-slate-500">
                  来自课程：{courseContext.courseName}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {courseContext.courseId && (
              <button
                onClick={() => router.push(`/${locale}/courses/${courseContext.courseId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                返回课程详情
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Hero 区 */
const HeroSection: React.FC<{
  onSceneClick: (scene: PurchaseScene) => void;
  onCourseGearClick: () => void;
  onConsultClick: () => void;
}> = ({ onSceneClick, onCourseGearClick, onConsultClick }) => (
  <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 md:py-24 overflow-hidden">
    {/* 背景装饰 */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
    </div>
    
    <div className="max-w-6xl mx-auto px-4 relative z-10">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
          临床器械与耗材
        </h1>
        <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-10">
          围绕宠物医生的临床接诊、专科训练、设备升级与诊所准备需求，
          <br className="hidden md:block" />
          提供更贴近实际工作场景的专业配套采购支持。
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onSceneClick('all')}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            按场景选购
          </button>
          <button
            onClick={onCourseGearClick}
            className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            查看课程同款器械
          </button>
          <button
            onClick={onConsultClick}
            className="px-6 py-3 border border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            咨询配置方案
          </button>
        </div>
      </div>
    </div>
  </section>
);

/** 采购场景入口卡片 */
const SceneEntryCards: React.FC<{
  activeScene: PurchaseScene;
  onSceneChange: (scene: PurchaseScene) => void;
}> = ({ activeScene, onSceneChange }) => {
  const scenes: PurchaseScene[] = ['frequent', 'basic', 'specialty', 'upgrade', 'course-gear', 'startup'];
  
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {scenes.map(scene => {
            const config = SCENE_CONFIG[scene];
            const isActive = activeScene === scene;
            
            return (
              <button
                key={scene}
                onClick={() => onSceneChange(scene)}
                className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg group ${
                  isActive 
                    ? `${config.bgColor} border-current ${config.color} shadow-lg` 
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  isActive ? config.bgColor : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <span className={isActive ? config.color : 'text-slate-500'}>
                    {config.icon}
                  </span>
                </div>
                <h3 className={`text-sm font-bold mb-1 ${isActive ? config.color : 'text-slate-900'}`}>
                  {config.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1">
                  {config.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/** 本周课程同款专区 */
const CourseGearSection: React.FC<{
  products: ExtendedProduct[];
  locale: string;
  onViewAll: () => void;
}> = ({ products, locale, onViewAll }) => {
  const router = useRouter();
  
  if (products.length === 0) return null;
  
  return (
    <section className="py-12 bg-gradient-to-r from-rose-50/50 to-amber-50/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-rose-600" />
              <h2 className="text-xl font-bold text-slate-900">本周课程同款器械</h2>
            </div>
            <p className="text-sm text-slate-500">课程中使用的专业器械，学完即可上手</p>
          </div>
          <button
            onClick={onViewAll}
            className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            查看全部课程同款
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {products.slice(0, 3).map(product => (
            <div
              key={product.id}
              className="bg-white rounded-2xl p-5 border border-rose-100/50 hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              {/* 标签 */}
              <div className="flex gap-2 mb-4">
                {product.courseRelation && (
                  <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded">
                    {product.courseRelation.typeLabel}
                  </span>
                )}
                {product.purchaseSceneLabel && product.purchaseScene !== 'course-gear' && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">
                    {product.purchaseSceneLabel}
                  </span>
                )}
              </div>
              
              {/* 图片 */}
              <div className="aspect-square bg-slate-50 rounded-xl mb-4 flex items-center justify-center p-6 group-hover:bg-white transition-colors">
                <img
                  src={product.imageUrl || '/images/placeholder-product.png'}
                  alt={product.name}
                  className="max-h-full object-contain mix-blend-multiply"
                />
              </div>
              
              {/* 信息 */}
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{product.brand}</p>
              <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-1 group-hover:text-rose-600 transition-colors">
                {product.name}
              </h3>
              
              {/* 课程关联 */}
              {product.courseRelation && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-rose-50 rounded-lg">
                  <BookOpen className="w-4 h-4 text-rose-500" />
                  <span className="text-xs text-rose-700 font-medium line-clamp-1">
                    {product.courseRelation.courseName}
                  </span>
                </div>
              )}
              
              {/* 使用场景 */}
              {product.usageScenario && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{product.usageScenario}</span>
                </div>
              )}
              
              {/* CTA */}
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                  className="flex-1 py-2.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors"
                >
                  查看商品
                </button>
                {product.courseRelation?.courseId && (
                  <button
                    onClick={() => router.push(`/${locale}/courses/${product.courseRelation?.courseId}?source=shop`)}
                    className="flex-1 py-2.5 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors"
                  >
                    查看课程
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/** 当前查看状态条 */
const CurrentViewStatus: React.FC<{
  filters: FilterState;
  productCount: number;
  onClearFilters: () => void;
}> = ({ filters, productCount, onClearFilters }) => {
  const hasFilters = filters.purchaseScene !== 'all' ||
    filters.specialty !== 'all' ||
    filters.category !== 'all' ||
    filters.purchaseMode !== 'all' ||
    filters.priceRange !== 'all' ||
    filters.courseRelation !== 'all' ||
    filters.search !== '';
  
  const getActiveFiltersText = () => {
    const parts: string[] = [];
    if (filters.purchaseScene !== 'all') parts.push(SCENE_CONFIG[filters.purchaseScene].name);
    if (filters.specialty !== 'all') parts.push(SPECIALTY_OPTIONS.find(o => o.key === filters.specialty)?.label || '');
    if (filters.category !== 'all') parts.push(CATEGORY_OPTIONS.find(o => o.key === filters.category)?.label || '');
    if (filters.purchaseMode !== 'all') parts.push(PURCHASE_MODE_OPTIONS.find(o => o.key === filters.purchaseMode)?.label || '');
    if (filters.priceRange !== 'all') parts.push(PRICE_RANGE_OPTIONS.find(o => o.key === filters.priceRange)?.label || '');
    if (filters.courseRelation !== 'all') parts.push(COURSE_RELATION_OPTIONS.find(o => o.key === filters.courseRelation)?.label || '');
    return parts.filter(Boolean).join(' · ');
  };
  
  return (
    <div className="bg-slate-50 border-y border-slate-100 py-3">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">当前查看：</span>
          {hasFilters ? (
            <span className="text-slate-700 font-medium">{getActiveFiltersText()}</span>
          ) : (
            <span className="text-slate-700 font-medium">全部商品</span>
          )}
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">
            共 <span className="font-bold text-emerald-600">{productCount}</span> 件商品
          </span>
        </div>
        
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            清空筛选
          </button>
        )}
      </div>
    </div>
  );
};

/** 左侧筛选器 */
const FilterSidebar: React.FC<{
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  locale: string;
}> = ({ filters, onFilterChange, locale }) => {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purchaseScene: true,
    specialty: true,
    category: false,
    purchaseMode: true,
    priceRange: true,
    courseRelation: true,
  });
  
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const FilterSection: React.FC<{
    title: string;
    sectionKey: string;
    options: { key: string; label: string }[];
    filterKey: keyof FilterState;
    currentValue: string;
  }> = ({ title, sectionKey, options, filterKey, currentValue }) => (
    <div className="border-b border-slate-100 pb-4">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        {expandedSections[sectionKey] ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      
      {expandedSections[sectionKey] && (
        <div className="space-y-1 mt-2">
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => onFilterChange(filterKey, opt.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentValue === opt.key
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{opt.label}</span>
              {currentValue === opt.key && (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  
  return (
    <aside className="w-64 shrink-0 space-y-4">
      {/* 搜索 */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
          搜索产品
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            placeholder="搜索名称、品牌..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* 筛选器 */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-4">
        <FilterSection
          title="使用场景"
          sectionKey="purchaseScene"
          options={[{ key: 'all', label: '全部场景' }, ...Object.entries(SCENE_CONFIG).filter(([k]) => k !== 'all').map(([k, v]) => ({ key: k, label: v.name }))]}
          filterKey="purchaseScene"
          currentValue={filters.purchaseScene}
        />
        
        <FilterSection
          title="专科方向"
          sectionKey="specialty"
          options={SPECIALTY_OPTIONS}
          filterKey="specialty"
          currentValue={filters.specialty}
        />
        
        <FilterSection
          title="传统分类"
          sectionKey="category"
          options={CATEGORY_OPTIONS}
          filterKey="category"
          currentValue={filters.category}
        />
        
        <FilterSection
          title="采购方式"
          sectionKey="purchaseMode"
          options={PURCHASE_MODE_OPTIONS}
          filterKey="purchaseMode"
          currentValue={filters.purchaseMode}
        />
        
        <FilterSection
          title="客单级别"
          sectionKey="priceRange"
          options={PRICE_RANGE_OPTIONS}
          filterKey="priceRange"
          currentValue={filters.priceRange}
        />
        
        <FilterSection
          title="课程关联"
          sectionKey="courseRelation"
          options={COURSE_RELATION_OPTIONS}
          filterKey="courseRelation"
          currentValue={filters.courseRelation}
        />
      </div>
      
      {/* AI 采购顾问 */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h4 className="text-sm font-bold">AI 选品顾问</h4>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          不确定该选什么？让 AI 根据你的临床需求推荐合适的器械配置。
        </p>
        <button
          onClick={() => router.push(`/${locale}/ai?context=equipment`)}
          className="w-full py-2.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
        >
          开始咨询
        </button>
      </div>
    </aside>
  );
};

/** 商品卡片 */
const ProductCard: React.FC<{
  product: ExtendedProduct;
  locale: string;
  isAuthenticated: boolean;
  onAddToCart: (product: ExtendedProduct) => void;
  onInquiry: (product: ExtendedProduct) => void;
  onConsultation: (product: ExtendedProduct) => void;
}> = ({ product, locale, isAuthenticated, onAddToCart, onInquiry, onConsultation }) => {
  const router = useRouter();
  const pathname = usePathname();
  const ctaConfig = getCTAConfig(product, isAuthenticated);
  
  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    switch (ctaConfig.primary.action) {
      case 'add-to-cart':
        onAddToCart(product);
        break;
      case 'buy-now':
        onAddToCart(product);
        router.push(`/${locale}/checkout`);
        break;
      case 'login':
        router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
        break;
      case 'inquiry':
        onInquiry(product);
        break;
      case 'consultation':
      case 'solution-quote':
      case 'book-advisor':
        onConsultation(product);
        break;
    }
  };
  
  const handleSecondaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ctaConfig.secondary) return;
    switch (ctaConfig.secondary.action) {
      case 'buy-now':
        onAddToCart(product);
        router.push(`/${locale}/checkout`);
        break;
      case 'inquiry':
        onInquiry(product);
        break;
      case 'consultation':
      case 'book-advisor':
        onConsultation(product);
        break;
    }
  };
  
  return (
    <div
      onClick={() => router.push(`/${locale}/shop/${product.id}`)}
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
    >
      {/* 标签区 */}
      <div className="p-4 pb-0">
        <div className="flex flex-wrap gap-1.5">
          {product.courseRelation && (
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
              {product.courseRelation.typeLabel}
            </span>
          )}
          {product.purchaseSceneLabel && (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
              SCENE_CONFIG[product.purchaseScene || 'basic'].bgColor
            } ${SCENE_CONFIG[product.purchaseScene || 'basic'].color}`}>
              {product.purchaseSceneLabel}
            </span>
          )}
        </div>
      </div>
      
      {/* 图片区 */}
      <div className="aspect-square bg-slate-50 mx-4 mt-2 rounded-xl flex items-center justify-center p-8 group-hover:bg-white transition-colors">
        <img
          src={product.imageUrl || '/images/placeholder-product.png'}
          alt={product.name}
          className="max-h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
        />
      </div>
      
      {/* 信息区 */}
      <div className="p-4">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{product.brand}</p>
        <h3 className="text-sm font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
          {product.name}
        </h3>
        
        {/* 关键参数 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(product.specs || {}).slice(0, 2).map(([key, val]) => (
            <div key={key} className="px-2 py-1 bg-slate-50 rounded text-[10px]">
              <span className="text-slate-400">{key}:</span>
              <span className="text-slate-700 font-medium ml-1">{val}</span>
            </div>
          ))}
        </div>
        
        {/* 使用场景 & 适合对象 */}
        <div className="space-y-1.5 mb-3">
          {product.usageScenario && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Wrench className="w-3 h-3" />
              <span>使用场景：{product.usageScenario}</span>
            </div>
          )}
          {product.targetAudienceLabel && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3 h-3" />
              <span>适合对象：{product.targetAudienceLabel}</span>
            </div>
          )}
        </div>
        
        {/* 推荐理由 */}
        {product.whyRecommend && (
          <p className="text-xs text-emerald-600 font-medium mb-4 line-clamp-1 italic">
            &quot;{product.whyRecommend}&quot;
          </p>
        )}
        
        {/* 价格 & CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div>
            <p className="text-lg font-black text-slate-900">{ctaConfig.priceLabel}</p>
          </div>
          <button
            onClick={handlePrimaryClick}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${ctaConfig.primary.style}`}
          >
            {ctaConfig.primary.label}
          </button>
        </div>
      </div>
    </div>
  );
};

/** 方案型推荐区 */
const SolutionRecommendations: React.FC<{
  onConsult: (type: string) => void;
}> = ({ onConsult }) => {
  const solutions = [
    {
      id: 'beginner',
      icon: <Stethoscope className="w-6 h-6" />,
      title: '新手门诊基础配置',
      description: '适合新开业门诊的基础诊疗设备，满足日常接诊需求。',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      id: 'specialist',
      icon: <Target className="w-6 h-6" />,
      title: '专科能力升级配置',
      description: '适合专科进阶需要的设备能力提升，提高诊疗水平。',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
    },
    {
      id: 'health-center',
      icon: <Building2 className="w-6 h-6" />,
      title: '健康管理中心入门',
      description: '适合轻医疗/宠物店升级的健康管理配置方案。',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
  ];
  
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">配套采购方案</h2>
          <p className="text-slate-500">根据不同阶段需求，提供一站式配置建议</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map(sol => (
            <div
              key={sol.id}
              className={`${sol.bgColor} rounded-2xl p-6 border ${sol.borderColor} hover:shadow-lg transition-all`}
            >
              <div className={`w-12 h-12 ${sol.bgColor} rounded-xl flex items-center justify-center mb-4 ${sol.color}`}>
                {sol.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{sol.title}</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">{sol.description}</p>
              <button
                onClick={() => onConsult(sol.id)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${sol.color} border-2 border-current hover:bg-white`}
              >
                获取配置建议
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/** 信任与服务说明 */
const TrustSection: React.FC = () => {
  const points = [
    {
      icon: <Target className="w-5 h-5" />,
      title: '医生导向选品',
      description: '围绕临床场景，精选实用器械',
    },
    {
      icon: <GraduationCap className="w-5 h-5" />,
      title: '课程联动推荐',
      description: '课程同款，学完即可上手',
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: '询价与顾问支持',
      description: '专业顾问，配置咨询',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: '售后与长期配套',
      description: '持续服务，长期合作',
    },
  ];
  
  return (
    <section className="py-12 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {points.map((point, idx) => (
            <div key={idx} className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-emerald-600">
                {point.icon}
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">{point.title}</h4>
              <p className="text-xs text-slate-500">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/** 底部 CTA */
const BottomCTA: React.FC<{
  locale: string;
  isAuthenticated: boolean;
  onCourseGearClick: () => void;
  onConsultClick: () => void;
}> = ({ locale, isAuthenticated, onCourseGearClick, onConsultClick }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessDoctorWorkspace } = useAuth();
  
  return (
    <section className="py-16 bg-gradient-to-r from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          从课程训练，到临床应用，再到诊所升级
        </h2>
        <p className="text-slate-400 mb-10">
          配套采购也应更专业
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onCourseGearClick}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            查看课程同款
          </button>
          <button
            onClick={onConsultClick}
            className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            咨询配置方案
          </button>
          <button
            onClick={() => router.push(isAuthenticated ? (canAccessDoctorWorkspace ? `/${locale}/doctor/courses` : `/${locale}/user?tab=courses`) : `/${locale}/auth?redirect=${encodeURIComponent(pathname)}`)}
            className="px-6 py-3 border border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            {isAuthenticated ? '管理采购与学习' : '登录管理采购与学习'}
          </button>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 主组件
// ============================================================================

const CnShopPageClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { addToCart } = useCart();
  const { locale } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();
  
  // 状态
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    purchaseScene: 'all',
    specialty: 'all',
    category: 'all',
    purchaseMode: 'all',
    priceRange: 'all',
    courseRelation: 'all',
    search: '',
  });
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [inquiryProduct, setInquiryProduct] = useState<ExtendedProduct | null>(null);
  const [consultationProduct, setConsultationProduct] = useState<ExtendedProduct | null>(null);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [courseContext, setCourseContext] = useState<CourseContext>({
    source: null,
    courseId: null,
    courseName: null,
    stage: null,
    specialty: null,
    linkType: null,
  });
  
  // 加载产品数据
  useEffect(() => {
    api.getProducts().then(data => {
      const extended = data.map(inferProductMetadata);
      setProducts(extended);
      setLoading(false);
    });
  }, []);
  
  // 读取 URL 参数
  useEffect(() => {
    // 基础筛选参数
    const scene = searchParams.get('purchaseScene') as PurchaseScene;
    const specialty = searchParams.get('specialty');
    const courseRelation = searchParams.get('courseRelation') as CourseRelationType;
    
    // 课程上下文参数
    const source = searchParams.get('source');
    const courseId = searchParams.get('course');
    const stage = searchParams.get('stage');
    const linkType = searchParams.get('linkType') as CourseLinkType;
    
    // 如果来自课程详情页
    if (source === 'course-detail' && courseId) {
      setCourseContext({
        source: 'course-detail',
        courseId,
        courseName: null, // 后续可通过 API 获取
        stage,
        specialty: specialty || null,
        linkType: linkType || null,
      });
      
      // 根据 linkType 自动设置筛选和排序
      let autoScene: PurchaseScene = 'course-gear';
      let autoCourseRelation: CourseRelationType = 'all';
      
      if (linkType === 'core-kit' || linkType === 'module-supplies') {
        autoCourseRelation = 'same-as-course';
      } else if (linkType === 'mentor-picks') {
        autoCourseRelation = 'instructor-pick';
      } else if (linkType === 'next-step') {
        autoCourseRelation = 'post-course';
      }
      
      setFilters(prev => ({
        ...prev,
        purchaseScene: autoScene,
        specialty: specialty || prev.specialty,
        courseRelation: autoCourseRelation,
      }));
    } else {
      // 普通筛选参数
      setFilters(prev => ({
        ...prev,
        purchaseScene: scene && Object.keys(SCENE_CONFIG).includes(scene) ? scene : prev.purchaseScene,
        specialty: specialty || prev.specialty,
        courseRelation: courseRelation || prev.courseRelation,
      }));
    }
  }, [searchParams]);
  
  // 筛选产品
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 状态筛选（不区分大小写）
      if (p.status && p.status.toLowerCase() !== 'published') return false;
      
      // 采购场景筛选
      if (filters.purchaseScene !== 'all' && p.purchaseScene !== filters.purchaseScene) {
        // 特殊处理课程同款
        if (filters.purchaseScene === 'course-gear' && !p.courseRelation) return false;
        if (filters.purchaseScene !== 'course-gear' && p.purchaseScene !== filters.purchaseScene) return false;
      }
      
      // 专科方向筛选
      if (filters.specialty !== 'all') {
        const specMap: Record<string, string[]> = {
          'orthopedics': ['Orthopedics', 'orthopedics', 'ortho'],
          'soft-tissue': ['Soft Tissue', 'soft-tissue', 'soft'],
          'eye': ['Eye', 'eye', 'ophthal'],
          'ultrasound': ['Ultrasound', 'ultrasound', 'imaging'],
          'anesthesia': ['Anesthesia', 'anesthesia'],
          'general': ['General', 'general'],
        };
        const matches = specMap[filters.specialty] || [];
        if (!matches.some(m => p.specialty?.toLowerCase().includes(m.toLowerCase()))) return false;
      }
      
      // 传统分类筛选
      if (filters.category !== 'all') {
        const catMap: Record<string, string[]> = {
          'power-tools': ['PowerTools', 'power'],
          'implants': ['Implants', 'implant'],
          'instruments': ['HandInstruments', 'instrument'],
          'consumables': ['Consumables', 'consumable'],
          'equipment': ['Equipment', 'equipment'],
        };
        const matches = catMap[filters.category] || [];
        if (!matches.some(m => p.group?.toLowerCase().includes(m.toLowerCase()))) return false;
      }
      
      // 采购方式筛选
      if (filters.purchaseMode !== 'all' && p.purchaseModeType !== filters.purchaseMode) return false;
      
      // 客单级别筛选
      if (filters.priceRange !== 'all' && p.priceRangeType !== filters.priceRange) return false;
      
      // 课程关联筛选
      if (filters.courseRelation !== 'all') {
        if (!p.courseRelation || p.courseRelation.type !== filters.courseRelation) return false;
      }
      
      // 搜索
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const searchable = `${p.name} ${p.brand} ${p.description}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      
      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [products, filters, sortBy]);
  
  // 课程同款商品
  const courseGearProducts = useMemo(() => {
    const fromProducts = products.filter(p => p.courseRelation);
    return fromProducts.length > 0 ? fromProducts : SAMPLE_COURSE_GEAR;
  }, [products]);
  
  // 处理筛选变更
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // 处理场景变更
  const handleSceneChange = (scene: PurchaseScene) => {
    setFilters(prev => ({ ...prev, purchaseScene: scene }));
  };
  
  // 清空筛选
  const clearFilters = () => {
    setFilters({
      purchaseScene: 'all',
      specialty: 'all',
      category: 'all',
      purchaseMode: 'all',
      priceRange: 'all',
      courseRelation: 'all',
      search: '',
    });
  };
  
  // 添加购物车
  const handleAddToCart = (product: ExtendedProduct) => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'product',
      currency: 'CNY',
      imageUrl: product.imageUrl,
    });
    
    addNotification({
      id: `cart-${Date.now()}`,
      type: 'system',
      title: '已加入购物车',
      message: `${product.name} 已添加到购物车`,
      read: true,
      timestamp: new Date(),
    });
  };
  
  // 滚动到商品区
  const scrollToProducts = () => {
    document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 切换到课程同款
  const handleCourseGearClick = () => {
    setFilters(prev => ({ ...prev, purchaseScene: 'course-gear' }));
    scrollToProducts();
  };
  
  // 清除课程上下文
  const clearCourseContext = () => {
    setCourseContext({
      source: null,
      courseId: null,
      courseName: null,
      stage: null,
      specialty: null,
      linkType: null,
    });
    // 重置相关筛选
    setFilters(prev => ({
      ...prev,
      purchaseScene: 'all',
      courseRelation: 'all',
    }));
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 课程来源提示条 */}
      <CourseContextBanner
        courseContext={courseContext}
        locale={locale}
        onClose={clearCourseContext}
      />
      
      {/* Hero 区 */}
      <HeroSection
        onSceneClick={scrollToProducts}
        onCourseGearClick={handleCourseGearClick}
        onConsultClick={() => setShowConsultModal(true)}
      />
      
      {/* 采购场景入口 */}
      <SceneEntryCards
        activeScene={filters.purchaseScene}
        onSceneChange={handleSceneChange}
      />
      
      {/* 本周课程同款专区 */}
      <CourseGearSection
        products={courseGearProducts}
        locale={locale}
        onViewAll={handleCourseGearClick}
      />
      
      {/* 当前查看状态条 */}
      <CurrentViewStatus
        filters={filters}
        productCount={filteredProducts.length}
        onClearFilters={clearFilters}
      />
      
      {/* 主商品区 */}
      <section id="product-grid" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-8">
            {/* 左侧筛选器 */}
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              locale={locale}
            />
            
            {/* 右侧货架区 */}
            <div className="flex-1">
              {/* 排序栏 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-emerald-500"
                  >
                    <option value="default">默认排序</option>
                    <option value="price-asc">价格从低到高</option>
                    <option value="price-desc">价格从高到低</option>
                    <option value="name">按名称排序</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* 商品网格 */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">暂无符合条件的商品</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    清空筛选条件
                  </button>
                </div>
              ) : (
                <div className={`grid gap-6 ${
                  viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'
                }`}>
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      locale={locale}
                      isAuthenticated={isAuthenticated}
                      onAddToCart={handleAddToCart}
                      onInquiry={setInquiryProduct}
                      onConsultation={setConsultationProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* 方案型推荐区 */}
      <SolutionRecommendations onConsult={() => setShowConsultModal(true)} />
      
      {/* 信任与服务说明 */}
      <TrustSection />
      
      {/* 底部 CTA */}
      <BottomCTA
        locale={locale}
        isAuthenticated={isAuthenticated}
        onCourseGearClick={handleCourseGearClick}
        onConsultClick={() => setShowConsultModal(true)}
      />
      
      {/* 询价弹窗 */}
      {inquiryProduct && (
        <InquiryModal
          isOpen={!!inquiryProduct}
          onClose={() => setInquiryProduct(null)}
          productId={inquiryProduct.id}
          productName={inquiryProduct.name}
        />
      )}
      
      {/* 咨询弹窗 */}
      {(consultationProduct || showConsultModal) && (
        <ClinicalConsultationModal
          isOpen={!!consultationProduct || showConsultModal}
          onClose={() => {
            setConsultationProduct(null);
            setShowConsultModal(false);
          }}
          productId={consultationProduct?.id || 'general-consultation'}
          productName={consultationProduct?.name || '配置方案咨询'}
        />
      )}

      {/* AI 采购顾问浮动按钮 */}
      <button
        onClick={() => setShowAIAdvisor(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-bold shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-300 hover:-translate-y-0.5 transition-all"
      >
        <Sparkles className="w-5 h-5" />
        <span className="hidden sm:inline">AI 采购顾问</span>
      </button>

      {/* AI 采购顾问弹窗 */}
      <AIShopAdvisor
        isOpen={showAIAdvisor}
        onClose={() => setShowAIAdvisor(false)}
        locale={locale}
      />
    </div>
  );
};

export default CnShopPageClient;
