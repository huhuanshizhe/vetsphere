'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, MessageSquare, GraduationCap, Target, DollarSign,
  CheckCircle2, Loader2, ArrowRight, Info, Send, Clock, Star,
  ChevronRight, BookOpen, Award, Briefcase,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ───
interface UserProfile {
  experience: string;
  specialty: string;
  goals: string[];
  budget: string;
}

interface CourseRecommendation {
  id: string;
  title: string;
  specialty: string;
  level: string;
  price: number;
  reason: string;
  matchScore: number;
  tags: string[];
}

interface LearningPath {
  name: string;
  description: string;
  courses: CourseRecommendation[];
  totalDuration: string;
  totalPrice: number;
}

interface AICourseAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

// ─── Profile Options ───
const EXPERIENCE_OPTIONS = [
  { value: 'student', label: '在校学生' },
  { value: 'junior', label: '执业 1-3 年' },
  { value: 'mid', label: '执业 3-5 年' },
  { value: 'senior', label: '执业 5 年以上' },
];

const SPECIALTY_OPTIONS = [
  { value: 'general', label: '全科/综合' },
  { value: 'surgery', label: '外科方向' },
  { value: 'internal', label: '内科方向' },
  { value: 'imaging', label: '影像诊断' },
  { value: 'emergency', label: '急诊/重症' },
];

const GOAL_OPTIONS = [
  { value: 'skill_basic', label: '打牢基础技能' },
  { value: 'skill_advanced', label: '提升专科能力' },
  { value: 'certification', label: '获取认证资质' },
  { value: 'startup', label: '为开院做准备' },
  { value: 'management', label: '提升诊所管理' },
];

const BUDGET_OPTIONS = [
  { value: 'low', label: '5000元以内' },
  { value: 'mid', label: '5000-15000元' },
  { value: 'high', label: '15000元以上' },
  { value: 'unlimited', label: '预算充足' },
];

// ─── Mock Course Data ───
const MOCK_COURSES: CourseRecommendation[] = [
  {
    id: 'csavs-soft-2026',
    title: 'CSAVS 软组织外科认证班',
    specialty: 'Soft Tissue',
    level: '中级',
    price: 18800,
    reason: '适合有一定外科基础的医生系统学习软组织手术技术',
    matchScore: 95,
    tags: ['认证课程', '实操培训', '国际讲师'],
  },
  {
    id: 'csavs-joint-2026',
    title: 'CSAVS 骨科关节手术班',
    specialty: 'Orthopedics',
    level: '中高级',
    price: 22800,
    reason: '系统掌握关节手术核心技术，提升骨科诊疗能力',
    matchScore: 88,
    tags: ['骨科专项', 'Wet-lab', '小班教学'],
  },
  {
    id: 'csavs-eye-2026',
    title: 'CSAVS 眼科基础班',
    specialty: 'Eye Surgery',
    level: '入门',
    price: 12800,
    reason: '眼科入门首选，掌握常见眼病诊断与基础手术',
    matchScore: 82,
    tags: ['零基础友好', '眼科入门', '实操训练'],
  },
  {
    id: 'ultrasound-basic',
    title: '腹部超声诊断基础班',
    specialty: 'Ultrasound',
    level: '入门',
    price: 6800,
    reason: '快速掌握腹部超声检查技能，性价比高',
    matchScore: 75,
    tags: ['入门首选', '超声影像', '高性价比'],
  },
  {
    id: 'emergency-intensive',
    title: '急诊重症强化班',
    specialty: 'Emergency',
    level: '中级',
    price: 15800,
    reason: '提升危急重症处理能力，适合门诊医生进阶',
    matchScore: 70,
    tags: ['急诊技能', '重症监护', '实战案例'],
  },
];

// ─── Simulate AI Recommendation ───
function simulateRecommendation(profile: UserProfile): { 
  courses: CourseRecommendation[]; 
  paths: LearningPath[];
  summary: string;
} {
  let courses = [...MOCK_COURSES];
  
  // Adjust scores based on profile
  courses = courses.map(course => {
    let score = course.matchScore;
    
    // Experience matching
    if (profile.experience === 'student' || profile.experience === 'junior') {
      if (course.level === '入门') score += 10;
      if (course.level === '中高级') score -= 15;
    } else if (profile.experience === 'senior') {
      if (course.level === '入门') score -= 10;
      if (course.level === '中高级') score += 10;
    }
    
    // Specialty matching
    if (profile.specialty === 'surgery' && (course.specialty === 'Soft Tissue' || course.specialty === 'Orthopedics')) {
      score += 15;
    }
    if (profile.specialty === 'imaging' && course.specialty === 'Ultrasound') {
      score += 20;
    }
    
    // Budget matching
    if (profile.budget === 'low' && course.price > 10000) score -= 20;
    if (profile.budget === 'high' && course.price < 10000) score -= 5;
    
    // Goals matching
    if (profile.goals.includes('certification') && course.tags.includes('认证课程')) {
      score += 15;
    }
    if (profile.goals.includes('skill_basic') && course.level === '入门') {
      score += 10;
    }
    if (profile.goals.includes('skill_advanced') && course.level !== '入门') {
      score += 10;
    }
    
    return { ...course, matchScore: Math.min(100, Math.max(0, score)) };
  });
  
  // Sort by score
  courses = courses.sort((a, b) => b.matchScore - a.matchScore);
  
  // Generate learning paths
  const paths: LearningPath[] = [];
  
  if (profile.specialty === 'surgery' || profile.specialty === 'general') {
    const surgeryPath = courses.filter(c => 
      c.specialty === 'Soft Tissue' || c.specialty === 'Orthopedics'
    ).slice(0, 2);
    
    if (surgeryPath.length > 0) {
      paths.push({
        name: '外科专科进阶路径',
        description: '系统提升软组织与骨科手术能力',
        courses: surgeryPath,
        totalDuration: '6个月',
        totalPrice: surgeryPath.reduce((sum, c) => sum + c.price, 0),
      });
    }
  }
  
  if (profile.goals.includes('skill_basic')) {
    const basicPath = courses.filter(c => c.level === '入门').slice(0, 2);
    if (basicPath.length > 0) {
      paths.push({
        name: '基础技能夯实路径',
        description: '打好临床基础，为专科发展做准备',
        courses: basicPath,
        totalDuration: '3个月',
        totalPrice: basicPath.reduce((sum, c) => sum + c.price, 0),
      });
    }
  }
  
  // Generate summary
  let summary = '';
  if (profile.experience === 'student' || profile.experience === 'junior') {
    summary = '建议从入门级课程开始，逐步建立专科技能基础。';
  } else if (profile.experience === 'senior') {
    summary = '建议选择中高级课程，获取认证资质，深化专科能力。';
  } else {
    summary = '根据您的背景，推荐系统学习，兼顾技能提升与职业发展。';
  }
  
  if (profile.goals.includes('startup')) {
    summary += ' 考虑到开院目标，建议优先学习通用性强的技能。';
  }
  
  return { courses: courses.slice(0, 4), paths, summary };
}

// ─── Main Component ───
export function AICourseAdvisor({ isOpen, onClose, locale }: AICourseAdvisorProps) {
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [profile, setProfile] = useState<UserProfile>({
    experience: '',
    specialty: '',
    goals: [],
    budget: '',
  });
  const [recommendations, setRecommendations] = useState<{
    courses: CourseRecommendation[];
    paths: LearningPath[];
    summary: string;
  } | null>(null);

  const handleGoalToggle = (goal: string) => {
    setProfile(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handleSubmit = async () => {
    setStep('processing');
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = simulateRecommendation(profile);
    setRecommendations(result);
    setStep('result');
  };

  const handleReset = () => {
    setStep('input');
    setProfile({ experience: '', specialty: '', goals: [], budget: '' });
    setRecommendations(null);
  };

  const isInputComplete = profile.experience && profile.specialty && profile.goals.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI 选课顾问</h2>
              <p className="text-[11px] text-slate-500">智能推荐适合你的学习路径</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Input Step */}
          {step === 'input' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50/70 rounded-lg border border-emerald-100">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700">
                  告诉我你的背景和目标，AI 将为你推荐最适合的课程组合
                </p>
              </div>

              {/* Experience */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  你的从业经验
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfile(p => ({ ...p, experience: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.experience === opt.value
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  当前专业方向
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SPECIALTY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfile(p => ({ ...p, specialty: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.specialty === opt.value
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Target className="w-4 h-4 text-slate-500" />
                  学习目标 (可多选)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleGoalToggle(opt.value)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                        profile.goals.includes(opt.value)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {profile.goals.includes(opt.value) && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  学习预算 (可选)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfile(p => ({ ...p, budget: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.budget === opt.value
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-base font-medium text-slate-700 mb-2">AI 正在分析...</p>
              <p className="text-sm text-slate-500">根据你的背景匹配最佳学习路径</p>
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && recommendations && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-1">AI 分析结果</p>
                    <p className="text-sm text-slate-600">{recommendations.summary}</p>
                  </div>
                </div>
              </div>

              {/* Learning Paths */}
              {recommendations.paths.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    推荐学习路径
                  </h3>
                  <div className="space-y-3">
                    {recommendations.paths.map((path, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-slate-800">{path.name}</h4>
                          <span className="text-xs text-slate-500">{path.totalDuration}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{path.description}</p>
                        <div className="space-y-2">
                          {path.courses.map((course, cidx) => (
                            <div key={cidx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">
                                  {cidx + 1}
                                </span>
                                <span className="text-xs font-medium text-slate-700">{course.title}</span>
                              </div>
                              <span className="text-xs text-slate-500">¥{course.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs text-slate-500">路径总价</span>
                          <span className="text-sm font-bold text-slate-800">¥{path.totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Recommendations */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  课程推荐
                </h3>
                <div className="space-y-3">
                  {recommendations.courses.map((course, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-slate-800">{course.title}</h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              course.matchScore >= 90 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : course.matchScore >= 75 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              匹配度 {course.matchScore}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {course.specialty}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                              {course.level}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-slate-900">¥{course.price.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-600 mb-3">{course.reason}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {course.tags.slice(0, 3).map((tag, tidx) => (
                            <span key={tidx} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/${locale}/courses/${course.id}`}
                          onClick={onClose}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          查看详情
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              AI 推荐仅供参考，请结合自身情况选择
            </p>
            <div className="flex items-center gap-2">
              {step === 'result' && (
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  重新选择
                </button>
              )}
              {step === 'input' && (
                <button
                  onClick={handleSubmit}
                  disabled={!isInputComplete}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  获取推荐
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AICourseAdvisor;
