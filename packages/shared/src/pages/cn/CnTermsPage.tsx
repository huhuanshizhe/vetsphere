'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Shield, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const CnTermsPage: React.FC = () => {
  const { locale } = useLanguage();

  const sections = [
    {
      title: '1. 服务条款的接受',
      content: '访问和使用 VetSphere 网站及服务，即表示您同意受本服务条款的约束。如果您不同意这些条款，请不要使用我们的服务。'
    },
    {
      title: '2. 服务说明',
      content: 'VetSphere 为持证兽医专业人员提供专业培训课程、职业发展资源、在线社区和临床工具服务。我们的服务本质上是教育性质的，不构成兽医医疗服务、治疗或临床护理。'
    },
    {
      title: '3. 用户账户',
      content: '要访问我们服务的某些功能，您可能需要创建账户。您有责任维护账户凭证的机密性，并对您账户下发生的所有活动负责。请妥善保管您的登录信息，如发现账户被盗用，请立即联系我们。'
    },
    {
      title: '4. 课程报名',
      content: '报名课程或培训班即表示您同意：提供准确完整的报名信息；按时支付所有适用费用；按时参加预定课程或提前通知我们任何缺席情况；遵守所有课程规则和指南。'
    },
    {
      title: '5. 支付条款',
      content: '除非另有说明，所有费用在报名时即应支付。价格以人民币（CNY）标示，可能需要缴纳适用税费。支付处理通过我们的安全支付服务商进行。课程费用一经支付，除特殊情况外不予退还，详情请参阅我们的退款政策。'
    },
    {
      title: '6. 知识产权',
      content: '所有课程材料，包括但不限于视频、文档、演示文稿和其他内容，均为 VetSphere 的知识产权。未经我们明确书面许可，您不得复制、分发或创作衍生作品。学员仅获得个人学习使用的非排他性许可。'
    },
    {
      title: '7. 行为准则',
      content: '参与我们课程的学员应始终保持专业行为。我们保留移除任何从事破坏性、不尊重或不当行为的参与者的权利。在社区互动中，请尊重其他成员，不发布虚假、误导或攻击性内容。'
    },
    {
      title: '8. 责任限制',
      content: 'VetSphere 仅出于信息目的提供教育内容。我们不对根据课程中提供的信息所做的任何决定承担责任。参与者有责任在其执业范围内并根据当地法规应用所学技术。我们不对因使用我们服务而产生的任何直接或间接损失负责。'
    },
    {
      title: '9. 条款变更',
      content: '我们保留随时修改这些条款的权利。变更将在发布后立即生效。您继续使用我们的服务即表示接受任何修改。重大变更时，我们将通过邮件或站内通知方式告知您。'
    },
    {
      title: '10. 适用法律',
      content: '本条款受中华人民共和国法律管辖。对于本条款引起的或与之相关的任何争议，双方应首先通过友好协商解决；协商不成的，任何一方均可向 VetSphere 所在地有管辖权的人民法院提起诉讼。'
    },
    {
      title: '11. 联系信息',
      content: '如对本服务条款有任何疑问，请联系我们：'
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-slate-200/30 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-full text-sm font-bold mb-6">
              <FileText className="w-4 h-4" />
              <span>法律文件</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              用户协议
            </h1>
            
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
                <div key={index} className="mb-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">{section.title}</h2>
                  <p className="text-slate-600 leading-relaxed">{section.content}</p>
                </div>
              ))}

              {/* Contact Info */}
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="font-bold text-slate-900 mb-2">VetSphere 宠物医生职业发展平台</p>
                <p className="text-slate-600 mb-1">上海市浦东新区张江高科技园区</p>
                <p className="text-slate-600 mb-1">邮箱：support@vetsphere.cn</p>
                <p className="text-slate-600">电话：+86 400-XXX-XXXX</p>
              </div>
            </div>

            {/* Related Links */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">相关文档</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href={`/${locale}/privacy`}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-700">隐私政策</span>
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

export default CnTermsPage;
