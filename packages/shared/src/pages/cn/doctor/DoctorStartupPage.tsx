'use client';

import React from 'react';
import {
  Store, Target, TrendingUp, CheckCircle2, AlertCircle, ChevronRight,
  BookOpen, Users, Wrench, FileText, Clipboard, Heart, Stethoscope,
  ArrowRight, Home, Award, Sparkles, Lock, PlayCircle, Star
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
interface PathStep {
  id: string;
  name: string;
  status: 'completed' | 'ongoing' | 'upcoming' | 'locked';
  meaning: string;
  support: string;
}

interface ReadinessMetric {
  id: string;
  name: string;
  score: number;
  status: 'ready' | 'improving' | 'need';
  detail: string;
}

interface ToolkitItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface GapItem {
  id: string;
  name: string;
  description: string;
  recommendedCourse: string;
  recommendedPath: string;
  icon: React.ReactNode;
}

interface FutureDirection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// Placeholder data
const STARTUP_PATH: PathStep[] = [
  {
    id: '1',
    name: '专业能力积累',
    status: 'completed',
    meaning: '通过系统课程学习，建立临床诊疗、外科操作等核心专业能力',
    support: '国际认证课程、技能标签体系、实操训练支持'
  },
  {
    id: '2',
    name: '客户经营能力建立',
    status: 'ongoing',
    meaning: '学习如何建立长期客户关系，管理宠物健康档案，提供持续服务',
    support: '客户管理工具、随访系统、问诊平台'
  },
  {
    id: '3',
    name: '健康服务模型搭建',
    status: 'upcoming',
    meaning: '理解健康管理中心的服务模型，设计自己的服务体系',
    support: '服务模型模板、定价指南、流程设计工具'
  },
  {
    id: '4',
    name: '轻量创业准备',
    status: 'upcoming',
    meaning: '完成设备采购、场地规划、运营准备等创业前期工作',
    support: '设备建议清单、选址指南、运营准备清单'
  },
  {
    id: '5',
    name: '进入试运营阶段',
    status: 'locked',
    meaning: '正式开始健康管理中心运营，服务第一批客户',
    support: '运营指导、问题诊断、持续优化支持'
  }
];

const READINESS_METRICS: ReadinessMetric[] = [
  { id: '1', name: '专业能力基础', score: 75, status: 'improving', detail: '已完成3门核心课程，外科技能达到进阶水平' },
  { id: '2', name: '客户经营能力', score: 55, status: 'need', detail: '客户管理经验有限，建议加强长期服务意识培养' },
  { id: '3', name: '长期服务意识', score: 60, status: 'improving', detail: '随访与复诊习惯正在建立，需继续强化' },
  { id: '4', name: '职业阶段成熟度', score: 70, status: 'improving', detail: '处于能力进阶期，具备一定的独立执业基础' }
];

const TOOLKIT_ITEMS: ToolkitItem[] = [
  { id: '1', name: '服务模型设计', description: '健康管理中心的服务体系设计模板与指南', icon: <FileText className="w-5 h-5" />, color: 'amber' },
  { id: '2', name: '基础设备建议', description: '轻医疗模式下的设备采购清单与选型建议', icon: <Wrench className="w-5 h-5" />, color: 'blue' },
  { id: '3', name: '客户经营模型', description: '从单次服务到长期关系的客户经营方法论', icon: <Users className="w-5 h-5" />, color: 'teal' },
  { id: '4', name: '运营准备清单', description: '从0到1开业前的完整准备工作清单', icon: <Clipboard className="w-5 h-5" />, color: 'purple' }
];

const GAP_ITEMS: GapItem[] = [
  { id: '1', name: '客户经营与长期服务能力', description: '建立宠主信任、维护长期关系、提供持续价值', recommendedCourse: '兽医客户管理与服务设计', recommendedPath: '客户经营能力路径', icon: <Users className="w-5 h-5" /> },
  { id: '2', name: '复诊/随访流程管理能力', description: '系统化管理复诊安排、随访提醒、健康追踪', recommendedCourse: '临床随访与复诊管理', recommendedPath: '服务流程优化路径', icon: <Clipboard className="w-5 h-5" /> },
  { id: '3', name: '健康管理服务设计能力', description: '设计健康体检、长期管理计划、定价策略', recommendedCourse: '宠物健康管理服务设计', recommendedPath: '服务产品化路径', icon: <Heart className="w-5 h-5" /> },
  { id: '4', name: '基础运营意识', description: '理解成本、定价、客户获取、服务交付', recommendedCourse: '兽医诊所运营基础', recommendedPath: '创业准备路径', icon: <Store className="w-5 h-5" /> }
];

const FUTURE_DIRECTIONS: FutureDirection[] = [
  { id: '1', name: '健康体检中心', description: '为宠物提供定期健康检查、早期疾病筛查、健康报告服务', icon: <Stethoscope className="w-5 h-5" />, color: 'emerald' },
  { id: '2', name: '长期健康管理服务', description: '针对慢性病、老年宠物、特殊需求宠物的持续健康管理', icon: <Heart className="w-5 h-5" />, color: 'rose' },
  { id: '3', name: '家庭医生式宠物健康顾问', description: '成为宠物家庭的专属健康顾问，提供长期咨询与指导', icon: <Home className="w-5 h-5" />, color: 'blue' }
];

// Current overview
const STARTUP_OVERVIEW = {
  direction: '新型宠物健康管理中心',
  features: ['医生主导', '轻医疗模式', '长期健康管理', '会员制服务'],
  fitScore: 65,
  platformHint: '你已具备一定的专业基础，建议继续强化客户经营能力和健康服务设计能力，预计完成2-3门相关课程后将达到更好的创业准备状态。'
};

// Step status config
const STEP_STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  completed: { color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: <CheckCircle2 className="w-5 h-5" /> },
  ongoing: { color: 'text-amber-600', bgColor: 'bg-amber-500', icon: <PlayCircle className="w-5 h-5" /> },
  upcoming: { color: 'text-blue-600', bgColor: 'bg-blue-500', icon: <Star className="w-5 h-5" /> },
  locked: { color: 'text-slate-400', bgColor: 'bg-slate-300', icon: <Lock className="w-5 h-5" /> }
};

// Readiness status config
const READINESS_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ready: { label: '已准备', color: 'bg-emerald-100 text-emerald-700' },
  improving: { label: '提升中', color: 'bg-amber-100 text-amber-700' },
  need: { label: '待加强', color: 'bg-rose-100 text-rose-700' }
};

export function DoctorStartupPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  // Calculate overall readiness
  const overallReadiness = Math.round(READINESS_METRICS.reduce((sum, m) => sum + m.score, 0) / READINESS_METRICS.length);

  return (
    <div className="space-y-6">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dw.startupTitle || '创业中心'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {dw.startupSubtitle || '从专业成长走向事业发展，帮助你理解、准备并逐步探索新型宠物健康管理中心的创业路径。'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
            <Target className="w-4 h-4" />
            {dw.startupViewPath || '查看创业路径'}
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            {dw.startupAssess || '评估我的准备度'}
          </button>
          <a
            href={`/${locale}/doctor/growth`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {dw.startupViewGrowth || '查看成长档案'}
          </a>
        </div>
      </div>

      {/* ===== Startup Direction Overview (Main Hero) ===== */}
      <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 rounded-2xl border border-teal-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-900">{dw.startupOverviewTitle || '你正在走向怎样的事业方向'}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Direction Name */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{dw.startupOverviewDirection || '创业方向'}</div>
            <div className="text-xl font-bold text-teal-700">{STARTUP_OVERVIEW.direction}</div>
          </div>
          {/* Features */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-2">{dw.startupOverviewFeatures || '核心特点'}</div>
            <div className="flex flex-wrap gap-1.5">
              {STARTUP_OVERVIEW.features.map((f, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">{f}</span>
              ))}
            </div>
          </div>
          {/* Fit Score */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{dw.startupOverviewFitScore || '当前适合度'}</div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-teal-600">{STARTUP_OVERVIEW.fitScore}%</span>
            </div>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${STARTUP_OVERVIEW.fitScore}%` }} />
            </div>
          </div>
          {/* Platform Hint */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {dw.startupOverviewPlatformHint || '平台建议'}
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">{STARTUP_OVERVIEW.platformHint}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
            {dw.startupOverviewViewPath || '查看完整创业路径'}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-teal-200 text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors">
            {dw.startupOverviewViewGap || '查看我还缺什么'}
          </button>
        </div>
      </div>

      {/* ===== What Is a New Pet Health Management Center ===== */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{dw.startupModelTitle || '什么是新型宠物健康管理中心'}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {dw.startupModelDesc || '这不是传统宠物医院，也不是普通宠物用品店。而是一种以医生为核心、轻医疗、长期健康管理为主的新型服务模式。'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Compare 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">{dw.startupModelCompare1 || '相比宠物医院'}</div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                投入成本更低，无需大型设备
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                专注健康管理，非急诊/手术
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                客户关系更长期、更深入
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                服务模式更灵活、可复制
              </li>
            </ul>
          </div>
          {/* Compare 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">{dw.startupModelCompare2 || '相比宠物用品店'}</div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                以专业服务为核心，非纯零售
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                医生专业背景带来信任优势
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                服务附加值更高，利润更稳定
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                建立会员制长期收入模式
              </li>
            </ul>
          </div>
          {/* Core Value */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-5">
            <div className="text-sm font-semibold text-teal-700 mb-3">{dw.startupModelCompare3 || '核心价值'}</div>
            <ul className="space-y-2 text-xs text-teal-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                医生主导的专业健康服务
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                宠物全生命周期健康管理
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                长期会员关系与持续价值
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                轻资产、可复制的商业模式
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== Startup Path Breakdown ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">{dw.startupPathTitle || '从医生到事业经营者的创业路径'}</h3>
        
        {/* Desktop horizontal path */}
        <div className="hidden md:block">
          <div className="relative flex items-start justify-between">
            {/* Connection line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 z-0">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-slate-200" style={{ width: '35%' }} />
            </div>
            {/* Steps */}
            {STARTUP_PATH.map((step) => {
              const config = STEP_STATUS_CONFIG[step.status];
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center w-1/5">
                  <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center text-white shadow-lg`}>
                    {config.icon}
                  </div>
                  <div className="mt-3 text-center max-w-[140px]">
                    <div className="font-semibold text-slate-900 text-sm">{step.name}</div>
                    <div className={`text-xs mt-1 ${config.color}`}>
                      {step.status === 'completed' ? '已完成' :
                       step.status === 'ongoing' ? '进行中' :
                       step.status === 'upcoming' ? '待开始' : '待解锁'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile vertical path */}
        <div className="md:hidden space-y-4">
          {STARTUP_PATH.map((step, idx) => {
            const config = STEP_STATUS_CONFIG[step.status];
            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {idx < STARTUP_PATH.length - 1 && (
                  <div className="absolute left-5 top-12 w-0.5 h-full bg-slate-200">
                    {step.status === 'completed' && <div className="w-full h-full bg-emerald-500" />}
                  </div>
                )}
                <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center text-white shrink-0`}>
                  {config.icon}
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-semibold text-slate-900">{step.name}</div>
                  <div className={`text-xs mt-0.5 ${config.color}`}>
                    {step.status === 'completed' ? '已完成' :
                     step.status === 'ongoing' ? '进行中' :
                     step.status === 'upcoming' ? '待开始' : '待解锁'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current step detail */}
        <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <PlayCircle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-slate-900">当前阶段: {STARTUP_PATH.find(s => s.status === 'ongoing')?.name}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-1">{dw.startupPathMeaning || '这个阶段意味着'}</div>
              <div className="text-slate-700">{STARTUP_PATH.find(s => s.status === 'ongoing')?.meaning}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">{dw.startupPathSupport || '平台可以支持'}</div>
              <div className="text-slate-700">{STARTUP_PATH.find(s => s.status === 'ongoing')?.support}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Startup Readiness ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">{dw.startupReadinessTitle || '我的创业准备度'}</h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-teal-600">{overallReadiness}%</div>
            <div className="text-xs text-slate-500">综合准备度</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {READINESS_METRICS.map(metric => (
            <div key={metric.id} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">{metric.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${READINESS_STATUS_CONFIG[metric.status].color}`}>
                  {READINESS_STATUS_CONFIG[metric.status].label}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      metric.status === 'ready' ? 'bg-emerald-500' :
                      metric.status === 'improving' ? 'bg-amber-500' : 'bg-rose-400'
                    }`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700">{metric.score}%</span>
              </div>
              <p className="text-xs text-slate-500">{metric.detail}</p>
            </div>
          ))}
        </div>

        {/* Conclusion */}
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
          <div className="text-sm font-medium text-teal-700 mb-2 flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            {dw.startupReadinessConclusion || '平台结论'}
          </div>
          <p className="text-sm text-slate-700">
            你已具备创业的专业基础，但客户经营能力和长期服务意识还需要进一步加强。建议在未来1-2个月内完成客户管理相关课程，同时在日常工作中强化随访和复诊习惯。
          </p>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <a
            href={`/${locale}/doctor/courses`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {dw.startupReadinessViewCourse || '查看建议课程'}
          </a>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <Wrench className="w-4 h-4" />
            {dw.startupReadinessViewToolkit || '查看创业工具包'}
          </button>
        </div>
      </div>

      {/* ===== Startup Toolkit ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-teal-500" />
          {dw.startupToolkitTitle || '平台为你准备的创业工具包'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLKIT_ITEMS.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 bg-${item.color}-100 rounded-lg flex items-center justify-center text-${item.color}-600 mb-3`}>
                {item.icon}
              </div>
              <h4 className="font-semibold text-slate-900">{item.name}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">{item.description}</p>
              <button className={`text-xs text-${item.color}-600 font-medium hover:text-${item.color}-700`}>
                查看详情 →
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
            {dw.startupToolkitViewDetail || '查看详细工具包'}
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-50 transition-colors">
            {dw.startupToolkitJoinPlan || '加入创业准备计划'}
          </button>
        </div>
      </div>

      {/* ===== What You Still Need to Build ===== */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">{dw.startupGapTitle || '在开始之前，你可能还需要补足这些能力'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAP_ITEMS.map(gap => (
            <div key={gap.id} className="bg-white/80 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  {gap.icon}
                </div>
                <div className="font-semibold text-slate-900">{gap.name}</div>
              </div>
              <p className="text-xs text-slate-500 mb-3">{gap.description}</p>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-400">{dw.startupGapRecommendCourse || '推荐课程'}:</span>
                  <span className="text-amber-600 ml-1">{gap.recommendedCourse}</span>
                </div>
                <div>
                  <span className="text-slate-400">{dw.startupGapRecommendPath || '推荐成长路径'}:</span>
                  <span className="text-slate-600 ml-1">{gap.recommendedPath}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <a
            href={`/${locale}/doctor/courses`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            {dw.startupGapAction || '去补足这些能力'}
          </a>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors">
            {dw.startupGapViewLearning || '查看推荐学习'}
          </button>
        </div>
      </div>

      {/* ===== Future Service Directions ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          {dw.startupFutureTitle || '你未来可以发展的服务方向'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FUTURE_DIRECTIONS.map(dir => (
            <div key={dir.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow`}>
              <div className={`h-1.5 bg-${dir.color}-500`} />
              <div className="p-5">
                <div className={`w-10 h-10 bg-${dir.color}-100 rounded-lg flex items-center justify-center text-${dir.color}-600 mb-3`}>
                  {dir.icon}
                </div>
                <h4 className="font-semibold text-slate-900">{dir.name}</h4>
                <p className="text-xs text-slate-500 mt-2">{dir.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Connect Back to Platform ===== */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">{dw.startupLinkTitle || '创业不是跳跃，而是你成长路径的延伸'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href={`/${locale}/doctor/growth`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <span className="font-medium text-slate-900">{dw.startupLinkGrowth || '查看成长档案'}</span>
          </a>
          <a
            href={`/${locale}/doctor/courses`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-slate-900">{dw.startupLinkCourses || '查看我的课程'}</span>
          </a>
          <a
            href={`/${locale}/doctor`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-slate-600" />
            </div>
            <span className="font-medium text-slate-900">{dw.startupLinkWorkspace || '回到工作台'}</span>
          </a>
        </div>
      </div>

      {/* ===== Final CTA ===== */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">{dw.startupCtaTitle || '当你准备好更大的事业方向，平台会继续陪你往前走'}</h3>
        <p className="text-teal-100 text-sm mb-6">从专业学习到临床实践，从客户经营到事业发展，宠医界始终与你同行。</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors">
            <Target className="w-4 h-4" />
            {dw.startupCtaJoinPlan || '加入创业准备计划'}
          </button>
          <a
            href={`/${locale}/doctor/courses`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {dw.startupCtaViewCourses || '查看推荐课程'}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default DoctorStartupPage;
