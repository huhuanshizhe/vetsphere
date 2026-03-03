
export enum Specialty {
  ORTHOPEDICS = 'Orthopedics',
  NEUROSURGERY = 'Neurosurgery',
  SOFT_TISSUE = 'Soft Tissue',
  EYE_SURGERY = 'Eye Surgery',
  EXOTICS = 'Exotics',
  ULTRASOUND = 'Ultrasound'
}

export type UserRole = 'Doctor' | 'CourseProvider' | 'ShopSupplier' | 'Admin';

export type ProductGroup = 'PowerTools' | 'Implants' | 'HandInstruments' | 'Consumables' | 'Equipment';

export type CourseStatus = 'Pending' | 'Published' | 'Rejected' | 'Draft';

// ============================================
// Doctor Application Types (医生入驻申请)
// ============================================

/** 医生申请状态 */
export type DoctorApplicationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

/** 医生入驻申请完整信息 */
export interface DoctorApplication {
  id: string;
  userId: string;
  status: DoctorApplicationStatus;
  
  // 基本信息
  fullName: string;
  phone: string;
  province?: string;
  city: string;
  avatarUrl?: string;
  
  // 执业信息
  hospitalName: string;
  position: string;
  specialties: string[];
  yearsOfExperience?: number;
  
  // 资质材料
  licenseImageUrl?: string;
  supplementaryUrls: string[];
  credentialNotes?: string;
  
  // 可选信息
  nickname?: string;
  email?: string;
  bio?: string;
  
  // 审核信息
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

/** 医生申请表单数据 (用于前端表单) */
export interface DoctorApplicationFormData {
  // Step 1: 账号 (由 auth 处理，这里不需要)
  
  // Step 2: 医生资料
  fullName: string;
  phone: string;
  province?: string;
  city: string;
  hospitalName: string;
  position: string;
  specialties: string[];
  yearsOfExperience?: number;
  nickname?: string;
  email?: string;
  bio?: string;
  
  // Step 3: 资质上传
  licenseImageUrl?: string;
  supplementaryUrls: string[];
  credentialNotes?: string;
}

// ============================================
// B2B Commerce Types
// ============================================

/** Purchase mode determines how a product can be acquired */
export type PurchaseMode = 'direct' | 'inquiry' | 'hybrid';

/** Clinical workflow categories for INTL B2B platform */
export type ClinicalCategory = 
  | 'imaging-diagnostics'
  | 'surgery-anesthesia'
  | 'in-house-lab'
  | 'daily-supplies'
  | 'course-equipment';

/** Product certification/compliance information */
export interface Certification {
  type: string;      // 'ISO 13485', 'CE', 'FDA', etc.
  number: string;
  issuer: string;
  validUntil?: string;
}

/** Hierarchical product category for SEO-friendly URLs */
export interface ProductCategory {
  id: string;
  slug: string;
  parentId?: string;
  nameEn: string;
  nameTh?: string;
  nameJa?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  descriptionJa?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  metaTitleEn?: string;
  metaDescriptionEn?: string;
  children?: ProductCategory[];
}

/** Course-product relationship type */
export type RelationshipType = 'required' | 'recommended' | 'mentioned';

/** Relation scope: course-level, module/day-specific, or instructor pick */
export type RelationType = 'course' | 'module' | 'instructor';

/** Links products to courses with instructor notes */
export interface CourseProductRelation {
  id: string;
  courseId: string;
  productId: string;
  relationshipType: RelationshipType;
  instructorNoteEn?: string;
  instructorNoteTh?: string;
  instructorNoteJa?: string;
  displayOrder: number;
  createdAt?: string;
  createdBy?: string;
  // Enhanced fields for day/module grouping
  dayIndex?: number | null;
  relationType?: RelationType;
  // Populated on client
  product?: Product;
  course?: Course;
}

/** Inquiry/quote request status */
export type InquiryStatus = 'pending' | 'replied' | 'quoted' | 'converted' | 'archived';

/** B2B inquiry request for products */
export interface InquiryRequest {
  id: string;
  productId: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  message: string;
  quantity?: number;
  status: InquiryStatus;
  adminNotes?: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
  repliedAt?: string;
  // Populated on client
  product?: Product;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  points: number;
  level: string;
  avatarUrl?: string;
}

export interface DoctorProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  licenseNumber: string;
  clinicName: string;
  specialties: Specialty[];
  clinicalYears: number;
  referralCode: string;
  points: number;
  level: 'Resident' | 'Surgeon' | 'Expert' | 'Master';
  progress: {
    specialty: Specialty;
    level: number;
    completedCourses: string[];
  }[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  group: ProductGroup;
  price: number;
  specialty: Specialty;
  imageUrl: string;
  description: string;
  longDescription: string;
  specs: { [key: string]: string };
  compareData?: {
    torque?: string;
    weight?: string;
    battery?: string;
    material?: string;
  };
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  stockQuantity?: number;
  status?: 'Draft' | 'Pending' | 'Published' | 'Rejected';
  supplierId?: string;
  rejectionReason?: string;
  updatedAt?: string;
  supplier: {
    name: string;
    origin: string;
    rating: number;
  };
  // B2B Commerce fields
  purchaseMode?: PurchaseMode;
  clinicalCategory?: ClinicalCategory;
  subCategory?: string;
  clinicalUseCase?: string;
  certifications?: Certification[];
  instructorRecommendation?: string;
  categorySlug?: string;
}

export interface Course {
  id: string;
  
  // === 标题 (4种语言) ===
  title: string; // Default (English)
  title_zh?: string; // Chinese
  title_th?: string; // Thai
  title_ja?: string; // Japanese
  
  // === 描述 (4种语言) ===
  description: string; // Default (English)
  description_zh?: string;
  description_th?: string;
  description_ja?: string;
  
  // === 基础信息 ===
  specialty: Specialty;
  level: 'Basic' | 'Intermediate' | 'Advanced' | 'Master';
  price: number;
  currency: string;
  
  // === 多币种价格 (预生成) ===
  price_cny?: number;
  price_usd?: number;
  price_jpy?: number;
  price_thb?: number;
  
  startDate: string;
  endDate: string;
  imageUrl: string;
  previewVideoUrl?: string; // 课程预览视频URL
  
  // === 讲师信息 (多语言) ===
  instructor: {
    name: string; // 原名（保持不变）
    name_zh?: string;
    name_th?: string;
    name_ja?: string;
    imageUrl: string;
    title: string; // 职称（英文）
    title_zh?: string;
    title_th?: string;
    title_ja?: string;
    credentials: string[]; // 资质（英文）
    credentials_zh?: string[];
    credentials_th?: string[];
    credentials_ja?: string[];
    bio: string; // 简介（英文）
    bio_zh?: string;
    bio_th?: string;
    bio_ja?: string;
  };
  
  // === 地点信息 (多语言) ===
  location: {
    country?: string;
    country_zh?: string;
    country_th?: string;
    country_ja?: string;
    region?: string;
    region_zh?: string;
    region_th?: string;
    region_ja?: string;
    city: string;
    city_zh?: string;
    city_th?: string;
    city_ja?: string;
    venue: string;
    venue_zh?: string;
    venue_th?: string;
    venue_ja?: string;
    address: string;
    address_zh?: string;
    address_th?: string;
    address_ja?: string;
  };
  
  status: CourseStatus;
  
  // === 日程安排 (多语言活动内容) ===
  agenda: {
    day: string;
    date: string;
    items: {
      time: string;
      activity: string; // 英文
      activity_zh?: string;
      activity_th?: string;
      activity_ja?: string;
    }[];
  }[];
  
  // === 报名信息 ===
  maxCapacity?: number;
  enrolledCount?: number;
  enrollmentDeadline?: string;
  
  // === 课程元数据 ===
  publishLanguage?: string;  // 发布语言（源语言）
  teachingLanguages?: string[];  // 授课语言
  targetAudience?: string;  // 目标受众 (legacy)
  targetAudience_zh?: string;
  totalHours?: number;
  
  // === 翻译状态 ===
  translationsComplete?: boolean;  // AI翻译是否完成
  translatedAt?: string;  // 翻译完成时间
  
  // === 行程服务安排 ===
  services?: {
    accommodation?: 'yes' | 'no' | 'partial';
    meals?: 'yes' | 'no' | 'partial';
    transfer?: 'yes' | 'no' | 'partial';
    visaLetter?: 'yes' | 'no' | 'partial';
    directions?: string;
    directions_zh?: string;
    directions_en?: string;
    directions_th?: string;
    directions_ja?: string;
    notes?: string;
    notes_zh?: string;
    notes_en?: string;
    notes_th?: string;
    notes_ja?: string;
  };
  
  // === 管理员审核 ===
  rejectionReason?: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  sources?: { title: string; uri: string }[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  type: 'course' | 'product';
  imageUrl: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: CartItem[];
  totalAmount: number;
  status: 'Pending' | 'Paid' | 'Shipped' | 'Completed';
  date: string;
  shippingAddress: string;
}

export interface Quote {
  id: string;
  customerEmail: string;
  customerInfo: any;
  items: CartItem[];
  totalAmount: number;
  status: 'Active' | 'Expired';
  validUntil: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  specialty: Specialty;
  media: { type: 'image' | 'video'; url: string }[];
  stats: { likes: number; comments: number; saves: number };
  createdAt: string;
  isAiAnalyzed: boolean;
  author: {
    name: string;
    avatar: string;
    level: string;
    hospital: string;
  };
  // Structured Medical Data
  patientInfo?: {
    species: string;
    age: string;
    weight: string;
  };
  sections?: {
    diagnosis?: string;
    plan?: string;
    outcome?: string;
  };
  expertComment?: string;
}

export interface Lead {
  id: string;
  source: string;
  contactInfo: string;
  interestSummary: string;
  fullChatLog: Message[];
  status: 'New' | 'Contacted' | 'Converted' | 'Archived';
  createdAt: string;
  organization?: string;
}

export interface ShippingTemplate {
  id: string;
  name: string;
  regionCode: string;
  baseFee: number;
  // perItemFee corrected to camelCase
  perItemFee: number;
  currency: string;
  estimatedDays: string;
}

export interface AppNotification {
  id: string;
  type: 'order' | 'community' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  link?: string;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  orderId: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  enrollmentDate: string;
  completionStatus: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  certificateIssued: boolean;
  course?: Course;
}
