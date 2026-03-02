'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

  const [activeTab, setActiveTab] = useState('概览');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  // Load data
  useEffect(() => {
    if (user?.role === 'ShopSupplier') {
      loadData();
    }
  }, [user]);

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
    }
  };

  // Product actions
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
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

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('确定要删除这件商品吗？此操作不可撤销。')) return;
    
    try {
      await api.manageProduct('delete', { id: productId });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除失败，请重试');
    }
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

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
        <div className="animate-pulse text-blue-400">加载中...</div>
      </div>
    );
  }

  // Render active tab
  const renderTab = () => {
    if (loading) {
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
            onDeleteProduct={handleDeleteProduct}
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
