'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Handshake, Building2, GraduationCap, Package, Users,
  ArrowRight, CheckCircle2, Send, Mail, Phone
} from 'lucide-react';

interface CooperationPageProps {
  locale: string;
}

// 合作类型
const COOPERATION_TYPES = [
  {
    icon: GraduationCap,
    title: '培训合作',
    description: '与培训机构、兽医院校、行业协会合作开展专业培训项目',
    benefits: ['联合培训项目', '课程内容共建', '认证体系对接', '学员推荐渠道'],
    color: 'blue'
  },
  {
    icon: Building2,
    title: '医院合作',
    description: '为宠物医院提供医生培训、人才输送、数字化工具等服务',
    benefits: ['医生培训计划', '人才招聘对接', '临床工具使用', '运营支持'],
    color: 'emerald'
  },
  {
    icon: Package,
    title: '器械与产品合作',
    description: '与器械厂商、产品供应商合作，为医生提供配套支持',
    benefits: ['产品上架', '医生推荐渠道', '联合推广', '专业背书'],
    color: 'purple'
  },
  {
    icon: Users,
    title: '内容与社区合作',
    description: '与行业专家、KOL、媒体合作进行内容共创与传播',
    benefits: ['专家入驻', '内容共创', '品牌传播', '社区运营'],
    color: 'amber'
  }
];

// 合作优势
const COOPERATION_ADVANTAGES = [
  '深耕宠物医疗行业，精准触达目标医生群体',
  '专业培训体系背书，高度信任的用户关系',
  '数字化平台能力，高效的合作落地',
  '完整的医生成长路径，多元的合作触点'
];

const TYPE_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' }
};

export function CooperationPage({ locale }: CooperationPageProps) {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    title: '',
    email: '',
    phone: '',
    type: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-indigo-200">
              <Handshake className="w-5 h-5" />
              <span className="font-medium">合作咨询</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              与宠医界携手，<br className="hidden sm:block" />共同服务宠物医生成长
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100 leading-relaxed mb-8">
              无论你是培训机构、宠物医院、器械厂商还是行业专家，我们都期待与你探索合作可能，一起为宠物医生创造更大价值。
            </p>
            <div className="flex items-center gap-6 text-indigo-200">
              <a href="mailto:business@vetsphere.net" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
                <span>business@vetsphere.net</span>
              </a>
              <a href="tel:+8618616223318" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
                <span>+86 18616223318</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Cooperation Types */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">合作方向</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              我们与不同类型的合作伙伴共同探索多元化的合作模式
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COOPERATION_TYPES.map((type) => {
              const colors = TYPE_COLORS[type.color as keyof typeof TYPE_COLORS];
              const Icon = type.icon;
              return (
                <div key={type.title} className={`${colors.bg} rounded-2xl border ${colors.border} p-6`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{type.title}</h3>
                      <p className="text-sm text-slate-600 mb-4">{type.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {type.benefits.map((benefit) => (
                          <span
                            key={benefit}
                            className="px-2.5 py-1 bg-white/80 text-slate-600 text-xs rounded-lg"
                          >
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Partner */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">为什么选择宠医界</h2>
              <div className="space-y-4">
                {COOPERATION_ADVANTAGES.map((advantage, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                    <span className="text-slate-700">{advantage}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">平台数据（示例）</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-600 mb-1">10,000+</div>
                  <div className="text-sm text-slate-500">注册医生</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-600 mb-1">500+</div>
                  <div className="text-sm text-slate-500">培训学员</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-600 mb-1">50+</div>
                  <div className="text-sm text-slate-500">合作医院</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-indigo-600 mb-1">20+</div>
                  <div className="text-sm text-slate-500">认证导师</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">提交合作意向</h2>
            <p className="text-slate-600">
              填写以下信息，我们的商务团队会在 2 个工作日内与你联系
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">提交成功！</h3>
              <p className="text-slate-600 mb-6">
                感谢你的合作意向，我们的商务团队会尽快与你联系。
              </p>
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700"
              >
                返回首页
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-slate-50 rounded-2xl p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">公司/机构名称 *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="你的公司或机构名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">合作类型 *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">请选择合作类型</option>
                    <option value="training">培训合作</option>
                    <option value="hospital">医院合作</option>
                    <option value="product">器械与产品合作</option>
                    <option value="content">内容与社区合作</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">联系人姓名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="你的姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">职位</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="你的职位"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱 *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="你的邮箱地址"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">电话 *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="你的联系电话"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">合作意向说明</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="请简要描述你的合作意向或想法..."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    提交合作意向
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            还不确定合作方向？
          </h2>
          <p className="text-slate-600 mb-8">
            欢迎先了解我们的平台和服务，或直接联系我们进行初步沟通。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={`/${locale}/about`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              了解宠医界
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              联系我们
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CooperationPage;
