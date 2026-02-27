import type { Metadata } from 'next';
import JsonLd, { faqSchema, breadcrumbSchema } from '@/components/JsonLd';
import FAQPageClient from './FAQPageClient';

const SITE_URL = 'https://vetsphere.com';
const locales = ['en', 'zh', 'th'] as const;

// FAQ data for structured data and rendering
export const faqData = {
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

export async function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === 'zh';
  
  return {
    title: isZh ? '常见问题 | VetSphere' : 'Frequently Asked Questions | VetSphere',
    description: isZh 
      ? 'VetSphere兽医外科培训平台常见问题解答：课程报名、设备购买、AI助手使用等'
      : 'FAQ about VetSphere veterinary surgery training platform: course registration, equipment purchase, AI assistant usage, and more.',
    keywords: ['FAQ', 'veterinary surgery', 'course registration', 'equipment', 'VetSphere'],
    alternates: {
      canonical: `${SITE_URL}/${locale}/faq`,
      languages: {
        'en': `${SITE_URL}/en/faq`,
        'zh-CN': `${SITE_URL}/zh/faq`,
        'th': `${SITE_URL}/th/faq`,
      },
    },
  };
}

export default async function FAQPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  const isZh = locale === 'zh';
  
  // Flatten all FAQs for schema
  const allFaqs = [
    ...faqData.general,
    ...faqData.courses,
    ...faqData.equipment,
    ...faqData.ai,
  ].map(faq => ({
    question: isZh && faq.question_zh ? faq.question_zh : faq.question,
    answer: isZh && faq.answer_zh ? faq.answer_zh : faq.answer,
  }));

  return (
    <>
      {/* Breadcrumb Schema */}
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: isZh ? '常见问题' : 'FAQ', url: `${SITE_URL}/${locale}/faq` },
      ])} />
      
      {/* FAQ Schema for AEO */}
      <JsonLd data={faqSchema(allFaqs)} />
      
      <FAQPageClient />
    </>
  );
}
