'use client';

import React from 'react';
import {
  TrendingUp, Briefcase, Store, Award, Target, Users, Heart,
  ChevronRight, ArrowRight, CheckCircle2, Sparkles, BookOpen,
  Stethoscope, Home, Lock, Star, Rocket, Building, MapPin
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface PathStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface SupportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// Path steps data
const PATH_STEPS: PathStep[] = [
  {
    id: '1',
    title: '专业学习与能力积累',
    description: '通过系统课程建立临床诊疗、外科操作等核心专业能力',
    icon: <BookOpen className="w-6 h-6" />
  },
  {
    id: '2',
    title: '成长档案与方向沉淀',
    description: '把学习成果沉淀为可追踪的成长档案，明确发展方向',
    icon: <Award className="w-6 h-6" />
  },
  {
    id: '3',
    title: '职业机会与路径选择',
    description: '基于能力积累，获得更适合的岗位推荐与职业路径建议',
    icon: <Briefcase className="w-6 h-6" />
  },
  {
    id: '4',
    title: '创业准备与长期事业',
    description: '为有志于独立执业的医生，提供创业准备与事业发展支持',
    icon: <Rocket className="w-6 h-6" />
  }
];

// Support cards data
const SUPPORT_CARDS: SupportCard[] = [
  {
    id: '1',
    title: '成长档案',
    description: '把学习与能力沉淀为长期资产，帮助医生看见自己已经积累了什么',
    icon: <Award className="w-5 h-5" />,
    color: 'amber'
  },
  {
    id: '2',
    title: '职业匹配',
    description: '基于成长方向推荐更适合的职业路径，帮助医生看到岗位与能力之间的关系',
    icon: <Target className="w-5 h-5" />,
    color: 'blue'
  },
  {
    id: '3',
    title: '创业准备',
    description: '帮助医生理解创业前需要补足哪些能力，逐步建立从医生到经营者的过渡路径',
    icon: <Store className="w-5 h-5" />,
    color: 'teal'
  },
  {
    id: '4',
    title: '长期陪伴',
    description: '不是一次性的信息，而是持续更新的支持体系，平台会随着医生成长不断提供新的建议',
    icon: <Heart className="w-5 h-5" />,
    color: 'rose'
  }
];

// Login benefits
const LOGIN_BENEFITS = [
  '个性化职业机会推荐',
  '基于成长档案的岗位匹配原因',
  '创业准备度评估',
  '创业前需补足能力建议',
  '推荐课程与成长路径'
];

export function CareerDevelopmentPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();

  // 根据登录状态决定跳转目标
  const careerHref = isAuthenticated ? `/${locale}/doctor/career` : `/${locale}/auth`;
  const startupHref = isAuthenticated ? `/${locale}/doctor/startup` : `/${locale}/auth`;
  const careerCtaText = isAuthenticated ? '查看职业机会' : '登录后查看职业机会';
  const startupCtaText = isAuthenticated ? '查看创业中心' : '登录后查看创业中心';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Hero Section ===== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">宠医界</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              事业发展
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8">
              从专业成长到职业路径，再到更长期的事业方向，平台将持续支持宠物医生建立更清晰的发展路线。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`/${locale}/growth-system`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                查看成长路径
              </a>
              {isAuthenticated ? (
                <a
                  href={`/${locale}/doctor/growth`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
                >
                  查看我的成长档案
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <a
                  href={`/${locale}/auth`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
                >
                  登录后查看个性化建议
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* ===== Growth Overview (Main Card) ===== */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl border border-amber-200/60 p-8 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">你的成长，不止于课程</h2>
          </div>
          <p className="text-slate-700 leading-relaxed mb-6 max-w-3xl">
            平台帮助宠物医生把专业成长逐步转化为：
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/70 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <span className="font-medium text-slate-800">更清晰的职业路径</span>
            </div>
            <div className="bg-white/70 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
              <span className="font-medium text-slate-800">更适合的岗位方向</span>
            </div>
            <div className="bg-white/70 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Rocket className="w-5 h-5 text-amber-600" />
              </div>
              <span className="font-medium text-slate-800">更长期的事业发展</span>
            </div>
          </div>
          <p className="text-sm text-amber-700 bg-white/50 rounded-lg px-4 py-3">
            <strong>这不是只学完课程就结束</strong>，而是围绕医生长期成长的持续支持。
          </p>
        </div>

        {/* ===== Dual Path: Career + Startup ===== */}
        <div id="dual-path" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Career Development Card */}
          <div id="career-path" className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow scroll-mt-24">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-6 sm:p-8">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                走向更适合你的职业路径
              </h3>
              <div className="space-y-3 text-slate-600 mb-6">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>基于成长方向与技能积累，推荐更适合的岗位机会</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>帮助医生理解自己适合继续走全科、专科，还是进入更高水平机构</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>平台通过成长档案帮助你看清"下一步应该往哪里走"</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#career-path"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  了解职业支持
                </a>
                <a
                  href={careerHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
                >
                  {careerCtaText}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Startup Support Card */}
          <div id="startup-direction" className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow scroll-mt-24">
            <div className="h-2 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="p-6 sm:p-8">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                探索更长期的事业发展方向
              </h3>
              <div className="space-y-3 text-slate-600 mb-6">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <span>对具备一定临床基础的医生，平台将进一步支持创业准备</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <span>帮助医生理解"新型宠物健康管理中心"等事业方向</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <span>从能力评估、准备路径到工具支持，逐步建立更长期的发展能力</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#startup-direction"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
                >
                  了解创业支持
                </a>
                <a
                  href={startupHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-teal-200 text-teal-700 rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors"
                >
                  {startupCtaText}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ===== How Platform Supports ===== */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">平台如何陪伴你的事业发展</h2>
            <p className="text-slate-500">从学习到职业，从能力到事业，持续支持每一步</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUPPORT_CARDS.map(card => (
              <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 bg-${card.color}-100 rounded-xl flex items-center justify-center text-${card.color}-600 mb-4`}>
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== What is Health Management Center ===== */}
        <div id="health-center" className="bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 rounded-2xl border border-teal-200/60 p-8 mb-12 scroll-mt-24">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">什么是新型宠物健康管理中心</h2>
          </div>
          <p className="text-slate-600 mb-6 max-w-3xl">
            它不是传统宠物医院，也不是普通宠物用品店，而是一种<strong className="text-teal-700">以医生专业能力为核心、以健康服务为主线的轻医疗经营模式</strong>。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Compare to Hospital */}
            <div className="bg-white/80 rounded-xl p-5">
              <h4 className="font-semibold text-slate-800 mb-3">相比宠物医院</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  投入成本更低，无需大型设备
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  专注健康管理，非急诊/手术
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  客户关系更长期、更深入
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  服务模式更灵活、可复制
                </li>
              </ul>
            </div>
            {/* Compare to Pet Store */}
            <div className="bg-white/80 rounded-xl p-5">
              <h4 className="font-semibold text-slate-800 mb-3">相比宠物用品店</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  以专业服务为核心，非纯零售
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  医生专业背景带来信任优势
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  服务附加值更高，利润更稳定
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 shrink-0" />
                  建立会员制长期收入模式
                </li>
              </ul>
            </div>
            {/* Core Value */}
            <div className="bg-teal-600 rounded-xl p-5 text-white">
              <h4 className="font-semibold mb-3">核心价值</h4>
              <ul className="space-y-2 text-sm text-teal-50">
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

        {/* ===== Path from Growth to Career ===== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">从专业成长到事业发展的路径</h2>
            <p className="text-slate-500">平台帮助你看见更长期的发展可能</p>
          </div>
          
          {/* Desktop Path */}
          <div className="hidden md:block">
            <div className="relative flex items-start justify-between">
              {/* Connection line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200 z-0">
                <div className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-teal-500" style={{ width: '100%' }} />
              </div>
              {/* Steps */}
              {PATH_STEPS.map((step, idx) => (
                <div key={step.id} className="relative z-10 flex flex-col items-center w-1/4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg ${
                    idx === 0 ? 'bg-amber-500' :
                    idx === 1 ? 'bg-orange-500' :
                    idx === 2 ? 'bg-blue-500' : 'bg-teal-500'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="mt-4 text-center max-w-[180px]">
                    <div className="font-semibold text-slate-900 mb-1">{step.title}</div>
                    <div className="text-xs text-slate-500">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Path */}
          <div className="md:hidden space-y-4">
            {PATH_STEPS.map((step, idx) => (
              <div key={step.id} className="relative flex items-start gap-4">
                {idx < PATH_STEPS.length - 1 && (
                  <div className="absolute left-6 top-14 w-0.5 h-full bg-slate-200" />
                )}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 ${
                  idx === 0 ? 'bg-amber-500' :
                  idx === 1 ? 'bg-orange-500' :
                  idx === 2 ? 'bg-blue-500' : 'bg-teal-500'
                }`}>
                  {step.icon}
                </div>
                <div className="flex-1 pb-6">
                  <div className="font-semibold text-slate-900">{step.title}</div>
                  <div className="text-sm text-slate-500 mt-1">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3 inline-block">
              平台希望帮助医生看见更长期的发展可能，而不是停留在一次性的学习阶段。
            </p>
          </div>
        </div>

        {/* ===== Login Benefits (Only show for non-authenticated users) ===== */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 mb-12 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-bold">登录后，你将获得更具体的支持</h2>
            </div>
            <p className="text-slate-300 mb-6">
              公共页面展示的是平台价值与方向，登录后才能获得基于你个人成长的具体建议与行动支持。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {LOGIN_BENEFITS.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`/${locale}/auth`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                立即登录查看建议
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`/${locale}/courses`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                先了解成长体系
              </a>
            </div>
          </div>
        )}

        {/* ===== Logged-in user quick access ===== */}
        {isAuthenticated && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-8 mb-12">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">你已登录，可直接进入个性化服务</h2>
            </div>
            <p className="text-slate-600 mb-6">
              基于你的学习记录与成长档案，平台已为你准备了个性化的职业与创业建议。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href={`/${locale}/doctor/growth`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">成长档案</div>
                  <div className="text-xs text-slate-500">查看你的成长轨迹</div>
                </div>
              </a>
              <a
                href={`/${locale}/doctor/career`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">职业机会</div>
                  <div className="text-xs text-slate-500">查看推荐岗位</div>
                </div>
              </a>
              <a
                href={`/${locale}/doctor/startup`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">创业中心</div>
                  <div className="text-xs text-slate-500">评估创业准备度</div>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* ===== Final CTA ===== */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            让专业成长，真正走向更好的职业与事业
          </h2>
          <p className="text-amber-100 mb-8 max-w-2xl mx-auto">
            从课程学习到能力积累，从职业选择到创业准备，宠医界希望成为宠物医生长期发展的伙伴。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <a
                  href={`/${locale}/doctor`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors"
                >
                  进入工作台
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href={`/${locale}/courses`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-600 text-white border border-amber-400 rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  浏览更多课程
                </a>
              </>
            ) : (
              <>
                <a
                  href={`/${locale}/auth`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors"
                >
                  立即登录查看建议
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href={`/${locale}/courses`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-600 text-white border border-amber-400 rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  先了解成长体系
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareerDevelopmentPage;
