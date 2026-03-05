'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap, Stethoscope, TrendingUp, Users, Heart,
  Target, Award, Globe, ArrowRight, CheckCircle2
} from 'lucide-react';

interface AboutPageProps {
  locale: string;
}

// 平台核心价值
const CORE_VALUES = [
  {
    icon: GraduationCap,
    title: '培训为入口',
    description: '通过高质量的专业培训建立信任，让医生真正感受到平台的专业价值。',
    color: 'blue'
  },
  {
    icon: Stethoscope,
    title: '工具为支撑',
    description: '围绕医生真实工作场景，提供客户管理、电子病历、在线问诊等实用工具。',
    color: 'emerald'
  },
  {
    icon: TrendingUp,
    title: '成长为资产',
    description: '帮助医生沉淀专业成长轨迹，让学习和实践转化为可见的职业资产。',
    color: 'purple'
  },
  {
    icon: Users,
    title: '社区为纽带',
    description: '构建专业医生社区，围绕病例讨论、导师答疑、职业交流建立长期连接。',
    color: 'amber'
  }
];

// 平台特色
const PLATFORM_FEATURES = [
  '围绕宠物医生职业全生命周期设计',
  '培训导师来自 ACVS/ECVS 认证专家',
  '临床工具为医生日常工作赋能',
  '成长路径与职业发展深度绑定',
  '支持从职业发展到创业的完整路径',
  '专业社区延续学习与实践的连接'
];

// 团队背景
const TEAM_BACKGROUND = [
  {
    label: '兽医外科专业背景',
    description: '核心团队拥有多年宠物医疗行业经验'
  },
  {
    label: '国际培训体系',
    description: '引进 ACVS/ECVS 标准化培训模式'
  },
  {
    label: '技术产品能力',
    description: '自研数字化工具支撑医生日常工作'
  }
];

const VALUE_COLORS = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600' }
};

export function AboutPage({ locale }: AboutPageProps) {
  const pathname = usePathname();
  const authHref = `/${locale}/auth?redirect=${encodeURIComponent(pathname)}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
              <Heart className="w-5 h-5" />
              <span className="font-medium">关于宠医界</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              围绕宠物医生职业全生命周期的<br className="hidden sm:block" />一站式事业发展平台
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8">
              宠医界致力于为中国宠物医生提供从专业培训、临床工具、成长管理到职业发展与创业支持的完整服务体系，让每一位医生都能在专业成长的道路上走得更远、更稳。
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">我们的使命</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              让每一位宠物医生都能获得系统化的专业成长支持，<br className="hidden sm:block" />
              在职业发展的每一个阶段都不再独自摸索。
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">平台核心逻辑</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              培训建立信任 → 工具支撑工作 → 成长成为资产 → 事业延续价值 → 社区建立留存
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_VALUES.map((value) => {
              const colors = VALUE_COLORS[value.color as keyof typeof VALUE_COLORS];
              const Icon = value.icon;
              return (
                <div key={value.title} className={`${colors.bg} rounded-2xl p-6 text-center`}>
                  <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">平台特色</h2>
              <div className="space-y-4">
                {PLATFORM_FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">团队背景</h3>
              <div className="space-y-6">
                {TEAM_BACKGROUND.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-900">{item.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 pl-6">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Vision */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">全球视野，本地服务</h2>
            <p className="text-slate-600 leading-relaxed mb-8">
              宠医界引进国际先进的兽医外科培训体系，结合中国宠物医疗行业的实际情况，为本土医生提供既有国际标准、又接地气的专业服务。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href={`/${locale}/growth-system`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                了解成长体系
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href={`/${locale}/courses`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
              >
                浏览课程中心
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5">
            加入宠医界，开启你的专业成长之路
          </h2>
          <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
            无论你是刚入行的新人，还是希望进一步发展的资深医生，宠医界都会陪伴你走好每一步。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={authHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
            >
              立即加入
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
            >
              联系我们
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
