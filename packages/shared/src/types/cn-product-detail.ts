/**
 * 中国站商品详情页数据类型定义
 * 
 * 该类型体系围绕医生成长、临床场景、课程训练和诊所升级设计
 * 不是普通电商详情页，而是专业决策页
 */

import { Specialty, ProductGroup } from '../types';

// ============================================================================
// 基础类型
// ============================================================================

/** 价格展示模式 */
export type PricingMode = 'direct-price' | 'login-to-view' | 'inquiry';

/** 采购类型 */
export type PurchaseType = 'standard' | 'consultative' | 'solution';

/** 医生阶段（与课程体系统一） */
export type DoctorStage = 
  | 'certification'      // 考证入行
  | 'clinical-basics'    // 临床基础
  | 'specialty-advanced' // 专科进阶
  | 'advanced-practice'  // 高端实操
  | 'career-growth';     // 事业发展

/** 诊所阶段 */
export type ClinicStage = 
  | 'new-opening'        // 新开业
  | 'basic-clinic'       // 基础接诊型
  | 'stable-operation'   // 稳定经营型
  | 'specialty-upgrade'  // 专科升级型
  | 'brand-expansion';   // 品牌扩张型

/** 课程关联类型 */
export type CourseRelationType = 
  | 'same-course-kit'    // 课程同款
  | 'used-in-course'     // 课程使用器械
  | 'mentor-pick'        // 讲师常用
  | 'learn-before-buy'   // 建议先学该课再采购
  | 'learn-after-buy';   // 购入后建议学习该课

/** 商品标签类型 */
export type ProductTagType = 
  | 'course-same'        // 课程同款
  | 'frequent-restock'   // 高频补货
  | 'mentor-recommended' // 讲师推荐
  | 'equipment-upgrade'  // 设备升级
  | 'startup-suitable';  // 开业方案适用

// ============================================================================
// 商品图片
// ============================================================================

/** 商品图片 */
export interface ProductImage {
  url: string;
  alt?: string;
  type?: 'main' | 'detail' | 'scene' | 'course-scene';
}

// ============================================================================
// 基础字段
// ============================================================================

/** 商品基础信息 */
export interface ProductBase {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  subCategory?: string;
  tags?: ProductTagType[];
  images: ProductImage[];
  shortDescription: string;
  oneLinePositioning?: string;
  keySpecs?: {
    label: string;
    value: string;
  }[];
}

// ============================================================================
// 决策字段
// ============================================================================

/** 商品决策信息 */
export interface ProductDecisionInfo {
  /** 使用场景 */
  useScenarios?: string[];
  /** 专科方向 */
  specialties?: string[];
  /** 适合对象 */
  targetUsers?: string[];
  /** 适合医生阶段 */
  doctorStages?: DoctorStage[];
  /** 主推荐医生阶段 */
  primaryDoctorStage?: DoctorStage;
  /** 适合诊所阶段 */
  clinicStages?: ClinicStage[];
  /** 一句推荐理由 */
  recommendationReason?: string;
  /** 决策摘要 */
  decisionSummary?: {
    /** 适合谁 */
    suitableFor?: string;
    /** 解决什么问题 */
    solvesWhat?: string;
    /** 为什么推荐 */
    whyRecommend?: string;
    /** 下一步建议 */
    nextStep?: string;
  };
}

// ============================================================================
// 价格与采购字段
// ============================================================================

/** 商品采购信息 */
export interface ProductPurchaseInfo {
  /** 价格展示模式 */
  pricingMode: PricingMode;
  /** 展示价格 */
  displayPrice?: number;
  /** 采购类型 */
  purchaseType: PurchaseType;
  /** 最小采购单位 */
  minOrderUnit?: string;
  /** 是否支持批量采购 */
  supportsBulkPurchase?: boolean;
  /** 是否支持方案咨询 */
  supportsPlanConsultation?: boolean;
  /** 是否需要顾问协助选型 */
  requiresAdvisorSupport?: boolean;
  /** 发货/供货说明 */
  deliveryInfo?: string;
  /** 售后支持说明 */
  afterSalesInfo?: string;
}

// ============================================================================
// 产品说明字段
// ============================================================================

/** 商品详细内容 */
export interface ProductDetailContent {
  /** 产品功能与用途 */
  functionsAndUsage?: string;
  /** 核心参数 */
  coreParameters?: {
    label: string;
    value: string;
  }[];
  /** 使用建议 */
  usageSuggestions?: string[];
  /** 配套建议 */
  bundleSuggestions?: string[];
  /** 服务支持 */
  supportServices?: string[];
}

// ============================================================================
// 课程联动字段
// ============================================================================

/** 关联课程项 */
export interface RelatedCourseItem {
  id: string;
  title: string;
  slug: string;
  stage: DoctorStage;
  specialty?: string;
  relationType: CourseRelationType;
  relationNote?: string;
  isSourceCourse?: boolean;
  imageUrl?: string;
}

/** 商品课程关联 */
export interface ProductCourseRelation {
  /** 关联课程列表 */
  relatedCourses?: RelatedCourseItem[];
  /** 是否讲师推荐 */
  mentorRecommended?: boolean;
  /** 是否课程同款 */
  isCourseSameAsShown?: boolean;
}

// ============================================================================
// 推荐商品字段
// ============================================================================

/** 关联商品项 */
export interface RelatedProductItem {
  id: string;
  name: string;
  slug: string;
  image?: string;
  tag?: string;
  shortReason?: string;
  pricingMode?: PricingMode;
  displayPrice?: number;
}

/** 商品推荐 */
export interface ProductRecommendations {
  /** 常搭配购买 */
  bundleProducts?: RelatedProductItem[];
  /** 同场景替代 */
  alternatives?: RelatedProductItem[];
  /** 下一步升级推荐 */
  upgradeRecommendations?: RelatedProductItem[];
}

// ============================================================================
// 整合商品详情数据
// ============================================================================

/** 完整商品详情数据 */
export type CnProductDetailData = ProductBase &
  ProductDecisionInfo &
  ProductPurchaseInfo &
  ProductDetailContent &
  ProductCourseRelation &
  ProductRecommendations & {
    // 兼容现有 Product 类型
    specialty?: Specialty;
    group?: ProductGroup;
    price?: number;
    stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock';
    supplier?: {
      name: string;
      origin: string;
      rating: number;
    };
  };

// ============================================================================
// 课程上下文（来自 URL 参数）
// ============================================================================

/** 课程来源链接类型 */
export type CourseLinkType = 'core-kit' | 'module-supplies' | 'mentor-picks' | 'next-step';

/** 课程上下文 */
export interface CourseContextParams {
  source: 'course-detail' | null;
  courseId: string | null;
  courseName: string | null;
  stage: string | null;
  specialty: string | null;
  linkType: CourseLinkType | null;
}

// ============================================================================
// 常量配置
// ============================================================================

/** 医生阶段配置 */
export const DOCTOR_STAGE_CONFIG: Record<DoctorStage, {
  name: string;
  color: string;
  bgColor: string;
}> = {
  'certification': {
    name: '考证入行',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  'clinical-basics': {
    name: '临床基础',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  'specialty-advanced': {
    name: '专科进阶',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
  'advanced-practice': {
    name: '高端实操',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  'career-growth': {
    name: '事业发展',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
  },
};

/** 诊所阶段配置 */
export const CLINIC_STAGE_CONFIG: Record<ClinicStage, {
  name: string;
  color: string;
  bgColor: string;
}> = {
  'new-opening': {
    name: '新开业',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
  },
  'basic-clinic': {
    name: '基础接诊型',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
  },
  'stable-operation': {
    name: '稳定经营型',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
  },
  'specialty-upgrade': {
    name: '专科升级型',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
  },
  'brand-expansion': {
    name: '品牌扩张型',
    color: 'text-fuchsia-700',
    bgColor: 'bg-fuchsia-50',
  },
};

/** 商品标签配置 */
export const PRODUCT_TAG_CONFIG: Record<ProductTagType, {
  name: string;
  color: string;
  bgColor: string;
}> = {
  'course-same': {
    name: '课程同款',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
  },
  'frequent-restock': {
    name: '高频补货',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  'mentor-recommended': {
    name: '讲师推荐',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  'equipment-upgrade': {
    name: '设备升级',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  'startup-suitable': {
    name: '开业方案适用',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
  },
};

/** 课程关联类型配置 */
export const COURSE_RELATION_CONFIG: Record<CourseRelationType, {
  name: string;
  description: string;
}> = {
  'same-course-kit': {
    name: '课程同款',
    description: '该课程中直接使用的同款器械',
  },
  'used-in-course': {
    name: '课程使用器械',
    description: '该课程教学中使用的器械',
  },
  'mentor-pick': {
    name: '讲师常用',
    description: '课程讲师日常工作中常用的器械',
  },
  'learn-before-buy': {
    name: '建议先学该课再采购',
    description: '建议先学习该课程，再决定是否采购',
  },
  'learn-after-buy': {
    name: '购入后建议学习该课',
    description: '采购该器械后，建议学习该课程提升使用技能',
  },
};
