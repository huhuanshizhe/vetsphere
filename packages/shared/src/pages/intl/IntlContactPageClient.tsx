'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Mail, Phone, MapPin, Clock, Send, Loader2, MessageCircle } from 'lucide-react';

// Contact page translations
const contactTranslations = {
  en: {
    badge: 'Contact Us',
    title: 'Get in Touch',
    subtitle:
      "Have questions about our training programs? We're here to help. Reach out and our team will respond within 24 hours.",
    email: 'Email',
    emailDesc: 'For general inquiries',
    phone: 'Phone',
    phoneDesc: 'Mon-Fri, 9:00 AM - 6:00 PM HKT',
    whatsapp: 'WhatsApp',
    whatsappDesc: 'Chat with us on WhatsApp',
    line: 'LINE',
    lineDesc: 'Add us on LINE',
    address: 'Address',
    addressDesc: 'Head Office',
    hours: 'Office Hours',
    hoursValue: 'Monday – Friday: 9:00 AM – 6:00 PM (HKT)\nSaturday & Sunday: Closed',
    formTitle: 'Send us a message',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Dr. John Smith',
    emailAddress: 'Email Address',
    emailPlaceholder: 'john@example.com',
    phoneNumber: 'Phone Number',
    phonePlaceholder: '+1 234 567 8900',
    subject: 'Subject',
    subjectPlaceholder: 'Training program inquiry',
    message: 'Message',
    messagePlaceholder: 'Tell us about your training needs...',
    sendMessage: 'Send Message',
    sending: 'Sending...',
    required: '*',
  },
  th: {
    badge: 'ติดต่อเรา',
    title: 'ติดต่อเรา',
    subtitle:
      'มีคำถามเกี่ยวกับโปรแกรมการฝึกอบรมของเรา? เราพร้อมช่วยเหลือ ติดต่อเราและทีมของเราจะตอบกลับภายใน 24 ชั่วโมง',
    email: 'อีเมล',
    emailDesc: 'สำหรับการสอบถามทั่วไป',
    phone: 'โทรศัพท์',
    phoneDesc: 'จันทร์-ศุกร์ 9:00 - 18:00 น. (HKT)',
    whatsapp: 'WhatsApp',
    whatsappDesc: 'แชทกับเราผ่าน WhatsApp',
    line: 'LINE',
    lineDesc: 'เพิ่มเราใน LINE',
    address: 'ที่อยู่',
    addressDesc: 'สำนักงานใหญ่',
    hours: 'เวลาทำการ',
    hoursValue: 'จันทร์ – ศุกร์: 9:00 - 18:00 น. (HKT)\nเสาร์ & อาทิตย์: ปิดทำการ',
    formTitle: 'ส่งข้อความถึงเรา',
    fullName: 'ชื่อ-นามสกุล',
    fullNamePlaceholder: 'นพ. สมชาย ใจดี',
    emailAddress: 'ที่อยู่อีเมล',
    emailPlaceholder: 'somchai@example.com',
    phoneNumber: 'หมายเลขโทรศัพท์',
    phonePlaceholder: '+66 12 345 6789',
    subject: 'หัวข้อ',
    subjectPlaceholder: 'สอบถามเกี่ยวกับโปรแกรมการฝึกอบรม',
    message: 'ข้อความ',
    messagePlaceholder: 'บอกเราเกี่ยวกับความต้องการการฝึกอบรมของคุณ...',
    sendMessage: 'ส่งข้อความ',
    sending: 'กำลังส่ง...',
    required: '*',
  },
  ja: {
    badge: 'お問い合わせ',
    title: 'お問い合わせ',
    subtitle:
      'トレーニングプログラムについてご質問がありますか？私たちがお手伝いします。お問い合わせいただければ、24時間以内にチームが返答いたします。',
    email: 'メール',
    emailDesc: '一般的なお問い合わせ',
    phone: '電話',
    phoneDesc: '月〜金、9:00 AM - 6:00 PM (HKT)',
    whatsapp: 'WhatsApp',
    whatsappDesc: 'WhatsAppでチャット',
    line: 'LINE',
    lineDesc: 'LINEで友だち追加',
    address: '住所',
    addressDesc: '本社',
    hours: '営業時間',
    hoursValue: '月曜〜金曜: 9:00 AM – 6:00 PM (HKT)\n土曜・日曜: 休業',
    formTitle: 'メッセージを送る',
    fullName: '氏名',
    fullNamePlaceholder: '山田 太郎 先生',
    emailAddress: 'メールアドレス',
    emailPlaceholder: 'taro@example.com',
    phoneNumber: '電話番号',
    phonePlaceholder: '+81 90 1234 5678',
    subject: '件名',
    subjectPlaceholder: 'トレーニングプログラムに関するお問い合わせ',
    message: 'メッセージ',
    messagePlaceholder: 'トレーニングのニーズについてお聞かせください...',
    sendMessage: 'メッセージを送信',
    sending: '送信中...',
    required: '*',
  },
};

interface IntlContactPageClientProps {
  locale: string;
}

export function IntlContactPageClient({ locale }: IntlContactPageClientProps) {
  const { language } = useLanguage();
  const t =
    contactTranslations[language as keyof typeof contactTranslations] || contactTranslations.en;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Reset form
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setIsSubmitting(false);

    // Show success message (in real app, use toast)
    alert('Message sent successfully! We will get back to you soon.');
  };

  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Mail className="w-4 h-4 mr-2" />
              {t.badge}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">{t.title}</h1>
            <p className="text-lg text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold mb-1">{t.email}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{t.emailDesc}</p>
                      <a
                        href="mailto:support@vetsphere.net"
                        className="text-primary hover:underline"
                      >
                        support@vetsphere.net
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold mb-1">{t.phone}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{t.phoneDesc}</p>
                      <a href="tel:+8618616223318" className="text-primary hover:underline">
                        +86 18616223318
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold mb-1">{t.whatsapp}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{t.whatsappDesc}</p>
                      <a
                        href="https://wa.me/8618616223318"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline"
                      >
                        +86 18616223318
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold mb-1">{t.line}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{t.lineDesc}</p>
                      <span className="text-green-600 font-medium">@vetsphere</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold mb-1">{t.address}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{t.addressDesc}</p>
                      <p className="text-sm">
                        VetSphere Training Academy
                        <br />
                        Unit B53, 2/F, Kwai Shing Industrial Building Phase 1
                        <br />
                        36-40 Tai Lin Pai Road, Kwai Chung, N.T.
                        <br />
                        Hong Kong SAR
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold mb-1">{t.hours}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {t.hoursValue}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t.formTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          {t.fullName} {t.required}
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t.fullNamePlaceholder}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {t.emailAddress} {t.required}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder={t.emailPlaceholder}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t.phoneNumber}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder={t.phonePlaceholder}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">
                          {t.subject} {t.required}
                        </Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder={t.subjectPlaceholder}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">
                        {t.message} {t.required}
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={t.messagePlaceholder}
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.sending}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {t.sendMessage}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
