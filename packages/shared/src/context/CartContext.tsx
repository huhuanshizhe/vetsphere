'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { CartItem } from '../types';

// 增强的购物车项类型
export interface EnhancedCartItem extends CartItem {
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'lb';
  supplierId?: string;
  supplierName?: string;
  minOrderQuantity?: number;
  inStock?: boolean;
}

interface CartContextType {
  cart: EnhancedCartItem[];
  addToCart: (item: EnhancedCartItem) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  mergeLocalCart: () => Promise<void>;
  totalAmount: number;
  totalWeight: number;      // 总重量（克）
  itemCount: number;
  loading: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_PREFIX = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORAGE_PREFIX || 'vetsphere_';
const CART_STORAGE_KEY = `${STORAGE_PREFIX}cart_v4`; // V4 for enhanced cart

export const CartProvider: React.FC<{ children: ReactNode; siteCode?: string }> = ({ children, siteCode = 'intl' }) => {
  const [cart, setCart] = useState<EnhancedCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化：从localStorage加载
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCart(parsed);
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
    }
    
    setIsInitialized(true);
  }, []);

  // 持久化到localStorage
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [cart, isInitialized]);

  // 生成唯一ID：productId + skuId（如果有）
  const generateCartItemId = useCallback((item: EnhancedCartItem): string => {
    if (item.skuId) {
      return `${item.productId || item.id}_${item.skuId}`;
    }
    return item.id;
  }, []);

  // 同步购物车到服务器
  const syncWithServer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, siteCode }),
      });
      
      if (!response.ok) throw new Error('Failed to sync cart');
      
      const data = await response.json();
      if (data.items) {
        setCart(data.items);
      }
    } catch (e) {
      console.error('Cart sync error:', e);
      setError('Failed to sync cart with server');
    } finally {
      setLoading(false);
    }
  }, [cart, siteCode]);

  // 合并本地购物车到服务器
  const mergeLocalCart = useCallback(async () => {
    try {
      setLoading(true);
      const localCart = localStorage.getItem(CART_STORAGE_KEY);
      const localItems = localCart ? JSON.parse(localCart) : [];
      
      if (localItems.length === 0) {
        // 本地购物车为空，从服务器获取
        const response = await fetch('/api/cart');
        if (response.ok) {
          const data = await response.json();
          setCart(data.items || []);
        }
        return;
      }
      
      // 合并本地购物车到服务器
      const response = await fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: localItems, siteCode }),
      });
      
      if (!response.ok) throw new Error('Failed to merge cart');
      
      const data = await response.json();
      setCart(data.items || []);
      
      // 清除本地存储（已合并到服务器）
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.error('Cart merge error:', e);
      setError('Failed to merge cart');
    } finally {
      setLoading(false);
    }
  }, [siteCode]);

  // 添加商品到购物车
  const addToCart = useCallback(async (newItem: EnhancedCartItem) => {
    const itemId = generateCartItemId(newItem);
    const quantity = newItem.quantity || 1;
    
    setCart(prev => {
      // 查找是否已存在相同产品+SKU组合
      const existingIndex = prev.findIndex(item => {
        if (newItem.skuId) {
          return item.productId === newItem.productId && item.skuId === newItem.skuId;
        }
        return item.id === newItem.id || item.productId === newItem.productId;
      });

      if (existingIndex > -1) {
        const updatedCart = [...prev];
        const newQty = updatedCart[existingIndex].quantity + quantity;
        // 检查最小起订量
        const minQty = updatedCart[existingIndex].minOrderQuantity || 1;
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: Math.max(minQty, newQty)
        };
        return updatedCart;
      }
      
      // 添加新商品
      return [...prev, { 
        ...newItem, 
        id: itemId,
        quantity: Math.max(newItem.minOrderQuantity || 1, quantity)
      }];
    });
  }, [generateCartItemId]);

  // 更新数量（增量）
  const updateQuantity = useCallback(async (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const minQty = item.minOrderQuantity || 1;
        const newQty = Math.max(minQty, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, []);

  // 设置精确数量
  const setQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== id));
      return;
    }
    
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const minQty = item.minOrderQuantity || 1;
        return { ...item, quantity: Math.max(minQty, quantity) };
      }
      return item;
    }));
  }, []);

  // 移除商品
  const removeFromCart = useCallback(async (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  // 清空购物车
  const clearCart = useCallback(async () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  // 计算总金额
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  // 计算总重量（转换为克）
  const totalWeight = useMemo(() => {
    return cart.reduce((sum, item) => {
      let weight = item.weight || 0;
      // 转换为克
      if (item.weightUnit === 'kg') weight *= 1000;
      if (item.weightUnit === 'lb') weight *= 453.592;
      return sum + (weight * item.quantity);
    }, 0);
  }, [cart]);

  // 计算商品数量
  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      updateQuantity,
      setQuantity,
      removeFromCart, 
      clearCart, 
      syncWithServer,
      mergeLocalCart,
      totalAmount,
      totalWeight,
      itemCount,
      loading,
      error
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};