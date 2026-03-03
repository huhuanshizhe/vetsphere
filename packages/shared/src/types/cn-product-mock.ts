/**
 * 中国站商品详情页 Mock 数据
 * 
 * 包含 3 套示例数据：
 * 1. 标准耗材/小工具（standard）
 * 2. 中客单工具/小设备（consultative）
 * 3. 高客单设备/方案型产品（solution）
 */

import { Specialty } from '../types';
import { CnProductDetailData } from './cn-product-detail';

// ============================================================================
// Mock 数据 1：标准耗材/小工具
// ============================================================================

export const MOCK_PRODUCT_STANDARD: CnProductDetailData = {
  // 基础信息
  id: 'suture-kit-basic',
  name: '可吸收缝合线套装',
  slug: 'suture-kit-basic',
  brand: 'ETHICON',
  category: '耗材',
  subCategory: '缝合材料',
  tags: ['frequent-restock', 'course-same'],
  images: [
    { url: '/images/products/suture-kit-1.jpg', alt: '可吸收缝合线套装主图', type: 'main' },
    { url: '/images/products/suture-kit-2.jpg', alt: '产品细节图', type: 'detail' },
    { url: '/images/products/suture-kit-scene.jpg', alt: '手术使用场景', type: 'scene' },
  ],
  shortDescription: '医用级可吸收缝合线，适用于软组织闭合',
  oneLinePositioning: '日常手术必备耗材，品质稳定，吸收可控',
  keySpecs: [
    { label: '规格', value: '3-0, 4-0, 5-0 混合装' },
    { label: '长度', value: '70cm/根' },
    { label: '吸收周期', value: '60-90天' },
    { label: '数量', value: '36根/盒' },
  ],

  // 决策信息
  useScenarios: ['日常门诊接诊', '常规手术辅助', '绝育手术'],
  specialties: ['软组织外科', '综合外科'],
  targetUsers: ['临床兽医', '手术室护士'],
  doctorStages: ['clinical-basics', 'specialty-advanced'],
  primaryDoctorStage: 'clinical-basics',
  clinicStages: ['basic-clinic', 'stable-operation'],
  recommendationReason: '品质稳定，吸收可控，是诊所日常手术的首选耗材',
  decisionSummary: {
    suitableFor: '所有需要进行软组织缝合的临床医生',
    solvesWhat: '软组织手术后的创口闭合需求',
    whyRecommend: '品牌信赖度高，吸收周期稳定，手感顺滑',
    nextStep: '直接采购即可，建议保持库存',
  },

  // 采购信息
  pricingMode: 'direct-price',
  displayPrice: 280,
  purchaseType: 'standard',
  minOrderUnit: '1盒',
  supportsBulkPurchase: true,
  supportsPlanConsultation: false,
  requiresAdvisorSupport: false,
  deliveryInfo: '现货供应，下单后1-2个工作日发货',
  afterSalesInfo: '支持批次问题退换',

  // 详细内容
  functionsAndUsage: '用于软组织手术中的创口闭合，适用于皮下组织、筋膜、肌肉等部位的缝合。可吸收材质，无需拆线，减少复诊次数。',
  coreParameters: [
    { label: '材质', value: 'Polyglactin 910' },
    { label: '针型', value: '圆针/三角针混装' },
    { label: '颜色', value: '紫色（可视性好）' },
    { label: '灭菌方式', value: 'EO灭菌' },
    { label: '保质期', value: '3年' },
  ],
  usageSuggestions: [
    '根据组织厚度选择合适规格',
    '3-0适用于皮下组织，4-0适用于皮内，5-0适用于精细操作',
    '建议在干燥环境下储存',
  ],
  bundleSuggestions: [
    '搭配持针器使用效果更佳',
    '建议同时备有不可吸收缝线作为补充',
  ],
  supportServices: [
    '支持批量采购优惠',
    '提供使用培训资料',
  ],

  // 课程关联
  relatedCourses: [
    {
      id: 'soft-tissue-basics',
      title: '软组织外科基础训练',
      slug: 'soft-tissue-basics',
      stage: 'clinical-basics',
      specialty: '软组织外科',
      relationType: 'used-in-course',
      relationNote: '该课程教学中使用该款缝合线进行实操训练',
      imageUrl: '/images/courses/soft-tissue-basics.jpg',
    },
    {
      id: 'suture-techniques',
      title: '缝合技术专项提升',
      slug: 'suture-techniques',
      stage: 'specialty-advanced',
      specialty: '外科技术',
      relationType: 'learn-after-buy',
      relationNote: '采购后建议学习该课程提升缝合技巧',
      imageUrl: '/images/courses/suture-techniques.jpg',
    },
  ],
  mentorRecommended: false,
  isCourseSameAsShown: true,

  // 推荐商品
  bundleProducts: [
    {
      id: 'needle-holder-standard',
      name: '标准持针器',
      slug: 'needle-holder-standard',
      image: '/images/products/needle-holder.jpg',
      tag: '常搭配购买',
      shortReason: '缝合必备配套工具',
      pricingMode: 'direct-price',
      displayPrice: 320,
    },
    {
      id: 'surgical-scissors',
      name: '手术剪',
      slug: 'surgical-scissors',
      image: '/images/products/surgical-scissors.jpg',
      shortReason: '剪线必备',
      pricingMode: 'direct-price',
      displayPrice: 180,
    },
  ],
  alternatives: [
    {
      id: 'suture-kit-premium',
      name: '进口高端缝合线套装',
      slug: 'suture-kit-premium',
      image: '/images/products/suture-premium.jpg',
      tag: '升级选择',
      shortReason: '更细腻的手感，更稳定的吸收',
      pricingMode: 'login-to-view',
      displayPrice: 520,
    },
  ],
  upgradeRecommendations: [
    {
      id: 'suture-kit-pro',
      name: '专科级缝合线套装',
      slug: 'suture-kit-pro',
      image: '/images/products/suture-pro.jpg',
      tag: '专科升级',
      shortReason: '适合眼科、神经外科等精细操作',
      pricingMode: 'login-to-view',
      displayPrice: 680,
    },
  ],

  // 兼容字段
  specialty: Specialty.SOFT_TISSUE,
  group: 'Consumables',
  price: 280,
  stockStatus: 'In Stock',
  supplier: { name: 'ETHICON', origin: '美国', rating: 5 },
};

// ============================================================================
// Mock 数据 2：中客单工具/小设备
// ============================================================================

export const MOCK_PRODUCT_CONSULTATIVE: CnProductDetailData = {
  // 基础信息
  id: 'tplo-saw-blade-set',
  name: 'TPLO 锯片套装',
  slug: 'tplo-saw-blade-set',
  brand: 'SYNTHES',
  category: '手术器械',
  subCategory: '骨科工具',
  tags: ['course-same', 'mentor-recommended'],
  images: [
    { url: '/images/products/tplo-saw-1.jpg', alt: 'TPLO锯片套装主图', type: 'main' },
    { url: '/images/products/tplo-saw-2.jpg', alt: '锯片细节', type: 'detail' },
    { url: '/images/products/tplo-saw-course.jpg', alt: '课程实操使用', type: 'course-scene' },
  ],
  shortDescription: 'TPLO手术专用锯片，精准截骨必备',
  oneLinePositioning: '训练营同款，导师首推的TPLO截骨工具',
  keySpecs: [
    { label: '规格', value: '2.0mm / 2.5mm 双规格' },
    { label: '材质', value: '医用级钛合金' },
    { label: '适配', value: '通用动力系统接口' },
    { label: '数量', value: '4片/套' },
  ],

  // 决策信息
  useScenarios: ['TPLO手术', '骨科专科手术', '专科训练实操'],
  specialties: ['骨科', '关节外科'],
  targetUsers: ['骨科专科医生', '参加骨科训练营的医生'],
  doctorStages: ['specialty-advanced', 'advanced-practice'],
  primaryDoctorStage: 'specialty-advanced',
  clinicStages: ['specialty-upgrade', 'stable-operation'],
  recommendationReason: '训练营同款，讲师亲测推荐，截骨精准稳定',
  decisionSummary: {
    suitableFor: '正在或准备开展TPLO手术的骨科医生',
    solvesWhat: 'TPLO手术中的精准截骨需求',
    whyRecommend: '与训练营教学一致，学完即可无缝衔接临床',
    nextStep: '建议先参加TPLO训练营学习，再采购使用',
  },

  // 采购信息
  pricingMode: 'login-to-view',
  displayPrice: 3200,
  purchaseType: 'consultative',
  minOrderUnit: '1套',
  supportsBulkPurchase: true,
  supportsPlanConsultation: true,
  requiresAdvisorSupport: false,
  deliveryInfo: '现货供应，下单后2-3个工作日发货',
  afterSalesInfo: '支持质量问题退换，提供使用指导',

  // 详细内容
  functionsAndUsage: '专为TPLO（胫骨平台水平化截骨术）设计的锯片套装。采用医用级钛合金材质，锯齿经过精密加工，确保截骨精准、创面平整。适配主流动力系统，操作便捷。',
  coreParameters: [
    { label: '锯片直径', value: '2.0mm / 2.5mm' },
    { label: '锯片厚度', value: '0.6mm' },
    { label: '材质', value: '医用级钛合金 Ti-6Al-4V' },
    { label: '接口标准', value: 'AO/ASIF 通用接口' },
    { label: '灭菌方式', value: '高压蒸汽灭菌' },
    { label: '建议使用次数', value: '单片15-20次' },
  ],
  usageSuggestions: [
    '建议配合专用夹具使用，提高截骨稳定性',
    '使用前检查锯片完整性',
    '每次使用后及时清洁消毒',
    '锯片磨损后及时更换，避免影响截骨质量',
  ],
  bundleSuggestions: [
    '搭配TPLO定位器使用',
    '建议同时配备骨科动力系统',
    '配套骨蜡和止血材料',
  ],
  supportServices: [
    '提供使用培训视频',
    '支持课程配套推荐',
    '专业顾问选型支持',
  ],

  // 课程关联
  relatedCourses: [
    {
      id: 'csavs-joint-2026',
      title: 'CSAVS 关节外科训练营',
      slug: 'csavs-joint-2026',
      stage: 'advanced-practice',
      specialty: '关节外科',
      relationType: 'same-course-kit',
      relationNote: '训练营中使用的同款锯片，学完即可无缝衔接',
      isSourceCourse: true,
      imageUrl: '/images/courses/csavs-joint.jpg',
    },
    {
      id: 'tplo-basics',
      title: 'TPLO手术入门',
      slug: 'tplo-basics',
      stage: 'specialty-advanced',
      specialty: '骨科',
      relationType: 'learn-before-buy',
      relationNote: '建议先学习该课程掌握基础理论',
      imageUrl: '/images/courses/tplo-basics.jpg',
    },
    {
      id: 'ortho-advanced',
      title: '骨科高级实操训练',
      slug: 'ortho-advanced',
      stage: 'advanced-practice',
      specialty: '骨科',
      relationType: 'mentor-pick',
      relationNote: '课程讲师王医生日常使用的器械',
      imageUrl: '/images/courses/ortho-advanced.jpg',
    },
  ],
  mentorRecommended: true,
  isCourseSameAsShown: true,

  // 推荐商品
  bundleProducts: [
    {
      id: 'tplo-jig',
      name: 'TPLO定位器',
      slug: 'tplo-jig',
      image: '/images/products/tplo-jig.jpg',
      tag: '必备配套',
      shortReason: '精准定位截骨角度',
      pricingMode: 'inquiry',
    },
    {
      id: 'bone-wax',
      name: '骨蜡',
      slug: 'bone-wax',
      image: '/images/products/bone-wax.jpg',
      shortReason: '截骨面止血',
      pricingMode: 'direct-price',
      displayPrice: 45,
    },
  ],
  alternatives: [
    {
      id: 'tplo-saw-economy',
      name: '经济型TPLO锯片',
      slug: 'tplo-saw-economy',
      image: '/images/products/tplo-economy.jpg',
      tag: '经济选择',
      shortReason: '性价比选择，适合入门练习',
      pricingMode: 'direct-price',
      displayPrice: 1800,
    },
  ],
  upgradeRecommendations: [
    {
      id: 'power-drill-system',
      name: '骨科动力系统套装',
      slug: 'power-drill-system',
      image: '/images/products/power-system.jpg',
      tag: '设备升级',
      shortReason: '完整骨科手术动力解决方案',
      pricingMode: 'inquiry',
    },
  ],

  // 兼容字段
  specialty: Specialty.ORTHOPEDICS,
  group: 'HandInstruments',
  price: 3200,
  stockStatus: 'In Stock',
  supplier: { name: 'SYNTHES', origin: '瑞士', rating: 5 },
};

// ============================================================================
// Mock 数据 3：高客单设备/方案型产品
// ============================================================================

export const MOCK_PRODUCT_SOLUTION: CnProductDetailData = {
  // 基础信息
  id: 'ultrasound-system-pro',
  name: '高端彩色超声诊断系统',
  slug: 'ultrasound-system-pro',
  brand: 'GE Healthcare',
  category: '诊断设备',
  subCategory: '超声设备',
  tags: ['equipment-upgrade', 'startup-suitable'],
  images: [
    { url: '/images/products/ultrasound-1.jpg', alt: '超声诊断系统主图', type: 'main' },
    { url: '/images/products/ultrasound-2.jpg', alt: '操作界面', type: 'detail' },
    { url: '/images/products/ultrasound-clinic.jpg', alt: '诊所使用场景', type: 'scene' },
  ],
  shortDescription: '专业级彩色超声诊断系统，支持心脏、腹部、肌骨等多模态检查',
  oneLinePositioning: '诊所升级首选，一台设备满足多科室诊断需求',
  keySpecs: [
    { label: '显示器', value: '21.5英寸高清触控屏' },
    { label: '探头', value: '4探头配置（腹部/心脏/血管/肌骨）' },
    { label: '图像模式', value: 'B/M/彩色/频谱多普勒' },
    { label: '存储', value: '500GB SSD + 云端备份' },
  ],

  // 决策信息
  useScenarios: ['诊所设备升级', '新店开业配置', '影像科室建设', '心脏/腹部超声诊断'],
  specialties: ['超声影像', '心脏内科', '综合诊断'],
  targetUsers: ['诊所负责人', '影像科医生', '创业准备者'],
  doctorStages: ['career-growth', 'advanced-practice'],
  primaryDoctorStage: 'career-growth',
  clinicStages: ['specialty-upgrade', 'brand-expansion', 'new-opening'],
  recommendationReason: '一台设备覆盖多科室需求，投资回报率高',
  decisionSummary: {
    suitableFor: '计划升级诊断能力或新开业的诊所',
    solvesWhat: '多科室超声诊断的设备需求',
    whyRecommend: '品牌可靠，功能全面，售后有保障',
    nextStep: '建议先咨询方案顾问，了解配置建议',
  },

  // 采购信息
  pricingMode: 'inquiry',
  displayPrice: undefined,
  purchaseType: 'solution',
  minOrderUnit: '1台',
  supportsBulkPurchase: false,
  supportsPlanConsultation: true,
  requiresAdvisorSupport: true,
  deliveryInfo: '订单确认后4-6周交付，含安装调试',
  afterSalesInfo: '2年整机保修，终身技术支持，定期巡检服务',

  // 详细内容
  functionsAndUsage: '专为宠物医院设计的高端彩色超声诊断系统，支持腹部、心脏、血管、肌骨等多部位检查。配备AI辅助诊断模块，可自动测量关键参数，生成标准化报告。支持DICOM标准，可与医院信息系统无缝对接。',
  coreParameters: [
    { label: '显示器', value: '21.5英寸LED高清触控屏' },
    { label: '分辨率', value: '1920×1080' },
    { label: '图像模式', value: 'B/M/Color/PW/CW/PDI' },
    { label: '探头频率', value: '2-15MHz（根据探头型号）' },
    { label: '深度', value: '最大30cm' },
    { label: '帧率', value: '最高600fps' },
    { label: '存储', value: '500GB SSD' },
    { label: '接口', value: 'USB 3.0 × 4, HDMI, LAN' },
  ],
  usageSuggestions: [
    '建议配置独立超声检查室',
    '日常检查前做好探头消毒',
    '定期进行设备校准和维护',
    '建议配备UPS电源保护',
  ],
  bundleSuggestions: [
    '搭配超声检查床使用',
    '配备专用打印机输出报告',
    '建议配置备用探头',
  ],
  supportServices: [
    '专业顾问配置建议',
    '安装调试培训',
    '2年整机质保',
    '终身技术支持',
    '定期巡检维护',
    '远程诊断支持',
  ],

  // 课程关联
  relatedCourses: [
    {
      id: 'ultrasound-basics',
      title: '宠物超声诊断入门',
      slug: 'ultrasound-basics',
      stage: 'clinical-basics',
      specialty: '超声影像',
      relationType: 'learn-after-buy',
      relationNote: '采购后建议学习该课程提升诊断技能',
      imageUrl: '/images/courses/ultrasound-basics.jpg',
    },
    {
      id: 'cardiac-ultrasound',
      title: '心脏超声专项训练',
      slug: 'cardiac-ultrasound',
      stage: 'specialty-advanced',
      specialty: '心脏内科',
      relationType: 'learn-after-buy',
      relationNote: '深入学习心脏超声诊断',
      imageUrl: '/images/courses/cardiac-ultrasound.jpg',
    },
    {
      id: 'abdominal-ultrasound',
      title: '腹部超声诊断精讲',
      slug: 'abdominal-ultrasound',
      stage: 'specialty-advanced',
      specialty: '超声影像',
      relationType: 'learn-after-buy',
      relationNote: '系统学习腹部超声诊断流程',
      imageUrl: '/images/courses/abdominal-ultrasound.jpg',
    },
  ],
  mentorRecommended: false,
  isCourseSameAsShown: false,

  // 推荐商品
  bundleProducts: [
    {
      id: 'ultrasound-gel',
      name: '医用超声耦合剂',
      slug: 'ultrasound-gel',
      image: '/images/products/ultrasound-gel.jpg',
      tag: '必备耗材',
      shortReason: '超声检查必需品',
      pricingMode: 'direct-price',
      displayPrice: 35,
    },
    {
      id: 'exam-table',
      name: '超声检查床',
      slug: 'exam-table',
      image: '/images/products/exam-table.jpg',
      shortReason: '专业检查环境',
      pricingMode: 'inquiry',
    },
  ],
  alternatives: [
    {
      id: 'ultrasound-portable',
      name: '便携式超声诊断仪',
      slug: 'ultrasound-portable',
      image: '/images/products/ultrasound-portable.jpg',
      tag: '轻量选择',
      shortReason: '适合出诊或空间有限的诊所',
      pricingMode: 'inquiry',
    },
  ],
  upgradeRecommendations: [
    {
      id: 'imaging-suite',
      name: '影像科室整体解决方案',
      slug: 'imaging-suite',
      image: '/images/products/imaging-suite.jpg',
      tag: '整体方案',
      shortReason: '超声+X光+内窥镜一站式配置',
      pricingMode: 'inquiry',
    },
  ],

  // 兼容字段
  specialty: Specialty.ULTRASOUND,
  group: 'Equipment',
  price: 0,
  stockStatus: 'In Stock',
  supplier: { name: 'GE Healthcare', origin: '美国', rating: 5 },
};

// ============================================================================
// Mock 数据集合
// ============================================================================

export const CN_MOCK_PRODUCTS: Record<string, CnProductDetailData> = {
  'suture-kit-basic': MOCK_PRODUCT_STANDARD,
  'tplo-saw-blade-set': MOCK_PRODUCT_CONSULTATIVE,
  'ultrasound-system-pro': MOCK_PRODUCT_SOLUTION,
};

/** 根据 ID 获取 Mock 商品数据 */
export function getMockProductById(id: string): CnProductDetailData | undefined {
  return CN_MOCK_PRODUCTS[id];
}
