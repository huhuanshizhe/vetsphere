'use client';

import React, { useState, useEffect } from 'react';
import { getSystemInstruction, saveSystemInstruction, getAIConfig, saveAIConfig } from '@vetsphere/shared/services/gemini';

const AIBrainCenterTab: React.FC = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [aiConfig, setAiConfig] = useState({ temperature: 0.7, topP: 0.95 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSystemPrompt(getSystemInstruction());
    setAiConfig(getAIConfig());
  }, []);

  const handleSave = () => {
    saveSystemInstruction(systemPrompt);
    saveAIConfig(aiConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* System Prompt Editor */}
      <div className="bg-black/20 border border-white/5 rounded-2xl p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-slate-900 font-black text-base sm:text-lg">系统指令 (System Prompt)</h3>
            <p className="text-slate-600 text-xs mt-1">定义 AI 助手的人设、知识范围和行为边界</p>
          </div>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full min-h-[350px] sm:min-h-[400px] bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-slate-600 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
          spellCheck={false}
          placeholder="在此输入 AI 系统提示词..."
        />
      </div>

      {/* AI Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-black/20 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            温度 (Temperature): {aiConfig.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={aiConfig.temperature}
            onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-emerald-500"
          />
          <p className="text-[11px] text-slate-600 mt-2">值越高回答越有创造性，越低越严谨</p>
        </div>
        <div className="bg-black/20 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            Top-P: {aiConfig.topP}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={aiConfig.topP}
            onChange={(e) => setAiConfig(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
            className="w-full accent-emerald-500"
          />
          <p className="text-[11px] text-slate-600 mt-2">控制词汇选择的多样性</p>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all min-h-[48px] ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
        }`}
      >
        {saved ? '已发布到生产环境 ✓' : '发布更新到生产环境'}
      </button>
    </div>
  );
};

export default AIBrainCenterTab;
