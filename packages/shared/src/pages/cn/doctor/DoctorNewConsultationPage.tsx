'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import {
  ArrowLeft, User, PawPrint, MessageCircle, FileText, ChevronDown, Play, Save,
} from 'lucide-react';

// ─── Placeholder Data ───
const OWNERS = [
  { id: '1', name: '张明华', phone: '138****6721' },
  { id: '2', name: '李雪', phone: '139****3348' },
  { id: '3', name: '王建国', phone: '137****9150' },
  { id: '4', name: '赵雨晴', phone: '136****4482' },
  { id: '5', name: '孙志强', phone: '135****7723' },
];

const PETS_BY_OWNER: Record<string, Array<{ id: string; name: string; species: string; breed: string }>> = {
  '1': [
    { id: 'p1', name: '豆豆', species: '犬', breed: '金毛寻回犬' },
    { id: 'p2', name: '小橘', species: '猫', breed: '橘猫' },
  ],
  '2': [
    { id: 'p3', name: '小白', species: '猫', breed: '英国短毛猫' },
    { id: 'p4', name: '芒果', species: '猫', breed: '布偶猫' },
    { id: 'p5', name: '旺旺', species: '犬', breed: '柴犬' },
  ],
  '3': [{ id: 'p6', name: '旺财', species: '犬', breed: '拉布拉多' }],
  '4': [{ id: 'p7', name: '毛毛', species: '犬', breed: '泰迪' }],
  '5': [
    { id: 'p8', name: '小黑', species: '犬', breed: '德国牧羊犬' },
    { id: 'p9', name: '花花', species: '猫', breed: '三花猫' },
  ],
};

const RECORDS_BY_PET: Record<string, Array<{ id: string; date: string; diagnosis: string }>> = {
  'p1': [
    { id: 'r1', date: '2026-03-03', diagnosis: '前十字韧带断裂 - TPLO术后' },
    { id: 'r2', date: '2026-02-20', diagnosis: '关节保健方案制定' },
  ],
  'p3': [
    { id: 'r3', date: '2026-03-02', diagnosis: '真菌性皮肤病（猫癣）' },
  ],
  'p6': [
    { id: 'r4', date: '2026-03-01', diagnosis: '季度关节健康评估' },
  ],
  'p7': [
    { id: 'r5', date: '2026-02-28', diagnosis: '过敏性皮炎' },
  ],
};

const CONSULT_TYPES = [
  { value: 'first', label: '初次咨询', desc: '首次咨询某个问题或症状' },
  { value: 'revisit', label: '复诊跟进', desc: '之前诊疗后的跟进沟通' },
  { value: 'postop', label: '术后观察', desc: '手术后的恢复观察与指导' },
  { value: 'longterm', label: '长期健康管理', desc: '慢性病或老年宠物的长期管理' },
];

// ─── Form Section Component ───
function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Form Field Component ───
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main Component ───
export function DoctorNewConsultationPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [consultType, setConsultType] = useState('first');
  const [linkRecord, setLinkRecord] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState('');

  const availablePets = selectedOwnerId ? PETS_BY_OWNER[selectedOwnerId] || [] : [];
  const availableRecords = selectedPetId ? RECORDS_BY_PET[selectedPetId] || [] : [];

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all';
  const textareaClass = `${inputClass} resize-none`;
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/doctor/consultations`}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{dw.consultNewTitle || '发起问诊'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{dw.consultNewSubtitle || '选择客户并开始问诊，为后续服务与病历记录做准备。'}</p>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-5">
        {/* 1. Select Client */}
        <FormSection title={dw.consultNewSelectOwner || '选择客户'} icon={<User className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={dw.consultNewSelectOwner || '选择宠主'} required>
              <div className="relative">
                <select
                  value={selectedOwnerId}
                  onChange={(e) => { setSelectedOwnerId(e.target.value); setSelectedPetId(''); setSelectedRecordId(''); }}
                  className={selectClass}
                >
                  <option value="">请选择宠主</option>
                  {OWNERS.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.phone})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </FormField>

            <FormField label={dw.consultNewSelectPet || '选择宠物'} required>
              <div className="relative">
                <select
                  value={selectedPetId}
                  onChange={(e) => { setSelectedPetId(e.target.value); setSelectedRecordId(''); }}
                  className={selectClass}
                  disabled={!selectedOwnerId}
                >
                  <option value="">{selectedOwnerId ? '请选择宠物' : '请先选择宠主'}</option>
                  {availablePets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.breed})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </FormField>
          </div>
        </FormSection>

        {/* 2. Consult Type */}
        <FormSection title={dw.consultNewSelectType || '问诊类型'} icon={<MessageCircle className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONSULT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  consultType === type.value
                    ? 'border-amber-400 bg-amber-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="consultType"
                  value={type.value}
                  checked={consultType === type.value}
                  onChange={(e) => setConsultType(e.target.value)}
                  className="mt-0.5 w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">{type.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </FormSection>

        {/* 3. Description */}
        <FormSection title={dw.consultNewDescription || '初始说明'} icon={<FileText className="w-4 h-4" />}>
          <FormField label={dw.consultNewDescription || '问题/沟通目标'} required>
            <textarea
              rows={4}
              placeholder={dw.consultNewDescPlaceholder || '描述本次问诊的主要问题或目标...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.consultNewDoctorNote || '医生备注（可选）'}>
            <textarea
              rows={2}
              placeholder={dw.consultNewNotePlaceholder || '仅医生可见的备注信息...'}
              className={textareaClass}
            />
          </FormField>
        </FormSection>

        {/* 4. Link Record (Optional) */}
        <FormSection title={dw.consultNewLinkRecord || '关联现有病历（可选）'} icon={<PawPrint className="w-4 h-4" />}>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={linkRecord}
                onChange={(e) => { setLinkRecord(e.target.checked); if (!e.target.checked) setSelectedRecordId(''); }}
                className="w-4 h-4 text-amber-500 focus:ring-amber-500 rounded"
              />
              <span className="text-sm text-slate-700">关联已有病历</span>
            </label>
          </div>

          {linkRecord && (
            <FormField label={dw.consultNewSelectRecord || '选择病历'}>
              <div className="relative">
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className={selectClass}
                  disabled={availableRecords.length === 0}
                >
                  <option value="">{availableRecords.length > 0 ? '请选择病历' : '该宠物暂无病历记录'}</option>
                  {availableRecords.map((r) => (
                    <option key={r.id} value={r.id}>{r.date} - {r.diagnosis}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </FormField>
          )}
        </FormSection>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sticky bottom-4 shadow-lg shadow-slate-900/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">问诊开始后，宠主将收到通知</p>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Save className="w-4 h-4" />
              {dw.consultNewSaveDraft || '保存草稿'}
            </button>
            <button className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
              <Play className="w-4 h-4" />
              {dw.consultNewStart || '开始问诊'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorNewConsultationPage;
