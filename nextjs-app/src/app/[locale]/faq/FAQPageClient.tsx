'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

// FAQ data (duplicated for client-side use)
const faqData = {
  general: [
    {
      question: 'What is VetSphere?',
      question_zh: 'VetSphere是什么？',
      answer: 'VetSphere is a global professional development platform for veterinary surgeons, offering board-certified surgical training courses, precision medical equipment, AI-powered consultation, and a clinical community for case sharing.',
      answer_zh: 'VetSphere是一个面向兽医外科医生的全球专业发展平台，提供由专科认证专家主讲的外科培训课程、精密医疗设备、AI辅助咨询以及临床病例分享社区。',
    },
    {
      question: 'Who are the course instructors?',
      question_zh: '课程讲师是谁？',
      answer: 'All courses are taught by ACVS (American College of Veterinary Surgeons) or ECVS (European College of Veterinary Surgeons) board-certified diplomates with extensive clinical and teaching experience.',
      answer_zh: '所有课程均由ACVS（美国兽医外科学院）或ECVS（欧洲兽医外科学院）认证的专科医师授课，他们拥有丰富的临床和教学经验。',
    },
    {
      question: 'What specialties do you cover?',
      question_zh: '你们涵盖哪些专业方向？',
      answer: 'We offer courses in Orthopedic Surgery (including TPLO), Soft Tissue Surgery, Neurosurgery, Ophthalmology, and Diagnostic Ultrasound. Each specialty has courses ranging from Basic to Master level.',
      answer_zh: '我们提供骨科手术（包括TPLO）、软组织外科、神经外科、眼科和诊断超声等方向的课程。每个专业方向都有从基础到大师级别的课程。',
    },
  ],
  courses: [
    {
      question: 'How do I register for a course?',
      question_zh: '如何报名课程？',
      answer: 'Create an account on VetSphere, browse our course catalog, select your desired course, and complete the checkout process. You will receive a confirmation email with course details and venue information.',
      answer_zh: '在VetSphere创建账户，浏览我们的课程目录，选择您想要的课程，完成结账流程。您将收到确认邮件，包含课程详情和场地信息。',
    },
    {
      question: 'What is included in the course fee?',
      question_zh: '课程费用包含哪些内容？',
      answer: 'Course fees typically include: all training materials, wet-lab supplies, shared accommodation (twin room), certificate of completion, and access to our online learning resources. Meals and transportation are usually not included.',
      answer_zh: '课程费用通常包括：所有培训资料、湿实验室用品、拼房住宿（双人间）、结业证书以及在线学习资源访问权限。餐饮和交通费用通常不包含在内。',
    },
    {
      question: 'Can I get a refund if I cannot attend?',
      question_zh: '如果无法参加可以退款吗？',
      answer: 'Refund policies vary by course. Generally, full refunds are available up to 30 days before the course start date. Partial refunds (50%) may be available 15-30 days before. Please check our refund policy page for details.',
      answer_zh: '退款政策因课程而异。一般来说，开课前30天可全额退款，开课前15-30天可退50%。请查看我们的退款政策页面了解详情。',
    },
    {
      question: 'Are courses available in English?',
      question_zh: '课程是英文授课吗？',
      answer: 'Yes, all courses are taught in English by international specialists. For courses held in China, we provide professional Chinese translation services to ensure all participants can fully benefit from the training.',
      answer_zh: '是的，所有课程由国际专家用英文授课。对于在中国举办的课程，我们提供专业的中文翻译服务，确保所有参与者都能充分受益于培训。',
    },
  ],
  equipment: [
    {
      question: 'What types of equipment do you sell?',
      question_zh: '你们销售哪些类型的设备？',
      answer: 'We offer a comprehensive range of veterinary surgical equipment including: power tools (oscillating saws, drills), orthopedic implants (locking plates, screws), hand instruments, consumables (sutures, bandages), and diagnostic equipment.',
      answer_zh: '我们提供全面的兽医外科设备，包括：动力工具（摆锯、钻机）、骨科植入物（锁定钢板、螺钉）、手术器械、耗材（缝合线、绷带）和诊断设备。',
    },
    {
      question: 'Do you ship internationally?',
      question_zh: '你们提供国际配送吗？',
      answer: 'Yes, we ship to over 35 countries worldwide. Shipping costs and delivery times vary by destination. All equipment is properly packaged and includes necessary documentation for customs clearance.',
      answer_zh: '是的，我们向全球35多个国家发货。运费和配送时间因目的地而异。所有设备都经过妥善包装，并附有海关清关所需的必要文件。',
    },
    {
      question: 'Are your products certified?',
      question_zh: '你们的产品有认证吗？',
      answer: 'All our equipment suppliers are ISO 13485 certified for medical device quality management. Individual products carry relevant certifications (CE, FDA) depending on their category and intended market.',
      answer_zh: '我们所有的设备供应商都通过了ISO 13485医疗器械质量管理体系认证。单个产品根据其类别和目标市场持有相关认证（CE、FDA）。',
    },
  ],
  ai: [
    {
      question: 'What can the AI assistant help with?',
      question_zh: 'AI助手可以帮助什么？',
      answer: 'Our AI assistant can help with: surgical procedure guidance, equipment recommendations, drug dosage calculations, differential diagnosis suggestions, and answering general veterinary surgery questions. It is trained on veterinary-specific knowledge.',
      answer_zh: '我们的AI助手可以帮助：手术流程指导、设备推荐、药物剂量计算、鉴别诊断建议以及回答一般兽医外科问题。它基于兽医专业知识进行训练。',
    },
    {
      question: 'Is the AI assistant a replacement for veterinary advice?',
      question_zh: 'AI助手可以替代兽医建议吗？',
      answer: 'No, the AI assistant is a supplementary tool for education and reference. It should not replace professional veterinary judgment. Always consult with qualified veterinarians for clinical decisions regarding patient care.',
      answer_zh: '不，AI助手是用于教育和参考的辅助工具。它不能替代专业的兽医判断。对于患者护理的临床决策，请始终咨询有资质的兽医。',
    },
  ],
};

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
      >
        <span className="font-bold text-slate-900 text-lg">{question}</span>
        <span className={`text-2xl text-vs transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-6 pb-5 text-slate-600 leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
};

interface FAQSectionProps {
  title: string;
  icon: string;
  faqs: { question: string; answer: string }[];
  openIndex: number | null;
  onToggle: (index: number) => void;
  sectionOffset: number;
}

const FAQSection: React.FC<FAQSectionProps> = ({ 
  title, 
  icon, 
  faqs, 
  openIndex, 
  onToggle,
  sectionOffset 
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <FAQItem
            key={idx}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === sectionOffset + idx}
            onToggle={() => onToggle(sectionOffset + idx)}
          />
        ))}
      </div>
    </div>
  );
};

const FAQPageClient: React.FC = () => {
  const pathname = usePathname();
  const { language } = useLanguage();
  const locale = pathname.split('/')[1] || 'en';
  const isZh = language === 'zh';

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Transform FAQ data based on language
  const getLocalizedFaqs = (faqs: typeof faqData.general) => {
    return faqs.map(faq => ({
      question: isZh && faq.question_zh ? faq.question_zh : faq.question,
      answer: isZh && faq.answer_zh ? faq.answer_zh : faq.answer,
    }));
  };

  const sections = [
    { 
      key: 'general', 
      title: isZh ? '一般问题' : 'General', 
      icon: '&#128161;', 
      faqs: getLocalizedFaqs(faqData.general),
      offset: 0
    },
    { 
      key: 'courses', 
      title: isZh ? '课程相关' : 'Courses', 
      icon: '&#127891;', 
      faqs: getLocalizedFaqs(faqData.courses),
      offset: faqData.general.length
    },
    { 
      key: 'equipment', 
      title: isZh ? '设备购买' : 'Equipment', 
      icon: '&#129520;', 
      faqs: getLocalizedFaqs(faqData.equipment),
      offset: faqData.general.length + faqData.courses.length
    },
    { 
      key: 'ai', 
      title: isZh ? 'AI助手' : 'AI Assistant', 
      icon: '&#129302;', 
      faqs: getLocalizedFaqs(faqData.ai),
      offset: faqData.general.length + faqData.courses.length + faqData.equipment.length
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-28">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            {isZh ? '常见问题' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            {isZh 
              ? '在这里找到关于VetSphere平台、课程报名、设备购买和AI助手的常见问题解答。' 
              : 'Find answers to common questions about VetSphere platform, course registration, equipment purchase, and AI assistant.'}
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {sections.map(section => (
            <a
              key={section.key}
              href={`#${section.key}`}
              className="px-4 py-2 bg-white rounded-full text-sm font-bold text-slate-600 hover:text-vs hover:bg-vs/5 transition-colors border border-slate-100"
            >
              <span dangerouslySetInnerHTML={{ __html: section.icon }} /> {section.title}
            </a>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {sections.map(section => (
            <div key={section.key} id={section.key}>
              <FAQSection
                title={section.title}
                icon={section.icon}
                faqs={section.faqs}
                openIndex={openIndex}
                onToggle={handleToggle}
                sectionOffset={section.offset}
              />
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-white rounded-3xl p-8 md:p-12 text-center border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-black text-slate-900 mb-3">
            {isZh ? '还有其他问题？' : 'Still have questions?'}
          </h3>
          <p className="text-slate-500 mb-6">
            {isZh 
              ? '我们的AI助手可以帮助解答更多问题，或者您可以直接联系我们的客服团队。' 
              : 'Our AI assistant can help answer more questions, or you can contact our support team directly.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href={`/${locale}/ai`}
              className="px-6 py-3 bg-vs text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
            >
              &#129302; {isZh ? '咨询AI助手' : 'Ask AI Assistant'}
            </Link>
            <a 
              href="mailto:support@vetsphere.com"
              className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-vs hover:text-vs transition-colors"
            >
              &#128231; {isZh ? '联系客服' : 'Contact Support'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPageClient;
