'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import type { Product, Order } from '@vetsphere/shared/types';

import GearLayout from '@/components/GearLayout';
import OverviewTab from '@/components/OverviewTab';
import InventoryTab from '@/components/InventoryTab';
import OrderFulfillmentTab from '@/components/OrderFulfillmentTab';
import AnalyticsTab from '@/components/AnalyticsTab';
import ProductFormModal from '@/components/ProductFormModal';

export default function GearDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 参数读取初始 tab
  const getInitialTab = (): string => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['概览', '库存管理', '订单履约', '数据分析'];
    return validTabs.includes(tabParam || '') ? tabParam! : '概览';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);  // 初始为 false，避免闪烁
  const [initialized, setInitialized] = useState(false);  // 是否已初始化
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 监听 URL 参数变化，更新 tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['概览', '库存管理', '订单履约', '数据分析'];
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Auth check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'ShopSupplier') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Load data - 只在用户认证成功后加载一次
  useEffect(() => {
    if (user?.role === 'ShopSupplier' && !initialized) {
      loadData();
    }
  }, [user, initialized]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProducts, fetchedOrders] = await Promise.all([
        api.getProducts(),
        api.getOrders(), // Get all orders for shop supplier
      ]);

      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);

      // Filter orders that contain products
      const productOrders = (Array.isArray(fetchedOrders) ? fetchedOrders : [])
        .filter(order => order.items.some(item => item.type === 'product'));
      setOrders(productOrders);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Product actions
  const handleAddProduct = () => {
    // Navigate to dedicated new product page
    router.push('/products/new');
  };

  const handleEditProduct = (product: Product) => {
    // Quick edit in modal
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleFullEdit = (productId: string) => {
    // Navigate to dedicated edit page
    router.push(`/products/${productId}/edit`);
  };

  const handleProductSubmit = async (product: Partial<Product>, asDraft: boolean) => {
    const isEdit = !!product.id;
    const status = asDraft ? 'Draft' : 'Pending';
    const payload: Partial<Product> = {
      ...product,
      status: status as Product['status'],
      supplierId: user!.id,
    };
    await api.manageProduct(isEdit ? 'update' : 'create', payload);
    setShowProductModal(false);
    setEditingProduct(null);
    await loadData();
  };

  // 状态比较函数（兼容大小写）
  const isStatus = (status: string | undefined, target: string): boolean => {
    if (!status) return false;
    const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const normalizedTarget = target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
    return normalized === normalizedTarget;
  };

  const handleDeleteProduct = async (productId: string) => {
    // 检查产品状态，只有草稿可以删除
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!isStatus(product.status, 'Draft')) {
      alert(`无法删除：该产品当前状态为"${getStatusLabel(product.status)}"，只有草稿状态的产品才能删除。\n\n如需下架产品，请使用"下架"功能。`);
      return;
    }

    if (!confirm('确定要删除这件商品吗？此操作不可撤销。')) return;

    try {
      await api.manageProduct('delete', { id: productId });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除失败，请重试');
    }
  };

  // 下架产品
  const handleOfflineProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!isStatus(product.status, 'Published')) {
      alert('只有已上架的产品才能下架');
      return;
    }

    if (!confirm('确定要下架这件商品吗？下架后将不再展示给买家。')) return;

    try {
      await api.manageProduct('update', { id: productId, status: 'Offline' });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, status: 'Offline' as const } : p
      ));
    } catch (error) {
      console.error('Failed to offline product:', error);
      alert('下架失败，请重试');
    }
  };

  // 上架产品
  const handleOnlineProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!isStatus(product.status, 'Offline')) {
      alert('只有已下架的产品才能重新上架');
      return;
    }

    if (!confirm('确定要重新上架这件商品吗？')) return;

    try {
      await api.manageProduct('update', { id: productId, status: 'Published' });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, status: 'Published' as const } : p
      ));
    } catch (error) {
      console.error('Failed to online product:', error);
      alert('上架失败，请重试');
    }
  };

  // 撤回审核
  const handleWithdrawProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!isStatus(product.status, 'Pending')) {
      alert('只有审核中的产品才能撤回');
      return;
    }

    if (!confirm('确定要撤回审核吗？撤回后可以重新编辑产品信息。')) return;

    try {
      await api.manageProduct('update', { id: productId, status: 'Draft' });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, status: 'Draft' as const } : p
      ));
    } catch (error) {
      console.error('Failed to withdraw product:', error);
      alert('撤回失败，请重试');
    }
  };

  // 获取状态标签（兼容大小写）
  const getStatusLabel = (status: string | undefined): string => {
    if (!status) return '未知';
    const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const labels: Record<string, string> = {
      'Draft': '草稿',
      'Pending': '审核中',
      'Pending_review': '审核中',
      'Published': '已上架',
      'Rejected': '已驳回',
      'Offline': '已下架',
      'Approved': '已通过',
    };
    return labels[normalized] || normalized;
  };

  // Order actions
  const handleShipOrder = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, 'Shipped');
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: 'Shipped' } : o
      ));
    } catch (error) {
      console.error('Failed to ship order:', error);
      alert('发货失败，请重试');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Loading state - only show full-page loader during auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
        <div className="animate-pulse text-blue-400">加载中...</div>
      </div>
    );
  }

  // Render active tab - show content immediately if already loaded, or show inline loader
  const renderTab = () => {
    // 首次加载时显示 loading，切换 tab 时不显示
    if (loading && !initialized) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-blue-400">加载数据中...</div>
        </div>
      );
    }

    switch (activeTab) {
      case '概览':
        return (
          <OverviewTab
            products={products}
            orders={orders}
            onAddProduct={handleAddProduct}
          />
        );
      case '库存管理':
        return (
          <InventoryTab
            products={products}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onFullEdit={handleFullEdit}
            onDeleteProduct={handleDeleteProduct}
            onOfflineProduct={handleOfflineProduct}
            onOnlineProduct={handleOnlineProduct}
            onWithdrawProduct={handleWithdrawProduct}
          />
        );
      case '订单履约':
        return (
          <OrderFulfillmentTab
            orders={orders}
            onShipOrder={handleShipOrder}
          />
        );
      case '数据分析':
        return <AnalyticsTab products={products} orders={orders} />;
      default:
        return null;
    }
  };

  return (
    <GearLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={{ name: user.name, email: user.email }}
      onLogout={handleLogout}
    >
      {renderTab()}
      <ProductFormModal
        isOpen={showProductModal}
        initialData={editingProduct}
        onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        onSubmit={handleProductSubmit}
      />
    </GearLayout>
  );
}
