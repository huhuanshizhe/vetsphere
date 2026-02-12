
import React, { useState, useEffect } from 'react';
import { Specialty, Post } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getGeminiResponse, DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { useLanguage } from '../context/LanguageContext';

const Community: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpecialty, setActiveSpecialty] = useState<Specialty | 'All'>('All');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPublisher, setShowPublisher] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  // Post Form State
  const [form, setForm] = useState({
    title: '',
    content: '',
    specialty: Specialty.ORTHOPEDICS,
    species: 'Canine',
    age: '',
    weight: '',
    diagnosis: '',
    plan: '',
    outcome: '',
    media: [] as { type: 'image' | 'video'; url: string }[]
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const data = await api.getPosts();
    setPosts(data);
    setLoading(false);
  };

  const handleLike = (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsLiked(prev => ({ ...prev, [postId]: !prev[postId] }));
    api.interactWithPost(postId, 'like');
    // UI-only increment for demo
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, stats: { ...p.stats, likes: p.stats.likes + (isLiked[postId] ? -1 : 1) } } : p));
  };

  const handleShare = (post: Post, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${post.title} - Check this clinical case on VetSphere: ${window.location.href}`);
      alert('Link copied to clipboard!');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       const files = Array.from(e.target.files);
       const mediaPromises = files.map(file => new Promise<{ type: 'image' | 'video', url: string }>((resolve) => {
           const reader = new FileReader();
           reader.onload = (ev) => {
               const type = file.type.startsWith('video') ? 'video' : 'image';
               resolve({ type, url: ev.target?.result as string });
           };
           reader.readAsDataURL(file);
       }));
       const newMedia = await Promise.all(mediaPromises);
       setForm(prev => ({ ...prev, media: [...prev.media, ...newMedia] }));
    }
  };

  const handlePublish = async () => {
    if(!form.title || !form.content || !user) return;
    const postData: Partial<Post> = {
      title: form.title, content: form.content, specialty: form.specialty,
      media: form.media, author: { name: user.name || 'User', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&h=100&q=80', level: user.role, hospital: 'Veterinary Surgical Center' },
      patientInfo: { species: form.species, age: form.age, weight: form.weight },
      sections: { diagnosis: form.diagnosis, plan: form.plan, outcome: form.outcome }
    };
    await api.createPost(postData, user);
    await fetchPosts();
    setShowPublisher(false);
    resetForm();
  };

  const submitComment = () => {
    if (!commentInput.trim() || !user) return;
    const newComment = { id: Date.now(), author: user.name, content: commentInput, date: 'Just now' };
    setComments([newComment, ...comments]);
    setCommentInput('');
    api.addComment(selectedPost!.id, newComment);
  };

  const resetForm = () => {
    setForm({ title: '', content: '', specialty: Specialty.ORTHOPEDICS, species: 'Canine', age: '', weight: '', diagnosis: '', plan: '', outcome: '', media: [] });
  };

  const runAiAnalysis = async (post: Post) => {
    setIsAiAnalyzing(true);
    setAiResponse(null);
    const prompt = `Analyze this clinical case as a senior veterinary surgeon. Title: ${post.title}. Specialty: ${post.specialty}. Provide surgical risk assessment and implant recommendations.`;
    const { text } = await getGeminiResponse([], prompt, DEFAULT_SYSTEM_INSTRUCTION);
    setAiResponse(text);
    setIsAiAnalyzing(false);
  };

  const filteredPosts = activeSpecialty === 'All' ? posts : posts.filter(p => p.specialty === activeSpecialty);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
        
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t.community.title}</h1>
              <p className="text-slate-500 font-medium">{t.community.subtitle}</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              {['All', ...Object.values(Specialty)].slice(0, 5).map(s => (
                <button 
                  key={s} onClick={() => setActiveSpecialty(s as any)}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSpecialty === s ? 'bg-vs text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {s === 'All' ? t.courses.allSpecialties : s}
                </button>
              ))}
              <div className="w-px h-6 bg-slate-100 mx-2 hidden sm:block"></div>
              <button onClick={() => setShowPublisher(true)} className="bg-vs text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-vs/20 hover:scale-105 transition-all">
                {t.community.newCase}
              </button>
            </div>
          </div>

          {loading ? (
             <div className="py-40 flex justify-center"><div className="w-10 h-10 border-4 border-vs border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredPosts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => { setSelectedPost(post); setAiResponse(null); setComments([]); }}
                  className="vs-card-refined p-8 bg-white flex flex-col group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <img src={post.author.avatar} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{post.author.name}</h4>
                        <p className="text-[9px] text-vs font-black uppercase">{post.author.level}</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleShare(post, e)} className="p-2 text-slate-300 hover:text-vs transition-colors">📤</button>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-vs transition-colors">{post.title}</h3>
                  <div className="flex gap-2 mb-6">
                     <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase tracking-widest">{post.specialty}</span>
                  </div>

                  {post.media.length > 0 && (
                    <div className="aspect-video rounded-2xl bg-slate-100 overflow-hidden mb-6">
                      <img src={post.media[0].url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                    <div className="flex gap-5">
                      <button onClick={(e) => handleLike(post.id, e)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isLiked[post.id] ? 'text-red-500' : 'text-slate-400'}`}>
                        <span>{isLiked[post.id] ? '❤️' : '🤍'}</span> {post.stats.likes}
                      </button>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <span>💬</span> {post.stats.comments}
                      </div>
                    </div>
                    {post.isAiAnalyzed && <span className="text-[9px] font-black text-vs uppercase flex items-center gap-1">✨ AI analyzed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-80 shrink-0 space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">{t.community.trending}</h4>
                <div className="space-y-6">
                    {[
                        { name: 'Dr. Zhang', role: 'Orthopedics Expert', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80', cases: 142 },
                        { name: 'Dr. Emily Smith', role: 'Neuro Surgeon', avatar: 'https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&q=80', cases: 89 },
                        { name: 'Dr. Chen', role: 'Soft Tissue', avatar: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=100&q=80', cases: 65 },
                    ].map(exp => (
                        <div key={exp.name} className="flex items-center gap-4 group">
                            <img src={exp.avatar} className="w-10 h-10 rounded-xl object-cover" />
                            <div className="flex-1">
                                <p className="text-xs font-black text-slate-900">{exp.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{exp.role}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-vs">{exp.cases}</p>
                                <p className="text-[8px] text-slate-300 font-bold uppercase">{t.community.cases}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-8 py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-vs transition-all">{t.community.viewMembers}</button>
            </div>

            <div className="p-8 bg-slate-900 rounded-[32px] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🎓</div>
                <h5 className="text-[10px] font-black text-vs uppercase tracking-widest mb-2">{t.community.certPath}</h5>
                <p className="text-xs font-medium text-slate-400 mb-6">{t.community.certDesc}</p>
                <button className="w-full py-3 bg-vs text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-vs/20">{t.community.learnMore}</button>
            </div>
        </aside>
      </div>

      {/* Case Detail Drawer */}
      {selectedPost && (
        <div className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-6xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-slate-50 rounded-lg">✕</button>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 truncate max-w-md">{selectedPost.title}</h2>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => handleShare(selectedPost)} className="p-3 border rounded-xl hover:bg-slate-50">📤</button>
                    <button onClick={() => runAiAnalysis(selectedPost)} disabled={isAiAnalyzing} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                      {isAiAnalyzing ? t.community.analyzing : t.community.runAi}
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid lg:grid-cols-12 h-full">
                   <div className="lg:col-span-8 p-6 md:p-12 space-y-12">
                      <div className="grid grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[32px]">
                         {[
                           { label: t.community.species, val: selectedPost.patientInfo?.species || 'N/A', icon: '🐾' },
                           { label: t.community.age, val: selectedPost.patientInfo?.age || 'N/A', icon: '🎂' },
                           { label: t.community.weight, val: selectedPost.patientInfo?.weight || 'N/A', icon: '⚖️' },
                         ].map(item => (
                           <div key={item.label}>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{item.label}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm font-black text-slate-900">{item.val}</span>
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className="space-y-12">
                         <section>
                            <h4 className="text-[10px] font-black text-vs uppercase tracking-widest mb-6">{t.community.clinicalBackground}</h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                         </section>
                         {selectedPost.sections?.diagnosis && (
                           <section>
                              <h4 className="text-[10px] font-black text-vs uppercase tracking-widest mb-4">{t.community.diagnosis}</h4>
                              <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-sm font-bold text-slate-800 italic">{selectedPost.sections.diagnosis}</div>
                           </section>
                         )}
                         {selectedPost.media.length > 0 && (
                           <section>
                              <h4 className="text-[10px] font-black text-vs uppercase tracking-widest mb-6">{t.community.gallery}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                 {selectedPost.media.map((m, i) => (
                                   <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-slate-100"><img src={m.url} className="w-full h-full object-cover" /></div>
                                 ))}
                              </div>
                           </section>
                         )}
                      </div>

                      {/* Comment System UI */}
                      <section className="pt-12 border-t border-slate-100">
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8">{t.community.discussion} ({comments.length + selectedPost.stats.comments})</h4>
                         
                         <div className="flex gap-4 mb-10">
                            <div className="w-10 h-10 rounded-full bg-vs flex items-center justify-center text-white font-bold">VS</div>
                            <div className="flex-1 relative">
                               <input 
                                 type="text" 
                                 value={commentInput}
                                 onChange={e => setCommentInput(e.target.value)}
                                 placeholder={t.community.addComment}
                                 className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium pr-16"
                               />
                               <button onClick={submitComment} className="absolute right-2 top-2 h-10 px-4 bg-vs text-white rounded-xl text-[10px] font-black uppercase">{t.community.postComment}</button>
                            </div>
                         </div>

                         <div className="space-y-8">
                            {comments.map(c => (
                              <div key={c.id} className="flex gap-4">
                                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 uppercase text-xs">{c.author.charAt(0)}</div>
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="text-sm font-black text-slate-900">{c.author}</span>
                                       <span className="text-[9px] text-slate-300 uppercase font-bold">{c.date}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{c.content}</p>
                                 </div>
                              </div>
                            ))}
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End of thread</p>
                            </div>
                         </div>
                      </section>
                   </div>

                   <div className="lg:col-span-4 bg-slate-50/50 p-8 md:p-12 border-l border-slate-100 space-y-10">
                      <div className="bg-white p-8 rounded-3xl border border-vs/20 shadow-xl">
                         <h5 className="text-[10px] font-black text-vs uppercase tracking-widest mb-4">{t.community.aiAnalysis}</h5>
                         {aiResponse ? (
                           <div className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
                         ) : isAiAnalyzing ? (
                           <div className="flex flex-col items-center py-10"><div className="w-8 h-8 border-2 border-vs border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-[9px] font-black text-slate-400 uppercase">{t.community.analyzing}</p></div>
                         ) : (
                           <p className="text-xs text-slate-400 font-medium italic">Run AI analysis to get risk scores and technique peer-review.</p>
                         )}
                      </div>

                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.community.author}</h5>
                         <div className="flex items-center gap-4">
                            <img src={selectedPost.author.avatar} className="w-14 h-14 rounded-2xl object-cover" />
                            <div><p className="font-black text-slate-900">{selectedPost.author.name}</p><p className="text-[9px] text-vs font-black uppercase">{selectedPost.author.level}</p></div>
                         </div>
                         <button className="w-full py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">{t.community.follow}</button>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Post Publisher */}
      {showPublisher && (
        <div className="fixed inset-0 z-[400] bg-slate-950/90 flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black text-slate-900">{t.community.publishTitle}</h2>
                 <button onClick={() => setShowPublisher(false)}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                       <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Patient condition summary..." />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialty</label>
                       <select value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value as any})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold">
                         {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-vs uppercase tracking-widest">Description</label>
                    <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full h-32 p-4 bg-slate-50 border rounded-2xl font-medium" placeholder={t.community.publishDesc} />
                 </div>
                 <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.community.uploadMedia}</label>
                    <div className="grid grid-cols-4 gap-4">
                       {form.media.map((m, idx) => (
                         <div key={idx} className="aspect-square rounded-2xl overflow-hidden relative"><img src={m.url} className="w-full h-full object-cover" /></div>
                       ))}
                       <label className="aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                          <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                          <span className="text-2xl">📸</span>
                       </label>
                    </div>
                 </div>
              </div>
              <div className="p-8 border-t bg-slate-50 flex gap-4">
                 <button onClick={() => setShowPublisher(false)} className="flex-1 text-[10px] font-black uppercase text-slate-400">{t.community.cancel}</button>
                 <button onClick={handlePublish} className="flex-[2] py-4 bg-vs text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">{t.community.publishBtn}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Community;
