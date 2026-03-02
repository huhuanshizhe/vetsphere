'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@vetsphere/shared/services/api';
import { useCart } from '@vetsphere/shared/context/CartContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useNotification } from '@vetsphere/shared/context/NotificationContext';
import { useSiteConfig } from '@vetsphere/shared/context/SiteConfigContext';
import type { Product } from '@vetsphere/shared/types';

interface CategoryShopClientProps {
  categorySlug: string;
  categoryName: string;
  locale: string;
}

export default function CategoryShopClient({ categorySlug, categoryName, locale }: CategoryShopClientProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();
  const { siteConfig, isCN } = useSiteConfig();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Get specialty dimension from config
  const specialtyDimension = useMemo(() => 
    siteConfig.shopCategories?.dimensions.find(d => d.key === 'specialty'),
    [siteConfig.shopCategories]
  );
  
  const specialties = useMemo(() => 
    specialtyDimension?.categories ?? [], 
    [specialtyDimension]
  );

  const getLabel = (cat: { key: string; labels: Record<string, string> }) =>
    cat.labels[language] || cat.labels['en'] || Object.values(cat.labels)[0] || cat.key;

  useEffect(() => {
    api.getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  // Filter products by category and other criteria
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.status && p.status !== 'Published') return false;
      
      // Filter by clinical category
      if (p.clinicalCategory !== categorySlug) return false;
      
      // Filter by specialty if selected
      if (selectedSpecialty !== 'All' && p.specialty !== selectedSpecialty) return false;
      
      // Search filter
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
  }, [products, categorySlug, selectedSpecialty, searchQuery, sortBy]);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }

    // Check purchase mode
    if (product.purchaseMode === 'inquiry') {
      // Open inquiry modal (to be implemented)
      addNotification({
        id: `inq-${Date.now()}`,
        type: 'system',
        title: 'Request Quote',
        message: 'Please contact us for pricing on this item.',
        read: false,
        timestamp: new Date(),
      });
      return;
    }

    addToCart({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      quantity: 1, 
      type: 'product', 
      currency: 'USD', 
      imageUrl: product.imageUrl 
    });

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 2000);
  };

  const handleProductClick = (productId: string) => {
    router.push(`/${locale}/shop/${productId}`);
  };

  return (
    <div className="bg-[#FBFCFB] min-h-screen pt-24 md:pt-32 relative">
      <div className="vs-container pb-20">
        
        {/* Header */}
        <div className="mb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => router.push(`/${locale}`)} className="hover:text-vs">Home</button>
            <span>/</span>
            <button onClick={() => router.push(`/${locale}/shop`)} className="hover:text-vs">Equipment Shop</button>
            <span>/</span>
            <span className="text-slate-900 font-bold">{categoryName}</span>
          </nav>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {categoryName}
              </h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                {filteredProducts.length} {language === 'en' ? 'products' : language === 'th' ? 'สินค้า' : '商品'}
              </p>
            </div>
            
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-vs transition-colors cursor-pointer"
            >
              <option value="default">{language === 'en' ? 'Default' : language === 'th' ? 'ค่าเริ่มต้น' : 'デフォルト'}</option>
              <option value="price-asc">{language === 'en' ? 'Price: Low to High' : language === 'th' ? 'ราคา: ต่ำ-สูง' : '価格: 低→高'}</option>
              <option value="price-desc">{language === 'en' ? 'Price: High to Low' : language === 'th' ? 'ราคา: สูง-ต่ำ' : '価格: 高→低'}</option>
              <option value="name">{language === 'en' ? 'Name A-Z' : language === 'th' ? 'ชื่อ A-Z' : '名前 A-Z'}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 space-y-10 shrink-0">
            {/* Search */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                {language === 'en' ? 'Search' : language === 'th' ? 'ค้นหา' : '検索'}
              </h4>
              <div className="relative">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Search name, brand...' : language === 'th' ? 'ค้นหาชื่อ, แบรนด์...' : '名前、ブランドで検索...'}
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

            {/* Specialty Filter */}
            {specialties.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                  {specialtyDimension?.displayName[language] || specialtyDimension?.displayName.en || 'Specialty'}
                </h4>
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => setSelectedSpecialty('All')}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedSpecialty === 'All' ? 'bg-vs/5 text-vs' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {language === 'en' ? 'All Specialties' : language === 'th' ? 'ทั้งหมด' : 'すべて'}
                    {selectedSpecialty === 'All' && <span className="w-1.5 h-1.5 bg-vs rounded-full"></span>}
                  </button>
                  {specialties.map(spec => (
                    <button 
                      key={spec.key}
                      onClick={() => setSelectedSpecialty(spec.key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedSpecialty === spec.key ? 'bg-vs/5 text-vs' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      {getLabel(spec)}
                      {selectedSpecialty === spec.key && <span className="w-1.5 h-1.5 bg-vs rounded-full"></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back to all products */}
            <button 
              onClick={() => router.push(`/${locale}/shop`)}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors"
            >
              ← {language === 'en' ? 'All Categories' : language === 'th' ? 'ดูทั้งหมด' : '全カテゴリー'}
            </button>
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
                    onClick={() => handleProductClick(product.id)}
                    className="vs-card-refined group p-0 overflow-hidden flex flex-col h-full bg-white cursor-pointer"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-square bg-slate-50 flex items-center justify-center p-10 group-hover:bg-white transition-colors duration-500">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.imageUrl} alt={product.name} className="max-h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
                      
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          product.stockStatus === 'Out of Stock' ? 'bg-red-50 text-red-500' 
                          : product.stockStatus === 'Low Stock' ? 'bg-amber-50 text-amber-600' 
                          : 'bg-white text-vs'
                        }`}>
                          {product.stockStatus === 'Out of Stock' 
                            ? 'Out of Stock'
                            : product.stockStatus === 'Low Stock'
                            ? `Only ${product.stockQuantity ?? 0} left`
                            : 'In Stock'}
                        </span>
                        {product.purchaseMode === 'inquiry' && (
                          <span className="px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm bg-blue-50 text-blue-600">
                            Quote Only
                          </span>
                        )}
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
                        {Object.entries(product.specs || {}).slice(0, 2).map(([key, val]) => (
                          <div key={key} className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{key}</p>
                            <p className="text-[10px] font-black text-slate-800">{val}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-50">
                        <div>
                          {product.purchaseMode === 'inquiry' ? (
                            <p className="text-sm font-black text-blue-600">Contact for Pricing</p>
                          ) : (
                            <>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price excl. tax</p>
                              {isAuthenticated ? (
                                <p className="text-xl font-black text-slate-900">${product.price.toLocaleString()}</p>
                              ) : (
                                <p className="text-sm font-black text-vs flex items-center gap-1">🔒 Login to view</p>
                              )}
                            </>
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
                          {product.purchaseMode === 'inquiry' 
                            ? 'Request Quote'
                            : addedProductId === product.id 
                            ? 'Added!' 
                            : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && filteredProducts.length === 0 && (
              <div className="py-40 text-center vs-card-refined bg-slate-50/50 border-dashed border-2">
                <p className="text-slate-400 font-black uppercase tracking-widest">
                  {language === 'en' ? 'No products found in this category' : language === 'th' ? 'ไม่พบสินค้าในหมวดหมู่นี้' : 'このカテゴリーに商品がありません'}
                </p>
                <button 
                  onClick={() => router.push(`/${locale}/shop`)}
                  className="mt-4 text-vs font-bold hover:underline"
                >
                  {language === 'en' ? 'Browse all products' : language === 'th' ? 'ดูสินค้าทั้งหมด' : 'すべての商品を見る'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
