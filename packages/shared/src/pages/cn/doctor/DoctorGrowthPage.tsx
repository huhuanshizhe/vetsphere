'use client';

import React from 'react';
import {
  TrendingUp, Award, BookOpen, Target, Star, ChevronRight, Download,
  CheckCircle2, PlayCircle, Lock, Sparkles, Briefcase, Store, Users,
  MessageCircle, Stethoscope, ArrowRight, Clock, Lightbulb, Zap
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
interface GrowthPathStep {
  id: string;
  name: string;
  status: 'completed' | 'ongoing' | 'recommended' | 'locked';
  courses: number;
  description: string;
}

interface SkillTag {
  id: string;
  name: string;
  level: 'basic' | 'advanced' | 'expert';
  sourceCourse: string;
  color: string;
}

interface GrowthRecord {
  id: string;
  courseName: string;
  completedDate: string;
  skillTags: string[];
  impact: string;
  thumbnail: string;
}

interface RecommendedGrowth {
  id: string;
  name: string;
  type: 'course' | 'direction';
  reason: string;
  benefit: string;
  thumbnail: string;
}

interface CareerInsight {
  id: string;
  title: string;
  description: string;
  type: 'job' | 'startup' | 'path';
  icon: React.ReactNode;
  action: string;
  actionLink: string;
}

// Placeholder data
const GROWTH_PATH_STEPS: GrowthPathStep[] = [
  { id: '1', name: '临床基础', status: 'completed', courses: 2, description: '完成基础诊疗与病历管理' },
  { id: '2', name: '软组织外科入门', status: 'completed', courses: 1, description: '掌握基础软组织手术技术' },
  { id: '3', name: '软组织外科进阶', status: 'ongoing', courses: 1, description: '深入学习复杂软组织手术' },
  { id: '4', name: '骨科基础', status: 'recommended', courses: 0, description: '开始骨科手术基础学习' },
  { id: '5', name: '外科专科认证', status: 'locked', courses: 0, description: '获得平台外科专科认证' }
];

const SKILL_TAGS: SkillTag[] = [
  { id: '1', name: '临床基础', level: 'advanced', sourceCourse: '小动物临床诊疗基础', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: '2', name: '诊断思维', level: 'advanced', sourceCourse: '小动物临床诊疗基础', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: '3', name: '软组织外科', level: 'basic', sourceCourse: '软组织外科实操入门', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: '4', name: '基础实操', level: 'basic', sourceCourse: '软组织外科实操入门', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: '5', name: '客户沟通', level: 'basic', sourceCourse: '兽医沟通与客户管理', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: '6', name: '服务管理', level: 'basic', sourceCourse: '兽医沟通与客户管理', color: 'bg-rose-100 text-rose-700 border-rose-200' }
];

const GROWTH_RECORDS: GrowthRecord[] = [
  {
    id: '1',
    courseName: '小动物临床诊疗基础',
    completedDate: '2024-12-15',
    skillTags: ['临床基础', '诊断思维'],
    impact: '解锁"临床基础"进阶等级，为外科学习打下基础',
    thumbnail: '📚'
  },
  {
    id: '2',
    courseName: '软组织外科实操入门',
    completedDate: '2024-11-20',
    skillTags: ['软组织外科', '基础实操'],
    impact: '开启外科进阶路径，解锁"软组织外科"技能标签',
    thumbnail: '🩺'
  },
  {
    id: '3',
    courseName: '兽医沟通与客户管理',
    completedDate: '2024-10-08',
    skillTags: ['客户沟通', '服务管理'],
    impact: '提升客户服务能力，为长期经营打基础',
    thumbnail: '💬'
  }
];

const RECOMMENDED_GROWTH: RecommendedGrowth[] = [
  {
    id: '1',
    name: 'CSAVS 小动物关节外科学',
    type: 'course',
    reason: '基于你正在学习的软组织外科课程，关节外科是外科进阶的重要下一步',
    benefit: '掌握关节手术基本技术，解锁"骨科基础"技能标签',
    thumbnail: '🦿'
  },
  {
    id: '2',
    name: '影像诊断方向',
    type: 'direction',
    reason: '影像诊断能力是外科医生的重要辅助能力，与你的外科路径高度互补',
    benefit: '提升术前评估与诊断准确率，拓展职业方向',
    thumbnail: '📷'
  },
  {
    id: '3',
    name: '术后管理与康复指导',
    type: 'course',
    reason: '你已完成软组织外科入门，术后管理能帮助提升手术效果与客户满意度',
    benefit: '系统掌握术后护理、康复计划制定',
    thumbnail: '💊'
  }
];

const CAREER_INSIGHTS: CareerInsight[] = [
  {
    id: '1',
    title: '你的技能标签匹配 3 个推荐岗位',
    description: '你的"软组织外科"和"临床基础"标签，匹配多个外科医生岗位。完成骨科基础后将解锁更多高薪岗位。',
    type: 'job',
    icon: <Briefcase className="w-5 h-5" />,
    action: '查看职业机会',
    actionLink: '/doctor/career'
  },
  {
    id: '2',
    title: '创业准备度: 65%',
    description: '你已具备临床能力与客户服务基础。建议继续提升外科专科能力和长期客户经营技能，以达到创业最佳准备状态。',
    type: 'startup',
    icon: <Store className="w-5 h-5" />,
    action: '查看创业中心',
    actionLink: '/doctor/startup'
  },
  {
    id: '3',
    title: '建议职业路径: 外科专科医生',
    description: '基于你的学习轨迹和技能积累，外科专科医生是当前最适合的职业发展方向。预计再完成2-3门课程可达到专科水平。',
    type: 'path',
    icon: <TrendingUp className="w-5 h-5" />,
    action: '查看完整建议',
    actionLink: '/doctor/career'
  }
];

// Current overview data
const CURRENT_OVERVIEW = {
  stage: '能力进阶期',
  direction: '外科进阶',
  completedCourses: 3,
  skillTags: 6,
  monthProgress: '12小时',
  advice: '继续完成当前软组织外科课程，下一步建议学习骨科基础，以完成外科进阶路径。'
};

// Step status config
const STEP_STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  completed: { color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: <CheckCircle2 className="w-5 h-5" />, label: '已完成' },
  ongoing: { color: 'text-amber-600', bgColor: 'bg-amber-500', icon: <PlayCircle className="w-5 h-5" />, label: '进行中' },
  recommended: { color: 'text-blue-600', bgColor: 'bg-blue-500', icon: <Star className="w-5 h-5" />, label: '推荐下一步' },
  locked: { color: 'text-slate-400', bgColor: 'bg-slate-300', icon: <Lock className="w-5 h-5" />, label: '待解锁' }
};

// Skill level config
const SKILL_LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  basic: { label: '基础', color: 'bg-slate-100 text-slate-600' },
  advanced: { label: '进阶', color: 'bg-amber-100 text-amber-700' },
  expert: { label: '高阶', color: 'bg-purple-100 text-purple-700' }
};

export function DoctorGrowthPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  return (
    <div className="space-y-6">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dw.growthTitle || '成长档案'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {dw.growthSubtitle || '记录你的学习成果、能力积累与成长方向，让每一步专业提升都成为长期可沉淀的职业资产。'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <a
            href={`/${locale}/courses`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {dw.growthViewSystem || '查看课程体系'}
          </a>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
            <TrendingUp className="w-4 h-4" />
            {dw.growthContinue || '继续成长'}
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            {dw.growthExport || '导出成长概览'}
          </button>
        </div>
      </div>

      {/* ===== Growth Overview Card (Main Hero) ===== */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl border border-amber-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-slate-900">{dw.growthOverviewTitle || '你的成长总览'}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stage & Direction */}
          <div className="bg-white/70 rounded-xl p-5">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">{dw.growthOverviewStage || '当前成长阶段'}</div>
                <div className="text-xl font-bold text-amber-600">{CURRENT_OVERVIEW.stage}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">{dw.growthOverviewDirection || '当前主方向'}</div>
                <div className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  {CURRENT_OVERVIEW.direction}
                </div>
              </div>
            </div>
          </div>
          {/* Center: Stats */}
          <div className="bg-white/70 rounded-xl p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-600">{CURRENT_OVERVIEW.completedCourses}</div>
                <div className="text-xs text-slate-500">{dw.growthOverviewCourses || '已完成课程'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{CURRENT_OVERVIEW.skillTags}</div>
                <div className="text-xs text-slate-500">{dw.growthOverviewSkills || '已解锁技能标签'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{CURRENT_OVERVIEW.monthProgress}</div>
                <div className="text-xs text-slate-500">{dw.growthOverviewMonthProgress || '本月学习进度'}</div>
              </div>
            </div>
          </div>
          {/* Right: Advice */}
          <div className="bg-white/70 rounded-xl p-5">
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {dw.growthOverviewAdvice || '成长建议'}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{CURRENT_OVERVIEW.advice}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
            {dw.growthOverviewViewPath || '查看成长路径'}
            <ChevronRight className="w-4 h-4" />
          </button>
          <a
            href={`/${locale}/doctor/courses`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-colors"
          >
            {dw.growthOverviewViewRecommend || '查看推荐学习'}
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ===== Growth Path Progress (Roadmap Style) ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">{dw.growthPathTitle || '你的成长路径进度'}</h3>
          </div>
          <span className="text-sm text-slate-500">{dw.growthPathCurrent || '当前路径'}: {CURRENT_OVERVIEW.direction}</span>
        </div>
        
        {/* Roadmap - Desktop horizontal */}
        <div className="hidden md:block">
          <div className="relative flex items-start justify-between">
            {/* Connection line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 z-0">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-200"
                style={{ width: '50%' }}
              />
            </div>
            {/* Steps */}
            {GROWTH_PATH_STEPS.map((step, idx) => {
              const config = STEP_STATUS_CONFIG[step.status];
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center w-1/5">
                  {/* Node */}
                  <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center text-white shadow-lg`}>
                    {config.icon}
                  </div>
                  {/* Content */}
                  <div className="mt-3 text-center">
                    <div className="font-semibold text-slate-900 text-sm">{step.name}</div>
                    <div className={`text-xs mt-1 ${config.color}`}>{config.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{step.description}</div>
                    {step.courses > 0 && (
                      <div className="text-xs text-slate-500 mt-1">{step.courses} 门课程</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roadmap - Mobile vertical */}
        <div className="md:hidden space-y-4">
          {GROWTH_PATH_STEPS.map((step, idx) => {
            const config = STEP_STATUS_CONFIG[step.status];
            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Vertical line */}
                {idx < GROWTH_PATH_STEPS.length - 1 && (
                  <div className="absolute left-5 top-12 w-0.5 h-full bg-slate-200">
                    {step.status === 'completed' && <div className="w-full h-full bg-emerald-500" />}
                  </div>
                )}
                {/* Node */}
                <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center text-white shrink-0`}>
                  {config.icon}
                </div>
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="font-semibold text-slate-900">{step.name}</div>
                  <div className={`text-xs mt-0.5 ${config.color}`}>{config.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            {dw.growthPathViewFull || '查看完整路径'}
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
            <PlayCircle className="w-4 h-4" />
            {dw.growthPathContinue || '继续当前课程'}
          </button>
        </div>
      </div>

      {/* ===== Skill Tags Section ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-500" />
          {dw.growthSkillsTitle || '已解锁技能标签'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SKILL_TAGS.map(tag => (
            <div key={tag.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${tag.color}`}>
                  {tag.name}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${SKILL_LEVEL_CONFIG[tag.level].color}`}>
                  {SKILL_LEVEL_CONFIG[tag.level].label}
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                <span className="text-slate-400">{dw.growthSkillsSource || '来源课程'}:</span> {tag.sourceCourse}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="text-xs text-slate-500 hover:text-slate-700">
                  {dw.growthSkillsViewCourse || '查看对应课程'}
                </button>
                <span className="text-slate-300">|</span>
                <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  {dw.growthSkillsContinue || '继续提升该方向'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Growth Records Section ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {dw.growthRecordsTitle || '你的成长记录'}
        </h3>
        <div className="space-y-3">
          {GROWTH_RECORDS.map(record => (
            <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                  {record.thumbnail}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-900">{record.courseName}</h4>
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {record.completedDate}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {record.skillTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-slate-600 flex items-start gap-1">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{record.impact}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Recommended Next Growth ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">{dw.growthRecommendTitle || '推荐下一步成长方向'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RECOMMENDED_GROWTH.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    {item.thumbnail}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900">{item.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                      item.type === 'course' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'course' ? '课程' : '方向'}
                    </span>
                  </div>
                </div>
                {/* Reason */}
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <div className="text-xs font-medium text-amber-700 mb-1">{dw.growthRecommendReason || '推荐原因'}</div>
                  <div className="text-xs text-slate-600">{item.reason}</div>
                </div>
                {/* Benefit */}
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">{dw.growthRecommendBenefit || '能带来什么提升'}</div>
                  <div className="text-xs text-slate-600">{item.benefit}</div>
                </div>
              </div>
              {/* Actions */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button className="text-xs text-slate-500 hover:text-slate-700">
                  {dw.growthRecommendView || '查看课程'}
                </button>
                <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                  <Star className="w-3.5 h-3.5" />
                  {dw.growthRecommendAddPlan || '加入成长计划'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Growth to Career/Startup Connection ===== */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-900">{dw.growthCareerTitle || '成长如何影响你的职业与事业'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CAREER_INSIGHTS.map(insight => (
            <div key={insight.id} className={`bg-white rounded-xl p-5 border ${
              insight.type === 'job' ? 'border-blue-200' :
              insight.type === 'startup' ? 'border-teal-200' : 'border-amber-200'
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                insight.type === 'job' ? 'bg-blue-100 text-blue-600' :
                insight.type === 'startup' ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {insight.icon}
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-2">{insight.title}</h4>
              <p className="text-xs text-slate-500 mb-4">{insight.description}</p>
              <a
                href={`/${locale}${insight.actionLink}`}
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  insight.type === 'job' ? 'text-blue-600 hover:text-blue-700' :
                  insight.type === 'startup' ? 'text-teal-600 hover:text-teal-700' : 'text-amber-600 hover:text-amber-700'
                }`}
              >
                {insight.action} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Platform Suggestions ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          {dw.growthSuggestTitle || '平台建议'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Continue Direction */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.growthSuggestContinue || '当前值得继续的方向'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">外科进阶路径已完成 60%，继续学习可解锁专科认证</p>
            <button className="text-xs text-amber-600 font-medium hover:text-amber-700">
              {dw.growthSuggestExplore || '探索'} →
            </button>
          </div>
          {/* New Courses */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.growthSuggestCourse || '适合你的新课程'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">基于你的学习轨迹，推荐 CSAVS 关节外科学</p>
            <button className="text-xs text-blue-600 font-medium hover:text-blue-700">
              {dw.growthSuggestExplore || '探索'} →
            </button>
          </div>
          {/* Case Discussion */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-teal-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.growthSuggestCase || '相关病例讨论'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">3 个软组织外科相关病例讨论等你参与</p>
            <button className="text-xs text-teal-600 font-medium hover:text-teal-700">
              {dw.growthSuggestJoin || '参与'} →
            </button>
          </div>
          {/* Community Topics */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.growthSuggestCommunity || '相关社区话题'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">外科进阶话题组有 12 位同行在讨论</p>
            <button className="text-xs text-purple-600 font-medium hover:text-purple-700">
              {dw.growthSuggestJoin || '参与'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorGrowthPage;
