
import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { LOCATIONS } from '../constants/locations';

const Checkout: React.FC = () => {
  const { cart, totalAmount, clearCart } = useCart();
  const { isAuthenticated, user, login, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State Machine
  const [status, setStatus] = useState<'idle' | 'initializing' | 'processing' | 'success' | 'error' | 'ready_for_payment'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Alipay' | 'Wechat' | 'Airwallex' | 'Stripe' | 'Quote'>('Stripe');
  
  // Auth / Contact State
  const [contactEmail, setContactEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Airwallex Refs
  const airwallexElementRef = useRef<any>(null);
  const airwallexInitialized = useRef(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);

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
    } catch (err: any) {
        setAuthError(err.message || 'Login failed');
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
      
      if (paymentMethod === 'Stripe') {
          setStatusMessage('Redirecting to Stripe Secure Checkout...');
          const result = await api.createStripeCheckoutSession(orderId, cart);
          
          if (result.mock) {
              setStatusMessage('Backend offline (Demo Mode). Simulating...');
              setTimeout(() => { setStatus('success'); clearCart(); }, 1500);
          } else if (result.url) {
              window.location.href = result.url;
          } else {
              throw new Error('Failed to retrieve checkout URL');
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
          // Alipay/Wechat Mock
          setStatus('success');
          clearCart();
      }

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setStatusMessage('Order Error: ' + error.message);
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
      } catch (error: any) {
          setStatus('ready_for_payment');
          setStatusMessage('Payment failed: ' + error.message);
      }
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-16 bg-white rounded-[40px] shadow-2xl text-center animate-in zoom-in duration-500 pt-40">
        <div className="w-24 h-24 bg-emerald-50 text-vs rounded-full flex items-center justify-center text-5xl mx-auto mb-10">✓</div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">{paymentMethod === 'Quote' ? 'Proforma Invoice Generated' : 'Payment Successful'}</h2>
        <p className="text-slate-500 mb-12 font-medium leading-relaxed">
          {paymentMethod === 'Quote' 
            ? 'Your official Proforma Invoice (PI) has been created. You can download it for hospital procurement or complete the wire transfer from your Dashboard.'
            : `Order confirmed via ${paymentMethod}. An invoice has been sent to ${contactEmail}.`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/dashboard" className="flex-1 btn-vs py-5 rounded-2xl shadow-xl text-center">
                {paymentMethod === 'Quote' ? 'View My Invoices' : 'View Order Details'}
            </Link>
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
    <div className="max-w-7xl mx-auto px-4 py-12 pt-32 grid lg:grid-cols-12 gap-12 relative">
      
      {/* Left Column: Order Summary (Sticky) */}
      <div className="lg:col-span-5 order-2 lg:order-1">
        <div className="sticky top-24 space-y-8">
            <div className="clinical-card p-8 bg-slate-50/50 backdrop-blur-sm border-slate-200">
                <h2 className="text-xs font-black mb-8 text-slate-400 uppercase tracking-[0.2em]">Order Summary ({cart.length})</h2>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map(item => (
                    <div key={item.id} className="flex gap-4 group">
                        <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-100 p-2 shadow-sm">
                            <img src={item.imageUrl} className="w-full h-full object-contain mix-blend-multiply" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                            <p className="text-xs text-vs font-black uppercase tracking-widest mb-1">{item.type}</p>
                            <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-900 text-sm">¥{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                    </div>
                    ))}
                </div>
                
                <div className="mt-8 pt-8 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>Subtotal</span>
                        <span>¥{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>Shipping</span>
                        <span>Free</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black text-slate-900 pt-4">
                        <span>Total</span>
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Checkout</h1>

            {/* Section 1: Contact */}
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    Contact Information
                </h3>
                
                {isAuthenticated ? (
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                        <div>
                            <p className="text-xs font-bold text-slate-500">Logged in as</p>
                            <p className="text-sm font-black text-slate-900">{user?.name} ({user?.email})</p>
                        </div>
                        <button type="button" onClick={logout} className="text-xs font-bold text-red-500 hover:underline">Change Account</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                         {!showLogin ? (
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Email Address</label>
                                    <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                                        placeholder="doctor@clinic.com"
                                        value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                    <span>Already have an account?</span>
                                    <button type="button" onClick={() => setShowLogin(true)} className="text-vs hover:underline">Sign In</button>
                                </div>
                             </div>
                         ) : (
                             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-slate-900 text-sm">Sign In</h4>
                                    <button type="button" onClick={() => setShowLogin(false)} className="text-xs font-bold text-slate-400">Cancel</button>
                                </div>
                                <input type="email" placeholder="Email" className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold" 
                                    value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                                <input type="password" placeholder="Password" className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold"
                                    value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                {authError && <p className="text-xs text-red-500 font-bold">{authError}</p>}
                                <button type="button" onClick={handleInlineLogin} disabled={authLoading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
                                    {authLoading ? 'Signing In...' : 'Sign In & Continue'}
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
                    Shipping Address
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Recipient Name</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.doctorName} onChange={e => setClinicInfo({...clinicInfo, doctorName: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Country / Region</label>
                        <select required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs appearance-none"
                            value={clinicInfo.country} onChange={e => { setClinicInfo({...clinicInfo, country: e.target.value, state: ''}); }}>
                            <option value="" disabled>Select Country</option>
                            {LOCATIONS.map(loc => <option key={loc.code} value={loc.name}>{loc.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">State / Province</label>
                        <select required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs appearance-none disabled:opacity-50"
                            value={clinicInfo.state} onChange={e => setClinicInfo({...clinicInfo, state: e.target.value})} disabled={!clinicInfo.country}>
                            <option value="" disabled>Select State</option>
                            {availableStates.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Street Address</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        placeholder="123 Medical Blvd" value={clinicInfo.street} onChange={e => setClinicInfo({...clinicInfo, street: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">City</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.city} onChange={e => setClinicInfo({...clinicInfo, city: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Postal Code</label>
                        <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-vs"
                        value={clinicInfo.zip} onChange={e => setClinicInfo({...clinicInfo, zip: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Phone Number</label>
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
                    Payment Method
                </h3>
                
                {status === 'error' && <div className="p-4 mb-6 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{statusMessage}</div>}

                {/* Loading Overlay */}
                {(status === 'initializing' || status === 'processing') && (
                    <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-vs border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-bold text-slate-900">{statusMessage}</p>
                    </div>
                )}

                {/* Airwallex Embedded Form View */}
                {(status === 'ready_for_payment' && paymentMethod === 'Airwallex') ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900 text-sm">Card Details</h4>
                            <button type="button" onClick={() => setStatus('idle')} className="text-xs font-bold text-slate-400 hover:text-slate-900">Change Method</button>
                        </div>
                        <div id="airwallex-card-container" className="mb-6"></div>
                        <button type="button" onClick={handleAirwallexConfirm} className="w-full bg-vs text-white py-4 rounded-xl font-black text-sm shadow-xl hover:shadow-2xl transition-all">
                            Pay ¥{totalAmount.toLocaleString()}
                        </button>
                    </div>
                ) : (
                    /* Payment Method Selection */
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {[
                            { id: 'Stripe', label: 'Credit Card / Link', sub: 'via Stripe Checkout', icon: '💳', color: 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]' },
                            { id: 'Airwallex', label: 'Credit Card', sub: 'Embedded Secure Form', icon: '🌏', color: 'border-vs bg-vs/5 text-vs' },
                            { id: 'Alipay', label: 'Alipay', sub: 'CNY Payments', icon: '🔵', color: 'border-blue-500 bg-blue-500/5 text-blue-500' },
                            { id: 'Quote', label: 'Request Quote', sub: 'B2B Proforma Invoice', icon: '📄', color: 'border-slate-800 bg-slate-900 text-white shadow-xl shadow-slate-200' },
                            ].map(method => (
                            <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id as any)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                                paymentMethod === method.id ? method.color : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                }`}
                            >
                                <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl shadow-sm ${method.id === 'Quote' && paymentMethod === 'Quote' ? 'bg-slate-800 text-white' : 'bg-white'}`}>{method.icon}</div>
                                <div>
                                    <p className="text-sm font-black">{method.label}</p>
                                    <p className={`text-xs font-bold ${paymentMethod === method.id ? 'opacity-80' : 'opacity-70'}`}>{method.sub}</p>
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
                                    <span className="font-black text-vs">Note:</span> Choosing this method will generate a formal <span className="font-bold">Proforma Invoice</span>. You can use this document for internal hospital approval or wire transfers. The quote remains valid for 30 days.
                                </p>
                            </div>
                        )}
                        
                        <button type="submit" disabled={status !== 'idle' && status !== 'error'} 
                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                            ${paymentMethod === 'Quote' ? 'bg-vs text-white ring-4 ring-vs/10' : 'bg-slate-900 text-white'}`}>
                            {paymentMethod === 'Quote' ? 'Generate Proforma Invoice' : 
                             paymentMethod === 'Stripe' ? 'Proceed to Secure Checkout' : `Place Order with ${paymentMethod}`}
                        </button>
                        <p className="text-center text-[10px] font-bold text-slate-400 mt-4">
                            By placing this order, you agree to VetSphere's <span className="underline">Terms of Service</span>.
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
