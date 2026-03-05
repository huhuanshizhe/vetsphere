'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { Product } from '../types';
import type { CategoryDimension } from '../site-config.types';

/** Fallback dimensions when shopCategories is not configured */
const defaultDimensions: CategoryDimension[] = [
  {
    key: 'group',
    field: 'group',
    displayName: { zh: '产品分组', en: 'Product Group' },
    displayAs: 'tabs',
    categories: [
      { key: 'PowerTools', labels: { zh: '电动工具', en: 'Power Tools', th: 'เครื่องมือไฟฟ้า', ja: '電動工具' } },
      { key: 'Implants', labels: { zh: '植入物', en: 'Implants', th: 'อุปกรณ์ปลูกถ่าย', ja: 'インプラント' } },
      { key: 'HandInstruments', labels: { zh: '手术器械', en: 'Hand Instruments', th: 'เครื่องมือผ่าตัด', ja: '手術器具' } },
      { key: 'Consumables', labels: { zh: '耗材', en: 'Consumables', th: 'วัสดุสิ้นเปลือง', ja: '消耗品' } },
      { key: 'Equipment', labels: { zh: '设备', en: 'Equipment', th: 'อุปกรณ์', ja: '機器' } },
    ],
  },
  {
    key: 'specialty',
    field: 'specialty',
    displayName: { zh: '专科方向', en: 'Specialty' },
    displayAs: 'sidebar',
    categories: [
      { key: 'Orthopedics', labels: { zh: '骨科', en: 'Orthopedics' } },
      { key: 'Neurosurgery', labels: { zh: '神经外科', en: 'Neurosurgery' } },
      { key: 'Soft Tissue', labels: { zh: '软组织', en: 'Soft Tissue' } },
      { key: 'Eye Surgery', labels: { zh: '眼科', en: 'Eye Surgery' } },
      { key: 'Exotics', labels: { zh: '异宠', en: 'Exotics' } },
      { key: 'Ultrasound', labels: { zh: '超声', en: 'Ultrasound' } },
    ],
  },
];

const ShopPageClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { addToCart } = useCart();
  const { t, locale, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const { isCN, market, siteConfig } = useSiteConfig();

  // Config-driven category dimensions
  const dimensions = useMemo(() =>
    siteConfig.shopCategories?.dimensions ?? defaultDimensions,
    [siteConfig.shopCategories]
  );
  const tabDimensions = useMemo(() => dimensions.filter(d => d.displayAs === 'tabs'), [dimensions]);
  const sidebarDimensions = useMemo(() => dimensions.filter(d => d.displayAs === 'sidebar'), [dimensions]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Generic filter state: { group: 'All', specialty: 'All', ... }
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [showCartHint, setShowCartHint] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');

  // Helper: get filter for a dimension (default 'All')
  const getFilter = (dimKey: string) => filters[dimKey] || 'All';
  const setFilter = (dimKey: string, value: string) => setFilters(prev => ({ ...prev, [dimKey]: value }));
  const getCategoryLabel = (cat: { key: string; labels: Record<string, string> }) =>
    cat.labels[language] || cat.labels['en'] || Object.values(cat.labels)[0] || cat.key;

  useEffect(() => {
    api.getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  // Read URL params for deep-linking (e.g. /shop?group=PowerTools&specialty=Orthopedics)
  useEffect(() => {
    const newFilters: Record<string, string> = {};
    dimensions.forEach(dim => {
      const paramVal = searchParams.get(dim.key);
      if (paramVal && dim.categories.some(c => c.key === paramVal)) {
        newFilters[dim.key] = paramVal;
      }
    });
    if (Object.keys(newFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...newFilters }));
    }
  }, [searchParams, dimensions]);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
        router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
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
        router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
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
    router.push(`/${locale}/checkout`);
  };

  const handleShareProduct = async (product: Product) => {
    const shareUrl = `${window.location.origin}/shop?id=${product.id}`;
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
    if (p.status && p.status !== 'Published') return false;
    // Check each dimension filter
    for (const dim of dimensions) {
      const filterVal = getFilter(dim.key);
      if (filterVal !== 'All') {
        if ((p as any)[dim.field] !== filterVal) return false;
      }
    }
    const matchSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
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
          
          <div className="flex flex-col gap-3">
            {tabDimensions.map(dim => (
              <div key={dim.key} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm overflow-x-auto max-w-full">
                <button 
                   onClick={() => setFilter(dim.key, 'All')}
                   className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${getFilter(dim.key) === 'All' ? 'bg-vs text-white' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {t.shop.allItems}
                </button>
                {dim.categories.map(cat => (
                  <button 
                    key={cat.key}
                    onClick={() => setFilter(dim.key, cat.key)}
                    className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${getFilter(dim.key) === cat.key ? 'bg-vs text-white shadow-lg shadow-vs/20' : 'text-slate-400 hover:text-slate-900'}`}
                  >
                    {getCategoryLabel(cat)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 space-y-10 shrink-0">
             {/* Search */}
             <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">{locale === 'zh' ? '搜索产品' : 'Search'}</h4>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={locale === 'zh' ? '搜索名称、品牌...' : 'Search name, brand...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-vs transition-colors pr-10"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">
                      ✕
                    </button>
                  )}
                </div>
             </div>

             {sidebarDimensions.map(dim => (
               <div key={dim.key} className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    {dim.displayName[language] || dim.displayName['en'] || Object.values(dim.displayName)[0] || dim.key}
                  </h4>
                  <div className="flex flex-col gap-1">
                     <button 
                        onClick={() => setFilter(dim.key, 'All')}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${getFilter(dim.key) === 'All' ? 'bg-vs/5 text-vs' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        {t.courses.allSpecialties}
                        {getFilter(dim.key) === 'All' && <span className="w-1.5 h-1.5 bg-vs rounded-full"></span>}
                     </button>
                     {dim.categories.map(cat => (
                       <button 
                          key={cat.key}
                          onClick={() => setFilter(dim.key, cat.key)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${getFilter(dim.key) === cat.key ? 'bg-vs/5 text-vs' : 'text-slate-500 hover:bg-slate-50'}`}
                       >
                          {getCategoryLabel(cat)}
                          {getFilter(dim.key) === cat.key && <span className="w-1.5 h-1.5 bg-vs rounded-full"></span>}
                       </button>
                     ))}
                  </div>
               </div>
             ))}

             <div className="p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20">🤖</div>
                <h5 className="text-xs font-black uppercase tracking-widest mb-2 text-vs">{t.shop.aiSourcing}</h5>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{t.shop.aiDesc}</p>
                <button 
                  onClick={() => router.push(`/${locale}/ai`)}
                  className="mt-4 text-[10px] font-black uppercase underline hover:text-vs"
                >
                  {t.shop.startChat}
                </button>
             </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Sort Bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-bold text-slate-400">
                {filteredProducts.length} {locale === 'zh' ? '件商品' : 'products'}
              </p>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-vs transition-colors cursor-pointer"
              >
                <option value="default">{locale === 'zh' ? '默认排序' : 'Default'}</option>
                <option value="price-asc">{locale === 'zh' ? '价格从低到高' : 'Price: Low to High'}</option>
                <option value="price-desc">{locale === 'zh' ? '价格从高到低' : 'Price: High to Low'}</option>
                <option value="name">{locale === 'zh' ? '按名称排序' : 'Name A-Z'}</option>
              </select>
            </div>

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
                      <img src={product.imageUrl} alt={product.name} className="max-h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
                      
                      <div className="absolute top-4 left-4">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          product.stockStatus === 'Out of Stock' ? 'bg-red-50 text-red-500' 
                          : product.stockStatus === 'Low Stock' ? 'bg-amber-50 text-amber-600' 
                          : 'bg-white text-vs'
                        }`}>
                          {product.stockStatus === 'Out of Stock' 
                            ? (locale === 'zh' ? '缺货' : 'Out of Stock')
                            : product.stockStatus === 'Low Stock'
                            ? (locale === 'zh' ? `仅剩 ${product.stockQuantity ?? 0} 件` : `Only ${product.stockQuantity ?? 0} left`)
                            : (locale === 'zh' ? '现货' : 'In Stock')}
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
                            disabled={product.stockStatus === 'Out of Stock'}
                            className={`btn-vs-premium !py-3 !px-6 !rounded-xl text-xs shadow-sm transition-all active:scale-95 ${
                              product.stockStatus === 'Out of Stock' ? '!bg-slate-300 !cursor-not-allowed !shadow-none' :
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
              <p className="text-xs text-slate-400">{isCN ? '准备好结算您的手术器械了吗？' : 'Ready to finalize your surgical gear?'}</p>
           </div>
           <button 
             onClick={() => router.push(`/${locale}/checkout`)}
             className="bg-vs text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-vs-dark transition-all"
           >
             {isCN ? '立即结算' : 'Checkout Now'}
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
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="max-h-full object-contain mix-blend-multiply" />
                 </div>
                 
                 <div className="mb-10">
                    <p className="text-xs font-black text-vs uppercase tracking-[0.2em] mb-2">{selectedProduct.brand}</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{selectedProduct.name}</h2>
                    {selectedProduct.stockStatus === 'Low Stock' && (
                      <p className="text-xs font-bold text-amber-600 mt-2">
                        {locale === 'zh' ? `⚡ 库存紧张，仅剩 ${selectedProduct.stockQuantity ?? 0} 件` : `⚡ Low stock - only ${selectedProduct.stockQuantity ?? 0} left`}
                      </p>
                    )}
                    {selectedProduct.stockStatus === 'Out of Stock' && (
                      <p className="text-xs font-bold text-red-500 mt-2">
                        {locale === 'zh' ? '暂时缺货' : 'Currently out of stock'}
                      </p>
                    )}
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
                        <button onClick={() => router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`)} className="text-xl font-black text-vs hover:underline">🔒 {t.auth.loginToView}</button>
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

export default ShopPageClient;
