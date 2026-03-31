'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Order, Product, Course, Specialty, ProductGroup, CourseStatus, UserRole, CourseEnrollment } from '../types';
import { api } from '../services/api';
import { PORTAL_THEME } from '../lib/constants';
import { useNotification } from '../context/NotificationContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { getSystemInstruction, saveSystemInstruction, getAIConfig, saveAIConfig, generateStructuredData, generateCourseTranslations } from '../services/gemini';

// --- DashboardLayout Component ---
interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: string[];
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logout: () => void | Promise<void>;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, sidebarItems, user, activeTab, setActiveTab, logout }) => {
  const theme = PORTAL_THEME[user.role as UserRole] || PORTAL_THEME.Doctor;

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
                   {user.role === 'Admin' ? '退出登录' : 'Sign Out'}
               </button>
           </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 h-screen overflow-y-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className={`text-4xl font-black tracking-tight mb-1 ${user.role === 'Admin' ? 'text-white' : 'text-slate-900'}`}>{activeTab}</h1>
                    <p className="text-slate-400 text-sm font-medium">
                        {user.role === 'Admin' ? `欢迎回来, ${user.name}` : `Welcome back, ${user.name}`}
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
  const { t, locale } = useLanguage();  const router = useRouter();  const pathname = usePathname();
  const { addNotification } = useNotification();
  const { isCN } = useSiteConfig();
  
  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(user?.points || 0);
  const [userLevel, setUserLevel] = useState(user?.level || 'Resident');
  
  // UI State
  const [activeTab, setActiveTab] = useState('Overview');
  const [showModal, setShowModal] = useState<'addProduct' | 'addCourse' | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUserFilter, setAdminUserFilter] = useState<string>('All');

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
      currency: isCN ? 'CNY' : 'USD',
      price: 0,
      maxCapacity: 30,
      enrollmentDeadline: '',
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
        router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
        return;
    }

    // Redirect Doctor users to User Center
    if (user.role === 'Doctor') {
        router.push(`/${locale}/user`);
        return;
    }

    const savedTab = sessionStorage.getItem(`vs_dash_tab_${user.id}`);
    if (savedTab) {
        setActiveTab(savedTab);
    } else {
        setActiveTab('Overview');
    }

    if (user.points !== undefined) {
      setUserPoints(user.points);
    }

    loadData();
    loadWishlist();

    setSystemPrompt(getSystemInstruction());
    setAiConfig(getAIConfig());
  }, [user, router]);

  useEffect(() => {
      if (user && activeTab) {
          sessionStorage.setItem(`vs_dash_tab_${user.id}`, activeTab);
      }
  }, [activeTab, user]);

  const loadData = async () => {
    setLoading(true);

    const [fetchedOrders, fetchedProducts, fetchedCourses, pointsData] = await Promise.all([
        api.getOrders(user?.email),
        api.getProducts(),
        api.getCourses(),
        user?.id ? api.fetchUserPoints(user.id) : Promise.resolve({ points: 0, level: 'Resident' })
    ]);

    // Fetch enrollments for doctors
    if (user?.role === 'Doctor' && user?.id) {
      const fetchedEnrollments = await api.getEnrollments(user.id);
      setEnrollments(fetchedEnrollments);
    }

    setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
    setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
    setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
    if (typeof pointsData === 'object' && pointsData !== null) {
      setUserPoints(pointsData.points);
      setUserLevel(pointsData.level);
    }

    setLoading(false);
  };

  // Load wishlist
  const loadWishlist = async () => {
    if (!user?.id) return;
    setWishlistLoading(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist || data.items || []);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Remove from wishlist
  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      setWishlist(prev => prev.filter((item: any) => item.product_id !== productId));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
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
          instructor: course.instructor || { name: '', title: '', bio: '', imageUrl: '', credentials: [] },
          location: course.location || { city: '', venue: '', address: '' }
      });
      setIsEditingCourse(true);
      setShowModal('addCourse');
  };

  // --- Admin Audit Actions ---
  const handleApproveCourse = async (courseId: string) => {
      await api.manageCourse('update', { id: courseId, status: 'published' });
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: 'published' } : c));
      addNotification({ id: `audit-ok-${Date.now()}`, type: 'system', title: '审核通过', message: '课程已正式上架。', read: false, timestamp: new Date() });
  };

  const handleRejectCourse = async (courseId: string) => {
      await api.manageCourse('update', { id: courseId, status: 'offline' });
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: 'offline' } : c));
      addNotification({ id: `audit-rej-${Date.now()}`, type: 'system', title: '已下架', message: '课程已下架。', read: false, timestamp: new Date() });
  };

  // --- Provider Submit Action ---
  const handleSaveCourse = async () => {
      const action = isEditingCourse ? 'update' : 'create';
      const newStatus: CourseStatus = user?.role === 'Admin' ? 'published' : 'pending';
      
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
          currency: isCN ? 'CNY' : 'USD',
          price: 0,
          agenda: [],
          maxCapacity: 30,
          enrollmentDeadline: '',
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
          case 'published': return <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">已上架 (Published)</span>;
          case 'pending': return <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded animate-pulse">审核中 (Pending)</span>;
          case 'offline': return <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">已下架 (Offline)</span>;
          default: return <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">草稿 (Draft)</span>;
      }
  };

  if (!user) return null;

  // --- ROLE: DOCTOR (Consumer) ---
  if (user.role === 'Doctor') {
     const paidEnrollments = enrollments.filter(e => e.paymentStatus === 'paid');
     const completedCourses = enrollments.filter(e => e.completionStatus === 'completed').length;
     
     return (
        <DashboardLayout
            sidebarItems={[t.dashboard.myDashboard, t.dashboard.myCourses, t.dashboard.myOrders, t.dashboard.myWishlist, t.dashboard.rewardsHub]}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            logout={logout}
        >
             {activeTab === t.dashboard.myDashboard && (
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
                                     <div><p className="text-xs font-black text-slate-400 uppercase mb-1">{t.dashboard.enrolled}</p><p className="text-xl font-black">{enrollments.length}</p></div>
                                     <div><p className="text-xs font-black text-slate-400 uppercase mb-1">{t.dashboard.completed}</p><p className="text-xl font-black">{completedCourses}</p></div>
                                     <div><p className="text-xs font-black text-vs uppercase mb-1">{t.dashboard.points}</p><p className="text-xl font-black text-vs">{userPoints}</p></div>
                                 </div>
                             </div>
                         </div>
                         
                         {/* Recent Enrollments Preview */}
                         {enrollments.length > 0 && (
                           <div className="bg-white p-8 rounded-[32px] border border-slate-100">
                             <div className="flex justify-between items-center mb-6">
                               <h3 className="font-black text-slate-900">{t.dashboard.myCourses}</h3>
                               <button onClick={() => setActiveTab(t.dashboard.myCourses)} className="text-vs text-xs font-bold hover:underline">{t.dashboard.viewAll} →</button>
                             </div>
                             <div className="space-y-4">
                               {enrollments.slice(0, 3).map(enrollment => (
                                 <div key={enrollment.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                   <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden">
                                     {enrollment.course?.imageUrl && <img src={enrollment.course.imageUrl} className="w-full h-full object-cover" alt="" />}
                                   </div>
                                   <div className="flex-1">
                                     <p className="font-bold text-slate-900">{enrollment.course?.title || 'Course'}</p>
                                     <p className="text-xs text-slate-400">{enrollment.course?.startDate} • {enrollment.course?.location?.city}</p>
                                   </div>
                                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                     enrollment.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                   }`}>
                                   {enrollment.paymentStatus === 'paid' ? t.dashboard.enrolled : t.dashboard.noOrdersYet.split('.')[0]}
                                   </span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                     </div>
                 </div>
             )}
             
             {activeTab === t.dashboard.myCourses && (
               <div className="space-y-6">
                 <h3 className="font-black text-xl text-slate-900">{t.dashboard.myCourses}</h3>
                 {loading ? (
                   <div className="text-center py-12 text-slate-400">Loading...</div>
                 ) : enrollments.length === 0 ? (
                   <div className="bg-white p-12 rounded-[32px] border border-slate-100 text-center">
                     <p className="text-slate-400 mb-4">{t.dashboard.noCoursesYet}</p>
                     <button onClick={() => router.push(`/${locale}/courses`)} className="bg-vs text-white px-6 py-3 rounded-xl font-bold text-sm">
                       {t.dashboard.browseCourses}
                     </button>
                   </div>
                 ) : (
                   <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {enrollments.map(enrollment => (
                       <div key={enrollment.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                         <div className="h-40 bg-slate-100 rounded-2xl mb-4 overflow-hidden">
                           {enrollment.course?.imageUrl && (
                             <img src={enrollment.course.imageUrl} className="w-full h-full object-cover" alt={enrollment.course.title} />
                           )}
                         </div>
                         <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-slate-400 uppercase">{enrollment.course?.specialty}</span>
                           <span className={`px-2 py-1 rounded text-xs font-bold ${
                             enrollment.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                           }`}>
                             {enrollment.paymentStatus === 'paid' ? t.dashboard.enrolled : 'Pending'}
                           </span>
                         </div>
                         <h4 className="font-black text-slate-900 mb-1">{enrollment.course?.title}</h4>
                         <p className="text-xs text-slate-500 mb-4">
                           {enrollment.course?.startDate} • {enrollment.course?.location?.city || 'TBD'}
                         </p>
                         <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                           <span className="text-xs text-slate-400">
                             {t.dashboard.enrolled}: {enrollment.enrollmentDate?.split('T')[0] || ''}
                           </span>
                           <span className={`text-xs font-bold ${
                             enrollment.completionStatus === 'completed' ? 'text-emerald-600' : 'text-slate-400'
                           }`}>
                             {enrollment.completionStatus === 'completed' ? `✓ ${t.dashboard.completed}` : enrollment.completionStatus}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
             
             {activeTab === t.dashboard.myOrders && (
               <div className="space-y-6">
                 <h3 className="font-black text-xl text-slate-900">{t.dashboard.myOrders}</h3>
                 {orders.length === 0 ? (
                   <div className="bg-white p-12 rounded-[32px] border border-slate-100 text-center">
                     <p className="text-slate-400">{t.dashboard.noOrdersYet}</p>
                   </div>
                 ) : (
                   <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                         <tr>
                           <th className="p-6">ID</th>
                           <th className="p-6">{t.common.items}</th>
                           <th className="p-6">{t.common.total}</th>
                           <th className="p-6">{t.common.date}</th>
                           <th className="p-6">{t.common.status}</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {orders.map(order => (
                           <tr key={order.id} className="hover:bg-slate-50">
                             <td className="p-6 font-bold text-slate-900">{order.id}</td>
                             <td className="p-6">{order.items.length} item(s)</td>
                             <td className="p-6">¥{order.totalAmount.toLocaleString()}</td>
                             <td className="p-6">{order.date}</td>
                             <td className="p-6">
                               <span className={`px-2 py-1 rounded text-xs font-bold ${
                                 order.status === 'Paid' || order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                 order.status === 'Shipped' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                               }`}>
                                 {order.status}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             )}
             
             {activeTab === t.dashboard.myWishlist && (
               <div className="space-y-6">
                 <h3 className="font-black text-xl text-slate-900">{t.dashboard.myWishlist}</h3>
                 {wishlistLoading ? (
                   <div className="text-center py-12 text-slate-400">Loading...</div>
                 ) : wishlist.length === 0 ? (
                   <div className="bg-white p-12 rounded-[32px] border border-slate-100 text-center">
                     <div className="text-6xl mb-4">💝</div>
                     <p className="text-slate-400 mb-4">{t.wishlist.empty}</p>
                     <button onClick={() => router.push(`/${locale}/shop`)} className="bg-vs text-white px-6 py-3 rounded-xl font-bold text-sm">
                       {t.shop.browseProducts || 'Browse Products'}
                     </button>
                   </div>
                 ) : (
                   <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {wishlist.map((item: any) => (
                       <div key={item.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                         <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden">
                           {item.product?.image_url || item.products?.cover_image_url ? (
                             <img
                               src={item.product?.image_url || item.products?.cover_image_url}
                               alt={item.product?.name || item.products?.display_name || 'Product'}
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-300">
                               <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                               </svg>
                             </div>
                           )}
                         </div>
                         <h4 className="font-bold text-slate-900 mb-1 line-clamp-1">
                           {item.product?.name || item.products?.display_name || 'Product'}
                         </h4>
                         <p className="text-sm text-slate-500 mb-3">
                           {item.product?.brand || item.products?.brand || ''}
                         </p>
                         <div className="flex items-center justify-between">
                           <span className="font-bold text-vs">
                             ${item.product?.selling_price_usd || item.products?.display_price || '---'}
                           </span>
                           <div className="flex gap-2">
                             <button
                               onClick={() => router.push(`/${locale}/shop/${item.product?.slug || item.products?.slug || item.product_id}`)}
                               className="px-3 py-2 bg-vs text-white text-xs font-bold rounded-lg hover:bg-vs-dark transition-colors"
                             >
                               {t.common.view || 'View'}
                             </button>
                             <button
                               onClick={() => handleRemoveFromWishlist(item.product_id)}
                               className="px-3 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
                             >
                               {t.wishlist.remove}
                             </button>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}

             {activeTab === t.dashboard.rewardsHub && (
               <div className="bg-white p-10 rounded-[32px] border border-slate-100">
                 <h3 className="font-black text-xl text-slate-900 mb-6">{t.dashboard.pointsRewards}</h3>
                 <div className="text-center py-8">
                   <p className="text-6xl font-black text-vs mb-2">{userPoints}</p>
                   <p className="text-slate-400 font-bold">{t.dashboard.totalPoints}</p>
                 </div>
                 <div className="grid grid-cols-3 gap-4 mt-8">
                   <div className="p-4 bg-slate-50 rounded-xl text-center">
                     <p className="text-2xl mb-1">📝</p>
                     <p className="text-xs font-bold text-slate-600">Post Case</p>
                     <p className="text-vs font-black">+200 pts</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-xl text-center">
                     <p className="text-2xl mb-1">💬</p>
                     <p className="text-xs font-bold text-slate-600">Comment</p>
                     <p className="text-vs font-black">+20 pts</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-xl text-center">
                     <p className="text-2xl mb-1">🔗</p>
                     <p className="text-xs font-bold text-slate-600">Share</p>
                     <p className="text-vs font-black">+50 pts</p>
                   </div>
                 </div>
               </div>
             )}
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
                        <p className="text-3xl font-black text-slate-900 mt-2">¥{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">总订单</p>
                        <p className="text-3xl font-black text-slate-900 mt-2">{orders.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">商品数量</p>
                        <p className="text-3xl font-black text-slate-900 mt-2">{products.length}</p>
                    </div>
                </div>
            )}

            {/* Inventory Management */}
            {activeTab === '库存管理' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-xl text-slate-900">商品库存 (Inventory)</h3>
                        <button onClick={() => setShowModal('addProduct')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                            + 添加商品
                        </button>
                    </div>
                    {products.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="text-slate-400 font-bold">暂无商品</p>
                            <button onClick={() => setShowModal('addProduct')} className="mt-4 text-blue-600 font-bold text-sm hover:underline">添加第一个商品</button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition">
                                    <div className="h-40 bg-slate-100 overflow-hidden">
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{product.name}</h4>
                                        <p className="text-xs text-slate-400 mb-3">{product.specialty} · {product.group}</p>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-lg font-black text-blue-600">¥{product.price.toLocaleString()}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                product.stockStatus === 'In Stock' ? 'bg-emerald-50 text-emerald-600' :
                                                product.stockStatus === 'Low Stock' ? 'bg-amber-50 text-amber-600' :
                                                'bg-red-50 text-red-600'
                                            }`}>{product.stockStatus}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDeleteProduct(product.id)} className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition">
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Order Fulfillment */}
            {activeTab === '订单履约' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-xl text-slate-900">订单管理 (Order Fulfillment)</h3>
                        <div className="text-sm text-slate-500">共 {orders.length} 笔订单</div>
                    </div>
                    {orders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                            <div className="text-5xl mb-4">📋</div>
                            <p className="text-slate-400 font-bold">暂无订单</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">订单号</th>
                                        <th className="p-4">客户</th>
                                        <th className="p-4">商品数</th>
                                        <th className="p-4">金额</th>
                                        <th className="p-4">状态</th>
                                        <th className="p-4 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 font-mono font-bold text-slate-900">#{order.id.slice(0, 8)}</td>
                                            <td className="p-4 text-slate-600">{order.customerEmail || order.customerName}</td>
                                            <td className="p-4">{order.items?.length || 0} 件</td>
                                            <td className="p-4 font-bold">¥{order.totalAmount.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                    order.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                    order.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                                    order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-slate-50 text-slate-500'
                                                }`}>{order.status}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {order.status === 'Paid' && (
                                                    <button onClick={() => handleShipOrder(order.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition">
                                                        标记发货
                                                    </button>
                                                )}
                                                {order.status === 'Shipped' && (
                                                    <span className="text-xs text-blue-500 font-bold">已发货 ✓</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Analytics */}
            {activeTab === '数据分析' && (
                <div className="space-y-6">
                    <h3 className="font-black text-xl text-slate-900">数据分析 (Analytics)</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">总收入</p>
                            <p className="text-2xl font-black text-slate-900">¥{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">总订单</p>
                            <p className="text-2xl font-black text-slate-900">{orders.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">平均订单额</p>
                            <p className="text-2xl font-black text-slate-900">¥{orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length).toLocaleString() : 0}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">低库存预警</p>
                            <p className={`text-2xl font-black ${products.filter(p => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock').length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {products.filter(p => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock').length}
                            </p>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <h4 className="font-bold text-slate-900 mb-4">热销商品 (Top Products)</h4>
                        {products.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-6">暂无商品数据</p>
                        ) : (
                            <div className="space-y-3">
                                {products.slice(0, 5).map((product, idx) => (
                                    <div key={product.id} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                                        <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">{idx + 1}</span>
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                                            <p className="text-xs text-slate-400">{product.specialty}</p>
                                        </div>
                                        <span className="font-black text-slate-900">¥{product.price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Order Status Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <h4 className="font-bold text-slate-900 mb-4">订单状态分布</h4>
                        <div className="grid grid-cols-4 gap-4">
                            {['Pending', 'Paid', 'Shipped', 'Completed'].map(status => {
                                const count = orders.filter(o => o.status === status).length;
                                const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                                return (
                                    <div key={status} className="text-center">
                                        <div className="h-24 flex items-end justify-center mb-2">
                                            <div className={`w-12 rounded-t-lg transition-all ${
                                                status === 'Pending' ? 'bg-amber-400' :
                                                status === 'Paid' ? 'bg-emerald-400' :
                                                status === 'Shipped' ? 'bg-blue-400' : 'bg-slate-400'
                                            }`} style={{ height: `${Math.max(pct, 8)}%` }} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">{status}</p>
                                        <p className="text-lg font-black text-slate-900">{count}</p>
                                    </div>
                                );
                            })}
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
                            <button onClick={() => { setIsEditingCourse(false); setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [], price: 0, currency: isCN ? 'CNY' : 'USD', maxCapacity: 30, enrollmentDeadline: '', instructor: { name: user.name, title: '', bio: '', imageUrl: '', credentials: [] }, location: { city: '', venue: '', address: '' } }); setShowModal('addCourse'); }} className="bg-white text-purple-600 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-purple-50 transition-all shadow-lg">
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
                        <button onClick={() => { setIsEditingCourse(false); setCourseForm({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS, agenda: [], price: 0, currency: isCN ? 'CNY' : 'USD', maxCapacity: 30, enrollmentDeadline: '', instructor: { name: user.name, title: '', bio: '', imageUrl: '', credentials: [] }, location: { city: '', venue: '', address: '' } }); setShowModal('addCourse'); }} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
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
                                     <img src={c.imageUrl || 'https://via.placeholder.com/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={c.title} />
                                     <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest text-purple-600 shadow-sm">
                                         {c.level}
                                     </span>
                                 </div>
                                 <div className="flex justify-between items-start mb-2">
                                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.specialty}</span>
                                 </div>
                                 <h4 className="font-black text-slate-900 mb-1 leading-tight">{c.title}</h4>
                                 
                                 <p className="text-xs text-slate-500 font-medium mb-4">
                                     {(c.location && c.location.city) || 'TBD'} • {c.startDate || 'Date Pending'}
                                 </p>

                                 <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                                     <span className="font-bold text-slate-900">{c.currency === 'CNY' ? '¥' : '$'}{(c.price || 0).toLocaleString()}</span>
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

             {/* TAB 3: STUDENT LIST */}
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

             {/* TAB 4: REVENUE */}
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

            {/* MODAL: ADD/EDIT COURSE - Due to length, implementing compact version */}
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

                                        {/* Core Fields - Compact Version */}
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
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Venue</label>
                                                <input type="text" placeholder="Training Center" value={courseForm.location?.venue || ''} onChange={e => setCourseForm(prev => ({...prev, location: {...(prev.location || {} as any), venue: e.target.value}}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">{`Price (${isCN ? 'CNY' : 'USD'})`}</label>
                                                <input type="number" value={courseForm.price || ''} onChange={e => setCourseForm(prev => ({...prev, price: Number(e.target.value)}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Specialty</label>
                                                <select value={courseForm.specialty} onChange={e => setCourseForm(prev => ({...prev, specialty: e.target.value as Specialty}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm">
                                                    {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Max Enrollment</label>
                                                <input type="number" placeholder="30" value={courseForm.maxCapacity || ''} onChange={e => setCourseForm(prev => ({...prev, maxCapacity: Number(e.target.value)}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Enrollment Deadline</label>
                                                <input type="date" value={courseForm.enrollmentDeadline || ''} onChange={e => setCourseForm(prev => ({...prev, enrollmentDeadline: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 overflow-y-auto">
                                <div className="text-center mb-6"><p className="text-xs font-black text-slate-400 uppercase tracking-widest">APP 端预览效果 ({editingLang.toUpperCase()})</p></div>
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-sm mx-auto">
                                    <div className="h-40 bg-slate-200 relative">
                                        <img src={courseForm.imageUrl || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover" alt="Preview" />
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
                                    ? '提交修改审核 (Submit for Review)' 
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
                         <h3 className="text-2xl font-black text-white">{isCN ? '¥' : '$'}{orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</h3>
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
                                    <th className="p-6">容量</th>
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
                                        <td className="p-6">{c.currency === 'CNY' ? '¥' : '$'}{(c.price || 0).toLocaleString()}</td>
                                        <td className="p-6">
                                            <span className="text-xs">{c.enrolledCount || 0}/{c.maxCapacity || 30}</span>
                                        </td>
                                        <td className="p-6">
                                            {c.status === 'pending' ? <span className="text-amber-400 bg-amber-900/30 px-2 py-1 rounded text-xs animate-pulse">Waiting Review</span> : 
                                             c.status === 'published' ? <span className="text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded text-xs">Live</span> :
                                             <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded text-xs">{c.status}</span>}
                                        </td>
                                        <td className="p-6 text-right flex justify-end gap-2">
                                            <button onClick={() => handleEditCourse(c)} className="text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-2 rounded text-xs font-bold hover:bg-blue-500/10 transition-all">
                                                Preview / Edit
                                            </button>
                                            {c.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleApproveCourse(c.id)} className="bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold hover:bg-emerald-400 transition-all">
                                                        ✓ Approve
                                                    </button>
                                                </>
                                            )}
                                            {c.status !== 'pending' && (
                                                <button onClick={() => handleDeleteCourse(c.id)} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest border border-slate-700 px-4 py-2 rounded hover:bg-white/10 transition-all">
                                                    Delete
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

             {/* User Management */}
             {activeTab === '用户管理' && (
                 <div className="space-y-6">
                     <div className="flex justify-between items-center">
                         <h3 className="font-bold text-xl text-white">用户管理 (User Management)</h3>
                         <select 
                             value={adminUserFilter}
                             onChange={(e) => setAdminUserFilter(e.target.value)}
                             className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300 focus:border-emerald-500 outline-none"
                         >
                             <option value="All">全部角色</option>
                             <option value="Doctor">Doctor</option>
                             <option value="CourseProvider">CourseProvider</option>
                             <option value="ShopSupplier">ShopSupplier</option>
                             <option value="Admin">Admin</option>
                         </select>
                     </div>
                     <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                         <table className="w-full text-left text-sm text-slate-300">
                             <thead className="bg-white/5 text-slate-500 font-bold uppercase text-xs">
                                 <tr>
                                     <th className="p-5">用户</th>
                                     <th className="p-5">邮箱</th>
                                     <th className="p-5">角色</th>
                                     <th className="p-5">注册日期</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                 {adminUsers
                                     .filter(u => adminUserFilter === 'All' || u.role === adminUserFilter)
                                     .map(u => (
                                     <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                         <td className="p-5">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
                                                     {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                                 </div>
                                                 <span className="font-bold text-white">{u.name || 'User'}</span>
                                             </div>
                                         </td>
                                         <td className="p-5 text-slate-400">{u.email}</td>
                                         <td className="p-5">
                                             <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                 u.role === 'Admin' ? 'bg-emerald-900/30 text-emerald-400' :
                                                 u.role === 'CourseProvider' ? 'bg-purple-900/30 text-purple-400' :
                                                 u.role === 'ShopSupplier' ? 'bg-blue-900/30 text-blue-400' :
                                                 'bg-slate-800 text-slate-400'
                                             }`}>{u.role}</span>
                                         </td>
                                         <td className="p-5 text-slate-500">{u.createdAt}</td>
                                     </tr>
                                 ))}
                                 {adminUsers.filter(u => adminUserFilter === 'All' || u.role === adminUserFilter).length === 0 && (
                                     <tr>
                                         <td colSpan={4} className="p-10 text-center text-slate-500">暂无用户数据</td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 </div>
             )}

             {/* Financial Reports */}
             {activeTab === '财务报表' && (
                 <div className="space-y-6">
                     <h3 className="font-bold text-xl text-white">财务报表 (Financial Reports)</h3>
                     
                     {/* Revenue Cards */}
                     <div className="grid grid-cols-4 gap-4">
                         <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase mb-2">总收入</p>
                             <p className="text-2xl font-black text-white">¥{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase mb-2">课程收入</p>
                             <p className="text-2xl font-black text-purple-400">
                                 ¥{orders.reduce((sum, o) => sum + o.items.filter(i => i.type === 'course').reduce((s, i) => s + i.price * i.quantity, 0), 0).toLocaleString()}
                             </p>
                         </div>
                         <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase mb-2">商品收入</p>
                             <p className="text-2xl font-black text-blue-400">
                                 ¥{orders.reduce((sum, o) => sum + o.items.filter(i => i.type !== 'course').reduce((s, i) => s + i.price * i.quantity, 0), 0).toLocaleString()}
                             </p>
                         </div>
                         <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase mb-2">总订单数</p>
                             <p className="text-2xl font-black text-emerald-400">{orders.length}</p>
                         </div>
                     </div>

                     {/* Orders Detail Table */}
                     <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                         <div className="flex justify-between items-center p-5 border-b border-white/5">
                             <h4 className="font-bold text-white">订单明细</h4>
                             <button 
                                 onClick={() => {
                                     const csv = ['订单号,客户,类型,金额,日期,状态'].concat(
                                         orders.map(o => `${o.id},${o.customerEmail || o.customerName},${o.items.map(i => i.type).join('+')},${o.totalAmount},${o.date},${o.status}`)
                                     ).join('\n');
                                     const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                                     const url = URL.createObjectURL(blob);
                                     const a = document.createElement('a');
                                     a.href = url; a.download = `vetsphere_finance_${new Date().toISOString().split('T')[0]}.csv`;
                                     a.click(); URL.revokeObjectURL(url);
                                 }}
                                 className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-400 transition"
                             >
                                 导出 CSV
                             </button>
                         </div>
                         <table className="w-full text-left text-sm text-slate-300">
                             <thead className="bg-white/5 text-slate-500 font-bold uppercase text-xs">
                                 <tr>
                                     <th className="p-5">订单号</th>
                                     <th className="p-5">客户</th>
                                     <th className="p-5">类型</th>
                                     <th className="p-5">金额</th>
                                     <th className="p-5">日期</th>
                                     <th className="p-5">状态</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                 {orders.map(o => (
                                     <tr key={o.id} className="hover:bg-white/5 transition-colors">
                                         <td className="p-5 font-mono font-bold text-white">#{o.id.slice(0, 8)}</td>
                                         <td className="p-5 text-slate-400">{o.customerEmail || o.customerName}</td>
                                         <td className="p-5">
                                             {o.items.some(i => i.type === 'course') && <span className="bg-purple-900/30 text-purple-400 text-xs font-bold px-2 py-0.5 rounded mr-1">课程</span>}
                                             {o.items.some(i => i.type !== 'course') && <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-0.5 rounded">商品</span>}
                                         </td>
                                         <td className="p-5 font-bold text-white">¥{o.totalAmount.toLocaleString()}</td>
                                         <td className="p-5 text-slate-500">{o.date}</td>
                                         <td className="p-5">
                                             <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                 o.status === 'Paid' ? 'bg-emerald-900/30 text-emerald-400' :
                                                 o.status === 'Pending' ? 'bg-amber-900/30 text-amber-400' :
                                                 o.status === 'Shipped' ? 'bg-blue-900/30 text-blue-400' :
                                                 'bg-slate-800 text-slate-400'
                                             }`}>{o.status}</span>
                                         </td>
                                     </tr>
                                 ))}
                                 {orders.length === 0 && (
                                     <tr>
                                         <td colSpan={6} className="p-10 text-center text-slate-500">暂无订单数据</td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 </div>
             )}
        </DashboardLayout>
      );
  }

  return <div>Access Denied</div>;
};

export default Dashboard;
