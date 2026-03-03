'use client';

import React, { useState } from 'react';
import {
  Search, Filter, GraduationCap, BookOpen, Award, Target, TrendingUp,
  Clock, Calendar, ArrowRight, CheckCircle2, PlayCircle, Star,
  MessageCircle, Users, FileText, Download, ChevronRight, Lightbulb,
  Stethoscope, ClipboardList, Heart, Sparkles
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
interface OngoingCourse {
  id: string;
  name: string;
  direction: string;
  progress: number;
  lastStudyDate: string;
  nextSchedule: string;
  status: 'active' | 'paused';
  thumbnail: string;
}

interface CompletedCourse {
  id: string;
  name: string;
  completedDate: string;
  skillTags: string[];
  courseType: 'theory' | 'practical' | 'hybrid';
  addedToProfile: boolean;
  thumbnail: string;
}

interface RecommendedCourse {
  id: string;
  name: string;
  reason: string;
  benefit: string;
  thumbnail: string;
  direction: string;
}

interface ClinicalInsight {
  id: string;
  title: string;
  description: string;
  relatedCourse: string;
  relatedWork: string;
  icon: React.ReactNode;
}

// Placeholder data
const ONGOING_COURSES: OngoingCourse[] = [
  {
    id: '1',
    name: 'CSAVS 小动物软组织外科学',
    direction: '外科进阶',
    progress: 65,
    lastStudyDate: '2天前',
    nextSchedule: '本周六 14:00',
    status: 'active',
    thumbnail: '🔬'
  },
  {
    id: '2',
    name: '犬猫骨科基础',
    direction: '骨科入门',
    progress: 40,
    lastStudyDate: '5天前',
    nextSchedule: '待安排',
    status: 'active',
    thumbnail: '🦴'
  },
  {
    id: '3',
    name: '超声影像判读进阶',
    direction: '影像诊断',
    progress: 20,
    lastStudyDate: '1周前',
    nextSchedule: '下周一 19:00',
    status: 'paused',
    thumbnail: '📷'
  }
];

const COMPLETED_COURSES: CompletedCourse[] = [
  {
    id: '1',
    name: '小动物临床诊疗基础',
    completedDate: '2024-12-15',
    skillTags: ['临床基础', '诊断思维'],
    courseType: 'theory',
    addedToProfile: true,
    thumbnail: '📚'
  },
  {
    id: '2',
    name: '软组织外科实操入门',
    completedDate: '2024-11-20',
    skillTags: ['软组织外科', '基础实操'],
    courseType: 'practical',
    addedToProfile: true,
    thumbnail: '🩺'
  },
  {
    id: '3',
    name: '兽医沟通与客户管理',
    completedDate: '2024-10-08',
    skillTags: ['客户沟通', '服务管理'],
    courseType: 'theory',
    addedToProfile: false,
    thumbnail: '💬'
  }
];

const RECOMMENDED_COURSES: RecommendedCourse[] = [
  {
    id: '1',
    name: 'CSAVS 小动物关节外科学',
    reason: '基于你正在学习的软组织外科课程，关节外科是外科进阶的重要下一步',
    benefit: '掌握关节手术基本技术，提升骨科综合能力',
    thumbnail: '🦿',
    direction: '骨科进阶'
  },
  {
    id: '2',
    name: '术后管理与康复指导',
    reason: '你已完成软组织外科入门，术后管理能帮助提升手术效果与客户满意度',
    benefit: '系统掌握术后护理、康复计划制定',
    thumbnail: '💊',
    direction: '临床综合'
  },
  {
    id: '3',
    name: '影像学判读高级课程',
    reason: '你正在学习超声影像判读，高级课程将帮助你建立更完整的影像诊断能力',
    benefit: '提升复杂病例的影像诊断准确率',
    thumbnail: '🖥️',
    direction: '影像诊断'
  }
];

const CLINICAL_INSIGHTS: ClinicalInsight[] = [
  {
    id: '1',
    title: '你学的软组织外科知识，可以帮助处理当前的创伤病例',
    description: '你最近有3个创伤相关病历，课程中的缝合技术与伤口处理方法可以直接应用',
    relatedCourse: 'CSAVS 小动物软组织外科学',
    relatedWork: '3个创伤病历待处理',
    icon: <Stethoscope className="w-5 h-5" />
  },
  {
    id: '2',
    title: '骨科基础课程的康复知识，可以指导你的术后随访',
    description: '你有2位术后客户待随访，课程中的康复评估方法可以帮助你更好地跟进恢复情况',
    relatedCourse: '犬猫骨科基础',
    relatedWork: '2位术后客户待随访',
    icon: <ClipboardList className="w-5 h-5" />
  },
  {
    id: '3',
    title: '客户沟通课程的技巧，帮助你处理长期健康管理客户',
    description: '你有5位长期健康管理客户，课程中的沟通技巧可以帮助你建立更好的客户关系',
    relatedCourse: '兽医沟通与客户管理',
    relatedWork: '5位长期管理客户',
    icon: <Heart className="w-5 h-5" />
  }
];

// Growth path data
const CURRENT_GROWTH_PATH = {
  name: '外科进阶路径',
  completedCourses: 2,
  ongoingCourses: 1,
  nextRecommended: 'CSAVS 小动物关节外科学',
  unlockTarget: '骨科专科认证',
  coursesNeeded: 3
};

export function DoctorCoursesPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'completed' | 'recommended'>('ongoing');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter courses based on search
  const filterCourses = <T extends { name: string }>(courses: T[]): T[] => {
    if (!searchQuery) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredOngoing = filterCourses(ONGOING_COURSES);
  const filteredCompleted = filterCourses(COMPLETED_COURSES);
  const filteredRecommended = filterCourses(RECOMMENDED_COURSES);

  // Stats
  const stats = [
    { label: dw.coursesStatCompleted || '已完成课程', value: COMPLETED_COURSES.length, icon: <Award className="w-5 h-5" />, color: 'text-emerald-500 bg-emerald-50' },
    { label: dw.coursesStatOngoing || '正在学习', value: ONGOING_COURSES.length, icon: <BookOpen className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
    { label: dw.coursesStatMonthProgress || '本月学习进度', value: '12小时', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50' },
    { label: dw.coursesStatSkillTags || '已解锁技能标签', value: 6, icon: <Target className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50' },
    { label: dw.coursesStatGrowthPath || '当前成长方向', value: '外科进阶', icon: <TrendingUp className="w-5 h-5" />, color: 'text-rose-500 bg-rose-50' }
  ];

  // Tabs
  const tabs = [
    { key: 'all' as const, label: dw.coursesTabAll || '全部课程', count: ONGOING_COURSES.length + COMPLETED_COURSES.length },
    { key: 'ongoing' as const, label: dw.coursesTabOngoing || '进行中', count: ONGOING_COURSES.length },
    { key: 'completed' as const, label: dw.coursesTabCompleted || '已完成', count: COMPLETED_COURSES.length },
    { key: 'recommended' as const, label: dw.coursesTabRecommended || '推荐学习', count: RECOMMENDED_COURSES.length }
  ];

  // Course type config
  const COURSE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    theory: { label: dw.coursesCompletedTypeTheory || '理论课程', color: 'bg-blue-100 text-blue-700' },
    practical: { label: dw.coursesCompletedTypePractical || '实操课程', color: 'bg-orange-100 text-orange-700' },
    hybrid: { label: dw.coursesCompletedTypeHybrid || '理论+实操', color: 'bg-purple-100 text-purple-700' }
  };

  return (
    <div className="space-y-6">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dw.coursesTitle || '我的课程'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {dw.coursesSubtitle || '管理你的学习进度、成长路径与课程记录，让每一次学习都真正转化为临床能力与长期职业价值。'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dw.coursesSearch || '搜索课程名、方向或技能标签...'}
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          {/* Filter */}
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            {dw.coursesFilter || '筛选'}
          </button>
          {/* View Course System */}
          <a
            href={`/${locale}/courses`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {dw.coursesViewSystem || '查看课程体系'}
          </a>
          {/* Continue Learning */}
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
            <PlayCircle className="w-4 h-4" />
            {dw.coursesContinueLearning || '继续学习'}
          </button>
        </div>
      </div>

      {/* ===== Growth Summary Stats ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Current Growth Path (Main Feature) ===== */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl border border-amber-200/60 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">{dw.coursesPathTitle || '你当前的成长路径'}</h2>
            </div>
            <div className="bg-white/70 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white text-2xl">
                  🎯
                </div>
                <div>
                  <div className="text-sm text-slate-500">{dw.coursesPathCurrent || '当前路径'}</div>
                  <div className="text-xl font-bold text-slate-900">{CURRENT_GROWTH_PATH.name}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{CURRENT_GROWTH_PATH.completedCourses}</div>
                  <div className="text-xs text-slate-500">{dw.coursesPathCompleted || '已完成'}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{CURRENT_GROWTH_PATH.ongoingCourses}</div>
                  <div className="text-xs text-slate-500">{dw.coursesPathOngoing || '进行中'}</div>
                </div>
                <div className="col-span-2 text-left">
                  <div className="text-sm font-medium text-slate-700">{dw.coursesPathNext || '推荐下一步'}</div>
                  <div className="text-sm text-slate-600">{CURRENT_GROWTH_PATH.nextRecommended}</div>
                </div>
              </div>
            </div>
            {/* Unlock hint */}
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-slate-600">
                {dw.coursesPathUnlockHint || '距离解锁'}
                <span className="font-semibold text-amber-600 mx-1">{CURRENT_GROWTH_PATH.unlockTarget}</span>
                {dw.coursesPathUnlockSuffix || '还差'}
                <span className="font-semibold text-amber-600 mx-1">{CURRENT_GROWTH_PATH.coursesNeeded}</span>
                {dw.coursesPathUnlockCourses || '门课'}
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a
              href={`/${locale}/doctor/growth`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-colors"
            >
              {dw.coursesPathViewFull || '查看完整路径'}
              <ChevronRight className="w-4 h-4" />
            </a>
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
              <PlayCircle className="w-4 h-4" />
              {dw.coursesPathContinue || '继续学习当前课程'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Course Tabs ===== */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-amber-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === tab.key ? 'bg-amber-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      {(activeTab === 'all' || activeTab === 'ongoing') && filteredOngoing.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            {dw.coursesOngoingTitle || '进行中的课程'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOngoing.map(course => (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                      {course.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{course.name}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">{course.direction}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          course.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {course.status === 'active' ? '学习中' : '已暂停'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>{dw.coursesOngoingProgress || '学习进度'}</span>
                      <span className="font-medium text-amber-600">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{dw.coursesOngoingLastStudy || '上次学习'}: {course.lastStudyDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dw.coursesOngoingNextSchedule || '下一次'}: {course.nextSchedule}</span>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button className="text-xs text-slate-500 hover:text-slate-700">
                    {dw.coursesOngoingDetail || '查看课程详情'}
                  </button>
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                    <PlayCircle className="w-3.5 h-3.5" />
                    {dw.coursesOngoingContinue || '继续学习'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'completed') && filteredCompleted.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            {dw.coursesCompletedTitle || '已完成课程'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompleted.map(course => (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                      {course.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{course.name}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {dw.coursesCompletedDate || '完成时间'}: {course.completedDate}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${COURSE_TYPE_CONFIG[course.courseType].color}`}>
                          {COURSE_TYPE_CONFIG[course.courseType].label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Skill tags */}
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-2">{dw.coursesCompletedSkills || '技能标签'}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {course.skillTags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Profile status */}
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    {course.addedToProfile ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600">{dw.coursesCompletedAddedToProfile || '已添加到成长档案'}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                        <span className="text-slate-500">{dw.coursesCompletedNotAdded || '未添加到成长档案'}</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button className="text-xs text-slate-500 hover:text-slate-700">
                    {dw.coursesCompletedViewRecord || '查看记录'}
                  </button>
                  {course.addedToProfile ? (
                    <a href={`/${locale}/doctor/growth`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                      {dw.coursesCompletedViewProfile || '查看成长档案'}
                    </a>
                  ) : (
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                      {dw.coursesCompletedAddToProfile || '添加到档案'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'recommended') && filteredRecommended.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">{dw.coursesRecommendedTitle || '推荐下一步学习'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecommended.map(course => (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                      {course.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{course.name}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">{course.direction}</div>
                    </div>
                  </div>
                  {/* Reason */}
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs font-medium text-amber-700 mb-1">{dw.coursesRecommendedReason || '推荐原因'}</div>
                    <div className="text-xs text-slate-600">{course.reason}</div>
                  </div>
                  {/* Benefit */}
                  <div className="mt-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">{dw.coursesRecommendedBenefit || '能提升什么'}</div>
                    <div className="text-xs text-slate-600">{course.benefit}</div>
                  </div>
                </div>
                {/* Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <a href={`/${locale}/courses`} className="text-xs text-slate-500 hover:text-slate-700">
                    {dw.coursesRecommendedView || '查看课程'}
                  </a>
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                    <Star className="w-3.5 h-3.5" />
                    {dw.coursesRecommendedAddPlan || '加入学习计划'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Learning to Clinical Work Connection ===== */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-slate-900">{dw.coursesClinicalTitle || '把学习延续到你的临床工作中'}</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">{dw.coursesClinicalDesc || '让课程知识真正帮助你的日常诊疗'}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CLINICAL_INSIGHTS.map(insight => (
            <div key={insight.id} className="bg-white/80 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600">
                  {insight.icon}
                </div>
              </div>
              <h4 className="font-medium text-slate-900 text-sm mb-2">{insight.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{insight.description}</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{dw.coursesClinicalRelatedCourse || '相关课程'}: {insight.relatedCourse}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>{dw.coursesClinicalRelatedWork || '相关工作'}: {insight.relatedWork}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                  {dw.coursesClinicalViewRecord || '查看相关病历'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Learning Support ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-600" />
          {dw.coursesSupportTitle || '你的学习支持'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mentor Q&A */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-amber-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.coursesSupportMentor || '导师答疑'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">{dw.coursesSupportMentorDesc || '有问题？联系你的课程导师获取专业指导'}</p>
            <button className="text-xs text-amber-600 font-medium hover:text-amber-700">
              {dw.coursesSupportEnter || '进入'} →
            </button>
          </div>
          {/* Case Discussion */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-teal-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.coursesSupportCase || '推荐病例讨论'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">{dw.coursesSupportCaseDesc || '参与社区病例讨论，交流学习心得'}</p>
            <button className="text-xs text-teal-600 font-medium hover:text-teal-700">
              {dw.coursesSupportJoin || '参与讨论'} →
            </button>
          </div>
          {/* Community Topics */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.coursesSupportCommunity || '推荐社区话题'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">{dw.coursesSupportCommunityDesc || '加入相关话题，与同行交流成长'}</p>
            <button className="text-xs text-purple-600 font-medium hover:text-purple-700">
              {dw.coursesSupportJoin || '参与讨论'} →
            </button>
          </div>
          {/* Course Materials */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <h4 className="font-semibold text-slate-900">{dw.coursesSupportMaterials || '课程资料'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">{dw.coursesSupportMaterialsDesc || '下载课程讲义、参考资料与拓展阅读'}</p>
            <button className="text-xs text-blue-600 font-medium hover:text-blue-700">
              {dw.coursesSupportDownload || '下载资料'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorCoursesPage;
