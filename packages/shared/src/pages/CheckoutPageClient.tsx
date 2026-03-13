'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../services/api';
import { supabase, getSessionSafe } from '../services/supabase';
import { LOCATIONS } from '../lib/locations';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { SiteConfig, PaymentProvider } from '../site-config.types';

// Initialize Stripe lazily (only when needed)
const stripePromise = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Stripe Payment Form Component
interface StripePaymentFormProps {
  totalAmount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  contactEmail: string;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ totalAmount, onSuccess, onError, contactEmail }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?success=true`,
          receipt_email: contactEmail,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment processing failed';
      onError(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement 
        options={{
          layout: 'tabs',
        }}
      />
      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="w-full mt-6 bg-[#635BFF] text-white py-4 rounded-xl font-black text-sm shadow-xl hover:shadow-2xl transition-all disabled:opacity-70"
      >
        {processing ? 'Processing...' : `Pay ¥${totalAmount.toLocaleString()}`}
      </button>
    </form>
  );
};

const ALL_PAYMENT_METHODS = [
  { id: 'Stripe' as const, label: 'Credit Card / Link', sub: 'Secure Embedded Payment', icon: '💳', color: 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]' },
  { id: 'Airwallex' as const, label: 'Credit Card', sub: 'Airwallex Secure Form', icon: '🌏', color: 'border-vs bg-vs/5 text-vs' },
  { id: 'Alipay' as const, label: 'Alipay', sub: 'CNY Payments', icon: '🔵', color: 'border-blue-500 bg-blue-500/5 text-blue-500' },
  { id: 'Wechat' as const, label: 'WeChat Pay', sub: 'CNY Payments', icon: '🟢', color: 'border-green-500 bg-green-500/5 text-green-500' },
  { id: 'Quote' as const, label: 'Request Quote', sub: 'B2B Proforma Invoice', icon: '📄', color: 'border-slate-800 bg-slate-900 text-white shadow-xl shadow-slate-200' },
];

interface CheckoutProps {
  siteConfig?: SiteConfig;
}

// Translation helper
const useTranslations = (isCN: boolean) => {
  const t = {
    // Payment methods
    creditCardLink: isCN ? '信用卡 / Link' : 'Credit Card / Link',
    securePayment: isCN ? '安全嵌入式支付' : 'Secure Embedded Payment',
    creditCard: isCN ? '信用卡' : 'Credit Card',
    airwallexForm: isCN ? 'Airwallex 安全表单' : 'Airwallex Secure Form',
    alipay: isCN ? '支付宝' : 'Alipay',
    cnyPayments: isCN ? '人民币支付' : 'CNY Payments',
    wechatPay: isCN ? '微信支付' : 'WeChat Pay',
    requestQuote: isCN ? '申请报价单' : 'Request Quote',
    b2bInvoice: isCN ? 'B2B 形式发票' : 'B2B Proforma Invoice',
    
    // Page titles
    checkout: isCN ? '结算' : 'Checkout',
    orderSummary: isCN ? '订单摘要' : 'Order Summary',
    paymentMethod: isCN ? '支付方式' : 'Payment Method',
    contactInfo: isCN ? '联系信息' : 'Contact Information',
    shippingAddress: isCN ? '收货地址' : 'Shipping Address',
    
    // Buttons
    pay: isCN ? '支付' : 'Pay',
    processing: isCN ? '处理中...' : 'Processing...',
    placeOrder: isCN ? '下单' : 'Place Order',
    continueShopping: isCN ? '继续购物' : 'Continue Shopping',
    viewOrder: isCN ? '查看订单' : 'View Order Details',
    viewInvoices: isCN ? '查看发票' : 'View My Invoices',
    
    // Messages
    cartEmpty: isCN ? '购物车是空的' : 'Your Cart is Empty',
    goToShop: isCN ? '去购物' : 'Go to Shop',
    paymentSuccess: isCN ? '支付成功' : 'Payment Successful',
    piGenerated: isCN ? '报价单已生成' : 'Proforma Invoice Generated',
    orderConfirmed: isCN ? '订单已确认' : 'Order confirmed',
    
    // Form labels
    email: isCN ? '邮箱' : 'Email',
    phone: isCN ? '电话' : 'Phone',
    name: isCN ? '姓名' : 'Name',
    clinicName: isCN ? '医院名称' : 'Clinic Name',
    doctorName: isCN ? '医生姓名' : 'Doctor Name',
    
    // Order summary
    subtotal: isCN ? '小计' : 'Subtotal',
    shipping: isCN ? '运费' : 'Shipping',
    free: isCN ? '免费' : 'Free',
    total: isCN ? '总计' : 'Total',
    qty: isCN ? '数量' : 'Qty',
    
    // Auth
    login: isCN ? '登录' : 'Login',
    register: isCN ? '注册' : 'Register',
    logout: isCN ? '退出' : 'Logout',
    welcomeBack: isCN ? '欢迎回来' : 'Welcome Back',
  };
  return t;
};

const Checkout: React.FC<CheckoutProps> = ({ siteConfig }) => {
  const availableProviders = siteConfig?.paymentProviders;
  const isCN = siteConfig?.market === 'cn';
  const t = useTranslations(isCN);
  const defaultCurrency = isCN ? 'CNY' : 'USD';
  const paymentMethods = availableProviders
    ? ALL_PAYMENT_METHODS.filter(m => (availableProviders as readonly string[]).includes(m.id))
    : ALL_PAYMENT_METHODS;
  const { cart, totalAmount, clearCart } = useCart();
  const { isAuthenticated, user, login, logout } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State Machine
  const [status, setStatus] = useState<'idle' | 'initializing' | 'processing' | 'success' | 'error' | 'ready_for_payment'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>(
    paymentMethods[0]?.id || 'Stripe'
  );
  
  // Auth / Contact State
  const [contactEmail, setContactEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Payment State
  const airwallexElementRef = useRef<any>(null);
  const airwallexInitialized = useRef(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [wechatQrUrl, setWechatQrUrl] = useState<string | null>(null);

  const [clinicInfo, setClinicInfo] = useState({ 
    clinicName: '', 
    doctorName: '', 
    phone: '',
    taxId: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });

  const availableStates = LOCATIONS.find(l => l.name === clinicInfo.country)?.states || [];

  // Handle URL Params (Success/Cancel from Stripe)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
        setStatus('success');
        clearCart();
    }
    if (searchParams.get('canceled') === 'true') {
        setStatus('error');
        setStatusMessage('Payment was canceled. You have not been charged.');
    }
  }, [searchParams, clearCart]);

  // Sync User Data
  useEffect(() => {
    if (user) {
        setContactEmail(user.email);
        setClinicInfo(prev => ({
            ...prev,
            doctorName: user.name || prev.doctorName,
        }));
        setShowLogin(false);
    }
  }, [user]);

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
        const { user } = await api.login(authForm.email, authForm.password);
        login(user);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setAuthError(message);
    } finally {
        setAuthLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!contactEmail) {
        setStatus('error');
        setStatusMessage('Please provide a contact email.');
        return;
    }

    try {
      setStatus('initializing');
      
      const fullAddress = `${clinicInfo.street}, ${clinicInfo.city}, ${clinicInfo.state} ${clinicInfo.zip}, ${clinicInfo.country}`;
      const orderPayload = { 
          ...clinicInfo, 
          address: fullAddress,
          customerEmail: contactEmail 
      };

      // --- B2B Flow: Quote Generation ---
      if (paymentMethod === 'Quote') {
          await api.createQuote(cart, totalAmount, orderPayload);
          setStatus('success');
          clearCart();
          return;
      }

      // --- Standard Flow: Order Creation ---
      const { orderId } = await api.createOrder(cart, totalAmount, orderPayload);
      setCurrentOrderId(orderId);

      // Get auth token for payment API calls
      const { data: { session: authSession } } = await getSessionSafe();
      const authHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        authHeaders['Authorization'] = `Bearer ${authSession.access_token}`;
      }
      
      if (paymentMethod === 'Stripe') {
          setStatusMessage('Initializing secure payment...');
          
          // Create PaymentIntent for embedded form
          const response = await fetch('/api/payment/stripe/create-intent', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ orderId, amount: totalAmount, currency: cart[0]?.currency || defaultCurrency }),
          });
          
          const result = await response.json();
          
          if (result.error) {
            throw new Error(result.error);
          } else if (result.clientSecret) {
            setStripeClientSecret(result.clientSecret);
            setStatus('ready_for_payment');
          } else {
            throw new Error('Failed to initialize payment');
          }

      } else if (paymentMethod === 'Airwallex') {
          setStatusMessage('Securing connection with Airwallex...');
          const awxIntent = await api.initiatePayment(orderId, totalAmount, cart[0]?.currency || defaultCurrency);
          
          if (awxIntent.mock) {
            throw new Error('Payment gateway is currently unavailable. Please try again later or choose a different payment method.');
          } else {
            setClientSecret(awxIntent.client_secret);
            setIntentId(awxIntent.intent_id);
            setStatus('ready_for_payment');
          }
      } else if (paymentMethod === 'Alipay') {
          setStatusMessage('Connecting to Alipay...');
          const response = await fetch('/api/payment/alipay/create-order', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              orderId,
              amount: totalAmount,
              subject: `VetSphere Order ${orderId}`,
              description: `${cart.length} item(s)`
            }),
          });
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          } else if (result.paymentUrl) {
            // Redirect to Alipay payment page
            window.location.href = result.paymentUrl;
          } else {
            throw new Error('Failed to initialize Alipay payment');
          }
      } else if (paymentMethod === 'Wechat') {
          setStatusMessage('Connecting to WeChat Pay...');
          const response = await fetch('/api/payment/wechat/create-order', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              orderId,
              amount: totalAmount,
              description: `VetSphere Order ${orderId}`,
              tradeType: 'native' // QR code payment
            }),
          });
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          } else if (result.code_url) {
            // Show WeChat QR code for payment
            setWechatQrUrl(result.code_url);
            setStatus('ready_for_payment');
          } else {
            throw new Error('Failed to initialize WeChat payment');
          }
      } else {
          throw new Error(`${paymentMethod} is not yet available. Please choose another payment method.`);
      }

    } catch (error: unknown) {
      console.error(error);
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Order failed';
      setStatusMessage('Order Error: ' + message);
    }
  };

  // Airwallex SDK Init
  useEffect(() => {
    if (status === 'ready_for_payment' && paymentMethod === 'Airwallex' && clientSecret && !airwallexInitialized.current) {
        const Airwallex = (window as any).Airwallex;
        if (!Airwallex) return;
        try {
            Airwallex.init({ env: 'demo', code: 'default' });
            const element = Airwallex.createElement('card');
            element.mount('airwallex-card-container');
            airwallexElementRef.current = element;
            airwallexInitialized.current = true;
        } catch (err) { console.error(err); }
    }
  }, [status, clientSecret, paymentMethod]);

  const handleAirwallexConfirm = async () => {
      if (!airwallexElementRef.current || !intentId || !clientSecret) return;
      const Airwallex = (window as any).Airwallex;
      setStatus('processing');
      try {
          await Airwallex.confirmPaymentIntent({
              element: airwallexElementRef.current,
              id: intentId,
              client_secret: clientSecret,
              payment_method: { billing: { first_name: 'Doctor', last_name: 'Vet', email: contactEmail } }
          });
          const isPaid = await api.verifyPayment(intentId);
          if (isPaid) { setStatus('success'); clearCart(); }
      } catch (error: unknown) {
          setStatus('ready_for_payment');
          const message = error instanceof Error ? error.message : 'Payment failed';
          setStatusMessage('Payment failed: ' + message);
      }
  };

  const handleStripeSuccess = () => {
    setStatus('success');
    clearCart();
  };

  const handleStripeError = (message: string) => {
    setStatus('error');
    setStatusMessage(message);
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-16 bg-white rounded-[40px] shadow-2xl text-center animate-in zoom-in duration-500 pt-40">
        <div className="w-24 h-24 bg-emerald-50 text-vs rounded-full flex items-center justify-center text-5xl mx-auto mb-10">✓</div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">{paymentMethod === 'Quote' ? (isCN ? '报价单已生成' : 'Proforma Invoice Generated') : (isCN ? '支付成功' : 'Payment Successful')}</h2>
        <p className="text-slate-500 mb-12 font-medium leading-relaxed">
          {paymentMethod === 'Quote' 
            ? (isCN ? '您的官方形式发票（PI）已创建。您可以从仪表板下载用于医院采购或完成电汇。' : 'Your official Proforma Invoice (PI) has been created. You can download it for hospital procurement or complete the wire transfer from your Dashboard.')
            : (isCN ? `订单已通过 ${paymentMethod} 确认。发票已发送至 ${contactEmail}。` : `Order confirmed via ${paymentMethod}. An invoice has been sent to ${contactEmail}.`)
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard" className="flex-1 btn-vs py-5 rounded-2xl shadow-xl text-center">
                {paymentMethod === 'Quote' ? (isCN ? '查看我的发票' : 'View My Invoices') : (isCN ? '查看订单详情' : 'View Order Details')}
            </Link>
            <Link href="/shop" className="flex-1 px-8 py-5 border-2 border-slate-100 text-slate-900 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all flex items-center justify-center">{isCN ? '继续购物' : 'Continue Shopping'}</Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center py-40">
        <div className="text-8xl mb-8 grayscale opacity-20">🛍️</div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">{isCN ? '购物车是空的' : 'Your Cart is Empty'}</h2>
        <Link href="/shop" className="btn-vs px-12 py-5 rounded-2xl shadow-xl">{isCN ? '去购物' : 'Go to Shop'}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pt-32 grid lg:grid-cols-12 gap-12 relative">
      
      {/* Left Column: Order Summary (Sticky) */}
      <div className="lg:col-span-5 order-2 lg:order-1">
        <div className="sticky top-24 space-y-8">
            <div className="clinical-card p-8 bg-slate-50/50 backdrop-blur-sm border-slate-200">
                <h2 className="text-xs font-black mb-8 text-slate-400 uppercase tracking-[0.2em]">{isCN ? '订单摘要' : 'Order Summary'} ({cart.length})</h2>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map(item => (
                    <div key={item.id} className="flex gap-4 group">
                        <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-100 p-2 shadow-sm">
                            <img src={item.imageUrl} className="w-full h-full object-contain mix-blend-multiply" alt={item.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                            <p className="text-xs text-vs font-black uppercase tracking-widest mb-1">{item.type}</p>
                            <p className="text-sm text-slate-500">{isCN ? '数量' : 'Qty'}: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-900 text-sm">¥{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                    </div>
                    ))}
                </div>
                
                <div className="mt-8 pt-8 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>{isCN ? '小计' : 'Subtotal'}</span>
                        <span>¥{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>{isCN ? '运费' : 'Shipping'}</span>
                        <span>{isCN ? '免费' : 'Free'}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black text-slate-900 pt-4">
                        <span>{isCN ? '总计' : 'Total'}</span>
                        <span className="text-vs">¥{totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-start gap-4">
                <span className="text-2xl">🛡️</span>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">Secure Checkout</h4>
                    <p className="text-xs text-slate-500 mt-1">Transactions are encrypted. B2B Quotes are valid for 30 days.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Right Column: One-Page Form */}
      <div className="lg:col-span-7 order-1 lg:order-2">
        <form onSubmit={handlePlaceOrder} className="space-y-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">{isCN ? '结算' : 'Checkout'}</h1>

            {/* Section 1: Contact */}
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    {isCN ? '联系信息' : 'Contact Information'}
                </h3>
                
                {isAuthenticated ? (
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                        <div>
                            <p className="text-xs font-bold text-slate-500">{isCN ? '已登录' : 'Logged in as'}</p>
                            <p className="text-sm font-black text-slate-900">{user?.name} ({user?.email})</p>
                        </div>
                        <button type="button" onClick={logout} className="text-xs font-bold text-red-500 hover:underline">{isCN ? '切换账号' : 'Change Account'}</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                         {!showLogin ? (
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '邮箱地址' : 'Email Address'}</label>
                                    <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                                        placeholder={isCN ? 'doctor@clinic.com' : 'doctor@clinic.com'}
                                        value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                    <span>{isCN ? '已有账号？' : 'Already have an account?'}</span>
                                    <button type="button" onClick={() => setShowLogin(true)} className="text-vs hover:underline">{isCN ? '登录' : 'Sign In'}</button>
                                </div>
                             </div>
                         ) : (
                             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-slate-900 text-sm">{isCN ? '登录' : 'Sign In'}</h4>
                                    <button type="button" onClick={() => setShowLogin(false)} className="text-xs font-bold text-slate-400">{isCN ? '取消' : 'Cancel'}</button>
                                </div>
                                <input type="email" placeholder={isCN ? '邮箱' : 'Email'} className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold" 
                                    value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                                <input type="password" placeholder={isCN ? '密码' : 'Password'} className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold"
                                    value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                {authError && <p className="text-xs text-red-500 font-bold">{authError}</p>}
                                <button type="button" onClick={handleInlineLogin} disabled={authLoading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
                                    {authLoading ? (isCN ? '登录中...' : 'Signing In...') : (isCN ? '登录并继续' : 'Sign In & Continue')}
                                </button>
                             </div>
                         )}
                    </div>
                )}
            </section>

            {/* Section 2: Shipping */}
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    {isCN ? '收货地址' : 'Shipping Address'}
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '收件人姓名' : 'Recipient Name'}</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.doctorName} onChange={e => setClinicInfo({...clinicInfo, doctorName: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '国家/地区' : 'Country / Region'}</label>
                        <select required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs appearance-none"
                            value={clinicInfo.country} onChange={e => { setClinicInfo({...clinicInfo, country: e.target.value, state: ''}); }}>
                            <option value="" disabled>{isCN ? '选择国家' : 'Select Country'}</option>
                            {LOCATIONS.map(loc => <option key={loc.code} value={loc.name}>{loc.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '省/州' : 'State / Province'}</label>
                        <select required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs appearance-none disabled:opacity-50"
                            value={clinicInfo.state} onChange={e => setClinicInfo({...clinicInfo, state: e.target.value})} disabled={!clinicInfo.country}>
                            <option value="" disabled>{isCN ? '选择省份' : 'Select State'}</option>
                            {availableStates.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '街道地址' : 'Street Address'}</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        placeholder={isCN ? '某某路123号' : '123 Medical Blvd'} value={clinicInfo.street} onChange={e => setClinicInfo({...clinicInfo, street: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '城市' : 'City'}</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.city} onChange={e => setClinicInfo({...clinicInfo, city: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '邮政编码' : 'Postal Code'}</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.zip} onChange={e => setClinicInfo({...clinicInfo, zip: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{isCN ? '电话号码' : 'Phone Number'}</label>
                        <input type="tel" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.phone} onChange={e => setClinicInfo({...clinicInfo, phone: e.target.value})} />
                    </div>
                </div>
            </section>

            {/* Section 3: Payment */}
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                    {isCN ? '支付方式' : 'Payment Method'}
                </h3>
                
                {status === 'error' && <div className="p-4 mb-6 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{statusMessage}</div>}

                {/* Loading Overlay */}
                {(status === 'initializing' || status === 'processing') && (
                    <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-vs border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-bold text-slate-900">{statusMessage}</p>
                    </div>
                )}

                {/* Stripe Embedded Payment Form */}
                {(status === 'ready_for_payment' && paymentMethod === 'Stripe' && stripeClientSecret) ? (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900 text-sm">{isCN ? '完成支付' : 'Complete Payment'}</h4>
                            <button type="button" onClick={() => { setStatus('idle'); setStripeClientSecret(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-900">{isCN ? '更换方式' : 'Change Method'}</button>
                        </div>
                        <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#635BFF' } } }}>
                            <StripePaymentForm 
                                totalAmount={totalAmount} 
                                onSuccess={handleStripeSuccess}
                                onError={handleStripeError}
                                contactEmail={contactEmail}
                            />
                        </Elements>
                    </div>
                ) : (status === 'ready_for_payment' && paymentMethod === 'Airwallex') ? (
                    /* Airwallex Embedded Form View */
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900 text-sm">{isCN ? '银行卡信息' : 'Card Details'}</h4>
                            <button type="button" onClick={() => setStatus('idle')} className="text-xs font-bold text-slate-400 hover:text-slate-900">{isCN ? '更换方式' : 'Change Method'}</button>
                        </div>
                        <div id="airwallex-card-container" className="mb-6"></div>
                        <button type="button" onClick={handleAirwallexConfirm} className="w-full bg-vs text-white py-4 rounded-xl font-black text-sm shadow-xl hover:shadow-2xl transition-all">
                            {isCN ? '支付' : 'Pay'} ¥{totalAmount.toLocaleString()}
                        </button>
                    </div>
                ) : (status === 'ready_for_payment' && paymentMethod === 'Wechat' && wechatQrUrl) ? (
                    /* WeChat QR Code View */
                    <div className="text-center">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900 text-sm">{isCN ? '微信支付' : 'WeChat Pay'}</h4>
                            <button type="button" onClick={() => { setStatus('idle'); setWechatQrUrl(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-900">{isCN ? '更换方式' : 'Change Method'}</button>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-4">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wechatQrUrl)}`} 
                                alt={isCN ? '微信支付二维码' : 'WeChat Pay QR Code'}
                                className="mx-auto mb-4"
                                width={200}
                                height={200}
                            />
                            <p className="text-sm text-slate-600 font-medium">{isCN ? '使用微信扫描二维码支付' : 'Scan with WeChat to pay'}</p>
                            <p className="text-2xl font-black text-slate-900 mt-2">¥{totalAmount.toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-slate-500">{isCN ? '订单号' : 'Order ID'}: {currentOrderId}</p>
                        <button type="button" onClick={() => window.location.reload()} className="mt-4 text-vs text-sm font-bold hover:underline">
                            {isCN ? '我已完成支付' : 'I have completed payment'}
                        </button>
                    </div>
                ) : (
                    /* Payment Method Selection */
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {paymentMethods.map(method => (
                            <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id as any)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                                paymentMethod === method.id ? method.color : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                }`}
                            >
                                <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl shadow-sm ${method.id === 'Quote' && paymentMethod === 'Quote' ? 'bg-slate-800 text-white' : 'bg-white'}`}>{method.icon}</div>
                                <div>
                                    <p className="text-sm font-black">{isCN ? {
                                        Stripe: '信用卡 / Link',
                                        Airwallex: '信用卡',
                                        Alipay: '支付宝',
                                        Wechat: '微信支付',
                                        Quote: '申请报价单'
                                    }[method.id] : method.label}</p>
                                    <p className={`text-xs font-bold ${paymentMethod === method.id ? 'opacity-80' : 'opacity-70'}`}>{isCN ? {
                                        Stripe: '安全嵌入式支付',
                                        Airwallex: 'Airwallex 安全表单',
                                        Alipay: '人民币支付',
                                        Wechat: '人民币支付',
                                        Quote: 'B2B 形式发票'
                                    }[method.id] : method.sub}</p>
                                </div>
                                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === method.id ? 'border-current' : 'border-slate-200'}`}>
                                    {paymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                                </div>
                            </button>
                            ))}
                        </div>

                        {/* Helper text for Quote selection */}
                        {paymentMethod === 'Quote' && (
                            <div className="p-4 mb-6 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <span className="font-black text-vs">{isCN ? '注意' : 'Note'}:</span> {isCN ? '选择此方式将生成正式的' : 'Choosing this method will generate a formal'} <span className="font-bold">{isCN ? '形式发票' : 'Proforma Invoice'}</span>. {isCN ? '您可以使用此文档进行医院内部审批或电汇。报价有效期为30天。' : 'You can use this document for internal hospital approval or wire transfers. The quote remains valid for 30 days.'}
                                </p>
                            </div>
                        )}
                        
                        <button type="submit" disabled={status !== 'idle' && status !== 'error'} 
                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                            ${paymentMethod === 'Quote' ? 'bg-vs text-white ring-4 ring-vs/10' : 'bg-slate-900 text-white'}`}>
                            {paymentMethod === 'Quote' ? (isCN ? '生成形式发票' : 'Generate Proforma Invoice') : 
                             paymentMethod === 'Stripe' ? (isCN ? '继续支付' : 'Continue to Payment') : (isCN ? '下单' : `Place Order with ${paymentMethod}`)}
                        </button>
                        <p className="text-center text-[10px] font-bold text-slate-400 mt-4">
                            {isCN ? '下单即表示您同意 VetSphere 的' : "By placing this order, you agree to VetSphere's"} <span className="underline">{isCN ? '服务条款' : 'Terms of Service'}</span>.
                        </p>
                    </div>
                )}
            </section>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
