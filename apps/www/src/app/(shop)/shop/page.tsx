'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  brand: string;
  price_min: number;
  price_max: number;
  has_price: boolean;
  cover_image_url?: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
}

export default function ShopHomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch featured products
      const { data: featured } = await supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('audit_status', 'published')
        .limit(8)
        .order('created_at', { ascending: false });

      // Fetch new products
      const { data: newArrivals } = await supabase
        .from('products')
        .select('*')
        .eq('is_new', true)
        .eq('audit_status', 'published')
        .limit(8)
        .order('published_at', { ascending: false });

      // Fetch top-level categories
      const { data: cats } = await supabase
        .from('product_categories')
        .select('*')
        .eq('level', 1)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      setFeaturedProducts(featured || []);
      setNewProducts(newArrivals || []);
      setCategories(cats || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">VetSphere Medical Store</h1>
          <p className="text-xl text-emerald-100">
            Professional veterinary equipment and supplies
          </p>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop/category/${category.slug}`}
              className="bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow"
            >
              {category.icon_url ? (
                <img
                  src={category.icon_url}
                  alt={category.name}
                  className="w-12 h-12 mx-auto mb-3"
                />
              ) : (
                <div className="w-12 h-12 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 text-xl">
                    {category.name.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link
            href="/shop/products?featured=true"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : featuredProducts.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-12">
              No featured products available
            </p>
          ) : (
            featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4 py-12 bg-white">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">New Arrivals</h2>
          <Link
            href="/shop/products?new=true"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg shadow p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : newProducts.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-12">
              No new products available
            </p>
          ) : (
            newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/shop/product/${product.slug || product.id}`}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="aspect-square bg-gray-100">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {!product.has_price ? (
              <span className="text-emerald-600 font-semibold">Inquire for Price</span>
            ) : (
              <div>
                {product.price_min === product.price_max ? (
                  <span className="text-lg font-bold text-emerald-600">
                    ${product.price_min?.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-emerald-600">
                    ${product.price_min?.toFixed(2)} - ${product.price_max?.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700">
            View
          </button>
        </div>
      </div>
    </Link>
  );
}
