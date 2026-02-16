
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Order, Product, Course, Specialty, ProductGroup, CourseStatus } from '../types';
import { api } from '../services/api';
import { PORTAL_THEME } from '../constants';
import { useNotification } from '../context/NotificationContext';
import { getSystemInstruction, saveSystemInstruction, getAIConfig, saveAIConfig, generateStructuredData, generateCourseTranslations } from '../services/gemini';

// --- DashboardLayout Component ---
interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: string[];
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, sidebarItems, user, activeTab, setActiveTab, logout }) => {
  const theme = PORTAL_THEME[user.role] || PORTAL_THEME.Doctor;

  return (
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
                    className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
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
               <button onClick={logout} className="w-full py-4 border border-slate-200/20 rounded-xl text-xs font-bold uppercase text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                   {user.role === 'Admin' || user.role === 'ShopSupplier' ? '退出登录' : 'Sign Out'}
               </button>
           </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 h-screen overflow-y-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className={`text-4xl font-black tracking-tight mb-1 ${user.role === 'Admin' ? 'text-white' : 'text-slate-900'}`}>{activeTab}</h1>
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
};

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
  const [userPoints, setUserPoints] = useState(user?.points || 0);
  
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Form States
  const [productForm, setProductForm] = useState<Partial<Product>>({ stockStatus: 'In Stock' });
  
  // Course Form Initial State
  const [courseForm, setCourseForm] = useState<Partial<Course>>({ 
      level: 'Intermediate', 
      specialty: Specialty.ORTHOPEDICS, 
      currency: 'CNY',
      price: 0,
      instructor: { name: '', title: '', bio: '', imageUrl: '', credentials: [] },
      location: { city: '', venue: '', address: '' },
      startDate: '',
      endDate: '',
      agenda: [] 
  });
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  
  // Localized Editing State
  const [editingLang, setEditingLang] = useState<'en' | 'zh' | 'th'>('en');

  // Load active tab from session storage whenever user changes
  useEffect(() => {
    if (!user) {
        navigate('/auth');
        return;
    }

    const savedTab = sessionStorage.getItem(`vs_dash_tab_${user.id}`);
    if (savedTab) {
        setActiveTab(savedTab);
    } else {
        if (user.role === 'Admin' || user.role === 'ShopSupplier') {
            setActiveTab('概览');
        } else if (user.role === 'CourseProvider') {
            setActiveTab('教学概览');
        } else if (user.role === 'Doctor') {
            setActiveTab('My Dashboard');
        } else {
            setActiveTab('Overview');
        }
    }

    if (user.points !== undefined) {
      setUserPoints(user.points);
    }

    loadData();
    
    setSystemPrompt(getSystemInstruction());
    setAiConfig(getAIConfig());
  }, [user, navigate]);

  useEffect(() => {
      if (user && activeTab) {
          sessionStorage.setItem(`vs_dash_tab_${user.id}`, activeTab);
      }
  }, [activeTab, user]);

  const loadData = async () => {
    setLoading(true);
    const shouldFetchAllOrders = user?.role === 'Admin' || user?.role === 'ShopSupplier' || user?.role === 'CourseProvider';
    
    const [fetchedOrders, fetchedProducts, fetchedCourses, points] = await Promise.all([
        api.getOrders(shouldFetchAllOrders ? undefined : user?.email),
        api.getProducts(),
        api.getCourses(),
        user?.id ? api.fetchUserPoints(user.id) : Promise.resolve(0)
    ]);
    
    setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
    setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
    setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
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

  // --- Course Management (Provider/Admin Shared) ---
  const handleDeleteCourse = async (id: string) => {
      if(window.confirm('确定要移除该课程吗？')) {
          await api.manageCourse('delete', { id });
          setCourses(prev => prev.filter(c => c.id !== id));
          addNotification({ id: `course-del-${Date.now()}`, type: 'system', title: '课程已移除', message: '课程已从库中删除。', read: false, timestamp: new Date() });
      }
  };

  const handleEditCourse = (course: Course) => {
      setCourseForm({ 
          ...course,
          // Ensure nested objects exist to prevent form crashes
          instructor: course.instructor || { name: '', title: '', bio: '', imageUrl: '', credentials: [] },
          location: course.location || { city: '', venue: '', address: '' }
      });
      setIsEditingCourse(true);
      setShowModal('addCourse');
  };

  // --- Admin Audit Actions ---
  const handleApproveCourse = async (courseId: string) => {
      await api.manageCourse('update', { id: courseId, status: 'Published' });
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: 'Published' } : c));
      addNotification({ id: `audit-ok-${Date.now()}`, type: 'system', title: '审核通过', message: '课程已正式上架。', read: false, timestamp: new Date() });
  };

  const handleRejectCourse = async (courseId: string) => {
      await api.manageCourse('update', { id: courseId, status: 'Rejected' });
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: 'Rejected' } : c));
      addNotification({ id: `audit-rej-${Date.now()}`, type: 'system', title: '已拒绝/下架', message: '课程已下架或退回。', read: false, timestamp: new Date() });
  };

  // --- Provider Submit Action ---
  const handleSaveCourse = async () => {
      const action = isEditingCourse ? 'update' : 'create';
      const newStatus: CourseStatus = user?.role === 'Admin' ? 'Published' : 'Pending';
      
      const successMessage = isEditingCourse 
        ? (user?.role === 'Admin' ? '课程信息已更新。' : '修改已提交，等待管理员再次审核。')
        : '新课程已创建并提交审核。';
      
      const successTitle = isEditingCourse ? '更新成功' : '提交成功';

      const instructor = { 
          name: courseForm.instructor?.name || user?.name || 'Instructor', 
          title: courseForm.instructor?.title || 'DVM', 
          imageUrl: courseForm.instructor?.imageUrl || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80', 
          bio: courseForm.instructor?.bio || 'Expert Instructor', 
          credentials: courseForm.instructor?.credentials || [] 
      };

      const location = {
          city: courseForm.location?.city || 'Shanghai',
          venue: courseForm.location?.venue || 'TBD',
          address: courseForm.location?.address || 'TBD'
      };

      await api.manageCourse(action, { 
          ...courseForm, 
          status: newStatus,
          instructor: instructor,
          location: location,
          imageUrl: courseForm.imageUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
          agenda: courseForm.agenda || [],
          price: courseForm.price || 0
      });
      
      await loadData();
      setShowModal(null);
      setIsEditingCourse(false);
      setCourseForm({ 
          level: 'Intermediate', 
          specialty: Specialty.ORTHOPEDICS, 
          currency: 'CNY',
          price: 0,
          agenda: [],
          instructor: { name: '', title: '', bio: '', imageUrl: '', credentials: [] },
          location: { city: '', venue: '', address: '' }
      }); 
      addNotification({ id: `course-upd-${Date.now()}`, type: 'system', title: successTitle, message: successMessage, read: false, timestamp: new Date() });
  };

  // --- AI Logic ---
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
        5. Output JSON Format ONLY.
      `;

      try {
          const data = await generateStructuredData(prompt);
          setGeneratedContent(data);
          addNotification({ id: `ai-gen-${Date.now()}`, type: 'system', title: 'AI 方案已生成', message: '请查看并应用生成的课程大纲。', read: false, timestamp: new Date() });
      } catch (e) {
          console.error("AI Gen Error", e);
          addNotification({ id: `ai-err-${Date.now()}`, type: 'system', title: '生成失败', message: '请重试，确保网络连接正常。', read: false, timestamp: new Date() });
      } finally {
          setIsGeneratingCourse(false);
      }
  };

  const handleTranslateFields = async () => {
      const sourceTitle = editingLang === 'en' ? courseForm.title : editingLang === 'zh' ? courseForm.title_zh : courseForm.title_th;
      const sourceDesc = editingLang === 'en' ? courseForm.description : editingLang === 'zh' ? courseForm.description_zh : courseForm.description_th;

      if (!sourceTitle) {
          alert("Please fill in the title first.");
          return;
      }

      setIsTranslating(true);
      try {
          const result = await generateCourseTranslations(sourceTitle, sourceDesc || '', editingLang);
          setCourseForm(prev => ({
              ...prev,
              title: result.en.title,
              description: result.en.description,
              title_zh: result.zh.title,
              description_zh: result.zh.description,
              title_th: result.th.title,
              description_th: result.th.description
          }));
          addNotification({ id: `trans-${Date.now()}`, type: 'system', title: '翻译完成', message: '已自动生成其他语言版本。', read: false, timestamp: new Date() });
      } catch (e) {
          console.error("Translation failed", e);
          addNotification({ id: `trans-err-${Date.now()}`, type: 'system', title: '翻译失败', message: '请重试。', read: false, timestamp: new Date() });
      } finally {
          setIsTranslating(false);
      }
  };

  const applyAIContent = () => {
      if (!generatedContent) return;
      setCourseForm(prev => ({
          ...prev,
          title: generatedContent.titleEN,
          title_zh: generatedContent.titleCN,
          description: generatedContent.description,
          price: generatedContent.price || 0,
          specialty: generatedContent.specialty as Specialty,
          level: generatedContent.level as any,
          instructor: {
              ...prev.instructor!,
              name: generatedContent.instructor?.name || 'Instructor',
              title: generatedContent.instructor?.title || 'DVM',
              bio: generatedContent.instructor?.bio || 'Expert',
              imageUrl: prev.instructor?.imageUrl || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80',
              credentials: []
          },
          agenda: generatedContent.agenda?.map((day: any) => ({
              day: day.day,
              date: '',
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

  // --- Agenda Helper Functions ---
  const addAgendaDay = () => {
      setCourseForm(prev => ({
          ...prev,
          agenda: [...(prev.agenda || []), { day: `Day ${(prev.agenda?.length || 0) + 1}`, date: '', items: [] }]
      }));
  };

  const updateAgendaDay = (index: number, field: string, value: string) => {
      const newAgenda = [...(courseForm.agenda || [])];
      (newAgenda[index] as any)[field] = value;
      setCourseForm({ ...courseForm, agenda: newAgenda });
  };

  const addAgendaItem = (dayIndex: number) => {
      const newAgenda = [...(courseForm.agenda || [])];
      newAgenda[dayIndex].items.push({ time: '', activity: '' });
      setCourseForm({ ...courseForm, agenda: newAgenda });
  };

  const updateAgendaItem = (dayIndex: number, itemIndex: number, field: 'time' | 'activity', value: string) => {
      const newAgenda = [...(courseForm.agenda || [])];
      newAgenda[dayIndex].items[itemIndex][field] = value;
      setCourseForm({ ...courseForm, agenda: newAgenda });
  };

  const removeAgendaItem = (dayIndex: number, itemIndex: number) => {
      const newAgenda = [...(courseForm.agenda || [])];
      newAgenda[dayIndex].items.splice(itemIndex, 1);
      setCourseForm({ ...courseForm, agenda: newAgenda });
  };

  const removeAgendaDay = (dayIndex: number) => {
      const newAgenda = [...(courseForm.agenda || [])];
      newAgenda.splice(dayIndex, 1);
      setCourseForm({ ...courseForm, agenda: newAgenda });
  };

  const getStatusBadge = (status: CourseStatus) => {
      switch(status) {
          case 'Published': return <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">上架中 (Published)</span>;
          case 'Pending': return <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded animate-pulse">审核中 (Pending)</span>;
          case 'Rejected': return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">已拒绝 (Rejected)</span>;
          default: return <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">草稿 (Draft)</span>;
      }
  };

  if (!user) return null;

  // --- ROLE: DOCTOR (Consumer) ---
  if (user.role === 'Doctor') {
     return (
        <DashboardLayout 
            sidebarItems={['My Dashboard', 'Academic Path', 'My Orders', 'Rewards Hub']}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            logout={logout}
        >
             {activeTab === 'My Dashboard' && (
                 <div className="grid lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-8">
                         <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                             <div className="w-24 h-24 bg-vs/10 rounded-full flex items-center justify-center text-4xl shadow-inner">👨‍⚕️</div>
                             <div className="flex-1 text-center md:text-left">
                                 <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                     <h2 className="text-3xl font-black text-slate-900">{user.name}</h2>
                                     <span className="px-3 py-1 bg-vs text-white text-xs font-black uppercase rounded-full tracking-widest">{user.level}</span>
                                 </div>
                                 <p className="text-slate-400 font-bold text-sm mb-6">{user.email}</p>
                                 <div className="grid grid-cols-3 gap-8 border-t border-slate-50 pt-6">
                                     <div><p className="text-xs font-black text-slate-400 uppercase mb-1">Courses</p><p className="text-xl font-black">4</p></div>
                                     <div><p className="text-xs font-black text-slate-400 uppercase mb-1">CPE Credits</p><p className="text-xl font-black">12.5</p></div>
                                     <div><p className="text-xs font-black text-vs uppercase mb-1">Member Points</p><p className="text-xl font-black text-vs">{userPoints}</p></div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
             {/* Simplified placeholders for other doctor tabs */}
             {activeTab !== 'My Dashboard' && <div className="p-10 text-center text-slate-400">Section under development</div>}
        </DashboardLayout>
     );
  }

  // --- ROLE: SHOP SUPPLIER ---
  if (user.role === 'ShopSupplier') {
      return (
        <DashboardLayout 
            sidebarItems={['概览', '库存管理', '订单履约', '数据分析']}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            logout={logout}
        >
            {activeTab === '概览' && (
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">总收入</p>
                        <p className="text-3xl font-black text-slate-900 mt-2">¥128,400</p>
                    </div>
                </div>
            )}
            {activeTab !== '概览' && <div className="p-10 text-center text-slate-400">Module loaded.</div>}
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
        <DashboardLayout 
            sidebarItems={['教学概览', '课程管理', '学员名单', '收益分析']}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            logout={logout}
        >
             {/* TAB 1: OVERVIEW */}
             {activeTab === '教学概览' && (
                 <div className="grid grid-cols-3 gap-6">
                     <div className="bg-purple-600 p-8 rounded-[32px] text-white col-span-2 shadow-xl shadow-purple-900/20 flex flex-col justify-between relative overflow-hidden">
                         <div className="relative z-10">
                            <h2 className="text-2xl font-black mb-2">学员报名趋势 (Enrollment Trend)</h2>
                            <p className="opacity-80 max-w-sm mb-6">近6个月学员增长势头良好，特别是骨科实操班。</p>
                            <div className="h-32 w-full bg-purple-800/30 rounded-xl p-4 relative overflow-hidden border border-white/10">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d={`M${trendPoints} L100,100 L0,100 Z`} fill="rgba(255,255,255,0.2)" />
                                    <polyline points={trendPoints} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                         </div>
                         <div className="mt-8 relative z-10 flex gap-4">
                            <button onClick={() => { setIsEditingCourse(false); setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [], price: 0, instructor: { name: user.name, title: '', bio: '', imageUrl: '', credentials: [] }, location: { city: '', venue: '', address: '' } }); setShowModal('addCourse'); }} className="bg-white text-purple-600 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-purple-50 transition-all shadow-lg">
                                + 发布新课程 (AI)
                            </button>
                         </div>
                     </div>
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
                         <p className="text-xs font-bold text-slate-400 uppercase">总收益 (Revenue)</p>
                         <p className="text-4xl font-black text-purple-600 mt-2">¥{totalRevenue.toLocaleString()}</p>
                     </div>
                 </div>
             )}

             {/* TAB 2: COURSE MANAGEMENT */}
             {activeTab === '课程管理' && (
                 <div className="space-y-6 animate-in fade-in duration-500">
                     <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl text-slate-900">我的课程库</h3>
                        <button onClick={() => { setIsEditingCourse(false); setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [], price: 0, instructor: { name: user.name, title: '', bio: '', imageUrl: '', credentials: [] }, location: { city: '', venue: '', address: '' } }); setShowModal('addCourse'); }} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
                            + 发布课程 (AI)
                        </button>
                     </div>

                     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {courses.map(c => (
                             <div key={c.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col group hover:border-purple-200 transition-all relative">
                                 <div className="absolute top-4 right-4 z-10">
                                     {getStatusBadge(c.status)}
                                 </div>
                                 <div className="h-40 bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                                     <img src={c.imageUrl || 'https://via.placeholder.com/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                     <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest text-purple-600 shadow-sm">
                                         {c.level}
                                     </span>
                                 </div>
                                 <div className="flex justify-between items-start mb-2">
                                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.specialty}</span>
                                 </div>
                                 <h4 className="font-black text-slate-900 mb-1 leading-tight">{c.title}</h4>
                                 
                                 {/* Protected Access: location may be undefined in old data */}
                                 <p className="text-xs text-slate-500 font-medium mb-4">
                                     {(c.location && c.location.city) || 'TBD'} • {c.startDate || 'Date Pending'}
                                 </p>
                                 
                                 <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                                     {/* Protected Access: price may be missing */}
                                     <span className="font-bold text-slate-900">¥{(c.price || 0).toLocaleString()}</span>
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

             {/* TAB 3: STUDENT LIST (Implementation Added) */}
             {activeTab === '学员名单' && (
                 <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-in fade-in duration-500">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Enrollment Roster</h3>
                        <button className="text-xs text-purple-600 font-bold hover:underline">Export CSV</button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-6">Student</th>
                                <th className="p-6">Course</th>
                                <th className="p-6">Date</th>
                                <th className="p-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {studentEnrollments.length > 0 ? studentEnrollments.map((enrollment, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-6 font-bold text-slate-900">
                                        {enrollment.studentName}
                                        <div className="text-xs text-slate-400 font-medium">{enrollment.studentEmail}</div>
                                    </td>
                                    <td className="p-6">{enrollment.courseName}</td>
                                    <td className="p-6">{enrollment.date}</td>
                                    <td className="p-6">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${enrollment.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {enrollment.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No active enrollments found.</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
             )}

             {/* TAB 4: REVENUE (Implementation Added) */}
             {activeTab === '收益分析' && (
                 <div className="grid grid-cols-2 gap-8 animate-in fade-in duration-500">
                     <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center py-20">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-bold text-slate-900">Financial Reports</h3>
                        <p className="text-slate-500 mb-6">Detailed breakdown available for download.</p>
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-slate-800 transition-all">Download CSV</button>
                     </div>
                     <div className="bg-white p-8 rounded-3xl border border-slate-100">
                        <h4 className="font-bold mb-4 text-slate-900">Recent Payouts</h4>
                        <div className="space-y-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="font-bold text-sm">Payout #{202400 + i}</p>
                                        <p className="text-xs text-slate-400">2025-05-0{i}</p>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-600">+¥12,500.00</span>
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>
             )}

            {/* MODAL: ADD/EDIT COURSE */}
            {showModal === 'addCourse' && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
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
                                        <label className="block text-xs font-black text-purple-600 uppercase mb-2 tracking-widest">
                                            STEP 1: AI 智能生成 (Draft Idea)
                                        </label>
                                        <textarea 
                                            value={aiDraftInput}
                                            onChange={e => setAiDraftInput(e.target.value)}
                                            placeholder="例如：高级小动物软组织外科实操班，为期三天，地点上海。主要讲授肝叶切除和胸腔镜。目标学员是有3年经验的医生。定价大概5000元。"
                                            className="w-full h-24 p-4 rounded-xl border-2 border-purple-100 bg-white focus:border-purple-300 outline-none text-sm leading-relaxed"
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
                                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">AI 生成结果预览</span>
                                            <button onClick={applyAIContent} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                                                应用到表单 →
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-xs text-slate-700">
                                            <div><span className="font-bold">Title:</span> {generatedContent.titleCN}</div>
                                            <div><span className="font-bold">Days:</span> {generatedContent.agenda?.length}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-6 border rounded-2xl border-slate-100 bg-white">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex justify-between items-center">
                                        {isEditingCourse ? '修改课程详情' : 'STEP 2: 完善细节 (Edit Details)'}
                                    </h4>
                                    
                                    {/* Localized Title/Desc Tabs with AI Translate */}
                                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                                        {['en', 'zh', 'th'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setEditingLang(lang as any)}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                    editingLang === lang ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                {lang === 'en' ? 'English' : lang === 'zh' ? '中文' : 'ไทย'}
                                            </button>
                                        ))}
                                        <button 
                                            onClick={handleTranslateFields}
                                            disabled={isTranslating}
                                            className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg text-xs font-black uppercase flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                                        >
                                            {isTranslating ? '...' : '✨ Auto-Translate'}
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {editingLang === 'en' && (
                                            <div className="space-y-4 animate-in fade-in">
                                                <input type="text" placeholder="Course Title (EN)" value={courseForm.title || ''} onChange={e => setCourseForm(prev => ({...prev, title: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-bold" />
                                                <textarea placeholder="Description (EN)" value={courseForm.description || ''} onChange={e => setCourseForm(prev => ({...prev, description: e.target.value}))} className="w-full h-24 p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        )}
                                        {editingLang === 'zh' && (
                                            <div className="space-y-4 animate-in fade-in">
                                                <input type="text" placeholder="课程标题 (中文)" value={courseForm.title_zh || ''} onChange={e => setCourseForm(prev => ({...prev, title_zh: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-bold" />
                                                <textarea placeholder="课程简介 (中文)" value={courseForm.description_zh || ''} onChange={e => setCourseForm(prev => ({...prev, description_zh: e.target.value}))} className="w-full h-24 p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        )}
                                        {editingLang === 'th' && (
                                            <div className="space-y-4 animate-in fade-in">
                                                <input type="text" placeholder="หัวข้อหลักสูตร (Thai)" value={courseForm.title_th || ''} onChange={e => setCourseForm(prev => ({...prev, title_th: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-bold" />
                                                <textarea placeholder="รายละเอียดหลักสูตร (Thai)" value={courseForm.description_th || ''} onChange={e => setCourseForm(prev => ({...prev, description_th: e.target.value}))} className="w-full h-24 p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        )}

                                        {/* Core Logistics Fields */}
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Start Date</label>
                                                <input type="date" value={courseForm.startDate || ''} onChange={e => setCourseForm(prev => ({...prev, startDate: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">End Date</label>
                                                <input type="date" value={courseForm.endDate || ''} onChange={e => setCourseForm(prev => ({...prev, endDate: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">City</label>
                                                <input type="text" placeholder="e.g. Shanghai" value={courseForm.location?.city || ''} onChange={e => setCourseForm(prev => ({...prev, location: {...(prev.location || {} as any), city: e.target.value}}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Venue Name</label>
                                                <input type="text" placeholder="e.g. Training Center" value={courseForm.location?.venue || ''} onChange={e => setCourseForm(prev => ({...prev, location: {...(prev.location || {} as any), venue: e.target.value}}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase mb-1">Full Address</label>
                                            <input type="text" placeholder="Street address..." value={courseForm.location?.address || ''} onChange={e => setCourseForm(prev => ({...prev, location: {...(prev.location || {} as any), address: e.target.value}}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Instructor Name</label>
                                                <input type="text" placeholder="Dr. Name" value={courseForm.instructor?.name || ''} onChange={e => setCourseForm(prev => ({...prev, instructor: {...(prev.instructor || {} as any), name: e.target.value}}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Instructor Title</label>
                                                <input type="text" placeholder="DVM, DACVS" value={courseForm.instructor?.title || ''} onChange={e => setCourseForm(prev => ({...prev, instructor: {...(prev.instructor || {} as any), title: e.target.value}}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>

                                        {/* Structured Agenda Editor */}
                                        <div className="border-t border-slate-100 my-4 pt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="block text-xs font-bold text-slate-400 uppercase">课程日程 (Agenda)</label>
                                                <button onClick={addAgendaDay} className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded font-bold hover:bg-purple-100">+ Add Day</button>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {courseForm.agenda?.map((day, dayIndex) => (
                                                    <div key={dayIndex} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                        <div className="flex gap-2 mb-3">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Day 1"
                                                                value={day.day}
                                                                onChange={(e) => updateAgendaDay(dayIndex, 'day', e.target.value)}
                                                                className="w-20 p-2 text-xs font-bold border rounded"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Date (e.g. 2025-01-01)"
                                                                value={day.date}
                                                                onChange={(e) => updateAgendaDay(dayIndex, 'date', e.target.value)}
                                                                className="w-32 p-2 text-xs font-mono border rounded"
                                                            />
                                                            <button onClick={() => removeAgendaDay(dayIndex)} className="ml-auto text-red-400 text-xs font-bold hover:text-red-600">Remove</button>
                                                        </div>
                                                        <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                                                            {day.items.map((item, itemIndex) => (
                                                                <div key={itemIndex} className="flex gap-2 items-center">
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="09:00"
                                                                        value={item.time}
                                                                        onChange={(e) => updateAgendaItem(dayIndex, itemIndex, 'time', e.target.value)}
                                                                        className="w-16 p-2 text-xs font-mono border rounded"
                                                                    />
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Activity"
                                                                        value={item.activity}
                                                                        onChange={(e) => updateAgendaItem(dayIndex, itemIndex, 'activity', e.target.value)}
                                                                        className="flex-1 p-2 text-xs border rounded"
                                                                    />
                                                                    <button onClick={() => removeAgendaItem(dayIndex, itemIndex)} className="text-slate-400 hover:text-red-500">×</button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => addAgendaItem(dayIndex)} className="text-xs text-purple-500 font-bold hover:underline">+ Add Time Slot</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 my-4 pt-4">
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">封面图 URL</label>
                                            <input type="text" placeholder="https://..." value={courseForm.imageUrl || ''} onChange={e => setCourseForm(prev => ({...prev, imageUrl: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">专科</label>
                                                <select value={courseForm.specialty} onChange={e => setCourseForm(prev => ({...prev, specialty: e.target.value as Specialty}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm">
                                                    {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">价格 (CNY)</label>
                                                <input type="number" placeholder="价格" value={courseForm.price || ''} onChange={e => setCourseForm(prev => ({...prev, price: Number(e.target.value)}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 overflow-y-auto">
                                <div className="text-center mb-6"><p className="text-xs font-black text-slate-400 uppercase tracking-widest">APP 端预览效果 ({editingLang.toUpperCase()})</p></div>
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-sm mx-auto">
                                    <div className="h-40 bg-slate-200 relative">
                                        <img src={courseForm.imageUrl || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover" />
                                        <div className="absolute top-4 left-4 bg-white/90 px-2 py-1 rounded text-xs font-bold uppercase">{courseForm.level}</div>
                                    </div>
                                    <div className="p-5">
                                        <h4 className="font-black text-slate-900 mb-2 leading-tight">
                                            {editingLang === 'zh' ? (courseForm.title_zh || courseForm.title) : editingLang === 'th' ? (courseForm.title_th || courseForm.title) : courseForm.title || 'Course Title'}
                                        </h4>
                                        <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">
                                            {courseForm.startDate || 'YYYY-MM-DD'} • {courseForm.location?.city || 'City'}
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4 line-clamp-3">
                                            {editingLang === 'zh' ? (courseForm.description_zh || courseForm.description) : editingLang === 'th' ? (courseForm.description_th || courseForm.description) : courseForm.description || 'Description...'}
                                        </p>
                                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                            <span className="font-black text-slate-900">¥{(courseForm.price || 0).toLocaleString()}</span>
                                            <button className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold">立即报名</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => { setShowModal(null); setIsEditingCourse(false); }} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">取消</button>
                            <button onClick={handleSaveCourse} className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all">
                                {isEditingCourse 
                                    ? (user.role === 'Admin' ? '保存修改 (Update)' : '提交修改审核 (Submit for Review)') 
                                    : '提交发布审核 (Submit for Review)'}
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
        <DashboardLayout 
            sidebarItems={['概览', 'AI 大脑中枢', '全局课程管理', '用户管理', '财务报表']}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            logout={logout}
        >
             {activeTab === '概览' && (
                 <div className="grid grid-cols-4 gap-6">
                     <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                         <p className="text-xs font-bold text-slate-500 uppercase">平台总交易额 (Platform Volume)</p>
                         <h3 className="text-2xl font-black text-white">¥{orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</h3>
                     </div>
                 </div>
             )}

             {activeTab === '全局课程管理' && (
                 <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl text-white">平台课程全库 (Course Audit)</h3>
                        <div className="text-slate-400 text-xs">共 {courses.length} 门课程</div>
                     </div>
                     <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-white/5 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-6">课程名称</th>
                                    <th className="p-6">讲师</th>
                                    <th className="p-6">价格</th>
                                    <th className="p-6">状态 (Status)</th>
                                    <th className="p-6 text-right">审核操作 (Audit)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {courses.map(c => (
                                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 font-bold text-white">
                                            {c.title}
                                            <div className="text-xs text-slate-500 mt-1">{c.specialty}</div>
                                        </td>
                                        <td className="p-6">{c.instructor?.name || 'TBD'}</td>
                                        <td className="p-6">¥{(c.price || 0).toLocaleString()}</td>
                                        <td className="p-6">
                                            {c.status === 'Pending' ? <span className="text-amber-400 bg-amber-900/30 px-2 py-1 rounded text-xs animate-pulse">Waiting Review</span> : 
                                             c.status === 'Published' ? <span className="text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded text-xs">Live</span> :
                                             <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded text-xs">{c.status}</span>}
                                        </td>
                                        <td className="p-6 text-right flex justify-end gap-2">
                                            {c.status === 'Pending' ? (
                                                <>
                                                    <button onClick={() => handleApproveCourse(c.id)} className="bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold hover:bg-emerald-400 transition-all">
                                                        ✓ 通过 (Approve)
                                                    </button>
                                                    <button onClick={() => handleRejectCourse(c.id)} className="bg-red-500 text-white px-4 py-2 rounded text-xs font-bold hover:bg-red-400 transition-all">
                                                        ✗ 拒绝 (Reject)
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleDeleteCourse(c.id)} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest border border-slate-700 px-4 py-2 rounded hover:bg-white/10 transition-all">
                                                    管理 (Manage)
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
