'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { getGeminiResponse, DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

const AIChatPageClient: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { t, locale } = useLanguage();

  const [messages, setMessages] = useState<Message[]>(() => [{
    role: 'model',
    content: t.ai.welcome,
    timestamp: new Date()
  }]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    let rawBase64 = selectedImage ? selectedImage.split(',')[1] : '';
    const userMsg: Message = { role: 'user', content: input || '[Clinical Image]', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setSelectedImage(null);

    const { text, sources } = await getGeminiResponse(
        [...messages, userMsg], 
        input || "Analyze image", 
        DEFAULT_SYSTEM_INSTRUCTION, 
        user?.role,
        rawBase64
    );
    
    setMessages(prev => [...prev, { role: 'model', content: text, timestamp: new Date(), sources }]);
    setIsTyping(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen pt-20 sm:pt-24 md:pt-32 pb-6 sm:pb-8 px-3 sm:px-4 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col gap-4 sm:gap-6 h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-140px)]">
        
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 px-1 sm:px-2 gap-3 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-vs rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl md:text-3xl shadow-xl shadow-vs/20 shrink-0">
              👁️
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-950">{t.ai.title}</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-vs animate-pulse"></span>
                <p className="text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">{t.ai.status}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
             <button onClick={() => router.push(`/${locale}/live`)} className="btn-vs-primary !py-2 sm:!py-2.5 !px-4 sm:!px-6 !text-[10px] sm:!text-xs !rounded-lg sm:!rounded-xl !shadow-none min-h-[40px]">
               {t.ai.liveMode}
             </button>
             <button onClick={() => setMessages([{role:'model', content:t.ai.welcome, timestamp:new Date()}])} className="p-2 sm:p-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-400 hover:text-vs transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
               🔄
             </button>
          </div>
        </header>

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col relative">
          <div ref={scrollRef} className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto space-y-4 sm:space-y-6 md:space-y-8 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[95%] sm:max-w-[90%] md:max-w-[80%] space-y-1 sm:space-y-2`}>
                  <div className={`p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-medium leading-relaxed ${
                    msg.role === 'user' ? 'bg-vs text-white shadow-lg shadow-vs/20' : 'bg-slate-50 text-slate-800 border border-slate-100'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="markdown-body prose prose-slate max-w-none prose-sm sm:prose-base">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {msg.sources && (
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200/30 flex flex-col gap-1.5 sm:gap-2">
                            {msg.sources.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" className="text-xs font-bold text-vs/80 hover:underline flex items-center gap-2">
                                    <span className="w-1 h-1 bg-vs rounded-full shrink-0"></span> <span className="truncate">{s.title}</span>
                                </a>
                            ))}
                        </div>
                    )}
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase px-2 sm:px-4">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {isTyping && <div className="flex gap-1.5 sm:gap-2 p-3 sm:p-4 bg-slate-50 w-16 sm:w-20 rounded-xl sm:rounded-2xl justify-center"><div className="w-1 h-1 bg-vs rounded-full animate-bounce"></div><div className="w-1 h-1 bg-vs rounded-full animate-bounce delay-100"></div><div className="w-1 h-1 bg-vs rounded-full animate-bounce delay-200"></div></div>}
          </div>

          <div className="p-3 sm:p-6 md:p-8 bg-slate-50/80 border-t border-slate-100 shrink-0">
            {selectedImage && (
              <div className="mb-3 sm:mb-4 flex items-center gap-3 sm:gap-4 bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-vs/20 animate-in slide-in-from-bottom-2">
                <img src={selectedImage} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover shadow-sm" />
                <p className="text-[10px] sm:text-xs font-black text-vs uppercase tracking-widest">{t.ai.analyzing}</p>
                <button onClick={() => setSelectedImage(null)} className="ml-auto p-1.5 sm:p-2 text-slate-300 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center">✕</button>
              </div>
            )}
            <div className="flex gap-2 sm:gap-3">
              <label className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl border border-slate-200 cursor-pointer shadow-sm hover:border-vs transition-all shrink-0 min-h-[44px]">
                <input type="file" className="hidden" onChange={handleImageSelect} />
                📸
              </label>
              <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={t.ai.placeholder}
                    className="w-full h-11 sm:h-14 md:h-16 bg-white px-4 sm:px-6 md:px-8 pr-12 sm:pr-14 md:pr-16 rounded-lg sm:rounded-xl border border-slate-200 outline-none focus:border-vs font-bold text-slate-800 shadow-sm text-sm sm:text-base"
                  />
                  <button onClick={handleSend} className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-vs text-white rounded-md sm:rounded-lg flex items-center justify-center text-base sm:text-xl shadow-lg hover:bg-vs-dark transition-all min-h-[32px]">
                    ↑
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPageClient;
