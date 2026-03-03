'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import {
  ArrowLeft, User, PawPrint, Calendar, Stethoscope, FileText,
  Upload, Save, CheckCircle, CalendarPlus, ChevronDown,
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

const VISIT_TYPES = [
  { value: 'first', label: '初诊' },
  { value: 'revisit', label: '复诊' },
  { value: 'postop', label: '术后' },
  { value: 'health', label: '健康评估' },
];

const SOURCES = [
  { value: 'clinic', label: '到院' },
  { value: 'consult', label: '问诊转入' },
  { value: 'followup', label: '随访' },
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
export function DoctorNewRecordPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitType, setVisitType] = useState('first');
  const [source, setSource] = useState('clinic');
  const [needFollowUp, setNeedFollowUp] = useState(false);

  const availablePets = selectedOwnerId ? PETS_BY_OWNER[selectedOwnerId] || [] : [];

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all';
  const textareaClass = `${inputClass} resize-none`;
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/doctor/records`}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{dw.recordsNewTitle || '新建病历'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{dw.recordsNewSubtitle || '记录本次诊疗过程，为后续随访与健康管理提供依据。'}</p>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-5">
        {/* 1. Basic Info */}
        <FormSection title={dw.recordsFormBasicInfo || '基础信息'} icon={<User className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={dw.recordsFormOwner || '宠主'} required>
              <div className="relative">
                <select
                  value={selectedOwnerId}
                  onChange={(e) => { setSelectedOwnerId(e.target.value); setSelectedPetId(''); }}
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

            <FormField label={dw.recordsFormPet || '宠物'} required>
              <div className="relative">
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
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

            <FormField label={dw.recordsFormDate || '就诊日期'} required>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className={inputClass}
              />
            </FormField>

            <FormField label={dw.recordsFormVisitType || '就诊类型'} required>
              <div className="relative">
                <select value={visitType} onChange={(e) => setVisitType(e.target.value)} className={selectClass}>
                  {VISIT_TYPES.map((vt) => (
                    <option key={vt.value} value={vt.value}>{vt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </FormField>

            <FormField label={dw.recordsFormSource || '来源'}>
              <div className="relative">
                <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </FormField>
          </div>
        </FormSection>

        {/* 2. Complaint & Exam */}
        <FormSection title={dw.recordsFormComplaintExam || '主诉与检查'} icon={<Stethoscope className="w-4 h-4" />}>
          <FormField label={dw.recordsFormComplaint || '主诉'} required>
            <textarea
              rows={3}
              placeholder={dw.recordsFormComplaintPlaceholder || '描述宠物就诊原因、宠主主诉内容...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.recordsFormSymptoms || '当前表现 / 症状'}>
            <textarea
              rows={3}
              placeholder={dw.recordsFormSymptomsPlaceholder || '描述宠物当前症状、体征表现...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.recordsFormExamResult || '初步检查结果'}>
            <textarea
              rows={3}
              placeholder={dw.recordsFormExamPlaceholder || '记录体格检查、影像检查等结果...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.recordsFormUpload || '上传检查报告/影像'}>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 hover:bg-slate-50/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">点击或拖拽文件上传</p>
              <p className="text-[10px] text-slate-400 mt-1">支持 JPG, PNG, PDF 格式</p>
            </div>
          </FormField>
        </FormSection>

        {/* 3. Diagnosis & Treatment */}
        <FormSection title={dw.recordsFormDiagnosisTreatment || '判断与处置'} icon={<FileText className="w-4 h-4" />}>
          <FormField label={dw.recordsFormDiagnosis || '初步判断 / 诊断'}>
            <textarea
              rows={2}
              placeholder={dw.recordsFormDiagnosisPlaceholder || '记录初步诊断结论...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.recordsFormTreatment || '处置方案'}>
            <textarea
              rows={3}
              placeholder={dw.recordsFormTreatmentPlaceholder || '记录本次处置方案、操作内容...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.recordsFormMedication || '用药建议'}>
            <textarea
              rows={2}
              placeholder={dw.recordsFormMedicationPlaceholder || '记录用药方案...'}
              className={textareaClass}
            />
          </FormField>

          <FormField label={dw.recordsFormRevisitAdvice || '到院/复诊建议'}>
            <textarea
              rows={2}
              placeholder={dw.recordsFormRevisitPlaceholder || '记录复诊建议、注意事项...'}
              className={textareaClass}
            />
          </FormField>
        </FormSection>

        {/* 4. Follow-up Plan */}
        <FormSection title={dw.recordsFormFollowUpPlan || '随访计划'} icon={<CalendarPlus className="w-4 h-4" />}>
          <FormField label={dw.recordsFormNeedFollowUp || '是否需要随访'}>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="needFollowUp"
                  checked={needFollowUp}
                  onChange={() => setNeedFollowUp(true)}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-700">是</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="needFollowUp"
                  checked={!needFollowUp}
                  onChange={() => setNeedFollowUp(false)}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-700">否</span>
              </label>
            </div>
          </FormField>

          {needFollowUp && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={dw.recordsFormFollowUpDate || '随访日期'}>
                  <input type="date" className={inputClass} />
                </FormField>
              </div>

              <FormField label={dw.recordsFormFollowUpGoal || '随访目标'}>
                <textarea
                  rows={2}
                  placeholder={dw.recordsFormFollowUpGoalPlaceholder || '描述随访目标...'}
                  className={textareaClass}
                />
              </FormField>

              <FormField label={dw.recordsFormFollowUpNote || '随访备注'}>
                <textarea
                  rows={2}
                  placeholder={dw.recordsFormFollowUpNotePlaceholder || '其他备注信息...'}
                  className={textareaClass}
                />
              </FormField>
            </>
          )}
        </FormSection>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sticky bottom-4 shadow-lg shadow-slate-900/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">所有信息将自动保存到客户档案中</p>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Save className="w-4 h-4" />
              {dw.recordsFormSaveDraft || '保存草稿'}
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
              <CheckCircle className="w-4 h-4" />
              {dw.recordsFormSaveComplete || '保存并完成'}
            </button>
            {needFollowUp && (
              <button className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
                <CalendarPlus className="w-4 h-4" />
                {dw.recordsFormSaveFollowUp || '保存并发起随访'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorNewRecordPage;
