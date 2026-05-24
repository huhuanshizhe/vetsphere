import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  admin: {
    id: 'admin-1',
    email: 'admin@example.com',
    authorizedSites: ['cn', 'intl', 'global'],
    permissions: ['*'],
  },
  assertSiteAuthorized: vi.fn(),
  writeAuditLog: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  extractAccessToken: vi.fn().mockReturnValue('test-token'),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAdminAuth:
    (handler: any) =>
    async (req: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> | Record<string, string> }) => {
      const params = routeCtx?.params ? await Promise.resolve(routeCtx.params) : undefined;
      return handler(req, { admin: mocks.admin, params });
    },
  assertSiteAuthorized: mocks.assertSiteAuthorized,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/request-auth', () => ({
  extractAccessToken: mocks.extractAccessToken,
}));

import { POST as WORKFLOW_POST } from '../src/app/api/v1/admin/content/[id]/workflow/route';

function createJsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('content review workflow route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertSiteAuthorized.mockImplementation(() => undefined);
    mocks.writeAuditLog.mockImplementation(() => undefined);
  });

  it('approves content in review', async () => {
    const calls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { workflow_state: 'in_review' },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              calls.contentRecord = payload;
              return {
                eq: vi.fn(async (column: string, value: string) => {
                  calls.contentRecordFilter = { column, value };
                  return { error: null };
                }),
              };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              calls.workflowEvent = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await WORKFLOW_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/workflow', {
        siteCode: 'intl',
        action: 'approve',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, nextState: 'approved' });
    expect(calls.contentRecord).toMatchObject({ workflow_state: 'approved', reviewer_id: 'admin-1' });
    expect(calls.contentRecordFilter).toEqual({ column: 'id', value: 'content-1' });
    expect(calls.workflowEvent).toMatchObject({
      event_type: 'approve',
      old_state: 'in_review',
      new_state: 'approved',
      payload_json: { siteCode: 'intl' },
    });
    expect(mocks.assertSiteAuthorized).toHaveBeenCalledWith(mocks.admin, 'intl');
  });

  it('requests changes and moves content back to draft', async () => {
    const calls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { workflow_state: 'scheduled' },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              calls.contentRecord = payload;
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              calls.workflowEvent = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await WORKFLOW_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/workflow', {
        siteCode: 'intl',
        action: 'request_changes',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, nextState: 'draft' });
    expect(calls.contentRecord).toMatchObject({ workflow_state: 'draft', reviewer_id: 'admin-1' });
    expect(calls.workflowEvent).toMatchObject({
      event_type: 'request_changes',
      old_state: 'scheduled',
      new_state: 'draft',
    });
  });

  it('rejects content and archives the site view', async () => {
    const calls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { workflow_state: 'approved' },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              calls.contentRecord = payload;
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
          };
        }

        if (table === 'content_site_views') {
          return {
            upsert: vi.fn(async (payload: Record<string, unknown>) => {
              calls.siteView = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              calls.workflowEvent = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await WORKFLOW_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/workflow', {
        siteCode: 'intl',
        action: 'reject',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, nextState: 'archived' });
    expect(calls.contentRecord).toMatchObject({ workflow_state: 'archived', reviewer_id: 'admin-1' });
    expect(calls.siteView).toMatchObject({
      content_id: 'content-1',
      site_code: 'intl',
      publish_status: 'archived',
      route_status: 'hidden',
    });
    expect(calls.workflowEvent).toMatchObject({
      event_type: 'reject',
      old_state: 'approved',
      new_state: 'archived',
    });
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
  });
});