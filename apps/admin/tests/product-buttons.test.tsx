/**
 * 产品管理按钮可见性测试
 * 验证审核按钮、编辑按钮、发布按钮的正确显示
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminProductsPage from '../src/app/(admin)/products/page';
import { createClient } from '@/lib/supabase/client';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/products',
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock Supabase client instance
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  then: vi.fn(),
};

describe('AdminProductsPage - Button Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabaseClient);
  });

  const mockProducts = [
    {
      id: 'p-1',
      name: '测试产品 1',
      sku: 'SKU-001',
      price: 100,
      pricing_mode: 'fixed' as const,
      stock_quantity: 10,
      status: 'pending_review' as const,
      supplier_id: 's-1',
      image_url: null,
      created_at: '2024-01-01',
      supplier: { company_name: '供应商 A' },
      site_views: [],
    },
    {
      id: 'p-2',
      name: '测试产品 2',
      sku: 'SKU-002',
      price: 200,
      pricing_mode: 'fixed' as const,
      stock_quantity: 20,
      status: 'approved' as const,
      supplier_id: 's-1',
      image_url: null,
      created_at: '2024-01-01',
      supplier: { company_name: '供应商 A' },
      site_views: [],
    },
    {
      id: 'p-3',
      name: '测试产品 3',
      sku: 'SKU-003',
      price: 300,
      pricing_mode: 'fixed' as const,
      stock_quantity: 30,
      status: 'published' as const,
      supplier_id: 's-1',
      image_url: null,
      created_at: '2024-01-01',
      supplier: { company_name: '供应商 A' },
      site_views: [
        { site_code: 'cn', publish_status: 'published', is_enabled: true },
        { site_code: 'intl', publish_status: 'published', is_enabled: true },
      ],
    },
    {
      id: 'p-4',
      name: '测试产品 4',
      sku: 'SKU-004',
      price: 400,
      pricing_mode: 'fixed' as const,
      stock_quantity: 40,
      status: 'rejected' as const,
      rejection_reason: '信息不完整',
      supplier_id: 's-1',
      image_url: null,
      created_at: '2024-01-01',
      supplier: { company_name: '供应商 A' },
      site_views: [],
    },
    {
      id: 'p-5',
      name: '测试产品 5',
      sku: 'SKU-005',
      price: 500,
      pricing_mode: 'fixed' as const,
      stock_quantity: 50,
      status: 'draft' as const,
      supplier_id: 's-1',
      image_url: null,
      created_at: '2024-01-01',
      supplier: { company_name: '供应商 A' },
      site_views: [],
    },
  ];

  const setupMockData = (products: any[] = mockProducts) => {
    const mockQuery = Promise.resolve({ data: products, error: null });
    (mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: products, error: null })),
    });
    return mockQuery;
  };

  it('应该显示所有产品的编辑按钮', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /编辑/i });
      expect(editButtons.length).toBe(5); // 所有 5 个产品都应该有编辑按钮
    });
  });

  it('应该只显示待审核产品的审核按钮', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(() => {
      // 待审核产品应该显示通过和拒绝按钮
      const approveButton = screen.getByRole('button', { name: /✓ 通过/i });
      const rejectButton = screen.getByRole('button', { name: /✕ 拒绝/i });
      
      expect(approveButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
    });

    // 其他状态的产品不应该显示审核按钮
    const allApproveButtons = screen.queryAllByRole('button', { name: /✓ 通过/i });
    expect(allApproveButtons.length).toBe(1); // 只有 1 个待审核产品
  });

  it('应该只显示已通过产品的发布按钮', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(() => {
      // 已通过产品应该显示发布按钮
      const publishCnButton = screen.getByRole('button', { name: /发布中国站/i });
      const publishIntlButton = screen.getByRole('button', { name: /发布国际站/i });
      
      expect(publishCnButton).toBeInTheDocument();
      expect(publishIntlButton).toBeInTheDocument();
    });
  });

  it('应该显示已发布产品的上下架按钮', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(() => {
      // 已发布产品应该显示下架按钮（因为已经发布了）
      const offlineCnButton = screen.getByRole('button', { name: /下架中国站/i });
      const offlineIntlButton = screen.getByRole('button', { name: /下架国际站/i });
      
      expect(offlineCnButton).toBeInTheDocument();
      expect(offlineIntlButton).toBeInTheDocument();
    });
  });

  it('草稿产品应该只显示编辑按钮', async () => {
    const draftProduct = mockProducts.filter(p => p.status === 'draft');
    setupMockData(draftProduct);
    render(<AdminProductsPage />);

    await waitFor(() => {
      // 草稿产品应该只有编辑按钮
      const editButton = screen.getByRole('button', { name: /编辑/i });
      expect(editButton).toBeInTheDocument();

      // 不应该有审核、发布或上下架按钮
      expect(screen.queryByRole('button', { name: /✓ 通过/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /发布中国站/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /下架中国站/i })).not.toBeInTheDocument();
    });
  });

  it('拒绝产品应该只显示编辑按钮', async () => {
    const rejectedProduct = mockProducts.filter(p => p.status === 'rejected');
    setupMockData(rejectedProduct);
    render(<AdminProductsPage />);

    await waitFor(() => {
      // 拒绝产品应该只有编辑按钮
      const editButton = screen.getByRole('button', { name: /编辑/i });
      expect(editButton).toBeInTheDocument();

      // 不应该有审核、发布或上下架按钮
      expect(screen.queryByRole('button', { name: /✓ 通过/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /发布中国站/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /下架中国站/i })).not.toBeInTheDocument();
    });
  });

  it('统计卡片应该显示正确的数量', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(() => {
      // 检查统计卡片
      expect(screen.getByText('10')).toBeInTheDocument(); // 全部
      expect(screen.getByText('1')).toBeInTheDocument(); // 待审核
      expect(screen.getByText('1')).toBeInTheDocument(); // 已通过
      expect(screen.getByText('1')).toBeInTheDocument(); // 已发布
      expect(screen.getByText('1')).toBeInTheDocument(); // 已拒绝
    });
  });

  it('点击统计卡片应该筛选对应状态的产品', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(async () => {
      // 点击"待审核"卡片
      const pendingReviewCard = screen.getByText('待审核').closest('button');
      if (pendingReviewCard) {
        fireEvent.click(pendingReviewCard);
        
        // 应该只显示待审核产品
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /✓ 通过/i })).toBeInTheDocument();
        });
      }
    });
  });

  it('编辑按钮应该是绿色醒目的', async () => {
    setupMockData();
    render(<AdminProductsPage />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /编辑/i });
      editButtons.forEach(button => {
        expect(button).toHaveClass('bg-emerald-600');
      });
    });
  });

  it('审核通过按钮应该是绿色的', async () => {
    const pendingProduct = mockProducts.filter(p => p.status === 'pending_review');
    setupMockData(pendingProduct);
    render(<AdminProductsPage />);

    await waitFor(() => {
      const approveButton = screen.getByRole('button', { name: /✓ 通过/i });
      expect(approveButton).toHaveClass('bg-green-600');
    });
  });

  it('审核拒绝按钮应该是红色的', async () => {
    const pendingProduct = mockProducts.filter(p => p.status === 'pending_review');
    setupMockData(pendingProduct);
    render(<AdminProductsPage />);

    await waitFor(() => {
      const rejectButton = screen.getByRole('button', { name: /✕ 拒绝/i });
      expect(rejectButton).toHaveClass('bg-red-600');
    });
  });

  it('发布按钮应该是蓝色和紫色的', async () => {
    const approvedProduct = mockProducts.filter(p => p.status === 'approved');
    setupMockData(approvedProduct);
    render(<AdminProductsPage />);

    await waitFor(() => {
      const publishCnButton = screen.getByRole('button', { name: /发布中国站/i });
      const publishIntlButton = screen.getByRole('button', { name: /发布国际站/i });
      
      expect(publishCnButton).toHaveClass('bg-blue-600');
      expect(publishIntlButton).toHaveClass('bg-purple-600');
    });
  });
});
