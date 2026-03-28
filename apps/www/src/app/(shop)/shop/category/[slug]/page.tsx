'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  level: number;
  parent_id?: string;
}

export default function ShopCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedBrand, setSelectedBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (slug) {
      fetchData(slug);
    }
  }, [slug]);

  const fetchData = async (categorySlug: string) => {
    try {
      setLoading(true);

      // Fetch category
      const { data: catData } = await supabase
        .from('product_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single();

      if (!catData) {
        router.push('/shop');
        return;
      }

      setCategory(catData);

      // Fetch subcategories
      const { data: subCats } = await supabase
        .from('product_categories')
        .select('*')
        .eq('parent_id', catData.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      setSubcategories(subCats || []);

      // Fetch products
      let query = supabase
        .from('products')
        .select('*');

      // Filter by category
      if (catData.level === 1) {
        query = query.eq('category_id', catData.id);
      } else if (catData.level === 2) {
        query = query.eq('subcategory_id', catData.id);
      } else {
        query = query.eq('level3_category_id', catData.id);
      }

      // Only show published products
      query = query.eq('audit_status', 'published');

      // Apply filters
      if (selectedBrand) {
        query = query.eq('brand', selectedBrand);
      }

      if (minPrice) {
        query = query.gte('price_min', parseFloat(minPrice));
      }

      if (maxPrice) {
        query = query.lte('price_max', parseFloat(maxPrice));
      }

      // Sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('published_at', { ascending: false });
          break;
        case 'price_asc':
          query = query.order('price_min', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price_min', { ascending: false });
          break;
        default:
          query = query.order('sort_order', { ascending: true });
      }

      const { data: productsData } = await query;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Failed to fetch category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    if (category) {
      fetchData(category.slug);
    }
  };

  const handleResetFilters = () => {
    setSelectedBrand('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  };

  if (!category) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/shop" className="hover:text-emerald-600">Shop</Link>
            {' > '}
            <span className="text-gray-900">{category.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 space-y-6">
            {/* Subcategories */}
            {subcategories.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Subcategories</h3>
                <div className="space-y-2">
                  {subcategories.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/shop/category/${sub.slug}`}
                      className="block text-sm text-gray-600 hover:text-emerald-600"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Filters</h3>
              
              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleFilterApply}
                  className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                >
                  Apply
                </button>
                <button
                  onClick={handleResetFilters}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
              <p className="text-gray-600 mt-1">
                {products.length} products found
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No products found in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link
                    key={product.id}
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
                      <div>
                        {!product.has_price ? (
                          <span className="text-emerald-600 font-semibold text-sm">Inquire for Price</span>
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
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
