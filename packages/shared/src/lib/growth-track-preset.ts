/**
 * 成长方向预设配置 (Growth Track Preset Configuration)
 * 
 * 用于管理成长体系页与课程中心之间的路径承接逻辑。
 * 每个 track 定义了一个成长方向的完整配置，包括：
 * - 基本信息（名称、描述）
 * - 推荐阶段顺序
 * - 默认筛选条件
 * - 排序策略
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 课程阶段（一级分类）- 复用课程中心已有枚举 */
export type CourseStage = 
  | 'all' 
  | 'certification' 
  | 'clinical-basics' 
  | 'specialty-advanced' 
  | 'advanced-practice' 
  | 'career-growth';

/** 专科方向 - 复用课程中心已有枚举 */
export type CourseSpecialty = 
  | 'all'
  | 'surgery'
  | 'ultrasound'
  | 'imaging'
  | 'ophthalmology'
  | 'anesthesia'
  | 'internal'
  | 'emergency'
  | 'dentistry'
  | 'dermatology'
  | 'general';

/** 成长方向 Track 标识 */
export type GrowthTrack = 
  | 'entry-certification'    // 考证入行
  | 'general-practice'       // 全科基础
  | 'surgery'                // 外科进阶
  | 'ultrasound-imaging'     // 超声影像
  | 'ophthalmology'          // 眼科专科
  | 'client-management'      // 客户经营
  | 'clinic-operations';     // 诊所经营

/** 排序策略 */
export type SortStrategy = 
  | 'stage-order'            // 按阶段顺序排序
  | 'relevance'              // 按相关性排序
  | 'default';               // 默认排序

/** Track 预设配置 */
export interface GrowthTrackPreset {
  /** 唯一标识 */
  slug: GrowthTrack;
  
  /** 显示名称 */
  label: string;
  
  /** 简短描述 */
  description: string;
  
  /** 详细说明（可选） */
  detailDescription?: string;
  
  /** 推荐阶段顺序 */
  recommendedStageOrder: CourseStage[];
  
  /** 默认阶段（如有，仅单阶段方向） */
  defaultStage?: CourseStage;
  
  /** 默认专科方向（如有） */
  defaultSpecialty?: CourseSpecialty;
  
  /** 默认学习目标（如有） */
  defaultLearningGoal?: string;
  
  /** 排序策略 */
  sortStrategy: SortStrategy;
  
  /** 是否为多阶段方向 */
  isMultiStage: boolean;
  
  /** 是否启用 */
  isActive: boolean;
  
  /** 图标颜色 */
  color: string;
}

/** 来源类型 */
export type SourceType = 'growth-system' | 'homepage' | 'direct' | 'other';

/** 解析后的预设应用结果 */
export interface ResolvedPreset {
  /** 原始 track */
  track: GrowthTrack | null;
  
  /** 预设配置 */
  preset: GrowthTrackPreset | null;
  
  /** 来源类型 */
  source: SourceType;
  
  /** 是否为有效的成长体系来源 */
  isGrowthSystemSource: boolean;
  
  /** 应该应用的阶段筛选 */
  appliedStage: CourseStage;
  
  /** 应该应用的专科筛选 */
  appliedSpecialty: CourseSpecialty;
  
  /** 推荐的阶段排序（多阶段方向） */
  stageOrderForSort: CourseStage[];
  
  /** 是否锁定单一阶段 */
  isStageLocked: boolean;
}

// ============================================================================
// 预设配置数据
// ============================================================================

export const GROWTH_TRACK_PRESETS: Record<GrowthTrack, GrowthTrackPreset> = {
  'entry-certification': {
    slug: 'entry-certification',
    label: '考证入行',
    description: '适合准备入行或补齐基础规范的用户',
    detailDescription: '从执业资格证备考到入职基础规范，帮助你顺利进入宠物医疗行业。',
    recommendedStageOrder: ['certification', 'clinical-basics'],
    defaultStage: 'certification',
    defaultSpecialty: undefined,
    defaultLearningGoal: 'certification',
    sortStrategy: 'stage-order',
    isMultiStage: false,
    isActive: true,
    color: 'blue',
  },
  
  'general-practice': {
    slug: 'general-practice',
    label: '全科基础',
    description: '适合希望建立稳定基础接诊能力的医生',
    detailDescription: '系统建立临床诊断思维、常见病诊疗规范和基础操作能力。',
    recommendedStageOrder: ['clinical-basics'],
    defaultStage: 'clinical-basics',
    defaultSpecialty: 'general',
    defaultLearningGoal: 'consultation',
    sortStrategy: 'stage-order',
    isMultiStage: false,
    isActive: true,
    color: 'emerald',
  },
  
  'surgery': {
    slug: 'surgery',
    label: '外科进阶',
    description: '适合希望系统提升外科能力的医生',
    detailDescription: '从软组织外科到骨科，从基础到高端实操，系统化外科能力进阶路径。',
    recommendedStageOrder: ['clinical-basics', 'specialty-advanced', 'advanced-practice'],
    defaultStage: undefined, // 多阶段方向不锁定单一阶段
    defaultSpecialty: 'surgery',
    defaultLearningGoal: 'specialty-transition',
    sortStrategy: 'stage-order',
    isMultiStage: true,
    isActive: true,
    color: 'blue',
  },
  
  'ultrasound-imaging': {
    slug: 'ultrasound-imaging',
    label: '超声影像',
    description: '适合希望建立影像判断与超声实操能力的医生',
    detailDescription: '腹部超声、心脏超声到介入超声，建立完整的影像诊断能力。',
    recommendedStageOrder: ['clinical-basics', 'specialty-advanced'],
    defaultStage: undefined,
    defaultSpecialty: 'ultrasound',
    defaultLearningGoal: 'specialty-transition',
    sortStrategy: 'stage-order',
    isMultiStage: true,
    isActive: true,
    color: 'purple',
  },
  
  'ophthalmology': {
    slug: 'ophthalmology',
    label: '眼科专科',
    description: '适合希望建立眼科基础与常见病例处理能力的医生',
    detailDescription: '眼科检查、常见眼病诊治、眼科手术基础，建立眼科专科能力。',
    recommendedStageOrder: ['clinical-basics', 'specialty-advanced'],
    defaultStage: undefined,
    defaultSpecialty: 'ophthalmology',
    defaultLearningGoal: 'specialty-transition',
    sortStrategy: 'stage-order',
    isMultiStage: true,
    isActive: true,
    color: 'teal',
  },
  
  'client-management': {
    slug: 'client-management',
    label: '客户经营',
    description: '适合希望提升客户沟通、复诊随访与服务能力的用户',
    detailDescription: '客户沟通技巧、长期关系建立、服务设计与定价，提升事业发展能力。',
    recommendedStageOrder: ['career-growth'],
    defaultStage: 'career-growth',
    defaultSpecialty: undefined,
    defaultLearningGoal: 'career-development',
    sortStrategy: 'stage-order',
    isMultiStage: false,
    isActive: true,
    color: 'amber',
  },
  
  'clinic-operations': {
    slug: 'clinic-operations',
    label: '诊所经营',
    description: '适合诊所负责人或有创业计划的用户',
    detailDescription: '诊所运营、团队管理、创业准备，为独立执业或创业做准备。',
    recommendedStageOrder: ['career-growth'],
    defaultStage: 'career-growth',
    defaultSpecialty: undefined,
    defaultLearningGoal: 'entrepreneurship',
    sortStrategy: 'stage-order',
    isMultiStage: false,
    isActive: true,
    color: 'rose',
  },
};

// ============================================================================
// Track 别名映射（兼容不同来源的参数格式）
// ============================================================================

const TRACK_ALIASES: Record<string, GrowthTrack> = {
  // 标准名称
  'entry-certification': 'entry-certification',
  'general-practice': 'general-practice',
  'surgery': 'surgery',
  'ultrasound-imaging': 'ultrasound-imaging',
  'ophthalmology': 'ophthalmology',
  'client-management': 'client-management',
  'clinic-operations': 'clinic-operations',
  
  // 成长体系页使用的 direction 参数别名
  'general': 'general-practice',
  'ultrasound': 'ultrasound-imaging',
  'customer': 'client-management',
  'clinic': 'clinic-operations',
  
  // 其他可能的别名
  'entry': 'entry-certification',
  'certification': 'entry-certification',
};

// ============================================================================
// 阶段别名映射（兼容不同来源的参数格式）
// ============================================================================

const STAGE_ALIASES: Record<string, CourseStage> = {
  // 标准名称
  'certification': 'certification',
  'clinical-basics': 'clinical-basics',
  'specialty-advanced': 'specialty-advanced',
  'advanced-practice': 'advanced-practice',
  'career-growth': 'career-growth',
  
  // 可能的别名
  'entry': 'certification',
  'clinical-foundation': 'clinical-basics',
  'premium-practical': 'advanced-practice',
  'career-development': 'career-growth',
};

// ============================================================================
// 专科别名映射
// ============================================================================

const SPECIALTY_ALIASES: Record<string, CourseSpecialty> = {
  'surgery': 'surgery',
  'ultrasound': 'ultrasound',
  'imaging': 'imaging',
  'ophthalmology': 'ophthalmology',
  'anesthesia': 'anesthesia',
  'internal': 'internal',
  'emergency': 'emergency',
  'dentistry': 'dentistry',
  'dermatology': 'dermatology',
  'general': 'general',
  'general-practice': 'general',
  'ultrasound-imaging': 'ultrasound',
};

// ============================================================================
// 核心解析函数
// ============================================================================

/**
 * 解析 track 参数，返回标准化的 GrowthTrack
 */
export function parseTrack(trackParam: string | null | undefined): GrowthTrack | null {
  if (!trackParam) return null;
  const normalized = trackParam.toLowerCase().trim();
  return TRACK_ALIASES[normalized] || null;
}

/**
 * 解析 stage 参数，返回标准化的 CourseStage
 */
export function parseStage(stageParam: string | null | undefined): CourseStage | null {
  if (!stageParam) return null;
  const normalized = stageParam.toLowerCase().trim();
  return STAGE_ALIASES[normalized] || null;
}

/**
 * 解析 specialty 参数，返回标准化的 CourseSpecialty
 */
export function parseSpecialty(specialtyParam: string | null | undefined): CourseSpecialty | null {
  if (!specialtyParam) return null;
  const normalized = specialtyParam.toLowerCase().trim();
  return SPECIALTY_ALIASES[normalized] || null;
}

/**
 * 解析 source 参数
 */
export function parseSource(sourceParam: string | null | undefined): SourceType {
  if (!sourceParam) return 'direct';
  const normalized = sourceParam.toLowerCase().trim();
  if (normalized === 'growth-system') return 'growth-system';
  if (normalized === 'homepage') return 'homepage';
  return 'other';
}

/**
 * 获取 track 对应的预设配置
 */
export function getTrackPreset(track: GrowthTrack): GrowthTrackPreset | null {
  const preset = GROWTH_TRACK_PRESETS[track];
  return preset?.isActive ? preset : null;
}

/**
 * 核心解析函数：从 URL 参数解析完整的预设应用结果
 */
export function resolveGrowthPreset(params: {
  source?: string | null;
  track?: string | null;
  stage?: string | null;
  specialty?: string | null;
  direction?: string | null; // 兼容成长体系页的 direction 参数
  category?: string | null; // 兼容旧版 category 参数
}): ResolvedPreset {
  // 解析 source
  const source = parseSource(params.source);
  const isGrowthSystemSource = source === 'growth-system';
  
  // 解析 track（兼容 direction 和 category 参数）
  const trackParam = params.track || params.direction || params.category;
  const track = parseTrack(trackParam);
  const preset = track ? getTrackPreset(track) : null;
  
  // 解析显式传入的 stage 和 specialty
  const explicitStage = parseStage(params.stage);
  const explicitSpecialty = parseSpecialty(params.specialty);
  
  // 确定应用的阶段
  let appliedStage: CourseStage = 'all';
  let isStageLocked = false;
  
  if (explicitStage) {
    // 显式传入了 stage，优先使用
    appliedStage = explicitStage;
    isStageLocked = true;
  } else if (preset?.defaultStage) {
    // 使用 preset 的默认阶段（单阶段方向）
    appliedStage = preset.defaultStage;
    isStageLocked = !preset.isMultiStage;
  }
  
  // 确定应用的专科
  let appliedSpecialty: CourseSpecialty = 'all';
  
  if (explicitSpecialty) {
    // 显式传入了 specialty
    // 检查是否与 preset 冲突
    if (preset?.defaultSpecialty && explicitSpecialty !== preset.defaultSpecialty) {
      // 有冲突，以 preset 为准
      appliedSpecialty = preset.defaultSpecialty;
    } else {
      appliedSpecialty = explicitSpecialty;
    }
  } else if (preset?.defaultSpecialty) {
    // 使用 preset 的默认专科
    appliedSpecialty = preset.defaultSpecialty;
  }
  
  // 确定排序用的阶段顺序
  const stageOrderForSort = preset?.recommendedStageOrder || [];
  
  return {
    track,
    preset,
    source,
    isGrowthSystemSource: isGrowthSystemSource || !!track,
    appliedStage,
    appliedSpecialty,
    stageOrderForSort,
    isStageLocked,
  };
}

/**
 * 应用预设到筛选状态
 */
export function applyPresetToFilters(
  resolved: ResolvedPreset,
  currentFilters: {
    stage: CourseStage;
    specialty: string;
    format: string;
    level: string;
    audience: string;
    goal: string;
    search: string;
  }
) {
  return {
    ...currentFilters,
    stage: resolved.appliedStage,
    specialty: resolved.appliedSpecialty === 'all' ? 'all' : resolved.appliedSpecialty,
    goal: resolved.preset?.defaultLearningGoal || currentFilters.goal,
  };
}

/**
 * 检查用户修改筛选后是否应退出 track 模式
 */
export function shouldExitTrackMode(
  resolved: ResolvedPreset,
  newFilters: {
    stage: CourseStage;
    specialty: string;
  }
): boolean {
  if (!resolved.preset) return false;
  
  const preset = resolved.preset;
  
  // 检查专科冲突：如果 preset 有默认专科，但用户选了不同的专科
  if (preset.defaultSpecialty && newFilters.specialty !== 'all') {
    if (newFilters.specialty !== preset.defaultSpecialty) {
      return true;
    }
  }
  
  // 检查阶段冲突：对于单阶段方向，如果用户选了不同的阶段
  if (!preset.isMultiStage && preset.defaultStage) {
    if (newFilters.stage !== 'all' && newFilters.stage !== preset.defaultStage) {
      return true;
    }
  }
  
  // 对于多阶段方向，只有选了不在推荐序列中的阶段才退出
  if (preset.isMultiStage && newFilters.stage !== 'all') {
    if (!preset.recommendedStageOrder.includes(newFilters.stage)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 构建 URL 参数字符串
 */
export function buildUrlParams(params: {
  source?: SourceType | null;
  track?: GrowthTrack | null;
  stage?: CourseStage | null;
  specialty?: CourseSpecialty | null;
}): string {
  const searchParams = new URLSearchParams();
  
  if (params.source && params.source !== 'direct') {
    searchParams.set('source', params.source);
  }
  if (params.track) {
    searchParams.set('track', params.track);
  }
  if (params.stage && params.stage !== 'all') {
    searchParams.set('stage', params.stage);
  }
  if (params.specialty && params.specialty !== 'all') {
    searchParams.set('specialty', params.specialty);
  }
  
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

/**
 * 获取所有已启用的 tracks
 */
export function getActiveGrowthTracks(): GrowthTrackPreset[] {
  return Object.values(GROWTH_TRACK_PRESETS).filter(p => p.isActive);
}
