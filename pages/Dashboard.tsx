
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, Specialty, Course, Product, DoctorProfile, Order, Lead } from '../types';
import { COURSES_CN, PRODUCTS_CN, PORTAL_THEME } from '../constants';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';
import { api } from '../services/api';

const PROMPT_STORAGE_KEY = 'vetsphere_system_prompt_v1';

const INITIAL_USERS: DoctorProfile[] = [
  { id: 'DOC-001', fullName: '李华', email: 'lihua@vet.com', licenseNumber: 'VET202488192', clinicName: '上海安欣宠物医院', specialties: [Specialty.ORTHOPEDICS], clinicalYears: 8, referralCode: 'VS-LI', points: 1450, level: 'Surgeon', status: 'Active' },
  { id: 'DOC-002', fullName: '张伟', email: 'zhang@vet.com', licenseNumber: 'VET202499111', clinicName: '北京宠爱国际', specialties: [Specialty.EYE_SURGERY], clinicalYears: 12, referralCode: 'VS-ZH', points: 3200, level: 'Expert', status: 'Active' },
  { id: 'DOC-999', fullName: 'Suspicious User', email: 'spam@bot.com', licenseNumber: 'FAKE-000', clinicName: 'Unknown', specialties: [], clinicalYears: 0, referralCode: 'VS-BAD', points: 0, level: 'Resident', status: 'Banned' },
];

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const activeRole: UserRole = user?.role || 'Doctor';
  const isDoctor = activeRole === 'Doctor';
  
  // Theme Config
  const currentTheme = PORTAL_THEME[activeRole] || PORTAL_THEME.Doctor;
  const isDark = activeRole === 'Admin';

  const [activeTab, setActiveTab] = useState('概览');
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>(PRODUCTS_CN);
  const [localCourses, setLocalCourses] = useState<Course[]>(COURSES_CN);
  const [users, setUsers] = useState<DoctorProfile[]>(INITIAL_USERS);
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'APP-101', type: 'Course', name: '猫科牙科进阶实操', submitter: 'CSAVS', status: 'Pending', date: '2026-03-10' },
    { id: 'APP-102', type: 'Product', name: '可降解骨螺钉 (3.5mm)', submitter: 'BioVet Inc.', status: 'Pending', date: '2026-03-11' }
  ]);
  const [aiConfigPrompt, setAiConfigPrompt] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingOrders(true);
      try {
        const orderData = await api.getOrders();
        setOrders(orderData);
        if (activeRole === 'Admin') {
            const leadsData = await api.getLeads();
            setLeads(leadsData);
        }
      } catch (error) { console.error(error); } finally { setLoadingOrders(false); }
    };
    fetchData();
    const saved = localStorage.getItem(PROMPT_STORAGE_KEY);
    setAiConfigPrompt(saved || DEFAULT_SYSTEM_INSTRUCTION);
  }, [activeRole]);

  const handleLogout = () => { logout(); navigate('/'); };

  // --- COMPONENT: DOCTOR LAYOUT (Inside Mall Template) ---
  if (isDoctor) {
      return (
          <div className="bg-slate-50 min-h-[calc(100vh-80px)] pt-32 pb-20 px-4">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Left Sidebar (Profile Card) */}
                  <div className="lg:col-span-1 space-y-6">
                      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-center">
                          <div className="w-20 h-20 bg-emerald-50 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">👨‍⚕️</div>
                          <h2 className="text-lg font-black text-slate-900">{user?.name || 'Dr. User'}</h2>
                          <p className="text-xs text-slate-500 font-bold mb-4">{user?.email}</p>
                          <div className="flex justify-center gap-2 mb-6">
                              <span className="px-3 py-1 bg-vs/10 text-vs rounded-full text-[10px] font-black uppercase">Surgeon</span>
                              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">Level 3</span>
                          </div>
                          <button onClick={handleLogout} className="w-full py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-red-500">
                              Log Out
                          </button>
                      </div>

                      <div className="bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
                          {['概览', '我的订单', '已购课程', '职业认证'].map(tab => (
                              <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full text-left px-5 py-3 rounded-xl text-xs font-bold transition-all mb-1 ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                              >
                                {tab}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Right Content */}
                  <div className="lg:col-span-3">
                      <div className="bg-white min-h-[500px] p-8 rounded-[32px] border border-slate-100 shadow-sm">
                          <h2 className="text-2xl font-black text-slate-900 mb-6">{activeTab}</h2>
                          
                          {activeTab === '概览' && (
                              <div className="grid md:grid-cols-2 gap-6">
                                  <div className="bg-gradient-to-br from-[#00A884] to-emerald-600 p-8 rounded-3xl text-white shadow-xl shadow-vs/20 relative overflow-hidden">
                                      <div className="relative z-10">
                                          <p className="text-xs font-bold opacity-80 mb-1">Current Points</p>
                                          <h3 className="text-4xl font-black">1,450 VP</h3>
                                          <p className="text-[10px] opacity-60 mt-4">Next Tier: 2,000 VP</p>
                                      </div>
                                      <div className="absolute -bottom-4 -right-4 text-9xl opacity-10 rotate-12">🏆</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center">
                                          <span className="text-2xl mb-2">📦</span>
                                          <span className="text-2xl font-black text-slate-900">{orders.length}</span>
                                          <span className="text-[10px] text-slate-400 font-black uppercase">Orders</span>
                                      </div>
                                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center">
                                          <span className="text-2xl mb-2">🎓</span>
                                          <span className="text-2xl font-black text-slate-900">3</span>
                                          <span className="text-[10px] text-slate-400 font-black uppercase">Courses</span>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {activeTab === '我的订单' && (
                              <div className="space-y-4">
                                  {orders.length === 0 ? (
                                      <p className="text-slate-400 text-sm font-medium py-10 text-center">No orders found.</p>
                                  ) : orders.map(order => (
                                      <div key={order.id} className="p-6 border border-slate-100 rounded-2xl flex justify-between items-center hover:border-vs/30 transition-all">
                                          <div>
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{order.date}</p>
                                              <h4 className="font-bold text-slate-900 text-sm">Order #{order.id}</h4>
                                              <p className="text-xs text-slate-500 mt-1">{order.items.length} items • ¥{order.totalAmount.toLocaleString()}</p>
                                          </div>
                                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${order.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                              {order.status}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          )}

                          {activeTab === '已购课程' && (
                             <div className="grid md:grid-cols-2 gap-6">
                                {localCourses.slice(0, 2).map(c => (
                                    <div key={c.id} className="border border-slate-100 rounded-2xl p-4 flex gap-4">
                                        <img src={c.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{c.title}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1">Status: Active</p>
                                            <button className="text-[10px] font-black text-vs mt-2 hover:underline">Continue Learning →</button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- COMPONENT: ADMIN / PARTNER LAYOUT (Full Screen, No Navbar) ---
  
  const StatCard = ({ label, value, icon }: any) => (
    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100'}`}>
       <div className="flex justify-between items-start mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isDark ? 'bg-gray-800 text-white' : 'bg-slate-50 text-slate-600'}`}>{icon}</div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{label}</span>
       </div>
       <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );

  const renderSidebar = () => {
    const tabs = {
      CourseProvider: ['概览', '课程管理', '发布课程', '学员数据'],
      ShopSupplier: ['概览', '商品管理', '新增商品', '订单处理'],
      Admin: ['概览', '审批中心', 'CRM / 线索', '用户管理', 'AI 中枢', '财务报表']
    };
    const currentTabs = tabs[activeRole as keyof typeof tabs] || [];

    return (
      <aside className={`w-64 shrink-0 flex flex-col h-screen fixed left-0 top-0 border-r transition-colors z-50
        ${currentTheme.colors.sidebarBg} ${isDark ? 'border-gray-800' : 'border-slate-100'}
      `}>
        <div className="p-8 pb-4">
           <div className="flex items-center gap-3 mb-8">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg
                 ${isDark ? 'bg-emerald-500 text-black' : `${currentTheme.colors.primaryBg} text-white`}`}>
                 {currentTheme.meta.icon}
              </div>
              <div>
                 <h1 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>VetSphere</h1>
                 <p className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{currentTheme.meta.title}</p>
              </div>
           </div>
           
           <nav className="space-y-1">
             {currentTabs.map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3
                    ${activeTab === tab 
                      ? currentTheme.colors.sidebarActive 
                      : `${currentTheme.colors.sidebarText} hover:bg-white/5 hover:opacity-80`
                    }`}
               >
                 {activeTab === tab && <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-current'}`}></div>}
                 {tab}
               </button>
             ))}
           </nav>
        </div>

        <div className={`mt-auto p-6 border-t ${isDark ? 'border-gray-800' : 'border-slate-100'}`}>
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-200"></div>
              <div>
                 <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'User'}</p>
                 <p className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{activeRole}</p>
              </div>
           </div>
           <button onClick={handleLogout} className={`w-full py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2
              ${isDark ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800' : 'border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50'}`}>
              <span>🚪</span> Log Out
           </button>
        </div>
      </aside>
    );
  };

  const renderAdminContent = () => {
    // --- Admin Views ---
    if (activeRole === 'Admin') {
        if (activeTab === 'CRM / 线索') return (
            <div className="space-y-4">
                {leads.map(l => (
                    <div key={l.id} className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between mb-2">
                             <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{l.contactInfo}</h4>
                             <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${l.status==='New'?'bg-emerald-500 text-black':'bg-gray-700 text-white'}`}>{l.status}</span>
                        </div>
                        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{l.interestSummary}</p>
                        <button onClick={() => setSelectedLead(selectedLead?.id===l.id?null:l)} className="text-xs font-bold text-emerald-500 underline">View Chat</button>
                        {selectedLead?.id === l.id && (
                            <div className="mt-4 p-4 bg-black rounded-xl border border-gray-800 text-xs text-gray-300 space-y-2 max-h-40 overflow-y-auto font-mono">
                                {l.fullChatLog?.map((m,i)=><div key={i}><span className="text-emerald-500 mr-2">{m.role}:</span>{m.content}</div>)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Leads" value={leads.length} icon="🎯" />
                <StatCard label="Pending Approvals" value={pendingApprovals.filter(p=>p.status==='Pending').length} icon="📝" />
                <StatCard label="Active Users" value={users.length} icon="👥" />
            </div>
        );
    }
    
    // --- Supplier Views ---
    if (activeRole === 'ShopSupplier') {
        if (activeTab === '订单处理') return (
            <div className="space-y-4">
                {orders.map(o => (
                    <div key={o.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="font-black text-slate-900">{o.id}</h4>
                            <p className="text-xs text-slate-500">{o.items.length} items • ¥{o.totalAmount}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.status==='Paid'?'bg-emerald-100 text-emerald-600':'bg-slate-100 text-slate-500'}`}>{o.status}</span>
                    </div>
                ))}
            </div>
        );
        return <div className="grid grid-cols-2 gap-6"><StatCard label="Revenue" value={`¥${orders.reduce((a,b)=>a+b.totalAmount,0)}`} icon="💰" /><StatCard label="Orders" value={orders.length} icon="📦" /></div>;
    }

    // --- Course Provider Views ---
    if (activeRole === 'CourseProvider') {
         return <div className="grid grid-cols-2 gap-6"><StatCard label="Active Courses" value={localCourses.length} icon="🎓" /><StatCard label="Students" value="482" icon="👨‍🎓" /></div>;
    }
    return null;
  };

  return (
    <div className={`flex min-h-screen ${currentTheme.colors.pageBg} font-sans selection:bg-emerald-500 selection:text-white`}>
       {renderSidebar()}
       <main className="flex-1 ml-64 flex flex-col">
          <header className={`h-20 flex items-center justify-between px-8 border-b sticky top-0 z-40 backdrop-blur-md
             ${isDark ? 'bg-black/50 border-gray-800' : 'bg-white/80 border-slate-100'}`}>
             <div><h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeTab}</h2></div>
             <div className="flex items-center gap-4">
                 <button onClick={() => navigate('/')} className={`px-4 py-2 rounded-lg text-xs font-bold border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Back to Site</button>
             </div>
          </header>
          <div className="p-8 flex-1 overflow-y-auto">
             {renderAdminContent()}
          </div>
       </main>
    </div>
  );
};

export default Dashboard;
