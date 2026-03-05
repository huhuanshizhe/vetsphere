'use client';
/* eslint-disable @next/next/no-img-element */

/**
 * 中国站商品详情页客户端组件
 * 
 * 不是普通电商详情页，而是围绕医生临床使用、课程训练、诊所升级与采购决策的专业决策页
 * 
 * 模块顺序：
 * 1. 面包屑
 * 2. 课程来源提示条（条件显示）
 * 3. 首屏 Hero（核心决策区）
 * 4. 产品决策摘要
 * 5. 使用场景与适配说明
 * 6. 产品详细说明
 * 7. 关联课程与训练路径
 * 8. 采购方式说明
 * 9. 延伸推荐区
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, ArrowLeft, GraduationCap, ShoppingCart, MessageCircle,
  Users, Target, TrendingUp, Sparkles, CheckCircle2, BookOpen,
  Building2, Wrench, Shield, Package, Truck, HeadphonesIcon,
  ChevronDown, ChevronUp, Star, ArrowRight, Lock
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import ClinicalConsultationModal from '../../components/ClinicalConsultationModal';
import InquiryModal from '../../components/InquiryModal';
import {
  CnProductDetailData,
  CourseContextParams,
  CourseLinkType,
  DoctorStage,
  ClinicStage,
  CourseRelationType,
  ProductTagType,
  DOCTOR_STAGE_CONFIG,
  CLINIC_STAGE_CONFIG,
  PRODUCT_TAG_CONFIG,
  COURSE_RELATION_CONFIG,
} from '../../types/cn-product-detail';
import { getMockProductById } from '../../types/cn-product-mock';

// ============================================================================
// Props
// ============================================================================

interface CnProductDetailClientProps {
  productId: string;
}

// ============================================================================
// 子组件：面包屑
// ============================================================================

const ProductBreadcrumb: React.FC<{
  product: CnProductDetailData;
  locale: string;
}> = ({ product, locale }) => {
  const breadcrumbs = [
    { label: '首页', href: `/${locale}` },
    { label: '临床器械与耗材', href: `/${locale}/shop` },
  ];
  
  // 如果有分类，添加分类层级
  if (product.category) {
    breadcrumbs.push({ 
      label: product.category, 
      href: `/${locale}/shop?category=${encodeURIComponent(product.category)}` 
    });
  }
  
  // 当前商品
  breadcrumbs.push({ label: product.name, href: '' });
  
  return (
    <nav className="py-4 px-4 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto">
        <ol className="flex items-center flex-wrap gap-1 text-sm">
          {breadcrumbs.map((item, idx) => (
            <li key={idx} className="flex items-center">
              {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
              {item.href ? (
                <Link 
                  href={item.href}
                  className="text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-900 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

// ============================================================================
// 子组件：课程来源提示条
// ============================================================================

const CourseSourceBanner: React.FC<{
  courseContext: CourseContextParams;
  locale: string;
  onClose: () => void;
}> = ({ courseContext, locale, onClose }) => {
  const router = useRouter();
  
  if (!courseContext.source || courseContext.source !== 'course-detail') {
    return null;
  }
  
  const courseName = courseContext.courseName || '相关课程';
  
  return (
    <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-b border-rose-100">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                来自课程：{courseName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                你正在查看与该课程相关的器械/耗材
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {courseContext.courseId && (
              <>
                <button
                  onClick={() => router.push(`/${locale}/courses/${courseContext.courseId}`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回课程详情
                </button>
                <button
                  onClick={() => router.push(`/${locale}/courses/${courseContext.courseId}#enrollment`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  查看课程报名
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 子组件：首屏 Hero - 产品图片区
// ============================================================================

const ProductImageGallery: React.FC<{
  images: CnProductDetailData['images'];
  name: string;
}> = ({ images, name }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const displayImages = images.length > 0 
    ? images 
    : [{ url: '/images/placeholder-product.png', alt: name, type: 'main' as const }];
  
  return (
    <div className="space-y-4">
      {/* 主图 */}
      <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-8">
        <img
          src={displayImages[activeIndex].url}
          alt={displayImages[activeIndex].alt || name}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      
      {/* 缩略图 */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                idx === activeIndex 
                  ? 'border-emerald-500' 
                  : 'border-transparent hover:border-slate-200'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt || `${name} 图${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 子组件：首屏 Hero - 决策信息区
// ============================================================================

const ProductHeroInfo: React.FC<{
  product: CnProductDetailData;
  locale: string;
  isAuthenticated: boolean;
  onAddToCart: () => void;
  onInquiry: () => void;
  onConsultation: () => void;
}> = ({ product, locale, isAuthenticated, onAddToCart, onInquiry, onConsultation }) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // 渲染标签
  const renderTags = () => {
    if (!product.tags || product.tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {product.tags.map((tag, idx) => {
          const config = PRODUCT_TAG_CONFIG[tag];
          return (
            <span
              key={idx}
              className={`px-3 py-1 ${config.bgColor} ${config.color} text-xs font-bold rounded-lg`}
            >
              {config.name}
            </span>
          );
        })}
      </div>
    );
  };
  
  // 渲染价格区
  const renderPrice = () => {
    switch (product.pricingMode) {
      case 'direct-price':
        return (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">
              ¥{product.displayPrice?.toLocaleString() || product.price?.toLocaleString()}
            </span>
            <span className="text-sm text-slate-400">含税</span>
          </div>
        );
      case 'login-to-view':
        return isAuthenticated ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">
              ¥{product.displayPrice?.toLocaleString() || product.price?.toLocaleString()}
            </span>
            <span className="text-sm text-slate-400">含税</span>
          </div>
        ) : (
          <button
            onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <Lock className="w-5 h-5" />
            <span className="text-lg font-bold">登录后查看价格</span>
          </button>
        );
      case 'inquiry':
        return (
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-700">支持询价采购</span>
          </div>
        );
      default:
        return null;
    }
  };
  
  // 渲染 CTA 按钮
  const renderCTA = () => {
    switch (product.purchaseType) {
      case 'standard':
        return (
          <div className="flex gap-3">
            {product.pricingMode === 'login-to-view' && !isAuthenticated ? (
              <button
                onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`)}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-bold text-base hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                登录看价
              </button>
            ) : (
              <>
                <button
                  onClick={onAddToCart}
                  className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-bold text-base hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  直接下单
                </button>
                <button
                  onClick={onAddToCart}
                  className="px-6 py-4 border-2 border-emerald-500 text-emerald-600 rounded-xl font-bold text-base hover:bg-emerald-50 transition-all"
                >
                  加入采购清单
                </button>
              </>
            )}
          </div>
        );
      case 'consultative':
        return (
          <div className="flex gap-3">
            {!isAuthenticated ? (
              <button
                onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`)}
                className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-bold text-base hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                登录看价
              </button>
            ) : (
              <button
                onClick={onAddToCart}
                className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-bold text-base hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                加入采购清单
              </button>
            )}
            <button
              onClick={onInquiry}
              className="flex-1 py-4 border-2 border-blue-500 text-blue-600 rounded-xl font-bold text-base hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              询价采购
            </button>
          </div>
        );
      case 'solution':
        return (
          <div className="flex gap-3">
            <button
              onClick={onConsultation}
              className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Target className="w-5 h-5" />
              获取配置建议
            </button>
            <button
              onClick={onConsultation}
              className="flex-1 py-4 border-2 border-slate-900 text-slate-900 rounded-xl font-bold text-base hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              咨询方案
            </button>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 标签 */}
      {renderTags()}
      
      {/* 品牌 */}
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
        {product.brand}
      </p>
      
      {/* 商品名称 */}
      <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
        {product.name}
      </h1>
      
      {/* 一句话定位 */}
      {product.oneLinePositioning && (
        <p className="text-base text-slate-600 leading-relaxed">
          {product.oneLinePositioning}
        </p>
      )}
      
      {/* 关键参数 */}
      {product.keySpecs && product.keySpecs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {product.keySpecs.slice(0, 4).map((spec, idx) => (
            <div key={idx} className="px-3 py-2 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">{spec.label}</p>
              <p className="text-sm font-bold text-slate-700">{spec.value}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* 使用场景 */}
      {product.useScenarios && product.useScenarios.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">使用场景：</span>
          <span className="text-slate-700 font-medium">
            {product.useScenarios.slice(0, 3).join('、')}
          </span>
        </div>
      )}
      
      {/* 适合对象 */}
      {product.targetUsers && product.targetUsers.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">适合对象：</span>
          <span className="text-slate-700 font-medium">
            {product.targetUsers.join('、')}
          </span>
        </div>
      )}
      
      {/* 价格区 */}
      <div className="pt-4 border-t border-slate-100">
        {renderPrice()}
      </div>
      
      {/* CTA 按钮 */}
      <div className="pt-2">
        {renderCTA()}
      </div>
      
      {/* 补充服务说明 */}
      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
        {product.deliveryInfo && (
          <div className="flex items-center gap-2 text-slate-500">
            <Truck className="w-4 h-4" />
            <span>{product.deliveryInfo}</span>
          </div>
        )}
        {product.afterSalesInfo && (
          <div className="flex items-center gap-2 text-slate-500">
            <Shield className="w-4 h-4" />
            <span>{product.afterSalesInfo}</span>
          </div>
        )}
        {product.supportsPlanConsultation && (
          <div className="flex items-center gap-2 text-slate-500">
            <HeadphonesIcon className="w-4 h-4" />
            <span>支持顾问协助选型</span>
          </div>
        )}
        {product.mentorRecommended && (
          <div className="flex items-center gap-2 text-slate-500">
            <GraduationCap className="w-4 h-4" />
            <span>支持课程配套推荐</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 子组件：首屏 Hero 整合
// ============================================================================

const ProductHero: React.FC<{
  product: CnProductDetailData;
  locale: string;
  isAuthenticated: boolean;
  onAddToCart: () => void;
  onInquiry: () => void;
  onConsultation: () => void;
}> = (props) => {
  return (
    <section className="bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 左侧：产品展示 */}
          <ProductImageGallery 
            images={props.product.images} 
            name={props.product.name} 
          />
          
          {/* 右侧：决策信息 */}
          <ProductHeroInfo {...props} />
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 子组件：产品决策摘要
// ============================================================================

const ProductDecisionSummary: React.FC<{
  product: CnProductDetailData;
}> = ({ product }) => {
  const summary = product.decisionSummary;
  
  if (!summary) return null;
  
  const items = [
    { 
      icon: <Users className="w-5 h-5" />, 
      label: '适合谁', 
      value: summary.suitableFor,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    { 
      icon: <Target className="w-5 h-5" />, 
      label: '解决什么问题', 
      value: summary.solvesWhat,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    { 
      icon: <Sparkles className="w-5 h-5" />, 
      label: '为什么推荐', 
      value: summary.whyRecommend,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    { 
      icon: <TrendingUp className="w-5 h-5" />, 
      label: '下一步建议', 
      value: summary.nextStep,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ].filter(item => item.value);
  
  if (items.length === 0) return null;
  
  return (
    <section className="py-8 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-xl p-5 border border-slate-100"
            >
              <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 子组件：使用场景与适配说明
// ============================================================================

const ProductScenarioFit: React.FC<{
  product: CnProductDetailData;
}> = ({ product }) => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-900 mb-8">使用场景与适配说明</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* 使用场景 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-4">使用场景</h3>
            <ul className="space-y-2">
              {(product.useScenarios || ['日常门诊接诊']).map((scenario, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {scenario}
                </li>
              ))}
            </ul>
          </div>
          
          {/* 适合的医生阶段 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-4">适合的医生阶段</h3>
            <div className="space-y-2">
              {(product.doctorStages || ['clinical-basics'] as DoctorStage[]).map((stage, idx) => {
                const config = DOCTOR_STAGE_CONFIG[stage];
                const isPrimary = stage === product.primaryDoctorStage;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}
                  >
                    <span className={`text-sm font-bold ${config.color}`}>
                      {config.name}
                    </span>
                    {isPrimary && (
                      <span className="px-2 py-0.5 bg-white text-xs font-bold text-slate-600 rounded">
                        主推荐
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 适合的诊所阶段 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-4">适合的诊所阶段</h3>
            <div className="space-y-2">
              {(product.clinicStages || ['basic-clinic'] as ClinicStage[]).map((stage, idx) => {
                const config = CLINIC_STAGE_CONFIG[stage];
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}
                  >
                    <span className={`text-sm font-bold ${config.color}`}>
                      {config.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 子组件：产品详细说明
// ============================================================================

const ProductDetailSections: React.FC<{
  product: CnProductDetailData;
}> = ({ product }) => {
  const [expandedParams, setExpandedParams] = useState(false);
  
  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-900 mb-8">产品详细说明</h2>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 产品功能与用途 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              产品功能与用途
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {product.functionsAndUsage || product.shortDescription}
            </p>
          </div>
          
          {/* 核心参数 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              核心参数
            </h3>
            <div className="space-y-2">
              {(product.coreParameters || product.keySpecs || [])
                .slice(0, expandedParams ? undefined : 6)
                .map((param, idx) => (
                  <div 
                    key={idx}
                    className="flex justify-between py-2 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-sm text-slate-500">{param.label}</span>
                    <span className="text-sm font-medium text-slate-700">{param.value}</span>
                  </div>
                ))}
            </div>
            {(product.coreParameters || product.keySpecs || []).length > 6 && (
              <button
                onClick={() => setExpandedParams(!expandedParams)}
                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {expandedParams ? '收起' : '展开全部参数'}
                {expandedParams ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
          
          {/* 使用建议 */}
          {product.usageSuggestions && product.usageSuggestions.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                使用建议
              </h3>
              <ul className="space-y-3">
                {product.usageSuggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 配套建议 */}
          {product.bundleSuggestions && product.bundleSuggestions.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                配套建议
              </h3>
              <ul className="space-y-3">
                {product.bundleSuggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* 服务与支持 */}
        {product.supportServices && product.supportServices.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-rose-600" />
              服务与支持
            </h3>
            <div className="flex flex-wrap gap-3">
              {product.supportServices.map((service, idx) => (
                <span 
                  key={idx}
                  className="px-4 py-2 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ============================================================================
// 子组件：关联课程与训练路径
// ============================================================================

const RelatedCoursesSection: React.FC<{
  product: CnProductDetailData;
  locale: string;
  courseContext: CourseContextParams;
}> = ({ product, locale, courseContext }) => {
  const router = useRouter();
  
  if (!product.relatedCourses || product.relatedCourses.length === 0) {
    return null;
  }
  
  // 排序：来源课程优先
  const sortedCourses = [...product.relatedCourses].sort((a, b) => {
    // 当前来源课程排第一
    if (courseContext.courseId) {
      if (a.id === courseContext.courseId) return -1;
      if (b.id === courseContext.courseId) return 1;
    }
    // 标记为来源课程的排第二
    if (a.isSourceCourse && !b.isSourceCourse) return -1;
    if (!a.isSourceCourse && b.isSourceCourse) return 1;
    return 0;
  });
  
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-8">
          <GraduationCap className="w-6 h-6 text-rose-600" />
          <h2 className="text-xl font-bold text-slate-900">关联课程与训练路径</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCourses.map((course, idx) => {
            const relationConfig = COURSE_RELATION_CONFIG[course.relationType];
            const stageConfig = DOCTOR_STAGE_CONFIG[course.stage];
            const isSource = course.id === courseContext.courseId || course.isSourceCourse;
            
            return (
              <div
                key={course.id}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all group ${
                  isSource ? 'border-rose-200 ring-2 ring-rose-100' : 'border-slate-100'
                }`}
              >
                {/* 来源标记 */}
                {isSource && (
                  <div className="bg-rose-500 text-white text-xs font-bold text-center py-1">
                    当前来源课程
                  </div>
                )}
                
                {/* 课程图片 */}
                <div className="aspect-video bg-slate-100 overflow-hidden">
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-0.5 ${stageConfig.bgColor} ${stageConfig.color} text-xs font-bold rounded`}>
                      {stageConfig.name}
                    </span>
                    {course.specialty && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded">
                        {course.specialty}
                      </span>
                    )}
                  </div>
                  
                  {/* 课程名称 */}
                  <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {course.title}
                  </h3>
                  
                  {/* 关联类型 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded">
                      {relationConfig.name}
                    </span>
                  </div>
                  
                  {/* 关联说明 */}
                  {course.relationNote && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                      {course.relationNote}
                    </p>
                  )}
                  
                  {/* CTA */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/${locale}/courses/${course.slug || course.id}`)}
                      className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
                    >
                      查看课程详情
                    </button>
                    <button
                      onClick={() => router.push(`/${locale}/courses/${course.slug || course.id}#enrollment`)}
                      className="flex-1 py-2 border border-emerald-500 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-colors"
                    >
                      报名课程
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 子组件：采购方式说明
// ============================================================================

const PurchaseGuideSection: React.FC<{
  product: CnProductDetailData;
}> = ({ product }) => {
  // 根据采购类型显示不同流程
  const renderPurchaseFlow = () => {
    switch (product.purchaseType) {
      case 'standard':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 mb-4">可直接下单型</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">1</div>
                <span className="text-sm text-slate-600">登录后查看价格</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">2</div>
                <span className="text-sm text-slate-600">直接下单 / 加入采购清单</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">3</div>
                <span className="text-sm text-slate-600">支付发货</span>
              </div>
            </div>
          </div>
        );
      case 'consultative':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 mb-4">询价采购型</h4>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                <span className="text-sm text-slate-600">提交需求</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                <span className="text-sm text-slate-600">顾问确认配置</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">3</div>
                <span className="text-sm text-slate-600">报价与交付沟通</span>
              </div>
            </div>
          </div>
        );
      case 'solution':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 mb-4">方案型采购</h4>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">1</div>
                <span className="text-sm text-slate-600">提交诊所情况</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">2</div>
                <span className="text-sm text-slate-600">获取配置建议</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</div>
                <span className="text-sm text-slate-600">形成采购方案</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-900 mb-8">如何购买这类产品</h2>
        
        <div className="bg-white rounded-2xl p-8 border border-slate-100">
          {renderPurchaseFlow()}
          
          {/* 补充说明 */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {product.minOrderUnit && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">最小采购单位：</span>
                <span className="font-medium text-slate-700">{product.minOrderUnit}</span>
              </div>
            )}
            {product.supportsBulkPurchase && (
              <div className="flex items-center gap-2 text-sm">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <span className="text-emerald-600 font-medium">支持批量采购</span>
              </div>
            )}
            {product.supportsPlanConsultation && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-slate-400" />
                <span className="text-emerald-600 font-medium">适合开业方案</span>
              </div>
            )}
            {product.requiresAdvisorSupport && (
              <div className="flex items-center gap-2 text-sm">
                <HeadphonesIcon className="w-4 h-4 text-slate-400" />
                <span className="text-emerald-600 font-medium">需顾问协助选型</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 子组件：延伸推荐区
// ============================================================================

const ProductRecommendationsSection: React.FC<{
  product: CnProductDetailData;
  locale: string;
}> = ({ product, locale }) => {
  const router = useRouter();
  
  const hasBundle = product.bundleProducts && product.bundleProducts.length > 0;
  const hasAlternatives = product.alternatives && product.alternatives.length > 0;
  const hasUpgrades = product.upgradeRecommendations && product.upgradeRecommendations.length > 0;
  
  if (!hasBundle && !hasAlternatives && !hasUpgrades) {
    return null;
  }
  
  const renderProductCard = (item: typeof product.bundleProducts extends (infer T)[] | undefined ? T : never) => {
    if (!item) return null;
    
    return (
      <div
        key={item.id}
        onClick={() => router.push(`/${locale}/shop/${item.slug || item.id}`)}
        className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
      >
        {/* 标签 */}
        {item.tag && (
          <div className="px-4 pt-3">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">
              {item.tag}
            </span>
          </div>
        )}
        
        {/* 图片 */}
        <div className="aspect-square mx-4 mt-2 bg-slate-50 rounded-lg flex items-center justify-center p-4">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
            />
          ) : (
            <Package className="w-10 h-10 text-slate-300" />
          )}
        </div>
        
        {/* 信息 */}
        <div className="p-4">
          <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {item.name}
          </h4>
          {item.shortReason && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              {item.shortReason}
            </p>
          )}
          <div className="mt-3">
            {item.pricingMode === 'direct-price' && item.displayPrice ? (
              <span className="text-base font-bold text-emerald-600">
                ¥{item.displayPrice.toLocaleString()}
              </span>
            ) : item.pricingMode === 'inquiry' ? (
              <span className="text-sm text-slate-500">询价</span>
            ) : (
              <span className="text-sm text-blue-600">登录看价</span>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 space-y-12">
        {/* 常搭配购买 */}
        {hasBundle && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              常搭配购买
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.bundleProducts!.map(renderProductCard)}
            </div>
          </div>
        )}
        
        {/* 同场景替代选择 */}
        {hasAlternatives && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              同场景替代选择
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.alternatives!.map(renderProductCard)}
            </div>
          </div>
        )}
        
        {/* 下一步升级推荐 */}
        {hasUpgrades && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              下一步升级推荐
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.upgradeRecommendations!.map(renderProductCard)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ============================================================================
// 主组件
// ============================================================================

const CnProductDetailClient: React.FC<CnProductDetailClientProps> = ({ productId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();
  
  const locale = pathname.split('/')[1] || 'zh';
  
  // 状态
  const [product, setProduct] = useState<CnProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [courseContext, setCourseContext] = useState<CourseContextParams>({
    source: null,
    courseId: null,
    courseName: null,
    stage: null,
    specialty: null,
    linkType: null,
  });
  
  // 解析 URL 参数
  useEffect(() => {
    const source = searchParams.get('source');
    const courseId = searchParams.get('course');
    const stage = searchParams.get('stage');
    const specialty = searchParams.get('specialty');
    const linkType = searchParams.get('linkType') as CourseLinkType;
    
    if (source === 'course-detail' && courseId) {
      setCourseContext({
        source: 'course-detail',
        courseId,
        courseName: null, // 可后续通过 API 获取
        stage,
        specialty,
        linkType,
      });
    }
  }, [searchParams]);
  
  // 加载商品数据
  useEffect(() => {
    // 先尝试获取 Mock 数据
    const mockProduct = getMockProductById(productId);
    if (mockProduct) {
      setProduct(mockProduct);
      setLoading(false);
      return;
    }
    
    // TODO: 实际 API 调用
    // 暂时使用第一个 Mock 数据作为默认
    import('../../types/cn-product-mock').then(({ MOCK_PRODUCT_STANDARD }) => {
      setProduct({
        ...MOCK_PRODUCT_STANDARD,
        id: productId,
        slug: productId,
      });
      setLoading(false);
    });
  }, [productId]);
  
  // 添加购物车
  const handleAddToCart = () => {
    if (!product) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.displayPrice || product.price || 0,
      currency: 'CNY',
      imageUrl: product.images[0]?.url || '',
      type: 'product',
      quantity: 1,
    });
    
    addNotification({
      id: `cart-${Date.now()}`,
      type: 'system',
      title: '已加入采购清单',
      message: `${product.name} 已添加到采购清单`,
      read: true,
      timestamp: new Date(),
    });
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
  };
  
  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // 未找到商品
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-black text-slate-900">商品未找到</h1>
        <p className="text-slate-500">您访问的商品不存在或已下架</p>
        <Link
          href={`/${locale}/shop`}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
        >
          返回商城
        </Link>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. 面包屑 */}
      <ProductBreadcrumb product={product} locale={locale} />
      
      {/* 2. 课程来源提示条 */}
      <CourseSourceBanner
        courseContext={courseContext}
        locale={locale}
        onClose={clearCourseContext}
      />
      
      {/* 3. 首屏 Hero */}
      <ProductHero
        product={product}
        locale={locale}
        isAuthenticated={isAuthenticated}
        onAddToCart={handleAddToCart}
        onInquiry={() => setShowInquiryModal(true)}
        onConsultation={() => setShowConsultationModal(true)}
      />
      
      {/* 4. 产品决策摘要 */}
      <ProductDecisionSummary product={product} />
      
      {/* 5. 使用场景与适配说明 */}
      <ProductScenarioFit product={product} />
      
      {/* 6. 产品详细说明 */}
      <ProductDetailSections product={product} />
      
      {/* 7. 关联课程与训练路径 */}
      <RelatedCoursesSection
        product={product}
        locale={locale}
        courseContext={courseContext}
      />
      
      {/* 8. 采购方式说明 */}
      <PurchaseGuideSection product={product} />
      
      {/* 9. 延伸推荐区 */}
      <ProductRecommendationsSection product={product} locale={locale} />
      
      {/* 询价弹窗 */}
      {showInquiryModal && (
        <InquiryModal
          isOpen={showInquiryModal}
          onClose={() => setShowInquiryModal(false)}
          productId={product.id}
          productName={product.name}
        />
      )}
      
      {/* 咨询弹窗 */}
      {showConsultationModal && (
        <ClinicalConsultationModal
          isOpen={showConsultationModal}
          onClose={() => setShowConsultationModal(false)}
          productId={product.id}
          productName={product.name}
        />
      )}
    </div>
  );
};

export default CnProductDetailClient;
