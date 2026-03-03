'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Search, SlidersHorizontal, MessageCircle, Clock, CheckCircle2, ArrowRight,
  User, PawPrint, Calendar, Phone, FileText, ClipboardList, CalendarPlus,
  Send, AlertCircle, Eye, Plus, ChevronRight, MessageSquare, Stethoscope,
  Heart, Shield, Image as ImageIcon, Sparkles,
} from 'lucide-react';
import { AIConsultationAssistant } from '../../../components/cn/doctor/AIConsultationAssistant';

// ─── Types ───
type ConsultType = 'first' | 'revisit' | 'postop' | 'longterm';
type ConsultStatus = 'pending' | 'active' | 'completed' | 'torecord';

interface Message {
  id: string;
  sender: 'owner' | 'doctor' | 'system';
  content: string;
  time: string;
  type?: 'text' | 'image' | 'system';
}

interface Consultation {
  id: string;
  ownerName: string;
  ownerPhone: string;
  petName: string;
  petEmoji: string;
  petBreed: string;
  petAge: string;
  lastMessage: string;
  consultType: ConsultType;
  status: ConsultStatus;
  time: string;
  priority?: 'urgent' | 'high';
  priorityReason?: string;
  waitingTime?: string;
  messages: Message[];
  recentRecords: Array<{ date: string; diagnosis: string }>;
}

// ─── Placeholder Data ───
const CONSULTATIONS: Consultation[] = [
  {
    id: '1',
    ownerName: '张明华', ownerPhone: '138****6721',
    petName: '豆豆', petEmoji: '🐕', petBreed: '金毛寻回犬', petAge: '3岁',
    lastMessage: '医生您好，豆豆术后第7天，伤口恢复情况怎么样？',
    consultType: 'postop', status: 'pending', time: '10:32',
    priority: 'urgent', priorityReason: '术后复查', waitingTime: '2小时',
    messages: [
      { id: 'm1', sender: 'owner', content: '医生您好，豆豆做完前十字韧带手术已经7天了', time: '10:30', type: 'text' },
      { id: 'm2', sender: 'owner', content: '伤口看起来有点红，是正常的吗？', time: '10:31', type: 'text' },
      { id: 'm3', sender: 'owner', content: '医生您好，豆豆术后第7天，伤口恢复情况怎么样？', time: '10:32', type: 'text' },
    ],
    recentRecords: [
      { date: '2026-03-03', diagnosis: '前十字韧带断裂 - TPLO术后' },
    ],
  },
  {
    id: '2',
    ownerName: '李雪', ownerPhone: '139****3348',
    petName: '小白', petEmoji: '🐱', petBreed: '英国短毛猫', petAge: '4岁',
    lastMessage: '好的医生，我会继续给它用药，有问题再联系您',
    consultType: 'revisit', status: 'active', time: '09:45',
    messages: [
      { id: 'm1', sender: 'owner', content: '医生，小白的皮肤病好多了', time: '09:40', type: 'text' },
      { id: 'm2', sender: 'doctor', content: '很好，继续用药一周，注意环境消毒', time: '09:43', type: 'text' },
      { id: 'm3', sender: 'owner', content: '好的医生，我会继续给它用药，有问题再联系您', time: '09:45', type: 'text' },
    ],
    recentRecords: [
      { date: '2026-03-02', diagnosis: '真菌性皮肤病（猫癣）' },
      { date: '2026-02-25', diagnosis: '皮肤真菌感染复查' },
    ],
  },
  {
    id: '3',
    ownerName: '赵雨晴', ownerPhone: '136****4482',
    petName: '毛毛', petEmoji: '🐕', petBreed: '泰迪', petAge: '2岁',
    lastMessage: '医生，毛毛最近总是挠耳朵，需要来看看吗？',
    consultType: 'first', status: 'pending', time: '昨天',
    priority: 'high', priorityReason: '新症状咨询', waitingTime: '18小时',
    messages: [
      { id: 'm1', sender: 'owner', content: '医生您好，我想咨询一下毛毛的情况', time: '昨天 16:20', type: 'text' },
      { id: 'm2', sender: 'owner', content: '医生，毛毛最近总是挠耳朵，需要来看看吗？', time: '昨天 16:22', type: 'text' },
    ],
    recentRecords: [
      { date: '2026-02-28', diagnosis: '过敏性皮炎' },
    ],
  },
  {
    id: '4',
    ownerName: '王建国', ownerPhone: '137****9150',
    petName: '旺财', petEmoji: '🐕', petBreed: '拉布拉多', petAge: '7岁',
    lastMessage: '收到，下周一我带它来复查',
    consultType: 'longterm', status: 'completed', time: '前天',
    messages: [
      { id: 'm1', sender: 'doctor', content: '王先生您好，旺财的关节保健方案执行得怎么样？', time: '前天 14:00', type: 'text' },
      { id: 'm2', sender: 'owner', content: '挺好的，它现在走路比之前轻松多了', time: '前天 14:15', type: 'text' },
      { id: 'm3', sender: 'doctor', content: '很好，建议下周来做一次关节活动度评估', time: '前天 14:20', type: 'text' },
      { id: 'm4', sender: 'owner', content: '收到，下周一我带它来复查', time: '前天 14:22', type: 'text' },
      { id: 'm5', sender: 'system', content: '问诊已结束', time: '前天 14:25', type: 'system' },
    ],
    recentRecords: [
      { date: '2026-03-01', diagnosis: '季度关节健康评估' },
    ],
  },
  {
    id: '5',
    ownerName: '孙志强', ownerPhone: '135****7723',
    petName: '花花', petEmoji: '🐱', petBreed: '三花猫', petAge: '3岁',
    lastMessage: '医生，它现在已经不吐了，可以帮我整理一下病历吗？',
    consultType: 'first', status: 'torecord', time: '前天',
    messages: [
      { id: 'm1', sender: 'owner', content: '医生，花花之前呕吐的问题已经好了', time: '前天 10:00', type: 'text' },
      { id: 'm2', sender: 'doctor', content: '好的，那就是急性胃肠炎，现在恢复正常了', time: '前天 10:05', type: 'text' },
      { id: 'm3', sender: 'owner', content: '医生，它现在已经不吐了，可以帮我整理一下病历吗？', time: '前天 10:08', type: 'text' },
    ],
    recentRecords: [],
  },
];

const PRIORITY_CONSULTATIONS = CONSULTATIONS.filter(c => c.priority);
const TO_RECORD_CONSULTATIONS = CONSULTATIONS.filter(c => c.status === 'torecord');

type FilterTab = 'all' | 'pending' | 'active' | 'completed' | 'torecord';

const CONSULT_TYPE_CONFIG: Record<ConsultType, { label: string; class: string }> = {
  first: { label: '初次咨询', class: 'bg-blue-100 text-blue-700' },
  revisit: { label: '复诊跟进', class: 'bg-purple-100 text-purple-700' },
  postop: { label: '术后观察', class: 'bg-rose-100 text-rose-700' },
  longterm: { label: '长期健康管理', class: 'bg-teal-100 text-teal-700' },
};

const STATUS_CONFIG: Record<ConsultStatus, { label: string; class: string; icon: React.ReactNode }> = {
  pending: { label: '待回复', class: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  active: { label: '进行中', class: 'bg-blue-100 text-blue-700', icon: <MessageSquare className="w-3 h-3" /> },
  completed: { label: '已结束', class: 'bg-slate-100 text-slate-600', icon: <CheckCircle2 className="w-3 h-3" /> },
  torecord: { label: '待转病历', class: 'bg-emerald-100 text-emerald-700', icon: <FileText className="w-3 h-3" /> },
};

// ─── Main Component ───
export function DoctorConsultationsPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedConsultId, setSelectedConsultId] = useState<string | null>('1');
  const [inputMessage, setInputMessage] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'conversation' | 'info'>('list');
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const filteredConsults = useMemo(() => {
    let list = CONSULTATIONS;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.ownerName.includes(q) || c.petName.includes(q) || c.lastMessage.includes(q)
      );
    }
    if (activeFilter !== 'all') {
      list = list.filter(c => c.status === activeFilter);
    }
    return list;
  }, [searchQuery, activeFilter]);

  const selectedConsult = CONSULTATIONS.find(c => c.id === selectedConsultId) || null;
  const hasConsults = CONSULTATIONS.length > 0;

  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: dw.consultFilterAll || '全部', count: CONSULTATIONS.length },
    { key: 'pending', label: dw.consultFilterPending || '待回复', count: CONSULTATIONS.filter(c => c.status === 'pending').length },
    { key: 'active', label: dw.consultFilterActive || '进行中', count: CONSULTATIONS.filter(c => c.status === 'active').length },
    { key: 'completed', label: dw.consultFilterCompleted || '已结束', count: CONSULTATIONS.filter(c => c.status === 'completed').length },
    { key: 'torecord', label: dw.consultFilterToRecord || '待转病历', count: TO_RECORD_CONSULTATIONS.length },
  ];

  const stats = [
    { label: dw.consultStatPending || '待回复问诊', value: String(CONSULTATIONS.filter(c => c.status === 'pending').length), icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
    { label: dw.consultStatActive || '进行中问诊', value: String(CONSULTATIONS.filter(c => c.status === 'active').length), icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
    { label: dw.consultStatToday || '今日新问诊', value: '2', icon: <Plus className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: dw.consultStatToRecord || '待转病历问诊', value: String(TO_RECORD_CONSULTATIONS.length), icon: <FileText className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
  ];

  const handleSelectConsult = (id: string) => {
    setSelectedConsultId(id);
    setMobileView('conversation');
  };

  // AI Assistant context
  const aiContext = selectedConsult ? {
    petName: selectedConsult.petName,
    petBreed: selectedConsult.petBreed,
    petAge: selectedConsult.petAge,
    ownerName: selectedConsult.ownerName,
    consultType: CONSULT_TYPE_CONFIG[selectedConsult.consultType].label,
    messages: selectedConsult.messages,
    recentRecords: selectedConsult.recentRecords,
  } : null;

  // Handle AI applying reply
  const handleApplyReply = (reply: string) => {
    setInputMessage(reply);
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{dw.consultTitle || '在线问诊'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-lg">{dw.consultSubtitle || '统一管理宠主咨询、图文问诊与持续跟进，让每一次沟通都能沉淀为更长期的服务关系。'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <Eye className="w-4 h-4" />
            {dw.consultViewHistory || '查看历史问诊'}
          </button>
          <Link
            href={`/${locale}/doctor/consultations/new`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {dw.consultNewConsult || '发起问诊'}
          </Link>
        </div>
      </div>

      {/* ── 2. Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const [tc, bg] = s.color.split(' ');
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${bg} ${tc}`}>{s.icon}</span>
                <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── 3. Priority + To-Record Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {PRIORITY_CONSULTATIONS.length > 0 && (
          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3">
            <h3 className="text-sm font-bold text-rose-800 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {dw.consultPriorityTitle || '优先处理'}
            </h3>
            <div className="space-y-2">
              {PRIORITY_CONSULTATIONS.slice(0, 3).map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-2.5 border border-rose-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{c.petEmoji}</span>
                      <span className="text-sm font-medium text-slate-800">{c.petName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                        {c.priority === 'urgent' ? '紧急' : '高优先'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.ownerName} · {c.priorityReason} · 等待 {c.waitingTime}</p>
                  </div>
                  <button
                    onClick={() => handleSelectConsult(c.id)}
                    className="text-[11px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md px-2.5 py-1.5 shrink-0"
                  >
                    {dw.consultPriorityHandle || '立即处理'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {TO_RECORD_CONSULTATIONS.length > 0 && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
            <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {dw.consultToRecordTitle || '待转病历问诊'}
            </h3>
            <div className="space-y-2">
              {TO_RECORD_CONSULTATIONS.slice(0, 3).map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-2.5 border border-emerald-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{c.petEmoji}</span>
                      <span className="text-sm font-medium text-slate-800">{c.petName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.ownerName} · {c.lastMessage.slice(0, 20)}...</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button className="text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md px-2 py-1.5">
                      {dw.consultToRecordAction || '一键转病历'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!hasConsults ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">{dw.consultEmpty || '暂无咨询记录'}</h3>
          <p className="text-sm text-slate-500">{dw.consultEmptyDesc || '当有客户发起在线咨询时，将在这里显示。'}</p>
        </div>
      ) : (
        <>
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dw.consultSearch || '搜索宠主、宠物或问诊内容...'}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeFilter === tab.key ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

          {/* ── 3-Column Workspace ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 480px)', minHeight: '400px' }}>
            <div className="flex h-full">
              {/* Left: Consultation List */}
              <div className={`w-full sm:w-72 lg:w-80 border-r border-slate-200 flex flex-col shrink-0 ${mobileView !== 'list' ? 'hidden sm:flex' : ''}`}>
                <div className="flex-1 overflow-y-auto">
                  {filteredConsults.map((c) => {
                    const isSelected = selectedConsultId === c.id;
                    const st = STATUS_CONFIG[c.status];
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectConsult(c.id)}
                        className={`p-3 border-b border-slate-100 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base">{c.petEmoji}</span>
                            <span className="text-sm font-medium text-slate-800 truncate">{c.petName}</span>
                            {c.priority && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${c.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {c.priority === 'urgent' ? '急' : '高'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{c.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1.5 truncate">{c.ownerName}</p>
                        <p className="text-xs text-slate-600 truncate mb-1.5">{c.lastMessage}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${CONSULT_TYPE_CONFIG[c.consultType].class}`}>
                            {CONSULT_TYPE_CONFIG[c.consultType].label}
                          </span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${st.class}`}>
                            {st.icon}{st.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center: Conversation */}
              {selectedConsult && (
                <div className={`flex-1 flex flex-col min-w-0 ${mobileView !== 'conversation' && mobileView !== 'list' ? 'hidden sm:flex' : ''} ${mobileView === 'list' ? 'hidden sm:flex' : ''}`}>
                  {/* Top bar */}
                  <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setMobileView('list')} className="sm:hidden p-1 text-slate-400">
                        ← 
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedConsult.petEmoji}</span>
                          <span className="font-medium text-slate-900">{selectedConsult.petName}</span>
                          <span className="text-xs text-slate-500">({selectedConsult.ownerName})</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${CONSULT_TYPE_CONFIG[selectedConsult.consultType].class}`}>
                            {CONSULT_TYPE_CONFIG[selectedConsult.consultType].label}
                          </span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${STATUS_CONFIG[selectedConsult.status].class}`}>
                            {STATUS_CONFIG[selectedConsult.status].icon}
                            {STATUS_CONFIG[selectedConsult.status].label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setMobileView('info')} className="lg:hidden p-1.5 rounded-md text-slate-400 hover:bg-slate-100">
                      <User className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {selectedConsult.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'doctor' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}
                      >
                        {msg.type === 'system' ? (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{msg.content}</span>
                        ) : (
                          <div className={`max-w-[70%] p-3 rounded-xl ${
                            msg.sender === 'doctor'
                              ? 'bg-amber-500 text-white rounded-br-none'
                              : 'bg-slate-100 text-slate-700 rounded-bl-none'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${msg.sender === 'doctor' ? 'text-amber-100' : 'text-slate-400'}`}>{msg.time}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Input + Actions */}
                  <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setShowAIAssistant(true)}
                        className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
                        title="AI 问诊助手"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={dw.consultInputPlaceholder || '输入回复内容...'}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      />
                      <button className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button className="text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md px-2.5 py-1.5 transition-colors">
                        {dw.consultActionToRecord || '转为病历'}
                      </button>
                      <button className="text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md px-2.5 py-1.5 transition-colors">
                        {dw.consultActionFollowUp || '安排随访'}
                      </button>
                      <button className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md px-2.5 py-1.5 transition-colors">
                        {dw.consultActionSuggestVisit || '建议到院'}
                      </button>
                      <button className="text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md px-2.5 py-1.5 transition-colors">
                        {dw.consultActionEnd || '结束问诊'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Right: Info Panel */}
              {selectedConsult && (
                <div className={`w-full lg:w-72 border-l border-slate-200 overflow-y-auto shrink-0 ${mobileView !== 'info' ? 'hidden lg:block' : ''}`}>
                  <div className="lg:hidden p-3 border-b border-slate-100">
                    <button onClick={() => setMobileView('conversation')} className="text-sm text-amber-600 font-medium">← 返回对话</button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Owner Info */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{dw.consultOwnerInfo || '宠主信息'}</h4>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                        <p className="text-sm font-medium text-slate-800">{selectedConsult.ownerName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{selectedConsult.ownerPhone}</p>
                      </div>
                    </div>

                    {/* Pet Info */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{dw.consultPetInfo || '宠物信息'}</h4>
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-2xl">{selectedConsult.petEmoji}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{selectedConsult.petName}</p>
                          <p className="text-xs text-slate-500">{selectedConsult.petBreed} · {selectedConsult.petAge}</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Records */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{dw.consultRecentRecords || '最近病历'}</h4>
                      {selectedConsult.recentRecords.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedConsult.recentRecords.map((r, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-2.5">
                              <p className="text-[10px] text-slate-400 mb-0.5">{r.date}</p>
                              <p className="text-xs text-slate-700">{r.diagnosis}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">暂无病历记录</p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-1.5 pt-2">
                      <button className="w-full text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />{dw.consultViewClientProfile || '查看客户档案'}
                      </button>
                      <button className="w-full text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" />{dw.consultNewRecord || '新建病历'}
                      </button>
                      <button className="w-full text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5">
                        <CalendarPlus className="w-3.5 h-3.5" />{dw.consultAddFollowUp || '添加随访'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* AI Consultation Assistant */}
      {aiContext && (
        <AIConsultationAssistant
          isOpen={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          context={aiContext}
          onApplyReply={handleApplyReply}
        />
      )}
    </div>
  );
}

export default DoctorConsultationsPage;
