'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, FileText, ChevronRight, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const CnPrivacyPage: React.FC = () => {
  const { locale } = useLanguage();

  const sections = [
    {
      icon: <Database className="w-5 h-5" />,
      title: '1. 信息收集',
      content: '我们收集以下类型的信息：\n\n• 账户信息：姓名、邮箱地址、手机号码、职业资质信息\n• 使用数据：您访问的页面、使用的功能、学习进度\n• 设备信息：设备类型、操作系统、浏览器类型\n• 支付信息：通过安全第三方支付处理商处理，我们不存储完整支付卡信息'
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: '2. 信息使用',
      content: '我们使用收集的信息用于：\n\n• 提供和改进我们的服务\n• 处理您的课程报名和付款\n• 发送服务相关通知和更新\n• 个性化您的学习体验\n• 分析服务使用情况以改进产品\n• 遵守法律义务'
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      title: '3. 信息共享',
      content: '我们不会出售您的个人信息。我们可能在以下情况下共享您的信息：\n\n• 与服务提供商：帮助我们运营服务的第三方（如支付处理、云存储）\n• 法律要求：响应法律程序或政府要求\n• 业务转让：如公司合并或收购\n• 经您同意：在获得您明确同意后'
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: '4. 数据安全',
      content: '我们采取行业标准的安全措施保护您的信息：\n\n• 数据传输采用 SSL/TLS 加密\n• 敏感数据存储采用加密技术\n• 定期安全审计和漏洞评估\n• 严格的员工访问控制\n• 安全的数据中心托管'
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: '5. 您的权利',
      content: '根据适用法律，您享有以下权利：\n\n• 访问权：获取我们持有的您的个人信息副本\n• 更正权：要求更正不准确的信息\n• 删除权：在特定情况下要求删除您的信息\n• 限制处理权：要求限制某些处理活动\n• 数据可携带权：以结构化格式获取您的数据\n• 撤回同意权：随时撤回之前给予的同意'
    },
    {
      title: '6. Cookie 使用',
      content: '我们使用 Cookie 和类似技术来：\n\n• 保持您的登录状态\n• 记住您的偏好设置\n• 分析服务使用情况\n• 提供个性化体验\n\n您可以通过浏览器设置管理 Cookie 偏好，但这可能影响某些功能的使用。'
    },
    {
      title: '7. 数据保留',
      content: '我们会在实现收集目的所需的期限内保留您的个人信息，除非法律要求或允许更长的保留期限。账户信息通常在您删除账户后的合理期限内删除，但我们可能需要保留某些信息以遵守法律义务或解决争议。'
    },
    {
      title: '8. 儿童隐私',
      content: '我们的服务面向成年专业人士。我们不会故意收集16岁以下儿童的个人信息。如果您认为我们无意中收集了儿童的信息，请立即联系我们，我们将采取措施删除该信息。'
    },
    {
      title: '9. 政策更新',
      content: '我们可能会不时更新本隐私政策。更新后的政策将在网站上发布，并注明生效日期。对于重大变更，我们会通过邮件或站内通知方式告知您。继续使用我们的服务即表示您接受更新后的政策。'
    },
    {
      title: '10. 联系我们',
      content: '如您对本隐私政策有任何疑问，或希望行使您的数据权利，请联系我们：'
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-6">
              <Shield className="w-4 h-4" />
              <span>隐私保护</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              隐私政策
            </h1>
            
            <p className="text-xl text-slate-600 mb-4">
              我们重视您的隐私，并致力于保护您的个人信息。
            </p>
            
            <p className="text-slate-500">
              最后更新：2025年3月
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-slate max-w-none">
              {sections.map((section, index) => (
                <div key={index} className="mb-10">
                  <div className="flex items-start gap-4 mb-4">
                    {section.icon && (
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                        {section.icon}
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-slate-900 mt-1">{section.title}</h2>
                  </div>
                  <div className={section.icon ? 'ml-14' : ''}>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{section.content}</p>
                  </div>
                </div>
              ))}

              {/* Contact Info */}
              <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl border border-blue-100">
                <p className="font-bold text-slate-900 mb-2">VetSphere 数据保护负责人</p>
                <p className="text-slate-600 mb-1">上海市浦东新区张江高科技园区</p>
                <p className="text-slate-600 mb-1">邮箱：privacy@vetsphere.cn</p>
                <p className="text-slate-600">电话：+86 400-XXX-XXXX</p>
              </div>
            </div>

            {/* Related Links */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">相关文档</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href={`/${locale}/terms`}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-700">用户协议</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href={`/${locale}/refund`}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-700">退款政策</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CnPrivacyPage;
