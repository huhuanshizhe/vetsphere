'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSessionSafe } from '../services/supabase';

interface WishlistProduct {
  id: string;
  product_id: string;
  name?: string;
  display_name?: string;
  slug?: string;
  brand?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  display_price?: number | null;
  selling_price_usd?: number | null;
  selling_price_jpy?: number | null;
  selling_price_thb?: number | null;
  summary?: string | null;
  created_at?: string;
}

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product_type?: string;
  created_at?: string;
  product?: WishlistProduct | null;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  wishlistProductIds: Set<string>;
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string, productType?: string) => Promise<{ success: boolean; alreadyExists?: boolean }>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  toggleWishlist: (productId: string, productType?: string) => Promise<boolean>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Get token from Supabase session
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const { getSessionSafe } = await import('../services/supabase');
      const { data: { session } } = await getSessionSafe();
      return session?.access_token || null;
    } catch (error) {
      console.error('[WishlistContext] Failed to get token:', error);
      return null;
    }
  }, []);

  // Load wishlist from API
  const refreshWishlist = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setWishlist([]);
      setWishlistProductIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/wishlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.wishlist || [];
        setWishlist(items);
        // Create a Set of product IDs for fast lookup
        const ids = new Set<string>(items.map((item: WishlistItem) => item.product_id));
        setWishlistProductIds(ids);
      } else if (response.status === 401) {
        // Unauthorized - user not logged in or session expired
        setWishlist([]);
        setWishlistProductIds(new Set());
      }
    } catch (error) {
      console.error('[WishlistContext] Failed to load wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlistProductIds.has(productId);
  }, [wishlistProductIds]);

  // Add to wishlist
  const addToWishlist = useCallback(async (
    productId: string,
    productType: string = 'product'
  ): Promise<{ success: boolean; alreadyExists?: boolean }> => {
    const token = await getToken();
    if (!token) {
      // Not logged in, redirect to login
      return { success: false };
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, productType }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh wishlist to get updated data
        await refreshWishlist();
        return { success: true };
      } else if (response.status === 400 && data.alreadyExists) {
        // Already in wishlist
        return { success: false, alreadyExists: true };
      } else {
        console.error('[WishlistContext] Failed to add to wishlist:', data.error);
        return { success: false };
      }
    } catch (error) {
      console.error('[WishlistContext] Error adding to wishlist:', error);
      return { success: false };
    }
  }, [getToken, refreshWishlist]);

  // Remove from wishlist
  const removeFromWishlist = useCallback(async (productId: string): Promise<boolean> => {
    const token = await getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        // Update local state immediately
        setWishlist(prev => prev.filter(item => item.product_id !== productId));
        setWishlistProductIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        return true;
      } else {
        console.error('[WishlistContext] Failed to remove from wishlist');
        return false;
      }
    } catch (error) {
      console.error('[WishlistContext] Error removing from wishlist:', error);
      return false;
    }
  }, [getToken]);

  // Toggle wishlist (add if not exists, remove if exists)
  const toggleWishlist = useCallback(async (productId: string, productType?: string): Promise<boolean> => {
    if (isInWishlist(productId)) {
      const success = await removeFromWishlist(productId);
      return success;
    } else {
      const result = await addToWishlist(productId, productType);
      return result.success;
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  // Load wishlist on mount and when user session changes
  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const value: WishlistContextType = {
    wishlist,
    wishlistProductIds,
    isLoading,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    refreshWishlist,
    toggleWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
