
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserRole, Specialty, Course, Product, DoctorProfile, Order, ApprovalStatus } from '../types';
import { COURSES_CN, PRODUCTS_CN } from '../constants';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { api } from '../services/api';

const PROMPT_STORAGE_KEY = 'vetsphere_system_prompt_v1';

const INITIAL_USERS: DoctorProfile[] = [
  { id: 'DOC-001', fullName: '李华', email: 'lihua@vet.com', licenseNumber: 'VET202488192', clinicName: '上海安欣宠物医院', specialties: [Specialty.ORTHOPEDICS], clinicalYears: 8, referralCode: 'VS-LI', points: 1450, level: 'Surgeon', status: 'Active' },
  { id: 'DOC-002', fullName: '张伟', email: 'zhang@vet.com', licenseNumber: 'VET202499111', clinicName: '北京宠爱国际', specialties: [Specialty.EYE_SURGERY], clinicalYears: 12, referralCode: 'VS-ZH', points: 3200, level: 'Expert', status: 'Active' },
  { id: 'DOC-999', fullName: 'Suspicious User', email: 'spam@bot.com', licenseNumber: 'FAKE-000', clinicName: 'Unknown', specialties: [], clinicalYears: 0, referralCode: 'VS-BAD', points: 0, level: 'Resident', status: 'Banned' },
];

const Dashboard: React.FC = () => {
  const location = useLocation();
  const initialRole = (location.state as any)?.role as UserRole || 'Doctor';
  
  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [activeTab, setActiveTab] = useState('概览');

  // --- State Management ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>(PRODUCTS_CN);
  const [localCourses, setLocalCourses] = useState<Course[]>(COURSES_CN);
  const [users, setUsers] = useState<DoctorProfile[]>(INITIAL_USERS);
  
  // Fetch Orders on Mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const data = await api.getOrders();
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  // Admin Approval Queue State
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'APP-101', type: 'Course', name: '猫科牙科进阶实操', submitter: 'CSAVS', status: 'Pending', date: '2026-03-10' },
    { id: 'APP-102', type: 'Product', name: '可降解骨螺钉 (3.5mm)', submitter: 'BioVet Inc.', status: 'Pending', date: '2026-03-11' },
    { id: 'APP-103', type: 'User', name: 'Dr. New (VET-Pending)', submitter: 'Self', status: 'Pending', date: '2026-03-12' },
  ]);

  // AI Configuration State
  const [aiConfigPrompt, setAiConfigPrompt] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(PROMPT_STORAGE_KEY);
    setAiConfigPrompt(saved || DEFAULT_SYSTEM_INSTRUCTION);
  }, []);

  const saveAIConfig = () => {
    localStorage.setItem(PROMPT_STORAGE_KEY, aiConfigPrompt);
    alert('AI 指令配置已保存，前端助手将立即应用新规则。');
  };

  const resetAIConfig = () => {
    if(window.confirm('确定要恢复为系统默认的出厂指令吗？')) {
        setAiConfigPrompt(DEFAULT_SYSTEM_INSTRUCTION);
        localStorage.setItem(PROMPT_STORAGE_KEY, DEFAULT_SYSTEM_INSTRUCTION);
    }
  };

  // Form State
  const [newProductForm, setNewProductForm] = useState({ name: '', price: '', stock: 'In Stock' });
  const [newCourseForm, setNewCourseForm] = useState({ title: '', price: '', date: '' });

  // --- Logic Handlers ---

  const handleApproval = (id: string, action: 'Approved' | 'Rejected') => {
    setPendingApprovals(prev => prev.map(item => item.id === id ? { ...item, status: action } : item));
  };

  const toggleUserBan = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Banned' : 'Active' } : u));
  };

  const handleShipOrder = async (orderId: string) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Shipped' } : o));
    // Call API
    await api.updateOrderStatus(orderId, 'Shipped');
  };

  const toggleStock = (productId: string) => {
    setLocalProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const nextStatus = p.stockStatus === 'In Stock' ? 'Out of Stock' : p.stockStatus === 'Out of Stock' ? 'Low Stock' : 'In Stock';
        return { ...p, stockStatus: nextStatus as any };
      }
      return p;
    }));
  };

  const handleAddProduct = () => {
    if (!newProductForm.name || !newProductForm.price) return;
    const newProd: Product = {
      id: `p-${Date.now()}`,
      name: newProductForm.name,
      brand: 'SurgiTech',
      group: 'Consumables',
      price: Number(newProductForm.price),
      specialty: Specialty.SOFT_TISSUE,
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      description: 'New product added via dashboard.',
      specs: {},
      stockStatus: newProductForm.stock as any,
      supplier: { name: 'SurgiTech', origin: 'Germany', rating: 5 },
      approvalStatus: 'Pending'
    };
    setLocalProducts([newProd, ...localProducts]);
    setNewProductForm({ name: '', price: '', stock: 'In Stock' });
    alert('产品已提交审核 (Pending Approval)');
  };

  const handleCreateCourse = () => {
    if (!newCourseForm.title) return;
    const newCourse: Course = {
      id: `c-${Date.now()}`,
      title: newCourseForm.title,
      price: Number(newCourseForm.price),
      specialty: Specialty.ORTHOPEDICS,
      currency: 'CNY',
      location: { city: 'Shanghai', venue: 'Training Center', address: 'TBD' },
      startDate: newCourseForm.date,
      endDate: newCourseForm.date,
      description: 'New course draft.',
      imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
      level: 'Basic',
      agenda: [],
      status: 'Pending',
      instructor: { name: 'Dr. Provider', title: 'DVM', bio: 'Instructor', credentials: [], imageUrl: '' }
    };
    setLocalCourses([newCourse, ...localCourses]);
    setNewCourseForm({ title: '', price: '', date: '' });
    alert('课程草稿已创建，等待管理员审核。');
  };

  const renderSidebar = () => {
    const tabs = {
      Doctor: ['概览', '学习历程', '我的订单', '职业档案'],
      CourseProvider: ['概览', '课程管理', '发布课程', '学员数据'],
      ShopSupplier: ['概览', '商品管理', '新增商品', '订单处理'],
      Admin: ['概览', '审批中心', '用户管理', 'AI 中枢', '财务报表']
    };

    return (
      <aside className="w-full lg:w-64 bg-white border-b lg:border-r lg:border-b-0 border-slate-100 min-h-[auto] lg:min-h-[calc(100vh-80px)] p-6 block">
        <div className="mb-10">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">切换视角 (Preview Mode)</label>
          <select 
            value={activeRole} 
            onChange={(e) => {
              setActiveRole(e.target.value as UserRole);
              setActiveTab('概览');
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-vs outline-none shadow-sm"
          >
            <option value="Doctor">医生 (Doctor)</option>
            <option value="CourseProvider">课程方 (Provider)</option>
            <option value="ShopSupplier">供应商 (Supplier)</option>
            <option value="Admin">管理员 (Admin)</option>
          </select>
        </div>

        <nav className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs[activeRole].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-auto lg:w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 whitespace-nowrap ${
                activeTab === tab ? 'bg-vs text-white shadow-lg shadow-vs/20' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="hidden lg:inline w-1.5 h-1.5 rounded-full bg-current opacity-30"></span>
              {tab}
            </button>
          ))}
        </nav>
      </aside>
    );
  };

  // --- Render Functions for Each Role ---

  const renderAdminContent = () => {
    if (activeTab === 'AI 中枢') {
        return (
            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden flex flex-col h-[70vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">AI 临床顾问配置</h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">配置 Gemini 模型的系统指令 (System Prompt)，定义其销售策略与医学人设。</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={resetAIConfig}
                            className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-white hover:text-red-500 transition-all"
                        >
                            恢复默认
                        </button>
                        <button 
                            onClick={saveAIConfig}
                            className="px-8 py-3 bg-vs text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-vs-dark"
                        >
                            保存配置
                        </button>
                    </div>
                </div>
                <div className="flex-1 p-8 bg-slate-50">
                    <textarea 
                        value={aiConfigPrompt}
                        onChange={e => setAiConfigPrompt(e.target.value)}
                        className="w-full h-full p-6 rounded-2xl border border-slate-200 font-mono text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-vs/20 resize-none shadow-inner"
                        placeholder="在此输入 System Instruction..."
                    ></textarea>
                </div>
            </div>
        );
    }

    if (activeTab === '审批中心') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-black text-slate-900">待办事项 ({pendingApprovals.filter(i => i.status === 'Pending').length})</h2>
             <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="text-xs font-bold text-slate-500">待审核</span>
             </div>
          </div>
          {pendingApprovals.map(item => (
            <div key={item.id} className={`bg-white p-6 rounded-2xl border ${item.status === 'Pending' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100 opacity-50'} flex justify-between items-center transition-all`}>
               <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.type === 'Course' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{item.type}</span>
                    <span className="text-xs text-slate-400 font-mono">{item.id}</span>
                  </div>
                  <h3 className="font-bold text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">提交方: {item.submitter} • 日期: {item.date}</p>
               </div>
               {item.status === 'Pending' ? (
                 <div className="flex gap-3">
                    <button onClick={() => handleApproval(item.id, 'Rejected')} className="px-4 py-2 border border-rose-200 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-50">驳回</button>
                    <button onClick={() => handleApproval(item.id, 'Approved')} className="px-4 py-2 bg-vs text-white rounded-xl text-xs font-bold shadow-md hover:bg-vs-dark">批准</button>
                 </div>
               ) : (
                 <span className={`px-3 py-1 rounded-lg text-xs font-bold ${item.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {item.status === 'Approved' ? '已批准' : '已驳回'}
                 </span>
               )}
            </div>
          ))}
        </div>
      );
    }
    
    if (activeTab === '用户管理') {
      return (
        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50">
                 <tr>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">用户</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">角色</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">状态</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">操作</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="p-6">
                         <p className="text-sm font-bold text-slate-900">{u.fullName}</p>
                         <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="p-6 text-xs font-bold text-slate-600">{u.level}</td>
                      <td className="p-6">
                         <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                           {u.status}
                         </span>
                      </td>
                      <td className="p-6">
                         <button 
                            onClick={() => toggleUserBan(u.id)}
                            className="text-xs font-bold underline text-slate-400 hover:text-vs"
                         >
                            {u.status === 'Active' ? '封禁账号' : '解封账号'}
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{l: '今日活跃用户', v: '842'}, {l: '待审课程', v: '12'}, {l: '总销售额 (本月)', v: `¥${orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}`}].map((s, i) => (
                <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{s.l}</p>
                    <p className="text-4xl font-black text-slate-900 mt-2">{s.v}</p>
                </div>
            ))}
        </div>
    );
  };

  const renderShopSupplierContent = () => {
    if (activeTab === '商品管理') {
        return (
            <div className="space-y-6">
                {localProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-200" />
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">库存状态: 
                                    <span className={`ml-2 ${p.stockStatus === 'In Stock' ? 'text-emerald-500' : 'text-rose-500'}`}>{p.stockStatus}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => toggleStock(p.id)}
                            className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                        >
                            调整库存
                        </button>
                    </div>
                ))}
            </div>
        )
    }

    if (activeTab === '订单处理') {
        if (loadingOrders) return <div className="p-8 text-center text-slate-400">Loading orders...</div>;
        
        return (
            <div className="space-y-6">
                {orders.length === 0 && <p className="text-slate-400 text-center py-10">暂无订单 (No orders yet)</p>}
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.id}</span>
                                <h4 className="font-bold text-slate-900">{order.customerName}</h4>
                                <p className="text-xs text-slate-500 mt-1">{order.shippingAddress} • {order.date}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                                order.status === 'Shipped' ? 'bg-emerald-100 text-emerald-600' : 
                                order.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 
                                order.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                            }`}>{order.status}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl mb-4 space-y-2">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-700">{item.name}</span>
                                    <span className="text-slate-400">x{item.quantity}</span>
                                </div>
                            ))}
                            <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-sm">
                                <span>总计 (Total)</span>
                                <span className="text-vs">¥{order.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        {order.status === 'Paid' && (
                            <button 
                                onClick={() => handleShipOrder(order.id)}
                                className="w-full py-3 bg-vs text-white rounded-xl font-bold text-sm shadow-lg hover:bg-vs-dark transition-all"
                            >
                                确认发货 (Dispatch)
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (activeTab === '新增商品') {
        return (
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 max-w-2xl">
                <h3 className="font-black text-xl mb-6">发布新器械 SKU</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">产品名称</label>
                        <input 
                            value={newProductForm.name} 
                            onChange={e => setNewProductForm({...newProductForm, name: e.target.value})}
                            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="e.g. 3.5mm 骨钻" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">价格 (CNY)</label>
                        <input 
                            type="number"
                            value={newProductForm.price} 
                            onChange={e => setNewProductForm({...newProductForm, price: e.target.value})}
                            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="0.00" 
                        />
                    </div>
                    <button 
                        onClick={handleAddProduct}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800"
                    >
                        提交审核
                    </button>
                </div>
            </div>
        );
    }
    
    // Fallback Overview for Supplier
    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-vs text-white p-8 rounded-[32px]">
                <p className="text-[10px] font-black uppercase mb-2">总销售额 (Total Sales)</p>
                <h3 className="text-4xl font-black">¥{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</h3>
            </div>
            <div className="bg-white border border-slate-100 p-8 rounded-[32px]">
                <p className="text-[10px] font-black uppercase mb-2 text-slate-400">待处理订单 (Paid)</p>
                <h3 className="text-4xl font-black text-slate-900">{orders.filter(o => o.status === 'Paid').length}</h3>
            </div>
        </div>
    );
  };

  const renderCourseProviderContent = () => {
    if (activeTab === '课程管理') {
        return (
            <div className="grid md:grid-cols-2 gap-6">
                {localCourses.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-4 py-2 bg-slate-100 rounded-bl-2xl text-[10px] font-black uppercase text-slate-500">
                            {c.status || 'Active'}
                        </div>
                        <h4 className="font-black text-lg text-slate-900 pr-16">{c.title}</h4>
                        <div className="flex gap-4 mt-4 text-xs font-bold text-slate-500">
                            <span>📅 {c.startDate}</span>
                            <span>📍 {c.location.city}</span>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <button className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50">编辑</button>
                            <button className="flex-1 py-2 bg-vs/10 text-vs rounded-xl text-xs font-bold hover:bg-vs/20">学员名单</button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activeTab === '发布课程') {
        return (
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 max-w-2xl">
                <h3 className="font-black text-xl mb-6">创建新课程 (实操工坊)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">课程标题</label>
                        <input 
                            value={newCourseForm.title} 
                            onChange={e => setNewCourseForm({...newCourseForm, title: e.target.value})}
                            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="e.g. 神经外科高阶班" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">开始日期</label>
                            <input 
                                type="date"
                                value={newCourseForm.date} 
                                onChange={e => setNewCourseForm({...newCourseForm, date: e.target.value})}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">学费 (CNY)</label>
                            <input 
                                type="number"
                                value={newCourseForm.price} 
                                onChange={e => setNewCourseForm({...newCourseForm, price: e.target.value})}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="8800" 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleCreateCourse}
                        className="w-full py-4 bg-vs text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-vs-dark shadow-xl shadow-vs/20"
                    >
                        保存草稿并提交
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 text-white p-10 rounded-[40px] text-center">
            <h3 className="text-2xl font-black mb-2">CSAVS 联合教育中心</h3>
            <p className="opacity-60 text-sm">五星认证教育机构</p>
            <div className="grid grid-cols-3 gap-8 mt-10 text-center">
                <div>
                    <span className="block text-3xl font-black text-vs">12</span>
                    <span className="text-[10px] uppercase font-bold opacity-50">在线课程 (Active)</span>
                </div>
                <div>
                    <span className="block text-3xl font-black text-emerald-400">485</span>
                    <span className="text-[10px] uppercase font-bold opacity-50">往期学员 (Alumni)</span>
                </div>
                <div>
                    <span className="block text-3xl font-black text-amber-400">4.9</span>
                    <span className="text-[10px] uppercase font-bold opacity-50">综合评分 (Rating)</span>
                </div>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (activeRole) {
        case 'Admin': return renderAdminContent();
        case 'ShopSupplier': return renderShopSupplierContent();
        case 'CourseProvider': return renderCourseProviderContent();
        default: return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Doctor View (Default Read-Onlyish Dashboard) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-vs p-8 rounded-[32px] text-white shadow-xl shadow-vs/10 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
                        <p className="text-[10px] font-black text-white/60 uppercase mb-2">当前医生值 (VP)</p>
                        <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black">1,450</h3>
                        <span className="text-xs font-bold text-white/60">Level 3</span>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">我的订单</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-2">{orders.filter(o => o.customerName.includes('Li') || o.customerName === 'Doctor').length} <span className="text-sm font-bold text-slate-300">items</span></h3>
                        <p className="text-xs text-emerald-500 font-bold mt-2">1 个包裹配送中</p>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100">
                    <h3 className="font-black text-lg mb-6">已购课程</h3>
                    <div className="space-y-4">
                        {localCourses.slice(0, 1).map(c => (
                            <div key={c.id} className="flex gap-4 items-center">
                                <img src={c.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                                <div>
                                    <h4 className="font-bold text-sm">{c.title}</h4>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 w-48">
                                        <div className="bg-vs h-full w-[40%] rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row pt-20 lg:pt-24 px-4 sm:px-6 gap-8">
      {renderSidebar()}
      <main className="flex-1 lg:p-6 min-h-screen pb-20">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeRole === 'Doctor' ? '医生中心' : 
               activeRole === 'Admin' ? '管理中枢' : 
               activeRole === 'CourseProvider' ? '学术后台' : '供应商工作台'}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 ml-1">{activeTab}</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2.5 pr-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-vs flex items-center justify-center text-white text-xl shadow-lg shadow-vs/20">
              {activeRole === 'ShopSupplier' ? '🏢' : activeRole === 'CourseProvider' ? '🎓' : activeRole === 'Admin' ? '🛡️' : '👤'}
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">
                {activeRole === 'ShopSupplier' ? 'SurgiTech 官方旗舰店' : 
                 activeRole === 'CourseProvider' ? 'CSAVS 联合教育中心' : 
                 activeRole === 'Admin' ? 'VetSphere 运营部' : 'Dr. Li Hua'}
              </p>
              <p className="text-[9px] text-vs font-black uppercase tracking-widest">
                {activeRole === 'ShopSupplier' ? '铂金供应商' : 
                 activeRole === 'CourseProvider' ? '五星认证机构' : 
                 activeRole === 'Admin' ? '超级管理员' : '高级外科医生'}
              </p>
            </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
