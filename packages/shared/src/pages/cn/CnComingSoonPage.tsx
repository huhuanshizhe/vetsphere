'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap, ShoppingBag, Users, Sparkles, Stethoscope,
  Rocket, ArrowLeft, Home, BookOpen, TrendingUp, ArrowRight,
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

type ModuleType = 'courses' | 'shop' | 'community' | 'ai' | 'doctor' | 'general';

interface ModuleConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  recommendLinks: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
  }>;
}

interface CnComingSoonPageProps {
  module?: string;
  source?: string;
  target?: string;
  title?: string;
  locale: string;
}

// ============================================================================
// 模块配置
// ============================================================================

function getModuleConfig(module: ModuleType, locale: string): ModuleConfig {
  const configs: Record<ModuleType, ModuleConfig> = {
    courses: {
      title: '新课即将上线',
      subtitle: '正在为你准备更多优质课程内容，敬请期待。你可以先浏览已开放的课程。',
      icon: <GraduationCap className="w-8 h-8" />,
      bgGradient: 'from-blue-50 via-white to-indigo-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      accentColor: 'blue',
      recommendLinks: [
        { label: '浏览课程中心', href: `/${locale}/courses`, icon: <BookOpen className="w-5 h-5" /> },
        { label: '查看成长体系', href: `/${locale}/growth-system`, icon: <TrendingUp className="w-5 h-5" /> },
        { label: '返回首页', href: `/${locale}`, icon: <Home className="w-5 h-5" /> },
      ],
    },
    shop: {
      title: '器械区即将开放',
      subtitle: '课程同款器械与耗材正在整理中，你可以先浏览已开放的临床器械与耗材。',
      icon: <ShoppingBag className="w-8 h-8" />,
      bgGradient: 'from-purple-50 via-white to-violet-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      accentColor: 'purple',
      recommendLinks: [
        { label: '浏览临床器械与耗材', href: `/${locale}/shop`, icon: <ShoppingBag className="w-5 h-5" /> },
        { label: '浏览课程中心', href: `/${locale}/courses`, icon: <BookOpen className="w-5 h-5" /> },
        { label: '返回首页', href: `/${locale}`, icon: <Home className="w-5 h-5" /> },
      ],
    },
    community: {
      title: '医生社区建设中',
      subtitle: '专属执业医生的学习交流社区正在完善，即将开放更多内容。',
      icon: <Users className="w-8 h-8" />,
      bgGradient: 'from-emerald-50 via-white to-teal-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      accentColor: 'emerald',
      recommendLinks: [
        { label: '浏览课程中心', href: `/${locale}/courses`, icon: <BookOpen className="w-5 h-5" /> },
        { label: '查看成长体系', href: `/${locale}/growth-system`, icon: <TrendingUp className="w-5 h-5" /> },
        { label: '返回首页', href: `/${locale}`, icon: <Home className="w-5 h-5" /> },
      ],
    },
    ai: {
      title: 'AI 功能升级中',
      subtitle: '更智能的临床助手正在完善，你可以先使用当前已开放的核心功能。',
      icon: <Sparkles className="w-8 h-8" />,
      bgGradient: 'from-teal-50 via-white to-cyan-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      accentColor: 'teal',
      recommendLinks: [
        { label: '浏览课程中心', href: `/${locale}/courses`, icon: <BookOpen className="w-5 h-5" /> },
        { label: '浏览临床器械与耗材', href: `/${locale}/shop`, icon: <ShoppingBag className="w-5 h-5" /> },
        { label: '返回首页', href: `/${locale}`, icon: <Home className="w-5 h-5" /> },
      ],
    },
    doctor: {
      title: '功能完善中',
      subtitle: '该工作台功能正在完善，你可以先使用当前已开放的功能模块。',
      icon: <Stethoscope className="w-8 h-8" />,
      bgGradient: 'from-blue-50 via-white to-sky-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      accentColor: 'blue',
      recommendLinks: [
        { label: '返回工作台', href: `/${locale}/doctor`, icon: <Stethoscope className="w-5 h-5" /> },
        { label: '浏览课程中心', href: `/${locale}/courses`, icon: <BookOpen className="w-5 h-5" /> },
        { label: '返回首页', href: `/${locale}`, icon: <Home className="w-5 h-5" /> },
      ],
    },
    general: {
      title: '该功能即将上线',
      subtitle: '团队正在积极建设中，你可以先浏览已开放的核心功能。',
      icon: <Rocket className="w-8 h-8" />,
      bgGradient: 'from-slate-50 via-white to-gray-50',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      accentColor: 'slate',
      recommendLinks: [
        { label: '浏览课程中心', href: `/${locale}/courses`, icon: <BookOpen className="w-5 h-5" /> },
        { label: '查看成长体系', href: `/${locale}/growth-system`, icon: <TrendingUp className="w-5 h-5" /> },
        { label: '返回首页', href: `/${locale}`, icon: <Home className="w-5 h-5" /> },
      ],
    },
  };

  return configs[module] || configs.general;
}

// ============================================================================
// 主组件
// ============================================================================

const CnComingSoonPage: React.FC<CnComingSoonPageProps> = ({
  module: moduleProp,
  source,
  target,
  title: titleProp,
  locale,
}) => {
  const moduleKey = (['courses', 'shop', 'community', 'ai', 'doctor'].includes(moduleProp || '')
    ? moduleProp
    : 'general') as ModuleType;

  const config = getModuleConfig(moduleKey, locale);
  const displayTitle = titleProp || config.title;

  return (
    <main className={`min-h-screen bg-gradient-to-b ${config.bgGradient}`}>
      {/* 顶部装饰 */}
      <div className="relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-purple-200/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 lg:px-8 pt-16 pb-24">
        <div className="max-w-lg mx-auto text-center">
          {/* 图标 */}
          <div className={`w-24 h-24 ${config.iconBg} rounded-3xl flex items-center justify-center mx-auto mb-8`}>
            <span className={config.iconColor}>{config.icon}</span>
          </div>

          {/* 标题 */}
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            {displayTitle}
          </h1>

          {/* 副标题 */}
          <p className="text-lg text-slate-500 leading-relaxed mb-4">
            {config.subtitle}
          </p>

          {/* 来源说明 */}
          {source && (
            <p className="text-sm text-slate-400 mb-8">
              来源：{source === 'growth-system' ? '成长体系' : source}
              {target && <> / {target}</>}
            </p>
          )}

          {!source && <div className="mb-8" />}

          {/* 返回上一页按钮 */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </button>

          {/* 推荐跳转 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
              推荐前往
            </h2>
            <div className="space-y-3">
              {config.recommendLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                      {link.icon}
                    </span>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                      {link.label}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* 底部提示 */}
          <p className="text-sm text-slate-400 mt-8">
            该功能正在完善中，敬请期待
          </p>
        </div>
      </div>
    </main>
  );
};

export default CnComingSoonPage;
