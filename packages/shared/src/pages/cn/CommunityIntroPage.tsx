'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, GraduationCap, Briefcase, Lightbulb, Rocket,
  ArrowRight, ChevronRight, Users, BookOpen, Heart, Clock,
  Award, Star, LogIn, UserPlus, FileText, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CommunityIntroPageProps {
  locale: string;
}

// Section 2: Why not generic forum
const FORUM_DIFFERENCES = [
  {
    icon: FileText,
    title: '病例讨论优先',
    description: '以真实临床病例为讨论核心，围绕诊疗过程、决策思路、术后恢复展开专业交流，而非泛泛的社交聊天。',
    color: 'blue'
  },
  {
    icon: GraduationCap,
    title: '导师答疑参与',
    description: '平台培训导师会参与社区讨论，延续课程中的专业支持，让你的问题有机会得到资深专家的回应。',
    color: 'emerald'
  },
  {
    icon: Briefcase,
    title: '成长与事业延展',
    description: '讨论不止于临床，还涵盖职业发展、创业经验、行业趋势等，真正服务医生的长期事业成长。',
    color: 'purple'
  }
];

// Section 3: Core content areas
const CONTENT_AREAS = [
  {
    icon: FileText,
    title: '病例讨论',
    description: '分享诊疗过程、手术经验、复杂病例的处理思路',
    color: 'blue',
    badge: '核心'
  },
  {
    icon: GraduationCap,
    title: '导师答疑',
    description: '由平台培训导师参与回复的专业问答',
    color: 'emerald',
    badge: '高质量'
  },
  {
    icon: Lightbulb,
    title: '临床经验',
    description: '日常诊疗技巧、设备使用心得、效率提升方法',
    color: 'amber',
    badge: null
  },
  {
    icon: Briefcase,
    title: '职业成长',
    description: '职业规划、进阶方向、专科发展等讨论',
    color: 'purple',
    badge: null
  },
  {
    icon: Rocket,
    title: '创业交流',
    description: '新型诊所模式、健康管理中心、运营经验',
    color: 'rose',
    badge: '新热门'
  }
];

// Section 4: High-value examples
const DISCUSSION_EXAMPLES = [
  {
    title: '术后恢复期的复诊判断：什么情况需要复查影像？',
    category: '病例讨论',
    replies: 24,
    mentorInvolved: true
  },
  {
    title: '外科基础学习后，什么时候适合进入实操进阶？',
    category: '导师答疑',
    replies: 18,
    mentorInvolved: true
  },
  {
    title: '从全科走向专科，选择骨科还是软组织外科？',
    category: '职业成长',
    replies: 32,
    mentorInvolved: false
  },
  {
    title: '新型宠物健康管理中心与传统医院模式的区别',
    category: '创业交流',
    replies: 15,
    mentorInvolved: false
  }
];

// Section 5: Mentor support items
const MENTOR_SUPPORT = [
  { icon: MessageSquare, label: '导师答疑主题', description: '专门的导师参与板块' },
  { icon: Star, label: '高质量讨论回顾', description: '精选优质讨论存档' },
  { icon: Clock, label: '重点问题持续讨论', description: '长期跟进深度话题' }
];

// Section 7: Login benefits
const LOGIN_BENEFITS = [
  { icon: MessageSquare, label: '完整讨论动态', description: '浏览所有讨论内容' },
  { icon: FileText, label: '病例讨论参与', description: '发布与回复病例' },
  { icon: GraduationCap, label: '导师答疑', description: '参与导师问答' },
  { icon: Heart, label: '收藏与回复', description: '保存感兴趣的话题' },
  { icon: Users, label: '个性化推荐', description: '与你相关的话题' },
  { icon: Award, label: '我的社区', description: '参与记录与成就' }
];

const AREA_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-600 text-white' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-600 text-white' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-600 text-white' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-600 text-white' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', badge: 'bg-rose-600 text-white' }
};

export function CommunityIntroPage({ locale }: CommunityIntroPageProps) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const authHref = `/${locale}/auth?redirect=${encodeURIComponent(pathname)}`;

  const communityHref = isAuthenticated ? `/${locale}/doctor/community` : authHref;
  const coursesHref = `/${locale}/courses`;
  const growthHref = `/${locale}/growth-system`;

  return (
    <div className="min-h-screen bg-white">
      {/* Section 1: Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-indigo-200">
              <Users className="w-6 h-6" />
              <span className="font-medium">医生社区</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              和同行一起成长，<br className="hidden sm:block" />不再独自前行
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100 leading-relaxed mb-8">
              围绕病例讨论、导师答疑、临床经验、职业成长与创业交流，建立一个真正服务宠物医生长期成长的专业社区。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={communityHref}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                登录进入医生社区
              </Link>
              <a
                href="#content-areas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                先看看社区讨论方向
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why Not Generic Forum */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              这不是普通论坛，而是面向宠物医生的专业交流空间
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              与泛社交平台不同，这里的每一次讨论都围绕真实临床场景和职业成长展开。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FORUM_DIFFERENCES.map((item) => {
              const colors = AREA_COLORS[item.color as keyof typeof AREA_COLORS];
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`${colors.bg} rounded-2xl border ${colors.border} p-6 text-center`}
                >
                  <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Core Content Areas */}
      <section id="content-areas" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              你将在社区里看到什么
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              五大核心讨论方向，覆盖从临床技术到事业发展的完整职业周期。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CONTENT_AREAS.map((area) => {
              const colors = AREA_COLORS[area.color as keyof typeof AREA_COLORS];
              const Icon = area.icon;
              return (
                <div
                  key={area.title}
                  className={`${colors.bg} rounded-2xl border ${colors.border} p-5 text-center hover:shadow-lg transition-shadow`}
                >
                  <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900">{area.title}</h3>
                    {area.badge && (
                      <span className={`px-2 py-0.5 ${colors.badge} text-[10px] font-bold rounded-full`}>
                        {area.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{area.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: High-Value Examples */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              值得优先参与的讨论方向
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              以下是社区中常见的高价值讨论示例。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {DISCUSSION_EXAMPLES.map((example, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{example.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 rounded">{example.category}</span>
                      <span>{example.replies} 回复</span>
                      {example.mentorInvolved && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <GraduationCap className="w-3 h-3" />
                          导师参与
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={communityHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              登录查看完整讨论
            </Link>
            <Link
              href={communityHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-indigo-200 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
            >
              登录发起问题
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5: Mentor Support */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-200 p-8 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 mb-4">
                  <GraduationCap className="w-6 h-6" />
                  <span className="font-semibold">导师支持</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                  导师与专家的持续支持，<br className="hidden sm:block" />不止停留在课程里
                </h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  平台培训导师会持续参与社区讨论，延续课程中的专业支持。
                  你的问题不会只得到泛泛的回应，而是有机会获得真正有经验的专家指导。
                </p>
                <div className="space-y-3 mb-6">
                  {MENTOR_SUPPORT.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3 text-slate-700">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <span className="font-medium">{item.label}</span>
                          <span className="text-slate-500 text-sm ml-2">{item.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={communityHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    登录参与导师答疑
                  </Link>
                  <Link
                    href={coursesHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-emerald-300 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    查看课程体系
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
                  <div className="text-center text-slate-400 py-8">
                    <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">导师答疑参与示意图</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Community as Part of Growth */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              社区不是额外内容，而是成长路径的一部分
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              学习、实践、交流三位一体，社区是你成长过程中不可缺少的一环。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">课程学习后的讨论延续</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                完成课程后，在社区中继续讨论学习内容，与同期学员交流心得，巩固所学知识。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">成长方向相关话题推荐</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                根据你选择的成长方向，系统会推荐相关的社区讨论，帮助你更有针对性地学习和交流。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">职业与创业的同行支持</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                无论是职业发展还是创业探索，都可以在社区中找到有相似经历的同行，获得真实的经验分享。
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={growthHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors"
            >
              查看成长体系
            </Link>
            <Link
              href={communityHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              登录后查看与我相关的话题
            </Link>
          </div>
        </div>
      </section>

      {/* Section 7: Logged-in Value */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              登录后，你将进入真正的医生社区
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              完整的讨论功能、个性化推荐、导师互动，都在登录后等待你。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {LOGIN_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.label}
                  className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">{benefit.label}</h4>
                  <p className="text-xs text-slate-500">{benefit.description}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {isAuthenticated ? (
              <Link
                href={`/${locale}/doctor/community`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                进入医生社区
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href={authHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  登录进入医生社区
                </Link>
                <Link
                  href={authHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-indigo-200 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  立即加入平台
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section 8: Final CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5">
            把学习、临床、成长与同行交流连接起来
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            如果你希望在专业成长的过程中，不再独自摸索，平台会在课程之外，继续为你提供长期的讨论与支持空间。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={communityHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              登录进入医生社区
            </Link>
            <Link
              href={growthHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
            >
              先了解成长体系
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CommunityIntroPage;
