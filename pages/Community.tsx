
import React, { useState } from 'react';
import { Specialty, Post } from '../types';

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-001',
    author: {
      id: 'doc-88',
      name: 'Dr. Zhang',
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&h=100&q=80',
      level: 'Expert',
      hospital: 'Beijing Central Vet'
    },
    title: 'Complication Management post-TPLO: Second Look at Medial Meniscus',
    content: '5yo Labrador presented with intermittent lameness 3 months post-TPLO. Second arthroscopic look revealed a bucket handle tear of the medial meniscus. Gait significantly improved after partial meniscectomy...',
    specialty: Specialty.ORTHOPEDICS,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=800&q=80' }
    ],
    stats: { likes: 124, comments: 18, saves: 45 },
    createdAt: '2h ago',
    isAiAnalyzed: true
  },
  {
    id: 'post-002',
    author: {
      id: 'doc-99',
      name: 'Prof. Li',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&h=100&q=80',
      level: 'Master',
      hospital: 'Royal Pet Hospital'
    },
    title: 'Exotics Ophthalmology: Rabbit Phacoemulsification Case Sharing',
    content: 'Given the extremely thin lens capsule in rabbits, pressure control is critical. Used a 2.4mm incision with a custom IOL implantation...',
    specialty: Specialty.EYE_SURGERY,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80' }
    ],
    stats: { likes: 89, comments: 5, saves: 12 },
    createdAt: '5h ago'
  }
];

const Community: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeSpecialty, setActiveSpecialty] = useState<Specialty | 'All'>('All');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPublisher, setShowPublisher] = useState(false);
  
  // Post Form State
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostSpecialty, setNewPostSpecialty] = useState<Specialty>(Specialty.ORTHOPEDICS);

  const handlePublish = () => {
    if(!newPostTitle || !newPostContent) return;
    
    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: {
        id: 'me',
        name: 'Me (Dr. User)',
        avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=100&h=100&q=80',
        level: 'Surgeon',
        hospital: 'My Clinic'
      },
      title: newPostTitle,
      content: newPostContent,
      specialty: newPostSpecialty,
      media: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80' } // Mock image
      ],
      stats: { likes: 0, comments: 0, saves: 0 },
      createdAt: 'Just now',
      isAiAnalyzed: true // Mock AI analysis
    };

    setPosts([newPost, ...posts]);
    setShowPublisher(false);
    setNewPostTitle('');
    setNewPostContent('');
    // Mock success
    alert('Case published! AI is analyzing your content...');
  };

  const filteredPosts = activeSpecialty === 'All' 
    ? posts 
    : posts.filter(p => p.specialty === activeSpecialty);

  return (
    <div className="bg-slate-50 min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Case Plaza</h1>
            <p className="text-slate-500 font-medium mt-2">Share your surgical art, advance with global surgeons.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto max-w-[200px] sm:max-w-none">
                {['All', ...Object.values(Specialty)].slice(0, 4).map(s => (
                  <button 
                    key={s} 
                    onClick={() => setActiveSpecialty(s as any)}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeSpecialty === s ? 'bg-vs text-white shadow-lg shadow-vs/20' : 'text-slate-400 hover:text-slate-900'}`}
                  >
                    {s}
                  </button>
                ))}
             </div>
             <button 
                onClick={() => setShowPublisher(true)}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2 shrink-0"
             >
                <span className="text-lg">+</span> Post Case
             </button>
          </div>
        </div>

        {/* Feed Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col gap-6 cursor-pointer group hover:shadow-2xl hover:shadow-slate-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={post.author.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-50 shadow-sm" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight flex items-center gap-2">
                      {post.author.name}
                      <span className="px-2 py-0.5 bg-vs/5 text-vs text-[8px] font-black uppercase rounded">{post.author.level}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{post.author.hospital}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-300 font-bold">{post.createdAt}</span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-black text-slate-900 group-hover:text-vs transition-colors line-clamp-1">{post.title}</h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">{post.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 h-48 rounded-3xl overflow-hidden bg-slate-100">
                 {post.media.map((m, i) => (
                   <img key={i} src={m.url} className={`w-full h-full object-cover ${post.media.length === 1 ? 'col-span-2' : ''}`} />
                 ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 group/btn">
                    <span className="text-xl group-hover/btn:scale-125 transition-transform">❤️</span>
                    <span className="text-xs font-black text-slate-400">{post.stats.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 group/btn">
                    <span className="text-xl group-hover/btn:scale-125 transition-transform">💬</span>
                    <span className="text-xs font-black text-slate-400">{post.stats.comments}</span>
                  </button>
                </div>
                {post.isAiAnalyzed && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-vs/10 rounded-full">
                     <span className="text-xs">✨</span>
                     <span className="text-[9px] font-black text-vs uppercase tracking-widest">AI Analyzed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative">
              <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-8 right-8 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-xl z-50 hover:scale-95 transition-all"
              >✕</button>

              <div className="flex-1 overflow-y-auto">
                 <div className="grid lg:grid-cols-5 h-full">
                    {/* Media Column */}
                    <div className="lg:col-span-3 bg-slate-100 h-full overflow-y-auto p-4 space-y-4">
                       {selectedPost.media.map((m, i) => (
                         <img key={i} src={m.url} className="w-full rounded-3xl shadow-lg border border-white/50" />
                       ))}
                    </div>

                    {/* Content Column */}
                    <div className="lg:col-span-2 p-12 flex flex-col border-l border-slate-100">
                       <div className="flex items-center gap-4 mb-10">
                          <img src={selectedPost.author.avatar} className="w-14 h-14 rounded-2xl object-cover" />
                          <div>
                            <h3 className="font-black text-slate-900">{selectedPost.author.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedPost.author.hospital}</p>
                          </div>
                       </div>

                       <h2 className="text-2xl font-black text-slate-900 mb-6 leading-tight">{selectedPost.title}</h2>
                       <div className="flex-1 space-y-6">
                          <p className="text-slate-600 font-medium leading-relaxed">{selectedPost.content}</p>
                          
                          {selectedPost.isAiAnalyzed && (
                            <div className="p-6 bg-vs/5 border border-vs/10 rounded-3xl space-y-3">
                               <p className="text-[10px] font-black text-vs uppercase tracking-widest flex items-center gap-2">
                                  <span>✨</span> AI Surgical Insight
                               </p>
                               <p className="text-xs text-vs font-bold leading-relaxed">
                                  This case demonstrates excellent preoperative planning. AI analysis suggests: in Labradors with high bone density, balancing osteotomy speed and torque is key to reducing thermal necrosis. Consider SurgiTech High-Torque system...
                               </p>
                            </div>
                          )}

                          <section className="pt-8 border-t border-slate-50">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Clinical Discussion (18)</h4>
                             <div className="space-y-6">
                                <div className="flex gap-4">
                                   <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                                   <div className="space-y-1">
                                      <p className="text-xs font-black text-slate-800">Dr. Wang <span className="text-slate-300 font-medium ml-2">1h ago</span></p>
                                      <p className="text-xs text-slate-600 font-medium">What blade size did you use? Any recommendations for micro instruments for the meniscectomy?</p>
                                   </div>
                                </div>
                             </div>
                          </section>
                       </div>

                       <div className="mt-10 pt-6 border-t border-slate-50 flex gap-4">
                          <input 
                            type="text" 
                            placeholder="Join the discussion..." 
                            className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-vs/20"
                          />
                          <button className="w-14 h-14 bg-vs text-white rounded-2xl flex items-center justify-center text-xl">↑</button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Publisher Modal */}
      {showPublisher && (
        <div className="fixed inset-0 z-[250] bg-slate-900/90 flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-2xl p-12 space-y-10 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-black text-slate-900">Publish Clinical Case</h2>
                 <button onClick={() => setShowPublisher(false)} className="text-slate-400 hover:text-slate-900">Close</button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Case Title</label>
                    <input 
                        type="text" 
                        value={newPostTitle}
                        onChange={e => setNewPostTitle(e.target.value)}
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:bg-white focus:ring-4 focus:ring-vs/10 font-bold" 
                        placeholder="e.g. TPLO Post-op Gait Analysis" 
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Specialty</label>
                    <select 
                        value={newPostSpecialty}
                        onChange={e => setNewPostSpecialty(e.target.value as Specialty)}
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold"
                    >
                       {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Clinical Insights / Discussion</label>
                    <textarea 
                        value={newPostContent}
                        onChange={e => setNewPostContent(e.target.value)}
                        className="w-full h-40 p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:bg-white focus:ring-4 focus:ring-vs/10 font-medium text-sm" 
                        placeholder="Describe the procedure, findings, or questions you have..."
                    ></textarea>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all">
                       <span className="text-2xl mb-2">📸</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase">Upload Media</span>
                    </div>
                 </div>
              </div>
              <button 
                onClick={handlePublish}
                disabled={!newPostTitle || !newPostContent}
                className="w-full py-5 bg-vs text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-vs/30 disabled:opacity-50 disabled:shadow-none"
              >
                Submit & Request AI Analysis
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Community;
