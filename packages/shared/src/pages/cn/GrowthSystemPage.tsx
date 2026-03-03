'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp, BookOpen, Award, Target, Users, Stethoscope, Eye,
  Heart, ArrowRight, CheckCircle2, Sparkles, ChevronRight, Star,
  GraduationCap, Briefcase, Store, MessageCircle, Play, Zap
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

// Growth directions
interface GrowthDirection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  courses: number;
  popular?: boolean;
}

// Learning stages
interface LearningStage {
  id: string;
  name: string;
  description: string;
  duration: string;
  focus: string[];
}

// Start recommendation
interface StartRecommendation {
  id: string;
  title: string;
  forWho: string;
  suggestion: string;
  action: string;
  href: string;
  color: string;
}

// Post-training support
interface PostTrainingSupport {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

// Tailwind safelist – keep these class names visible for Tailwind v4 source scanning
// bg-blue-100 bg-blue-50 text-blue-600 hover:text-blue-700 hover:border-blue-300 bg-blue-500
// bg-purple-100 bg-purple-50 text-purple-600 hover:text-purple-700 hover:border-purple-300 bg-purple-500
// bg-teal-100 bg-teal-50 text-teal-600 hover:text-teal-700 hover:border-teal-300 bg-teal-500
// bg-emerald-100 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 bg-emerald-500
// bg-amber-100 bg-amber-50 text-amber-600 hover:text-amber-700 hover:border-amber-300 bg-amber-500
// bg-rose-100 bg-rose-50 text-rose-600 hover:text-rose-700 hover:border-rose-300 bg-rose-500 bg-rose-500/20 text-rose-400
// bg-indigo-100 bg-indigo-50 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300 bg-indigo-500 bg-indigo-500/20 text-indigo-400

// Growth directions data (7 directions matching growth-track-preset.ts)
const GROWTH_DIRECTIONS: GrowthDirection[] = [
  {
    id: 'certification',
    name: '考证入行',
    description: '执业资格备考、行业入门规范与基础能力建立',
    icon: <GraduationCap className="w-6 h-6" />,
    color: 'rose',
    courses: 3
  },
  {
    id: 'general',
    name: '全科基础',
    description: '临床诊断思维、常见病诊疗、基础操作规范',
    icon: <Heart className="w-6 h-6" />,
    color: 'emerald',
    courses: 6
  },
  {
    id: 'surgery',
    name: '外科进阶',
    description: '软组织外科、骨科、神经外科等系统专科训练',
    icon: <Stethoscope className="w-6 h-6" />,
    color: 'blue',
    courses: 8,
    popular: true
  },
  {
    id: 'ultrasound',
    name: '超声影像',
    description: '腹部超声、心脏超声、介入超声等影像诊断技能',
    icon: <Target className="w-6 h-6" />,
    color: 'purple',
    courses: 5
  },
  {
    id: 'ophthalmology',
    name: '眼科专科',
    description: '眼科检查、常见眼病诊治、眼科手术基础',
    icon: <Eye className="w-6 h-6" />,
    color: 'teal',
    courses: 4
  },
  {
    id: 'customer',
    name: '客户经营',
    description: '客户沟通、长期关系建立、服务设计与定价',
    icon: <Users className="w-6 h-6" />,
    color: 'amber',
    courses: 3
  },
  {
    id: 'clinic-operations',
    name: '诊所经营',
    description: '诊所运营管理、团队建设、创业规划与商业模式',
    icon: <Store className="w-6 h-6" />,
    color: 'indigo',
    courses: 2
  }
];

// Learning stages data
const LEARNING_STAGES: LearningStage[] = [
  {
    id: '1',
    name: '基础夯实期',
    description: '建立临床基础能力与规范化诊疗思维',
    duration: '3-6个月',
    focus: ['临床诊断思维', '基础操作规范', '常见病诊疗']
  },
  {
    id: '2',
    name: '能力进阶期',
    description: '深化专业方向，建立核心竞争力',
    duration: '6-12个月',
    focus: ['专科技能训练', '复杂病例处理', '技能标签积累']
  },
  {
    id: '3',
    name: '专科深耕期',
    description: '成为专科领域的可信赖医生',
    duration: '12-24个月',
    focus: ['专科认证准备', '疑难病例能力', '同行认可建立']
  },
  {
    id: '4',
    name: '独立执业期',
    description: '具备独立执业或创业的综合能力',
    duration: '持续积累',
    focus: ['独立诊疗能力', '客户经营能力', '事业发展准备']
  }
];

// Start recommendations
const START_RECOMMENDATIONS: StartRecommendation[] = [
  {
    id: '1',
    title: '刚毕业 / 临床经验较少',
    forWho: '适合毕业1-2年，希望建立系统临床能力的医生',
    suggestion: '建议从"全科基础"方向开始，建立规范化诊疗思维',
    action: '查看全科基础课程',
    href: '/courses?direction=general&source=growth-system',
    color: 'emerald'
  },
  {
    id: '2',
    title: '有一定经验 / 想深耕专科',
    forWho: '适合有2-5年经验，希望在某个专科领域深入发展的医生',
    suggestion: '建议选择外科/超声/眼科等专科方向，系统进阶',
    action: '查看专科进阶课程',
    href: '/courses?direction=surgery&source=growth-system',
    color: 'blue'
  },
  {
    id: '3',
    title: '资深医生 / 考虑创业',
    forWho: '适合有5年以上经验，希望探索更大事业方向的医生',
    suggestion: '建议关注"客户经营"方向，为独立执业或创业做准备',
    action: '查看客户经营课程',
    href: '/courses?direction=customer&source=growth-system',
    color: 'amber'
  }
];

// Post-training support
const POST_TRAINING_SUPPORT: PostTrainingSupport[] = [
  {
    id: '1',
    name: '我的课程',
    description: '继续学习，追踪进度，获取证书',
    icon: <BookOpen className="w-5 h-5" />,
    href: '/doctor/courses',
    color: 'blue'
  },
  {
    id: '2',
    name: '成长档案',
    description: '沉淀学习成果，建立长期发展资产',
    icon: <Award className="w-5 h-5" />,
    href: '/doctor/growth',
    color: 'amber'
  },
  {
    id: '3',
    name: '医生社区',
    description: '病例讨论，导师答疑，同行交流',
    icon: <MessageCircle className="w-5 h-5" />,
    href: '/doctor/community',
    color: 'purple'
  },
  {
    id: '4',
    name: '职业机会',
    description: '基于成长方向，获得岗位推荐',
    icon: <Briefcase className="w-5 h-5" />,
    href: '/doctor/career',
    color: 'teal'
  },
  {
    id: '5',
    name: '创业中心',
    description: '评估创业准备度，获取创业支持',
    icon: <Store className="w-5 h-5" />,
    href: '/doctor/startup',
    color: 'rose'
  }
];

// Featured courses per direction
const FEATURED_COURSES: Record<string, { id: string; name: string; level: string }[]> = {
  certification: [
    { id: 'vet-license-prep', name: '执业兽医资格考试备考指南', level: '基础' },
    { id: 'industry-entry', name: '宠物医疗行业入职规范', level: '基础' }
  ],
  general: [
    { id: 'clinical-thinking', name: '临床诊断思维训练', level: '基础' },
    { id: 'common-diseases', name: '犬猫常见病诊疗规范', level: '基础' }
  ],
  surgery: [
    { id: 'csavs-soft-2026', name: 'CSAVS 小动物软组织外科学', level: '进阶' },
    { id: 'csavs-joint-2026', name: 'CSAVS 小动物关节外科学', level: '进阶' }
  ],
  ultrasound: [
    { id: 'ultrasound-abdomen', name: '腹部超声系统诊断', level: '进阶' },
    { id: 'ultrasound-heart', name: '心脏超声基础与进阶', level: '进阶' }
  ],
  ophthalmology: [
    { id: 'csavs-eye-2026', name: 'CSAVS 小动物眼科学', level: '进阶' },
    { id: 'eye-surgery-basic', name: '眼科手术基础', level: '基础' }
  ],
  customer: [
    { id: 'customer-management', name: '兽医客户管理与服务设计', level: '进阶' },
    { id: 'service-pricing', name: '服务定价与价值沟通', level: '进阶' }
  ],
  'clinic-operations': [
    { id: 'clinic-management', name: '宠物诊所运营管理实务', level: '进阶' },
    { id: 'startup-planning', name: '诊所创业准备与商业规划', level: '进阶' }
  ]
};

export function GrowthSystemPage() {
  const { locale } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Hero Section ===== */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
              <span className="text-emerald-300 font-medium text-sm">宠医界</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              成长体系
            </h1>
            <p className="text-xl sm:text-2xl text-emerald-100 font-medium mb-4">
              不是学一门课，而是走一条长期成长路径
            </p>
            <p className="text-lg text-emerald-200 leading-relaxed mb-8">
              宠医界为宠物医生构建了系统化的专业成长体系，从基础到专科，从临床到事业，持续陪伴你的每一步成长。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/${locale}/courses`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                浏览全部课程
              </Link>
              <a
                href="#growth-directions"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                了解成长方向
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* ===== Why This is a Real Growth System ===== */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 rounded-2xl border border-emerald-200/60 p-8 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">为什么这是一个真正的成长体系</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/70 rounded-xl p-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">系统化 vs 零散学习</h3>
              <p className="text-sm text-slate-600">每个成长方向都有完整的课程序列，从基础到进阶，循序渐进而非东学一点西学一点。</p>
            </div>
            <div className="bg-white/70 rounded-xl p-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">长期规划 vs 单次学习</h3>
              <p className="text-sm text-slate-600">不只是完成一门课程，而是帮助你看清未来1-3年的成长路径，持续积累专业能力。</p>
            </div>
            <div className="bg-white/70 rounded-xl p-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">能力沉淀 vs 学完即止</h3>
              <p className="text-sm text-slate-600">学习成果沉淀为成长档案，转化为职业机会与创业准备，让每一步学习都有长期价值。</p>
            </div>
          </div>
        </div>

        {/* ===== Growth Directions Overview ===== */}
        <div id="growth-directions" className="mb-12 scroll-mt-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">成长方向总览</h2>
            <p className="text-slate-500">选择一个适合你的方向，开始系统化成长</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GROWTH_DIRECTIONS.map(dir => (
              <div
                key={dir.id}
                className={`bg-white rounded-xl border border-slate-200 p-6 hover:shadow-xl transition-all hover:border-${dir.color}-300 group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-${dir.color}-100 rounded-xl flex items-center justify-center text-${dir.color}-600`}>
                    {dir.icon}
                  </div>
                  {dir.popular && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> 热门
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{dir.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{dir.description}</p>
                
                {/* Featured courses */}
                <div className="space-y-2 mb-4">
                  {FEATURED_COURSES[dir.id]?.slice(0, 2).map(course => (
                    <div key={course.id} className="flex items-center gap-2 text-xs">
                      <Play className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600 truncate">{course.name}</span>
                      <span className={`px-1.5 py-0.5 bg-${dir.color}-50 text-${dir.color}-600 rounded text-[10px]`}>
                        {course.level}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{dir.courses} 门课程</span>
                  <Link
                    href={`/${locale}/courses?direction=${dir.id}&source=growth-system`}
                    className={`text-sm font-medium text-${dir.color}-600 hover:text-${dir.color}-700 flex items-center gap-1 group-hover:underline`}
                  >
                    查看方向课程 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Stage-based Learning Path ===== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">阶段式学习路径</h2>
            <p className="text-slate-500">从入门到独立执业，每个阶段都有明确的成长目标</p>
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Connection line */}
              <div className="absolute top-10 left-0 right-0 h-1 bg-slate-200 z-0">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 via-purple-500 to-amber-500" />
              </div>
              {/* Stages */}
              <div className="relative z-10 grid grid-cols-4 gap-4">
                {LEARNING_STAGES.map((stage, idx) => (
                  <div key={stage.id} className="flex flex-col items-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg ${
                      idx === 0 ? 'bg-emerald-500' :
                      idx === 1 ? 'bg-blue-500' :
                      idx === 2 ? 'bg-purple-500' : 'bg-amber-500'
                    }`}>
                      <span className="text-2xl font-bold">{idx + 1}</span>
                    </div>
                    <div className="mt-4 text-center">
                      <h4 className="font-bold text-slate-900">{stage.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{stage.duration}</p>
                      <p className="text-sm text-slate-600 mt-2">{stage.description}</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1">
                        {stage.focus.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {LEARNING_STAGES.map((stage, idx) => (
              <div key={stage.id} className="relative flex items-start gap-4">
                {idx < LEARNING_STAGES.length - 1 && (
                  <div className="absolute left-6 top-14 w-0.5 h-full bg-slate-200" />
                )}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 ${
                  idx === 0 ? 'bg-emerald-500' :
                  idx === 1 ? 'bg-blue-500' :
                  idx === 2 ? 'bg-purple-500' : 'bg-amber-500'
                }`}>
                  <span className="font-bold">{idx + 1}</span>
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{stage.name}</h4>
                    <span className="text-xs text-slate-400">{stage.duration}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{stage.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {stage.focus.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Where Should I Start ===== */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">从哪里开始？</h2>
            <p className="text-slate-500">根据你的背景，选择适合的入口</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {START_RECOMMENDATIONS.map(rec => (
              <div
                key={rec.id}
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow`}
              >
                <div className={`h-2 bg-${rec.color}-500`} />
                <div className="p-6">
                  <h3 className="font-bold text-slate-900 mb-2">{rec.title}</h3>
                  <p className="text-xs text-slate-400 mb-3">{rec.forWho}</p>
                  <p className="text-sm text-slate-600 mb-4">{rec.suggestion}</p>
                  <Link
                    href={`/${locale}${rec.href}`}
                    className={`inline-flex items-center gap-1 text-sm font-medium text-${rec.color}-600 hover:text-${rec.color}-700`}
                  >
                    {rec.action} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Post-Training Support ===== */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 mb-12 text-white">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">学完之后，平台继续支持你</h2>
            <p className="text-slate-400">学习只是开始，成长档案、社区、职业、创业——持续陪伴</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {POST_TRAINING_SUPPORT.map(support => (
              <Link
                key={support.id}
                href={isAuthenticated ? `/${locale}${support.href}` : `/${locale}/auth`}
                className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition-colors group"
              >
                <div className={`w-12 h-12 bg-${support.color}-500/20 rounded-xl flex items-center justify-center text-${support.color}-400 mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  {support.icon}
                </div>
                <h4 className="font-semibold text-sm">{support.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{support.description}</p>
              </Link>
            ))}
          </div>
          {!isAuthenticated && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400 mb-3">登录后可使用以上功能</p>
              <Link
                href={`/${locale}/auth`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                立即登录
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* ===== Final CTA ===== */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            开始你的系统化成长之路
          </h2>
          <p className="text-emerald-100 mb-8 max-w-2xl mx-auto">
            浏览全部课程，找到适合你当前阶段的学习内容，或登录后获得个性化的成长建议。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/courses`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              浏览全部课程
            </Link>
            {isAuthenticated ? (
              <Link
                href={`/${locale}/doctor/courses`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white border border-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                查看我的课程
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/${locale}/auth`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white border border-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                登录获取建议
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GrowthSystemPage;
