'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, FileText, MessageSquare, CalendarCheck, ArrowRight, ChevronRight,
  Clipboard, HeartHandshake, TrendingUp, ShoppingBag, Stethoscope,
  GraduationCap, Route, LogIn, UserPlus, Package, Wrench, Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ClinicalWorkflowPageProps {
  locale: string;
}

// Section 3: Four Core Tools data
const CORE_TOOLS = [
  {
    id: 'clients',
    icon: Users,
    title: '客户管理',
    description: '系统化管理宠物主人信息、宠物档案与服务历史，建立长期信任关系。',
    features: ['宠物主人档案', '宠物信息管理', '服务历史追踪', '沟通记录'],
    href: '/doctor/clients',
    color: 'blue'
  },
  {
    id: 'records',
    icon: FileText,
    title: '电子病历',
    description: '结构化记录每一次诊疗过程，沉淀专业经验，支持病例回顾与学习。',
    features: ['标准化病历模板', '诊疗记录沉淀', '病例回顾分析', '专业成长参考'],
    href: '/doctor/records',
    color: 'emerald'
  },
  {
    id: 'consultations',
    icon: MessageSquare,
    title: '在线问诊',
    description: '突破时间与地点限制，为宠物主人提供便捷的远程咨询服务。',
    features: ['实时在线沟通', '图文问诊记录', '专业建议留存', '服务延伸'],
    href: '/doctor/consultations',
    color: 'purple'
  },
  {
    id: 'followup',
    icon: CalendarCheck,
    title: '随访与长期管理',
    description: '主动跟进宠物健康状况，提供持续的健康管理服务，提升客户粘性。',
    features: ['随访任务管理', '健康提醒', '长期健康档案', '服务满意度'],
    href: '/doctor/records',
    color: 'amber'
  }
];

// Section 4: Workflow steps
const WORKFLOW_STEPS = [
  {
    step: 1,
    title: '客户与宠物建档',
    description: '建立完整的客户档案和宠物信息，为后续服务打下基础',
    icon: Users
  },
  {
    step: 2,
    title: '在线问诊 / 到院接诊',
    description: '通过线上或线下方式了解宠物状况，提供专业咨询',
    icon: MessageSquare
  },
  {
    step: 3,
    title: '电子病历沉淀',
    description: '记录诊疗过程与结论，沉淀专业经验，便于回顾',
    icon: FileText
  },
  {
    step: 4,
    title: '随访与长期健康管理',
    description: '主动跟进、持续服务，建立长期信任关系',
    icon: CalendarCheck
  }
];

// Section 6: Supporting categories
const SUPPORT_CATEGORIES = [
  {
    icon: Wrench,
    title: '日常临床配套器械',
    description: '手术器械、诊疗设备等日常临床所需的专业工具'
  },
  {
    icon: Heart,
    title: '健康管理相关设备',
    description: '监测设备、护理用品等支持长期健康管理的产品'
  },
  {
    icon: Package,
    title: '医生推荐式服务延展产品',
    description: '可向客户推荐的护理产品、营养补充等延展服务'
  }
];

// Section 7: Logged-in benefits
const LOGIN_BENEFITS = [
  { icon: Clipboard, label: '医生工作台', description: '一站式工作入口' },
  { icon: Users, label: '客户管理', description: '系统化客户档案' },
  { icon: FileText, label: '电子病历', description: '专业诊疗记录' },
  { icon: MessageSquare, label: '在线问诊', description: '远程咨询服务' },
  { icon: CalendarCheck, label: '随访管理', description: '主动跟进服务' },
  { icon: TrendingUp, label: '成长追踪', description: '持续能力提升' }
];

const TOOL_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', hover: 'hover:border-blue-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', hover: 'hover:border-emerald-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', hover: 'hover:border-purple-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', hover: 'hover:border-amber-400' }
};

export function ClinicalWorkflowPage({ locale }: ClinicalWorkflowPageProps) {
  const { isAuthenticated, canAccessDoctorWorkspace } = useAuth();
  const pathname = usePathname();
  const authHref = `/${locale}/auth?redirect=${encodeURIComponent(pathname)}`;

  const doctorHref = isAuthenticated ? `/${locale}/doctor` : authHref;
  const shopHref = `/${locale}/shop`;
  const coursesHref = `/${locale}/courses`;
  const growthHref = `/${locale}/growth-system`;

  return (
    <div className="min-h-screen bg-white">
      {/* Section 1: Hero */}
      <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-teal-200">
              <Stethoscope className="w-6 h-6" />
              <span className="font-medium">临床工具</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              把学习真正延续到<br className="hidden sm:block" />你的临床工作中
            </h1>
            <p className="text-lg sm:text-xl text-teal-100 leading-relaxed mb-8">
              从客户管理、电子病历到在线问诊与随访，平台帮助宠物医生把专业成长真正转化为日常工作效率与长期服务能力。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={doctorHref}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
              >
                体验医生工作台
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href={shopHref}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                浏览配套器械与产品
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why Clinical Tools Matter */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              为什么临床工具是专业成长之后的下一步
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              学习提升了你的专业能力，而工具帮助你把能力转化为真实的工作效率与客户价值。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">更有秩序地管理客户关系</h3>
              <p className="text-sm text-slate-600">
                系统化的客户档案让你清楚每一位宠物主人的情况，建立长期信任。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">更清晰地沉淀诊疗记录</h3>
              <p className="text-sm text-slate-600">
                结构化的电子病历帮助你积累专业经验，支持病例回顾与持续学习。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <HeartHandshake className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">更持续地提供长期健康服务</h3>
              <p className="text-sm text-slate-600">
                随访与健康管理工具让你主动跟进，成为宠物的长期健康伙伴。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Four Core Tools */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              围绕医生真实工作场景的四大核心工具
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              不是独立的功能点，而是围绕你的日常工作流程设计的完整工具体系。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CORE_TOOLS.map((tool) => {
              const colors = TOOL_COLORS[tool.color as keyof typeof TOOL_COLORS];
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className={`${colors.bg} rounded-2xl border ${colors.border} ${colors.hover} p-6 transition-all`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{tool.title}</h3>
                      <p className="text-sm text-slate-600 mb-4">{tool.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tool.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2.5 py-1 bg-white/80 text-slate-600 text-xs rounded-lg"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <Link
                        href={isAuthenticated ? `/${locale}${tool.href}` : authHref}
                        className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        {isAuthenticated ? '进入使用' : '登录体验'}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: Workflow Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              不是单点功能，而是一条完整的临床工作流
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              从初次接触到长期服务，每一步都有工具支持。
            </p>
          </div>
          {/* Desktop horizontal flow */}
          <div className="hidden lg:flex items-center justify-center gap-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.step}>
                  <div className="flex flex-col items-center text-center w-56">
                    <div className="w-16 h-16 bg-teal-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="text-xs font-semibold text-teal-600 mb-1">STEP {step.step}</div>
                    <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className="w-12 h-0.5 bg-teal-300" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Mobile vertical flow */}
          <div className="lg:hidden space-y-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative">
                  <div className="flex items-start gap-4 bg-white rounded-xl p-4 border border-slate-200">
                    <div className="w-12 h-12 bg-teal-600 text-white rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-teal-600 mb-0.5">STEP {step.step}</div>
                      <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-slate-500">{step.description}</p>
                    </div>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className="absolute left-6 top-full w-0.5 h-4 bg-teal-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 5: Training to Practice Connection */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 p-8 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 text-amber-600 mb-4">
                  <GraduationCap className="w-6 h-6" />
                  <span className="font-semibold">培训与实践连接</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                  培训之后，能力如何进入真实工作
                </h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  课程帮助你提升专业能力，而临床工具让你把这些能力应用到每一次诊疗中。
                  从病历记录到客户沟通，从问诊咨询到随访管理，形成从学习到实践的完整闭环。
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm">课程学习的知识 → 电子病历中的专业记录</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm">沟通技巧训练 → 在线问诊中的专业沟通</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm">健康管理理念 → 随访工具中的长期服务</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={isAuthenticated ? (canAccessDoctorWorkspace ? `/${locale}/doctor/courses` : `/${locale}/user?tab=courses`) : coursesHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
                  >
                    <GraduationCap className="w-4 h-4" />
                    {isAuthenticated ? '查看我的课程' : '浏览课程'}
                  </Link>
                  <Link
                    href={growthHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-amber-300 text-amber-700 rounded-xl font-semibold hover:bg-amber-100 transition-colors"
                  >
                    <Route className="w-4 h-4" />
                    查看成长路径
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
                  <div className="text-center text-slate-400 py-8">
                    <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">培训与实践连接示意图</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Supporting Devices & Products - ONLY SHOP LINK */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-slate-500 mb-3">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-medium">配套支持</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              配套器械与产品支持
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              除了数字化工作流工具，平台还为医生提供日常临床工作中可能需要的配套器械与产品。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {SUPPORT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="bg-white rounded-2xl border border-slate-200 p-6 text-center"
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{cat.title}</h3>
                  <p className="text-sm text-slate-500">{cat.description}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={shopHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              浏览配套器械与产品
            </Link>
            <Link
              href={`${shopHref}#scenarios`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              查看推荐使用场景
            </Link>
          </div>
        </div>
      </section>

      {/* Section 7: Logged-in Value */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              登录后，你将获得更具体的工作支持
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              医生工作台整合了所有临床工具，让你在一个地方高效完成日常工作。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {LOGIN_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.label}
                  className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100"
                >
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-teal-600" />
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
                href={`/${locale}/doctor`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
              >
                进入医生工作台
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href={authHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  登录体验工作台
                </Link>
                <Link
                  href={authHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-teal-200 text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  立即加入
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section 8: Final CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5">
            从专业成长，到更高效的临床工作方式
          </h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            学习让你更专业，工具让你更高效。在宠医界，两者形成完整的职业发展支持。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={doctorHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
            >
              体验医生工作台
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={coursesHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
            >
              <GraduationCap className="w-5 h-5" />
              浏览课程体系
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ClinicalWorkflowPage;
