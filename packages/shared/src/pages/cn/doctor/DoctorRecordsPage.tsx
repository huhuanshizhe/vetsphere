'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Search, SlidersHorizontal, Plus, FileText, ClipboardList, Calendar,
  User, PawPrint, Eye, Edit3, CalendarPlus, MessageCircle, Clock,
  AlertCircle, CheckCircle2, ArrowRight, Stethoscope, Heart, Shield, FileCheck,
} from 'lucide-react';

// ─── Types ───
type VisitType = 'first' | 'revisit' | 'postop' | 'health';
type RecordStatus = 'complete' | 'draft' | 'followup';
type RecordSource = 'consult' | 'clinic' | 'followup';

interface MedicalRecord {
  id: string;
  petName: string;
  petEmoji: string;
  ownerName: string;
  chiefComplaint: string;
  date: string;
  visitType: VisitType;
  status: RecordStatus;
  source: RecordSource;
  exam: string;
  diagnosis: string;
  treatment: string;
  followUpDue?: string;
  missingInfo?: string[];
}

// ─── Placeholder Data ───
const RECORDS: MedicalRecord[] = [
  {
    id: '1', petName: '豆豆', petEmoji: '🐕', ownerName: '张明华',
    chiefComplaint: '右后肢跛行两周，活动后加重',
    date: '2026-03-03', visitType: 'postop', status: 'followup', source: 'clinic',
    exam: '右后肢肌肉萎缩，膝关节不稳定，抽屉试验阳性',
    diagnosis: '前十字韧带断裂',
    treatment: 'TPLO手术，术后关节保护支架，限制活动4周',
    followUpDue: '2026-03-10',
  },
  {
    id: '2', petName: '小白', petEmoji: '🐱', ownerName: '李雪',
    chiefComplaint: '背部大面积脱毛伴瘙痒',
    date: '2026-03-02', visitType: 'revisit', status: 'complete', source: 'consult',
    exam: '背部脱毛区域扩大，皮肤发红，伍德灯检查阳性',
    diagnosis: '真菌性皮肤病（猫癣）',
    treatment: '外用抗真菌药膏，口服伊曲康唑，环境消毒',
  },
  {
    id: '3', petName: '旺财', petEmoji: '🐕', ownerName: '王建国',
    chiefComplaint: '季度健康评估',
    date: '2026-03-01', visitType: 'health', status: 'complete', source: 'followup',
    exam: '体重35kg，心肺听诊正常，关节活动度可',
    diagnosis: '老年犬关节轻度退化，整体健康状况良好',
    treatment: '继续关节保健方案，建议每3个月复查',
  },
  {
    id: '4', petName: '毛毛', petEmoji: '🐕', ownerName: '赵雨晴',
    chiefComplaint: '皮肤红疹，局部脱毛',
    date: '2026-02-28', visitType: 'first', status: 'draft', source: 'clinic',
    exam: '腹部及腋下皮肤发红，轻度脱毛',
    diagnosis: '疑似过敏性皮炎',
    treatment: '',
    missingInfo: ['处置方案', '用药建议'],
  },
  {
    id: '5', petName: '小黑', petEmoji: '🐕', ownerName: '孙志强',
    chiefComplaint: '右前肢骨折术后14天复查',
    date: '2026-02-26', visitType: 'postop', status: 'followup', source: 'clinic',
    exam: 'X光显示骨折线愈合良好，内固定位置正常',
    diagnosis: '骨折愈合中，进展正常',
    treatment: '继续限制活动，4周后复查X光',
    followUpDue: '2026-03-12',
  },
  {
    id: '6', petName: '花花', petEmoji: '🐱', ownerName: '孙志强',
    chiefComplaint: '呕吐腹泻三天',
    date: '2026-02-26', visitType: 'first', status: 'draft', source: 'consult',
    exam: '轻度脱水，腹部触诊敏感',
    diagnosis: '',
    treatment: '',
    missingInfo: ['诊断', '处置方案', '用药建议'],
  },
  {
    id: '7', petName: '球球', petEmoji: '🐕', ownerName: '陈美琳',
    chiefComplaint: '首次疫苗接种咨询',
    date: '2026-03-02', visitType: 'first', status: 'complete', source: 'consult',
    exam: '体格检查正常，精神状态良好',
    diagnosis: '幼犬健康，可接种疫苗',
    treatment: '接种犬六联疫苗第一针，3周后复诊接种第二针',
  },
];

const DRAFT_RECORDS = RECORDS.filter(r => r.status === 'draft');
const FOLLOWUP_RECORDS = RECORDS.filter(r => r.status === 'followup');

type FilterTab = 'all' | 'draft' | 'followup' | 'postop' | 'recent';

const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; class: string }> = {
  first: { label: '初诊', class: 'bg-blue-100 text-blue-700' },
  revisit: { label: '复诊', class: 'bg-purple-100 text-purple-700' },
  postop: { label: '术后', class: 'bg-rose-100 text-rose-700' },
  health: { label: '健康评估', class: 'bg-teal-100 text-teal-700' },
};

const STATUS_CONFIG: Record<RecordStatus, { label: string; class: string; icon: React.ReactNode }> = {
  complete: { label: '已完成', class: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  draft: { label: '待完善', class: 'bg-amber-100 text-amber-700', icon: <Edit3 className="w-3 h-3" /> },
  followup: { label: '待随访', class: 'bg-rose-100 text-rose-700', icon: <Clock className="w-3 h-3" /> },
};

const SOURCE_CONFIG: Record<RecordSource, string> = {
  consult: '问诊转入',
  clinic: '到院',
  followup: '随访',
};

// ─── Main Component ───
export function DoctorRecordsPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>('1');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const filteredRecords = useMemo(() => {
    let list = RECORDS;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.petName.includes(q) || r.ownerName.includes(q) || r.chiefComplaint.includes(q)
      );
    }
    if (activeFilter === 'draft') list = list.filter(r => r.status === 'draft');
    else if (activeFilter === 'followup') list = list.filter(r => r.status === 'followup');
    else if (activeFilter === 'postop') list = list.filter(r => r.visitType === 'postop');
    else if (activeFilter === 'recent') list = list.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return list;
  }, [searchQuery, activeFilter]);

  const selectedRecord = RECORDS.find(r => r.id === selectedRecordId) || null;
  const hasRecords = RECORDS.length > 0;

  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: dw.recordsFilterAll || '全部病历', count: RECORDS.length },
    { key: 'draft', label: dw.recordsFilterDraft || '待完善', count: DRAFT_RECORDS.length },
    { key: 'followup', label: dw.recordsFilterFollowUp || '待随访', count: FOLLOWUP_RECORDS.length },
    { key: 'postop', label: dw.recordsFilterPostOp || '术后病例', count: RECORDS.filter(r => r.visitType === 'postop').length },
    { key: 'recent', label: dw.recordsFilterRecent || '最近新增' },
  ];

  const stats = [
    { label: dw.recordsStatTotal || '总病历数', value: String(RECORDS.length), icon: <ClipboardList className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
    { label: dw.recordsStatWeekly || '本周新增病历', value: '3', icon: <FileText className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: dw.recordsStatDraft || '待完善病历', value: String(DRAFT_RECORDS.length), icon: <Edit3 className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
    { label: dw.recordsStatFollowUp || '待随访病历', value: String(FOLLOWUP_RECORDS.length), icon: <Clock className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50' },
    { label: dw.recordsStatPostOp || '术后管理病例', value: String(RECORDS.filter(r => r.visitType === 'postop').length), icon: <Heart className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
  ];

  const handleSelectRecord = (id: string) => {
    setSelectedRecordId(id);
    setShowMobileDetail(true);
  };

  return (
    <div className="space-y-5">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{dw.recordsTitle || '电子病历'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-lg">{dw.recordsSubtitle || '记录每一次诊疗过程，沉淀你的专业经验，也为后续随访与长期健康管理提供基础。'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <MessageCircle className="w-4 h-4" />
            {dw.recordsFromConsult || '从问诊转病历'}
          </button>
          <Link
            href={`/${locale}/doctor/records/new`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {dw.recordsNew || '新建病历'}
          </Link>
        </div>
      </div>

      {/* ── 2. Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => {
          const [tc, bg] = s.color.split(' ');
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg} ${tc}`}>{s.icon}</span>
                <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── 3. Draft + Follow-up Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Draft Records */}
        {DRAFT_RECORDS.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              {dw.recordsDraftTitle || '待完善病历'}
            </h3>
            <div className="space-y-2">
              {DRAFT_RECORDS.slice(0, 3).map((r) => (
                <div key={r.id} className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{r.petEmoji} {r.petName}</span>
                    <span className="text-[10px] text-slate-500">{r.date}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{r.ownerName} · {r.chiefComplaint.slice(0, 20)}...</p>
                  {r.missingInfo && (
                    <p className="text-[10px] text-amber-600 mb-2">
                      {dw.recordsDraftMissing || '缺少信息'}: {r.missingInfo.join('、')}
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <button className="flex-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md py-1.5 transition-colors">
                      {dw.recordsDraftContinue || '继续完善'}
                    </button>
                    <button className="flex-1 text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md py-1.5 transition-colors">
                      {dw.recordsDraftMarkDone || '标记已完成'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Records */}
        {FOLLOWUP_RECORDS.length > 0 && (
          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {dw.recordsFollowUpTitle || '待随访病例'}
            </h3>
            <div className="space-y-2">
              {FOLLOWUP_RECORDS.slice(0, 3).map((r) => (
                <div key={r.id} className="bg-white rounded-lg p-3 border border-rose-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{r.petEmoji} {r.petName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${VISIT_TYPE_CONFIG[r.visitType].class}`}>
                      {VISIT_TYPE_CONFIG[r.visitType].label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{r.ownerName} · {r.diagnosis}</p>
                  {r.followUpDue && (
                    <p className="text-[10px] text-rose-600 mb-2">
                      {dw.recordsFollowUpDue || '随访时间'}: {r.followUpDue}
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <button className="flex-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md py-1.5 transition-colors">
                      {dw.recordsFollowUpNow || '立即随访'}
                    </button>
                    <button className="flex-1 text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md py-1.5 transition-colors">
                      {dw.recordsFollowUpMarkDone || '标记完成'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!hasRecords ? (
        /* ── Empty State ── */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{dw.recordsEmptyTitle || '你还没有病历记录'}</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">{dw.recordsEmptyDesc || '创建第一份电子病历，开始沉淀你的临床经验，建立结构化的诊疗档案。'}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href={`/${locale}/doctor/records/new`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-4 h-4" />{dw.recordsNew || '新建病历'}
            </Link>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <MessageCircle className="w-4 h-4" />{dw.recordsFromConsult || '从问诊转病历'}
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              {dw.recordsEmptyLearn || '了解病历功能'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Main Records Area ── */
        <>
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dw.recordsSearch || '搜索宠物名、宠主名或主诉关键词...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              {dw.recordsFilter || '筛选'}
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1 py-0.5 rounded-full ${activeFilter === tab.key ? 'bg-white/20' : 'bg-slate-200'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop: List + Preview | Mobile: List only */}
          <div className="flex gap-5">
            {/* Records List */}
            <div className={`flex-1 min-w-0 space-y-2 ${showMobileDetail ? 'hidden lg:block' : ''}`}>
              {filteredRecords.map((record) => {
                const vt = VISIT_TYPE_CONFIG[record.visitType];
                const st = STATUS_CONFIG[record.status];
                const isSelected = selectedRecordId === record.id;
                return (
                  <div
                    key={record.id}
                    onClick={() => handleSelectRecord(record.id)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                      isSelected ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{record.petEmoji}</span>
                          <span className="text-sm font-bold text-slate-900">{record.petName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${vt.class}`}>{vt.label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${st.class}`}>
                            {st.icon}{st.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1 line-clamp-1">{record.chiefComplaint}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{record.ownerName}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{record.date}</span>
                          <span className="text-slate-400">{SOURCE_CONFIG[record.source]}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors" title={dw.recordsActionView || '查看'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors" title={dw.recordsActionEdit || '编辑'}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition-colors" title={dw.recordsActionFollowUp || '添加随访'}>
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRecords.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-400">没有找到匹配的病历</div>
              )}
            </div>

            {/* Right Preview Panel - Desktop */}
            {selectedRecord && (
              <div className={`w-full lg:w-[400px] shrink-0 ${showMobileDetail ? 'block' : 'hidden lg:block'}`}>
                <div className="bg-white rounded-xl border border-slate-200 sticky top-4">
                  {/* Mobile back button */}
                  <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-100">
                    <button onClick={() => setShowMobileDetail(false)} className="text-sm text-amber-600 font-medium flex items-center gap-1">
                      ← 返回列表
                    </button>
                    <span className="text-xs text-slate-400">{dw.recordsPreviewTitle || '病历详情'}</span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Basic Info */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{selectedRecord.petEmoji}</span>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{selectedRecord.petName}</h3>
                            <p className="text-xs text-slate-500">{selectedRecord.ownerName}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${STATUS_CONFIG[selectedRecord.status].class}`}>
                          {STATUS_CONFIG[selectedRecord.status].icon}
                          {STATUS_CONFIG[selectedRecord.status].label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full ${VISIT_TYPE_CONFIG[selectedRecord.visitType].class}`}>
                          {VISIT_TYPE_CONFIG[selectedRecord.visitType].label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{SOURCE_CONFIG[selectedRecord.source]}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{selectedRecord.date}</span>
                      </div>
                    </div>

                    {/* Record Summary */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">{dw.recordsPreviewSummary || '病历摘要'}</h4>
                      <div className="space-y-2.5">
                        <div className="p-3 rounded-lg bg-slate-50/80">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">{dw.recordsPreviewComplaint || '主诉'}</p>
                          <p className="text-xs text-slate-700">{selectedRecord.chiefComplaint}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50/80">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">{dw.recordsPreviewExam || '检查'}</p>
                          <p className="text-xs text-slate-700">{selectedRecord.exam || '—'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50/80">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">{dw.recordsPreviewDiagnosis || '判断'}</p>
                          <p className="text-xs text-slate-700">{selectedRecord.diagnosis || '—'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50/80">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">{dw.recordsPreviewTreatment || '处置'}</p>
                          <p className="text-xs text-slate-700">{selectedRecord.treatment || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Follow-up Status */}
                    {selectedRecord.followUpDue && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-rose-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {dw.recordsPreviewFollowUpStatus || '随访状态'}
                          </span>
                          <span className="text-xs font-bold text-rose-600">{selectedRecord.followUpDue}</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />{dw.recordsPreviewEditRecord || '编辑病历'}
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                        <CalendarPlus className="w-3.5 h-3.5" />{dw.recordsPreviewAddFollowUp || '添加随访'}
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />{dw.recordsPreviewStartRevisit || '发起复诊问诊'}
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5" />{dw.recordsPreviewFullRecord || '查看完整病历'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DoctorRecordsPage;
