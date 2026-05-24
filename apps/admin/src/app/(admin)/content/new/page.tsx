'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, ToastContainer, useToast } from '@/components/ui';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { CONTENT_ADMIN_SITE_CODE } from '@/lib/content-admin';

const CONTENT_TYPE_OPTIONS = [
  { value: 'specialty_hub', label: '专科中心' },
  { value: 'procedure', label: '术式页面' },
  { value: 'case', label: '病例库' },
  { value: 'solution', label: '解决方案' },
  { value: 'faq_hub', label: 'FAQ 专题' },
  { value: 'glossary_term', label: '术语词条' },
  { value: 'compare_page', label: '对比页' },
  { value: 'resource', label: '资源页' },
  { value: 'news', label: '新闻页' },
];

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'th', label: 'Thai' },
  { value: 'zh', label: 'Chinese' },
];

export default function NewContentPage() {
  const router = useRouter();
  const siteCode = CONTENT_ADMIN_SITE_CODE;
  const { toasts, removeToast, success, error } = useToast();

  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('specialty_hub');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [primarySpecialty, setPrimarySpecialty] = useState('');
  const [targetAudience, setTargetAudience] = useState('Veterinary professionals');
  const [searchIntent, setSearchIntent] = useState('commercial investigation');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      error('请先填写标题');
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch<{ id: string }>('/api/v1/admin/content', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          contentType,
          sourceLanguage,
          primarySpecialty: primarySpecialty || null,
          targetAudience,
          searchIntent,
          siteCode,
          localizations: [
            {
              locale: sourceLanguage,
              title: title.trim(),
              summary: '',
              body_markdown: '',
              body_json: {},
              references_json: [],
              faq_json: [],
            },
          ],
          siteViews: [
            {
              site_code: siteCode,
              publish_status: 'draft',
              route_status: 'active',
              is_featured: false,
              display_order: 0,
            },
          ],
        }),
      });

      success('内容草稿已创建');
      router.push(`/content/${data.id}`);
    } catch (submitError) {
      error(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">新建国际站内容</h1>
        <p className="mt-1 text-sm text-slate-500">
          先创建治理对象，再进入编辑页补全 SEO、证据、结构化内容和站点视图。
        </p>
      </div>

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            label="内容标题"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：Small Animal Endoscopy Training Hub"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="内容类型"
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              options={CONTENT_TYPE_OPTIONS}
            />
            <Select
              label="源语言"
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              options={LOCALE_OPTIONS}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="主专科"
              value={primarySpecialty}
              onChange={(event) => setPrimarySpecialty(event.target.value)}
              placeholder="Small Animal Surgery"
            />
            <Input
              label="目标受众"
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder="Veterinary specialists"
            />
          </div>

          <Input
            label="搜索意图"
            value={searchIntent}
            onChange={(event) => setSearchIntent(event.target.value)}
            placeholder="commercial investigation / training evaluation"
          />

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push('/content')}>
              取消
            </Button>
            <Button type="submit" loading={saving}>
              创建并进入编辑
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
