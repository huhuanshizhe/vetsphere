
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Order, Product, Course, Specialty, ProductGroup } from '../types';
import { api } from '../services/api';
import { PORTAL_THEME } from '../constants';
import { useNotification } from '../context/NotificationContext';
import { getSystemInstruction, saveSystemInstruction, getAIConfig, saveAIConfig, getGeminiResponse } from '../services/gemini';

const Dashboard: React.FC = () => {
  const { user, logout, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  
  // UI State
  const [activeTab, setActiveTab] = useState('Overview');
  const [showModal, setShowModal] = useState<'addProduct' | 'addCourse' | null>(null);

  // Admin AI State
  const [systemPrompt, setSystemPrompt] = useState('');
  const [aiConfig, setAiConfig] = useState({ temperature: 0.7, topP: 0.95 });
  const [knowledgeFiles, setKnowledgeFiles] = useState([
      { name: 'TPLO_Surgical_Guidelines_2025.pdf', size: '2.4MB', status: 'Indexed' },
      { name: 'SurgiTech_Implant_Catalog_v4.pdf', size: '5.1MB', status: 'Indexed' },
      { name: 'Canine_Ortho_Recovery_Protocols.docx', size: '1.2MB', status: 'Processing' }
  ]);

  // Course AI Generator State
  const [aiDraftInput, setAiDraftInput] = useState('');
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Form States
  const [productForm, setProductForm] = useState<Partial<Product>>({ stockStatus: 'In Stock' });
  const [courseForm, setCourseForm] = useState<Partial<Course>>({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [] });
  const [isEditingCourse, setIsEditingCourse] = useState(false);

  useEffect(() => {
    if (!user) {
        navigate('/auth');
        return;
    }

    // Auto-switch tab language for specific roles
    if ((user.role === 'Admin' || user.role === 'ShopSupplier') && activeTab === 'Overview') {
        setActiveTab('概览');
    }
    if (user.role === 'CourseProvider' && activeTab === 'Overview') {
        setActiveTab('教学概览');
    }
    if (user.role === 'Doctor' && activeTab === 'Overview') {
        setActiveTab('My Dashboard');
    }

    loadData();
    
    // Load AI Configs
    setSystemPrompt(getSystemInstruction());
    setAiConfig(getAIConfig());
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    const shouldFetchAllOrders = user?.role === 'Admin' || user?.role === 'ShopSupplier' || user?.role === 'CourseProvider';
    
    const [fetchedOrders, fetchedProducts, fetchedCourses, points] = await Promise.all([
        api.getOrders(shouldFetchAllOrders ? undefined : user?.email),
        api.getProducts(),
        api.getCourses(),
        user?.id ? api.fetchUserPoints(user.id) : Promise.resolve(0)
    ]);
    setOrders(fetchedOrders);
    setProducts(fetchedProducts);
    setCourses(fetchedCourses);
    setUserPoints(points);
    setLoading(false);
  };

  const handleShipOrder = async (orderId: string) => {
    await api.updateOrderStatus(orderId, 'Shipped');
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Shipped' } : o));
    addNotification({ id: `admin-n-${Date.now()}`, type: 'system', title: '订单更新', message: `订单 #${orderId} 已标记为发货。`, read: false, timestamp: new Date() });
  };

  const handleDeleteProduct = async (id: string) => {
      if(window.confirm('确认删除此商品吗？')) {
          await api.manageProduct('delete', { id });
          setProducts(prev => prev.filter(p => p.id !== id));
      }
  };

  const handleSaveProduct = async () => {
      await api.manageProduct('create', { ...productForm, imageUrl: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=400&q=80', supplier: { name: user?.name || 'Supplier', origin: 'CN', rating: 5 } });
      await loadData();
      setShowModal(null);
      addNotification({ id: `prod-${Date.now()}`, type: 'system', title: '库存更新', message: '新商品添加成功。', read: false, timestamp: new Date() });
  };

  const handleDeleteCourse = async (id: string) => {
      if(window.confirm('确定要取消该课程吗？已报名的学员将收到退款通知。')) {
          await api.manageCourse('delete', { id });
          setCourses(prev => prev.filter(c => c.id !== id));
          addNotification({ id: `course-del-${Date.now()}`, type: 'system', title: '课程已取消', message: '课程已从平台下架。', read: false, timestamp: new Date() });
      }
  };

  const handleEditCourse = (course: Course) => {
      setCourseForm({ ...course });
      setIsEditingCourse(true);
      setShowModal('addCourse');
  };

  const handleSaveCourse = async () => {
      const action = isEditingCourse ? 'update' : 'create';
      const successMessage = isEditingCourse ? '课程信息更新成功。' : '课程现已在平台上架招生。';
      const successTitle = isEditingCourse ? '课程已更新' : '新课程发布成功';

      const instructor = courseForm.instructor || { 
          name: user?.name || 'Instructor', 
          title: 'DVM', 
          imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80', 
          bio: 'Expert', 
          credentials: [] 
      };

      await api.manageCourse(action, { 
          ...courseForm, 
          instructor: instructor,
          imageUrl: courseForm.imageUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
          location: courseForm.location || { 
              city: courseForm.location?.city || 'Shanghai', 
              venue: 'Training Ctr', 
              address: '123 Rd' 
          }, 
          agenda: courseForm.agenda || [] 
      });
      await loadData();
      setShowModal(null);
      setIsEditingCourse(false);
      setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [] }); // Reset form
      addNotification({ id: `course-upd-${Date.now()}`, type: 'system', title: successTitle, message: successMessage, read: false, timestamp: new Date() });
  };

  // --- AI Course Generator Logic ---
  const handleGenerateCourseAI = async () => {
      if (!aiDraftInput.trim()) return;
      setIsGeneratingCourse(true);
      
      const prompt = `
        Role: Professional Veterinary Curriculum Designer.
        Task: Create a structured course outline based on this draft: "${aiDraftInput}".
        
        Requirements:
        1. Title: Professional and catchy (English & Chinese).
        2. Description: Detailed, academic tone, emphasizing clinical benefits.
        3. Price: Estimate a price in CNY.
        4. Instructor: Generate a realistic mock instructor profile (name, title, bio).
        5. Output JSON Format ONLY:
        {
            "titleEN": "...",
            "titleCN": "...",
            "description": "...",
            "price": 5000,
            "specialty": "Orthopedics",
            "level": "Advanced",
            "instructor": {
                "name": "Dr. Smith",
                "title": "DVM, DECVS",
                "bio": "Expert in ..."
            },
            "agenda": [
               { "day": "Day 1", "items": [{"time": "09:00", "activity": "..."}] },
               { "day": "Day 2", "items": [{"time": "09:00", "activity": "..."}] }
            ]
        }
      `;

      try {
          const { text } = await getGeminiResponse([], prompt, "You are a JSON generator.");
          const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(jsonString);
          
          setGeneratedContent(data);
          addNotification({ id: `ai-gen-${Date.now()}`, type: 'system', title: 'AI 方案已生成', message: '请查看并应用生成的课程大纲。', read: false, timestamp: new Date() });
      } catch (e) {
          console.error("AI Gen Error", e);
          addNotification({ id: `ai-err-${Date.now()}`, type: 'system', title: '生成失败', message: '请重试，确保网络连接正常。', read: false, timestamp: new Date() });
      } finally {
          setIsGeneratingCourse(false);
      }
  };

  const applyAIContent = () => {
      if (!generatedContent) return;
      setCourseForm(prev => ({
          ...prev,
          title: `${generatedContent.titleEN} (${generatedContent.titleCN})`,
          description: generatedContent.description,
          price: generatedContent.price,
          specialty: generatedContent.specialty as Specialty,
          level: generatedContent.level as any,
          instructor: {
              ...prev.instructor,
              name: generatedContent.instructor?.name || 'Instructor',
              title: generatedContent.instructor?.title || 'DVM',
              bio: generatedContent.instructor?.bio || 'Expert',
              imageUrl: prev.instructor?.imageUrl || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80',
              credentials: []
          },
          agenda: generatedContent.agenda?.map((day: any) => ({
              day: day.day,
              date: '2025-01-01',
              items: day.items
          }))
      }));
      setGeneratedContent(null);
  };

  const saveAIChanges = () => {
      saveSystemInstruction(systemPrompt);
      saveAIConfig(aiConfig);
      addNotification({ id: `ai-${Date.now()}`, type: 'system', title: 'AI 大脑已更新', message: '系统指令和模型参数已成功部署到生产环境。', read: false, timestamp: new Date() });
  };

  if (!user) return null;

  // --- THEME & LAYOUT HELPER ---
  const theme = PORTAL_THEME[user.role] || PORTAL_THEME.Doctor;
  
  const DashboardLayout: React.FC<{ children: React.ReactNode; sidebarItems: string[] }> = ({ children, sidebarItems }) => (
    <div className={`min-h-screen ${theme.colors.pageBg} text-slate-800 flex font-sans`}>
        {/* Sidebar */}
        <aside className={`w-64 ${theme.colors.sidebarBg} border-r border-slate-100 flex flex-col shrink-0 transition-colors duration-300`}>
           <div className="p-8 border-b border-white/5">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${user.role === 'Admin' ? 'bg-emerald-500 text-black' : 'bg-white text-slate-900'}`}>
                      {theme.meta.icon}
                  </div>
                  <div>
                      <span className={`font-black tracking-tight text-sm block ${user.role === 'Admin' ? 'text-white' : 'text-slate-900'}`}>VetSphere</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${user.role === 'Admin' ? 'text-slate-500' : 'text-slate-400'}`}>{user.role}</span>
                  </div>
              </div>
           </div>
           
           <nav className="flex-1 p-4 space-y-2">
              {sidebarItems.map(item => (
                  <button 
                    key={item}
                    onClick={() => setActiveTab(item)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        activeTab === item 
                        ? theme.colors.sidebarActive 
                        : `${theme.colors.sidebarText} hover:bg-white/5`
                    }`}
                  >
                      {item}
                  </button>
              ))}
           </nav>

           <div className="p-4 mt-auto">
               <button onClick={logout} className="w-full py-3 border border-slate-200/20 rounded-xl text-[10px] font-bold uppercase text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                   {user.role === 'Admin' || user.role === 'ShopSupplier' ? '退出登录' : 'Sign Out'}
               </button>
           </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 h-screen overflow-y-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight mb-1 ${user.role === 'Admin' ? 'text-white' : 'text-slate-900'}`}>{activeTab}</h1>
                    <p className="text-slate-400 text-sm font-medium">
                        {user.role === 'Admin' || user.role === 'ShopSupplier' ? `欢迎回来, ${user.name}` : user.role === 'CourseProvider' ? `教学管理中心 - ${user.name}` : `Welcome back, ${user.name}`}
                    </p>
                </div>
            </header>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </main>
    </div>
  );

  // --- ROLE: DOCTOR (Consumer) - UPDATED WITH POINTS ---
  if (user.role === 'Doctor') {
     return (
        <DashboardLayout sidebarItems={['My Dashboard', 'Academic Path', 'My Orders', 'Rewards Hub']}>
             {activeTab === 'My Dashboard' && (
                 <div className="grid lg:grid-cols-3 gap-8">
                     {/* Left: Profile & Stats */}
                     <div className="lg:col-span-2 space-y-8">
                         <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                             <div className="w-24 h-24 bg-vs/10 rounded-full flex items-center justify-center text-4xl shadow-inner">👨‍⚕️</div>
                             <div className="flex-1 text-center md:text-left">
                                 <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                     <h2 className="text-3xl font-black text-slate-900">{user.name}</h2>
                                     <span className="px-3 py-1 bg-vs text-white text-[10px] font-black uppercase rounded-full tracking-widest">{user.level}</span>
                                 </div>
                                 <p className="text-slate-400 font-bold text-sm mb-6">{user.email}</p>
                                 <div className="grid grid-cols-3 gap-8 border-t border-slate-50 pt-6">
                                     <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Courses</p><p className="text-xl font-black">4</p></div>
                                     <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">CPE Credits</p><p className="text-xl font-black">12.5</p></div>
                                     <div><p className="text-[10px] font-black text-vs uppercase mb-1">Member Points</p><p className="text-xl font-black text-vs">{userPoints}</p></div>
                                 </div>
                             </div>
                         </div>

                         <div className="bg-white p-8 rounded-[40px] border border-slate-100">
                             <h3 className="font-black text-lg mb-8">Current Enrollment</h3>
                             {orders.length === 0 ? <p className="text-slate-400">No active courses. Explore our curriculum to start learning.</p> : (
                                 <div className="space-y-4">
                                     {orders.map(o => (
                                         <div key={o.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-vs transition-colors">
                                             <div className="flex items-center gap-4">
                                                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">📖</div>
                                                 <div>
                                                     <p className="font-black text-slate-900">Order #{o.id}</p>
                                                     <p className="text-xs text-slate-400">{o.date}</p>
                                                 </div>
                                             </div>
                                             <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${o.status === 'Paid' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-white text-slate-400'}`}>{o.status}</span>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>

                     {/* Right: Gamification & Quick Links */}
                     <div className="space-y-8">
                         {/* Points Mission Card */}
                         <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-vs/20">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-vs/20 rounded-full blur-3xl"></div>
                             <h3 className="text-xl font-black mb-2 flex items-center gap-2">✨ Points Hub</h3>
                             <p className="text-slate-400 text-xs mb-8">Earn points to unlock exclusive instruments and course discounts.</p>
                             
                             <div className="space-y-4">
                                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                                     <div className="flex items-center gap-3">
                                         <span className="text-xl">📝</span>
                                         <div>
                                             <p className="text-sm font-bold">Post a Case</p>
                                             <p className="text-[10px] text-emerald-400">+200 Points</p>
                                         </div>
                                     </div>
                                     <button onClick={() => navigate('/community')} className="text-[10px] font-black uppercase bg-vs px-3 py-1 rounded-lg">Go</button>
                                 </div>
                                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                                     <div className="flex items-center gap-3">
                                         <span className="text-xl">🔗</span>
                                         <div>
                                             <p className="text-sm font-bold">Share Content</p>
                                             <p className="text-[10px] text-emerald-400">+50 Points</p>
                                         </div>
                                     </div>
                                     <button onClick={() => navigate('/community')} className="text-[10px] font-black uppercase bg-white/10 px-3 py-1 rounded-lg">Share</button>
                                 </div>
                             </div>
                         </div>

                         <div className="bg-vs p-8 rounded-[40px] text-white shadow-xl shadow-vs/10">
                             <h4 className="text-sm font-black uppercase tracking-widest mb-4">Refer a Colleague</h4>
                             <p className="text-xs opacity-80 mb-6 leading-relaxed">Both you and your colleague will receive 500 points upon their first successful course registration.</p>
                             <div className="flex gap-2">
                                 <input readOnly value="VET-REF-2025" className="bg-white/20 border-white/10 border rounded-xl px-4 py-2 text-xs font-mono flex-1 outline-none" />
                                 <button className="bg-white text-vs px-4 py-2 rounded-xl font-black text-[10px] uppercase">Copy</button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {activeTab === 'Rewards Hub' && (
                 <div className="space-y-10">
                     <div className="flex justify-between items-end">
                         <div>
                             <h3 className="text-2xl font-black text-slate-900">Exchange Points</h3>
                             <p className="text-slate-500 font-medium">Use your earned credits for surgical excellence.</p>
                         </div>
                         <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Balance</p>
                             <p className="text-2xl font-black text-vs">{userPoints} pts</p>
                         </div>
                     </div>

                     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                         {[
                             { title: 'TPLO Workshop 10% OFF', cost: 1000, type: 'Voucher', icon: '🎟️' },
                             { title: 'SurgiTech Blade Set', cost: 2500, type: 'Physical', icon: '🔪' },
                             { title: '1-on-1 Mentorship', cost: 5000, type: 'Academic', icon: '👨‍🏫' },
                             { title: 'Certification Fast-track', cost: 3000, type: 'Badge', icon: '🏅' },
                         ].map(reward => (
                             <div key={reward.title} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all">
                                 <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:scale-110 transition-transform">{reward.icon}</div>
                                 <p className="text-[10px] font-black text-vs uppercase mb-2">{reward.type}</p>
                                 <h4 className="text-xl font-black text-slate-900 mb-6">{reward.title}</h4>
                                 <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                                     <span className="font-bold text-slate-400">{reward.cost} pts</span>
                                     <button 
                                        disabled={userPoints < reward.cost}
                                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userPoints >= reward.cost ? 'bg-slate-900 text-white hover:bg-vs shadow-lg' : 'bg-slate-100 text-slate-300'}`}
                                     >
                                         Redeem
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {activeTab === 'My Orders' && (
                 <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                            <tr><th className="p-8">Order ID</th><th className="p-8">Items</th><th className="p-8">Amount</th><th className="p-8">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50/30">
                                    <td className="p-8 font-black text-slate-900">#{o.id}</td>
                                    <td className="p-8">
                                        <div className="flex gap-2">
                                            {o.items.map((i, idx) => <span key={idx} className="bg-slate-50 px-2 py-1 rounded text-[10px] font-bold border">{i.name}</span>)}
                                        </div>
                                    </td>
                                    <td className="p-8 font-bold">¥{o.totalAmount.toLocaleString()}</td>
                                    <td className="p-8"><span className="text-[10px] font-black uppercase px-3 py-1 bg-vs/5 text-vs rounded-full border border-vs/10">{o.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}
        </DashboardLayout>
     );
  }

  // --- ROLE: SHOP SUPPLIER (Business) - CHINESE UI ---
  if (user.role === 'ShopSupplier') {
      return (
        <DashboardLayout sidebarItems={['概览', '库存管理', '订单履约', '数据分析']}>
            {activeTab === '概览' && (
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">总收入 (Total Revenue)</p>
                        <p className="text-3xl font-black text-slate-900 mt-2">¥128,400</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">待处理订单 (Pending Orders)</p>
                        <p className="text-3xl font-black text-blue-600 mt-2">{orders.filter(o => o.status === 'Pending').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">在售商品 (Active Products)</p>
                        <p className="text-3xl font-black text-slate-900 mt-2">{products.length}</p>
                    </div>
                </div>
            )}

            {activeTab === '库存管理' && (
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg">商品目录</h3>
                        <button onClick={() => setShowModal('addProduct')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-blue-700 transition-colors">+ 添加商品</button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4">商品名称 (Product)</th>
                                <th className="p-4">SKU/ID</th>
                                <th className="p-4">价格 (Price)</th>
                                <th className="p-4">库存状态 (Stock)</th>
                                <th className="p-4 text-right">操作 (Actions)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={p.imageUrl} className="w-10 h-10 rounded-lg bg-slate-100 object-cover mix-blend-multiply" />
                                        <span className="font-bold text-slate-900">{p.name}</span>
                                    </td>
                                    <td className="p-4 text-slate-500 font-mono text-xs">{p.id}</td>
                                    <td className="p-4 font-bold">¥{p.price.toLocaleString()}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.stockStatus === 'In Stock' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{p.stockStatus}</span></td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-400 hover:text-red-600 font-bold text-xs">删除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === '订单履约' && (
                <div className="space-y-4">
                     {orders.map(order => (
                         <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center">
                             <div className="flex items-center gap-6">
                                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">📦</div>
                                 <div>
                                     <p className="font-black text-slate-900">订单号 #{order.id}</p>
                                     <p className="text-xs text-slate-500">{order.shippingAddress}</p>
                                     <div className="flex gap-2 mt-2">
                                         {order.items.map((i, idx) => <span key={idx} className="bg-slate-50 px-2 py-1 rounded text-[10px] text-slate-600 border border-slate-200">{i.quantity}x {i.name}</span>)}
                                     </div>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="font-bold text-lg mb-2">¥{order.totalAmount.toLocaleString()}</p>
                                 {order.status === 'Pending' || order.status === 'Paid' ? (
                                     <button onClick={() => handleShipOrder(order.id)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-700">标记发货</button>
                                 ) : (
                                     <span className="text-emerald-500 font-bold uppercase text-xs">✓ 已发货</span>
                                 )}
                             </div>
                         </div>
                     ))}
                </div>
            )}

            {showModal === 'addProduct' && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg space-y-6 animate-in zoom-in-95">
                        <h3 className="font-black text-xl">添加新器械</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="商品名称" className="w-full p-3 border rounded-xl" onChange={e => setProductForm({...productForm, name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <select className="p-3 border rounded-xl" onChange={e => setProductForm({...productForm, group: e.target.value as ProductGroup})}>
                                    <option>PowerTools</option><option>Implants</option><option>HandInstruments</option>
                                </select>
                                <input type="number" placeholder="价格 (CNY)" className="p-3 border rounded-xl" onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} />
                            </div>
                            <textarea placeholder="商品描述" className="w-full p-3 border rounded-xl" onChange={e => setProductForm({...productForm, description: e.target.value})} />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowModal(null)} className="flex-1 py-3 text-slate-500 font-bold">取消</button>
                            <button onClick={handleSaveProduct} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">保存商品</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
      );
  }

  // --- ROLE: COURSE PROVIDER (Education) ---
  if (user.role === 'CourseProvider') {
      const studentEnrollments = orders.flatMap(order => 
        order.items
            .filter(item => item.type === 'course')
            .map(item => ({
                orderId: order.id,
                studentName: order.customerName,
                studentEmail: order.customerEmail,
                courseName: item.name,
                date: order.date,
                status: order.status
            }))
      );
      
      const totalRevenue = orders.reduce((acc, order) => {
          const courseItemsTotal = order.items
            .filter(item => item.type === 'course')
            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
          return acc + courseItemsTotal;
      }, 0);

      const trendPoints = "0,80 20,75 40,60 60,65 80,40 100,20"; 
      
      return (
        <DashboardLayout sidebarItems={['教学概览', '课程管理', '学员名单', '收益分析']}>
             {activeTab === '教学概览' && (
                 <div className="grid grid-cols-3 gap-6">
                     <div className="bg-purple-600 p-8 rounded-[32px] text-white col-span-2 shadow-xl shadow-purple-900/20 flex flex-col justify-between relative overflow-hidden">
                         <div className="relative z-10">
                            <h2 className="text-2xl font-black mb-2">学员报名趋势 (Enrollment Trend)</h2>
                            <p className="opacity-80 max-w-sm mb-6">近6个月学员增长势头良好，特别是骨科实操班。</p>
                            
                            <div className="h-32 w-full bg-purple-800/30 rounded-xl p-4 relative overflow-hidden border border-white/10">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                                    </linearGradient>
                                    <path d={`M${trendPoints} L100,100 L0,100 Z`} fill="url(#trendGrad)" />
                                    <polyline points={trendPoints} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    {[80, 75, 60, 65, 40, 20].map((y, i) => (
                                        <circle key={i} cx={i * 20} cy={y} r="2" fill="white" className="hover:r-4 transition-all" />
                                    ))}
                                </svg>
                            </div>
                         </div>
                         <div className="mt-8 relative z-10 flex gap-4">
                            <button onClick={() => { setIsEditingCourse(false); setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [] }); setShowModal('addCourse'); }} className="bg-white text-purple-600 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-purple-50 transition-all shadow-lg">
                                + 发布新课程 (AI)
                            </button>
                         </div>
                         <div className="absolute right-0 bottom-0 text-9xl opacity-10 rotate-12">🎓</div>
                     </div>
                     
                     <div className="flex flex-col gap-6">
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-4">学员来源分布 (Geo)</p>
                             <div className="space-y-3 flex-1">
                                 {[
                                     { loc: '上海', pct: 45, color: 'bg-purple-500' },
                                     { loc: '北京', pct: 30, color: 'bg-indigo-500' },
                                     { loc: '广州', pct: 15, color: 'bg-blue-500' },
                                     { loc: '海外', pct: 10, color: 'bg-emerald-500' },
                                 ].map(d => (
                                     <div key={d.loc}>
                                         <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                                             <span>{d.loc}</span>
                                             <span>{d.pct}%</span>
                                         </div>
                                         <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                             <div className={`h-full ${d.color}`} style={{ width: `${d.pct}%` }}></div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
                             <p className="text-xs font-bold text-slate-400 uppercase">总收益 (Revenue)</p>
                             <p className="text-4xl font-black text-purple-600 mt-2">¥{totalRevenue.toLocaleString()}</p>
                         </div>
                     </div>
                 </div>
             )}

             {activeTab === '课程管理' && (
                 <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl text-slate-900">我的课程库</h3>
                        <button onClick={() => { setIsEditingCourse(false); setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [] }); setShowModal('addCourse'); }} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
                            + 发布课程 (AI)
                        </button>
                     </div>

                     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {courses.map(c => (
                             <div key={c.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col group hover:border-purple-200 transition-all">
                                 <div className="h-40 bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                                     <img src={c.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                     <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-purple-600 shadow-sm">
                                         {c.level}
                                     </span>
                                 </div>
                                 <div className="flex justify-between items-start mb-2">
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.specialty}</span>
                                     <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">{c.status}</span>
                                 </div>
                                 <h4 className="font-black text-slate-900 mb-1 leading-tight">{c.title}</h4>
                                 <p className="text-xs text-slate-500 font-medium mb-4">{c.location.city} • {c.startDate}</p>
                                 
                                 <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                                     <span className="font-bold text-slate-900">¥{c.price.toLocaleString()}</span>
                                     <div className="flex gap-2">
                                         <button onClick={() => handleEditCourse(c)} className="p-2 text-slate-400 hover:text-purple-600 transition-colors">✎</button>
                                         <button onClick={() => handleDeleteCourse(c.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">🗑</button>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {activeTab === '学员名单' && (
                 <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-100">
                        <h3 className="font-bold text-xl text-slate-900">近期报名学员</h3>
                        <p className="text-xs text-slate-500 mt-1">显示所有已完成付款的注册信息</p>
                    </div>
                    {studentEnrollments.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium">暂无报名学员</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-6">学员姓名 (Student)</th>
                                    <th className="p-6">报读课程 (Course)</th>
                                    <th className="p-6">报名时间 (Date)</th>
                                    <th className="p-6">状态 (Status)</th>
                                    <th className="p-6 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {studentEnrollments.map((student, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6">
                                            <p className="font-bold text-slate-900">{student.studentName}</p>
                                            <p className="text-xs text-slate-400">{student.studentEmail}</p>
                                        </td>
                                        <td className="p-6 font-medium text-slate-700 max-w-xs truncate">{student.courseName}</td>
                                        <td className="p-6 text-slate-500 text-xs font-mono">{new Date(student.date).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${student.status === 'Paid' || student.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {student.status === 'Paid' ? '已付款' : student.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button className="text-[10px] font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600">
                                                联系学员
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                 </div>
             )}

             {activeTab === '收益分析' && (
                 <div className="grid md:grid-cols-2 gap-8">
                     <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">本月营收概览</h4>
                         <div className="flex items-baseline gap-2">
                             <span className="text-5xl font-black text-slate-900">¥{totalRevenue.toLocaleString()}</span>
                             <span className="text-xs font-bold text-emerald-500">▲ 12.5%</span>
                         </div>
                         <div className="mt-8 h-32 flex items-end gap-2">
                             {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                 <div key={i} className="flex-1 bg-purple-100 rounded-t-lg hover:bg-purple-500 transition-colors relative group" style={{ height: `${h}%` }}>
                                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                         ¥{(h * 1000).toLocaleString()}
                                     </div>
                                 </div>
                             ))}
                         </div>
                         <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase">
                             <span>周一</span><span>周日</span>
                         </div>
                     </div>

                     <div className="space-y-6">
                         <div className="bg-slate-900 p-8 rounded-[32px] text-white">
                             <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4">待处理事项</h4>
                             <ul className="space-y-4">
                                 <li className="flex items-center gap-3 text-sm">
                                     <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                     <span className="flex-1">3 位学员等待结业证书审核</span>
                                     <button className="text-xs font-bold text-purple-400 hover:text-white">查看</button>
                                 </li>
                                 <li className="flex items-center gap-3 text-sm">
                                     <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                     <span className="flex-1">“高级骨科”课程只剩 2 个名额</span>
                                     <button className="text-xs font-bold text-purple-400 hover:text-white">推广</button>
                                 </li>
                             </ul>
                         </div>
                     </div>
                 </div>
             )}

            {showModal === 'addCourse' && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                            <h3 className="font-black text-xl text-purple-900 flex items-center gap-2">
                                <span>{isEditingCourse ? '✏️' : '✨'}</span> 
                                {isEditingCourse ? '编辑课程 (Edit Course)' : 'AI 智能教案编辑器 (Course Designer)'}
                            </h3>
                            <button onClick={() => setShowModal(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">✕</button>
                        </div>
                        
                        <div className="flex-1 grid lg:grid-cols-2 gap-8 overflow-hidden">
                            <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                                {!isEditingCourse && (
                                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                        <label className="block text-[10px] font-black text-purple-600 uppercase mb-2 tracking-widest">
                                            STEP 1: 输入课程草稿 (Draft Idea)
                                        </label>
                                        <textarea 
                                            value={aiDraftInput}
                                            onChange={e => setAiDraftInput(e.target.value)}
                                            placeholder="例如：高级小动物软组织外科实操班，为期三天，地点上海。主要讲授肝叶切除和胸腔镜。目标学员是有3年经验的医生。定价大概5000元。"
                                            className="w-full h-32 p-4 rounded-xl border-2 border-purple-100 bg-white focus:border-purple-300 outline-none text-sm leading-relaxed"
                                        />
                                        <button 
                                            onClick={handleGenerateCourseAI}
                                            disabled={isGeneratingCourse || !aiDraftInput}
                                            className="mt-4 w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isGeneratingCourse ? 'AI 正在生成教案...' : '✨ 立即生成中英双语大纲'}
                                        </button>
                                    </div>
                                )}

                                {generatedContent && (
                                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 animate-in slide-in-from-bottom-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">AI 生成结果预览</span>
                                            <button onClick={applyAIContent} className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700">
                                                确认并应用到表单 →
                                            </button>
                                        </div>
                                        <div className="space-y-4 text-xs text-slate-700 max-h-60 overflow-y-auto p-2 bg-white rounded-xl border border-emerald-100/50">
                                            <div><span className="font-bold">Title (EN):</span> {generatedContent.titleEN}</div>
                                            <div><span className="font-bold">标题 (CN):</span> {generatedContent.titleCN}</div>
                                            <div><span className="font-bold">Price:</span> ¥{generatedContent.price}</div>
                                            <div><span className="font-bold">Agenda:</span> {generatedContent.agenda?.length} days generated</div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-6 border rounded-2xl border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4">{isEditingCourse ? '修改课程详情' : '手动编辑 / 修正'}</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">课程标题</label>
                                            <input type="text" placeholder="课程标题" value={courseForm.title || ''} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">封面图 URL</label>
                                            <input type="text" placeholder="https://..." value={courseForm.imageUrl || ''} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">专科</label>
                                                <select value={courseForm.specialty} onChange={e => setCourseForm({...courseForm, specialty: e.target.value as Specialty})} className="w-full p-3 border rounded-xl bg-slate-50 text-sm">
                                                    {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">价格 (CNY)</label>
                                                <input type="number" placeholder="价格" value={courseForm.price || ''} onChange={e => setCourseForm({...courseForm, price: Number(e.target.value)})} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>
                                        <textarea placeholder="课程简介" value={courseForm.description || ''} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="w-full h-24 p-3 border rounded-xl bg-slate-50 text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 overflow-y-auto">
                                <div className="text-center mb-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">APP 端预览效果</p></div>
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-sm mx-auto">
                                    <div className="h-40 bg-slate-200 relative">
                                        <img src={courseForm.imageUrl || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-5">
                                        <h4 className="font-black text-slate-900 mb-2 leading-tight">{courseForm.title || 'Course Title'}</h4>
                                        <p className="text-[10px] text-slate-500 mb-4 line-clamp-3">{courseForm.description || 'Description...'}</p>
                                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                            <span className="font-black text-slate-900">¥{(courseForm.price || 0).toLocaleString()}</span>
                                            <button className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold">立即报名</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => { setShowModal(null); setIsEditingCourse(false); }} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">取消</button>
                            <button onClick={handleSaveCourse} className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all">
                                {isEditingCourse ? '保存修改' : '发布课程'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
      );
  }

  // --- ROLE: ADMIN ---
  if (user.role === 'Admin') {
      return (
        <DashboardLayout sidebarItems={['概览', 'AI 大脑中枢', '用户管理', '财务报表']}>
             {activeTab === '概览' && (
                 <div className="grid grid-cols-4 gap-6">
                     <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                         <p className="text-[10px] font-bold text-slate-500 uppercase">平台总交易额 (Platform Volume)</p>
                         <h3 className="text-2xl font-black text-white">¥{orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</h3>
                     </div>
                 </div>
             )}

             {activeTab === 'AI 大脑中枢' && (
                 <div className="grid lg:grid-cols-2 gap-8 h-full">
                     <div className="flex flex-col gap-6">
                         <div className="bg-black/20 border border-white/5 p-6 rounded-3xl backdrop-blur-sm flex-1 flex flex-col">
                             <div className="flex justify-between items-center mb-4">
                                 <div>
                                     <h3 className="text-white font-black text-lg">系统指令 (System Prompt)</h3>
                                     <p className="text-slate-500 text-xs">定义 AI 的人设、规则和业务边界。</p>
                                 </div>
                             </div>
                             <textarea 
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="flex-1 w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-slate-300 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                                spellCheck={false}
                             />
                         </div>
                     </div>
                     <div className="flex flex-col gap-6">
                         <button 
                            onClick={saveAIChanges}
                            className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all"
                         >
                             发布更新到生产环境
                         </button>
                     </div>
                 </div>
             )}
        </DashboardLayout>
      );
  }

  return <div>Access Denied</div>;
};

export default Dashboard;
