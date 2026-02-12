
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { getGeminiResponse, DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { api } from '../services/api';

const CHAT_STORAGE_KEY = 'vetsphere_chat_history_v1';
const PROMPT_STORAGE_KEY = 'vetsphere_system_prompt_v1';

// RegEx Patterns for Detection
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}/;

const AIChat: React.FC = () => {
  // --- State: Chat History ---
  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Re-hydrate date strings back to Date objects
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    // Default welcome message
    return [{
      role: 'model',
      content: 'Hello, I am the VetSphere Intelligent Assistant. I can recommend the most suitable surgical courses, provide consultation on precision instruments, or record your custom product needs.',
      timestamp: new Date()
    }];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Persist Chat to LocalStorage whenever messages change
  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // --- CRM Lead Capture Logic ---
  const attemptLeadCapture = (text: string, currentHistory: Message[]) => {
    const emailMatch = text.match(EMAIL_REGEX);
    const phoneMatch = text.match(PHONE_REGEX);

    if (emailMatch || phoneMatch) {
        const contact = emailMatch ? emailMatch[0] : phoneMatch ? phoneMatch[0] : 'Unknown';
        
        // Contextual analysis (simple extraction of last user intent)
        const lastFewMessages = currentHistory.slice(-5).map(m => m.content).join(' || ');
        
        // Look for organization keywords nearby
        const orgKeywords = text.match(/(hospital|clinic|center|university|group|co\.|ltd)/i);
        const orgGuess = orgKeywords ? "Possible Clinic mentioned" : undefined;

        api.createLead({
            contactInfo: contact,
            interestSummary: `User shared contact. Recent Context: ${lastFewMessages.substring(0, 200)}...`,
            fullChatLog: [...currentHistory, { role: 'user', content: text, timestamp: new Date() }],
            organization: orgGuess
        });
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsTyping(true);

    // 1. Analyze for Lead Capture (Async, don't block chat)
    attemptLeadCapture(input, messages);

    // 2. AI Response
    const currentSystemInstruction = localStorage.getItem(PROMPT_STORAGE_KEY) || DEFAULT_SYSTEM_INSTRUCTION;

    const responseText = await getGeminiResponse(newHistory, input, currentSystemInstruction);
    
    const botMessage: Message = {
      role: 'model',
      content: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      const initial = [{
        role: 'model' as const,
        content: 'Session reset. You can start a new consultation.',
        timestamp: new Date()
      }];
      setMessages(initial);
      // localStorage update is handled by the useEffect dependency on 'messages'
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pt-32 pb-12 px-4 relative">
      <div className="max-w-4xl mx-auto flex flex-col h-[75vh]">
        
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-vs rounded-xl flex items-center justify-center text-2xl shadow-lg">
              🤖
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">VetSphere AI Assistant</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">AI Online</span>
              </div>
            </div>
          </div>
          <button onClick={clearHistory} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">
            Reset Chat
          </button>
        </header>

        {/* Chat Window */}
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm relative z-10">
          <div ref={scrollRef} className="flex-1 p-6 sm:p-10 overflow-y-auto space-y-8 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5`}>
                  <div className={`p-4 sm:p-5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-vs text-white rounded-tr-none' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50'
                  }`}>
                    {msg.content}
                  </div>
                  <div className={`text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? 'YOU' : 'VETSPHERE AI'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-vs animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-vs animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-vs animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <div className="max-w-3xl mx-auto flex gap-3">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about courses, instrument specs, or feedback..."
                className="flex-1 py-4 px-6 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-vs/20 focus:border-vs transition-all font-medium text-slate-700"
              />
              <button 
                onClick={handleSend}
                disabled={isTyping}
                className="bg-vs w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-black hover:bg-vs/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                ↑
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['Recommend Ortho Courses', 'TPLO Saw Specs', 'Custom Instruments Request'].map(suggestion => (
                    <button 
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1 rounded-full hover:bg-white hover:text-vs hover:border-vs transition-all"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
