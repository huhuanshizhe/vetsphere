'use client';

import { useState } from 'react';
import type { Product } from '@vetsphere/shared/types';

interface InventoryTabProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

const STOCK_STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  'In Stock': { bg: 'bg-green-500/20', text: 'text-green-400', label: '有库存' },
  'Low Stock': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '库存不足' },
  'Out of Stock': { bg: 'bg-red-500/20', text: 'text-red-400', label: '缺货' },
};

const PRODUCT_STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  'Draft': { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '草稿' },
  'Pending': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '审核中' },
  'Published': { bg: 'bg-green-500/20', text: 'text-green-400', label: '已上架' },
  'Rejected': { bg: 'bg-red-500/20', text: 'text-red-400', label: '已拒绝' },
};

export default function InventoryTab({ products, onAddProduct, onEditProduct, onDeleteProduct }: InventoryTabProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredProducts = filter === 'all'
    ? products
    : products.filter(p => p.stockStatus === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">库存管理</h1>
          <p className="text-gray-400 mt-1">管理您的所有商品</p>
        </div>
        <button onClick={onAddProduct} className="gear-button flex items-center gap-2">
          <span>➕</span>
          <span>添加商品</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'In Stock', label: '有库存' },
          { key: 'Low Stock', label: '库存不足' },
          { key: 'Out of Stock', label: '缺货' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500/10 text-gray-400 hover:bg-blue-500/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">暂无商品</p>
          <button onClick={onAddProduct} className="gear-button">
            添加第一件商品
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stock = STOCK_STATUS_BADGES[product.stockStatus || 'In Stock'];
            const productStatus = PRODUCT_STATUS_BADGES[product.status || 'Published'];
            return (
              <div key={product.id} className="gear-card overflow-hidden">
                {/* Product Image */}
                <div className="aspect-square bg-blue-500/10 relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      📦
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${productStatus.bg} ${productStatus.text}`}>
                    {productStatus.label}
                  </span>
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${stock.bg} ${stock.text}`}>
                    {stock.label}
                  </span>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {product.brand} · {product.specialty}
                  </p>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-blue-400 font-medium">
                      ¥{product.price?.toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      库存: {product.stockQuantity ?? '-'}
                    </span>
                  </div>

                  {product.status === 'Rejected' && product.rejectionReason && (
                    <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded mb-3 line-clamp-2">
                      拒绝原因: {product.rejectionReason}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditProduct(product)}
                      className="flex-1 py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
