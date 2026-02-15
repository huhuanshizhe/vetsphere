
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Specialty, ProductGroup, Product } from '../types';

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | 'All'>('All');
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [showCartHint, setShowCartHint] = useState(false);

  useEffect(() => {
    api.getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
        navigate('/auth');
        return;
    }

    // Perform Cart Action
    addToCart({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      quantity: 1, 
      type: 'product', 
      currency: 'CNY', 
      imageUrl: product.imageUrl 
    });

    // Visual Feedback
    setAddedProductId(product.id);
    setShowCartHint(true);
    
    setTimeout(() => {
      setAddedProductId(null);
    }, 2000);

    setTimeout(() => {
      setShowCartHint(false);
    }, 5000);
  };

  const handleBuyNow = (product: Product) => {
    if (!isAuthenticated) {
        navigate('/auth');
        return;
    }
    addToCart({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      quantity: 1, 
      type: 'product', 
      currency: 'CNY', 
      imageUrl: product.imageUrl 
    });
    setSelectedProduct(null);
    navigate('/checkout');
  };

  const handleShareProduct = async (product: Product) => {
    const shareUrl = `${window.location.origin}/#/shop?id=${product.id}`;
    const shareTitle = `[VetSphere Equipment] ${product.name} by ${product.brand}`;
    
    if (navigator.share) {
        try {
            await navigator.share({ title: shareTitle, url: shareUrl });
            if (user) {
                await api.awardPoints(user.id, 50, `Shared product: ${product.name}`);
                addNotification({ id: `sh-p-${Date.now()}`, type: 'system', title: t.common.pointsEarned, message: '+50 pts for sharing equipment.', read: true, timestamp: new Date() });
            }
        } catch (e) { console.log('Share canceled'); }
    } else {
        navigator.clipboard.writeText(shareUrl);
        addNotification({ id: `sh-p-${Date.now()}`, type: 'system', title: t.common.copySuccess, message: 'Academic points awarded!', read: true, timestamp: new Date() });
        if (user) await api.awardPoints(user.id, 50, `Copied product link: ${product.name}`);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSpec = selectedSpecialty === 'All' || p.specialty === selectedSpecialty;
    const matchGroup = selectedGroup === 'All' || p.group === selectedGroup;
    return matchSpec && matchGroup;
  });

  return (
    <div className="bg-[#FBFCFB] min-h-screen pt-24 md:pt-32 relative">
      <div className="vs-container pb-20">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {t.shop.breadcrumb}
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
              {t.shop.subtitle}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm overflow-x-auto max-w-full">
            <button 
               onClick={() => setSelectedGroup('All')}
               className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedGroup === 'All' ? 'bg-vs text-white' : 'text-slate-400 hover:text-slate-900'}`}
            >
              {t.shop.allItems}
            </button>
            {['PowerTools', 'Implants', 'Equipment'].map(g => (
              <button 
                key={g}
                onClick={() => setSelectedGroup(g as any)}
                className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedGroup === g ? 'bg-vs text-white shadow-lg shadow-vs/20' : 'text-slate-400 hover:text-slate-900'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 space-y-10 shrink-0">
             <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">{t.shop.byDiscipline}</h4>
                <div className="flex flex-col gap-1">
                   {['All', ...Object.values(Specialty)].map(s => (
                     <button 
                        key={s}
                        onClick={() => setSelectedSpecialty(s as any)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedSpecialty === s ? 'bg-vs/5 text-vs' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        {s === 'All' ? t.courses.allSpecialties : s}
                        {selectedSpecialty === s && <span className="w-1.5 h-1.5 bg-vs rounded-full"></span>}
                     </button>
                   ))}
                </div>
             </div>

             <div className="p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20">🤖</div>
                <h5 className="text-xs font-black uppercase tracking-widest mb-2 text-vs">{t.shop.aiSourcing}</h5>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{t.shop.aiDesc}</p>
                <button 
                  onClick={() => navigate('/ai')}
                  className="mt-4 text-[10px] font-black uppercase underline hover:text-vs"
                >
                  {t.shop.startChat}
                </button>
             </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-40">
                <div className="w-10 h-10 border-2 border-vs border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => setSelectedProduct(product)}
                    className="vs-card-refined group p-0 overflow-hidden flex flex-col h-full bg-white cursor-pointer"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-square bg-slate-50 flex items-center justify-center p-10 group-hover:bg-white transition-colors duration-500">
                      <img src={product.imageUrl} className="max-h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
                      
                      <div className="absolute top-4 left-4">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          product.stockStatus === 'In Stock' ? 'bg-white text-vs' : 'bg-red-50 text-red-500'
                        }`}>
                          {product.stockStatus}
                        </span>
                      </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="mb-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{product.brand}</p>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-vs transition-colors line-clamp-1">{product.name}</h3>
                      </div>

                      {/* Mini Specs */}
                      <div className="flex flex-wrap gap-2 mb-8">
                         {Object.entries(product.specs).slice(0, 2).map(([key, val]) => (
                            <div key={key} className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{key}</p>
                               <p className="text-[10px] font-black text-slate-800">{val}</p>
                            </div>
                         ))}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-50">
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.shop.priceExcl}</p>
                            {isAuthenticated ? (
                                <p className="text-xl font-black text-slate-900">¥{product.price.toLocaleString()}</p>
                            ) : (
                                <p className="text-sm font-black text-vs flex items-center gap-1">🔒 {t.auth.loginToView}</p>
                            )}
                         </div>
                         <button 
                            onClick={(e) => handleAddToCart(e, product)}
                            className={`btn-vs-premium !py-3 !px-6 !rounded-xl text-xs shadow-sm transition-all active:scale-95 ${
                              addedProductId === product.id ? '!bg-slate-900' : 'hover:!shadow-vs/20'
                            }`}
                         >
                            {isAuthenticated ? (addedProductId === product.id ? t.shop.added : t.shop.addToCart) : t.auth.signInLink}
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && filteredProducts.length === 0 && (
                <div className="py-40 text-center vs-card-refined bg-slate-50/50 border-dashed border-2">
                    <p className="text-slate-400 font-black uppercase tracking-widest">{t.shop.noItems}</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Instant Cart Feedback (Mini Toast) */}
      {showCartHint && (
        <div className="fixed bottom-10 right-10 z-[300] bg-slate-900 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-right-10 duration-500">
           <div className="flex flex-col">
              <p className="text-sm font-black uppercase tracking-widest">{t.shop.added}</p>
              <p className="text-xs text-slate-400">Ready to finalize your surgical gear?</p>
           </div>
           <button 
             onClick={() => navigate('/checkout')}
             className="bg-vs text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-vs-dark transition-all"
           >
             Checkout Now
           </button>
           <button onClick={() => setShowCartHint(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-300">
           <div 
             className="bg-white w-full max-w-xl h-full shadow-2xl p-10 flex flex-col animate-in slide-in-from-right duration-500"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="flex justify-between items-center mb-8">
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    ✕ {t.common.close}
                  </button>
                  <button 
                    onClick={() => handleShareProduct(selectedProduct)}
                    className="p-3 w-12 h-12 bg-slate-50 text-slate-500 rounded-2xl hover:bg-vs hover:text-white transition-all flex items-center justify-center shadow-sm"
                  >
                    📤
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                 <div className="aspect-square bg-slate-50 rounded-3xl p-12 mb-10 flex items-center justify-center">
                    <img src={selectedProduct.imageUrl} className="max-h-full object-contain mix-blend-multiply" />
                 </div>
                 
                 <div className="mb-10">
                    <p className="text-xs font-black text-vs uppercase tracking-[0.2em] mb-2">{selectedProduct.brand}</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{selectedProduct.name}</h2>
                    <p className="text-slate-500 mt-4 text-base leading-relaxed font-medium">{selectedProduct.longDescription}</p>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">{t.shop.specs}</h4>
                    <div className="grid grid-cols-2 gap-4">
                       {Object.entries(selectedProduct.specs).map(([k, v]) => (
                         <div key={k} className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{k}</p>
                            <p className="text-sm font-bold text-slate-800">{v}</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="pt-8 mt-auto border-t border-slate-100 flex items-center justify-between gap-8">
                 <div className="space-y-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.shop.grandTotal}</p>
                    {isAuthenticated ? (
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">¥{selectedProduct.price.toLocaleString()}</p>
                    ) : (
                        <button onClick={() => navigate('/auth')} className="text-xl font-black text-vs hover:underline">🔒 {t.auth.loginToView}</button>
                    )}
                 </div>
                 <button 
                    onClick={() => handleBuyNow(selectedProduct)}
                    className="flex-1 btn-vs-premium !py-5 !text-sm !rounded-2xl shadow-xl shadow-vs/20 hover:-translate-y-1 transition-all"
                 >
                    {isAuthenticated ? t.shop.buyNow : t.auth.loginToBuy}
                 </button>
              </div>
           </div>
           <div className="absolute inset-0 -z-10" onClick={() => setSelectedProduct(null)}></div>
        </div>
      )}
    </div>
  );
};

export default Shop;
