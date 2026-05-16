import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/auth-middleware', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

import { PATCH } from '../src/app/api/v1/admin/products/[id]/route';

interface ProductRow {
  id: string;
  name: string;
  category_id: string | null;
  subcategory_id: string | null;
  level3_category_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  parent_id: string | null;
}

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3002/api/v1/admin/products/prod_test', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function createSupabaseMock(
  existingProduct: ProductRow,
  categoryRows: CategoryRow[],
  updatedPayloads: Array<Record<string, unknown>>,
) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: existingProduct,
                error: null,
              }),
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            updatedPayloads.push(payload);

            return {
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { ...existingProduct, ...payload },
                    error: null,
                  }),
                })),
              })),
            };
          }),
        };
      }

      if (table === 'product_categories') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: categoryRows,
              error: null,
            }),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('product PATCH category validation', () => {
  const existingProduct: ProductRow = {
    id: 'prod_test',
    name: 'Test Product',
    category_id: 'cat-root',
    subcategory_id: 'cat-child',
    level3_category_id: 'cat-leaf',
    created_at: '2026-05-16T00:00:00.000Z',
    updated_at: '2026-05-16T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      admin: {
        id: 'admin-1',
        email: 'admin@example.com',
      },
    });
  });

  it('clears a missing third-level category before updating the product', async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];
    mocks.getSupabaseAdmin.mockReturnValue(
      createSupabaseMock(
        existingProduct,
        [
          { id: 'cat-root', parent_id: null },
          { id: 'cat-child', parent_id: 'cat-root' },
        ],
        updatedPayloads,
      ),
    );

    const response = await PATCH(createRequest({
      category_id: 'cat-root',
      subcategory_id: 'cat-child',
      level3_category_id: 'missing-leaf',
    }), {
      params: Promise.resolve({ id: 'prod_test' }),
    });

    expect(response.status).toBe(200);
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({
      category_id: 'cat-root',
      subcategory_id: 'cat-child',
      level3_category_id: null,
    });
  });

  it('clears mismatched subcategory and third-level category together', async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];
    mocks.getSupabaseAdmin.mockReturnValue(
      createSupabaseMock(
        existingProduct,
        [
          { id: 'cat-root', parent_id: null },
          { id: 'wrong-child', parent_id: 'other-root' },
          { id: 'wrong-leaf', parent_id: 'wrong-child' },
        ],
        updatedPayloads,
      ),
    );

    const response = await PATCH(createRequest({
      category_id: 'cat-root',
      subcategory_id: 'wrong-child',
      level3_category_id: 'wrong-leaf',
    }), {
      params: Promise.resolve({ id: 'prod_test' }),
    });

    expect(response.status).toBe(200);
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({
      category_id: 'cat-root',
      subcategory_id: null,
      level3_category_id: null,
    });
  });

  it('clears the full category chain when the top-level category no longer exists', async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];
    mocks.getSupabaseAdmin.mockReturnValue(
      createSupabaseMock(existingProduct, [], updatedPayloads),
    );

    const response = await PATCH(createRequest({
      category_id: 'missing-root',
      subcategory_id: 'missing-child',
      level3_category_id: 'missing-leaf',
    }), {
      params: Promise.resolve({ id: 'prod_test' }),
    });

    expect(response.status).toBe(200);
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({
      category_id: null,
      subcategory_id: null,
      level3_category_id: null,
    });
  });
});