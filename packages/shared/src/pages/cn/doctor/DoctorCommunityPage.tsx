'use client';

import React, { useState } from 'react';
import {
  MessagesSquare, MessageCircle, Search, Filter, PenLine, Stethoscope,
  Award, Users, TrendingUp, Store, Eye, Clock, Star, CheckCircle2,
  Paperclip, ChevronRight, BookOpen, ArrowRight, Heart, Flame
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
type PostType = 'case' | 'mentor' | 'clinical' | 'career' | 'startup';
type CaseStage = 'ongoing' | 'treatment' | 'followup' | 'closed';

interface CommunityPost {
  id: string;
  title: string;
  type: PostType;
  author: string;
  authorAvatar: string;
  createdAt: string;
  summary: string;
  replies: number;
  views: number;
  mentorJoined: boolean;
  isHot: boolean;
  isRecommended: boolean;
  specialty?: string;
  caseStage?: CaseStage;
  hasAttachment?: boolean;
}

interface MentorQA {
  id: string;
  question: string;
  mentor: string;
  mentorTitle: string;
  replies: number;
  status: 'active' | 'answered';
}

// Placeholder data
const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: '1',
    title: '犬股骨骨折内固定术后感染处理方案讨论',
    type: 'case',
    author: '张医生',
    authorAvatar: 'Z',
    createdAt: '2小时前',
    summary: '患犬3岁德牧，车祸导致右后肢股骨骨折，术后第5天出现局部红肿、分泌物增多，体温38.9°C...',
    replies: 12,
    views: 156,
    mentorJoined: true,
    isHot: true,
    isRecommended: true,
    specialty: '骨科',
    caseStage: 'treatment',
    hasAttachment: true
  },
  {
    id: '2',
    title: '猫慢性肾病早期营养管理经验分享',
    type: 'clinical',
    author: '李医生',
    authorAvatar: 'L',
    createdAt: '5小时前',
    summary: '分享一下我们诊所在猫慢性肾病早期营养管理方面的一些经验，主要涉及蛋白质摄入控制...',
    replies: 8,
    views: 98,
    mentorJoined: false,
    isHot: false,
    isRecommended: true
  },
  {
    id: '3',
    title: '关于软组织外科术中止血技术的疑问',
    type: 'mentor',
    author: '王医生',
    authorAvatar: 'W',
    createdAt: '1天前',
    summary: '在软组织外科课程中提到的电凝止血与传统结扎止血的适用场景，想请导师详细解答...',
    replies: 5,
    views: 67,
    mentorJoined: true,
    isHot: false,
    isRecommended: false
  },
  {
    id: '4',
    title: '从住院医师到主治医师的职业规划',
    type: 'career',
    author: '陈医生',
    authorAvatar: 'C',
    createdAt: '2天前',
    summary: '想请教各位前辈，从住院医师晋升到主治医师，除了临床能力提升，还需要注意哪些方面？',
    replies: 15,
    views: 234,
    mentorJoined: false,
    isHot: true,
    isRecommended: false
  },
  {
    id: '5',
    title: '健康管理中心选址经验分享',
    type: 'startup',
    author: '刘医生',
    authorAvatar: 'Liu',
    createdAt: '3天前',
    summary: '作为已经开业半年的健康管理中心创业者，分享一下选址过程中的一些经验和踩过的坑...',
    replies: 22,
    views: 345,
    mentorJoined: false,
    isHot: true,
    isRecommended: true
  },
  {
    id: '6',
    title: '犬急性胰腺炎影像学诊断要点',
    type: 'case',
    author: '赵医生',
    authorAvatar: 'Zhao',
    createdAt: '4天前',
    summary: '分享一个犬急性胰腺炎的典型病例，重点讨论超声影像学特征和CT诊断要点...',
    replies: 9,
    views: 178,
    mentorJoined: true,
    isHot: false,
    isRecommended: true,
    specialty: '影像学',
    caseStage: 'closed',
    hasAttachment: true
  }
];

const MENTOR_QAS: MentorQA[] = [
  { id: '1', question: '骨科术后抗生素使用周期如何确定？', mentor: '王教授', mentorTitle: 'CSAVS骨科导师', replies: 8, status: 'active' },
  { id: '2', question: '软组织外科缝合线材选择建议', mentor: '李教授', mentorTitle: 'CSAVS软组织导师', replies: 12, status: 'answered' },
  { id: '3', question: '眼科检查设备配置建议', mentor: '张教授', mentorTitle: 'CSAVS眼科导师', replies: 5, status: 'active' }
];

const HOT_CASES = COMMUNITY_POSTS.filter(p => p.type === 'case' && p.isHot).slice(0, 3);
const PRIORITY_CASES = COMMUNITY_POSTS.filter(p => p.type === 'case' && (p.isRecommended || p.mentorJoined)).slice(0, 4);

// Config
const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: React.ReactNode }> = {
  case: { label: '病例讨论', color: 'bg-rose-100 text-rose-700', icon: <Stethoscope className="w-4 h-4" /> },
  mentor: { label: '导师答疑', color: 'bg-amber-100 text-amber-700', icon: <Award className="w-4 h-4" /> },
  clinical: { label: '临床经验', color: 'bg-blue-100 text-blue-700', icon: <BookOpen className="w-4 h-4" /> },
  career: { label: '职业成长', color: 'bg-purple-100 text-purple-700', icon: <TrendingUp className="w-4 h-4" /> },
  startup: { label: '创业交流', color: 'bg-teal-100 text-teal-700', icon: <Store className="w-4 h-4" /> }
};

const CASE_STAGE_CONFIG: Record<CaseStage, { label: string; color: string }> = {
  ongoing: { label: '诊断中', color: 'bg-amber-100 text-amber-700' },
  treatment: { label: '治疗中', color: 'bg-blue-100 text-blue-700' },
  followup: { label: '随访中', color: 'bg-emerald-100 text-emerald-700' },
  closed: { label: '已结案', color: 'bg-slate-100 text-slate-600' }
};

export function DoctorCommunityPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [activeTab, setActiveTab] = useState<'all' | PostType>('case');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter posts
  const filteredPosts = COMMUNITY_POSTS.filter(post => {
    if (activeTab !== 'all' && post.type !== activeTab) return false;
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = [
    { label: dw.communityStatToday || '今日新讨论', value: 12, icon: <MessagesSquare className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50' },
    { label: dw.communityStatPendingCase || '待回复病例讨论', value: 5, icon: <Stethoscope className="w-5 h-5" />, color: 'text-rose-500 bg-rose-50' },
    { label: dw.communityStatMentorQA || '导师答疑中', value: 3, icon: <Award className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50' },
    { label: dw.communityStatHotTopics || '热门话题', value: 8, icon: <Flame className="w-5 h-5" />, color: 'text-orange-500 bg-orange-50' },
    { label: dw.communityStatMyPosts || '我的参与讨论', value: 4, icon: <MessageCircle className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50' }
  ];

  // Tabs
  const tabs = [
    { key: 'all' as const, label: dw.communityTabAll || '全部' },
    { key: 'case' as const, label: dw.communityTabCase || '病例讨论' },
    { key: 'mentor' as const, label: dw.communityTabMentor || '导师答疑' },
    { key: 'clinical' as const, label: dw.communityTabClinical || '临床经验' },
    { key: 'career' as const, label: dw.communityTabCareer || '职业成长' },
    { key: 'startup' as const, label: dw.communityTabStartup || '创业交流' }
  ];

  return (
    <div className="space-y-6">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dw.communityTitle || '医生社区'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {dw.communitySubtitle || '围绕病例讨论、导师答疑、成长经验与创业交流，与同行一起持续提升，而不是独自前行。'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dw.communitySearch || '搜索讨论主题、作者或关键词...'}
              className="w-full sm:w-56 pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            {dw.communityFilter || '筛选'}
          </button>
          <a
            href={`/${locale}/doctor/community/new`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            <PenLine className="w-4 h-4" />
            {dw.communityNewPost || '发布讨论'}
          </a>
          <a
            href={`/${locale}/doctor/community/new?type=case`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-50 transition-colors"
          >
            <Stethoscope className="w-4 h-4" />
            {dw.communityNewCase || '发起病例讨论'}
          </a>
        </div>
      </div>

      {/* ===== Stats Bar ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Main Content: Feed + Sidebar ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Discussion Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Post List */}
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <a
                key={post.id}
                href={`/${locale}/doctor/community/${post.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                    {post.authorAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${POST_TYPE_CONFIG[post.type].color}`}>
                        {POST_TYPE_CONFIG[post.type].label}
                      </span>
                      {post.specialty && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{post.specialty}</span>
                      )}
                      {post.caseStage && (
                        <span className={`px-2 py-0.5 rounded text-xs ${CASE_STAGE_CONFIG[post.caseStage].color}`}>
                          {CASE_STAGE_CONFIG[post.caseStage].label}
                        </span>
                      )}
                      {post.mentorJoined && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {dw.communityPostMentorJoined || '导师参与'}
                        </span>
                      )}
                      {post.isHot && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {dw.communityPostHot || '热门'}
                        </span>
                      )}
                      {post.isRecommended && !post.isHot && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {dw.communityPostRecommended || '推荐'}
                        </span>
                      )}
                    </div>
                    {/* Title */}
                    <h4 className="font-semibold text-slate-900 mb-1">{post.title}</h4>
                    {/* Summary */}
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">{post.summary}</p>
                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{post.author}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {post.createdAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {post.replies} {dw.communityPostReplies || '回复'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {post.views} {dw.communityPostViews || '浏览'}
                      </span>
                      {post.hasAttachment && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Paperclip className="w-3.5 h-3.5" />
                          {dw.communityPostHasAttachment || '含附件'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Hot Case Discussions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              {dw.communityHotCases || '热门病例讨论'}
            </h4>
            <div className="space-y-3">
              {HOT_CASES.map(post => (
                <a key={post.id} href={`/${locale}/doctor/community/${post.id}`} className="block group">
                  <div className="text-sm text-slate-700 group-hover:text-amber-600 transition-colors line-clamp-2">{post.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{post.replies} 回复 · {post.views} 浏览</div>
                </a>
              ))}
            </div>
          </div>

          {/* Mentor QA Entry */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              {dw.communityMentorEntry || '导师答疑入口'}
            </h4>
            <div className="space-y-2">
              {MENTOR_QAS.slice(0, 2).map(qa => (
                <div key={qa.id} className="bg-white/70 rounded-lg p-3">
                  <div className="text-sm text-slate-700 line-clamp-1">{qa.question}</div>
                  <div className="text-xs text-amber-600 mt-1">{qa.mentor} · {qa.mentorTitle}</div>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs text-amber-600 font-medium hover:text-amber-700">
              {dw.communityMentorQAAsk || '向导师提问'} →
            </button>
          </div>

          {/* Related Topics */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900 mb-3">{dw.communityRelatedTopics || '与你相关的话题'}</h4>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">基于你的外科进阶方向，推荐关注骨科讨论</div>
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">你最近学习的课程有相关病例讨论</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900 mb-3">{dw.communityQuickActions || '快速入口'}</h4>
            <div className="space-y-2">
              <a href={`/${locale}/doctor/community/new?type=case`} className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700">
                <Stethoscope className="w-4 h-4" />
                {dw.communityNewCaseBtn || '发起病例讨论'}
              </a>
              <a href={`/${locale}/doctor/community/new`} className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700">
                <PenLine className="w-4 h-4" />
                {dw.communityNewPostBtn || '发布讨论'}
              </a>
              <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-700">
                <MessageCircle className="w-4 h-4" />
                {dw.communityMyPosts || '查看我的帖子'}
              </button>
              <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-700">
                <Users className="w-4 h-4" />
                {dw.communityMyReplies || '查看我的回复'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Priority Case Discussions ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          {dw.communityPriorityCaseTitle || '值得优先参与的病例讨论'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRIORITY_CASES.map(post => (
            <a
              key={post.id}
              href={`/${locale}/doctor/community/${post.id}`}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                {post.specialty && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs">{post.specialty}</span>}
                {post.mentorJoined && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">导师参与</span>}
              </div>
              <h4 className="font-medium text-slate-900 text-sm line-clamp-2 mb-2">{post.title}</h4>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{post.replies} 回复</span>
                <span>{post.views} 浏览</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ===== Mentor QA Section ===== */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            {dw.communityMentorQATitle || '导师答疑'}
          </h3>
          <a href={`/${locale}/doctor/community/new?type=mentor`} className="text-sm text-amber-600 font-medium hover:text-amber-700">
            {dw.communityMentorQAAsk || '向导师提问'} →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MENTOR_QAS.map(qa => (
            <div key={qa.id} className="bg-white/80 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs ${qa.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {qa.status === 'active' ? '答疑中' : '已回答'}
                </span>
              </div>
              <h4 className="font-medium text-slate-900 text-sm mb-2">{qa.question}</h4>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600">{qa.mentor}</span>
                <span className="text-slate-400">{qa.replies} 回复</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Career & Startup Exchange ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          {dw.communityCareerStartupTitle || '职业与创业交流'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMUNITY_POSTS.filter(p => p.type === 'career' || p.type === 'startup').slice(0, 4).map(post => (
            <a
              key={post.id}
              href={`/${locale}/doctor/community/${post.id}`}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${POST_TYPE_CONFIG[post.type].color}`}>
                  {POST_TYPE_CONFIG[post.type].label}
                </span>
                {post.isHot && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">热门</span>}
              </div>
              <h4 className="font-medium text-slate-900 text-sm line-clamp-2 mb-2">{post.title}</h4>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{post.author}</span>
                <span>{post.replies} 回复</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ===== My Community Participation ===== */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">{dw.communityMyParticipationTitle || '我的社区参与'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 text-sm mb-2">{dw.communityMyRecentPosts || '我的发布'}</h4>
            <p className="text-xs text-slate-400">暂无发布内容</p>
            <a href={`/${locale}/doctor/community/new`} className="mt-3 inline-block text-xs text-amber-600 font-medium">
              发布第一个讨论 →
            </a>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 text-sm mb-2">{dw.communityMyRecentReplies || '我的回复'}</h4>
            <p className="text-xs text-slate-400">暂无回复内容</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 text-sm mb-2">{dw.communityMyFollowed || '关注的话题'}</h4>
            <p className="text-xs text-slate-400">暂无关注话题</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorCommunityPage;
