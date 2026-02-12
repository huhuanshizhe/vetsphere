
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const Checkout: React.FC = () => {
  const { cart, totalAmount, clearCart, removeFromCart, updateQuantity } = useCart();
  
  // State Machine: idle -> creating_order -> waiting_payment -> verifying -> success
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'Alipay' | 'Wechat' | 'Card'>('Alipay');
  const [clinicInfo, setClinicInfo] = useState({ 
    clinicName: '', 
    doctorName: '', 
    address: '', 
    phone: '',
    taxId: '' 
  });

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      setStatus('processing');
      setStatusMessage('Submitting order to VetSphere server...');
      
      // 1. Create Order API
      const { orderId } = await api.createOrder(cart, totalAmount, clinicInfo);
      
      setStatusMessage(`Order Created (${orderId}). Launching ${paymentMethod}...`);
      
      // 2. Mock Payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatusMessage('Payment complete. Verifying funds...');
      
      // 3. Verify Payment
      const isPaid = await api.verifyPayment(orderId);
      
      if (isPaid) {
        setStatus('success');
        clearCart();
      } else {
        setStatus('error');
        setStatusMessage('Payment verification failed. Please contact support.');
      }

    } catch (error) {
      console.error(error);
      setStatus('error');
      setStatusMessage('Network Error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-16 bg-white rounded-[40px] shadow-2xl text-center animate-in zoom-in duration-500 pt-40">
        <div className="w-24 h-24 bg-emerald-50 text-vs rounded-full flex items-center justify-center text-5xl mx-auto mb-10">✓</div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Payment Successful</h2>
        <p className="text-slate-500 mb-12 font-medium leading-relaxed">
          Dear {clinicInfo.doctorName || 'Doctor'}, your professional order has been confirmed.
          <br/>An electronic invoice has been sent to your registered email.
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
                    <p className="text-[9px] text-vs font-black uppercase tracking-widest">
                        {item.type === 'course' ? 'Advanced Workshop' : 'Surgical Gear'}
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 hover:bg-slate-50 text-slate-400 font-bold">-</button>
                            <span className="px-3 py-1 text-xs font-black text-slate-900 border-x border-slate-200">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 hover:bg-slate-50 text-slate-400 font-bold">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-[10px] text-slate-300 font-bold uppercase hover:text-red-500 transition-colors">Remove</button>
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
      </div>

      <form onSubmit={handlePay} className="space-y-6">
        <div className="clinical-card p-10 relative overflow-hidden shadow-2xl">
          {status === 'processing' && (
            <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in text-center p-8">
               <div className="w-16 h-16 border-4 border-vs border-t-transparent rounded-full animate-spin mb-6"></div>
               <h3 className="text-xl font-black text-slate-900 mb-2">Processing Secure Payment</h3>
               <p className="text-sm font-bold text-slate-500 max-w-xs">{statusMessage}</p>
            </div>
          )}
          
          <h2 className="text-2xl font-black text-slate-900 mb-10 tracking-tight">Shipping & Invoice</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Clinic Name</label>
                <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                  value={clinicInfo.clinicName} onChange={e => setClinicInfo({...clinicInfo, clinicName: e.target.value})} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tax ID</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                  value={clinicInfo.taxId} onChange={e => setClinicInfo({...clinicInfo, taxId: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Shipping Address</label>
              <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                value={clinicInfo.address} onChange={e => setClinicInfo({...clinicInfo, address: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Contact Person</label>
                <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                  value={clinicInfo.doctorName} onChange={e => setClinicInfo({...clinicInfo, doctorName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phone</label>
                <input type="tel" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm outline-none focus:border-vs"
                  value={clinicInfo.phone} onChange={e => setClinicInfo({...clinicInfo, phone: e.target.value})} />
              </div>
            </div>

            <div className="pt-8">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-6 tracking-widest">Payment Method</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'Alipay', label: 'Alipay', icon: '🔵' },
                  { id: 'Wechat', label: 'WeChat Pay', icon: '🟢' },
                  { id: 'Card', label: 'Bank Transfer', icon: '🏢' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                      paymentMethod === method.id ? 'border-vs bg-vs/5' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <span className="text-[10px] font-black text-slate-600">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={status === 'processing'}
              className="w-full bg-vs text-white py-6 rounded-2xl font-black text-lg shadow-2xl shadow-vs/30 mt-10 hover:bg-vs-dark active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'processing' ? 'Connecting Gateway...' : `Pay Now ¥${totalAmount.toLocaleString()}`}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold mt-4">
              By paying, you agree to the <a href="#" className="underline">VetSphere Purchase Agreement</a>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
