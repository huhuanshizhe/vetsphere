'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CartItem {
  id: string;
  product_id: string;
  sku_id?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    brand?: string;
    price_min: number;
    cover_image_url?: string;
    has_price: boolean;
  };
}

export default function ShoppingCartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/v1/cart');
      const result = await response.json();

      if (result.success) {
        setCartItems(result.data.items || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const response = await fetch(`/api/v1/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          quantity: newQuantity
        })
      });

      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/v1/cart/items?item_id=${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link
              href="/shop"
              className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              Continue Shopping →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow p-4 flex gap-4"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded">
                    {item.product.cover_image_url ? (
                      <img
                        src={item.product.cover_image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                    {item.product.brand && (
                      <p className="text-sm text-gray-500 mt-1">{item.product.brand}</p>
                    )}
                    
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 hover:bg-gray-50"
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="px-4 py-1 border-x border-gray-300">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1 hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    {!item.product.has_price ? (
                      <span className="text-gray-400">Inquire</span>
                    ) : (
                      <>
                        <div className="text-lg font-bold text-emerald-600">
                          ${(item.product.price_min * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${item.product.price_min.toFixed(2)} each
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-emerald-600">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Link
                  href="/shop/checkout"
                  className="block w-full px-6 py-3 bg-emerald-600 text-white text-center rounded-md hover:bg-emerald-700 font-semibold"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href="/shop"
                  className="block w-full px-6 py-3 border border-emerald-600 text-emerald-600 text-center rounded-md hover:bg-emerald-50 mt-2"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
