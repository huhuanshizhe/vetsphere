'use client';

import React, { useState } from 'react';
import {
  Briefcase, MapPin, Building, ArrowRight, Bookmark, Search, Filter,
  Target, TrendingUp, Star, ChevronRight, BookOpen, Store, Users,
  CheckCircle2, AlertCircle, Lightbulb, Clock, Heart, Zap, Award
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
interface Job {
  id: string;
  title: string;
  hospital: string;
  city: string;
  type: 'fulltime' | 'parttime' | 'consult';
  matchScore: number;
  matchReason: string;
  salary: string;
  requirements: string[];
  whyFit: string[];
  gaps: string[];
  saved: boolean;
}

interface CareerPath {
  id: string;
  name: string;
  description: string;
  whoSuitable: string;
  whatNext: string;
  action: string;
  icon: React.ReactNode;
  color: string;
}

interface SkillGap {
  id: string;
  skill: string;
  forJob: string;
  learningHelp: string;
  direction: string;
  icon: React.ReactNode;
}

// Placeholder data
const RECOMMENDED_JOBS: Job[] = [
  {
    id: '1',
    title: '软组织外科主治医师',
    hospital: '北京宠爱动物医院',
    city: '北京',
    type: 'fulltime',
    matchScore: 92,
    matchReason: '你的软组织外科技能标签与外科进阶方向高度匹配',
    salary: '15-25K',
    requirements: ['3年以上临床经验', '熟练掌握软组织外科技术', '有团队协作能力'],
    whyFit: ['你已完成软组织外科课程', '当前成长方向为外科进阶', '具备临床基础与诊断思维技能'],
    gaps: ['骨科基础课程尚未完成', '建议继续提升术后管理能力'],
    saved: false
  },
  {
    id: '2',
    title: '外科住院医师',
    hospital: '上海瑞派宠物医院',
    city: '上海',
    type: 'fulltime',
    matchScore: 85,
    matchReason: '基于你的外科进阶方向和当前成长阶段',
    salary: '12-18K',
    requirements: ['2年以上临床经验', '外科基础扎实', '愿意持续学习'],
    whyFit: ['你的成长阶段与住院医师要求匹配', '外科进阶路径与岗位发展契合', '临床基础技能符合要求'],
    gaps: ['建议加强影像判读能力', '可考虑学习急诊处理'],
    saved: true
  },
  {
    id: '3',
    title: '综合门诊兽医师',
    hospital: '杭州爱心宠物诊所',
    city: '杭州',
    type: 'fulltime',
    matchScore: 78,
    matchReason: '你的临床基础与诊断思维技能适合综合门诊',
    salary: '10-15K',
    requirements: ['1年以上临床经验', '综合诊疗能力', '良好沟通能力'],
    whyFit: ['临床基础技能扎实', '客户沟通能力已培养', '适合作为进阶跳板'],
    gaps: ['外科专科能力暂未充分匹配', '可作为能力积累过渡'],
    saved: false
  },
  {
    id: '4',
    title: '特聘外科顾问',
    hospital: '深圳康宠连锁医院',
    city: '深圳',
    type: 'consult',
    matchScore: 70,
    matchReason: '基于你的外科方向，可作为未来目标',
    salary: '按次结算',
    requirements: ['5年以上外科经验', '专科认证优先', '可远程指导'],
    whyFit: ['外科进阶方向与顾问角色契合', '未来具备晋升潜力'],
    gaps: ['当前阶段暂未达到顾问级别', '建议先完成专科认证'],
    saved: false
  }
];

const CAREER_PATHS: CareerPath[] = [
  {
    id: '1',
    name: '继续专科进阶',
    description: '深耕外科领域，成为专科医生',
    whoSuitable: '适合希望在外科领域深入发展、追求专业高度的医生',
    whatNext: '完成骨科基础课程，获取外科专科认证',
    action: '查看外科进阶课程',
    icon: <Award className="w-5 h-5" />,
    color: 'amber'
  },
  {
    id: '2',
    name: '提升综合门诊能力',
    description: '拓展综合诊疗能力，成为全能型兽医',
    whoSuitable: '适合希望建立全面诊疗能力、增加职业灵活性的医生',
    whatNext: '补充内科、皮肤科等基础课程',
    action: '查看综合能力课程',
    icon: <Users className="w-5 h-5" />,
    color: 'blue'
  },
  {
    id: '3',
    name: '为创业做准备',
    description: '积累经营能力，准备开启自己的事业',
    whoSuitable: '适合希望未来独立执业或创业的医生',
    whatNext: '学习客户管理与运营基础，了解健康管理中心模型',
    action: '进入创业中心',
    icon: <Store className="w-5 h-5" />,
    color: 'teal'
  }
];

const SKILL_GAPS: SkillGap[] = [
  {
    id: '1',
    skill: '骨科基础',
    forJob: '软组织外科主治医师、外科专科顾问',
    learningHelp: 'CSAVS 小动物关节外科学',
    direction: '外科专科能力',
    icon: <Target className="w-5 h-5" />
  },
  {
    id: '2',
    skill: '影像判读进阶',
    forJob: '外科住院医师、综合门诊医师',
    learningHelp: '超声影像判读进阶课程',
    direction: '诊断辅助能力',
    icon: <BookOpen className="w-5 h-5" />
  },
  {
    id: '3',
    skill: '客户经营与管理',
    forJob: '诊所管理、创业开店',
    learningHelp: '兽医客户管理课程、创业工具包',
    direction: '经营管理能力',
    icon: <Store className="w-5 h-5" />
  }
];

const SAVED_JOBS = RECOMMENDED_JOBS.filter(j => j.saved);

// Current career overview
const CAREER_OVERVIEW = {
  direction: '外科进阶',
  stage: '能力进阶期',
  suggestion: '外科专科医生',
  platformHint: '继续完成骨科基础课程后，你将匹配更多高薪外科岗位。建议在1-2个月内完成当前学习计划。'
};

// Job type config
const JOB_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  fulltime: { label: '全职', color: 'bg-emerald-100 text-emerald-700' },
  parttime: { label: '兼职', color: 'bg-blue-100 text-blue-700' },
  consult: { label: '特聘', color: 'bg-purple-100 text-purple-700' }
};

export function DoctorCareerPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [selectedJob, setSelectedJob] = useState<Job | null>(RECOMMENDED_JOBS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set(SAVED_JOBS.map(j => j.id)));

  // Filter jobs based on search
  const filteredJobs = searchQuery
    ? RECOMMENDED_JOBS.filter(j =>
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : RECOMMENDED_JOBS;

  const toggleSave = (jobId: string) => {
    setSavedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dw.careerTitle || '职业机会'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {dw.careerSubtitle || '基于你的成长方向与能力积累，为你推荐更适合的岗位机会与职业发展路径，让专业成长真正转化为更好的职业选择。'}
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
              placeholder={dw.careerSearch || '搜索岗位、城市或医院...'}
              className="w-full sm:w-56 pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          {/* Filter */}
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            {dw.careerFilter || '筛选'}
          </button>
          {/* View Recommended */}
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
            <Briefcase className="w-4 h-4" />
            {dw.careerViewRecommended || '查看推荐岗位'}
          </button>
          {/* View Growth */}
          <a
            href={`/${locale}/doctor/growth`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {dw.careerViewGrowth || '查看成长档案'}
          </a>
        </div>
      </div>

      {/* ===== Career Overview Card ===== */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">{dw.careerOverviewTitle || '你的职业方向总览'}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Direction */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{dw.careerOverviewDirection || '当前成长方向'}</div>
            <div className="text-lg font-bold text-amber-600">{CAREER_OVERVIEW.direction}</div>
          </div>
          {/* Stage */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{dw.careerOverviewStage || '当前成长阶段'}</div>
            <div className="text-lg font-bold text-slate-900">{CAREER_OVERVIEW.stage}</div>
          </div>
          {/* Suggestion */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{dw.careerOverviewSuggestion || '当前最适合的职业路径'}</div>
            <div className="text-lg font-bold text-blue-600">{CAREER_OVERVIEW.suggestion}</div>
          </div>
          {/* Platform Hint */}
          <div className="bg-white/70 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              {dw.careerOverviewPlatformHint || '平台建议'}
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">{CAREER_OVERVIEW.platformHint}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            {dw.careerOverviewViewMatch || '查看匹配岗位'}
            <ChevronRight className="w-4 h-4" />
          </button>
          <a
            href={`/${locale}/doctor/growth`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {dw.careerOverviewViewBasis || '查看成长依据'}
          </a>
        </div>
      </div>

      {/* ===== Recommended Jobs + Detail Preview ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-500" />
          {dw.careerJobsTitle || '为你推荐的岗位'}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Job List */}
          <div className="lg:col-span-2 space-y-3">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedJob?.id === job.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900">{job.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${JOB_TYPE_CONFIG[job.type].color}`}>
                        {JOB_TYPE_CONFIG[job.type].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {job.hospital}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.city}
                      </span>
                      <span className="text-amber-600 font-medium">{job.salary}</span>
                    </div>
                  </div>
                  {/* Match Score */}
                  <div className="shrink-0 text-center">
                    <div className={`text-2xl font-bold ${
                      job.matchScore >= 90 ? 'text-emerald-600' :
                      job.matchScore >= 80 ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {job.matchScore}%
                    </div>
                    <div className="text-xs text-slate-400">{dw.careerJobsMatchScore || '匹配度'}</div>
                  </div>
                </div>
                {/* Match Reason */}
                <div className="mt-3 p-2 bg-amber-50 rounded-lg">
                  <div className="text-xs text-amber-700 flex items-start gap-1">
                    <Star className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{job.matchReason}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button className="text-xs text-slate-500 hover:text-slate-700">
                      {dw.careerJobsViewDetail || '查看岗位详情'}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button className="text-xs text-slate-500 hover:text-slate-700">
                      {dw.careerJobsViewGap || '查看还需补足的能力'}
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSave(job.id); }}
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      savedJobs.has(job.id) ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${savedJobs.has(job.id) ? 'fill-amber-500' : ''}`} />
                    {savedJobs.has(job.id) ? '已收藏' : dw.careerJobsSave || '收藏岗位'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detail Preview Panel */}
          <div className="hidden lg:block">
            {selectedJob && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-4">
                <h4 className="font-bold text-slate-900 text-lg">{selectedJob.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <Building className="w-4 h-4" />
                  {selectedJob.hospital}
                  <span>·</span>
                  <MapPin className="w-4 h-4" />
                  {selectedJob.city}
                </div>
                <div className="text-lg font-bold text-amber-600 mt-2">{selectedJob.salary}</div>

                {/* Requirements */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">{dw.careerDetailRequirements || '岗位要求'}</div>
                  <ul className="space-y-1">
                    {selectedJob.requirements.map((req, idx) => (
                      <li key={idx} className="text-xs text-slate-500 flex items-start gap-2">
                        <span className="w-1 h-1 bg-slate-400 rounded-full mt-1.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Why Fit */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {dw.careerDetailWhyFit || '为什么适合你'}
                  </div>
                  <ul className="space-y-1">
                    {selectedJob.whyFit.map((fit, idx) => (
                      <li key={idx} className="text-xs text-emerald-600 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {fit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {dw.careerDetailGapReminder || '差距提醒'}
                  </div>
                  <ul className="space-y-1">
                    {selectedJob.gaps.map((gap, idx) => (
                      <li key={idx} className="text-xs text-amber-600 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => toggleSave(selectedJob.id)}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      savedJobs.has(selectedJob.id)
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 inline mr-1 ${savedJobs.has(selectedJob.id) ? 'fill-amber-500' : ''}`} />
                    {savedJobs.has(selectedJob.id) ? '已收藏' : dw.careerDetailSave || '收藏岗位'}
                  </button>
                  <button className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                    {dw.careerDetailApply || '申请职位'}
                  </button>
                  <a
                    href={`/${locale}/doctor/courses`}
                    className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <BookOpen className="w-4 h-4" />
                    {dw.careerDetailViewLearning || '查看推荐学习'}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Career Path Suggestions ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          {dw.careerPathTitle || '基于你当前阶段的职业路径建议'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CAREER_PATHS.map(path => (
            <div key={path.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow`}>
              <div className={`h-1.5 bg-${path.color}-500`} />
              <div className="p-5">
                <div className={`w-10 h-10 bg-${path.color}-100 rounded-lg flex items-center justify-center text-${path.color}-600 mb-3`}>
                  {path.icon}
                </div>
                <h4 className="font-semibold text-slate-900">{path.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{path.description}</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500">{dw.careerPathWhoSuitable || '适合谁'}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{path.whoSuitable}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">{dw.careerPathWhatNext || '下一步提升'}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{path.whatNext}</div>
                  </div>
                </div>

                <button className={`mt-4 inline-flex items-center gap-1 text-xs font-medium text-${path.color}-600 hover:text-${path.color}-700`}>
                  {path.action} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Skill Gap Insights ===== */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">{dw.careerGapTitle || '从现在到下一步，你还差什么'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SKILL_GAPS.map(gap => (
            <div key={gap.id} className="bg-white/80 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  {gap.icon}
                </div>
                <div className="font-semibold text-slate-900">{gap.skill}</div>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">{dw.careerGapSkillMissing || '缺少的能力'}:</span>
                  <span className="text-slate-600 ml-1">影响 {gap.forJob}</span>
                </div>
                <div>
                  <span className="text-slate-400">{dw.careerGapLearningHelp || '推荐学习'}:</span>
                  <span className="text-amber-600 ml-1">{gap.learningHelp}</span>
                </div>
                <div>
                  <span className="text-slate-400">{dw.careerGapDirection || '提升方向'}:</span>
                  <span className="text-slate-600 ml-1">{gap.direction}</span>
                </div>
              </div>
              <button className="mt-3 text-xs text-amber-600 font-medium hover:text-amber-700">
                {dw.careerGapViewLearning || '查看推荐学习'} →
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <a
            href={`/${locale}/doctor/courses`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {dw.careerGapViewLearning || '查看推荐学习'}
          </a>
          <a
            href={`/${locale}/doctor/startup`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
          >
            <Store className="w-4 h-4" />
            {dw.careerGapViewStartup || '进入创业中心'}
          </a>
        </div>
      </div>

      {/* ===== Saved Opportunities ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          {dw.careerSavedTitle || '你关注的职业机会'}
        </h3>
        {savedJobs.size > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RECOMMENDED_JOBS.filter(j => savedJobs.has(j.id)).map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">{job.title}</h4>
                    <div className="text-xs text-slate-500 mt-1">{job.hospital} · {job.city}</div>
                  </div>
                  <button
                    onClick={() => toggleSave(job.id)}
                    className="text-amber-500"
                  >
                    <Bookmark className="w-5 h-5 fill-amber-500" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-amber-600 font-medium">{job.salary}</span>
                  <span className={`text-sm font-bold ${
                    job.matchScore >= 90 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {job.matchScore}% 匹配
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">你还没有收藏任何岗位</p>
            <p className="text-xs text-slate-400 mt-1">浏览推荐岗位，收藏感兴趣的机会</p>
          </div>
        )}
      </div>

      {/* ===== Startup Bridge Section ===== */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-200/60 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-bold text-slate-900">{dw.careerBridgeTitle || '如果你正在考虑更大的事业方向'}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {dw.careerBridgeDesc || '当你具备一定的专业积累后，平台也会支持你探索更长期的事业路径，包括新型宠物健康管理中心等创业方向。'}
            </p>
          </div>
          <a
            href={`/${locale}/doctor/startup`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shrink-0"
          >
            <Store className="w-4 h-4" />
            {dw.careerBridgeAction || '查看创业中心'}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default DoctorCareerPage;
