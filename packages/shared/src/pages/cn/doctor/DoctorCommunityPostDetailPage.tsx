'use client';

import React, { useState } from 'react';
import {
  ArrowLeft, MessageCircle, Clock, Eye, Award, Stethoscope,
  Flame, Star, Paperclip, Send, BookOpen, TrendingUp, Store,
  Heart, Share2, Bookmark, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Types
interface Reply {
  id: string;
  author: string;
  authorAvatar: string;
  isMentor: boolean;
  mentorTitle?: string;
  content: string;
  createdAt: string;
  likes: number;
}

interface RelatedPost {
  id: string;
  title: string;
  replies: number;
}

// Placeholder data
const POST_DETAIL = {
  id: '1',
  title: '犬股骨骨折内固定术后感染处理方案讨论',
  type: 'case' as const,
  author: '张医生',
  authorAvatar: 'Z',
  createdAt: '2小时前',
  content: `患犬3岁德牧，车祸导致右后肢股骨骨折，术后第5天出现局部红肿、分泌物增多，体温38.9°C。

## 病例背景
- 品种：德国牧羊犬
- 年龄：3岁
- 体重：35kg
- 就诊原因：车祸外伤

## 术前检查
- X线检查：右侧股骨中段横行骨折
- 血常规：WBC 14.2×10^9/L，轻度升高
- 生化检查：基本正常

## 手术方案
采用DCP钢板内固定，术中清创充分，预防性使用头孢曲松钠。

## 术后情况
术后第5天出现：
1. 局部红肿明显
2. 切口分泌物增多，呈淡黄色
3. 体温38.9°C
4. 患肢负重减少

## 目前困惑
1. 是否需要进行细菌培养？
2. 抗生素方案是否需要调整？
3. 是否需要考虑翻修手术？

希望各位同行和导师给予指导。`,
  specialty: '骨科',
  caseStage: 'treatment',
  replies: 12,
  views: 156,
  mentorJoined: true,
  isHot: true,
  hasAttachment: true
};

const REPLIES: Reply[] = [
  {
    id: '1',
    author: '王教授',
    authorAvatar: 'W',
    isMentor: true,
    mentorTitle: 'CSAVS骨科导师',
    content: `根据描述的情况，这是典型的术后感染表现。我的建议如下：

1. **细菌培养**：建议立即进行分泌物细菌培养和药敏试验，这是指导抗生素选择的关键。

2. **抗生素调整**：在培养结果出来前，可以考虑升级为广谱抗生素，如阿米卡星联合头孢他啶。

3. **局部处理**：加强切口引流，每日换药并观察分泌物性质变化。

4. **翻修手术**：如果保守治疗1-2周无效，或感染进展，需要考虑翻修手术取出内固定物。

请持续关注体温变化和血常规指标。`,
    createdAt: '1小时前',
    likes: 15
  },
  {
    id: '2',
    author: '李医生',
    authorAvatar: 'L',
    isMentor: false,
    content: `我遇到过类似情况，分享一下经验：

术后感染的处理原则是早发现、早处理。建议：
1. 尽快做细菌培养
2. 检查内固定物是否松动
3. 必要时做CT评估骨愈合情况

同意王教授的建议，如果感染控制不住，早期翻修比晚期翻修预后好。`,
    createdAt: '45分钟前',
    likes: 8
  },
  {
    id: '3',
    author: '赵医生',
    authorAvatar: 'Zhao',
    isMentor: false,
    content: `请问术中有没有做细菌培养？另外，患犬的免疫状态如何？有没有基础疾病？

这些信息对判断感染原因很重要。`,
    createdAt: '30分钟前',
    likes: 3
  }
];

const RELATED_POSTS: RelatedPost[] = [
  { id: '2', title: '骨折内固定术后康复管理要点', replies: 18 },
  { id: '3', title: '犬骨折手术抗生素使用指南讨论', replies: 25 },
  { id: '4', title: '骨科术后感染的早期识别', replies: 12 }
];

export function DoctorCommunityPostDetailPage({ locale, postId }: { locale: string; postId: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  const [replyContent, setReplyContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

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
          <h1 className="text-lg font-bold text-slate-900">{dw.communityDetailTitle || '讨论详情'}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post Detail */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-medium">病例讨论</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{POST_DETAIL.specialty}</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">治疗中</span>
              {POST_DETAIL.mentorJoined && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                  <Award className="w-3 h-3" /> 导师参与
                </span>
              )}
              {POST_DETAIL.isHot && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                  <Flame className="w-3 h-3" /> 热门
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-slate-900 mb-4">{POST_DETAIL.title}</h2>

            {/* Author Info */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                {POST_DETAIL.authorAvatar}
              </div>
              <div>
                <div className="font-medium text-slate-900">{POST_DETAIL.author}</div>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {POST_DETAIL.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {POST_DETAIL.views} 浏览
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> {POST_DETAIL.replies} 回复
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm prose-slate max-w-none">
              {POST_DETAIL.content.split('\n').map((line, idx) => {
                if (line.startsWith('## ')) {
                  return <h3 key={idx} className="text-base font-semibold text-slate-900 mt-4 mb-2">{line.replace('## ', '')}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={idx} className="text-sm text-slate-700 ml-4">{line.replace('- ', '')}</li>;
                }
                if (line.match(/^\d+\./)) {
                  return <li key={idx} className="text-sm text-slate-700 ml-4">{line.replace(/^\d+\./, '').trim()}</li>;
                }
                if (line.trim() === '') return <br key={idx} />;
                return <p key={idx} className="text-sm text-slate-700 mb-2">{line}</p>;
              })}
            </div>

            {/* Attachment indicator */}
            {POST_DETAIL.hasAttachment && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-blue-700">
                <Paperclip className="w-4 h-4" />
                此讨论包含 2 个附件（X线片、术后照片）
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-500 transition-colors">
                <Heart className="w-4 h-4" /> 点赞
              </button>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${isSaved ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} /> {isSaved ? '已收藏' : '收藏'}
              </button>
              <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors">
                <Share2 className="w-4 h-4" /> 分享
              </button>
            </div>
          </div>

          {/* Reply Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-amber-500" />
              {dw.communityDetailReplies || '回复'} ({REPLIES.length})
            </h3>

            {/* Reply List */}
            <div className="space-y-4">
              {REPLIES.map(reply => (
                <div key={reply.id} className={`p-4 rounded-xl ${reply.isMentor ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                      reply.isMentor ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {reply.authorAvatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{reply.author}</span>
                        {reply.isMentor && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {reply.mentorTitle}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{reply.createdAt}</span>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-line">{reply.content}</div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <button className="hover:text-rose-500 flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" /> {reply.likes}
                        </button>
                        <button className="hover:text-blue-500">回复</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={dw.communityDetailReplyPlaceholder || '输入你的回复...'}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
              <div className="mt-2 flex justify-end">
                <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {dw.communityDetailSubmitReply || '发布回复'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Related Discussions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900 mb-3">{dw.communityDetailRelated || '相关讨论'}</h4>
            <div className="space-y-3">
              {RELATED_POSTS.map(post => (
                <a key={post.id} href={`/${locale}/doctor/community/${post.id}`} className="block group">
                  <div className="text-sm text-slate-700 group-hover:text-amber-600 transition-colors line-clamp-2">{post.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{post.replies} 回复</div>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-4">
            <h4 className="font-semibold text-slate-900 mb-3">延续你的学习</h4>
            <div className="space-y-2">
              <a href={`/${locale}/doctor/courses`} className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700">
                <BookOpen className="w-4 h-4" />
                {dw.communityDetailViewCourse || '查看相关课程'}
              </a>
              <a href={`/${locale}/doctor/growth`} className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700">
                <TrendingUp className="w-4 h-4" />
                {dw.communityDetailViewGrowth || '查看成长档案'}
              </a>
              <a href={`/${locale}/doctor/startup`} className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700">
                <Store className="w-4 h-4" />
                {dw.communityDetailViewStartup || '进入创业中心'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorCommunityPostDetailPage;
