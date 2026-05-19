import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  writeAuditLog: vi.fn(),
  assertUniqueProductSlug: vi.fn(),
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

vi.mock('@/lib/product-slug', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/product-slug')>(
    '@/lib/product-slug',
  );

  return {
    ...actual,
    assertUniqueProductSlug: mocks.assertUniqueProductSlug,
  };
});

import { PATCH } from '../src/app/api/v1/admin/products/[id]/route';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  slug_en: string | null;
  created_at: string;
  updated_at: string;
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

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('product PATCH hidden slug regression protection', () => {
  const existingProduct: ProductRow = {
    id: 'prod_test',
    name: '单头克氏针',
    slug: 'single-ended-kirschner-wire',
    slug_en: 'single-ended-kirschner-wire',
    created_at: '2026-05-19T00:00:00.000Z',
    updated_at: '2026-05-19T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      admin: {
        id: 'admin-1',
        email: 'admin@example.com',
      },
    });
    mocks.assertUniqueProductSlug.mockImplementation(
      async (_supabase: unknown, _field: unknown, value: string) => value,
    );
  });

  it('does not revalidate slug_en when the incoming hidden value normalizes to the stored slug', async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock(existingProduct, updatedPayloads));

    const response = await PATCH(
      createRequest({ slug_en: ' Single Ended Kirschner Wire ' }),
      {
        params: Promise.resolve({ id: 'prod_test' }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.assertUniqueProductSlug).not.toHaveBeenCalled();
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({
      slug_en: existingProduct.slug_en,
    });
  });

  it('does not revalidate slug when the incoming hidden value normalizes to the stored slug', async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock(existingProduct, updatedPayloads));

    const response = await PATCH(
      createRequest({ slug: ' Single Ended Kirschner Wire ' }),
      {
        params: Promise.resolve({ id: 'prod_test' }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.assertUniqueProductSlug).not.toHaveBeenCalled();
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({
      slug: existingProduct.slug,
    });
  });

  it('still rejects a genuinely new duplicate slug_en value', async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock(existingProduct, updatedPayloads));
    mocks.assertUniqueProductSlug.mockRejectedValueOnce(
      new Error('Slug already exists for another product: existing-duplicate-slug'),
    );

    const response = await PATCH(
      createRequest({ slug_en: 'existing-duplicate-slug' }),
      {
        params: Promise.resolve({ id: 'prod_test' }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Slug already exists for another product: existing-duplicate-slug',
    });
    expect(updatedPayloads).toHaveLength(0);
    expect(mocks.assertUniqueProductSlug).toHaveBeenCalledOnce();
  });
});