
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { getGeminiResponse, DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const AIChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
    <div className="bg-slate-50 min-h-screen pt-24 md:pt-32 pb-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col gap-6 h-[calc(100vh-140px)]">
        
        <header className="flex items-center justify-between shrink-0 px-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-vs rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-xl shadow-vs/20">
              👁️
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-950">{t.ai.title}</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-vs animate-pulse"></span>
                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">{t.ai.status}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => navigate('/live')} className="btn-vs-primary !py-2.5 !px-6 !text-xs !rounded-xl !shadow-none">
               {t.ai.liveMode}
             </button>
             <button onClick={() => setMessages([{role:'model', content:t.ai.welcome, timestamp:new Date()}])} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-vs transition-colors">
               🔄
             </button>
          </div>
        </header>

        <div className="flex-1 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col relative">
          <div ref={scrollRef} className="flex-1 p-6 md:p-10 overflow-y-auto space-y-8 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[80%] space-y-2`}>
                  <div className={`p-5 md:p-6 rounded-3xl text-sm md:text-base font-medium leading-relaxed ${
                    msg.role === 'user' ? 'bg-vs text-white shadow-lg shadow-vs/20' : 'bg-slate-50 text-slate-800 border border-slate-100'
                  }`}>
                    {msg.content}
                    {msg.sources && (
                        <div className="mt-4 pt-4 border-t border-slate-200/30 flex flex-col gap-2">
                            {msg.sources.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" className="text-xs font-bold text-vs/80 hover:underline flex items-center gap-2">
                                    <span className="w-1 h-1 bg-vs rounded-full"></span> {s.title}
                                </a>
                            ))}
                        </div>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase px-4">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {isTyping && <div className="flex gap-2 p-4 bg-slate-50 w-20 rounded-2xl justify-center"><div className="w-1 h-1 bg-vs rounded-full animate-bounce"></div><div className="w-1 h-1 bg-vs rounded-full animate-bounce delay-100"></div><div className="w-1 h-1 bg-vs rounded-full animate-bounce delay-200"></div></div>}
          </div>

          <div className="p-6 md:p-8 bg-slate-50/80 border-t border-slate-100 shrink-0">
            {selectedImage && (
              <div className="mb-4 flex items-center gap-4 bg-white p-3 rounded-2xl border border-vs/20 animate-in slide-in-from-bottom-2">
                <img src={selectedImage} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                <p className="text-xs font-black text-vs uppercase tracking-widest">{t.ai.analyzing}</p>
                <button onClick={() => setSelectedImage(null)} className="ml-auto p-2 text-slate-300 hover:text-red-500">✕</button>
              </div>
            )}
            <div className="flex gap-3">
              <label className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center text-xl border border-slate-200 cursor-pointer shadow-sm hover:border-vs transition-all shrink-0">
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
                    className="w-full h-14 md:h-16 bg-white px-6 md:px-8 rounded-xl border border-slate-200 outline-none focus:border-vs font-bold text-slate-800 shadow-sm text-base"
                  />
                  <button onClick={handleSend} className="absolute right-2 top-2 w-10 h-10 md:w-12 md:h-12 bg-vs text-white rounded-lg flex items-center justify-center text-xl shadow-lg hover:bg-vs-dark transition-all">
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

export default AIChat;
