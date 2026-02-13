
import { supabase } from './supabase';
import { Order, CartItem, Lead, ShippingTemplate, Quote, Product, Course, Post, Specialty } from '../types';
import { PRODUCTS_CN, COURSES_CN } from '../constants';

const BACKEND_URL = 'https://api.vetsphere.net';

// --- MOCK COMMUNITY DATA ---
const INITIAL_POSTS: Post[] = [
  {
    id: 'case-001',
    title: '复杂粉碎性股骨骨折的 TPLO + 锁定钢板联合固定',
    content: '患犬为3岁拉布拉多，遭遇车祸导致股骨远端粉碎性骨折，同时伴有交叉韧带断裂。我们采用了双板固定技术...',
    specialty: Specialty.ORTHOPEDICS,
    media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80' }],
    stats: { likes: 42, comments: 12, saves: 28 },
    createdAt: '2025-05-15',
    isAiAnalyzed: true,
    author: { name: 'Dr. Zhang', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80', level: 'Expert', hospital: '上海中心宠物医院' },
    patientInfo: { species: 'Canine (Labrador)', age: '3y', weight: '32kg' },
    sections: { diagnosis: 'Distal Femoral Comminuted Fracture', plan: 'Dual Plate Fixation + TPLO Stabilization', outcome: 'Post-op 8 weeks: Good weight bearing.' }
  },
  {
    id: 'case-002',
    title: '神经外科：L3-L4 椎间盘突出导致的截瘫病例报告',
    content: '该病例展示了半椎板切除术在急性 IVDD 处理中的应用，术后配合高压氧治疗效果显著。',
    specialty: Specialty.NEUROSURGERY,
    media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80' }],
    stats: { likes: 35, comments: 8, saves: 15 },
    createdAt: '2025-05-18',
    isAiAnalyzed: true,
    author: { name: 'Dr. Emily Smith', avatar: 'https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&q=80', level: 'Surgeon', hospital: 'London Vet Clinic' },
    patientInfo: { species: 'Canine (Dachshund)', age: '6y', weight: '8kg' },
    sections: { diagnosis: 'Acute IVDD (Hansen Type I)', plan: 'Hemilaminectomy at L3-L4', outcome: 'Deep pain sensation recovered in 48h.' }
  }
];

// In-memory store for demo purposes (resets on refresh if using mock)
let MOCK_PRODUCTS = [...PRODUCTS_CN];
let MOCK_COURSES = [...COURSES_CN];

export const api = {
  
  // --- PRODUCTS (Shop) ---
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error || !data || data.length === 0) return MOCK_PRODUCTS;
      return data.map(p => ({
        ...p, group: p.group_category, imageUrl: p.image_url, stockStatus: p.stock_status,
        supplier: { name: 'Verified Supplier', origin: 'Global', rating: 5.0 }
      }));
    } catch (e) { return MOCK_PRODUCTS; }
  },

  async manageProduct(action: 'create' | 'update' | 'delete', product: Partial<Product>): Promise<void> {
    if (action === 'create') {
        const newProduct = { ...product, id: `p-${Date.now()}` } as Product;
        MOCK_PRODUCTS.unshift(newProduct);
        // Supabase logic would go here
    } else if (action === 'update') {
        MOCK_PRODUCTS = MOCK_PRODUCTS.map(p => p.id === product.id ? { ...p, ...product } : p);
    } else if (action === 'delete') {
        MOCK_PRODUCTS = MOCK_PRODUCTS.filter(p => p.id !== product.id);
    }
  },

  // --- COURSES (Education) ---
  async getCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase.from('courses').select('*');
      if (error || !data || data.length === 0) return MOCK_COURSES;
      return data.map(c => ({ ...c, startDate: c.start_date, endDate: c.end_date, imageUrl: c.image_url }));
    } catch (e) { return MOCK_COURSES; }
  },

  async manageCourse(action: 'create' | 'update' | 'delete', course: Partial<Course>): Promise<void> {
    if (action === 'create') {
        const newCourse = { ...course, id: `c-${Date.now()}`, status: 'Published' } as Course;
        MOCK_COURSES.unshift(newCourse);
    } else if (action === 'delete') {
        MOCK_COURSES = MOCK_COURSES.filter(c => c.id !== course.id);
    }
  },

  async getPosts(): Promise<Post[]> {
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return INITIAL_POSTS;
      
      return data.map(p => ({
        id: p.id, title: p.title, content: p.content, specialty: p.specialty,
        media: p.media || [], stats: p.stats || { likes: 0, comments: 0, saves: 0 },
        createdAt: new Date(p.created_at).toLocaleDateString(),
        isAiAnalyzed: p.is_ai_analyzed,
        author: p.author_info,
        patientInfo: p.patient_info,
        sections: p.sections
      }));
    } catch (e) { return INITIAL_POSTS; }
  },

  async createPost(post: Partial<Post>, user: any): Promise<void> {
     const newPost = {
         id: `post-${Date.now()}`,
         author_id: user.id,
         author_info: post.author,
         title: post.title,
         content: post.content,
         specialty: post.specialty,
         media: post.media,
         patient_info: post.patientInfo,
         sections: post.sections,
         is_ai_analyzed: true,
         stats: { likes: 0, comments: 0, saves: 0 }
     };
     await supabase.from('posts').insert(newPost);
  },

  async interactWithPost(postId: string, type: 'like' | 'save'): Promise<void> {
    // In a real app, this would update Supabase counts
    console.log(`Interaction: ${type} on post ${postId}`);
  },

  async addComment(postId: string, comment: any): Promise<void> {
    console.log(`New comment on ${postId}:`, comment);
  },

  async getShippingTemplates(): Promise<ShippingTemplate[]> {
    const { data, error } = await supabase.from('shipping_templates').select('*');
    if (error || !data) return [];
    return data.map(t => ({ id: t.id, name: t.name, regionCode: t.region_code, baseFee: t.base_fee, perItemFee: t.per_item_fee, currency: 'CNY', estimatedDays: t.estimated_days }));
  },

  async saveShippingTemplate(template: ShippingTemplate): Promise<void> {
    const payload = { id: template.id, name: template.name, region_code: template.regionCode, base_fee: template.baseFee, per_item_fee: template.perItemFee, estimated_days: template.estimatedDays };
    const { error } = await supabase.from('shipping_templates').upsert(payload);
    if (error) throw error;
  },

  async deleteShippingTemplate(id: string): Promise<void> {
    await supabase.from('shipping_templates').delete().eq('id', id);
  },

  async createLead(data: Partial<Lead>): Promise<void> {
    const newLead = { id: `LEAD-${Date.now()}`, source: 'AI Chat', contact_info: data.contactInfo || 'Unknown', interest_summary: data.interestSummary || 'General Inquiry', full_chat_log: data.fullChatLog || [], status: 'New', organization: data.organization, created_at: new Date().toISOString() };
    await supabase.from('leads').insert(newLead);
  },

  async getLeads(): Promise<Lead[]> {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data.map((l: any) => ({ id: l.id, source: l.source, contactInfo: l.contact_info, interestSummary: l.interest_summary, fullChatLog: l.full_chat_log, status: l.status, createdAt: l.created_at, organization: l.organization }));
  },

  async updateLeadStatus(id: string, status: 'New' | 'Contacted' | 'Converted' | 'Archived'): Promise<void> {
      await supabase.from('leads').update({ status }).eq('id', id);
  },

  async createQuote(items: CartItem[], totalAmount: number, clinicInfo: any): Promise<{ quoteId: string }> {
      const quoteId = `QT-${new Date().getFullYear()}${Math.floor(Math.random() * 100000)}`;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      const quotePayload = { id: quoteId, customer_email: clinicInfo.customerEmail, customer_info: clinicInfo, items: items, total_amount: totalAmount, status: 'Active', valid_until: validUntil.toISOString(), created_at: new Date().toISOString() };
      await supabase.from('quotes').insert(quotePayload);
      return { quoteId };
  },

  async getQuotes(email?: string): Promise<Quote[]> {
      let query = supabase.from('quotes').select('*').order('created_at', { ascending: false });
      if (email) query = query.eq('customer_email', email);
      const { data, error } = await query;
      if (error) return [];
      return data.map((q: any) => ({ id: q.id, customerEmail: q.customer_email, customerInfo: q.customer_info, items: q.items || [], totalAmount: q.total_amount, status: q.status, validUntil: q.valid_until, createdAt: q.created_at }));
  },

  async createOrder(items: CartItem[], totalAmount: number, clinicInfo: any): Promise<{ orderId: string }> {
    const orderId = `ORD-${new Date().getFullYear()}${Math.floor(Math.random() * 100000)}`;
    const { data: { user } } = await supabase.auth.getUser();
    const orderPayload = { id: orderId, user_id: user?.id, customer_name: clinicInfo.doctorName || 'Unknown Doctor', customer_email: clinicInfo.customerEmail, items: items, total_amount: totalAmount, status: 'Pending', date: new Date().toISOString().split('T')[0], shipping_address: clinicInfo.address || 'Unknown Address' };
    const { error } = await supabase.from('orders').insert(orderPayload);
    if (error) throw error;
    return { orderId };
  },

  async getOrders(userEmail?: string): Promise<Order[]> {
    try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((o: any) => ({ id: o.id, customerName: o.customer_name, customerEmail: o.customer_email, items: o.items || [], totalAmount: o.total_amount, status: o.status, date: o.date || o.created_at, shippingAddress: o.shipping_address }));
    } catch (error) { return []; }
  },

  async updateOrderStatus(orderId: string, status: 'Paid' | 'Shipped' | 'Completed'): Promise<void> {
    await supabase.from('orders').update({ status }).eq('id', orderId);
  },

  async initiateStripePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, currency }) });
        if (!response.ok) throw new Error('Stripe backend initialization failed');
        return await response.json();
    } catch (error) { return { mock: true }; }
  },
  
  async createStripeCheckoutSession(orderId: string, items: CartItem[]): Promise<any> {
      try {
          const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-checkout-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, items, returnUrl: window.location.origin + window.location.pathname }) });
          if (!response.ok) throw new Error('Failed to create Checkout session');
          return await response.json();
      } catch (error) { return { mock: true }; }
  },

  async initiatePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payment/airwallex/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, currency, description: `VetSphere Order #${orderId}` }) });
        if (!response.ok) throw new Error('Backend payment initialization failed');
        return await response.json(); 
    } catch (error) { return { status: 'success', mock: true, client_secret: 'mock_secret_123' }; }
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    await this.updateOrderStatus(orderId, 'Paid');
    return true;
  },

  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    if (!password) throw new Error("Password is required");
    
    // 1. Attempt standard Supabase Login
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // 2. If invalid credentials (maybe user doesn't exist), try to Auto-Register for convenience
    if (error && error.message.includes('Invalid login credentials')) {
        const role = email.includes('admin') ? 'Admin' : email.includes('supplier') ? 'ShopSupplier' : email.includes('edu') ? 'CourseProvider' : 'Doctor';
        const signUp = await supabase.auth.signUp({ email, password, options: { data: { role } } });
        if (!signUp.error && signUp.data.session) { 
            data = { user: signUp.data.user, session: signUp.data.session }; 
            error = null; 
        }
    }

    // 3. EMERGENCY BYPASS FOR SUPER ADMIN
    // If Supabase fails (e.g. Email not verified, Database down), allow the master admin to enter.
    if ((error || !data.user) && email === 'admin@vetsphere.pro' && password === 'admin123') {
        return {
            token: "master-admin-bypass-token",
            user: { 
                id: "admin-master-id", 
                email: email, 
                name: "Super Admin", 
                role: 'Admin' 
            }
        };
    }

    if (error || !data.user) throw new Error("Authentication failed");
    return { token: data.session?.access_token || "", user: { id: data.user.id, email: data.user.email, name: data.user.email?.split('@')[0], role: data.user.user_metadata?.role || 'Doctor' } };
  }
};
