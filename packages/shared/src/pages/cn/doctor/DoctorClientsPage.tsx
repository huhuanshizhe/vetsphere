'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Search, SlidersHorizontal, UserPlus, PawPrint, Users, UserCheck,
  HeartPulse, CalendarPlus, Phone, ArrowRight, ClipboardList, MessageCircle,
  Calendar, Eye, Plus, X, CheckCircle2, Clock, AlertCircle, Shield,
  FileText, Stethoscope, Heart,
} from 'lucide-react';

// ─── Types ───
interface Pet {
  name: string;
  species: string;
  breed: string;
  age: string;
  avatar: string;
}

interface ServiceRecord {
  type: '问诊' | '复诊' | '术后' | '健康管理';
  pet: string;
  date: string;
  summary: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  pets: Pet[];
  lastVisit: string;
  status: 'normal' | 'followup' | 'high' | 'longterm';
  lastService: string;
  tags: string[];
  recentServices: ServiceRecord[];
}

// ─── Placeholder Data ───
const CLIENTS: Client[] = [
  {
    id: '1', name: '张明华', phone: '138****6721', lastVisit: '2026-03-03', status: 'followup', lastService: '术后',
    tags: ['VIP客户', '骨科术后'],
    pets: [
      { name: '豆豆', species: '犬', breed: '金毛寻回犬', age: '3岁', avatar: '🐕' },
      { name: '小橘', species: '猫', breed: '橘猫', age: '2岁', avatar: '🐱' },
    ],
    recentServices: [
      { type: '术后', pet: '豆豆', date: '2026-03-03', summary: '前十字韧带术后 7 天复查' },
      { type: '问诊', pet: '小橘', date: '2026-02-28', summary: '食欲下降，初步检查正常' },
      { type: '健康管理', pet: '豆豆', date: '2026-02-20', summary: '关节保健方案制定' },
    ],
  },
  {
    id: '2', name: '李雪', phone: '139****3348', lastVisit: '2026-03-02', status: 'high', lastService: '问诊',
    tags: ['高关注', '多宠家庭'],
    pets: [
      { name: '小白', species: '猫', breed: '英国短毛猫', age: '4岁', avatar: '🐱' },
      { name: '芒果', species: '猫', breed: '布偶猫', age: '1岁', avatar: '🐱' },
      { name: '旺旺', species: '犬', breed: '柴犬', age: '5岁', avatar: '🐕' },
    ],
    recentServices: [
      { type: '问诊', pet: '小白', date: '2026-03-02', summary: '皮肤真菌感染复查' },
      { type: '复诊', pet: '芒果', date: '2026-02-25', summary: '疫苗接种第二针' },
    ],
  },
  {
    id: '3', name: '王建国', phone: '137****9150', lastVisit: '2026-03-01', status: 'longterm', lastService: '健康管理',
    tags: ['长期管理', '关节保健'],
    pets: [
      { name: '旺财', species: '犬', breed: '拉布拉多', age: '7岁', avatar: '🐕' },
    ],
    recentServices: [
      { type: '健康管理', pet: '旺财', date: '2026-03-01', summary: '季度关节健康评估' },
      { type: '复诊', pet: '旺财', date: '2026-02-15', summary: '髌骨脱位保守治疗随访' },
    ],
  },
  {
    id: '4', name: '赵雨晴', phone: '136****4482', lastVisit: '2026-02-28', status: 'normal', lastService: '复诊',
    tags: ['新客户'],
    pets: [
      { name: '毛毛', species: '犬', breed: '泰迪', age: '2岁', avatar: '🐕' },
    ],
    recentServices: [
      { type: '复诊', pet: '毛毛', date: '2026-02-28', summary: '皮肤治疗一周复查' },
    ],
  },
  {
    id: '5', name: '孙志强', phone: '135****7723', lastVisit: '2026-02-26', status: 'followup', lastService: '问诊',
    tags: ['术后随访'],
    pets: [
      { name: '小黑', species: '犬', breed: '德国牧羊犬', age: '6岁', avatar: '🐕' },
      { name: '花花', species: '猫', breed: '三花猫', age: '3岁', avatar: '🐱' },
    ],
    recentServices: [
      { type: '问诊', pet: '花花', date: '2026-02-26', summary: '呕吐腹泻三天，疑似胃肠炎' },
      { type: '术后', pet: '小黑', date: '2026-02-20', summary: '骨折内固定术后 14 天复查' },
    ],
  },
  {
    id: '6', name: '陈美琳', phone: '133****8810', lastVisit: '2026-03-02', status: 'normal', lastService: '问诊',
    tags: [],
    pets: [
      { name: '球球', species: '犬', breed: '博美', age: '1岁', avatar: '🐕' },
    ],
    recentServices: [
      { type: '问诊', pet: '球球', date: '2026-03-02', summary: '首次疫苗接种咨询' },
    ],
  },
];

const FOLLOW_UPS = [
  { clientName: '张明华', petName: '豆豆', type: '术后复查', due: '今天', urgent: true },
  { clientName: '孙志强', petName: '小黑', type: '骨折复查', due: '今天', urgent: true },
  { clientName: '李雪', petName: '小白', type: '皮肤随访', due: '明天', urgent: false },
  { clientName: '王建国', petName: '旺财', type: '关节评估', due: '后天', urgent: false },
];

type FilterTab = 'all' | 'followup' | 'high' | 'longterm' | 'recent';

const STATUS_CONFIG = {
  normal: { label: '正常', class: 'bg-slate-100 text-slate-600' },
  followup: { label: '待随访', class: 'bg-amber-100 text-amber-700' },
  high: { label: '高关注', class: 'bg-rose-100 text-rose-700' },
  longterm: { label: '长期管理', class: 'bg-emerald-100 text-emerald-700' },
};

const SERVICE_ICON: Record<string, React.ReactNode> = {
  '问诊': <MessageCircle className="w-3.5 h-3.5" />,
  '复诊': <Stethoscope className="w-3.5 h-3.5" />,
  '术后': <Heart className="w-3.5 h-3.5" />,
  '健康管理': <Shield className="w-3.5 h-3.5" />,
};

// ─── Main Component ───
export function DoctorClientsPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>('1');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const filteredClients = useMemo(() => {
    let list = CLIENTS;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.includes(q) || c.phone.includes(q) || c.pets.some(p => p.name.includes(q))
      );
    }
    if (activeFilter === 'followup') list = list.filter(c => c.status === 'followup');
    else if (activeFilter === 'high') list = list.filter(c => c.status === 'high');
    else if (activeFilter === 'longterm') list = list.filter(c => c.status === 'longterm');
    else if (activeFilter === 'recent') list = list.slice().sort((a, b) => b.lastVisit.localeCompare(a.lastVisit)).slice(0, 5);
    return list;
  }, [searchQuery, activeFilter]);

  const selectedClient = CLIENTS.find(c => c.id === selectedClientId) || null;
  const hasClients = CLIENTS.length > 0;

  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: dw.clientsFilterAll || '全部客户', count: CLIENTS.length },
    { key: 'followup', label: dw.clientsFilterFollowUp || '待随访', count: CLIENTS.filter(c => c.status === 'followup').length },
    { key: 'high', label: dw.clientsFilterHighAttention || '高关注', count: CLIENTS.filter(c => c.status === 'high').length },
    { key: 'longterm', label: dw.clientsFilterLongTerm || '长期管理', count: CLIENTS.filter(c => c.status === 'longterm').length },
    { key: 'recent', label: dw.clientsFilterRecent || '最近新增' },
  ];

  const stats = [
    { label: dw.clientsStatTotal || '总客户数', value: String(CLIENTS.length), icon: <Users className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
    { label: dw.clientsStatMonthActive || '本月活跃客户', value: '4', icon: <UserCheck className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: dw.clientsStatPendingFollow || '待随访客户', value: String(CLIENTS.filter(c => c.status === 'followup').length), icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
    { label: dw.clientsStatWeeklyPets || '本周新增宠物档案', value: '2', icon: <PawPrint className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
    { label: dw.clientsStatLongTerm || '长期健康管理客户', value: String(CLIENTS.filter(c => c.status === 'longterm').length), icon: <HeartPulse className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50' },
  ];

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setShowMobileDetail(true);
  };

  return (
    <div className="space-y-5">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{dw.clientsTitle || '客户管理'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md">{dw.clientsSubtitle || '统一管理宠主与宠物信息，帮助你建立更长期、更有秩序的客户关系。'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <PawPrint className="w-4 h-4" />
            {dw.clientsAddPet || '添加宠物档案'}
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
            <UserPlus className="w-4 h-4" />
            {dw.clientsAddClient || '添加新客户'}
          </button>
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

      {/* ── 3. Follow-up Priority ── */}
      {FOLLOW_UPS.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {dw.clientsFollowUpTitle || '今日待随访'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {FOLLOW_UPS.map((f, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-800">{f.clientName}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${f.urgent ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    {f.due}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2.5">{f.petName} · {f.type}</p>
                <div className="flex gap-1.5">
                  <button className="flex-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md py-1.5 transition-colors">
                    {dw.clientsFollowUpAction || '立即回访'}
                  </button>
                  <button className="flex-1 text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md py-1.5 transition-colors">
                    {dw.clientsFollowUpDone || '标记完成'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasClients ? (
        /* ── 6. Empty State ── */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{dw.clientsEmptyTitle || '你还没有客户档案'}</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">{dw.clientsEmptyDesc || '从添加第一位宠主和宠物开始，逐步建立你的客户管理体系。'}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
              <UserPlus className="w-4 h-4" />{dw.clientsAddClient || '添加新客户'}
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <PawPrint className="w-4 h-4" />{dw.clientsAddPet || '添加宠物档案'}
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              {dw.clientsEmptyLearn || '了解客户管理功能'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Main Client Area ── */
        <>
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dw.clientsSearch || '搜索宠主姓名、手机号或宠物名...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              {dw.clientsFilter || '筛选'}
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
            {/* Client List */}
            <div className={`flex-1 min-w-0 space-y-2 ${showMobileDetail ? 'hidden lg:block' : ''}`}>
              {filteredClients.map((client) => {
                const st = STATUS_CONFIG[client.status];
                const isSelected = selectedClientId === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => handleSelectClient(client.id)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                      isSelected ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900">{client.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${st.class}`}>{st.label}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{client.lastService}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                          <span className="flex items-center gap-1"><PawPrint className="w-3 h-3" />{client.pets.length} 只宠物</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{client.lastVisit}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors" title={dw.clientsActionDetail || '查看详情'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-purple-600 transition-colors" title={dw.clientsActionConsult || '发起问诊'}>
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors" title={dw.clientsActionRecord || '新建病历'}>
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition-colors" title={dw.clientsActionFollowUp || '添加随访'}>
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredClients.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-400">没有找到匹配的客户</div>
              )}
            </div>

            {/* Right Preview Panel - Desktop */}
            {selectedClient && (
              <div className={`w-full lg:w-[380px] shrink-0 ${showMobileDetail ? 'block' : 'hidden lg:block'}`}>
                <div className="bg-white rounded-xl border border-slate-200 sticky top-4">
                  {/* Mobile back button */}
                  <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-100">
                    <button onClick={() => setShowMobileDetail(false)} className="text-sm text-amber-600 font-medium flex items-center gap-1">
                      ← 返回列表
                    </button>
                    <span className="text-xs text-slate-400">{dw.clientsPreviewTitle || '客户详情'}</span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Basic Info */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-slate-900">{selectedClient.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[selectedClient.status].class}`}>
                          {STATUS_CONFIG[selectedClient.status].label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{selectedClient.phone}</p>
                        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />最近就诊: {selectedClient.lastVisit}</p>
                      </div>
                      {selectedClient.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {selectedClient.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pets */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">{dw.clientsPreviewPets || '关联宠物'}</h4>
                      <div className="space-y-2">
                        {selectedClient.pets.map((pet) => (
                          <div key={pet.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/80">
                            <span className="text-2xl">{pet.avatar}</span>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{pet.name}</p>
                              <p className="text-[11px] text-slate-500">{pet.breed} · {pet.age}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Services */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">{dw.clientsPreviewRecentService || '最近服务记录'}</h4>
                      <div className="space-y-1.5">
                        {selectedClient.recentServices.map((s, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/80">
                            <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                              {SERVICE_ICON[s.type] || <FileText className="w-3.5 h-3.5" />}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{s.type}</span>
                                <span className="text-[10px] text-slate-400">{s.pet} · {s.date}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">{s.summary}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        <ClipboardList className="w-3.5 h-3.5" />{dw.clientsActionRecord || '新建病历'}
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />{dw.clientsActionConsult || '发起问诊'}
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                        <CalendarPlus className="w-3.5 h-3.5" />{dw.clientsActionFollowUp || '添加随访'}
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5" />{dw.clientsPreviewFullProfile || '查看完整档案'}
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

export default DoctorClientsPage;
