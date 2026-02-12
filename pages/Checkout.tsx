
import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

// Stripe Imports
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with your Public Key
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); 

// --- Sub-component: Stripe Payment Form ---
const StripePaymentForm: React.FC<{ 
    clientSecret: string, 
    totalAmount: number,
    onSuccess: () => void,
    onError: (msg: string) => void
}> = ({ clientSecret, totalAmount, onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // In a real app, this should be the return URL
                return_url: window.location.origin + '/dashboard', 
            },
            redirect: 'if_required' 
        });

        if (error) {
            onError(error.message || 'Payment failed');
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess();
        } else {
            onError('Unexpected payment status');
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                 <PaymentElement />
            </div>
            <button 
                type="submit" 
                disabled={!stripe || isProcessing}
                className="w-full bg-[#635BFF] text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-[#534ae8] transition-all disabled:opacity-70"
            >
                {isProcessing ? 'Processing Stripe...' : `Pay CNY ${totalAmount.toLocaleString()} via Stripe`}
            </button>
        </form>
    );
};

const Checkout: React.FC = () => {
  const { cart, totalAmount, clearCart } = useCart();
  const { isAuthenticated, user, login } = useAuth();
  
  // State Machine
  const [status, setStatus] = useState<'idle' | 'initializing' | 'ready_for_payment' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Alipay' | 'Wechat' | 'Airwallex' | 'Stripe'>('Stripe');
  
  // Auth State (Inline)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  
  // Gateway State
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  
  // Airwallex Refs
  const airwallexElementRef = useRef<any>(null);
  const airwallexInitialized = useRef(false);

  const [clinicInfo, setClinicInfo] = useState({ 
    clinicName: '', 
    doctorName: '', 
    address: '', 
    phone: '',
    taxId: '' 
  });

  // Prefill clinic info if user is logged in
  useEffect(() => {
    if (user) {
        setClinicInfo(prev => ({
            ...prev,
            doctorName: user.name || '',
            // In a real app, fetch profile details here
        }));
    }
  }, [user]);

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
        // Use existing API service
        const { user } = await api.login(authForm.email, authForm.password);
        login(user); // Update Global Context
        // No redirect, just state change in this component re-renders the right column
    } catch (err: any) {
        setAuthError(err.message || 'Authentication failed');
    } finally {
        setAuthLoading(false);
    }
  };

  // Step 1: Create Order & Payment Intent
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      setStatus('initializing');
      
      const { orderId } = await api.createOrder(cart, totalAmount, clinicInfo);
      
      if (paymentMethod === 'Stripe') {
          setStatusMessage('Connecting to Stripe...');
          const stripeIntent = await api.initiateStripePayment(orderId, totalAmount, 'CNY');
          
          if (stripeIntent.mock) {
              setStatusMessage('Backend offline (Demo Mode). Simulating successful payment...');
              setTimeout(() => {
                  setStatus('success');
                  clearCart();
              }, 1500);
          } else {
              setClientSecret(stripeIntent.clientSecret);
              setIntentId(stripeIntent.id);
              setStatus('ready_for_payment');
              setStatusMessage('');
          }

      } else if (paymentMethod === 'Airwallex') {
          setStatusMessage('Securing connection with Airwallex...');
          const awxIntent = await api.initiatePayment(orderId, totalAmount, 'CNY');
          
          if (awxIntent.mock) {
            setStatusMessage('Backend offline (Demo Mode). Simulating...');
            setTimeout(() => { setStatus('success'); clearCart(); }, 1500);
          } else {
            setClientSecret(awxIntent.client_secret);
            setIntentId(awxIntent.intent_id);
            setStatus('ready_for_payment');
          }
      } else {
          // Mock flows for Alipay/Wechat
          setStatus('success');
          clearCart();
      }

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setStatusMessage('Gateway Error: ' + error.message);
    }
  };

  // Initialize Airwallex SDK
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
        } catch (err) {
            console.error(err);
        }
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
              payment_method: { billing: { first_name: 'Doctor', last_name: 'Vet', email: 'doc@vet.com' } }
          });
          const isPaid = await api.verifyPayment(intentId);
          if (isPaid) { setStatus('success'); clearCart(); }
      } catch (error: any) {
          setStatus('ready_for_payment');
          setStatusMessage('Payment failed: ' + error.message);
      }
  };

  const handleStripeSuccess = async () => {
      setStatus('success');
      clearCart();
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-16 bg-white rounded-[40px] shadow-2xl text-center animate-in zoom-in duration-500 pt-40">
        <div className="w-24 h-24 bg-emerald-50 text-vs rounded-full flex items-center justify-center text-5xl mx-auto mb-10">✓</div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Payment Successful</h2>
        <p className="text-slate-500 mb-12 font-medium leading-relaxed">
          Order confirmed via {paymentMethod}. An invoice has been sent to your email.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/dashboard" className="flex-1 btn-vs py-5 rounded-2xl shadow-xl">View Order</Link>
            <Link to="/shop" className="flex-1 px-8 py-5 border-2 border-slate-100 text-slate-900 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all flex items-center justify-center">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center py-40">
        <div className="text-8xl mb-8 grayscale opacity-20">🛍️</div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">Your Cart is Empty</h2>
        <Link to="/shop" className="btn-vs px-12 py-5 rounded-2xl shadow-xl">Go to Shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pt-32 grid lg:grid-cols-2 gap-16">
      {/* Left Column: Order Summary (Always Visible) */}
      <div className="space-y-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Checkout</h1>
        <div className="clinical-card p-10 bg-slate-50/30">
          <h2 className="text-[10px] font-black mb-8 text-slate-400 uppercase tracking-[0.2em]">Items ({cart.length})</h2>
          <div className="space-y-8">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center group">
                <div className="flex gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden shrink-0 border border-slate-100 p-3 shadow-sm">
                    <img src={item.imageUrl} className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-sm leading-tight">{item.name}</h3>
                    <p className="text-[9px] text-vs font-black uppercase tracking-widest">{item.type}</p>
                    <div className="flex items-center gap-3 mt-4">
                        <span className="text-xs font-bold text-slate-500">Qty: {item.quantity}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-base">¥{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-10 border-t border-slate-200 space-y-4">
             <div className="flex justify-between text-3xl font-black text-slate-900 pt-6">
              <span>Total</span>
              <span className="text-vs">¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* Trust Badges */}
        <div className="flex gap-6 opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                <span className="text-xs font-bold text-slate-500">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="text-xs font-bold text-slate-500">Purchase Protection</span>
            </div>
        </div>
      </div>

      {/* Right Column: Dynamic Content (Auth OR Payment) */}
      <div className="space-y-6">
        
        {!isAuthenticated ? (
            // State A: Authentication Form (One Page Flow)
            <div className="clinical-card p-10 shadow-2xl animate-in slide-in-from-right">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-slate-900">Sign In to Pay</h2>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setAuthMode('login')} 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-vs' : 'text-slate-400'}`}
                        >Login</button>
                        <button 
                             onClick={() => setAuthMode('register')} 
                             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-vs' : 'text-slate-400'}`}
                        >Register</button>
                    </div>
                </div>

                <form onSubmit={handleInlineAuth} className="space-y-4">
                    {authError && <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl">{authError}</div>}
                    
                    {authMode === 'register' && (
                         <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Full Name</label>
                            <input 
                                type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                                value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} 
                                placeholder="Dr. John Doe"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Email Address</label>
                        <input 
                            type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                            value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} 
                            placeholder="doctor@vet.com"
                        />
                    </div>
                    <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Password</label>
                        <input 
                            type="password" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                            value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} 
                            placeholder="••••••••"
                        />
                    </div>
                    
                    <button 
                        type="submit" disabled={authLoading}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl mt-6 hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                    >
                        {authLoading ? 'Verifying...' : (authMode === 'login' ? 'Login & Continue' : 'Create Account & Continue')}
                        <span>→</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4">
                        Demo Account: <span className="font-bold text-slate-600">doctor@vet.com / doc123</span>
                    </p>
                </form>
            </div>
        ) : (
            // State B: Payment Form (User Logged In)
            <div className="clinical-card p-10 relative overflow-hidden shadow-2xl animate-in fade-in">
            
            {(status === 'initializing') && (
                <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in text-center p-8">
                <div className="w-16 h-16 border-4 border-vs border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Connecting Gateway...</h3>
                <p className="text-sm font-bold text-slate-500 max-w-xs">{statusMessage}</p>
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Payment</h2>
                 <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span className="text-[10px] font-black text-emerald-700 uppercase">{user?.name}</span>
                 </div>
            </div>
            
            {/* If ready for payment (Stripe/Airwallex Elements) */}
            {(status === 'ready_for_payment' || status === 'processing') && clientSecret ? (
                <div>
                    <button onClick={() => setStatus('idle')} disabled={status === 'processing'} className="mb-6 text-xs font-bold text-slate-400 hover:text-slate-900 disabled:opacity-50">← Back to details</button>
                    
                    {paymentMethod === 'Stripe' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">💳</span>
                                <h3 className="font-black text-slate-900">Pay with Stripe</h3>
                            </div>
                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                                <StripePaymentForm 
                                    clientSecret={clientSecret} 
                                    totalAmount={totalAmount} 
                                    onSuccess={handleStripeSuccess}
                                    onError={(msg) => { setStatusMessage(msg); setStatus('error'); }}
                                />
                            </Elements>
                        </div>
                    )}

                    {paymentMethod === 'Airwallex' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Airwallex Secure Card</label>
                            </div>
                            <div id="airwallex-card-container"></div>
                            <button 
                                onClick={handleAirwallexConfirm}
                                disabled={status === 'processing'}
                                className="w-full bg-vs text-white py-4 rounded-xl font-black text-sm shadow-lg mt-4 disabled:opacity-70"
                            >
                                {status === 'processing' ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* Initial Form */
                <form onSubmit={handleProceedToPayment} className="space-y-6">
                    {status === 'error' && (
                        <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                            {statusMessage}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Name</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.doctorName} onChange={e => setClinicInfo({...clinicInfo, doctorName: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phone</label>
                        <input type="tel" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.phone} onChange={e => setClinicInfo({...clinicInfo, phone: e.target.value})} />
                    </div>
                    </div>

                    <div className="pt-8">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-6 tracking-widest">Select Payment Method</label>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                        { id: 'Stripe', label: 'Credit Card (Stripe)', icon: '💳', color: 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]' },
                        { id: 'Airwallex', label: 'Credit Card (Airwallex)', icon: '🌏', color: 'border-vs bg-vs/5 text-vs' },
                        { id: 'Alipay', label: 'Alipay', icon: '🔵', color: 'border-blue-500 bg-blue-500/5 text-blue-500' },
                        { id: 'Wechat', label: 'WeChat Pay', icon: '🟢', color: 'border-emerald-500 bg-emerald-500/5 text-emerald-500' },
                        ].map(method => (
                        <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                            paymentMethod === method.id ? method.color : 'border-slate-100 hover:border-slate-200 text-slate-500'
                            }`}
                        >
                            <span className="text-2xl">{method.icon}</span>
                            <span className="text-[10px] font-black">{method.label}</span>
                        </button>
                        ))}
                    </div>
                    </div>

                    <button 
                    type="submit"
                    className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-lg shadow-xl mt-10 hover:bg-slate-800 transition-all"
                    >
                    Continue to {paymentMethod}
                    </button>
                </form>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
