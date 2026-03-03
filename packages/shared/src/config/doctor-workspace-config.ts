/**
 * Doctor Workspace Configuration
 * 医生工作台共享配置 - 状态、徽章、颜色、路由
 */

// ============================================
// 路由配置 (Route Configuration)
// ============================================
export const DOCTOR_ROUTES = {
  home: '/doctor',
  clients: '/doctor/clients',
  records: '/doctor/records',
  recordsNew: '/doctor/records/new',
  consultations: '/doctor/consultations',
  consultationsNew: '/doctor/consultations/new',
  courses: '/doctor/courses',
  growth: '/doctor/growth',
  career: '/doctor/career',
  startup: '/doctor/startup',
  community: '/doctor/community',
  communityNew: '/doctor/community/new',
  communityDetail: (id: string) => `/doctor/community/${id}`,
  settings: '/doctor/settings',
} as const;

// 生成带 locale 的路由
export const getDoctorRoute = (locale: string, route: keyof typeof DOCTOR_ROUTES | string, id?: string) => {
  if (route === 'communityDetail' && id) {
    return `/${locale}/doctor/community/${id}`;
  }
  const baseRoute = typeof DOCTOR_ROUTES[route as keyof typeof DOCTOR_ROUTES] === 'string' 
    ? DOCTOR_ROUTES[route as keyof typeof DOCTOR_ROUTES] 
    : route;
  return `/${locale}${baseRoute}`;
};

// ============================================
// 状态配置 (Status Configuration)
// ============================================
export const STATUS_CONFIG = {
  // 通用状态
  pending: { label: '待处理', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  inProgress: { label: '进行中', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  completed: { label: '已完成', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  cancelled: { label: '已取消', color: 'slate', bgClass: 'bg-slate-100', textClass: 'text-slate-500' },
  
  // 问诊状态
  waitingReply: { label: '待回复', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  replied: { label: '已回复', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  closed: { label: '已结束', color: 'slate', bgClass: 'bg-slate-100', textClass: 'text-slate-500' },
  
  // 课程状态
  enrolled: { label: '已报名', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  learning: { label: '学习中', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  finished: { label: '已完成', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  
  // 社区帖子状态
  open: { label: '开放中', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  resolved: { label: '已解决', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  hot: { label: '热门', color: 'rose', bgClass: 'bg-rose-100', textClass: 'text-rose-600' },
} as const;

// ============================================
// 优先级配置 (Priority Configuration)
// ============================================
export const PRIORITY_CONFIG = {
  urgent: { label: '紧急', color: 'rose', bgClass: 'bg-rose-100', textClass: 'text-rose-600', dotClass: 'bg-rose-500' },
  high: { label: '高', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700', dotClass: 'bg-amber-500' },
  normal: { label: '普通', color: 'slate', bgClass: 'bg-slate-100', textClass: 'text-slate-600', dotClass: 'bg-slate-400' },
  low: { label: '低', color: 'slate', bgClass: 'bg-slate-50', textClass: 'text-slate-400', dotClass: 'bg-slate-300' },
} as const;

// ============================================
// 类型配置 (Type Configuration)
// ============================================

// 问诊类型
export const CONSULT_TYPE_CONFIG = {
  text: { label: '图文问诊', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  video: { label: '视频问诊', color: 'purple', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
  followup: { label: '复诊咨询', color: 'teal', bgClass: 'bg-teal-100', textClass: 'text-teal-700' },
  emergency: { label: '紧急咨询', color: 'rose', bgClass: 'bg-rose-100', textClass: 'text-rose-600' },
} as const;

// 社区帖子类型
export const POST_TYPE_CONFIG = {
  case: { label: '病例讨论', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  mentor: { label: '导师答疑', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  experience: { label: '临床经验', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  career: { label: '职业成长', color: 'purple', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
  startup: { label: '创业交流', color: 'rose', bgClass: 'bg-rose-100', textClass: 'text-rose-600' },
} as const;

// 宠物类型
export const PET_TYPE_CONFIG = {
  dog: { label: '犬', emoji: '🐕' },
  cat: { label: '猫', emoji: '🐈' },
  bird: { label: '鸟', emoji: '🐦' },
  rabbit: { label: '兔', emoji: '🐰' },
  hamster: { label: '仓鼠', emoji: '🐹' },
  other: { label: '其他', emoji: '🐾' },
} as const;

// ============================================
// 技能等级配置 (Skill Level Configuration)
// ============================================
export const SKILL_LEVEL_CONFIG = {
  basic: { label: '基础', color: 'slate', bgClass: 'bg-slate-100', textClass: 'text-slate-600' },
  intermediate: { label: '进阶', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  advanced: { label: '高阶', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  expert: { label: '专家', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
} as const;

// ============================================
// 成长阶段配置 (Growth Stage Configuration)
// ============================================
export const GROWTH_STAGE_CONFIG = {
  foundation: { label: '专业能力', step: 1, color: 'blue' },
  customer: { label: '客户经营', step: 2, color: 'emerald' },
  service: { label: '服务模型', step: 3, color: 'purple' },
  startup: { label: '创业准备', step: 4, color: 'amber' },
  operation: { label: '试运营', step: 5, color: 'rose' },
} as const;

// ============================================
// 视觉样式配置 (Visual Style Configuration)
// ============================================
export const CARD_STYLES = {
  default: 'bg-white rounded-xl border border-slate-100 shadow-sm',
  hover: 'hover:shadow-md hover:border-slate-200 transition-all',
  active: 'ring-2 ring-amber-500 border-amber-200',
} as const;

export const BUTTON_STYLES = {
  primary: 'bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors',
  secondary: 'border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors',
  ghost: 'hover:bg-slate-100 text-slate-600 font-medium rounded-lg transition-colors',
  danger: 'bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors',
} as const;

export const SPACING = {
  section: 'space-y-6',
  card: 'p-4 sm:p-5',
  cardLarge: 'p-5 sm:p-6',
} as const;

// ============================================
// 导出类型 (Export Types)
// ============================================
export type StatusKey = keyof typeof STATUS_CONFIG;
export type PriorityKey = keyof typeof PRIORITY_CONFIG;
export type ConsultTypeKey = keyof typeof CONSULT_TYPE_CONFIG;
export type PostTypeKey = keyof typeof POST_TYPE_CONFIG;
export type PetTypeKey = keyof typeof PET_TYPE_CONFIG;
export type SkillLevelKey = keyof typeof SKILL_LEVEL_CONFIG;
export type GrowthStageKey = keyof typeof GROWTH_STAGE_CONFIG;
