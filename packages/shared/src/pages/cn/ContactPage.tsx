'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail, Phone, MapPin, MessageSquare, Clock, Send,
  ArrowRight, CheckCircle2
} from 'lucide-react';

interface ContactPageProps {
  locale: string;
}

// 联系方式
const CONTACT_INFO = [
  {
    icon: Mail,
    label: '邮箱',
    value: 'support@vetsphere.net',
    description: '商务合作、技术支持',
    href: 'mailto:support@vetsphere.net'
  },
  {
    icon: Phone,
    label: '电话',
    value: '+86 18616223318',
    description: '工作日 9:00-18:00',
    href: 'tel:+8618616223318'
  },
  {
    icon: MapPin,
    label: '地址',
    value: '中国上海',
    description: '宠医界总部',
    href: null
  }
];

// 常见问题快速入口
const QUICK_LINKS = [
  { label: '课程相关问题', href: '/faq#courses' },
  { label: '账户与支付', href: '/faq#payment' },
  { label: '平台使用帮助', href: '/faq#platform' },
  { label: '合作咨询', href: '/cooperation' }
];

export function ContactPage({ locale }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">联系我们</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              有任何问题？<br className="hidden sm:block" />我们随时为你解答
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              无论是课程咨询、平台使用问题，还是商务合作意向，都欢迎联系我们。
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">联系方式</h2>
              <div className="space-y-6 mb-10">
                {CONTACT_INFO.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-1">{item.label}</div>
                        <div className="font-semibold text-slate-900">{item.value}</div>
                        <div className="text-sm text-slate-500">{item.description}</div>
                      </div>
                    </div>
                  );
                  return item.href ? (
                    <a key={item.label} href={item.href} className="block hover:opacity-80 transition-opacity">
                      {content}
                    </a>
                  ) : (
                    <div key={item.label}>{content}</div>
                  );
                })}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-4">快速入口</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={`/${locale}${link.href}`}
                    className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-10 p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-slate-900">工作时间</span>
                </div>
                <p className="text-sm text-slate-600">
                  周一至周五 9:00 - 18:00（法定节假日除外）<br />
                  邮件咨询我们会在 1-2 个工作日内回复
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">在线留言</h2>
              {isSubmitted ? (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">提交成功！</h3>
                  <p className="text-slate-600 mb-6">
                    感谢你的留言，我们会在 1-2 个工作日内回复你。
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
                    }}
                    className="text-emerald-600 font-medium hover:text-emerald-700"
                  >
                    再次留言
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">姓名 *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="你的姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">手机号</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="你的手机号"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱 *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="你的邮箱地址"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">主题 *</label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">请选择咨询主题</option>
                      <option value="course">课程咨询</option>
                      <option value="platform">平台使用问题</option>
                      <option value="cooperation">商务合作</option>
                      <option value="feedback">意见反馈</option>
                      <option value="other">其他问题</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">留言内容 *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      placeholder="请详细描述你的问题或需求..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        提交留言
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            想要了解更多？
          </h2>
          <p className="text-slate-600 mb-8">
            浏览我们的课程体系或成长路径，了解宠医界如何帮助你的职业发展。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={`/${locale}/courses`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              浏览课程中心
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={`/${locale}/about`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              关于宠医界
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ContactPage;
