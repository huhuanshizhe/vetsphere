
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../constants';
import { useCart } from '../context/CartContext';
import { Specialty, ProductGroup, Product } from '../types';

const Shop: React.FC = () => {
  const { addToCart } = useCart();
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | 'All'>('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'specs' | 'bundle'>('overview');

  const groups: { id: ProductGroup | 'All'; label: string; icon: string }[] = [
    { id: 'All', label: 'All Categories', icon: '📂' },
    { id: 'PowerTools', label: 'Power Tools', icon: '⚡' },
    { id: 'Implants', label: 'Implants', icon: '🔩' },
    { id: 'HandInstruments', label: 'Instruments', icon: '🛠️' },
    { id: 'Consumables', label: 'Consumables', icon: '🧵' }
  ];

  const specialties = [
    { id: 'All', label: 'All Specialties' },
    ...Object.values(Specialty).map(s => ({ id: s, label: s }))
  ];

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchesGroup = selectedGroup === 'All' || p.group === selectedGroup;
      const matchesSpecialty = selectedSpecialty === 'All' || p.specialty === selectedSpecialty;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGroup && matchesSpecialty && matchesSearch;
    });
  }, [selectedGroup, selectedSpecialty, searchQuery]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: 'CNY',
      imageUrl: product.imageUrl,
      type: 'product',
      quantity: 1
    });
  };

  return (
    <div className="bg-white min-h-screen pt-20">
      {/* Top Search & Breadcrumbs */}
      <div className="bg-slate-50 border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Link to="/" className="hover:text-vs">Home</Link>
            <span>/</span>
            <span className="text-slate-900">Equipment Shop</span>
          </div>
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search specialty, brand, SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-vs outline-none transition-all text-sm font-semibold"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-72 shrink-0 space-y-10">
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-1 h-3 bg-vs rounded-full"></span>
              By Specialty
            </h3>
            <div className="space-y-1">
              {specialties.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSpecialty(s.id as any)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSpecialty === s.id 
                    ? 'bg-vs/5 text-vs border-l-2 border-vs' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-1 h-3 bg-vs rounded-full"></span>
              By Category
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedGroup === g.id 
                    ? 'border-vs bg-vs/5 text-vs' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-lg">{g.icon}</span>
                  <span className="text-xs font-bold">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Badge */}
          <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-vs">Quality Standard</p>
            <h4 className="text-sm font-bold leading-snug">All instruments comply with ISO 13485 Medical Device Quality Management Systems.</h4>
            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-[10px] opacity-50 font-bold uppercase">Traceability</span>
              <span className="text-vs text-[10px] font-black">100% Guaranteed</span>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex justify-between items-end mb-8">
            <p className="text-xs font-bold text-slate-400">Found <span className="text-slate-900">{filteredProducts.length}</span> clinical instruments</p>
            <div className="flex gap-2">
              <select className="text-[11px] font-bold border-none bg-slate-50 px-3 py-1.5 rounded-lg outline-none cursor-pointer">
                <option>Sort by: Recommended</option>
                <option>Price: High to Low</option>
                <option>New Arrivals</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => setSelectedProduct(product)}
                className="group border border-slate-100 rounded-[24px] bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="aspect-square bg-white relative flex items-center justify-center p-8">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-2 py-1 bg-slate-50 text-[9px] font-black text-slate-400 rounded uppercase tracking-tighter">
                      {product.brand}
                    </span>
                  </div>
                  {product.stockStatus === 'Low Stock' && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                  )}
                </div>
                
                <div className="p-6 pt-0 flex flex-col flex-1">
                  <div className="mb-2">
                    <p className="text-[9px] font-bold text-vs uppercase tracking-widest mb-1">{product.specialty}</p>
                    <h3 className="text-sm font-black text-slate-900 leading-tight min-h-[2.5rem] line-clamp-2">
                      {product.name}
                    </h3>
                  </div>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Pro Price</p>
                      <span className="text-lg font-black text-slate-900">¥{product.price.toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={(e) => handleQuickAdd(e, product)}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center hover:bg-vs hover:text-white transition-all"
                    >
                      <span className="text-xl">+</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-32 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
              <span className="text-4xl block mb-4">🔍</span>
              <p className="text-slate-400 font-bold">No instruments found. Please try other filters or consult the AI assistant.</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Product Detail Modal */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="grid lg:grid-cols-2">
                {/* Left: Image */}
                <div className="bg-slate-50 p-12 flex items-center justify-center relative border-r border-slate-100 min-h-[400px]">
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-8 left-8 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-xl hover:scale-95 transition-all z-20"
                  >✕</button>
                  <img 
                    src={selectedProduct.imageUrl} 
                    className="max-w-[85%] max-h-[500px] object-contain mix-blend-multiply" 
                  />
                  <div className="absolute bottom-8 left-8 flex gap-2">
                    <button className="px-4 py-2 bg-white text-[10px] font-black uppercase rounded-lg border border-slate-200 hover:bg-slate-50">3D Model</button>
                    <button className="px-4 py-2 bg-white text-[10px] font-black uppercase rounded-lg border border-slate-200 hover:bg-slate-50">Gallery</button>
                  </div>
                </div>

                {/* Right: Info */}
                <div className="p-12 flex flex-col">
                  <header className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-vs text-white px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest">{selectedProduct.brand}</span>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{selectedProduct.group}</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight mb-4">{selectedProduct.name}</h2>
                    <p className="text-slate-500 font-medium leading-relaxed">{selectedProduct.description}</p>
                  </header>

                  {/* Tabs */}
                  <div className="flex gap-8 border-b border-slate-100 mb-8">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'specs', label: 'Tech Specs' },
                      { id: 'bundle', label: 'Bundle Recs' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDetailTab(tab.id as any)}
                        className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                          activeDetailTab === tab.id ? 'text-vs' : 'text-slate-400'
                        }`}
                      >
                        {tab.label}
                        {activeDetailTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-vs"></div>}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1">
                    {activeDetailTab === 'overview' && (
                      <div className="animate-in fade-in duration-300 space-y-6">
                        <p className="text-sm text-slate-600 leading-relaxed italic border-l-4 border-vs/20 pl-6">
                          {selectedProduct.longDescription || "Engineered with high-strength medical grade materials, designed for high-frequency surgical environments, balancing durability and precision."}
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-6">
                           <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                              <p className="text-[9px] font-black text-vs uppercase mb-1">Sterilization</p>
                              <p className="text-xs font-bold text-slate-800">134°C Autoclave</p>
                           </div>
                           <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Material Cert</p>
                              <p className="text-xs font-bold text-slate-800">ISO 5832-3 Certified</p>
                           </div>
                        </div>
                      </div>
                    )}

                    {activeDetailTab === 'specs' && (
                      <div className="animate-in fade-in duration-300">
                        <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(selectedProduct.specs).map(([k, v]) => (
                              <tr key={k}>
                                <td className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k}</td>
                                <td className="py-3 text-xs font-black text-slate-900">{v}</td>
                              </tr>
                            ))}
                            <tr>
                              <td className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin</td>
                              <td className="py-3 text-xs font-black text-slate-900">{selectedProduct.supplier.origin}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeDetailTab === 'bundle' && (
                      <div className="animate-in fade-in duration-300 space-y-4">
                        <p className="text-[10px] text-slate-400 font-bold mb-4">Recommended bundles for complete procedure:</p>
                        {PRODUCTS.filter(p => p.specialty === selectedProduct.specialty && p.id !== selectedProduct.id).slice(0, 2).map(p => (
                          <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-vs/30 transition-all group">
                            <img src={p.imageUrl} className="w-12 h-12 object-contain mix-blend-multiply" />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</p>
                              <p className="text-[10px] text-vs font-black">¥{p.price.toLocaleString()}</p>
                            </div>
                            <button 
                              onClick={(e) => handleQuickAdd(e, p)}
                              className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-vs group-hover:text-white transition-all text-sm font-bold"
                            >+</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-10 border-t border-slate-100 mt-10">
                    <div className="flex items-end justify-between mb-8">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Unit Price</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900 tracking-tighter">¥{selectedProduct.price.toLocaleString()}</span>
                          <span className="text-xs font-bold text-slate-400">/ set</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          In Stock (SHANGHAI)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      {selectedProduct.price > 10000 ? (
                        <button className="flex-1 px-8 py-5 border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">
                          Request Demo
                        </button>
                      ) : null}
                      <button 
                        onClick={(e) => { handleQuickAdd(e, selectedProduct); setSelectedProduct(null); }}
                        className="flex-[2] bg-vs text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-vs/30 hover:bg-vs-dark transform active:scale-95 transition-all"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Service Area */}
      <section className="bg-slate-900 py-24 px-6 text-center text-white">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="inline-block px-4 py-1 border border-vs text-vs text-[10px] font-black uppercase tracking-[0.3em] rounded-full">
            Technical Support
          </div>
          <h2 className="text-4xl font-black tracking-tight leading-tight">Need Custom Surgical Solutions?</h2>
          <p className="text-slate-400 font-medium text-lg leading-relaxed">
            VetSphere has deep engineering R&D capabilities. Whether it's custom instruments for special cases or bulk hospital supply, our product experts are ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <button className="px-10 py-5 bg-vs text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-vs/20">Contact Experts</button>
            <Link to="/ai" className="px-10 py-5 border border-white/20 hover:border-vs rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Discuss Custom Needs</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shop;
