'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, X, MessageSquare, FileText, HelpCircle, Send,
  CheckCircle2, Loader2, Copy, ArrowRight, Info, RefreshCw,
  ClipboardCheck, Lightbulb, PenLine,
} from 'lucide-react';

// ─── Types ───
type AssistantMode = 'summary' | 'reply' | 'questions';

interface Message {
  id: string;
  sender: 'owner' | 'doctor' | 'system';
  content: string;
  time: string;
}

interface ConsultationContext {
  petName: string;
  petBreed: string;
  petAge: string;
  ownerName: string;
  consultType: string;
  messages: Message[];
  recentRecords: Array<{ date: string; diagnosis: string }>;
}

interface ConversationSummary {
  mainConcern: string;
  symptoms: string[];
  duration: string;
  ownerQuestions: string[];
  doctorActions: string[];
  currentStatus: string;
}

interface ReplyDraft {
  content: string;
  tone: 'professional' | 'friendly' | 'reassuring';
  includesAdvice: boolean;
  suggestedActions: string[];
}

interface SuggestedQuestion {
  question: string;
  purpose: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIConsultationAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context: ConsultationContext;
  onApplyReply: (reply: string) => void;
}

// ─── Mode Configs ───
const MODE_CONFIG: Record<AssistantMode, { name: string; icon: React.ReactNode; description: string }> = {
  summary: {
    name: '对话总结',
    icon: <FileText className="w-4 h-4" />,
    description: '将当前问诊对话整理为结构化摘要',
  },
  reply: {
    name: '回复建议',
    icon: <PenLine className="w-4 h-4" />,
    description: '根据对话上下文生成专业回复草稿',
  },
  questions: {
    name: '追问建议',
    icon: <HelpCircle className="w-4 h-4" />,
    description: '提供可能需要进一步了解的问题',
  },
};

// ─── Simulate AI Responses ───
function simulateSummary(context: ConsultationContext): ConversationSummary {
  const ownerMessages = context.messages.filter(m => m.sender === 'owner');
  const doctorMessages = context.messages.filter(m => m.sender === 'doctor');
  
  // 提取主诉
  let mainConcern = '宠主咨询宠物健康问题';
  if (ownerMessages.length > 0) {
    const firstMsg = ownerMessages[0].content;
    if (firstMsg.includes('术后')) mainConcern = '术后恢复情况咨询';
    else if (firstMsg.includes('皮肤')) mainConcern = '皮肤问题咨询';
    else if (firstMsg.includes('呕吐') || firstMsg.includes('拉稀')) mainConcern = '消化系统问题咨询';
    else if (firstMsg.includes('挠') || firstMsg.includes('痒')) mainConcern = '瘙痒症状咨询';
    else mainConcern = firstMsg.slice(0, 30) + (firstMsg.length > 30 ? '...' : '');
  }
  
  // 提取症状
  const symptoms: string[] = [];
  ownerMessages.forEach(m => {
    if (m.content.includes('红')) symptoms.push('伤口/皮肤发红');
    if (m.content.includes('肿')) symptoms.push('肿胀');
    if (m.content.includes('痒') || m.content.includes('挠')) symptoms.push('瘙痒');
    if (m.content.includes('吐')) symptoms.push('呕吐');
    if (m.content.includes('拉稀')) symptoms.push('腹泻');
    if (m.content.includes('不吃')) symptoms.push('食欲下降');
  });
  if (symptoms.length === 0) symptoms.push('需进一步了解');
  
  // 宠主问题
  const ownerQuestions = ownerMessages
    .filter(m => m.content.includes('？') || m.content.includes('吗'))
    .map(m => m.content.slice(0, 40));
  
  // 医生建议
  const doctorActions = doctorMessages.map(m => m.content.slice(0, 40));
  
  // 当前状态
  let currentStatus = '等待医生回复';
  if (doctorMessages.length > 0 && ownerMessages.length > 0) {
    const lastOwner = context.messages.filter(m => m.sender === 'owner').pop();
    const lastDoctor = context.messages.filter(m => m.sender === 'doctor').pop();
    if (lastOwner && lastDoctor) {
      if (context.messages.indexOf(lastOwner) > context.messages.indexOf(lastDoctor)) {
        currentStatus = '宠主已回复，等待医生';
      } else {
        currentStatus = '医生已回复，等待宠主';
      }
    }
  }
  
  return {
    mainConcern,
    symptoms: [...new Set(symptoms)],
    duration: '根据对话推断',
    ownerQuestions: ownerQuestions.slice(0, 3),
    doctorActions: doctorActions.slice(0, 3),
    currentStatus,
  };
}

function simulateReplyDrafts(context: ConsultationContext): ReplyDraft[] {
  const ownerMessages = context.messages.filter(m => m.sender === 'owner');
  const lastOwnerMsg = ownerMessages[ownerMessages.length - 1]?.content || '';
  
  const drafts: ReplyDraft[] = [];
  
  // 根据对话内容生成不同风格的回复
  if (lastOwnerMsg.includes('术后') || lastOwnerMsg.includes('恢复')) {
    drafts.push({
      content: `您好，根据您描述的情况，${context.petName}术后第7天伤口轻微发红是正常的愈合反应。建议您：\n1. 继续保持伤口清洁干燥\n2. 防止${context.petName}舔舐伤口\n3. 按时服用术后药物\n\n如果出现渗液、肿胀明显加重或${context.petName}精神食欲明显下降，请及时带来复查。`,
      tone: 'professional',
      includesAdvice: true,
      suggestedActions: ['继续观察', '按时用药', '限制活动'],
    });
    drafts.push({
      content: `${context.ownerName}您好！不用太担心，${context.petName}术后一周左右伤口有点发红是正常现象哦。只要没有明显渗液或者肿胀加重，继续保持伤口清洁就好。有什么变化随时联系我~`,
      tone: 'friendly',
      includesAdvice: false,
      suggestedActions: ['继续观察'],
    });
  } else if (lastOwnerMsg.includes('皮肤') || lastOwnerMsg.includes('挠')) {
    drafts.push({
      content: `您好，${context.petName}频繁挠耳朵可能是耳道问题的表现。建议您先观察一下耳朵内部有没有红肿、异味或分泌物。如果有的话，建议尽快带来检查，可能需要做耳道检查和细菌培养。`,
      tone: 'professional',
      includesAdvice: true,
      suggestedActions: ['观察耳道', '尽快检查', '避免抓挠'],
    });
  } else {
    drafts.push({
      content: `您好，感谢您的咨询。根据您描述的情况，我需要了解更多信息才能给出准确的建议。请问${context.petName}这个情况持续多久了？最近饮食和精神状态怎么样？`,
      tone: 'professional',
      includesAdvice: false,
      suggestedActions: ['进一步了解病史'],
    });
    drafts.push({
      content: `${context.ownerName}您好！${context.petName}的情况我了解了。为了更好地帮助您，我想再确认几个问题，方便我给出更准确的建议~`,
      tone: 'friendly',
      includesAdvice: false,
      suggestedActions: ['进一步问诊'],
    });
  }
  
  return drafts;
}

function simulateSuggestedQuestions(context: ConsultationContext): SuggestedQuestion[] {
  const ownerMessages = context.messages.filter(m => m.sender === 'owner');
  const questions: SuggestedQuestion[] = [];
  
  // 通用问题
  questions.push({
    question: `${context.petName}最近的食欲和精神状态怎么样？`,
    purpose: '评估整体健康状况',
    priority: 'high',
  });
  
  // 根据对话内容推荐问题
  const allContent = ownerMessages.map(m => m.content).join(' ');
  
  if (allContent.includes('术后') || allContent.includes('手术')) {
    questions.push({
      question: '伤口有没有渗液或者异味？',
      purpose: '排除感染风险',
      priority: 'high',
    });
    questions.push({
      question: '目前活动量控制得怎么样？有没有跑跳？',
      purpose: '确保术后康复条件',
      priority: 'medium',
    });
  }
  
  if (allContent.includes('皮肤') || allContent.includes('挠') || allContent.includes('痒')) {
    questions.push({
      question: '发病前有没有接触新的食物、环境或其他动物？',
      purpose: '排查过敏源',
      priority: 'high',
    });
    questions.push({
      question: '症状是持续的还是间歇性的？什么时候更严重？',
      purpose: '了解病程特点',
      priority: 'medium',
    });
  }
  
  if (allContent.includes('吐') || allContent.includes('拉')) {
    questions.push({
      question: '最近有没有吃过异物或者换过粮？',
      purpose: '排查病因',
      priority: 'high',
    });
    questions.push({
      question: '呕吐物/粪便的颜色和性状是怎样的？',
      purpose: '判断严重程度',
      priority: 'high',
    });
  }
  
  // 通用追问
  questions.push({
    question: '这个情况持续多久了？',
    purpose: '了解病程',
    priority: 'medium',
  });
  questions.push({
    question: '之前有没有类似的情况？用过什么药？',
    purpose: '了解既往史',
    priority: 'low',
  });
  
  return questions.slice(0, 5);
}

// ─── Main Component ───
export function AIConsultationAssistant({
  isOpen,
  onClose,
  context,
  onApplyReply,
}: AIConsultationAssistantProps) {
  const [mode, setMode] = useState<AssistantMode>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<ReplyDraft[]>([]);
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Reset state when mode changes
  useEffect(() => {
    setSummary(null);
    setReplyDrafts([]);
    setQuestions([]);
    setCopiedIndex(null);
  }, [mode]);

  // Auto-generate when opening
  useEffect(() => {
    if (isOpen && context.messages.length > 0) {
      handleGenerate();
    }
  }, [isOpen, mode]);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setCopiedIndex(null);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (mode === 'summary') {
      const result = simulateSummary(context);
      setSummary(result);
    } else if (mode === 'reply') {
      const result = simulateReplyDrafts(context);
      setReplyDrafts(result);
    } else if (mode === 'questions') {
      const result = simulateSuggestedQuestions(context);
      setQuestions(result);
    }
    
    setIsProcessing(false);
  };

  const handleCopyReply = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApplyReply = (content: string) => {
    onApplyReply(content);
    onClose();
  };

  const priorityClass = (p: 'high' | 'medium' | 'low') => {
    if (p === 'high') return 'text-rose-600 bg-rose-50';
    if (p === 'medium') return 'text-amber-600 bg-amber-50';
    return 'text-slate-500 bg-slate-100';
  };

  const toneLabel = (t: 'professional' | 'friendly' | 'reassuring') => {
    if (t === 'professional') return '专业正式';
    if (t === 'friendly') return '亲切友好';
    return '安抚为主';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI 问诊助手</h2>
              <p className="text-[11px] text-slate-500">
                当前对话: {context.petName} ({context.ownerName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          {(Object.keys(MODE_CONFIG) as AssistantMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {MODE_CONFIG[m].icon}
              {MODE_CONFIG[m].name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mode Description */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50/70 rounded-lg border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">{MODE_CONFIG[mode].description}</p>
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-slate-600 font-medium">AI 正在分析对话...</p>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'summary' && '正在提取关键信息'}
                {mode === 'reply' && '正在生成回复建议'}
                {mode === 'questions' && '正在生成追问建议'}
              </p>
            </div>
          )}

          {/* Summary Results */}
          {mode === 'summary' && summary && !isProcessing && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">主要诉求</p>
                  <p className="text-sm text-slate-800">{summary.mainConcern}</p>
                </div>
                
                {summary.symptoms.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">提及症状</p>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.symptoms.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-rose-50 text-rose-600 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {summary.ownerQuestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">宠主提问</p>
                    <ul className="space-y-1">
                      {summary.ownerQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {summary.doctorActions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">医生已回复</p>
                    <ul className="space-y-1">
                      {summary.doctorActions.map((a, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">当前状态</p>
                  <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-full">
                    {summary.currentStatus}
                  </span>
                </div>
              </div>
              
              {/* Recent Records Context */}
              {context.recentRecords.length > 0 && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">相关病历记录</p>
                  <div className="space-y-1.5">
                    {context.recentRecords.map((r, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <span className="text-slate-400">{r.date}</span>
                        <span className="text-slate-700">{r.diagnosis}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reply Drafts */}
          {mode === 'reply' && replyDrafts.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                为您生成了 {replyDrafts.length} 个回复建议
              </p>
              
              {replyDrafts.map((draft, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">方案 {idx + 1}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                        {toneLabel(draft.tone)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyReply(draft.content, idx)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            复制
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleApplyReply(draft.content)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                        使用
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {draft.content}
                  </p>
                  
                  {draft.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">包含建议:</span>
                      {draft.suggestedActions.map((a, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Suggested Questions */}
          {mode === 'questions' && questions.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                建议追问以下问题以获取更多信息
              </p>
              
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${priorityClass(q.priority)}`}>
                        {q.priority === 'high' ? '优先' : q.priority === 'medium' ? '建议' : '可选'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 mb-1">{q.question}</p>
                    <p className="text-[11px] text-slate-500">目的: {q.purpose}</p>
                  </div>
                  <button
                    onClick={() => handleApplyReply(q.question)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    发送
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isProcessing && 
           ((mode === 'summary' && !summary) || 
            (mode === 'reply' && replyDrafts.length === 0) || 
            (mode === 'questions' && questions.length === 0)) && (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">
                点击下方按钮开始分析
              </p>
              <p className="text-xs text-slate-400">
                AI 将基于当前对话内容生成建议
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              AI 仅提供辅助参考，请根据专业判断调整
            </p>
            <div className="flex items-center gap-2">
              {(summary || replyDrafts.length > 0 || questions.length > 0) && (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新生成
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed rounded-lg transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {mode === 'summary' && '生成总结'}
                    {mode === 'reply' && '生成回复'}
                    {mode === 'questions' && '生成追问'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIConsultationAssistant;
