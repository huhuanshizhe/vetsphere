
import { supabase } from './supabase';
import { Order, CartItem, Lead } from '../types';

const BACKEND_URL = 'http://localhost:3001';
const LOCAL_ORDERS_KEY = 'vetsphere_local_orders_v1';
const LOCAL_LEADS_KEY = 'vetsphere_local_leads_v1';

// Helper: Save order locally if backend fails
const saveLocalOrder = (order: any) => {
    try {
        const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
        const orders = saved ? JSON.parse(saved) : [];
        // Prevent duplicates
        if (!orders.find((o: any) => o.id === order.id)) {
            orders.unshift(order);
            localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
        }
    } catch (e) {
        console.error("Local storage error:", e);
    }
};

// Helper: Get local orders
const getLocalOrders = () => {
    try {
        const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
};

// Helper: Update local order status
const updateLocalOrder = (orderId: string, status: string) => {
    try {
        const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
        if (saved) {
            const orders = JSON.parse(saved);
            const updated = orders.map((o: any) => o.id === orderId ? { ...o, status } : o);
            localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
        }
    } catch (e) {
        console.error("Local storage update error:", e);
    }
}

// Helper: Lead Management (Mock Local)
const saveLocalLead = (lead: Lead) => {
    try {
        const saved = localStorage.getItem(LOCAL_LEADS_KEY);
        const leads = saved ? JSON.parse(saved) : [];
        leads.unshift(lead);
        localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(leads));
    } catch (e) {
        console.error("Local lead save error:", e);
    }
}

const getLocalLeads = (): Lead[] => {
    try {
        const saved = localStorage.getItem(LOCAL_LEADS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

const updateLocalLeadStatus = (leadId: string, status: any) => {
    try {
        const saved = localStorage.getItem(LOCAL_LEADS_KEY);
        if(saved) {
            const leads = JSON.parse(saved);
            const updated = leads.map((l: Lead) => l.id === leadId ? { ...l, status } : l);
            localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
        }
    } catch (e) {}
}

export const api = {
  
  // --- CRM / Leads Module ---

  async createLead(data: Partial<Lead>): Promise<void> {
    const newLead: Lead = {
        id: `LEAD-${Date.now()}`,
        source: 'AI Chat',
        contactInfo: data.contactInfo || 'Unknown',
        interestSummary: data.interestSummary || 'General Inquiry',
        fullChatLog: data.fullChatLog || [],
        status: 'New',
        createdAt: new Date().toISOString(),
        organization: data.organization,
        name: data.name
    };
    
    // In real app: await supabase.from('leads').insert(newLead);
    saveLocalLead(newLead);
    console.log("Lead captured:", newLead);
  },

  async getLeads(): Promise<Lead[]> {
      // In real app: await supabase.from('leads').select('*');
      return getLocalLeads();
  },

  async updateLeadStatus(id: string, status: 'New' | 'Contacted' | 'Converted' | 'Archived'): Promise<void> {
      // In real app: await supabase.from('leads').update({status}).eq('id', id);
      updateLocalLeadStatus(id, status);
  },

  // --- Order Module ---
  
  async createOrder(items: CartItem[], totalAmount: number, clinicInfo: any): Promise<{ orderId: string }> {
    const orderId = `ORD-${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`;
    
    const orderPayload = {
      id: orderId,
      customer_name: clinicInfo.doctorName || 'Unknown Doctor',
      items: items, // Supabase automatically handles JSON serialization
      total_amount: totalAmount,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      shipping_address: clinicInfo.address || 'Unknown Address'
    };

    let supabaseSuccess = false;

    try {
        const { error } = await supabase.from('orders').insert(orderPayload);
        if (error) {
            console.warn('Supabase Order Insert Failed (Using Local Fallback):', error.message);
        } else {
            supabaseSuccess = true;
        }
    } catch (err) {
        console.error('Supabase Connection Error (Using Local Fallback):', err);
    }

    // Always save locally as backup or primary if supabase failed
    if (!supabaseSuccess) {
        saveLocalOrder(orderPayload);
    }

    return { orderId };
  },

  async getOrders(): Promise<Order[]> {
    let remoteOrders: any[] = [];
    
    try {
        const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

        if (!error && data) {
            remoteOrders = data;
        }
    } catch (error) {
        console.warn('Supabase Fetch Error (Using Local Data):', error);
    }

    const localOrders = getLocalOrders();

    // Map to Order interface
    const mapToOrder = (o: any): Order => ({
      id: o.id,
      customerName: o.customer_name,
      items: o.items || [],
      totalAmount: o.total_amount,
      status: o.status,
      date: o.date,
      shippingAddress: o.shipping_address
    });

    // Merge: Remote takes precedence if ID exists (though IDs are random)
    // For simplicity, we just concat distinct ones or just show both if IDs differ
    const allRaw = [...localOrders, ...remoteOrders];
    // Deduplicate by ID
    const uniqueRaw = Array.from(new Map(allRaw.map(item => [item.id, item])).values());
    
    // Sort by date descending (mock)
    uniqueRaw.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return uniqueRaw.map(mapToOrder);
  },

  async updateOrderStatus(orderId: string, status: 'Paid' | 'Shipped' | 'Completed'): Promise<void> {
    // 1. Try Supabase
    try {
        const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
        
        if (error) console.warn('Supabase Update Failed:', error.message);
    } catch (error) {
        console.warn('Supabase Update Connection Error:', error);
    }

    // 2. Update Local
    updateLocalOrder(orderId, status);
  },

  // --- Payment Module (Airwallex) ---

  async initiatePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payment/airwallex/create-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                amount,
                currency,
                description: `VetSphere Medical Order #${orderId}`
            })
        });

        if (!response.ok) {
            throw new Error('Backend payment initialization failed');
        }

        return await response.json(); 
    } catch (error) {
        console.warn("Airwallex Backend unreachable (Demo Mode):", error);
        return { status: 'success', mock: true, client_secret: 'mock_secret_123' };
    }
  },

  // --- Payment Module (Stripe) ---

  async initiateStripePayment(orderId: string, amount: number, currency: string = 'CNY'): Promise<any> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/payment/stripe/create-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                amount,
                currency
            })
        });

        if (!response.ok) {
            throw new Error('Stripe backend initialization failed');
        }

        return await response.json();
    } catch (error) {
        // Log as warning instead of error to prevent "Failed to fetch" from looking like a crash in console
        console.warn("Stripe Backend unreachable (Demo Mode activated).");
        // Fallback with mock: true to trigger UI simulation
        return { mock: true };
    }
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    await this.updateOrderStatus(orderId, 'Paid');
    return true;
  },

  // --- User Module ---
  
  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    if (!password) {
        throw new Error("Password is required for Supabase Auth");
    }

    // Helper to guess role from email for demo fallback
    const determineRole = (email: string) => {
        if (email.includes('admin')) return 'Admin';
        if (email.includes('supplier') || email.includes('shop')) return 'ShopSupplier';
        if (email.includes('edu') || email.includes('csavs') || email.includes('course')) return 'CourseProvider';
        return 'Doctor';
    };

    // Helper for creating mock sessions in fallback scenarios
    const createMockSession = () => {
        const role = determineRole(email);
        return {
            token: "mock_token_bypass_" + Date.now(),
            user: {
                id: "mock_" + email,
                email: email,
                name: email.split('@')[0],
                role: role
            }
        };
    };

    // 1. Try to sign in
    let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    // --- DEMO FIX: Handle specific Supabase errors by bypassing check ---
    if (error) {
        const msg = error.message.toLowerCase();
        const isRateLimit = msg.includes('rate limit') || error.status === 429;
        const isEmailNotConfirmed = msg.includes('email not confirmed');
        
        if (isRateLimit || isEmailNotConfirmed) {
            console.warn(`Demo Mode: Bypassing auth due to error: ${error.message}`);
            return createMockSession();
        }
    }

    // 2. If user doesn't exist (Invalid login credentials), Auto-Sign Up (for Demo convenience)
    if (error && error.message.includes('Invalid login credentials')) {
        console.log("User not found, attempting auto-registration for demo...");
        
        const role = determineRole(email);

        const signUpResult = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role } // Store role in metadata
            }
        });
        
        // Handle rate limit during sign up as well
        if (signUpResult.error) {
             const msg = signUpResult.error.message.toLowerCase();
             if (msg.includes('rate limit') || signUpResult.error.status === 429) {
                 console.warn("Demo Mode: SignUp Rate Limit. Bypassing.");
                 return createMockSession();
             }
             throw signUpResult.error;
        }
        
        // If session is null (Supabase waiting for email confirmation), bypass for demo
        if (!signUpResult.data.session) {
             console.warn("Demo Mode: SignUp successful but email pending. Bypassing.");
             return createMockSession();
        }

        data = { user: signUpResult.data.user, session: signUpResult.data.session };
    } else if (error) {
        throw error;
    }

    if (!data.user) throw new Error("Authentication failed");

    // Extract role from metadata, default to Doctor if missing
    const role = data.user.user_metadata?.role || 'Doctor';

    return {
      token: data.session?.access_token || "mock_token",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.email?.split('@')[0] || "User",
        role: role
      }
    };
  }
};
