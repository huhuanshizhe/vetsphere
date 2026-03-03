'use client';

/**
 * 中国站 AI 助手中心
 * 
 * 从空白聊天页升级为任务化 AI 能力中心
 * 
 * 核心能力：
 * 1. 临床分析 - 病历整理、信息提取、风险提示
 * 2. 学习助教 - 课程推荐、学习路径规划
 * 3. 采购顾问 - 设备选品、方案配置
 * 4. 问诊助手 - 咨询总结、回复草稿
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Stethoscope, GraduationCap, ShoppingCart, MessageCircle,
  FileText, TrendingUp, Search, Send, Image, Mic, X,
  ChevronRight, AlertTriangle, CheckCircle2, Sparkles,
  ClipboardList, Target, Users, Building2, ArrowRight,
  History, BookOpen, Package, Brain, Lightbulb, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getGeminiResponse } from '../../services/gemini';
import { Message } from '../../types';

// ============================================================================
// 类型定义
// ============================================================================

type AIMode = 'clinical' | 'learning' | 'shopping' | 'consultation';

interface TaskCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  mode: AIMode;
  prompt?: string;
}

interface AIResult {
  type: 'clinical' | 'learning' | 'shopping' | 'consultation' | 'general';
  summary?: string;
  sections?: {
    title: string;
    content: string;
    type?: 'info' | 'warning' | 'success' | 'action';
  }[];
  recommendations?: {
    id: string;
    title: string;
    description: string;
    href?: string;
    tag?: string;
  }[];
  actions?: {
    label: string;
    href?: string;
    primary?: boolean;
  }[];
  disclaimer?: string;
}

// ============================================================================
// 常量配置
// ============================================================================

const MODE_CONFIG: Record<AIMode, {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  clinical: {
    name: '临床分析',
    description: '病历整理、信息提取、风险提示',
    icon: <Stethoscope className="w-5 h-5" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  learning: {
    name: '学习助教',
    description: '课程推荐、学习路径、知识解答',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  shopping: {
    name: '采购顾问',
    description: '设备选品、方案配置、预算规划',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  consultation: {
    name: '问诊助手',
    description: '咨询总结、回复草稿、追问建议',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
};

const TASK_CARDS: TaskCard[] = [
  {
    id: 'record-assist',
    title: '病历结构化整理',
    description: '将描述性文字整理为标准病历结构',
    icon: <ClipboardList className="w-6 h-6" />,
    mode: 'clinical',
    prompt: '请帮我将以下病例信息整理为结构化病历格式，包括主诉、现病史、检查结果、初步判断和建议。',
  },
  {
    id: 'record-check',
    title: '病历完整性检查',
    description: '检查病历是否缺失关键信息',
    icon: <FileText className="w-6 h-6" />,
    mode: 'clinical',
    prompt: '请检查以下病历内容的完整性，指出可能缺失的关键信息和需要补充的检查项目。',
  },
  {
    id: 'course-recommend',
    title: '按阶段推荐课程',
    description: '根据职业阶段推荐学习路径',
    icon: <TrendingUp className="w-6 h-6" />,
    mode: 'learning',
    prompt: '请根据我的职业阶段和学习目标，推荐适合的课程和学习顺序。',
  },
  {
    id: 'course-path',
    title: '专科方向学习路径',
    description: '规划特定专科的系统学习路径',
    icon: <Target className="w-6 h-6" />,
    mode: 'learning',
    prompt: '请帮我规划专科方向的系统学习路径，包括基础课程、进阶课程和实操训练。',
  },
  {
    id: 'shop-scene',
    title: '按场景推荐设备',
    description: '根据使用场景推荐合适的器械',
    icon: <Package className="w-6 h-6" />,
    mode: 'shopping',
    prompt: '请根据我的临床场景需求，推荐合适的器械和耗材。',
  },
  {
    id: 'shop-budget',
    title: '按预算配置方案',
    description: '在预算内推荐最优配置',
    icon: <Building2 className="w-6 h-6" />,
    mode: 'shopping',
    prompt: '请根据我的预算范围，推荐性价比最高的设备配置方案。',
  },
  {
    id: 'consult-summary',
    title: '问诊内容总结',
    description: '整理咨询记录生成摘要',
    icon: <MessageCircle className="w-6 h-6" />,
    mode: 'consultation',
    prompt: '请帮我总结以下问诊内容，提取关键信息并生成结构化摘要。',
  },
  {
    id: 'consult-reply',
    title: '生成回复草稿',
    description: '根据问诊内容生成专业回复',
    icon: <Users className="w-6 h-6" />,
    mode: 'consultation',
    prompt: '请根据问诊内容，帮我生成一份专业且易懂的回复草稿。',
  },
];

// ============================================================================
// 系统指令
// ============================================================================

const SYSTEM_INSTRUCTIONS: Record<AIMode, string> = {
  clinical: `你是一位专业的兽医临床分析助手。你的职责是：
1. 帮助医生整理和结构化病历信息
2. 检查病历完整性，提醒可能缺失的关键信息
3. 提供临床分析的参考建议
4. 标注可能需要关注的风险点

重要提示：
- 你只提供辅助分析，不替代医生的临床判断
- 所有建议仅供参考，最终决策由医生做出
- 涉及诊断和治疗时必须明确这是辅助性建议

输出格式要求：
- 使用结构化的 Markdown 格式
- 包含：信息摘要、关注要点、缺失信息、建议下一步
- 在结尾添加辅助声明`,

  learning: `你是一位专业的宠物医生学习助教。你的职责是：
1. 根据医生的阶段和目标推荐合适的课程
2. 规划系统的学习路径
3. 解答学习过程中的疑问
4. 提供专科方向的发展建议

医生成长阶段包括：考证入行、临床基础、专科进阶、高端实操、事业发展

输出格式要求：
- 使用结构化的 Markdown 格式
- 包含：阶段判断、推荐课程、学习顺序、推荐理由
- 提供可执行的下一步建议`,

  shopping: `你是一位专业的宠物医疗设备采购顾问。你的职责是：
1. 根据临床场景推荐合适的器械和耗材
2. 根据预算提供最优配置方案
3. 区分必需项、可延后项和升级项
4. 关联相关课程帮助医生更好地使用设备

诊所发展阶段包括：新开业、基础接诊型、稳定经营型、专科升级型、品牌扩张型

输出格式要求：
- 使用结构化的 Markdown 格式
- 包含：需求理解、推荐方案、优先级说明、关联课程
- 提供具体的产品类别建议`,

  consultation: `你是一位专业的在线问诊助手。你的职责是：
1. 总结宠物主人的咨询内容
2. 提取关键信息和需要追问的问题
3. 生成专业且易懂的回复草稿
4. 提醒需要注意的事项

重要提示：
- 你只是辅助医生整理信息和准备回复
- 不直接向宠物主人提供诊断建议
- 所有回复最终需要医生确认后发送

输出格式要求：
- 使用结构化的 Markdown 格式
- 包含：问题摘要、已知信息、待追问、回复草稿
- 区分紧急和非紧急情况`,
};

// ============================================================================
// 子组件：模式选择器
// ============================================================================

const ModeSelector: React.FC<{
  activeMode: AIMode;
  onModeChange: (mode: AIMode) => void;
}> = ({ activeMode, onModeChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {(Object.keys(MODE_CONFIG) as AIMode[]).map((mode) => {
        const config = MODE_CONFIG[mode];
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              isActive
                ? `${config.bgColor} ${config.color} ring-2 ring-offset-2 ring-current`
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {config.icon}
            {config.name}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// 子组件：任务卡片
// ============================================================================

const TaskCardGrid: React.FC<{
  activeMode: AIMode;
  onTaskSelect: (task: TaskCard) => void;
}> = ({ activeMode, onTaskSelect }) => {
  const filteredTasks = TASK_CARDS.filter(t => t.mode === activeMode);
  const config = MODE_CONFIG[activeMode];
  
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {filteredTasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onTaskSelect(task)}
          className={`text-left p-5 rounded-2xl border-2 border-transparent ${config.bgColor} hover:border-current ${config.color} transition-all group`}
        >
          <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-3 ${config.color} shadow-sm`}>
            {task.icon}
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-current">
            {task.title}
          </h3>
          <p className="text-sm text-slate-500">
            {task.description}
          </p>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 子组件：结构化结果展示
// ============================================================================

const StructuredResult: React.FC<{
  result: AIResult;
  locale: string;
}> = ({ result, locale }) => {
  const router = useRouter();
  
  return (
    <div className="space-y-6">
      {/* 摘要 */}
      {result.summary && (
        <div className="p-5 bg-slate-50 rounded-2xl">
          <p className="text-sm font-medium text-slate-700 leading-relaxed">
            {result.summary}
          </p>
        </div>
      )}
      
      {/* 分区内容 */}
      {result.sections && result.sections.length > 0 && (
        <div className="space-y-4">
          {result.sections.map((section, idx) => {
            const bgColors = {
              info: 'bg-blue-50 border-blue-100',
              warning: 'bg-amber-50 border-amber-100',
              success: 'bg-emerald-50 border-emerald-100',
              action: 'bg-purple-50 border-purple-100',
            };
            const iconColors = {
              info: 'text-blue-500',
              warning: 'text-amber-500',
              success: 'text-emerald-500',
              action: 'text-purple-500',
            };
            const icons = {
              info: <Lightbulb className="w-5 h-5" />,
              warning: <AlertTriangle className="w-5 h-5" />,
              success: <CheckCircle2 className="w-5 h-5" />,
              action: <ArrowRight className="w-5 h-5" />,
            };
            const type = section.type || 'info';
            
            return (
              <div 
                key={idx}
                className={`p-4 rounded-xl border ${bgColors[type]}`}
              >
                <div className="flex items-start gap-3">
                  <div className={iconColors[type]}>
                    {icons[type]}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 mb-1">
                      {section.title}
                    </h4>
                    <div className="text-sm text-slate-600 prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* 推荐项 */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-3">推荐</h4>
          <div className="space-y-2">
            {result.recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => rec.href && router.push(rec.href)}
                className={`flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 ${
                  rec.href ? 'cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{rec.title}</span>
                    {rec.tag && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">
                        {rec.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{rec.description}</p>
                </div>
                {rec.href && <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 动作按钮 */}
      {result.actions && result.actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {result.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => action.href && router.push(action.href)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                action.primary
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      
      {/* 辅助声明 */}
      {result.disclaimer && (
        <div className="flex items-start gap-2 p-4 bg-slate-100 rounded-xl">
          <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

const CnAICenterPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { locale } = useLanguage();
  
  const [activeMode, setActiveMode] = useState<AIMode>('clinical');
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTask, setCurrentTask] = useState<TaskCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 从 URL 参数读取模式
  useEffect(() => {
    const modeParam = searchParams.get('mode') as AIMode;
    if (modeParam && Object.keys(MODE_CONFIG).includes(modeParam)) {
      setActiveMode(modeParam);
    }
  }, [searchParams]);
  
  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // 选择任务
  const handleTaskSelect = (task: TaskCard) => {
    setCurrentTask(task);
    setInput(task.prompt || '');
  };
  
  // 图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  // 发送消息
  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const rawBase64 = selectedImage ? selectedImage.split(',')[1] : '';
    const userMsg: Message = { 
      role: 'user', 
      content: input || '[上传图片]', 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setSelectedImage(null);
    
    try {
      const { text, sources } = await getGeminiResponse(
        [...messages, userMsg],
        input || '请分析这张图片',
        SYSTEM_INSTRUCTIONS[activeMode],
        user?.role,
        rawBase64
      );
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: text, 
        timestamp: new Date(), 
        sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: '抱歉，处理您的请求时出现了问题。请稍后重试。', 
        timestamp: new Date() 
      }]);
    }
    
    setIsLoading(false);
  };
  
  // 重置对话
  const handleReset = () => {
    setMessages([]);
    setCurrentTask(null);
    setInput('');
    setSelectedImage(null);
  };
  
  const config = MODE_CONFIG[activeMode];
  
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-full text-sm font-bold text-emerald-700 mb-4">
            <Brain className="w-4 h-4" />
            AI 智能助手
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            专业任务，智能辅助
          </h1>
          <p className="text-slate-500">
            选择任务类型，获取 AI 辅助分析和建议
          </p>
        </div>
        
        {/* 模式选择 */}
        <div className="mb-6">
          <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
        </div>
        
        {/* 主内容区 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* 任务卡片（未开始对话时显示） */}
          {messages.length === 0 && (
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg ${config.bgColor} ${config.color} flex items-center justify-center`}>
                  {config.icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{config.name}</h2>
                  <p className="text-xs text-slate-400">{config.description}</p>
                </div>
              </div>
              <TaskCardGrid activeMode={activeMode} onTaskSelect={handleTaskSelect} />
            </div>
          )}
          
          {/* 对话区域 */}
          {messages.length > 0 && (
            <div 
              ref={scrollRef}
              className="h-[400px] overflow-y-auto p-6 space-y-6"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                    <div className={`p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-50 border border-slate-100'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-slate">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 mt-1 px-2">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-1.5 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 输入区 */}
          <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50">
            {/* 图片预览 */}
            {selectedImage && (
              <div className="mb-4 flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-200">
                <img 
                  src={selectedImage} 
                  alt="上传预览"
                  className="w-14 h-14 rounded-lg object-cover" 
                />
                <p className="text-xs font-bold text-emerald-600">已选择图片</p>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="ml-auto p-1.5 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* 输入框 */}
            <div className="flex gap-2">
              {/* 上传按钮 */}
              <label className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 cursor-pointer hover:border-emerald-300 hover:text-emerald-500 transition-colors shrink-0">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageSelect} 
                />
                <Image className="w-5 h-5" />
              </label>
              
              {/* 文本输入 */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={currentTask ? currentTask.title : '描述您的问题或需求...'}
                  className="w-full h-12 px-4 pr-12 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="absolute right-1.5 top-1.5 w-9 h-9 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {/* 重置按钮 */}
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 hover:border-red-200 hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* 辅助声明 */}
        <div className="mt-6 flex items-start gap-2 px-4">
          <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            AI 助手仅提供辅助分析和建议，不替代医生的临床判断与最终决策。
            涉及诊断和治疗的内容仅供参考，请结合实际情况做出专业判断。
          </p>
        </div>
        
        {/* 快捷入口 */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push(`/${locale}/doctor/records`)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">电子病历</p>
              <p className="text-xs text-slate-400">AI 辅助录入</p>
            </div>
          </button>
          <button
            onClick={() => router.push(`/${locale}/courses`)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">课程中心</p>
              <p className="text-xs text-slate-400">AI 选课助手</p>
            </div>
          </button>
          <button
            onClick={() => router.push(`/${locale}/shop`)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">临床器械与耗材</p>
              <p className="text-xs text-slate-400">AI 采购顾问</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CnAICenterPage;
