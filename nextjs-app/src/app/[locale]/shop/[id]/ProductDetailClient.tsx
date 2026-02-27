'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface ProductDetailClientProps {
  productId: string;
}

const ProductDetailClient: React.FC<ProductDetailClientProps> = ({ productId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Get current locale from pathname
  const locale = pathname.split('/')[1] || 'en';

  useEffect(() => {
    api.getProducts().then(products => {
      const found = products.find(p => p.id === productId);
      setProduct(found || null);
      setLoading(false);
    });
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: 'CNY',
      imageUrl: product.imageUrl,
      type: 'product',
      quantity
    });
    
    addNotification({
      id: `cart-${Date.now()}`,
      type: 'system',
      title: language === 'zh' ? '已加入购物车' : 'Added to Cart',
      message: `${product.name} x ${quantity}`,
      read: true,
      timestamp: new Date()
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: 'CNY',
      imageUrl: product.imageUrl,
      type: 'product',
      quantity
    });
    
    router.push(`/${locale}/checkout`);
  };

  const handleShare = async () => {
    if (!product) return;
    
    const shareUrl = `${window.location.origin}/${locale}/shop/${product.id}`;
    const shareTitle = `[VetSphere Equipment] ${product.name}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        if (user) {
          await api.awardPoints(user.id, 30, `Shared product: ${product.name}`);
          addNotification({ 
            id: `sh-p-${Date.now()}`, 
            type: 'system', 
            title: t.common.pointsEarned, 
            message: '+30 pts for sharing product.', 
            read: true, 
            timestamp: new Date() 
          });
        }
      } catch {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      addNotification({ 
        id: `sh-p-${Date.now()}`, 
        type: 'system', 
        title: t.common.copySuccess, 
        message: 'Link copied to clipboard!', 
        read: true, 
        timestamp: new Date() 
      });
      if (user) await api.awardPoints(user.id, 30, `Copied product link: ${product.name}`);
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-emerald-100 text-emerald-700';
      case 'Low Stock': return 'bg-amber-100 text-amber-700';
      case 'Out of Stock': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStockStatusText = (status: string) => {
    if (language === 'zh') {
      switch (status) {
        case 'In Stock': return '现货';
        case 'Low Stock': return '库存紧张';
        case 'Out of Stock': return '缺货';
        default: return status;
      }
    }
    return status;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-vs border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-black text-slate-900">
          {language === 'zh' ? '产品未找到' : 'Product Not Found'}
        </h1>
        <p className="text-slate-500">
          {language === 'zh' ? '您访问的产品不存在或已下架' : 'The product you are looking for does not exist or has been removed.'}
        </p>
        <Link 
          href={`/${locale}/shop`}
          className="px-6 py-3 bg-vs text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
        >
          {language === 'zh' ? '返回产品列表' : 'Back to Shop'}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-28">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href={`/${locale}`} className="hover:text-vs transition-colors">
            {language === 'zh' ? '首页' : 'Home'}
          </Link>
          <span>/</span>
          <Link href={`/${locale}/shop`} className="hover:text-vs transition-colors">
            {language === 'zh' ? '设备商城' : 'Equipment Shop'}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left - Product Image */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm aspect-square relative group">
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Stock Badge */}
              <span className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-black ${getStockStatusColor(product.stockStatus)}`}>
                {getStockStatusText(product.stockStatus)}
              </span>
              {/* Share Button */}
              <button 
                onClick={handleShare}
                className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm"
              >
                &#128228;
              </button>
            </div>
          </div>

          {/* Right - Product Info */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded">
                  {product.group}
                </span>
                <span className="px-3 py-1 bg-vs/10 text-vs text-xs font-black uppercase tracking-widest rounded">
                  {product.specialty}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{product.name}</h1>
              <p className="text-lg text-slate-500 font-medium">{product.brand}</p>
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-end gap-4 mb-4">
                {isAuthenticated ? (
                  <>
                    <span className="text-4xl font-black text-vs">
                      &#165;{product.price.toLocaleString()}
                    </span>
                    <span className="text-slate-400 line-through text-lg">
                      &#165;{Math.round(product.price * 1.2).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <button 
                    onClick={() => router.push(`/${locale}/auth`)}
                    className="text-lg font-black text-vs hover:underline flex items-center gap-2"
                  >
                    &#128274; {language === 'zh' ? '登录查看价格' : 'Login to View Price'}
                  </button>
                )}
              </div>
              
              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-bold text-slate-500">
                  {language === 'zh' ? '数量' : 'Quantity'}:
                </span>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={product.stockStatus === 'Out of Stock'}
                  className="flex-1 py-4 rounded-2xl font-black text-base border-2 border-vs text-vs hover:bg-vs/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &#128722; {language === 'zh' ? '加入购物车' : 'Add to Cart'}
                </button>
                <button 
                  onClick={handleBuyNow}
                  disabled={product.stockStatus === 'Out of Stock'}
                  className="flex-1 py-4 rounded-2xl font-black text-base bg-vs text-white hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {language === 'zh' ? '立即购买' : 'Buy Now'}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-900">
                {language === 'zh' ? '产品描述' : 'Product Description'}
              </h2>
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
              <p className="text-slate-500 leading-relaxed text-sm">{product.longDescription}</p>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                {language === 'zh' ? '规格参数' : 'Specifications'}
              </h2>
              <div className="space-y-3">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-bold text-slate-400">{key}</span>
                    <span className="text-sm font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplier Info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                {language === 'zh' ? '供应商信息' : 'Supplier Information'}
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                  &#127981;
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900">{product.supplier.name}</p>
                  <p className="text-sm text-slate-500">{language === 'zh' ? '产地' : 'Origin'}: {product.supplier.origin}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-500">
                    &#9733;
                    <span className="font-black">{product.supplier.rating}</span>
                  </div>
                  <p className="text-xs text-slate-400">{language === 'zh' ? '供应商评分' : 'Supplier Rating'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailClient;
