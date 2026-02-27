import { supabase } from './supabase';
import { Order, CartItem, Lead, ShippingTemplate, Quote, Product, Course, Post, Specialty } from '@/types';
import { PRODUCTS_CN, COURSES_CN } from '@/lib/constants';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.vetsphere.net';

// Production mode: disable mock data fallback
const USE_MOCK_FALLBACK = process.env.NODE_ENV === 'development';

// Seed data for initial setup (only used in development or when DB is empty)
const SEED_POSTS: Post[] = [
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

// Seed data references (only used when USE_MOCK_FALLBACK is true)
const SEED_PRODUCTS = USE_MOCK_FALLBACK ? [...PRODUCTS_CN] : [];
const SEED_COURSES = USE_MOCK_FALLBACK ? [...COURSES_CN] : [];

export const api = {
  // =====================================================
  // POINTS SYSTEM (Database-backed)
  // =====================================================
  async awardPoints(userId: string, amount: number, reason: string): Promise<{ points: number; level: string }> {
    try {
      const { data, error } = await supabase.rpc('award_user_points', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason
      });
      
      if (error) throw error;
      
      const result = data?.[0] || { new_total: 500, new_level: 'Resident' };
      return { points: result.new_total, level: result.new_level };
    } catch (e) {
      console.error('Award points error:', e);
      // Fallback to localStorage if DB fails
      const current = parseInt(localStorage.getItem(`pts_${userId}`) || "500");
      const updated = current + amount;
      localStorage.setItem(`pts_${userId}`, updated.toString());
      return { points: updated, level: this.calculateLevel(updated) };
    }
  },

  async fetchUserPoints(userId: string): Promise<{ points: number; level: string }> {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('total_points, level')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        // Initialize points for new user
        await supabase.from('user_points').insert({ user_id: userId, total_points: 500, level: 'Resident' });
        return { points: 500, level: 'Resident' };
      }
      
      return { points: data.total_points, level: data.level };
    } catch {
      return { points: 500, level: 'Resident' };
    }
  },

  async getPointsHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) return [];
      return data.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        balanceAfter: t.balance_after,
        createdAt: t.created_at
      }));
    } catch {
      return [];
    }
  },

  calculateLevel(points: number): string {
    if (points >= 10000) return 'Master';
    if (points >= 5000) return 'Expert';
    if (points >= 2000) return 'Senior';
    if (points >= 1000) return 'Specialist';
    return 'Resident';
  },

  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error || !data || data.length === 0) return USE_MOCK_FALLBACK ? SEED_PRODUCTS : [];
      return data.map((p: any) => ({
        id: p.id, name: p.name, brand: p.brand, price: p.price, specialty: p.specialty,
        group: p.group_category, imageUrl: p.image_url, description: p.description,
        longDescription: p.long_description || p.description,
        specs: p.specs || {}, compareData: p.compare_data,
        stockStatus: p.stock_status || 'In Stock',
        supplier: p.supplier_info || { name: 'Verified Supplier', origin: 'Global', rating: 5.0 }
      }));
    } catch { return USE_MOCK_FALLBACK ? SEED_PRODUCTS : []; }
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
      if (error || !data || data.length === 0) return USE_MOCK_FALLBACK ? SEED_COURSES : [];
      return data.map((c: any) => ({
        id: c.id, title: c.title, specialty: c.specialty, level: c.level,
        price: c.price, currency: c.currency || 'CNY',
        startDate: c.start_date, endDate: c.end_date,
        location: c.location || {}, instructor: c.instructor || {},
        imageUrl: c.image_url, description: c.description,
        status: c.status || 'Published', agenda: c.agenda || []
      }));
    } catch { return USE_MOCK_FALLBACK ? SEED_COURSES : []; }
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
      if (error || !data || data.length === 0) return USE_MOCK_FALLBACK ? SEED_POSTS : [];
      return data.map((p: any) => ({
        id: p.id, title: p.title, content: p.content, specialty: p.specialty,
        media: p.media || [], stats: p.stats || { likes: 0, comments: 0, saves: 0 },
        createdAt: new Date(p.created_at).toLocaleDateString(),
        isAiAnalyzed: p.is_ai_analyzed, author: p.author_info,
        patientInfo: p.patient_info, sections: p.sections
      }));
    } catch { return USE_MOCK_FALLBACK ? SEED_POSTS : []; }
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

  // =====================================================
  // POST INTERACTIONS (Likes, Saves - Database-backed)
  // =====================================================
  async interactWithPost(postId: string, type: 'like' | 'save', userId?: string): Promise<{ success: boolean; newCount: number }> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) return { success: false, newCount: 0 };
      
      // Check if interaction already exists
      const { data: existing } = await supabase
        .from('post_interactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('interaction_type', type)
        .single();
      
      if (existing) {
        // Remove interaction (toggle off)
        await supabase.from('post_interactions').delete().eq('id', existing.id);
      } else {
        // Add interaction
        await supabase.from('post_interactions').insert({
          post_id: postId,
          user_id: userId,
          interaction_type: type
        });
      }
      
      // Get updated count
      const { count } = await supabase
        .from('post_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('interaction_type', type);
      
      return { success: true, newCount: count || 0 };
    } catch (e) {
      console.error('Post interaction error:', e);
      return { success: false, newCount: 0 };
    }
  },

  async getUserInteractions(postIds: string[], userId?: string): Promise<Record<string, { liked: boolean; saved: boolean }>> {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) return {};
      
      const { data } = await supabase
        .from('post_interactions')
        .select('post_id, interaction_type')
        .eq('user_id', userId)
        .in('post_id', postIds);
      
      const result: Record<string, { liked: boolean; saved: boolean }> = {};
      postIds.forEach(id => { result[id] = { liked: false, saved: false }; });
      
      data?.forEach((i: any) => {
        if (result[i.post_id]) {
          if (i.interaction_type === 'like') result[i.post_id].liked = true;
          if (i.interaction_type === 'save') result[i.post_id].saved = true;
        }
      });
      
      return result;
    } catch {
      return {};
    }
  },

  // =====================================================
  // POST COMMENTS (Database-backed)
  // =====================================================
  async addComment(postId: string, content: string, user: any, parentId?: string): Promise<any> {
    try {
      const newComment = {
        post_id: postId,
        user_id: user.id,
        author_name: user.name || user.email?.split('@')[0] || 'Anonymous',
        author_avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random`,
        content,
        parent_id: parentId || null
      };
      
      const { data, error } = await supabase
        .from('post_comments')
        .insert(newComment)
        .select()
        .single();
      
      if (error) throw error;
      
      // Award points for commenting
      await this.awardPoints(user.id, 10, 'Commenting on clinical case');
      
      return {
        id: data.id,
        postId: data.post_id,
        authorName: data.author_name,
        authorAvatar: data.author_avatar,
        content: data.content,
        parentId: data.parent_id,
        createdAt: data.created_at
      };
    } catch (e) {
      console.error('Add comment error:', e);
      return null;
    }
  },

  async getComments(postId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) return [];
      
      return data.map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        authorName: c.author_name,
        authorAvatar: c.author_avatar,
        content: c.content,
        parentId: c.parent_id,
        createdAt: c.created_at
      }));
    } catch {
      return [];
    }
  },

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);
      
      return !error;
    } catch {
      return false;
    }
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
