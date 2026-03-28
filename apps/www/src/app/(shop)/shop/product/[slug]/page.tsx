'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import SkuSelector from '@/components/SkuSelector';
import SkuPriceDisplay from '@/components/SkuPriceDisplay';
import SkuImageGallery from '@/components/SkuImageGallery';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  rich_description: string;
  price_min: number;
  price_max: number;
  has_price: boolean;
  has_variants: boolean;
  currency: string;
  cover_image_url?: string;
  images: any[];
  variant_attributes: any[];
  skus: any[];
  specifications: any[];
  packaging_info: string;
  delivery_time: string;
  warranty_info: string;
  min_order_quantity: number;
  unit: string;
}

export default function ShopProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);

      // Fetch product details
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.error('Product not found');
        return;
      }

      setProduct(data);

      // Fetch images
      const { data: images } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', data.id)
        .order('sort_order', { ascending: true });

      // Fetch SKUs if has variants
      let skus = [];
      if (data.has_variants) {
        const { data: skuData } = await supabase
          .from('product_skus')
          .select('*')
          .eq('product_id', data.id)
          .eq('is_active', true);
        
        skus = skuData || [];
      }

      // Fetch specifications
      const { data: specs } = await supabase
        .from('specification_definitions')
        .select(`
          *,
          spec_values:specification_values(*)
        `)
        .eq('product_id', data.id);

      setProduct({
        ...data,
        images: images || [],
        skus,
        specifications: specs || []
      });
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please login to add items to cart');
      return;
    }

    try {
      // Get or create cart
      const { data: cart } = await supabase
        .from('shopping_cart')
        .select('*')
        .eq('user_id', user.id)
        .eq('site_code', 'intl')
        .single();

      let cartId = cart?.id;

      if (!cartId) {
        const { data: newCart } = await supabase
          .from('shopping_cart')
          .insert({
            user_id: user.id,
            site_code: 'intl'
          })
          .select()
          .single();
        
        cartId = newCart?.id;
      }

      // Add item to cart
      const { error } = await supabase
        .from('shopping_cart_items')
        .insert({
          cart_id: cartId,
          product_id: product.id,
          sku_id: selectedSku?.id || null,
          quantity
        });

      if (error) throw error;

      alert('Added to cart successfully!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add to cart');
    }
  };

  const handleInquire = () => {
    // Open inquiry modal or navigate to inquiry form
    alert('Inquiry form will be implemented in next phase');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <Link href="/shop" className="text-emerald-600 hover:text-emerald-700">
            Back to Shop →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/shop" className="hover:text-emerald-600">Shop</Link>
            {' > '}
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Product Detail */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div>
            <SkuImageGallery
              images={product.images}
              selectedSkuImage={selectedSku?.image_url}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              {product.brand && (
                <p className="text-lg text-gray-600 mt-2">Brand: {product.brand}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <SkuPriceDisplay
                minPrice={selectedSku?.price || product.price_min}
                maxPrice={selectedSku?.price || product.price_max}
                currency={product.currency || 'USD'}
                hasVariants={product.has_variants}
                hasPrice={product.has_price}
              />
            </div>

            {/* SKU Selector */}
            {product.has_variants && product.variant_attributes && product.skus && (
              <div>
                <SkuSelector
                  attributes={product.variant_attributes}
                  skus={product.skus}
                  currency={product.currency || 'USD'}
                  selectedSku={selectedSku}
                  onSelectSku={setSelectedSku}
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity {product.min_order_quantity > 1 && `(Min: ${product.min_order_quantity})`}
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(product.min_order_quantity || 1, quantity - 1))}
                  className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(product.min_order_quantity || 1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border border-gray-300 rounded-md px-3 py-2"
                  min={product.min_order_quantity || 1}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {product.has_price ? (
                <button
                  onClick={handleAddToCart}
                  disabled={selectedSku && !selectedSku.is_active}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Add to Cart
                </button>
              ) : (
                <button
                  onClick={handleInquire}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold"
                >
                  Send Inquiry
                </button>
              )}
              
              {!product.has_price && (
                <button
                  onClick={handleInquire}
                  className="flex-1 px-6 py-3 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50 font-semibold"
                >
                  Contact Supplier
                </button>
              )}
            </div>

            {/* Quick Info */}
            <div className="pt-6 border-t space-y-2 text-sm text-gray-600">
              {product.packaging_info && (
                <div>
                  <span className="font-medium">Packaging:</span> {product.packaging_info}
                </div>
              )}
              {product.delivery_time && (
                <div>
                  <span className="font-medium">Delivery:</span> {product.delivery_time}
                </div>
              )}
              {product.warranty_info && (
                <div>
                  <span className="font-medium">Warranty:</span> {product.warranty_info}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-4 py-3 font-medium ${
                  activeTab === 'description'
                    ? 'text-emerald-600 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`px-4 py-3 font-medium ${
                  activeTab === 'specifications'
                    ? 'text-emerald-600 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Specifications
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'description' && (
              <div>
                {product.rich_description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.rich_description }} />
                ) : (
                  <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                {product.specifications && product.specifications.length > 0 ? (
                  <table className="min-w-full">
                    <tbody>
                      {product.specifications.map((spec: any, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-3 px-4 font-medium text-gray-700 w-1/3">
                            {spec.spec_name}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {spec.spec_value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500">No specifications available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
