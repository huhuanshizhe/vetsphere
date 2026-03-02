'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useSiteConfig } from '../context/SiteConfigContext';

// FAQ data (duplicated for client-side use)
const faqData = {
  general: [
    {
      question: 'What is VetSphere?',
      question_zh: 'VetSphere是什么？',
      question_th: 'VetSphere คืออะไร?',
      question_ja: 'VetSphereとは何ですか？',
      answer: 'VetSphere is a global professional development platform for veterinary surgeons, offering board-certified surgical training courses, precision medical equipment, AI-powered consultation, and a clinical community for case sharing.',
      answer_zh: 'VetSphere是一个面向兽医外科医生的全球专业发展平台，提供由专科认证专家主讲的外科培训课程、精密医疗设备、AI辅助咨询以及临床病例分享社区。',
      answer_th: 'VetSphere เป็นแพลตฟอร์มพัฒนาวิชาชีพระดับโลกสำหรับศัลยแพทย์สัตว์ มีหลักสูตรฝึกอบรมศัลยกรรมโดยผู้เชี่ยวชาญที่ได้รับการรับรอง อุปกรณ์การแพทย์ที่แม่นยำ การให้คำปรึกษาด้วย AI และชุมชนคลินิกสำหรับแบ่งปันเคส',
      answer_ja: 'VetSphereは獣医外科医のためのグローバルな専門開発プラットフォームです。専門医認定の外科トレーニングコース、精密医療機器、AI支援コンサルテーション、症例共有のための臨床コミュニティを提供しています。',
    },
    {
      question: 'Who are the course instructors?',
      question_zh: '课程讲师是谁？',
      question_th: 'ผู้สอนหลักสูตรคือใคร?',
      question_ja: 'コースの講師は誰ですか？',
      answer: 'All courses are taught by ACVS (American College of Veterinary Surgeons) or ECVS (European College of Veterinary Surgeons) board-certified diplomates with extensive clinical and teaching experience.',
      answer_zh: '所有课程均由ACVS（美国兽医外科学院）或ECVS（欧洲兽医外科学院）认证的专科医师授课，他们拥有丰富的临床和教学经验。',
      answer_th: 'หลักสูตรทั้งหมดสอนโดยผู้เชี่ยวชาญที่ได้รับการรับรองจาก ACVS (วิทยาลัยศัลยแพทย์สัตว์อเมริกัน) หรือ ECVS (วิทยาลัยศัลยแพทย์สัตว์ยุโรป) ที่มีประสบการณ์ทางคลินิกและการสอนอย่างกว้างขวาง',
      answer_ja: 'すべてのコースはACVS（米国獣医外科学会）またはECVS（欧州獣医外科学会）認定の専門医が担当し、豊富な臨床・教育経験を持っています。',
    },
    {
      question: 'What specialties do you cover?',
      question_zh: '你们涵盖哪些专业方向？',
      question_th: 'คุณครอบคลุมสาขาเฉพาะทางอะไรบ้าง?',
      question_ja: 'どの専門分野をカバーしていますか？',
      answer: 'We offer courses in Orthopedic Surgery (including TPLO), Soft Tissue Surgery, Neurosurgery, Ophthalmology, and Diagnostic Ultrasound. Each specialty has courses ranging from Basic to Master level.',
      answer_zh: '我们提供骨科手术（包括TPLO）、软组织外科、神经外科、眼科和诊断超声等方向的课程。每个专业方向都有从基础到大师级别的课程。',
      answer_th: 'เรามีหลักสูตรด้านศัลยกรรมกระดูก (รวมถึง TPLO) ศัลยกรรมเนื้อเยื่ออ่อน ประสาทศัลยกรรม จักษุวิทยา และอัลตราซาวด์วินิจฉัย แต่ละสาขามีหลักสูตรตั้งแต่ระดับพื้นฐานถึงระดับปรมาจารย์',
      answer_ja: '整形外科（TPLOを含む）、軟部組織外科、神経外科、眼科、診断超音波のコースを提供しています。各専門分野には基礎からマスターレベルまでのコースがあります。',
    },
  ],
  courses: [
    {
      question: 'How do I register for a course?',
      question_zh: '如何报名课程？',
      question_th: 'ฉันจะลงทะเบียนหลักสูตรได้อย่างไร?',
      question_ja: 'コースに登録するにはどうすればよいですか？',
      answer: 'Create an account on VetSphere, browse our course catalog, select your desired course, and complete the checkout process. You will receive a confirmation email with course details and venue information.',
      answer_zh: '在VetSphere创建账户，浏览我们的课程目录，选择您想要的课程，完成结账流程。您将收到确认邮件，包含课程详情和场地信息。',
      answer_th: 'สร้างบัญชีบน VetSphere เรียกดูแคตตาล็อกหลักสูตร เลือกหลักสูตรที่ต้องการ และดำเนินการชำระเงิน คุณจะได้รับอีเมลยืนยันพร้อมรายละเอียดหลักสูตรและข้อมูลสถานที่',
      answer_ja: 'VetSphereでアカウントを作成し、コースカタログを閲覧し、希望のコースを選択して、チェックアウトプロセスを完了します。コースの詳細と会場情報を含む確認メールが届きます。',
    },
    {
      question: 'What is included in the course fee?',
      question_zh: '课程费用包含哪些内容？',
      question_th: 'ค่าธรรมเนียมหลักสูตรรวมอะไรบ้าง?',
      question_ja: 'コース料金には何が含まれますか？',
      answer: 'Course fees typically include: all training materials, wet-lab supplies, shared accommodation (twin room), certificate of completion, and access to our online learning resources. Meals and transportation are usually not included.',
      answer_zh: '课程费用通常包括：所有培训资料、湿实验室用品、拼房住宿（双人间）、结业证书以及在线学习资源访问权限。餐饮和交通费用通常不包含在内。',
      answer_th: 'ค่าธรรมเนียมหลักสูตรโดยทั่วไปรวม: สื่อการฝึกอบรมทั้งหมด อุปกรณ์ห้องปฏิบัติการ ที่พักห้องคู่ ใบรับรองการสำเร็จหลักสูตร และการเข้าถึงแหล่งเรียนรู้ออนไลน์ อาหารและการเดินทางมักไม่รวม',
      answer_ja: 'コース料金には通常、すべてのトレーニング教材、ウェットラボ用品、共有宿泊施設（ツインルーム）、修了証書、オンライン学習リソースへのアクセスが含まれます。食事と交通費は通常含まれません。',
    },
    {
      question: 'Can I get a refund if I cannot attend?',
      question_zh: '如果无法参加可以退款吗？',
      question_th: 'ฉันสามารถขอคืนเงินได้หรือไม่หากไม่สามารถเข้าร่วมได้?',
      question_ja: '参加できない場合、返金は可能ですか？',
      answer: 'Refund policies vary by course. Generally, full refunds are available up to 30 days before the course start date. Partial refunds (50%) may be available 15-30 days before. Please check our refund policy page for details.',
      answer_zh: '退款政策因课程而异。一般来说，开课前30天可全额退款，开课前15-30天可退50%。请查看我们的退款政策页面了解详情。',
      answer_th: 'นโยบายการคืนเงินแตกต่างกันตามหลักสูตร โดยทั่วไปสามารถคืนเงินเต็มจำนวนได้ภายใน 30 วันก่อนวันเริ่มหลักสูตร คืนเงินบางส่วน (50%) อาจทำได้ 15-30 วันก่อน กรุณาตรวจสอบหน้านโยบายการคืนเงิน',
      answer_ja: '返金ポリシーはコースにより異なります。一般的に、コース開始日の30日前まで全額返金が可能です。15〜30日前は50%の部分返金が可能な場合があります。詳細は返金ポリシーページをご確認ください。',
    },
    {
      question: 'Are courses available in English?',
      question_zh: '课程是英文授课吗？',
      question_th: 'หลักสูตรมีเป็นภาษาอังกฤษหรือไม่?',
      question_ja: 'コースは英語で受講できますか？',
      answer: 'Yes, all courses are taught in English by international specialists. For courses held in specific regions, we provide professional translation services to ensure all participants can fully benefit from the training.',
      answer_zh: '是的，所有课程由国际专家用英文授课。对于在中国举办的课程，我们提供专业的中文翻译服务，确保所有参与者都能充分受益于培训。',
      answer_th: 'ใช่ หลักสูตรทั้งหมดสอนเป็นภาษาอังกฤษโดยผู้เชี่ยวชาญระดับนานาชาติ สำหรับหลักสูตรที่จัดในภูมิภาคเฉพาะ เรามีบริการแปลมืออาชีพเพื่อให้ผู้เข้าร่วมทุกคนได้รับประโยชน์สูงสุด',
      answer_ja: 'はい、すべてのコースは国際的な専門家によって英語で行われます。特定の地域で開催されるコースでは、すべての参加者が十分に学べるよう専門的な通訳サービスを提供しています。',
    },
  ],
  equipment: [
    {
      question: 'What types of equipment do you sell?',
      question_zh: '你们销售哪些类型的设备？',
      question_th: 'คุณขายอุปกรณ์ประเภทใดบ้าง?',
      question_ja: 'どのような種類の機器を販売していますか？',
      answer: 'We offer a comprehensive range of veterinary surgical equipment including: power tools (oscillating saws, drills), orthopedic implants (locking plates, screws), hand instruments, consumables (sutures, bandages), and diagnostic equipment.',
      answer_zh: '我们提供全面的兽医外科设备，包括：动力工具（摆锯、钻机）、骨科植入物（锁定钢板、螺钉）、手术器械、耗材（缝合线、绷带）和诊断设备。',
      answer_th: 'เรามีอุปกรณ์ศัลยกรรมสัตวแพทย์ครบวงจร รวมถึง: เครื่องมือไฟฟ้า (เลื่อยสั่น สว่าน) อุปกรณ์ปลูกถ่ายกระดูก (แผ่นล็อค สกรู) เครื่องมือผ่าตัด วัสดุสิ้นเปลือง (ไหมเย็บ ผ้าพันแผล) และอุปกรณ์วินิจฉัย',
      answer_ja: '動力工具（振動ソー、ドリル）、整形外科インプラント（ロッキングプレート、スクリュー）、手術器具、消耗品（縫合糸、包帯）、診断機器など、獣医外科機器を幅広く提供しています。',
    },
    {
      question: 'Do you ship internationally?',
      question_zh: '你们提供国际配送吗？',
      question_th: 'คุณจัดส่งระหว่างประเทศหรือไม่?',
      question_ja: '海外配送は可能ですか？',
      answer: 'Yes, we ship to over 35 countries worldwide. Shipping costs and delivery times vary by destination. All equipment is properly packaged and includes necessary documentation for customs clearance.',
      answer_zh: '是的，我们向全球35多个国家发货。运费和配送时间因目的地而异。所有设备都经过妥善包装，并附有海关清关所需的必要文件。',
      answer_th: 'ใช่ เราจัดส่งไปยังกว่า 35 ประเทศทั่วโลก ค่าจัดส่งและเวลาในการจัดส่งแตกต่างกันตามปลายทาง อุปกรณ์ทั้งหมดบรรจุอย่างเหมาะสมพร้อมเอกสารที่จำเป็นสำหรับการผ่านศุลกากร',
      answer_ja: 'はい、世界35か国以上に配送しています。送料と配送時間は目的地によって異なります。すべての機器は適切に梱包され、通関に必要な書類が含まれています。',
    },
    {
      question: 'Are your products certified?',
      question_zh: '你们的产品有认证吗？',
      question_th: 'สินค้าของคุณได้รับการรับรองหรือไม่?',
      question_ja: '製品は認証を受けていますか？',
      answer: 'All our equipment suppliers are ISO 13485 certified for medical device quality management. Individual products carry relevant certifications (CE, FDA) depending on their category and intended market.',
      answer_zh: '我们所有的设备供应商都通过了ISO 13485医疗器械质量管理体系认证。单个产品根据其类别和目标市场持有相关认证（CE、FDA）。',
      answer_th: 'ซัพพลายเออร์อุปกรณ์ทั้งหมดของเราได้รับการรับรอง ISO 13485 สำหรับการจัดการคุณภาพอุปกรณ์การแพทย์ ผลิตภัณฑ์แต่ละรายการมีการรับรองที่เกี่ยวข้อง (CE, FDA) ตามประเภทและตลาดเป้าหมาย',
      answer_ja: 'すべての機器サプライヤーはISO 13485医療機器品質管理の認証を受けています。個々の製品は、そのカテゴリーと対象市場に応じて関連する認証（CE、FDA）を取得しています。',
    },
  ],
  ai: [
    {
      question: 'What can the AI assistant help with?',
      question_zh: 'AI助手可以帮助什么？',
      question_th: 'ผู้ช่วย AI สามารถช่วยอะไรได้บ้าง?',
      question_ja: 'AIアシスタントは何を手伝ってくれますか？',
      answer: 'Our AI assistant can help with: surgical procedure guidance, equipment recommendations, drug dosage calculations, differential diagnosis suggestions, and answering general veterinary surgery questions. It is trained on veterinary-specific knowledge.',
      answer_zh: '我们的AI助手可以帮助：手术流程指导、设备推荐、药物剂量计算、鉴别诊断建议以及回答一般兽医外科问题。它基于兽医专业知识进行训练。',
      answer_th: 'ผู้ช่วย AI ของเราสามารถช่วยได้: คำแนะนำขั้นตอนการผ่าตัด คำแนะนำอุปกรณ์ การคำนวณขนาดยา ข้อเสนอแนะการวินิจฉัยแยกโรค และตอบคำถามทั่วไปเกี่ยวกับศัลยกรรมสัตวแพทย์',
      answer_ja: 'AIアシスタントは、手術手順のガイダンス、機器の推奨、薬剤投与量の計算、鑑別診断の提案、一般的な獣医外科に関する質問への回答などをサポートします。獣医学専門知識で訓練されています。',
    },
    {
      question: 'Is the AI assistant a replacement for veterinary advice?',
      question_zh: 'AI助手可以替代兽医建议吗？',
      question_th: 'ผู้ช่วย AI สามารถทดแทนคำแนะนำจากสัตวแพทย์ได้หรือไม่?',
      question_ja: 'AIアシスタントは獣医師のアドバイスの代わりになりますか？',
      answer: 'No, the AI assistant is a supplementary tool for education and reference. It should not replace professional veterinary judgment. Always consult with qualified veterinarians for clinical decisions regarding patient care.',
      answer_zh: '不，AI助手是用于教育和参考的辅助工具。它不能替代专业的兽医判断。对于患者护理的临床决策，请始终咨询有资质的兽医。',
      answer_th: 'ไม่ ผู้ช่วย AI เป็นเครื่องมือเสริมสำหรับการศึกษาและการอ้างอิง ไม่ควรใช้แทนดุลยพินิจของสัตวแพทย์มืออาชีพ ปรึกษาสัตวแพทย์ที่มีคุณสมบัติเสมอสำหรับการตัดสินใจทางคลินิก',
      answer_ja: 'いいえ、AIアシスタントは教育と参考のための補助ツールです。専門的な獣医学的判断に代わるものではありません。患者のケアに関する臨床的な決定については、必ず資格のある獣医師にご相談ください。',
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
    <div className="border border-slate-100 rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50 transition-colors min-h-[56px]"
      >
        <span className="font-bold text-slate-900 text-base sm:text-lg">{question}</span>
        <span className={`text-xl sm:text-2xl text-vs transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-sm sm:text-base text-slate-600 leading-relaxed">
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
    <div className="space-y-3 sm:space-y-4">
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 sm:gap-3">
        <span className="text-2xl sm:text-3xl">{icon}</span>
        {title}
      </h2>
      <div className="space-y-2 sm:space-y-3">
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
  const { siteConfig } = useSiteConfig();
  const locale = pathname.split('/')[1] || 'en';
  const isZh = language === 'zh';
  const isTh = language === 'th';
  const isJa = language === 'ja';
  const aiEnabled = siteConfig.features?.aiConsultation !== false;

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Helper to pick localized text with fallback chain: ZH > TH > JA > EN
  const localize = (en: string, zh?: string, th?: string, ja?: string) => {
    if (isZh && zh) return zh;
    if (isTh && th) return th;
    if (isJa && ja) return ja;
    return en;
  };

  // Transform FAQ data based on language
  const getLocalizedFaqs = (faqs: typeof faqData.general) => {
    return faqs.map(faq => ({
      question: localize(faq.question, faq.question_zh, faq.question_th, faq.question_ja),
      answer: localize(faq.answer, faq.answer_zh, faq.answer_th, faq.answer_ja),
    }));
  };

  const sectionTitles = {
    general: localize('General', '一般问题', 'ทั่วไป', '一般的な質問'),
    courses: localize('Courses', '课程相关', 'หลักสูตร', 'コース'),
    equipment: localize('Equipment', '设备购买', 'อุปกรณ์', '機器'),
    ai: localize('AI Assistant', 'AI助手', 'ผู้ช่วย AI', 'AIアシスタント'),
  };

  const sections = [
    { 
      key: 'general', 
      title: sectionTitles.general, 
      icon: '&#128161;', 
      faqs: getLocalizedFaqs(faqData.general),
      offset: 0
    },
    { 
      key: 'courses', 
      title: sectionTitles.courses, 
      icon: '&#127891;', 
      faqs: getLocalizedFaqs(faqData.courses),
      offset: faqData.general.length
    },
    { 
      key: 'equipment', 
      title: sectionTitles.equipment, 
      icon: '&#129520;', 
      faqs: getLocalizedFaqs(faqData.equipment),
      offset: faqData.general.length + faqData.courses.length
    },
    { 
      key: 'ai', 
      title: sectionTitles.ai, 
      icon: '&#129302;', 
      faqs: getLocalizedFaqs(faqData.ai),
      offset: faqData.general.length + faqData.courses.length + faqData.equipment.length
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24 md:pt-28">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 sm:mb-4">
            {localize('Frequently Asked Questions', '常见问题', 'คำถามที่พบบ่อย', 'よくある質問')}
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto px-2">
            {localize(
              'Find answers to common questions about VetSphere platform, course registration, equipment purchase, and AI assistant.',
              '在这里找到关于VetSphere平台、课程报名、设备购买和AI助手的常见问题解答。',
              'ค้นหาคำตอบสำหรับคำถามทั่วไปเกี่ยวกับแพลตฟอร์ม VetSphere การลงทะเบียนหลักสูตร การซื้ออุปกรณ์ และผู้ช่วย AI',
              'VetSphereプラットフォーム、コース登録、機器購入、AIアシスタントに関するよくある質問をご覧ください。'
            )}
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          {sections.map(section => (
            <a
              key={section.key}
              href={`#${section.key}`}
              className="px-3 sm:px-4 py-2 bg-white rounded-full text-xs sm:text-sm font-bold text-slate-600 hover:text-vs hover:bg-vs/5 transition-colors border border-slate-100 min-h-[40px] flex items-center"
            >
              <span dangerouslySetInnerHTML={{ __html: section.icon }} /> <span className="ml-1">{section.title}</span>
            </a>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8 sm:space-y-12">
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
        <div className="mt-12 sm:mt-16 bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center border border-slate-100 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">
            {localize('Still have questions?', '还有其他问题？', 'ยังมีคำถามอยู่?', 'まだ質問がありますか？')}
          </h3>
          <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6">
            {aiEnabled
              ? localize(
                  'Our AI assistant can help answer more questions, or you can contact our support team directly.',
                  '我们的AI助手可以帮助解答更多问题，或者您可以直接联系我们的客服团队。',
                  'ผู้ช่วย AI ของเราสามารถช่วยตอบคำถามเพิ่มเติมได้ หรือคุณสามารถติดต่อทีมสนับสนุนของเราโดยตรง',
                  'AIアシスタントがさらに質問にお答えします。また、サポートチームに直接お問い合わせいただくこともできます。'
                )
              : localize(
                  'If you have more questions, please contact our support team directly.',
                  '如有更多问题，请直接联系我们的客服团队。',
                  'หากมีคำถามเพิ่มเติม กรุณาติดต่อทีมสนับสนุนของเราโดยตรง',
                  'ご質問がある場合は、サポートチームに直接お問い合わせください。'
                )
            }
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            {aiEnabled && (
              <Link 
                href={`/${locale}/ai`}
                className="px-5 sm:px-6 py-3 bg-vs text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors min-h-[48px] flex items-center justify-center"
              >
                &#129302; {localize('Ask AI Assistant', '咨询AI助手', 'ถามผู้ช่วย AI', 'AIアシスタントに聞く')}
              </Link>
            )}
            <a 
              href="mailto:support@vetsphere.com"
              className="px-5 sm:px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-vs hover:text-vs transition-colors min-h-[48px] flex items-center justify-center"
            >
              &#128231; {localize('Contact Support', '联系客服', 'ติดต่อฝ่ายสนับสนุน', 'サポートに連絡')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPageClient;
