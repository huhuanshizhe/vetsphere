
import { supabase } from './supabase';
import { Order, CartItem } from '../types';

export const api = {
  
  // --- Order Module ---
  
  async createOrder(items: CartItem[], totalAmount: number, clinicInfo: any): Promise<{ orderId: string; payParams: any }> {
    const orderId = `ORD-${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`;
    
    const { error } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: clinicInfo.doctorName || 'Unknown Doctor',
      items: items, // Supabase automatically handles JSON serialization
      total_amount: totalAmount,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      shipping_address: clinicInfo.address || 'Unknown Address'
    });

    if (error) {
      console.error('Supabase Order Error:', error);
      throw new Error('Failed to create order in Supabase');
    }

    return {
      orderId,
      payParams: {
        provider: 'WeChatPay',
        prepay_id: 'wx2026_mock_id',
        sign: 'ENCRYPTED_SIGNATURE' 
      }
    };
  },

  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Fetch Error:', error);
      return [];
    }

    return data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      items: o.items,
      totalAmount: o.total_amount,
      status: o.status,
      date: o.date,
      shippingAddress: o.shipping_address
    }));
  },

  async updateOrderStatus(orderId: string, status: 'Paid' | 'Shipped' | 'Completed'): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Supabase Update Error:', error);
      throw error;
    }
  },

  // --- Payment Module ---

  async verifyPayment(orderId: string): Promise<boolean> {
    // For demo purposes, we automatically mark it as paid in Supabase
    // In a real app, this would be a backend web hook from Stripe/WeChat
    await this.updateOrderStatus(orderId, 'Paid');
    return true;
  },

  // --- User Module ---
  
  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    if (!password) {
        throw new Error("Password is required for Supabase Auth");
    }

    // 1. Try to sign in
    let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    // 2. If user doesn't exist, Auto-Sign Up (for Demo convenience)
    if (error && error.message.includes('Invalid login credentials')) {
        console.log("User not found, attempting auto-registration for demo...");
        
        let role = 'Doctor';
        if (email.includes('admin')) role = 'Admin';
        else if (email.includes('shop')) role = 'ShopSupplier';
        else if (email.includes('course')) role = 'CourseProvider';

        const signUpResult = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role } // Store role in metadata
            }
        });
        
        if (signUpResult.error) throw signUpResult.error;
        data = { user: signUpResult.data.user, session: signUpResult.data.session };
    } else if (error) {
        throw error;
    }

    if (!data.user) throw new Error("Authentication failed");

    // Extract role from metadata
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
