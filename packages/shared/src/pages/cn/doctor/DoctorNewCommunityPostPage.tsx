'use client';

import React, { useState } from 'react';
import {
  PenLine, Stethoscope, Award, BookOpen, TrendingUp, Store,
  Upload, Eye, EyeOff, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
type PostType = 'case' | 'mentor' | 'clinical' | 'career' | 'startup';

interface FormData {
  type: PostType;
  title: string;
  direction: string;
  summary: string;
  content: string;
  anonymous: boolean;
  // Case specific
  caseStage?: string;
  mentorRequest?: boolean;
  // Mentor specific
  questionDirection?: string;
  mentorTypePreference?: string;
}

// Post type config
const POST_TYPES: { key: PostType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { key: 'case', label: '病例讨论', description: '分享临床病例，与同行交流诊疗方案', icon: <Stethoscope className="w-5 h-5" />, color: 'rose' },
  { key: 'mentor', label: '导师答疑', description: '向课程导师请教专业问题', icon: <Award className="w-5 h-5" />, color: 'amber' },
  { key: 'clinical', label: '临床经验', description: '分享临床工作中的经验与技巧', icon: <BookOpen className="w-5 h-5" />, color: 'blue' },
  { key: 'career', label: '职业成长', description: '讨论职业规划、晋升、技能提升', icon: <TrendingUp className="w-5 h-5" />, color: 'purple' },
  { key: 'startup', label: '创业交流', description: '分享创业经验、探讨健康管理中心建设', icon: <Store className="w-5 h-5" />, color: 'teal' }
];

const DIRECTIONS = ['外科', '内科', '骨科', '眼科', '皮肤科', '影像学', '急诊', '全科', '其他'];
const CASE_STAGES = ['诊断中', '治疗中', '随访中', '已结案'];
const MENTOR_TYPES = ['外科导师', '内科导师', '骨科导师', '眼科导师', '全科导师'];

export function DoctorNewCommunityPostPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [formData, setFormData] = useState<FormData>({
    type: 'case',
    title: '',
    direction: '',
    summary: '',
    content: '',
    anonymous: false,
    caseStage: '',
    mentorRequest: false,
    questionDirection: '',
    mentorTypePreference: ''
  });

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Form section component
  const FormSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-amber-500">{icon}</div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  // Form field component
  const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="mb-4 last:mb-0">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <a
          href={`/${locale}/doctor/community`}
          className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dw.communityNewTitle || '发布讨论'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dw.communityNewSubtitle || '选择讨论类型，分享你的病例、问题或经验，与同行交流。'}
          </p>
        </div>
      </div>

      {/* Post Type Selector */}
      <FormSection icon={<PenLine className="w-5 h-5" />} title={dw.communityNewType || '讨论类型'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {POST_TYPES.map(type => (
            <button
              key={type.key}
              onClick={() => updateField('type', type.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.type === type.key
                  ? `border-${type.color}-500 bg-${type.color}-50`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                formData.type === type.key ? `bg-${type.color}-100 text-${type.color}-600` : 'bg-slate-100 text-slate-500'
              }`}>
                {type.icon}
              </div>
              <div className="font-medium text-slate-900 text-sm">{type.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{type.description}</div>
            </button>
          ))}
        </div>
      </FormSection>

      {/* Basic Info */}
      <FormSection icon={<BookOpen className="w-5 h-5" />} title={dw.communityNewBasicInfo || '基本信息'}>
        <FormField label={dw.communityNewPostTitle || '标题'} required>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={dw.communityNewPostTitlePlaceholder || '输入讨论标题...'}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </FormField>
        <FormField label={dw.communityNewDirection || '所属方向'} required>
          <select
            value={formData.direction}
            onChange={(e) => updateField('direction', e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
          >
            <option value="">请选择方向</option>
            {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label={dw.communityNewSummary || '摘要（可选）'}>
          <textarea
            value={formData.summary}
            onChange={(e) => updateField('summary', e.target.value)}
            placeholder={dw.communityNewSummaryPlaceholder || '简要描述讨论内容...'}
            rows={2}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </FormField>
      </FormSection>

      {/* Main Content */}
      <FormSection icon={<PenLine className="w-5 h-5" />} title={dw.communityNewContent || '正文内容'}>
        <FormField label={dw.communityNewContent || '正文'} required>
          <textarea
            value={formData.content}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder={dw.communityNewContentPlaceholder || '详细描述你的问题、病例或经验...'}
            rows={8}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </FormField>
        <FormField label={dw.communityNewUpload || '上传图片/报告'}>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-amber-300 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">点击或拖拽上传图片、检查报告等附件</p>
            <p className="text-xs text-slate-400 mt-1">支持 JPG、PNG、PDF，单个文件不超过 10MB</p>
          </div>
        </FormField>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateField('anonymous', !formData.anonymous)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              formData.anonymous ? 'bg-amber-500 border-amber-500' : 'border-slate-300'
            }`}
          >
            {formData.anonymous && <EyeOff className="w-3 h-3 text-white" />}
          </button>
          <span className="text-sm text-slate-600">{dw.communityNewAnonymous || '匿名发布'}</span>
        </div>
      </FormSection>

      {/* Dynamic Fields - Case Discussion */}
      {formData.type === 'case' && (
        <FormSection icon={<Stethoscope className="w-5 h-5" />} title="病例讨论设置">
          <FormField label={dw.communityNewCaseStage || '病例阶段'} required>
            <select
              value={formData.caseStage}
              onChange={(e) => updateField('caseStage', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="">请选择病例阶段</option>
              {CASE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateField('mentorRequest', !formData.mentorRequest)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                formData.mentorRequest ? 'bg-amber-500 border-amber-500' : 'border-slate-300'
              }`}
            >
              {formData.mentorRequest && <Award className="w-3 h-3 text-white" />}
            </button>
            <span className="text-sm text-slate-600">{dw.communityNewMentorRequest || '是否希望导师参与'}</span>
          </div>
        </FormSection>
      )}

      {/* Dynamic Fields - Mentor QA */}
      {formData.type === 'mentor' && (
        <FormSection icon={<Award className="w-5 h-5" />} title="导师答疑设置">
          <FormField label={dw.communityNewQuestionDirection || '问题方向'} required>
            <select
              value={formData.questionDirection}
              onChange={(e) => updateField('questionDirection', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="">请选择问题方向</option>
              {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label={dw.communityNewMentorType || '导师类型偏好'}>
            <select
              value={formData.mentorTypePreference}
              onChange={(e) => updateField('mentorTypePreference', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="">不限导师类型</option>
              {MENTOR_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
        </FormSection>
      )}

      {/* Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 px-6 py-4 flex items-center justify-between">
        <button className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          {dw.communityNewSaveDraft || '保存草稿'}
        </button>
        <button className="px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-2">
          {dw.communityNewSubmit || '发布讨论'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default DoctorNewCommunityPostPage;
