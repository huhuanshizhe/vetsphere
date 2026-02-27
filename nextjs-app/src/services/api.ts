import { supabase } from './supabase';
import { Order, CartItem, Lead, ShippingTemplate, Quote, Product, Course, Post, Specialty } from '@/types';
import { PRODUCTS_CN, COURSES_CN } from '@/lib/constants';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.vetsphere.net';

const INITIAL_POSTS: Post[] = [
  {
    id: 'case-001',
    title: '\u590D\u6742\u7C89\u788E\u6027\u80A1\u9AA8\u9AA8\u6298\u7684 TPLO + \u9501\u5B9A\u94A2\u677F\u8054\u5408\u56FA\u5B9A',
    content: '\u60A3\u72AC\u4E3A3\u5C81\u62C9\u5E03\u62C9\u591A\uFF0C\u906D\u9047\u8F66\u7978\u5BFC\u81F4\u80A1\u9AA8\u8FDC\u7AEF\u7C89\u788E\u6027\u9AA8\u6298\uFF0C\u540C\u65F6\u4F34\u6709\u4EA4\u53C9\u97E7\u5E26\u65AD\u88C2\u3002\u6211\u4EEC\u91C7\u7528\u4E86\u53CC\u677F\u56FA\u5B9A\u6280\u672F...',
    specialty: Specialty.ORTHOPEDICS,
    media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80' }],
    stats: { likes: 42, comments: 12, saves: 28 },
    createdAt: '2025-05-15',
    isAiAnalyzed: true,
    author: { name: 'Dr. Zhang', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80', level: 'Expert', hospital: '\u4E0A\u6D77\u4E2D\u5FC3\u5BA0\u7269\u533B\u9662' },
    patientInfo: { species: 'Canine (Labrador)', age: '3y', weight: '32kg' },
    sections: { diagnosis: 'Distal Femoral Comminuted Fracture', plan: 'Dual Plate Fixation + TPLO Stabilization', outcome: 'Post-op 8 weeks: Good weight bearing.' }
  },
  {
    id: 'case-002',
    title: '\u795E\u7ECF\u5916\u79D1\uFF1AL3-L4 \u690E\u95F4\u76D8\u7A81\u51FA\u5BFC\u81F4\u7684\u622A\u7627\u75C5\u4F8B\u62A5\u544A',
    content: '\u8BE5\u75C5\u4F8B\u5C55\u793A\u4E86\u534A\u690E\u677F\u5207\u9664\u672F\u5728\u6025\u6027 IVDD \u5904\u7406\u4E2D\u7684\u5E94\u7528\uFF0C\u672F\u540E\u914D\u5408\u9AD8\u538B\u6C27\u6CBB\u7597\u6548\u679C\u663E\u8457\u3002',
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

let MOCK_PRODUCTS = [...PRODUCTS_CN];

const STORAGE_KEY_COURSES = 'vetsphere_mock_courses_v2';
const loadCourses = () => {
  if (typeof window === 'undefined') return [...COURSES_CN];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COURSES);
    return saved ? JSON.parse(saved) : [...COURSES_CN];
  } catch {
    return [...COURSES_CN];
  }
};
let MOCK_COURSES = loadCourses();

const saveCourses = (courses: Course[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
  }
};

export const api = {
  async awardPoints(userId: string, amount: number, reason: string): Promise<number> {
    console.log(`[Points] User ${userId} awarded ${amount} pts for ${reason}`);
    const current = parseInt(localStorage.getItem(`pts_${userId}`) || "500");
    const updated = current + amount;
    localStorage.setItem(`pts_${userId}`, updated.toString());
    return updated;
  },

  async fetchUserPoints(userId: string): Promise<number> {
    return parseInt(localStorage.getItem(`pts_${userId}`) || "500");
  },

  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error || !data || data.length === 0) return MOCK_PRODUCTS;
      return data.map((p: any) => ({
        id: p.id, name: p.name, brand: p.brand, price: p.price, specialty: p.specialty,
        group: p.group_category, imageUrl: p.image_url, description: p.description,
        longDescription: p.long_description || p.description,
        specs: p.specs || {}, compareData: p.compare_data,
        stockStatus: p.stock_status || 'In Stock',
        supplier: p.supplier_info || { name: 'Verified Supplier', origin: 'Global', rating: 5.0 }
      }));
    } catch { return MOCK_PRODUCTS; }
  },

  async manageProduct(action: 'create' | 'update' | 'delete', product: Partial<Product>): Promise<void> {
    if (action === 'create') {
      const payload = { id: `p-${Date.now()}`, name: product.name, brand: product.brand, price: product.price, specialty: product.specialty, group_category: product.group, image_url: product.imageUrl, description: product.description, long_description: product.longDescription, specs: product.specs, stock_status: product.stockStatus || 'In Stock', supplier_info: product.supplier };
      await supabase.from('products').insert(payload as any);
    } else if (action === 'update' && product.id) {
      const payload = { name: product.name, brand: product.brand, price: product.price, specialty: product.specialty, group_category: product.group, image_url: product.imageUrl, description: product.description, long_description: product.longDescription, specs: product.specs, stock_status: product.stockStatus, supplier_info: product.supplier };
      await supabase.from('products').update(payload as any).eq('id', product.id);
    } else if (action === 'delete' && product.id) {
      await supabase.from('products').delete().eq('id', product.id);
    }
  },

  async getCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('start_date', { ascending: true });
      if (error || !data || data.length === 0) return [...MOCK_COURSES];
      return data.map((c: any) => ({
        id: c.id, title: c.title, specialty: c.specialty, level: c.level,
        price: c.price, currency: c.currency || 'CNY',
        startDate: c.start_date, endDate: c.end_date,
        location: c.location || {}, instructor: c.instructor || {},
        imageUrl: c.image_url, description: c.description,
        status: c.status || 'Published', agenda: c.agenda || []
      }));
    } catch { return [...MOCK_COURSES]; }
  },

  async manageCourse(action: 'create' | 'update' | 'delete', course: Partial<Course>): Promise<void> {
    if (action === 'create') {
      const payload = { id: `c-${Date.now()}`, title: course.title, specialty: course.specialty, level: course.level, price: course.price, currency: course.currency || 'CNY', start_date: course.startDate, end_date: course.endDate, location: course.location, instructor: course.instructor, image_url: course.imageUrl, description: course.description, status: course.status || 'Pending', agenda: course.agenda || [] };
      await supabase.from('courses').insert(payload as any);
    } else if (action === 'update' && course.id) {
      const payload = { title: course.title, specialty: course.specialty, level: course.level, price: course.price, currency: course.currency, start_date: course.startDate, end_date: course.endDate, location: course.location, instructor: course.instructor, image_url: course.imageUrl, description: course.description, status: course.status, agenda: course.agenda };
      await supabase.from('courses').update(payload as any).eq('id', course.id);
    } else if (action === 'delete' && course.id) {
      await supabase.from('courses').delete().eq('id', course.id);
    }
  },

  async getPosts(): Promise<Post[]> {
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return INITIAL_POSTS;
      return data.map((p: any) => ({
        id: p.id, title: p.title, content: p.content, specialty: p.specialty,
        media: p.media || [], stats: p.stats || { likes: 0, comments: 0, saves: 0 },
        createdAt: new Date(p.created_at).toLocaleDateString(),
        isAiAnalyzed: p.is_ai_analyzed, author: p.author_info,
        patientInfo: p.patient_info, sections: p.sections
      }));
    } catch { return INITIAL_POSTS; }
  },

  async createPost(post: Partial<Post>, user: any): Promise<void> {
    const newPost = {
      id: `post-${Date.now()}`, author_id: user.id, author_info: post.author,
      title: post.title, content: post.content, specialty: post.specialty,
      media: post.media, patient_info: post.patientInfo, sections: post.sections,
      is_ai_analyzed: true, stats: { likes: 0, comments: 0, saves: 0 }
    };
    await supabase.from('posts').insert(newPost);
    await this.awardPoints(user.id, 200, "Publishing Clinical Case");
  },

  async interactWithPost(postId: string, type: 'like' | 'save'): Promise<void> {
    console.log(`Interaction: ${type} on post ${postId}`);
  },

  async addComment(postId: string, comment: any): Promise<void> {
    console.log(`New comment on ${postId}:`, comment);
  },

  async getShippingTemplates(): Promise<ShippingTemplate[]> {
    const { data, error } = await supabase.from('shipping_templates').select('*');
    if (error || !data) return [];
    return data.map((t: any) => ({ id: t.id, name: t.name, regionCode: t.region_code, baseFee: t.base_fee, perItemFee: t.per_item_fee, currency: 'CNY', estimatedDays: t.estimated_days }));
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
    const quotePayload = { id: quoteId, customer_email: clinicInfo.customerEmail, customer_info: clinicInfo, items, total_amount: totalAmount, status: 'Active', valid_until: validUntil.toISOString(), created_at: new Date().toISOString() };
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
    const orderPayload = { id: orderId, user_id: user?.id, customer_name: clinicInfo.doctorName || 'Unknown Doctor', customer_email: clinicInfo.customerEmail, items, total_amount: totalAmount, status: 'Pending', date: new Date().toISOString().split('T')[0], shipping_address: clinicInfo.address || 'Unknown Address' };
    const { error } = await supabase.from('orders').insert(orderPayload);
    if (error) throw error;
    
    // Create enrollment records for course items
    if (user?.id) {
      const courseItems = items.filter(item => item.type === 'course');
      for (const course of courseItems) {
        await this.createEnrollment(user.id, course.id, orderId);
      }
    }
    
    return { orderId };
  },

  // Course Enrollment Functions
  async createEnrollment(userId: string, courseId: string, orderId: string): Promise<void> {
    const { error } = await supabase.from('course_enrollments').insert({
      user_id: userId,
      course_id: courseId,
      order_id: orderId,
      payment_status: 'pending',
      completion_status: 'enrolled'
    });
    if (error && !error.message.includes('duplicate')) {
      console.error('Enrollment creation error:', error);
    }
  },

  async getEnrollments(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', userId)
        .order('enrollment_date', { ascending: false });
      
      if (error || !data) return [];
      
      // Fetch course details for each enrollment
      const enrollmentsWithCourses = await Promise.all(
        data.map(async (enrollment: any) => {
          const courses = await this.getCourses();
          const course = courses.find(c => c.id === enrollment.course_id);
          return {
            id: enrollment.id,
            courseId: enrollment.course_id,
            orderId: enrollment.order_id,
            paymentStatus: enrollment.payment_status,
            enrollmentDate: enrollment.enrollment_date,
            completionStatus: enrollment.completion_status,
            certificateIssued: enrollment.certificate_issued,
            course: course || null
          };
        })
      );
      
      return enrollmentsWithCourses;
    } catch {
      return [];
    }
  },

  async getCourseEnrollments(courseId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .order('enrollment_date', { ascending: false });
      
      if (error || !data) return [];
      return data.map((e: any) => ({
        id: e.id,
        userId: e.user_id,
        paymentStatus: e.payment_status,
        enrollmentDate: e.enrollment_date,
        completionStatus: e.completion_status
      }));
    } catch {
      return [];
    }
  },

  async updateEnrollmentPaymentStatus(enrollmentId: string, status: 'pending' | 'paid' | 'refunded'): Promise<void> {
    await supabase.from('course_enrollments').update({ payment_status: status }).eq('id', enrollmentId);
  },

  async updateEnrollmentsByOrderId(orderId: string, paymentStatus: 'paid' | 'refunded'): Promise<void> {
    await supabase.from('course_enrollments').update({ payment_status: paymentStatus }).eq('order_id', orderId);
  },

  async getOrders(userEmail?: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((o: any) => ({ id: o.id, customerName: o.customer_name, customerEmail: o.customer_email, items: o.items || [], totalAmount: o.total_amount, status: o.status, date: o.date || o.created_at, shippingAddress: o.shipping_address }));
    } catch { return []; }
  },

  async updateOrderStatus(orderId: string, status: 'Paid' | 'Shipped' | 'Completed'): Promise<void> {
    await supabase.from('orders').update({ status }).eq('id', orderId);
  },

  async initiateStripePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, currency }) });
      if (!response.ok) throw new Error('Stripe backend initialization failed');
      return await response.json();
    } catch { return { mock: true }; }
  },

  async createStripeCheckoutSession(orderId: string, items: CartItem[]): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-checkout-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, items, returnUrl: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '' }) });
      if (!response.ok) throw new Error('Failed to create Checkout session');
      return await response.json();
    } catch { return { mock: true }; }
  },

  async initiatePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment/airwallex/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, currency, description: `VetSphere Order #${orderId}` }) });
      if (!response.ok) throw new Error('Backend payment initialization failed');
      return await response.json();
    } catch { return { status: 'success', mock: true, client_secret: 'mock_secret_123' }; }
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    await this.updateOrderStatus(orderId, 'Paid');
    return true;
  },

  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    if (!password) throw new Error("Password is required");
    
    // Try to sign in with existing account
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // If user doesn't exist, auto-register with role based on email domain
    if (error && error.message.includes('Invalid login credentials')) {
      const role = email.includes('admin') ? 'Admin' : email.includes('supplier') ? 'ShopSupplier' : email.includes('edu') ? 'CourseProvider' : 'Doctor';
      const signUp = await supabase.auth.signUp({ email, password, options: { data: { role } } });
      if (!signUp.error && signUp.data.session && signUp.data.user) {
        data = { user: signUp.data.user, session: signUp.data.session };
        error = null;
      }
    }

    // Authentication failed - no bypass, throw error
    if (error || !data.user) {
      throw new Error(error?.message || "Authentication failed. Please check your credentials.");
    }
    
    return { 
      token: data.session?.access_token || "", 
      user: { 
        id: data.user.id, 
        email: data.user.email, 
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0], 
        role: data.user.user_metadata?.role || 'Doctor', 
        points: 500, 
        level: 'Resident' 
      } 
    };
  }
};
