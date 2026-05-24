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

import { POST as CREATE_POST } from '../src/app/api/v1/admin/content/route';
import { POST as PUBLISH_POST } from '../src/app/api/v1/admin/content/[id]/publish/route';
import { POST as ARCHIVE_POST } from '../src/app/api/v1/admin/content/[id]/archive/route';
import { POST as DUPLICATE_POST } from '../src/app/api/v1/admin/content/[id]/duplicate/route';

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

describe('content admin API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertSiteAuthorized.mockImplementation(() => undefined);
    mocks.writeAuditLog.mockImplementation(() => undefined);
  });

  it('creates a content draft with localizations and site views', async () => {
    const insertCalls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertCalls.contentRecord = payload;
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'content-1' },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }

        if (table === 'content_localizations') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertCalls.localizations = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'content_site_views') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertCalls.siteViews = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await CREATE_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content', {
        contentType: 'specialty_hub',
        title: 'Small Animal Endoscopy Hub',
        sourceLanguage: 'en',
        primarySpecialty: 'Small Animal Surgery',
        siteCode: 'intl',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'content-1',
      contentType: 'specialty_hub',
      canonicalSlug: 'small-animal-endoscopy-hub',
    });
    expect(insertCalls.contentRecord).toMatchObject({
      content_type: 'specialty_hub',
      canonical_slug: 'small-animal-endoscopy-hub',
      source_language: 'en',
      author_id: 'admin-1',
    });
    expect(insertCalls.localizations).toEqual([
      expect.objectContaining({
        content_id: 'content-1',
        locale: 'en',
        title: 'Small Animal Endoscopy Hub',
        is_source_locale: true,
      }),
    ]);
    expect(insertCalls.siteViews).toEqual([
      expect.objectContaining({
        content_id: 'content-1',
        site_code: 'intl',
        publish_status: 'draft',
        route_status: 'active',
      }),
    ]);
    expect(mocks.assertSiteAuthorized).toHaveBeenCalledWith(mocks.admin, 'intl');
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
  });

  it('publishes content and records a workflow event', async () => {
    const updateCalls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_localizations') {
          return {
            select: vi.fn(() => {
              const filters: Record<string, unknown> = {};
              const query = {
                eq: vi.fn((column: string, value: string) => {
                  filters[column] = value;
                  if (Object.prototype.hasOwnProperty.call(filters, 'content_id') && Object.prototype.hasOwnProperty.call(filters, 'locale')) {
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          title: 'Published title',
                          summary: 'Published summary',
                          opening_answer: 'A concise opening answer for publish validation.',
                          body_markdown: 'A'.repeat(620),
                          references_json: [{ title: 'Evidence note' }],
                        },
                        error: null,
                      }),
                    };
                  }
                  return query;
                }),
              };
              return query;
            }),
          };
        }

        if (table === 'content_records') {
          return {
            update: vi.fn((payload: Record<string, unknown>) => {
              updateCalls.contentRecord = payload;
              return {
                eq: vi.fn(async (column: string, value: string) => {
                  updateCalls.contentRecordFilter = { column, value };
                  return { error: null };
                }),
              };
            }),
          };
        }

        if (table === 'content_site_views') {
          return {
            upsert: vi.fn(async (payload: Record<string, unknown>, options: Record<string, unknown>) => {
              updateCalls.siteView = payload;
              updateCalls.siteViewOptions = options;
              return { error: null };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              updateCalls.workflowEvent = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await PUBLISH_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/publish', {
        siteCode: 'intl',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(updateCalls.contentRecord).toMatchObject({
      workflow_state: 'published',
      reviewer_id: 'admin-1',
    });
    expect(updateCalls.contentRecordFilter).toEqual({ column: 'id', value: 'content-1' });
    expect(updateCalls.siteView).toMatchObject({
      content_id: 'content-1',
      site_code: 'intl',
      publish_status: 'published',
      route_status: 'active',
    });
    expect(updateCalls.workflowEvent).toMatchObject({
      content_id: 'content-1',
      event_type: 'publish',
      actor_id: 'admin-1',
      new_state: 'published',
      payload_json: { siteCode: 'intl' },
    });
  });

  it('rejects publish when content fails readiness checks', async () => {
    const updateCalls = {
      contentRecord: 0,
      siteView: 0,
      workflowEvent: 0,
    };

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_localizations') {
          return {
            select: vi.fn(() => {
              const filters: Record<string, unknown> = {};
              const query = {
                eq: vi.fn((column: string, value: string) => {
                  filters[column] = value;
                  if (Object.prototype.hasOwnProperty.call(filters, 'content_id') && Object.prototype.hasOwnProperty.call(filters, 'locale')) {
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          title: 'Draft title',
                          summary: '',
                          opening_answer: '',
                          body_markdown: 'Too short',
                          references_json: [],
                        },
                        error: null,
                      }),
                    };
                  }
                  return query;
                }),
              };
              return query;
            }),
          };
        }

        if (table === 'content_records') {
          return {
            update: vi.fn(() => {
              updateCalls.contentRecord += 1;
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
          };
        }

        if (table === 'content_site_views') {
          return {
            upsert: vi.fn(async () => {
              updateCalls.siteView += 1;
              return { error: null };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async () => {
              updateCalls.workflowEvent += 1;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await PUBLISH_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/publish', {
        siteCode: 'intl',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Content is not ready to publish',
      failures: expect.arrayContaining([
        'Missing summary',
        'Missing opening answer',
        'Body markdown must contain at least 600 characters',
        'At least one reference is required',
      ]),
    });
    expect(updateCalls.contentRecord).toBe(0);
    expect(updateCalls.siteView).toBe(0);
    expect(updateCalls.workflowEvent).toBe(0);
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('archives content and hides the site view', async () => {
    const updateCalls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            update: vi.fn((payload: Record<string, unknown>) => {
              updateCalls.contentRecord = payload;
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
          };
        }

        if (table === 'content_site_views') {
          return {
            upsert: vi.fn(async (payload: Record<string, unknown>) => {
              updateCalls.siteView = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              updateCalls.workflowEvent = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await ARCHIVE_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/archive', {
        siteCode: 'intl',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(updateCalls.contentRecord).toMatchObject({ workflow_state: 'archived' });
    expect(updateCalls.siteView).toMatchObject({
      content_id: 'content-1',
      site_code: 'intl',
      publish_status: 'archived',
      route_status: 'hidden',
    });
    expect(updateCalls.workflowEvent).toMatchObject({
      event_type: 'archive',
      old_state: 'published',
      new_state: 'archived',
    });
  });

  it('duplicates content and resets publish-facing fields for the clone', async () => {
    const insertCalls: Record<string, unknown> = {};
    const sourceContent = {
      id: 'content-source',
      content_type: 'solution',
      canonical_slug: 'clinic-endoscopy-solution',
      source_language: 'en',
      primary_specialty: 'Small Animal Surgery',
      primary_procedure: 'Endoscopy',
      target_audience: 'Veterinary professionals',
      search_intent: 'commercial investigation',
      owner_team: 'intl-content',
      publish_priority: 6,
      content_localizations: [
        {
          locale: 'en',
          title: 'Clinic Endoscopy Solution',
          subtitle: null,
          summary: 'Summary',
          hero_title: null,
          hero_subtitle: null,
          seo_title: null,
          seo_description: null,
          body_markdown: 'Body',
          body_json: {},
          opening_answer: null,
          references_json: [],
          faq_json: [],
          is_source_locale: true,
          quality_score: null,
        },
      ],
      content_site_views: [
        {
          site_code: 'intl',
          slug_override: 'clinic-endoscopy-solution-live',
          seo_title_override: 'SEO title',
          seo_description_override: 'SEO description',
          display_order: 12,
          route_config_json: { gate: 'none' },
        },
      ],
      content_blocks: [
        {
          locale: 'en',
          block_key: 'hero',
          block_type: 'hero',
          display_order: 1,
          data_json: { title: 'Hero' },
        },
      ],
      content_relations: [
        {
          relation_type: 'course',
          target_type: 'course',
          target_id: 'course-1',
          display_order: 2,
          notes: 'Related course',
        },
      ],
    };

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: sourceContent,
                  error: null,
                }),
              })),
            })),
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertCalls.contentRecord = payload;
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'content-copy' },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }

        if (table === 'content_localizations') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertCalls.localizations = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'content_site_views') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertCalls.siteViews = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'content_blocks') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertCalls.blocks = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'content_relations') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertCalls.relations = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await DUPLICATE_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-source/duplicate', {}),
      {
        params: Promise.resolve({ id: 'content-source' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: 'content-copy' });
    expect(insertCalls.contentRecord).toMatchObject({
      content_type: 'solution',
      workflow_state: 'draft',
      author_id: 'admin-1',
    });
    expect(insertCalls.localizations).toEqual([
      expect.objectContaining({
        content_id: 'content-copy',
        title: 'Clinic Endoscopy Solution (Copy)',
      }),
    ]);
    expect(insertCalls.siteViews).toEqual([
      expect.objectContaining({
        content_id: 'content-copy',
        site_code: 'intl',
        publish_status: 'draft',
        slug_override: 'clinic-endoscopy-solution-live-copy',
        is_featured: false,
        route_status: 'active',
      }),
    ]);
    expect(insertCalls.blocks).toEqual([
      expect.objectContaining({
        content_id: 'content-copy',
        block_key: 'hero',
      }),
    ]);
    expect(insertCalls.relations).toEqual([
      expect.objectContaining({
        content_id: 'content-copy',
        relation_type: 'course',
        target_id: 'course-1',
      }),
    ]);
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
  });
});