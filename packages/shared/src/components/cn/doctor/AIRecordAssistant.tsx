'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, ChevronRight, FileText, ClipboardCheck, Mic, Wand2,
  CheckCircle2, AlertCircle, ArrowRight, Copy, Loader2, MessageSquare,
  PenLine, Info, RefreshCw,
} from 'lucide-react';

// ─── Types ───
type AssistantMode = 'input' | 'check' | 'summary';

interface RecordFormData {
  chiefComplaint: string;
  symptoms: string;
  examResult: string;
  diagnosis: string;
  treatment: string;
  medication: string;
  revisitAdvice: string;
}

interface ExtractedField {
  field: keyof RecordFormData;
  label: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

interface CompletenessItem {
  field: string;
  status: 'complete' | 'missing' | 'incomplete';
  suggestion?: string;
}

interface AIRecordAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RecordFormData;
  onApplyField: (field: keyof RecordFormData, value: string) => void;
  onApplyAll: (data: Partial<RecordFormData>) => void;
}

// ─── Field Labels ───
const FIELD_LABELS: Record<keyof RecordFormData, string> = {
  chiefComplaint: '主诉',
  symptoms: '当前表现/症状',
  examResult: '检查结果',
  diagnosis: '初步判断',
  treatment: '处置方案',
  medication: '用药建议',
  revisitAdvice: '复诊建议',
};

// ─── Mode Configs ───
const MODE_CONFIG: Record<AssistantMode, { name: string; icon: React.ReactNode; description: string }> = {
  input: { 
    name: '智能录入', 
    icon: <Wand2 className="w-4 h-4" />, 
    description: '将问诊记录或口述内容转为结构化病历'
  },
  check: { 
    name: '完整性检查', 
    icon: <ClipboardCheck className="w-4 h-4" />, 
    description: '检查当前病历是否存在缺漏'
  },
  summary: { 
    name: '内容润色', 
    icon: <PenLine className="w-4 h-4" />, 
    description: '优化病历表述，使其更规范专业'
  },
};

// ─── Sample Prompts ───
const SAMPLE_PROMPTS: Record<AssistantMode, string[]> = {
  input: [
    '金毛犬豆豆，跛行两周，活动后加重。查体右后肢肌肉萎缩，膝关节不稳定，抽屉试验阳性。初步考虑前十字韧带断裂，建议TPLO手术。',
    '英短小白，背部脱毛伴瘙痒一周。伍德灯阳性，疑似猫癣，开伊曲康唑和外用抗真菌药。',
  ],
  check: [
    '检查当前病历的完整性',
    '分析有哪些必填项还未填写',
  ],
  summary: [
    '优化主诉和检查结果的表述',
    '使诊断和处置方案更加规范专业',
  ],
};

// ─── Simulate AI Response ───
function simulateExtraction(rawText: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  
  // 主诉提取
  if (rawText.includes('跛行') || rawText.includes('脱毛') || rawText.includes('呕吐') || rawText.includes('咳嗽')) {
    const chiefComplaint = rawText.match(/[\u4e00-\u9fa5]+(?:犬|猫)[\u4e00-\u9fa5]+，[^。]+/)?.[0] || '';
    if (chiefComplaint) {
      fields.push({ field: 'chiefComplaint', label: '主诉', value: chiefComplaint, confidence: 'high' });
    }
  }
  
  // 检查结果提取
  if (rawText.includes('查体') || rawText.includes('检查') || rawText.includes('阳性') || rawText.includes('阴性')) {
    const examPart = rawText.match(/查体[^。]*|检查[^。]*|[^，。]*阳性[^。]*/)?.[0] || '';
    if (examPart) {
      fields.push({ field: 'examResult', label: '检查结果', value: examPart, confidence: 'medium' });
    }
  }
  
  // 诊断提取
  if (rawText.includes('考虑') || rawText.includes('疑似') || rawText.includes('诊断')) {
    const diagPart = rawText.match(/(?:初步)?考虑[^，。]*|疑似[^，。]*|诊断[^，。]*/)?.[0] || '';
    if (diagPart) {
      fields.push({ field: 'diagnosis', label: '初步判断', value: diagPart.replace(/^(?:初步)?考虑|疑似/, ''), confidence: 'medium' });
    }
  }
  
  // 处置提取
  if (rawText.includes('建议') || rawText.includes('手术') || rawText.includes('治疗') || rawText.includes('开')) {
    const treatPart = rawText.match(/建议[^。]*|手术[^。]*|开[^。]*/)?.[0] || '';
    if (treatPart) {
      fields.push({ field: 'treatment', label: '处置方案', value: treatPart, confidence: 'high' });
    }
  }
  
  // 用药提取
  if (rawText.includes('伊曲康唑') || rawText.includes('抗真菌') || rawText.includes('消炎') || rawText.includes('止痛')) {
    const medPart = rawText.match(/(?:开)?[^，。]*(?:伊曲康唑|抗真菌|消炎|止痛)[^。]*/)?.[0] || '';
    if (medPart) {
      fields.push({ field: 'medication', label: '用药建议', value: medPart.replace(/^开/, ''), confidence: 'high' });
    }
  }
  
  // 模拟症状提取
  if (rawText.includes('表现') || rawText.includes('症状')) {
    const symptomPart = rawText.match(/表现[^。]*|症状[^。]*/)?.[0] || '';
    if (symptomPart) {
      fields.push({ field: 'symptoms', label: '当前表现', value: symptomPart, confidence: 'low' });
    }
  }
  
  // 如果没提取到任何内容，生成模拟数据
  if (fields.length === 0 && rawText.length > 10) {
    fields.push({ 
      field: 'chiefComplaint', 
      label: '主诉', 
      value: rawText.slice(0, Math.min(50, rawText.length)), 
      confidence: 'medium' 
    });
  }
  
  return fields;
}

function simulateCompletenessCheck(formData: RecordFormData): CompletenessItem[] {
  const items: CompletenessItem[] = [];
  
  // 主诉检查
  if (!formData.chiefComplaint) {
    items.push({ field: '主诉', status: 'missing', suggestion: '主诉是病历的核心，建议补充宠物就诊原因' });
  } else if (formData.chiefComplaint.length < 10) {
    items.push({ field: '主诉', status: 'incomplete', suggestion: '主诉内容较简短，建议补充症状持续时间、严重程度等信息' });
  } else {
    items.push({ field: '主诉', status: 'complete' });
  }
  
  // 检查结果
  if (!formData.examResult) {
    items.push({ field: '检查结果', status: 'missing', suggestion: '建议记录体格检查、实验室检查等结果' });
  } else {
    items.push({ field: '检查结果', status: 'complete' });
  }
  
  // 诊断
  if (!formData.diagnosis) {
    items.push({ field: '初步判断', status: 'missing', suggestion: '建议记录初步诊断或鉴别诊断' });
  } else {
    items.push({ field: '初步判断', status: 'complete' });
  }
  
  // 处置方案
  if (!formData.treatment) {
    items.push({ field: '处置方案', status: 'missing', suggestion: '建议记录本次诊疗的处置措施' });
  } else {
    items.push({ field: '处置方案', status: 'complete' });
  }
  
  // 用药建议
  if (!formData.medication && formData.treatment) {
    items.push({ field: '用药建议', status: 'incomplete', suggestion: '如有用药，建议补充药物名称、剂量、用法' });
  } else if (formData.medication) {
    items.push({ field: '用药建议', status: 'complete' });
  }
  
  // 复诊建议
  if (!formData.revisitAdvice) {
    items.push({ field: '复诊建议', status: 'incomplete', suggestion: '建议说明是否需要复诊及注意事项' });
  } else {
    items.push({ field: '复诊建议', status: 'complete' });
  }
  
  return items;
}

function simulatePolish(formData: RecordFormData): Partial<RecordFormData> {
  const result: Partial<RecordFormData> = {};
  
  if (formData.chiefComplaint) {
    result.chiefComplaint = formData.chiefComplaint
      .replace(/两周/, '约2周')
      .replace(/一周/, '约1周')
      .replace(/几天/, '数日');
  }
  
  if (formData.diagnosis) {
    result.diagnosis = formData.diagnosis
      .replace(/疑似/, '初步考虑')
      .replace(/可能是/, '倾向于');
  }
  
  if (formData.treatment) {
    result.treatment = formData.treatment
      .replace(/建议/, '治疗方案：');
  }
  
  return result;
}

// ─── Main Component ───
export function AIRecordAssistant({ 
  isOpen, 
  onClose, 
  formData, 
  onApplyField, 
  onApplyAll 
}: AIRecordAssistantProps) {
  const [mode, setMode] = useState<AssistantMode>('input');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [completenessItems, setCompletenessItems] = useState<CompletenessItem[]>([]);
  const [polishedData, setPolishedData] = useState<Partial<RecordFormData> | null>(null);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when mode changes
  useEffect(() => {
    setExtractedFields([]);
    setCompletenessItems([]);
    setPolishedData(null);
    setAppliedFields(new Set());
    setInputText('');
  }, [mode]);

  const handleProcess = async () => {
    setIsProcessing(true);
    setAppliedFields(new Set());
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    if (mode === 'input') {
      const extracted = simulateExtraction(inputText);
      setExtractedFields(extracted);
    } else if (mode === 'check') {
      const items = simulateCompletenessCheck(formData);
      setCompletenessItems(items);
    } else if (mode === 'summary') {
      const polished = simulatePolish(formData);
      setPolishedData(polished);
    }
    
    setIsProcessing(false);
  };

  const handleApplyField = (field: keyof RecordFormData, value: string) => {
    onApplyField(field, value);
    setAppliedFields(prev => new Set(prev).add(field));
  };

  const handleApplyAll = () => {
    if (mode === 'input' && extractedFields.length > 0) {
      const data: Partial<RecordFormData> = {};
      extractedFields.forEach(f => {
        data[f.field] = f.value;
      });
      onApplyAll(data);
      setAppliedFields(new Set(extractedFields.map(f => f.field)));
    } else if (mode === 'summary' && polishedData) {
      onApplyAll(polishedData);
      setAppliedFields(new Set(Object.keys(polishedData)));
    }
  };

  const confidenceClass = (c: 'high' | 'medium' | 'low') => {
    if (c === 'high') return 'text-emerald-600 bg-emerald-50';
    if (c === 'medium') return 'text-amber-600 bg-amber-50';
    return 'text-slate-500 bg-slate-100';
  };

  const statusIcon = (s: 'complete' | 'missing' | 'incomplete') => {
    if (s === 'complete') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === 'missing') return <AlertCircle className="w-4 h-4 text-rose-500" />;
    return <Info className="w-4 h-4 text-amber-500" />;
  };

  if (!isOpen) return null;

  const missingCount = completenessItems.filter(i => i.status === 'missing').length;
  const incompleteCount = completenessItems.filter(i => i.status === 'incomplete').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI 病历助手</h2>
              <p className="text-[11px] text-slate-500">辅助录入，提升效率</p>
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
                  ? 'bg-white text-violet-700 shadow-sm border border-violet-200' 
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
          <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-50/70 rounded-lg border border-violet-100">
            <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
            <p className="text-xs text-violet-700">{MODE_CONFIG[mode].description}</p>
          </div>

          {/* Input Area */}
          {mode === 'input' && (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="粘贴问诊记录、口述内容或任何非结构化的诊疗信息..."
                  className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="语音输入">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Sample Prompts */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-400 font-medium">示例输入:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PROMPTS.input.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(p)}
                      className="px-2.5 py-1.5 text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors truncate max-w-xs"
                    >
                      {p.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Check Mode - Current Status */}
          {mode === 'check' && !isProcessing && completenessItems.length === 0 && (
            <div className="text-center py-8">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">点击下方按钮检查当前病历完整性</p>
              <p className="text-xs text-slate-400">AI 将分析已填写的字段并给出补充建议</p>
            </div>
          )}

          {/* Summary Mode - Current Content */}
          {mode === 'summary' && !isProcessing && !polishedData && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500 mb-2">当前病历内容预览:</div>
              {Object.entries(formData).filter(([_, v]) => v).length === 0 ? (
                <div className="text-center py-8">
                  <PenLine className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">当前病历尚无内容</p>
                  <p className="text-xs text-slate-400">请先填写病历信息后再使用内容润色功能</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(formData).filter(([_, v]) => v).map(([key, value]) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-medium text-slate-400 mb-1">
                        {FIELD_LABELS[key as keyof RecordFormData]}
                      </p>
                      <p className="text-xs text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
              <p className="text-sm text-slate-600 font-medium">AI 正在分析...</p>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'input' && '正在提取结构化信息'}
                {mode === 'check' && '正在检查病历完整性'}
                {mode === 'summary' && '正在优化表述'}
              </p>
            </div>
          )}

          {/* Extraction Results */}
          {mode === 'input' && extractedFields.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  已提取 {extractedFields.length} 个字段
                </p>
                <button
                  onClick={handleApplyAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  全部应用
                </button>
              </div>
              
              <div className="space-y-2">
                {extractedFields.map((field, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border transition-all ${
                      appliedFields.has(field.field) 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{field.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceClass(field.confidence)}`}>
                          {field.confidence === 'high' ? '高置信' : field.confidence === 'medium' ? '中置信' : '低置信'}
                        </span>
                      </div>
                      {appliedFields.has(field.field) ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          已应用
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyField(field.field, field.value)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
                          应用
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completeness Check Results */}
          {mode === 'check' && completenessItems.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {missingCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    {missingCount} 项缺失
                  </span>
                )}
                {incompleteCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-600 bg-amber-50 rounded-full">
                    <Info className="w-3 h-3" />
                    {incompleteCount} 项待完善
                  </span>
                )}
                {missingCount === 0 && incompleteCount === 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    病历完整
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {completenessItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border ${
                      item.status === 'complete' 
                        ? 'bg-emerald-50/30 border-emerald-100' 
                        : item.status === 'missing' 
                          ? 'bg-rose-50/30 border-rose-100' 
                          : 'bg-amber-50/30 border-amber-100'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{statusIcon(item.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700">{item.field}</p>
                        {item.suggestion && (
                          <p className="text-[11px] text-slate-500 mt-1">{item.suggestion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Polish Results */}
          {mode === 'summary' && polishedData && Object.keys(polishedData).length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  优化了 {Object.keys(polishedData).length} 个字段
                </p>
                <button
                  onClick={handleApplyAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  全部应用
                </button>
              </div>
              
              <div className="space-y-2">
                {Object.entries(polishedData).map(([key, value]) => (
                  <div 
                    key={key} 
                    className={`p-3 rounded-xl border transition-all ${
                      appliedFields.has(key) 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">
                        {FIELD_LABELS[key as keyof RecordFormData]}
                      </span>
                      {appliedFields.has(key) ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          已应用
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyField(key as keyof RecordFormData, value as string)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
                          应用
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-400">原文:</div>
                      <p className="text-xs text-slate-500 line-through">
                        {formData[key as keyof RecordFormData]}
                      </p>
                      <div className="text-[10px] text-violet-500">优化后:</div>
                      <p className="text-xs text-slate-700">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              AI 仅提供辅助，最终内容由医生确认
            </p>
            <div className="flex items-center gap-2">
              {(extractedFields.length > 0 || completenessItems.length > 0 || polishedData) && (
                <button
                  onClick={() => {
                    setExtractedFields([]);
                    setCompletenessItems([]);
                    setPolishedData(null);
                    setAppliedFields(new Set());
                    setInputText('');
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新开始
                </button>
              )}
              <button
                onClick={handleProcess}
                disabled={isProcessing || (mode === 'input' && !inputText.trim())}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed rounded-lg transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {mode === 'input' && '开始提取'}
                    {mode === 'check' && '检查完整性'}
                    {mode === 'summary' && '优化内容'}
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

export default AIRecordAssistant;
