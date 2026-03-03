'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen, GraduationCap, Stethoscope, Award, Briefcase, Rocket,
  Filter, Search, X, ChevronRight, ArrowRight, Check, Star,
  Clock, MapPin, Users, Play, Calendar, Sparkles, TrendingUp,
  Target, Heart, Eye, Mic, AlertCircle, CheckCircle2, RotateCcw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Course } from '../../types';
import PublicCourseSection, { PublicCourse } from './components/PublicCourseSection';
import { AICourseAdvisor } from '../../components/cn/AICourseAdvisor';
import {
  CourseStage,
  CourseSpecialty,
  GrowthTrack,
  ResolvedPreset,
  resolveGrowthPreset,
  applyPresetToFilters,
  shouldExitTrackMode,
  buildUrlParams,
  GROWTH_TRACK_PRESETS,
} from '../../lib/growth-track-preset';

// ============================================================================
// 类型定义
// ============================================================================

// CourseStage 和 CourseSpecialty 已从 growth-track-preset 导入

/** 筛选器状态 */
interface FilterState {
  stage: CourseStage;
  specialty: string;
  format: string;
  level: string;
  audience: string;
  goal: string;
  search: string;
}

/** 成长体系承接状态 */
interface GrowthSystemState {
  /** 解析后的预设 */
  resolved: ResolvedPreset | null;
  /** 是否处于成长体系模式 */
  isActive: boolean;
  /** 是否用户已手动退出 */
  userExited: boolean;
}

/** 扩展的课程数据（含分类信息） */
interface ExtendedCourse extends Course {
  stage?: CourseStage;
  stageLabel?: string;
  subcategory?: string;
  format?: string;
  levelCode?: string;
  audiences?: string[];
  learningGoals?: string[];
  enrollmentMode?: 'direct' | 'plan' | 'inquiry';
  slug?: string;
}

// ============================================================================
// 常量定义
// ============================================================================

/** 一级分类配置 */
const STAGE_CONFIG: Array<{
  id: CourseStage;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  audiences: string[];
  subcategories: string[];
}> = [
  {
    id: 'all',
    name: '全部课程',
    description: '浏览所有课程',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-slate-700',
    bgColor: 'bg-slate-100 hover:bg-slate-200',
    audiences: [],
    subcategories: [],
  },
  {
    id: 'certification',
    name: '考证入行',
    description: '备考执业兽医资格证、入行基础',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    audiences: ['在校生/应届', '准备入行'],
    subcategories: ['执业兽医资格系统班', '基础科目', '预防科目', '临床科目', '综合应用', '法规与职业道德'],
  },
  {
    id: 'clinical-basics',
    name: '临床基础',
    description: '新手医生入职必备临床技能',
    icon: <Stethoscope className="w-5 h-5" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    audiences: ['新入职医生', '临床基础薄弱'],
    subcategories: ['接诊基础', '常见病例处理', '基础体格检查', '病历与处方规范', '基础检验与影像入门', '宠主沟通与复诊建议'],
  },
  {
    id: 'specialty-advanced',
    name: '专科进阶',
    description: '往专科方向发展、提升竞争力',
    icon: <Target className="w-5 h-5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    audiences: ['1-3年临床', '专科发展中'],
    subcategories: ['外科', '超声/影像', '麻醉与疼痛管理', '内科/急诊', '眼科', '口腔', '皮肤', '其他专科'],
  },
  {
    id: 'advanced-practice',
    name: '高端实操',
    description: '能力跃迁、高质量线下实操训练',
    icon: <Award className="w-5 h-5" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    audiences: ['3年以上全科', '追求实操突破'],
    subcategories: ['Wet-Lab实操', '解剖实操', '手术训练营', '专科高阶实操', '复杂病例训练', '导师带教小班'],
  },
  {
    id: 'career-growth',
    name: '事业发展',
    description: '职业成长、客户经营、创业准备',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 hover:bg-rose-100',
    audiences: ['希望更好发展', '创业准备人群'],
    subcategories: ['病例讨论', '导师答疑', '职业进阶', '客户经营', '创业准备', '长期服务能力'],
  },
];

/** 专科方向筛选 */
const SPECIALTY_FILTERS = [
  { key: 'all', label: '全部专科' },
  { key: 'surgery', label: '外科' },
  { key: 'ultrasound', label: '超声' },
  { key: 'imaging', label: '影像' },
  { key: 'ophthalmology', label: '眼科' },
  { key: 'anesthesia', label: '麻醉' },
  { key: 'internal', label: '内科' },
  { key: 'emergency', label: '急诊' },
  { key: 'dentistry', label: '口腔' },
  { key: 'dermatology', label: '皮肤' },
  { key: 'general', label: '综合临床' },
];

/** 授课形式筛选 */
const FORMAT_FILTERS = [
  { key: 'all', label: '全部形式' },
  { key: 'recorded', label: '录播课程' },
  { key: 'live', label: '直播课程' },
  { key: 'offline', label: '线下实操' },
  { key: 'bootcamp', label: '训练营' },
  { key: 'case-study', label: '病例讨论' },
  { key: 'mentor-qa', label: '导师答疑' },
  { key: 'systematic', label: '系统班' },
];

/** 学习目标筛选 */
const GOAL_FILTERS = [
  { key: 'all', label: '全部目标' },
  { key: 'certification', label: '考证' },
  { key: 'onboarding', label: '上岗' },
  { key: 'consultation', label: '提升接诊' },
  { key: 'specialty-transition', label: '专科转型' },
  { key: 'practice-breakthrough', label: '实操突破' },
  { key: 'career-development', label: '职业发展' },
  { key: 'entrepreneurship', label: '创业准备' },
];

/** 难度等级筛选 */
const LEVEL_FILTERS = [
  { key: 'all', label: '全部难度' },
  { key: 'L1', label: 'L1 入门' },
  { key: 'L2', label: 'L2 基础' },
  { key: 'L3', label: 'L3 进阶' },
  { key: 'L4', label: 'L4 专科' },
  { key: 'L5', label: 'L5 高端实操' },
];

/** 适合人群筛选 */
const AUDIENCE_FILTERS = [
  { key: 'all', label: '全部人群' },
  { key: 'student', label: '在校生/应届' },
  { key: 'new-hire', label: '新入职医生' },
  { key: '1-3-years', label: '1-3年临床' },
  { key: '3-plus-years', label: '3年以上全科' },
  { key: 'specialist', label: '专科发展中' },
  { key: 'entrepreneur', label: '创业准备人群' },
];

// ============================================================================
// 辅助函数
// ============================================================================

/** 根据现有课程数据推断分类信息 */
function inferCourseMetadata(course: Course): ExtendedCourse {
  const title = course.title.toLowerCase();
  const specialty = course.specialty;
  
  // 推断阶段
  let stage: CourseStage = 'specialty-advanced';
  let stageLabel = '专科进阶';
  let levelCode = 'L3';
  let format = 'offline';
  let enrollmentMode: 'direct' | 'plan' | 'inquiry' = 'direct';
  let learningGoals: string[] = [];
  let audiences: string[] = ['1-3-years', '3-plus-years'];
  
  // 根据课程级别和类型推断
  if (title.includes('workshop') || title.includes('wet-lab') || title.includes('实操') || course.level === 'Master') {
    stage = 'advanced-practice';
    stageLabel = '高端实操';
    levelCode = course.level === 'Master' ? 'L5' : 'L4';
    format = 'offline';
    learningGoals = ['practice-breakthrough'];
    audiences = ['3-plus-years', 'specialist'];
  } else if (title.includes('基础') || course.level === 'Basic') {
    stage = 'clinical-basics';
    stageLabel = '临床基础';
    levelCode = 'L2';
    learningGoals = ['onboarding', 'consultation'];
    audiences = ['new-hire', '1-3-years'];
  } else if (course.level === 'Advanced' || course.level === 'Intermediate') {
    stage = 'specialty-advanced';
    stageLabel = '专科进阶';
    levelCode = 'L4';
    learningGoals = ['specialty-transition'];
    audiences = ['1-3-years', '3-plus-years'];
  }
  
  // 根据专科推断
  let specialtyKey = 'general';
  if (specialty.includes('Orthopedics') || specialty.includes('骨科')) specialtyKey = 'surgery';
  else if (specialty.includes('Soft Tissue')) specialtyKey = 'surgery';
  else if (specialty.includes('Eye') || specialty.includes('眼科')) specialtyKey = 'ophthalmology';
  else if (specialty.includes('Ultrasound') || specialty.includes('超声')) specialtyKey = 'ultrasound';
  
  // 生成 slug
  const slug = course.id;
  
  return {
    ...course,
    stage,
    stageLabel,
    subcategory: specialty,
    format,
    levelCode,
    audiences,
    learningGoals,
    enrollmentMode,
    slug,
    specialty: specialtyKey as any,
  };
}

// ============================================================================
// 子组件
// ============================================================================

/** 阶段选择器 */
const StageSelector: React.FC<{
  activeStage: CourseStage;
  onStageChange: (stage: CourseStage) => void;
  courseCounts: Record<CourseStage, number>;
}> = ({ activeStage, onStageChange, courseCounts }) => (
  <div className="flex flex-wrap gap-2">
    {STAGE_CONFIG.map((stage) => {
      const isActive = activeStage === stage.id;
      const count = courseCounts[stage.id] || 0;
      
      return (
        <button
          key={stage.id}
          onClick={() => onStageChange(stage.id)}
          className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isActive
              ? `${stage.bgColor.replace('hover:', '')} ${stage.color} ring-2 ring-offset-1 ring-current`
              : `bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50`
          }`}
        >
          <span className={isActive ? stage.color : 'text-slate-400 group-hover:text-slate-600'}>
            {stage.icon}
          </span>
          <span>{stage.name}</span>
          {stage.id !== 'all' && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              isActive ? 'bg-white/50' : 'bg-slate-100'
            }`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/** 筛选器下拉菜单 */
const FilterDropdown: React.FC<{
  label: string;
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.key === value);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
          value !== 'all'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        }`}
      >
        <span>{selectedOption?.label || label}</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 py-2 bg-white rounded-xl shadow-xl border border-slate-200 z-20 min-w-[160px] max-h-[300px] overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.key}
                onClick={() => { onChange(option.key); setIsOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                  value === option.key ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}
              >
                <span>{option.label}</span>
                {value === option.key && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** 当前查看状态 */
const CurrentViewStatus: React.FC<{
  stage: CourseStage;
  filters: FilterState;
  resultCount: number;
  onClearFilters: () => void;
}> = ({ stage, filters, resultCount, onClearFilters }) => {
  const stageConfig = STAGE_CONFIG.find(s => s.id === stage);
  const activeFilters: string[] = [];
  
  if (filters.specialty !== 'all') {
    activeFilters.push(SPECIALTY_FILTERS.find(f => f.key === filters.specialty)?.label || '');
  }
  if (filters.format !== 'all') {
    activeFilters.push(FORMAT_FILTERS.find(f => f.key === filters.format)?.label || '');
  }
  if (filters.goal !== 'all') {
    activeFilters.push(GOAL_FILTERS.find(f => f.key === filters.goal)?.label || '');
  }
  if (filters.level !== 'all') {
    activeFilters.push(LEVEL_FILTERS.find(f => f.key === filters.level)?.label || '');
  }
  if (filters.audience !== 'all') {
    activeFilters.push(AUDIENCE_FILTERS.find(f => f.key === filters.audience)?.label || '');
  }
  
  const hasActiveFilters = activeFilters.length > 0;
  
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-500">当前查看：</span>
        <span className={`font-bold ${stageConfig?.color || 'text-slate-700'}`}>
          {stageConfig?.name || '全部课程'}
        </span>
        {hasActiveFilters && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">已筛选：</span>
            <span className="font-medium text-slate-700">{activeFilters.join(' / ')}</span>
          </>
        )}
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">共</span>
        <span className="font-bold text-slate-900">{resultCount}</span>
        <span className="text-slate-500">门课程</span>
      </div>
      
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>清除筛选</span>
        </button>
      )}
    </div>
  );
};

/** 成长体系来源提示条 */
const GrowthSourceBanner: React.FC<{
  resolved: ResolvedPreset;
  locale: string;
  onClearDirection: () => void;
}> = ({ resolved, locale, onClearDirection }) => {
  if (!resolved.isGrowthSystemSource || !resolved.preset) return null;
  
  const preset = resolved.preset;
  
  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-emerald-700">来自成长体系</span>
              <span className="text-emerald-400">|</span>
              <span className="text-sm font-bold text-slate-900">{preset.label}</span>
            </div>
            <p className="text-sm text-slate-600">
              已按成长方向为你预设筛选，可继续调整或清除方向查看全部课程
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:shrink-0">
          <Link
            href={`/${locale}/growth-system`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            返回成长体系
          </Link>
          <button
            onClick={onClearDirection}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            清除方向筛选
          </button>
        </div>
      </div>
    </div>
  );
};

/** 方向说明模块 */
const GrowthDirectionInfo: React.FC<{
  resolved: ResolvedPreset;
}> = ({ resolved }) => {
  if (!resolved.isGrowthSystemSource || !resolved.preset) return null;
  
  const preset = resolved.preset;
  
  // 阶段名称映射
  const stageLabels: Record<string, string> = {
    'certification': '考证入行',
    'clinical-basics': '临床基础',
    'specialty-advanced': '专科进阶',
    'advanced-practice': '高端实操',
    'career-growth': '事业发展',
  };
  
  // Tailwind 不支持动态类名，需要使用完整的类名映射
  const colorStyles: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
  };
  
  const colors = colorStyles[preset.color] || colorStyles.blue;
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Target className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 mb-1">{preset.label}</h3>
          <p className="text-sm text-slate-600 mb-3">{preset.description}</p>
          
          {/* 推荐路径 */}
          {preset.recommendedStageOrder.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">推荐路径：</span>
              {preset.recommendedStageOrder.map((stage, idx) => (
                <React.Fragment key={stage}>
                  {idx > 0 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                    {stageLabels[stage] || stage}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** 课程卡片 */
const CourseCard: React.FC<{
  course: ExtendedCourse;
  locale: string;
  isAuthenticated: boolean;
  onAddToPlan: (course: ExtendedCourse) => void;
}> = ({ course, locale, isAuthenticated, onAddToPlan }) => {
  const title = course.title_zh || course.title;
  const instructor = course.instructor;
  const instructorName = instructor?.name_zh || instructor?.name || '';
  
  // 计算天数
  const startDate = new Date(course.startDate);
  const endDate = new Date(course.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // 检查是否即将开始
  const now = new Date();
  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isUpcoming = daysUntilStart > 0 && daysUntilStart <= 60;
  
  // 获取阶段配置
  const stageConfig = STAGE_CONFIG.find(s => s.id === course.stage);
  
  // 格式化标签
  const formatLabel = FORMAT_FILTERS.find(f => f.key === course.format)?.label || course.format;
  const levelLabel = LEVEL_FILTERS.find(f => f.key === course.levelCode)?.label || course.level;
  
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* 图片区域 */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {course.imageUrl ? (
          <img 
            src={course.imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-12 h-12 text-slate-300" />
          </div>
        )}
        
        {/* 阶段标签 */}
        {stageConfig && (
          <div className={`absolute top-3 left-3 px-3 py-1 ${stageConfig.bgColor.split(' ')[0]} ${stageConfig.color} text-xs font-bold rounded-full flex items-center gap-1.5`}>
            {stageConfig.icon}
            <span>{stageConfig.name}</span>
          </div>
        )}
        
        {/* 即将开课标签 */}
        {isUpcoming && (
          <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>即将开课</span>
          </div>
        )}
        
        {/* 悬浮查看按钮 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Link
          href={`/${locale}/courses/${course.slug || course.id}`}
          className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hover:bg-white"
        >
          <Play className="w-5 h-5 text-slate-700 fill-current" />
        </Link>
      </div>
      
      {/* 内容区域 */}
      <div className="p-5">
        {/* 标签行 */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
            {course.subcategory || course.specialty}
          </span>
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded">
            {formatLabel}
          </span>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded">
            {levelLabel}
          </span>
        </div>
        
        {/* 标题 */}
        <Link href={`/${locale}/courses/${course.slug || course.id}`}>
          <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
        </Link>
        
        {/* 适合人群 */}
        <p className="text-sm text-slate-500 mb-3 line-clamp-1">
          适合：{course.audiences?.map(a => AUDIENCE_FILTERS.find(f => f.key === a)?.label).filter(Boolean).join('、') || '全阶段医生'}
        </p>
        
        {/* 讲师 */}
        <p className="text-sm text-slate-500 mb-4">讲师: {instructorName}</p>
        
        {/* 信息行 */}
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{days}天</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{course.location?.city || '待定'}</span>
          </div>
        </div>
        
        {/* 底部操作区 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xl font-black text-slate-900">
            ¥{course.price.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddToPlan(course)}
              className="px-3 py-2 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              加入计划
            </button>
            <Link
              href={`/${locale}/courses/${course.slug || course.id}`}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              查看详情
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/** 加入学习计划成功弹窗 */
const AddToPlanModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onContinueBrowse: () => void;
  onGoToMyCourses: () => void;
  courseName: string;
}> = ({ isOpen, onClose, onContinueBrowse, onGoToMyCourses, courseName }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">已加入学习计划</h3>
          <p className="text-slate-500 mb-6">
            「{courseName}」已添加到你的学习计划中
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onGoToMyCourses}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              查看我的课程
            </button>
            <button
              onClick={onContinueBrowse}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              继续浏览课程中心
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

const CnCourseCenterPage: React.FC = () => {
  const { locale } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ========== 成长体系状态 ==========
  const [growthState, setGrowthState] = useState<GrowthSystemState>({
    resolved: null,
    isActive: false,
    userExited: false,
  });
  
  // ========== 筛选状态 ==========
  const [courses, setCourses] = useState<ExtendedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    stage: 'all',
    specialty: 'all',
    format: 'all',
    level: 'all',
    audience: 'all',
    goal: 'all',
    search: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedCourseName, setAddedCourseName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  
  // ========== 从 URL 解析成长体系参数 ==========
  useEffect(() => {
    if (isInitialized) return;
    
    const source = searchParams.get('source');
    const track = searchParams.get('track');
    const direction = searchParams.get('direction'); // 兼容成长体系页的参数
    const category = searchParams.get('category'); // 兼容旧版参数
    const stage = searchParams.get('stage');
    const specialty = searchParams.get('specialty');
    
    // 解析预设
    const resolved = resolveGrowthPreset({
      source,
      track,
      direction,
      category,
      stage,
      specialty,
    });
    
    // 如果有有效的成长体系来源
    if (resolved.isGrowthSystemSource && resolved.preset) {
      setGrowthState({
        resolved,
        isActive: true,
        userExited: false,
      });
      
      // 应用预设到筛选器
      setFilters(prev => applyPresetToFilters(resolved, prev));
    } else if (stage || specialty) {
      // 没有 track 但有直接的筛选参数
      setFilters(prev => ({
        ...prev,
        stage: (resolved.appliedStage || prev.stage) as CourseStage,
        specialty: resolved.appliedSpecialty || prev.specialty,
      }));
    }
    
    setIsInitialized(true);
  }, [searchParams, isInitialized]);
  
  // ========== URL 同步 ==========
  const updateUrl = useCallback((newFilters: FilterState, newGrowthState: GrowthSystemState) => {
    const params = new URLSearchParams();
    
    // 如果仍处于成长体系模式，保留 track 和 source
    if (newGrowthState.isActive && newGrowthState.resolved?.track) {
      params.set('source', 'growth-system');
      params.set('track', newGrowthState.resolved.track);
    }
    
    // 添加筛选参数（非默认值）
    if (newFilters.stage !== 'all') {
      params.set('stage', newFilters.stage);
    }
    if (newFilters.specialty !== 'all') {
      params.set('specialty', newFilters.specialty);
    }
    
    // 更新 URL（不触发页面刷新）
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);
  
  // 加载课程数据
  useEffect(() => {
    api.getCourses().then(data => {
      const publishedCourses = data
        .filter(c => c.status === 'Published')
        .map(inferCourseMetadata);
      setCourses(publishedCourses);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);
  
  // 计算各阶段课程数量
  const courseCounts = useMemo(() => {
    const counts: Record<CourseStage, number> = {
      all: courses.length,
      certification: 0,
      'clinical-basics': 0,
      'specialty-advanced': 0,
      'advanced-practice': 0,
      'career-growth': 0,
    };
    
    courses.forEach(course => {
      if (course.stage && course.stage !== 'all') {
        counts[course.stage]++;
      }
    });
    
    return counts;
  }, [courses]);
  
  // ========== 筛选和排序课程 ==========
  const filteredCourses = useMemo(() => {
    // 先筛选
    let result = courses.filter(course => {
      // 阶段筛选 - 成长体系多阶段模式下特殊处理
      if (filters.stage !== 'all' && course.stage !== filters.stage) {
        return false;
      }
      
      // 多阶段方向：如果没有锁定阶段，只保留推荐阶段内的课程
      if (growthState.isActive && growthState.resolved?.preset?.isMultiStage && filters.stage === 'all') {
        const stageOrder = growthState.resolved.stageOrderForSort;
        if (stageOrder.length > 0 && course.stage && !stageOrder.includes(course.stage as CourseStage)) {
          return false;
        }
      }
      
      // 专科筛选
      if (filters.specialty !== 'all') {
        const courseSpecialty = typeof course.specialty === 'string' ? course.specialty : '';
        if (!courseSpecialty.toLowerCase().includes(filters.specialty.toLowerCase())) return false;
      }
      
      // 授课形式筛选
      if (filters.format !== 'all' && course.format !== filters.format) return false;
      
      // 难度筛选
      if (filters.level !== 'all' && course.levelCode !== filters.level) return false;
      
      // 适合人群筛选
      if (filters.audience !== 'all') {
        if (!course.audiences?.includes(filters.audience)) return false;
      }
      
      // 学习目标筛选
      if (filters.goal !== 'all') {
        if (!course.learningGoals?.includes(filters.goal)) return false;
      }
      
      // 搜索筛选
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const title = (course.title_zh || course.title || '').toLowerCase();
        const instructor = (course.instructor?.name_zh || course.instructor?.name || '').toLowerCase();
        if (!title.includes(searchLower) && !instructor.includes(searchLower)) return false;
      }
      
      return true;
    });
    
    // 成长体系模式下的路径优先排序
    if (growthState.isActive && growthState.resolved?.stageOrderForSort.length) {
      const stageOrder = growthState.resolved.stageOrderForSort;
      result = result.sort((a, b) => {
        const aStageIndex = stageOrder.indexOf(a.stage as CourseStage);
        const bStageIndex = stageOrder.indexOf(b.stage as CourseStage);
        
        // 在推荐路径中的排在前面
        const aInPath = aStageIndex >= 0;
        const bInPath = bStageIndex >= 0;
        
        if (aInPath && !bInPath) return -1;
        if (!aInPath && bInPath) return 1;
        if (aInPath && bInPath) return aStageIndex - bStageIndex;
        
        return 0;
      });
    }
    
    return result;
  }, [courses, filters, growthState]);
  
  // ========== 处理阶段切换 ==========
  const handleStageChange = useCallback((stage: CourseStage) => {
    const newFilters = { ...filters, stage };
    
    // 检查是否应退出 track 模式
    if (growthState.isActive && growthState.resolved) {
      const shouldExit = shouldExitTrackMode(growthState.resolved, {
        stage,
        specialty: filters.specialty,
      });
      
      if (shouldExit) {
        const newGrowthState = { ...growthState, isActive: false, userExited: true };
        setGrowthState(newGrowthState);
        setFilters(newFilters);
        updateUrl(newFilters, newGrowthState);
        return;
      }
    }
    
    setFilters(newFilters);
    updateUrl(newFilters, growthState);
  }, [filters, growthState, updateUrl]);
  
  // ========== 处理筛选器变更 ==========
  const handleFilterChange = useCallback((key: keyof FilterState) => (value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // 检查核心筛选变更是否应退出 track 模式
    if ((key === 'stage' || key === 'specialty') && growthState.isActive && growthState.resolved) {
      const shouldExit = shouldExitTrackMode(growthState.resolved, {
        stage: key === 'stage' ? value as CourseStage : filters.stage,
        specialty: key === 'specialty' ? value : filters.specialty,
      });
      
      if (shouldExit) {
        const newGrowthState = { ...growthState, isActive: false, userExited: true };
        setGrowthState(newGrowthState);
        setFilters(newFilters);
        updateUrl(newFilters, newGrowthState);
        return;
      }
    }
    
    setFilters(newFilters);
    updateUrl(newFilters, growthState);
  }, [filters, growthState, updateUrl]);
  
  // ========== 清除筛选 ==========
  const handleClearFilters = useCallback(() => {
    const newFilters = {
      ...filters,
      specialty: 'all',
      format: 'all',
      level: 'all',
      audience: 'all',
      goal: 'all',
    };
    setFilters(newFilters);
    updateUrl(newFilters, growthState);
  }, [filters, growthState, updateUrl]);
  
  // ========== 清除成长方向筛选（退出 track 模式） ==========
  const handleClearDirection = useCallback(() => {
    const newGrowthState: GrowthSystemState = {
      resolved: null,
      isActive: false,
      userExited: true,
    };
    const newFilters: FilterState = {
      stage: 'all',
      specialty: 'all',
      format: 'all',
      level: 'all',
      audience: 'all',
      goal: 'all',
      search: '',
    };
    
    setGrowthState(newGrowthState);
    setFilters(newFilters);
    
    // 清除 URL 参数
    window.history.replaceState({}, '', window.location.pathname);
  }, []);
  
  // 处理加入学习计划
  const handleAddToPlan = (course: ExtendedCourse) => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=/doctor/courses`);
      return;
    }
    
    // 模拟加入计划
    setAddedCourseName(course.title_zh || course.title);
    setShowAddModal(true);
  };
  
  // 处理公益课报名
  const handlePublicCourseEnroll = (course: PublicCourse) => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=/courses/${course.slug}?source=public-course`);
      return;
    }
    
    // 模拟报名成功
    setAddedCourseName(course.title);
    setShowAddModal(true);
  };
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 顶部提示条 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <Link
            href={`/${locale}/growth-system`}
            className="flex items-center justify-center gap-2 py-3 text-sm font-medium hover:underline"
          >
            <Sparkles className="w-4 h-4" />
            <span>想按成长路径选择？先查看成长体系</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/15 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              课程中心
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              围绕宠物医生不同职业阶段，提供从考证入行到高端实操、再到事业发展的分层课程体系。
            </p>
          </div>
          
          {/* 阶段选择器 */}
          <StageSelector
            activeStage={filters.stage}
            onStageChange={handleStageChange}
            courseCounts={courseCounts}
          />
        </div>
      </section>
      
      {/* 成长体系承接区域 - 仅在成长体系模式下显示 */}
      {growthState.isActive && growthState.resolved && (
        <section className="py-4">
          <div className="container mx-auto px-4 lg:px-8 space-y-4">
            <GrowthSourceBanner
              resolved={growthState.resolved}
              locale={locale}
              onClearDirection={handleClearDirection}
            />
            <GrowthDirectionInfo resolved={growthState.resolved} />
          </div>
        </section>
      )}
      
      {/* 公益课专区 */}
      <PublicCourseSection
        locale={locale}
        currentStage={filters.stage}
        onEnroll={handlePublicCourseEnroll}
      />
      
      {/* 筛选器区域 */}
      <section className="py-6 border-y border-slate-100 bg-white/80 backdrop-blur-sm sticky top-16 z-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown
              label="专科方向"
              value={filters.specialty}
              options={SPECIALTY_FILTERS}
              onChange={handleFilterChange('specialty')}
            />
            <FilterDropdown
              label="授课形式"
              value={filters.format}
              options={FORMAT_FILTERS}
              onChange={handleFilterChange('format')}
            />
            <FilterDropdown
              label="学习目标"
              value={filters.goal}
              options={GOAL_FILTERS}
              onChange={handleFilterChange('goal')}
            />
            <FilterDropdown
              label="难度等级"
              value={filters.level}
              options={LEVEL_FILTERS}
              onChange={handleFilterChange('level')}
            />
            <FilterDropdown
              label="适合人群"
              value={filters.audience}
              options={AUDIENCE_FILTERS}
              onChange={handleFilterChange('audience')}
            />
            
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索课程..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* 当前查看状态 */}
      <section className="py-4">
        <div className="container mx-auto px-4 lg:px-8">
          <CurrentViewStatus
            stage={filters.stage}
            filters={filters}
            resultCount={filteredCourses.length}
            onClearFilters={handleClearFilters}
          />
        </div>
      </section>
      
      {/* 课程列表 */}
      <section className="py-8">
        <div className="container mx-auto px-4 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  locale={locale}
                  isAuthenticated={isAuthenticated}
                  onAddToPlan={handleAddToPlan}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">未找到相关课程</h3>
              <p className="text-slate-500 mb-6">尝试调整筛选条件或搜索关键词</p>
              <button
                onClick={() => setFilters({
                  stage: 'all',
                  specialty: 'all',
                  format: 'all',
                  level: 'all',
                  audience: 'all',
                  goal: 'all',
                  search: '',
                })}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                查看全部课程
              </button>
            </div>
          )}
        </div>
      </section>
      
      {/* 底部CTA */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl font-black mb-4">
              {isAuthenticated ? '继续你的学习之旅' : '登录后解锁个性化学习计划'}
            </h2>
            <p className="text-slate-400 mb-8">
              {isAuthenticated 
                ? '查看你的学习进度，管理已加入的课程计划' 
                : '加入 VetSphere，获取针对你职业阶段的课程推荐和学习规划'
              }
            </p>
            <Link
              href={isAuthenticated ? `/${locale}/doctor/courses` : `/${locale}/auth?redirect=/doctor/courses`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all"
            >
              <GraduationCap className="w-5 h-5" />
              <span>{isAuthenticated ? '我的课程' : '立即登录'}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* 加入学习计划成功弹窗 */}
      <AddToPlanModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onContinueBrowse={() => setShowAddModal(false)}
        onGoToMyCourses={() => router.push(`/${locale}/doctor/courses`)}
        courseName={addedCourseName}
      />
      
      {/* 悬浮 AI 选课顾问按钮 */}
      <button
        onClick={() => setShowAIAdvisor(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-bold shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all"
      >
        <Sparkles className="w-5 h-5" />
        <span className="hidden sm:inline">AI 选课顾问</span>
      </button>
      
      {/* AI 选课顾问弹窗 */}
      <AICourseAdvisor
        isOpen={showAIAdvisor}
        onClose={() => setShowAIAdvisor(false)}
        locale={locale}
      />
    </main>
  );
};

export default CnCourseCenterPage;
