
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Order, Product, Course, Specialty, ProductGroup } from '../types';
import { api } from '../services/api';
import { PORTAL_THEME } from '../constants';
import { useNotification } from '../context/NotificationContext';
import { getSystemInstruction, saveSystemInstruction, getAIConfig, saveAIConfig } from '../services/gemini';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // Form States
  const [productForm, setProductForm] = useState<Partial<Product>>({ stockStatus: 'In Stock' });
  const [courseForm, setCourseForm] = useState<Partial<Course>>({ level: 'Intermediate', specialty: Specialty.ORTHOPEDICS });

  useEffect(() => {
    if (!user) {
        navigate('/auth');
        return;
    }

    // Auto-switch tab language for specific roles
    if ((user.role === 'Admin' || user.role === 'ShopSupplier') && activeTab === 'Overview') {
        setActiveTab('概览');
    }

    loadData();
    
    // Load AI Configs
    setSystemPrompt(getSystemInstruction());
    setAiConfig(getAIConfig());
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    const [fetchedOrders, fetchedProducts, fetchedCourses] = await Promise.all([
        api.getOrders(user?.role === 'Admin' ? undefined : user?.email),
        api.getProducts(),
        api.getCourses()
    ]);
    setOrders(fetchedOrders);
    setProducts(fetchedProducts);
    setCourses(fetchedCourses);
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

  const handleSaveCourse = async () => {
      await api.manageCourse('create', { ...courseForm, instructor: { name: user?.name || 'Instructor', title: 'DVM', imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80', bio: 'Expert', credentials: [] }, location: { city: 'Shanghai', venue: 'Training Ctr', address: '123 Rd' }, agenda: [] });
      await loadData();
      setShowModal(null);
  };

  // Admin AI Handlers
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
                        {user.role === 'Admin' || user.role === 'ShopSupplier' ? `欢迎回来, ${user.name}` : `Welcome back, ${user.name}`}
                    </p>
                </div>
            </header>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </main>
    </div>
  );

  // --- ROLE: DOCTOR (Consumer) ---
  if (user.role === 'Doctor') {
     return (
         <div className="bg-slate-50 min-h-screen pt-32 pb-20 px-4">
             <div className="max-w-7xl mx-auto space-y-8">
                 <div className="bg-white p-8 rounded-[32px] border border-slate-100 flex justify-between items-center">
                     <div className="flex items-center gap-6">
                         <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl">👨‍⚕️</div>
                         <div>
                             <h1 className="text-2xl font-black text-slate-900">{user.name}</h1>
                             <p className="text-slate-500 font-bold">{user.email}</p>
                         </div>
                     </div>
                     <button onClick={logout} className="text-red-500 font-bold text-sm">Sign Out</button>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-8">
                     <div className="bg-white p-8 rounded-[32px] border border-slate-100">
                         <h3 className="font-black text-lg mb-6">My Orders</h3>
                         {orders.length === 0 ? <p className="text-slate-400">No orders yet.</p> : (
                             <div className="space-y-4">
                                 {orders.map(o => (
                                     <div key={o.id} className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                                         <div>
                                             <p className="font-bold text-sm">#{o.id}</p>
                                             <p className="text-xs text-slate-500">{o.items.length} items</p>
                                         </div>
                                         <span className="text-xs font-black uppercase bg-white px-2 py-1 rounded border">{o.status}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                     <div className="bg-white p-8 rounded-[32px] border border-slate-100 flex items-center justify-center text-center">
                         <div>
                             <div className="text-6xl mb-4">🎓</div>
                             <h3 className="font-black text-lg">Resume Learning</h3>
                             <button onClick={() => navigate('/courses')} className="mt-4 text-vs font-bold underline">Go to Courses</button>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
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

            {/* Modal for Adding Product */}
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
      return (
        <DashboardLayout sidebarItems={['Overview', 'Courses', 'Students']}>
             {activeTab === 'Overview' && (
                 <div className="p-8 bg-purple-600 rounded-[32px] text-white flex justify-between items-center shadow-xl shadow-purple-900/20">
                     <div>
                         <h2 className="text-2xl font-black mb-2">Academic Dashboard</h2>
                         <p className="opacity-80">Manage your wet-labs and seminars.</p>
                     </div>
                     <div className="text-right">
                         <p className="text-4xl font-black">{courses.length}</p>
                         <p className="text-xs font-bold uppercase tracking-widest opacity-60">Active Courses</p>
                     </div>
                 </div>
             )}

             {activeTab === 'Courses' && (
                 <div className="grid md:grid-cols-2 gap-6">
                     <button onClick={() => setShowModal('addCourse')} className="border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center p-10 hover:bg-purple-50 hover:border-purple-300 transition-colors group">
                         <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">➕</span>
                         <span className="font-bold text-slate-400 group-hover:text-purple-600">Create New Course</span>
                     </button>
                     {courses.map(c => (
                         <div key={c.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                             <div className="h-32 bg-slate-100 rounded-2xl mb-4 overflow-hidden"><img src={c.imageUrl} className="w-full h-full object-cover" /></div>
                             <h4 className="font-black text-slate-900 mb-1">{c.title}</h4>
                             <p className="text-xs text-slate-500 font-bold uppercase mb-4">{c.location.city} • {c.startDate}</p>
                             <div className="mt-auto flex justify-between items-center">
                                 <span className="font-bold text-purple-600">¥{c.price.toLocaleString()}</span>
                                 <button className="text-xs font-bold text-slate-400 hover:text-red-500">Edit / Delete</button>
                             </div>
                         </div>
                     ))}
                 </div>
             )}

            {/* Modal for Adding Course */}
            {showModal === 'addCourse' && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg space-y-6 animate-in zoom-in-95">
                        <h3 className="font-black text-xl text-purple-900">Create New Course</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Course Title" className="w-full p-3 border rounded-xl" onChange={e => setCourseForm({...courseForm, title: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <select className="p-3 border rounded-xl" onChange={e => setCourseForm({...courseForm, specialty: e.target.value as Specialty})}>
                                    {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <input type="number" placeholder="Tuition (CNY)" className="p-3 border rounded-xl" onChange={e => setCourseForm({...courseForm, price: Number(e.target.value)})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" className="p-3 border rounded-xl" onChange={e => setCourseForm({...courseForm, startDate: e.target.value})} />
                                <input type="date" className="p-3 border rounded-xl" onChange={e => setCourseForm({...courseForm, endDate: e.target.value})} />
                            </div>
                            <textarea placeholder="Course Description" className="w-full p-3 border rounded-xl" onChange={e => setCourseForm({...courseForm, description: e.target.value})} />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowModal(null)} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button>
                            <button onClick={handleSaveCourse} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Publish Course</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
      );
  }

  // --- ROLE: ADMIN (Super User) - CHINESE UI ---
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
                     {/* Left: Prompt Engineering */}
                     <div className="flex flex-col gap-6">
                         <div className="bg-black/20 border border-white/5 p-6 rounded-3xl backdrop-blur-sm flex-1 flex flex-col">
                             <div className="flex justify-between items-center mb-4">
                                 <div>
                                     <h3 className="text-white font-black text-lg">系统指令 (System Prompt)</h3>
                                     <p className="text-slate-500 text-xs">定义 AI 的人设、规则和业务边界。</p>
                                 </div>
                                 <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full">
                                     v2.4 已激活
                                 </div>
                             </div>
                             <textarea 
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="flex-1 w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-slate-300 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                                spellCheck={false}
                             />
                         </div>
                         
                         <div className="bg-black/20 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
                             <h3 className="text-white font-black text-lg mb-4">模型参数调优 (Model Tuning)</h3>
                             <div className="space-y-6">
                                 <div>
                                     <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                                         <span>随机性 (Temperature)</span>
                                         <span>{aiConfig.temperature}</span>
                                     </div>
                                     <input 
                                        type="range" min="0" max="1" step="0.1" 
                                        value={aiConfig.temperature}
                                        onChange={(e) => setAiConfig({...aiConfig, temperature: parseFloat(e.target.value)})}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                                     />
                                 </div>
                                 <div>
                                     <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                                         <span>核采样 (Top P)</span>
                                         <span>{aiConfig.topP}</span>
                                     </div>
                                     <input 
                                        type="range" min="0" max="1" step="0.05"
                                        value={aiConfig.topP}
                                        onChange={(e) => setAiConfig({...aiConfig, topP: parseFloat(e.target.value)})} 
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                                     />
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Right: Knowledge & Logistics */}
                     <div className="flex flex-col gap-6">
                         <div className="bg-black/20 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
                             <div className="flex justify-between items-center mb-6">
                                 <div>
                                     <h3 className="text-white font-black text-lg">知识库 (RAG)</h3>
                                     <p className="text-slate-500 text-xs">已上传文档将用于构建 AI 的上下文索引。</p>
                                 </div>
                                 <button className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">
                                     + 上传 PDF
                                 </button>
                             </div>
                             <div className="space-y-3">
                                 {knowledgeFiles.map((file, i) => (
                                     <div key={i} className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
                                         <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">PDF</div>
                                             <div>
                                                 <p className="text-white text-xs font-bold">{file.name}</p>
                                                 <p className="text-slate-500 text-[10px]">{file.size}</p>
                                             </div>
                                         </div>
                                         <span className={`text-[10px] font-bold uppercase ${file.status === 'Indexed' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                             {file.status === 'Indexed' ? '已索引' : '处理中'}
                                         </span>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         <div className="bg-black/20 border border-white/5 p-6 rounded-3xl backdrop-blur-sm flex-1">
                             <h3 className="text-white font-black text-lg mb-4">近期对话审计</h3>
                             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                 {[
                                     { user: 'Dr. Zhang', query: 'TPLO plate size for 32kg Lab?', ai: 'Recommended 3.5mm Broad based on weight...', sentiment: 'Positive' },
                                     { user: 'Dr. Smith', query: 'Show me neurosurgery kit', ai: 'Here is the VetOrtho Neuro Kit v2...', sentiment: 'Neutral' },
                                     { user: 'Anonymous', query: 'Can I use human implants?', ai: 'Not recommended. Veterinary implants differ in...', sentiment: 'Safety Warning' },
                                 ].map((log, i) => (
                                     <div key={i} className="p-4 bg-black/30 rounded-xl border border-white/5 text-xs">
                                         <div className="flex justify-between mb-2">
                                             <span className="text-emerald-400 font-bold">{log.user}</span>
                                             <span className="text-slate-500">{log.sentiment}</span>
                                         </div>
                                         <p className="text-slate-300 mb-1">问: {log.query}</p>
                                         <p className="text-slate-500 italic">AI: {log.ai}</p>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         
                         <button 
                            onClick={saveAIChanges}
                            className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all"
                         >
                             发布更新到生产环境
                         </button>
                     </div>
                 </div>
             )}
             
             {activeTab === '用户管理' && (
                 <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden">
                     <table className="w-full text-left text-sm text-slate-300">
                         <thead className="bg-white/5 font-black uppercase text-[10px]">
                             <tr><th className="p-4">用户 (User)</th><th className="p-4">角色 (Role)</th><th className="p-4">状态 (Status)</th></tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                             <tr><td className="p-4">Dr. Zhang</td><td className="p-4">Doctor</td><td className="p-4 text-emerald-500">Active</td></tr>
                             <tr><td className="p-4">SurgiTech GmbH</td><td className="p-4">ShopSupplier</td><td className="p-4 text-emerald-500">Verified</td></tr>
                             <tr><td className="p-4">CSAVS Academy</td><td className="p-4">CourseProvider</td><td className="p-4 text-emerald-500">Partner</td></tr>
                         </tbody>
                     </table>
                 </div>
             )}
        </DashboardLayout>
      );
  }

  return <div>Access Denied</div>;
};

export default Dashboard;
