/**
 * Admin 后台类型定义
 */

// 管理员角色
export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 权限点
export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
  description?: string;
  display_order: number;
}

// 管理员用户
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_admin: boolean;
  admin_role_id?: string;
  admin_role?: AdminRole;
  permissions?: string[];
  last_login_at?: string;
  created_at: string;
}

// 医生审核申请
export interface DoctorApplication {
  id: string;
  user_id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  full_name: string;
  phone: string;
  province?: string;
  city: string;
  avatar_url?: string;
  hospital_name: string;
  position: string;
  specialties: string[];
  years_of_experience?: number;
  license_image_url?: string;
  supplementary_urls?: string[];
  credential_notes?: string;
  nickname?: string;
  email?: string;
  bio?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

// 医生审核日志
export interface DoctorAuditLog {
  id: string;
  application_id: string;
  action: 'submit' | 'approve' | 'reject' | 'request_supplement';
  old_status?: string;
  new_status?: string;
  reason?: string;
  notes?: string;
  performed_by?: string;
  performed_by_name?: string;
  performed_at: string;
}

// CMS 页面
export interface CmsPage {
  id: string;
  page_key: string;
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  status: 'draft' | 'published' | 'offline';
  published_at?: string;
  published_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  sections?: CmsSection[];
}

// CMS 区块
export interface CmsSection {
  id: string;
  page_id: string;
  section_key: string;
  section_type: string;
  title?: string;
  subtitle?: string;
  description?: string;
  content?: Record<string, any>;
  cta_text?: string;
  cta_link?: string;
  cta_style?: string;
  is_active: boolean;
  display_order: number;
  style_config?: Record<string, any>;
  items?: CmsItem[];
}

// CMS 子项
export interface CmsItem {
  id: string;
  section_id: string;
  item_key?: string;
  item_type?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  content?: Record<string, any>;
  image_url?: string;
  icon?: string;
  link_url?: string;
  link_text?: string;
  link_target?: string;
  is_active: boolean;
  display_order: number;
}

// 成长方向
export interface GrowthTrack {
  id: string;
  slug: string;
  name: string;
  group_name: string;
  group_order: number;
  tagline?: string;
  description?: string;
  target_audience?: string;
  recommended_start?: string;
  path_stages?: string[];
  is_multi_stage: boolean;
  default_stage?: string;
  default_specialty?: string;
  sort_strategy: string;
  filter_config?: Record<string, any>;
  icon?: string;
  color?: string;
  is_active: boolean;
  is_ready: boolean;
  fallback_action: 'hide' | 'coming_soon' | 'browse_all';
  display_order: number;
  course_count?: number;
  featured_courses?: any[];
  created_at: string;
  updated_at: string;
}

// 讲师
export interface Instructor {
  id: string;
  name: string;
  title?: string;
  credentials?: string[];
  bio?: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 路由注册
export interface RouteRegistry {
  id: string;
  path: string;
  name: string;
  module: string;
  description?: string;
  route_status: 'active' | 'coming_soon' | 'hidden' | 'redirect';
  redirect_target?: string;
  placeholder_template_id?: string;
  requires_auth: boolean;
  requires_doctor: boolean;
  requires_admin: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 占位页模板
export interface ComingSoonTemplate {
  id: string;
  code: string;
  name: string;
  title: string;
  subtitle?: string;
  description?: string;
  primary_button_text?: string;
  primary_button_link?: string;
  secondary_button_text?: string;
  secondary_button_link?: string;
  applicable_modules?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 字典
export interface Dictionary {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  items?: DictionaryItem[];
}

// 字典项
export interface DictionaryItem {
  id: string;
  dict_id: string;
  code: string;
  label: string;
  label_en?: string;
  value?: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  display_order: number;
  extra_data?: Record<string, any>;
}

// 采购线索
export interface PurchaseLead {
  id: string;
  lead_type: 'inquiry' | 'configuration_advice' | 'solution_request';
  source_page?: string;
  source_product_id?: string;
  source_course_id?: string;
  contact_name: string;
  mobile: string;
  email?: string;
  clinic_name?: string;
  clinic_stage_code?: string;
  budget_range?: string;
  requirement_text?: string;
  status: 'new' | 'contacted' | 'quoted' | 'negotiating' | 'converted' | 'closed';
  assigned_admin_user_id?: string;
  assigned_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 操作日志
export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  admin_name?: string;
  module: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  changes_summary?: string;
  ip_address?: string;
  created_at: string;
}

// 统一分页响应
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 统一 API 响应
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
  timestamp?: string;
}

// 审核状态
export type AuditStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// 发布状态
export type PublishStatus = 'draft' | 'published' | 'offline';

// 状态徽章颜色映射
export const STATUS_COLORS: Record<string, string> = {
  // 审核状态
  draft: 'bg-slate-500/20 text-slate-400',
  pending: 'bg-amber-500/20 text-amber-400',
  pending_review: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  
  // 发布状态
  published: 'bg-emerald-500/20 text-emerald-400',
  offline: 'bg-slate-500/20 text-slate-400',
  
  // 路由状态
  active: 'bg-emerald-500/20 text-emerald-400',
  coming_soon: 'bg-amber-500/20 text-amber-400',
  hidden: 'bg-slate-500/20 text-slate-400',
  redirect: 'bg-blue-500/20 text-blue-400',
  
  // 线索状态
  new: 'bg-blue-500/20 text-blue-400',
  contacted: 'bg-amber-500/20 text-amber-400',
  quoted: 'bg-purple-500/20 text-purple-400',
  negotiating: 'bg-orange-500/20 text-orange-400',
  converted: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-slate-500/20 text-slate-400',
};

// 状态标签文本
export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  published: '已发布',
  offline: '已下线',
  active: '正常',
  coming_soon: '占位中',
  hidden: '已隐藏',
  redirect: '重定向',
  new: '新提交',
  contacted: '已联系',
  quoted: '已报价',
  negotiating: '洽谈中',
  converted: '已转化',
  closed: '已关闭',
};
