'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
} from 'lucide-react';
import type { Product } from '@vetsphere/shared/types';

interface InventoryTabProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onFullEdit: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onOfflineProduct?: (productId: string) => void;
  onOnlineProduct?: (productId: string) => void;
  onWithdrawProduct?: (productId: string) => void;
}

const STOCK_STATUS_CONFIG = {
  'In Stock': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '有库存', icon: CheckCircle },
  'Low Stock': { bg: 'bg-amber-50', text: 'text-amber-700', label: '库存不足', icon: AlertTriangle },
  'Out of Stock': { bg: 'bg-red-50', text: 'text-red-700', label: '缺货', icon: XCircle },
};

const PRODUCT_STATUS_CONFIG = {
  'Draft': { bg: 'bg-gray-100', text: 'text-gray-600', label: '草稿', icon: Clock },
  'draft': { bg: 'bg-gray-100', text: 'text-gray-600', label: '草稿', icon: Clock },
  'Pending': { bg: 'bg-amber-50', text: 'text-amber-700', label: '审核中', icon: Clock },
  'pending': { bg: 'bg-amber-50', text: 'text-amber-700', label: '审核中', icon: Clock },
  'pending_review': { bg: 'bg-amber-50', text: 'text-amber-700', label: '审核中', icon: Clock },
  'Published': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已上架', icon: CheckCircle },
  'published': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已上架', icon: CheckCircle },
  'Rejected': { bg: 'bg-red-50', text: 'text-red-700', label: '已驳回', icon: XCircle },
  'rejected': { bg: 'bg-red-50', text: 'text-red-700', label: '已驳回', icon: XCircle },
  'Offline': { bg: 'bg-gray-100', text: 'text-gray-500', label: '已下架', icon: ArrowDownCircle },
  'offline': { bg: 'bg-gray-100', text: 'text-gray-500', label: '已下架', icon: ArrowDownCircle },
  'Approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已通过', icon: CheckCircle },
  'approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已通过', icon: CheckCircle },
};

const DEFAULT_STATUS = { bg: 'bg-gray-100', text: 'text-gray-600', label: '未知', icon: Package };

// 兼容大小写的状态获取函数
function getProductStatusConfig(status: string | undefined) {
  if (!status) return DEFAULT_STATUS;
  return PRODUCT_STATUS_CONFIG[status] || PRODUCT_STATUS_CONFIG[status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()] || DEFAULT_STATUS;
}

// 兼容大小写的状态比较函数
function isStatusMatch(productStatus: string | undefined, targetStatus: string): boolean {
  if (!productStatus) return false;
  const normalized = productStatus.charAt(0).toUpperCase() + productStatus.slice(1).toLowerCase();
  const normalizedTarget = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1).toLowerCase();
  return normalized === normalizedTarget;
}

export default function InventoryTab({
  products,
  onAddProduct,
  onEditProduct,
  onFullEdit,
  onDeleteProduct,
  onOfflineProduct,
  onOnlineProduct,
  onWithdrawProduct,
}: InventoryTabProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'all' || p.stockStatus === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterButtons = [
    { key: 'all', label: '全部', count: products.length },
    { key: 'In Stock', label: '有库存', count: products.filter(p => p.stockStatus === 'In Stock').length },
    { key: 'Low Stock', label: '库存不足', count: products.filter(p => p.stockStatus === 'Low Stock').length },
    { key: 'Out of Stock', label: '缺货', count: products.filter(p => p.stockStatus === 'Out of Stock').length },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">库存管理</h1>
          <p className="text-gray-500 mt-1">管理您的所有商品信息</p>
        </div>
        <button
          onClick={onAddProduct}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加商品
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索商品名称、品牌..."
              className="input pl-10"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {filterButtons.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
                <span className={`ml-1.5 ${filter === key ? 'text-blue-200' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid/List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="empty-state-title">暂无商品</h3>
            <p className="empty-state-description">
              {searchQuery ? '没有找到匹配的商品，请尝试其他关键词' : '开始添加您的第一件商品吧'}
            </p>
            {!searchQuery && (
              <button onClick={onAddProduct} className="btn btn-primary">
                添加第一件商品
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => {
            const stock = STOCK_STATUS_CONFIG[product.stockStatus || 'In Stock'] || DEFAULT_STATUS;
            const productStatus = getProductStatusConfig(product.status);
            const StockIcon = stock.icon;
            const StatusIcon = productStatus.icon;

            return (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
                {/* Product Image - 更紧凑的高度 */}
                <div className="h-32 bg-gray-100 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${productStatus.bg} ${productStatus.text}`}>
                      <StatusIcon className="w-3 h-3" />
                      {productStatus.label}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stock.bg} ${stock.text}`}>
                      <StockIcon className="w-3 h-3" />
                      {stock.label}
                    </span>
                  </div>

                  {/* Hover Actions - 根据状态显示不同操作 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {/* 编辑按钮：草稿、已驳回、已下架可编辑 */}
                    {(isStatusMatch(product.status, 'Draft') || isStatusMatch(product.status, 'Rejected') || isStatusMatch(product.status, 'Offline')) && (
                      <>
                        <button
                          onClick={() => onEditProduct(product)}
                          className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                          title="快速编辑"
                        >
                          <Edit className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => onFullEdit(product.id)}
                          className="p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors"
                          title="完整编辑"
                        >
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </button>
                      </>
                    )}

                    {/* 删除按钮：仅草稿可删除 */}
                    {isStatusMatch(product.status, 'Draft') && (
                      <button
                        onClick={() => onDeleteProduct(product.id)}
                        className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}

                    {/* 下架按钮：已上架可下架 */}
                    {isStatusMatch(product.status, 'Published') && onOfflineProduct && (
                      <button
                        onClick={() => onOfflineProduct(product.id)}
                        className="p-2 bg-white rounded-lg hover:bg-amber-50 transition-colors"
                        title="下架"
                      >
                        <ArrowDownCircle className="w-4 h-4 text-amber-600" />
                      </button>
                    )}

                    {/* 上架按钮：已下架可重新上架 */}
                    {isStatusMatch(product.status, 'Offline') && onOnlineProduct && (
                      <button
                        onClick={() => onOnlineProduct(product.id)}
                        className="p-2 bg-white rounded-lg hover:bg-emerald-50 transition-colors"
                        title="重新上架"
                      >
                        <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}

                    {/* 撤回按钮：审核中可撤回 */}
                    {isStatusMatch(product.status, 'Pending') && onWithdrawProduct && (
                      <button
                        onClick={() => onWithdrawProduct(product.id)}
                        className="p-2 bg-white rounded-lg hover:bg-amber-50 transition-colors"
                        title="撤回审核"
                      >
                        <RotateCcw className="w-4 h-4 text-amber-600" />
                      </button>
                    )}

                    {/* 查看按钮：审核中、已上架仅可查看 */}
                    {(isStatusMatch(product.status, 'Pending') || isStatusMatch(product.status, 'Published')) && (
                      <button
                        onClick={() => onFullEdit(product.id)}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 mb-0.5 line-clamp-1 text-sm">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {product.brand}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">
                      ¥{product.price?.toLocaleString?.() || '0'}
                    </span>
                    <span className="text-xs text-gray-500">
                      库存: {product.stockQuantity ?? '-'}
                    </span>
                  </div>

                  {isStatusMatch(product.status, 'Rejected') && product.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 line-clamp-2">
                        拒绝原因: {product.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>商品信息</th>
                <th>价格</th>
                <th>库存</th>
                <th>状态</th>
                <th>审核状态</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stock = STOCK_STATUS_CONFIG[product.stockStatus || 'In Stock'] || DEFAULT_STATUS;
                const productStatus = getProductStatusConfig(product.status);
                const StockIcon = stock.icon;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-gray-900">¥{product.price?.toLocaleString?.() || '0'}</span>
                    </td>
                    <td>
                      <span className="text-gray-700">{product.stockQuantity ?? '-'}</span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${stock.bg} ${stock.text}`}>
                        <StockIcon className="w-3 h-3" />
                        {stock.label}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${productStatus.bg} ${productStatus.text}`}>
                        {productStatus.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {/* 编辑按钮：草稿、已驳回、已下架可编辑 */}
                        {(isStatusMatch(product.status, 'Draft') || isStatusMatch(product.status, 'Rejected') || isStatusMatch(product.status, 'Offline')) && (
                          <>
                            <button
                              onClick={() => onEditProduct(product)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="快速编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onFullEdit(product.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="完整编辑"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* 删除按钮：仅草稿可删除 */}
                        {isStatusMatch(product.status, 'Draft') && (
                          <button
                            onClick={() => onDeleteProduct(product.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* 下架按钮：已上架可下架 */}
                        {isStatusMatch(product.status, 'Published') && onOfflineProduct && (
                          <button
                            onClick={() => onOfflineProduct(product.id)}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="下架"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* 上架按钮：已下架可重新上架 */}
                        {isStatusMatch(product.status, 'Offline') && onOnlineProduct && (
                          <button
                            onClick={() => onOnlineProduct(product.id)}
                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="重新上架"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* 撤回按钮：审核中可撤回 */}
                        {isStatusMatch(product.status, 'Pending') && onWithdrawProduct && (
                          <button
                            onClick={() => onWithdrawProduct(product.id)}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="撤回审核"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {/* 查看按钮：审核中、已上架仅可查看 */}
                        {(isStatusMatch(product.status, 'Pending') || isStatusMatch(product.status, 'Published')) && (
                          <button
                            onClick={() => onFullEdit(product.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
