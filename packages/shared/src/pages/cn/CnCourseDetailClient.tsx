'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Share2, Calendar, MapPin, Clock, Users, Award,
  GraduationCap, Stethoscope, Target, Briefcase, BookOpen,
  CheckCircle2, ArrowRight, Play, ChevronDown, ChevronUp,
  Sparkles, TrendingUp, Star, ShoppingCart, MessageCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { Course, CourseFormat, CourseProductRelation } from '../../types';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import CourseEquipmentByModule from '../../components/CourseEquipmentByModule';
import ClinicalConsultationModal from '../../components/ClinicalConsultationModal';
import InquiryModal from '../../components/InquiryModal';

// ============================================================================
// 类型定义
// ============================================================================

interface CnCourseDetailClientProps {
  courseId: string;
}

/** 课程阶段 */
type CourseStage = 'certification' | 'clinical-basics' | 'specialty-advanced' | 'advanced-practice' | 'career-growth';

/** 扩展课程数据 */
interface ExtendedCourse extends Course {
  stage?: CourseStage;
  stageLabel?: string;
  subcategory?: string;
  formatLabel?: string;
  levelCode?: string;
  levelLabel?: string;
  audiences?: string[];
  audienceLabels?: string[];
  learningGoals?: string[];
  targetDescription?: string;
  prerequisites?: string[];
  skillOutcomes?: string[];
  nextSteps?: string[];
}

// ============================================================================
// 常量定义
// ============================================================================

/** 阶段配置 */
const STAGE_CONFIG: Record<CourseStage, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  'certification': {
    name: '考证入行',
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  'clinical-basics': {
    name: '临床基础',
    icon: <Stethoscope className="w-4 h-4" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  'specialty-advanced': {
    name: '专科进阶',
    icon: <Target className="w-4 h-4" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
  'advanced-practice': {
    name: '高端实操',
    icon: <Award className="w-4 h-4" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  'career-growth': {
    name: '事业发展',
    icon: <Briefcase className="w-4 h-4" />,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
  },
};

/** 授课形式配置 */
const FORMAT_CONFIG: Record<string, string> = {
  'recorded': '录播课程',
  'live': '直播课程',
  'offline': '线下实操',
  'bootcamp': '训练营',
  'case-study': '病例讨论',
  'mentor-qa': '导师答疑',
  'systematic': '系统班',
};

/** 难度等级配置 */
const LEVEL_CONFIG: Record<string, string> = {
  'L1': 'L1 入门',
  'L2': 'L2 基础',
  'L3': 'L3 进阶',
  'L4': 'L4 专科',
  'L5': 'L5 高端实操',
};

/** 适合人群配置 */
const AUDIENCE_CONFIG: Record<string, string> = {
  'student': '在校生/应届',
  'new-hire': '新入职医生',
  '1-3-years': '1-3年临床',
  '3-plus-years': '3年以上全科',
  'specialist': '专科发展中',
  'entrepreneur': '创业准备人群',
};

/** 专科方向中文映射 */
const SPECIALTY_ZH: Record<string, string> = {
  'Orthopedics': '骨科',
  'Joint Surgery': '关节外科',
  'Soft Tissue': '软组织外科',
  'Eye': '眼科',
  'Ophthalmology': '眼科',
  'Ultrasound': '超声',
  'Imaging': '影像',
  'Anesthesia': '麻醉',
  'Internal': '内科',
  'Emergency': '急诊',
  'Dentistry': '口腔',
  'Dermatology': '皮肤',
  'Neurosurgery': '神经外科',
  'General': '综合临床',
};

// ============================================================================
// 辅助函数
// ============================================================================

/** 推断课程分类元数据 */
function inferCourseMetadata(course: Course): ExtendedCourse {
  const title = (course.title_zh || course.title).toLowerCase();
  const specialty = course.specialty;
  
  // 推断阶段
  let stage: CourseStage = 'specialty-advanced';
  let levelCode = 'L3';
  let format: CourseFormat = 'offline';
  let audiences: string[] = ['1-3-years', '3-plus-years'];
  let learningGoals: string[] = [];
  let skillOutcomes: string[] = [];
  let prerequisites: string[] = [];
  let nextSteps: string[] = [];
  let targetDescription = '';
  
  // 根据课程特征推断
  if (title.includes('workshop') || title.includes('wet-lab') || title.includes('实操') || title.includes('训练营') || course.level === 'Master') {
    stage = 'advanced-practice';
    levelCode = course.level === 'Master' ? 'L5' : 'L4';
    format = 'offline';
    learningGoals = ['practice-breakthrough'];
    audiences = ['3-plus-years', 'specialist'];
    targetDescription = '适合有3年以上全科经验、希望在专科实操方面突破的医生';
    prerequisites = ['具备扎实的临床基础', '有独立处理常见病例的能力', '对该专科方向有学习热情'];
    skillOutcomes = ['掌握核心手术技术要点', '能独立完成标准术式', '学会处理常见并发症', '建立规范的术后护理流程'];
    nextSteps = ['参加更高阶专科训练', '临床独立开展手术', '考虑专科认证考核'];
  } else if (title.includes('基础') || course.level === 'Basic') {
    stage = 'clinical-basics';
    levelCode = 'L2';
    learningGoals = ['onboarding', 'consultation'];
    audiences = ['new-hire', '1-3-years'];
    targetDescription = '适合新入职医生或临床基础薄弱、希望系统提升的医生';
    prerequisites = ['已获得执业兽医资格证', '有基本的理论知识基础'];
    skillOutcomes = ['掌握标准接诊流程', '能独立处理常见病例', '学会基础检验解读', '建立规范病历书写习惯'];
    nextSteps = ['选择专科方向深入学习', '参加专科进阶课程', '积累临床病例经验'];
  } else if (course.level === 'Advanced' || course.level === 'Intermediate') {
    stage = 'specialty-advanced';
    levelCode = 'L4';
    learningGoals = ['specialty-transition'];
    audiences = ['1-3-years', '3-plus-years'];
    targetDescription = '适合有1-3年临床经验、准备往专科方向发展的医生';
    prerequisites = ['有稳定的临床工作经验', '对该专科领域有兴趣', '具备基本的专科知识'];
    skillOutcomes = ['系统掌握专科诊断思路', '能处理中等难度病例', '学会专科设备使用', '了解前沿技术发展'];
    nextSteps = ['参加高端实操训练', '积累专科病例', '考虑国际认证培训'];
  }
  
  // 专科中文名
  const specialtyZh = SPECIALTY_ZH[specialty] || specialty;
  
  return {
    ...course,
    stage,
    stageLabel: STAGE_CONFIG[stage].name,
    subcategory: specialtyZh,
    format,
    formatLabel: FORMAT_CONFIG[format] || format,
    levelCode,
    levelLabel: LEVEL_CONFIG[levelCode] || levelCode,
    audiences,
    audienceLabels: audiences.map(a => AUDIENCE_CONFIG[a] || a),
    learningGoals,
    targetDescription,
    prerequisites,
    skillOutcomes,
    nextSteps,
  };
}

/** 生成商城跳转 URL（带课程上下文） */
function buildShopUrl(
  locale: string,
  course: ExtendedCourse,
  linkType: 'core-kit' | 'module-supplies' | 'mentor-picks' | 'next-step'
): string {
  const params = new URLSearchParams({
    source: 'course-detail',
    course: course.id,
    stage: course.stage || 'specialty-advanced',
    specialty: mapSpecialtyToSlug(course.specialty),
    linkType,
  });
  return `/${locale}/shop?${params.toString()}`;
}

/** 专科方向映射到 URL slug */
function mapSpecialtyToSlug(specialty: string): string {
  const map: Record<string, string> = {
    'Orthopedics': 'orthopedics',
    'Soft Tissue': 'soft-tissue',
    'Eye Surgery': 'eye',
    'Ophthalmology': 'eye',
    'Ultrasound': 'ultrasound',
    'Neurosurgery': 'general',
    'Exotics': 'general',
  };
  return map[specialty] || 'general';
}

// ============================================================================
// 子组件
// ============================================================================

/** Hero 区分类标签组 */
const HeroTags: React.FC<{ course: ExtendedCourse }> = ({ course }) => {
  const stageConfig = course.stage ? STAGE_CONFIG[course.stage] : null;
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* 一级分类 */}
      {stageConfig && (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${stageConfig.bgColor} ${stageConfig.color} text-xs font-bold rounded-lg`}>
          {stageConfig.icon}
          {stageConfig.name}
        </span>
      )}
      {/* 专科方向 */}
      <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur">
        {course.subcategory}
      </span>
      {/* 授课形式 */}
      <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur">
        {course.formatLabel}
      </span>
      {/* 难度等级 */}
      <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur">
        {course.levelLabel}
      </span>
    </div>
  );
};

/** 适合人群标签 */
const AudienceTags: React.FC<{ audiences: string[] }> = ({ audiences }) => (
  <div className="flex items-center gap-2 mt-4">
    <Users className="w-4 h-4 text-white/70" />
    <span className="text-white/70 text-sm">适合：</span>
    <div className="flex flex-wrap gap-2">
      {audiences.map((label, idx) => (
        <span key={idx} className="px-2 py-0.5 bg-white/10 text-white text-xs font-medium rounded">
          {label}
        </span>
      ))}
    </div>
  </div>
);

/** 课程决策摘要（紧凑版，合并适合谁/核心收获/下一步） */
const CourseDecisionSummary: React.FC<{ 
  course: ExtendedCourse;
  relatedCourses: Course[];
  locale: string;
}> = ({ course, relatedCourses, locale }) => {
  // 生成适合人群简述
  const audienceSummary = course.audienceLabels?.slice(0, 2).join('、') || '全阶段医生';
  
  // 生成核心收获简述（取第一条或综合）
  const outcomeSummary = course.skillOutcomes?.[0] || '掌握核心技术要点，提升临床能力';
  
  // 生成下一步简述（取第一条）
  const nextStepSummary = course.nextSteps?.[0] || '继续深入学习，积累临床经验';
  
  // 是否有关联课程可推荐
  const hasRelatedCourse = relatedCourses.length > 0;
  const relatedCourse = relatedCourses[0];

  return (
    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
      <div className="space-y-3">
        {/* 适合人群 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">适合人群</span>
            <p className="text-sm text-slate-700 mt-0.5">{audienceSummary}</p>
          </div>
        </div>
        
        {/* 核心收获 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">核心收获</span>
            <p className="text-sm text-slate-700 mt-0.5">{outcomeSummary}</p>
          </div>
        </div>
        
        {/* 推荐下一步 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">推荐下一步</span>
            <p className="text-sm text-slate-700 mt-0.5">
              {nextStepSummary}
              {hasRelatedCourse && (
                <Link 
                  href={`/${locale}/courses/${relatedCourse.id}`}
                  className="ml-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  查看进阶课程 →
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** 导师推荐工具（独立模块） */
const InstructorToolsSection: React.FC<{
  relations: CourseProductRelation[];
  locale: string;
  instructorName: string;
  course: ExtendedCourse;
}> = ({ relations, locale, instructorName, course }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [consultationProduct, setConsultationProduct] = useState<CourseProductRelation | null>(null);

  const instructorItems = relations.filter(r => r.relationType === 'instructor').slice(0, 2);
  const shopUrl = buildShopUrl(locale, course, 'mentor-picks');

  if (instructorItems.length === 0) return null;

  const handleAddToCart = (relation: CourseProductRelation) => {
    const product = relation.product;
    if (!product || !isAuthenticated) {
      if (!isAuthenticated) router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: 'CNY',
      imageUrl: product.imageUrl,
      type: 'product',
      quantity: 1,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  return (
    <>
      <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">本课讲师常用工具</h3>
            <span className="text-sm text-slate-500">· {instructorName}</span>
          </div>
          <Link
            href={shopUrl}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            查看全部讲师推荐
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {instructorItems.map(relation => {
            const product = relation.product;
            if (!product) return null;
            const mode = product.purchaseMode || 'direct';
            const isAdded = addedId === product.id;

            return (
              <div
                key={relation.id}
                className="flex gap-4 bg-white rounded-xl p-4 border border-amber-100 hover:shadow-md transition-all group"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 cursor-pointer"
                  onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-amber-600 transition-colors"
                    onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                  >
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{product.brand}</p>
                  <div className="flex items-center justify-between mt-2">
                    {mode === 'inquiry' ? (
                      <span className="text-xs font-bold text-blue-600">询价</span>
                    ) : isAuthenticated ? (
                      <span className="text-sm font-black text-amber-600">¥{product.price?.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-slate-400">登录查看价格</span>
                    )}
                    {mode === 'direct' && (
                      <button
                        onClick={() => handleAddToCart(relation)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                      >
                        {isAdded ? '已添加' : '加入购物车'}
                      </button>
                    )}
                    {mode === 'inquiry' && (
                      <button
                        onClick={() => setConsultationProduct(relation)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all"
                      >
                        申请报价
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {consultationProduct?.product && (
        <ClinicalConsultationModal
          isOpen={!!consultationProduct}
          onClose={() => setConsultationProduct(null)}
          productId={consultationProduct.product.id}
          productName={consultationProduct.product.name}
        />
      )}
    </>
  );
};

/** 侧栏核心器械（精简版） */
const CoreEquipmentSidebar: React.FC<{
  relations: CourseProductRelation[];
  locale: string;
  course: ExtendedCourse;
}> = ({ relations, locale, course }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  // 仅展示 required 类型，最多5个
  const coreItems = relations
    .filter(r => r.relationshipType === 'required' && r.relationType !== 'instructor')
    .slice(0, 5);

  const totalCount = relations.filter(r => r.relationType !== 'instructor').length;

  if (coreItems.length === 0) return null;

  const handleAddToCart = (relation: CourseProductRelation) => {
    const product = relation.product;
    if (!product || !isAuthenticated) {
      if (!isAuthenticated) router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: 'CNY',
      imageUrl: product.imageUrl,
      type: 'product',
      quantity: 1,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  // 生成商城跳转链接
  const shopUrl = buildShopUrl(locale, course, 'core-kit');

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-slate-500" />
        本课核心器械
      </h3>

      <div className="space-y-3">
        {coreItems.map(relation => {
          const product = relation.product;
          if (!product) return null;
          const isAdded = addedId === product.id;

          return (
            <div
              key={relation.id}
              className="flex gap-3 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-pointer"
                onClick={() => router.push(`/${locale}/shop/${product.id}`)}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => router.push(`/${locale}/shop/${product.id}`)}
                >
                  {product.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  {isAuthenticated ? (
                    <span className="text-xs font-bold text-emerald-600">¥{product.price?.toLocaleString()}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">登录查看</span>
                  )}
                  <button
                    onClick={() => handleAddToCart(relation)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                      isAdded
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {isAdded ? '已添加' : '加购'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalCount > coreItems.length && (
        <Link
          href={shopUrl}
          className="mt-4 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors py-2"
        >
          查看本课核心器械 ({totalCount})
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
};

/** 课后延伸推荐 */
const PostCourseRecommendations: React.FC<{
  relations: CourseProductRelation[];
  relatedCourses: Course[];
  locale: string;
  course: ExtendedCourse;
}> = ({ relations, relatedCourses, locale, course }) => {
  const router = useRouter();
  
  // 推荐器械（非 required 类型）
  const recommendedItems = relations
    .filter(r => r.relationshipType === 'recommended' || r.relationshipType === 'mentioned')
    .slice(0, 3);

  // 生成商城跳转链接
  const shopUrl = buildShopUrl(locale, course, 'next-step');

  if (recommendedItems.length === 0 && relatedCourses.length === 0) return null;

  return (
    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">学完这门课后，继续提升</h2>
        </div>
        {recommendedItems.length > 0 && (
          <Link
            href={shopUrl}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            查看更多进阶器械
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* 推荐器械 */}
      {recommendedItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-600 mb-4">延伸推荐器械</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {recommendedItems.map(relation => {
              const product = relation.product;
              if (!product) return null;
              return (
                <Link
                  key={relation.id}
                  href={`/${locale}/shop/${product.id}`}
                  className="group bg-white rounded-xl p-4 border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-3">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded mb-2 inline-block">
                    推荐
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{product.brand}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 关联课程 */}
      {relatedCourses.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 mb-4">进阶培训课程</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {relatedCourses.slice(0, 2).map(rc => (
              <Link
                key={rc.id}
                href={`/${locale}/courses/${rc.id}`}
                className="group flex gap-4 bg-white rounded-xl p-4 border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                  {rc.imageUrl && (
                    <img src={rc.imageUrl} alt={rc.title_zh || rc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                      {SPECIALTY_ZH[rc.specialty] || rc.specialty}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {rc.title_zh || rc.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {rc.location?.city} · {rc.startDate?.split('-').slice(0, 2).join('/')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** 报名卡（优化版） */
const EnrollmentCard: React.FC<{
  course: ExtendedCourse;
  locale: string;
  isAuthenticated: boolean;
  onRegister: () => void;
}> = ({ course, locale, isAuthenticated, onRegister }) => {
  const pathname = usePathname();
  // 判断是否满员
  const isFull = course.maxCapacity ? (course.enrolledCount || 0) >= course.maxCapacity : false;
  // 判断是否名额紧张（超过80%）
  const capacityPercent = course.maxCapacity ? ((course.enrolledCount || 0) / course.maxCapacity) * 100 : 0;
  const isLimitedSeats = capacityPercent >= 80 && !isFull;
  
  // 报名状态文案
  const getEnrollmentStatus = () => {
    if (isFull) return { text: '已满员', color: 'text-red-600' };
    if (isLimitedSeats) return { text: '名额紧张', color: 'text-amber-600' };
    return { text: '正在开放报名', color: 'text-emerald-600' };
  };
  
  const status = getEnrollmentStatus();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="font-bold text-lg mb-4">课程报名</h3>
      
      {/* 价格 */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
        <span className="text-sm text-slate-500">课程费用</span>
        {isAuthenticated ? (
          <span className="text-2xl font-black text-emerald-600">
            ¥{(course.price_cny || course.price).toLocaleString()}
          </span>
        ) : (
          <button 
            onClick={() => window.location.href = `/${locale}/auth?redirect=${encodeURIComponent(pathname)}`}
            className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1"
          >
            🔒 登录查看
          </button>
        )}
      </div>

      {/* 报名状态（稳妥表达） */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">班型</span>
          <span className="font-medium text-slate-900">小班制（限额）</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">报名状态</span>
          <span className={`font-bold ${status.color}`}>{status.text}</span>
        </div>
        {course.enrollmentDeadline && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">报名截止</span>
            <span className="font-medium text-slate-900">{course.enrollmentDeadline.split('T')[0]}</span>
          </div>
        )}
      </div>

      {/* 报名按钮 */}
      <button 
        onClick={onRegister}
        disabled={isFull}
        className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
          isFull
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
        }`}
      >
        <ShoppingCart className="w-5 h-5" />
        {isAuthenticated 
          ? (isFull ? '已满员' : '立即报名') 
          : '登录后报名'}
      </button>

      {/* 提示 */}
      {isLimitedSeats && (
        <p className="mt-3 text-xs text-amber-600 text-center">
          名额有限，建议尽早报名
        </p>
      )}
    </div>
  );
};

/** 课程信息卡 */
const CourseInfoCard: React.FC<{ course: ExtendedCourse }> = ({ course }) => {
  const stageConfig = course.stage ? STAGE_CONFIG[course.stage] : null;
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="space-y-3">
        {/* 一级分类 */}
        {stageConfig && (
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400">成长阶段</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 ${stageConfig.bgColor} ${stageConfig.color} text-xs font-bold rounded`}>
              {stageConfig.icon}
              {stageConfig.name}
            </span>
          </div>
        )}
        {/* 专科方向 */}
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-xs font-bold text-slate-400">专科方向</span>
          <span className="text-xs font-bold text-slate-900">{course.subcategory}</span>
        </div>
        {/* 授课形式 */}
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-xs font-bold text-slate-400">授课形式</span>
          <span className="text-xs font-bold text-slate-900">{course.formatLabel}</span>
        </div>
        {/* 难度等级 */}
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-xs font-bold text-slate-400">难度等级</span>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded">{course.levelLabel}</span>
        </div>
        {/* 课程时长 */}
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-xs font-bold text-slate-400">课程时长</span>
          <span className="text-xs font-bold text-slate-900">
            {course.agenda?.length || 0} 天
            {course.totalHours && ` / ${course.totalHours}小时`}
          </span>
        </div>
        {/* 授课地点 */}
        <div className="flex justify-between items-center py-2">
          <span className="text-xs font-bold text-slate-400">授课地点</span>
          <span className="text-xs font-bold text-slate-900">{course.location?.city}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

const CnCourseDetailClient: React.FC<CnCourseDetailClientProps> = ({ courseId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const { addToCart } = useCart();
  
  const [course, setCourse] = useState<ExtendedCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipmentRelations, setEquipmentRelations] = useState<CourseProductRelation[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);

  const locale = pathname.split('/')[1] || 'zh';

  // 加载课程数据
  useEffect(() => {
    api.getCourses().then(courses => {
      const found = courses.find(c => c.id === courseId);
      if (found) {
        setCourse(inferCourseMetadata(found));
        // 查找相关课程
        const related = courses.filter(c => 
          c.id !== found.id && 
          c.specialty === found.specialty && 
          c.status === 'published'
        ).slice(0, 2);
        setRelatedCourses(related);
      }
      setLoading(false);
    });
  }, [courseId]);

  // 加载器械关联
  useEffect(() => {
    fetch(`/api/courses/${courseId}/products`)
      .then(res => res.ok ? res.json() : { relations: [] })
      .then(data => setEquipmentRelations(data.relations || []))
      .catch(() => setEquipmentRelations([]));
  }, [courseId]);

  // 报名处理
  const handleRegister = () => {
    if (!course) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }
    
    addToCart({
      id: course.id,
      name: course.title_zh || course.title,
      price: course.price_cny || course.price,
      currency: 'CNY',
      imageUrl: course.imageUrl,
      type: 'course',
      quantity: 1
    });
    
    router.push(`/${locale}/checkout`);
  };

  // 分享处理
  const handleShare = async () => {
    if (!course) return;
    const title = course.title_zh || course.title;
    const shareUrl = `${window.location.origin}/${locale}/courses/${course.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `[宠医界] ${title}`, url: shareUrl });
      } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      addNotification({ 
        id: `sh-c-${Date.now()}`, 
        type: 'system', 
        title: '链接已复制', 
        message: '课程链接已复制到剪贴板', 
        read: true, 
        timestamp: new Date() 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-black text-slate-900">课程未找到</h1>
        <p className="text-slate-500">您访问的课程不存在或已下架</p>
        <Link 
          href={`/${locale}/courses`}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
        >
          返回课程中心
        </Link>
      </div>
    );
  }

  const title = course.title_zh || course.title;
  const desc = course.description_zh || course.description;
  const instructor = {
    name: course.instructor?.name_zh || course.instructor?.name || '',
    title: course.instructor?.title_zh || course.instructor?.title || '',
    bio: course.instructor?.bio_zh || course.instructor?.bio || '',
    credentials: course.instructor?.credentials_zh || course.instructor?.credentials || [],
  };
  const location = {
    city: course.location?.city_zh || course.location?.city || '',
    venue: course.location?.venue_zh || course.location?.venue || '',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[420px] bg-slate-900">
        {course.imageUrl && (
          <img 
            src={course.imageUrl} 
            alt={title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        
        {/* 返回按钮 */}
        <Link 
          href={`/${locale}/courses`}
          className="absolute top-28 left-8 z-10 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold">返回课程中心</span>
        </Link>

        {/* 分享按钮 */}
        <button 
          onClick={handleShare}
          className="absolute top-28 right-8 z-10 w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
        
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-6xl mx-auto">
            {/* 分类标签组 */}
            <HeroTags course={course} />
            
            {/* 标题 */}
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight max-w-4xl">
              {title}
            </h1>
            
            {/* 日期地点 */}
            <div className="flex flex-wrap gap-6 text-white/80 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {course.startDate} - {course.endDate}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {location.city}，{location.venue}
              </span>
            </div>
            
            {/* 适合人群 */}
            {course.audienceLabels && course.audienceLabels.length > 0 && (
              <AudienceTags audiences={course.audienceLabels} />
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 课程简介 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-4">课程简介</h2>
              <p className="text-slate-600 leading-relaxed">{desc}</p>
            </div>

            {/* 课程决策摘要（紧凑版） */}
            <CourseDecisionSummary course={course} relatedCourses={relatedCourses} locale={locale} />

            {/* 主讲导师 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6">主讲导师</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {course.instructor?.imageUrl && (
                  <img 
                    src={course.instructor.imageUrl} 
                    alt={instructor.name}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-50 shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{instructor.name}</h3>
                  <p className="text-sm font-medium text-emerald-600 mb-3">{instructor.title}</p>
                  {instructor.credentials && instructor.credentials.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {instructor.credentials.map((cred, idx) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                          {cred}
                        </span>
                      ))}
                    </div>
                  )}
                  {instructor.bio && (
                    <p className="text-slate-600 leading-relaxed italic border-l-4 border-emerald-500 pl-4">
                      &quot;{instructor.bio}&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 导师推荐工具（独立模块） */}
            <InstructorToolsSection 
              relations={equipmentRelations} 
              locale={locale} 
              instructorName={instructor.name}
              course={course}
            />

            {/* 课程大纲 */}
            {course.agenda && course.agenda.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-500" />
                  课程大纲
                </h2>
                <div className="space-y-4">
                  {course.agenda.map((day, dIdx) => (
                    <div key={dIdx} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-xs font-bold">
                          {day.day}
                        </span>
                        <span className="text-sm text-slate-500">{day.date}</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {day.items.map((item, iIdx) => (
                          <div key={iIdx} className="px-5 py-4 flex gap-4 hover:bg-slate-50 transition-colors">
                            <span className="font-mono text-sm text-slate-400 shrink-0">{item.time}</span>
                            <p className="text-sm font-medium text-slate-800">
                              {item.activity_zh || item.activity}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 行程服务安排 */}
            {course.services && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6">行程服务安排</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {course.services.accommodation && (
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <span className="text-2xl block mb-2">🏨</span>
                      <p className="text-xs font-medium text-slate-500 mb-1">住宿</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        course.services.accommodation === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                        course.services.accommodation === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {course.services.accommodation === 'yes' ? '提供' : course.services.accommodation === 'partial' ? '部分提供' : '不提供'}
                      </span>
                    </div>
                  )}
                  {course.services.meals && (
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <span className="text-2xl block mb-2">🍽️</span>
                      <p className="text-xs font-medium text-slate-500 mb-1">餐饮</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        course.services.meals === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                        course.services.meals === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {course.services.meals === 'yes' ? '提供' : course.services.meals === 'partial' ? '部分提供' : '不提供'}
                      </span>
                    </div>
                  )}
                  {course.services.transfer && (
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <span className="text-2xl block mb-2">🚗</span>
                      <p className="text-xs font-medium text-slate-500 mb-1">接送</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        course.services.transfer === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                        course.services.transfer === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {course.services.transfer === 'yes' ? '提供' : course.services.transfer === 'partial' ? '部分提供' : '不提供'}
                      </span>
                    </div>
                  )}
                </div>
                {course.services.directions_zh && (
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">交通指南</h3>
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">
                      {course.services.directions_zh}
                    </p>
                  </div>
                )}
                {course.services.notes_zh && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2">其他备注</h3>
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">
                      {course.services.notes_zh}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 培训模块器械与耗材 */}
            <div id="equipment-modules">
              <CourseEquipmentByModule 
                relations={equipmentRelations} 
                locale={locale}
                agenda={course.agenda}
                initialCollapsed={false}
              />
            </div>
          </div>

          {/* 右侧侧栏 */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* 报名卡 */}
              <EnrollmentCard 
                course={course} 
                locale={locale} 
                isAuthenticated={isAuthenticated}
                onRegister={handleRegister}
              />

              {/* 核心器械 */}
              <CoreEquipmentSidebar relations={equipmentRelations} locale={locale} course={course} />

              {/* 课程信息卡 */}
              <CourseInfoCard course={course} />
            </div>
          </div>
        </div>
      </div>

      {/* 课后延伸推荐 */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <PostCourseRecommendations 
          relations={equipmentRelations} 
          relatedCourses={relatedCourses}
          locale={locale}
          course={course}
        />
      </div>

      {/* 底部 CTA */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            立即锁定名额
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto text-sm">
            小班制教学，名额有限，建议尽早报名
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleRegister}
              className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-bold text-base shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {isAuthenticated ? '立即报名' : '登录后报名'}
            </button>
            <button
              onClick={() => setShowAdvisorModal(true)}
              className="px-8 py-4 bg-transparent border-2 border-slate-600 text-slate-300 rounded-xl font-medium text-sm hover:border-slate-400 hover:text-white transition-all flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              咨询课程顾问
            </button>
          </div>
        </div>
      </div>

      {/* 咨询弹窗 */}
      {course && (
        <ClinicalConsultationModal
          isOpen={showAdvisorModal}
          onClose={() => setShowAdvisorModal(false)}
          productId={courseId}
          productName={title}
        />
      )}
    </div>
  );
};

export default CnCourseDetailClient;
