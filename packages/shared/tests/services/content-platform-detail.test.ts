import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const responses: Array<{ data: unknown; error: { message: string } | null }> = [];

  const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    or: vi.fn(),
  };

  const from = vi.fn();

  return {
    responses,
    queryBuilder,
    from,
  };
});

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { getPublishedIntlContentBySlug } from '../../src/services/content-platform';

describe('content-platform detail loading', () => {
  beforeEach(() => {
    mocks.responses.length = 0;

    mocks.queryBuilder.select.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.eq.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.limit.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.or.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.maybeSingle.mockImplementation(async () => {
      return mocks.responses.shift() || { data: null, error: null };
    });
    mocks.from.mockReturnValue(mocks.queryBuilder);
  });

  it('falls back to canonical slug lookup without using nested or filters', async () => {
    mocks.responses.push(
      { data: null, error: null },
      {
        data: {
          id: 'site-view-1',
          site_code: 'intl',
          publish_status: 'published',
          slug_override: null,
          seo_title_override: null,
          seo_description_override: null,
          is_featured: false,
          display_order: 0,
          route_status: 'active',
          published_at: '2026-05-24T00:00:00.000Z',
          content_records: {
            id: 'content-1',
            content_type: 'procedure',
            canonical_slug: 'tplo',
            workflow_state: 'published',
            source_language: 'en',
            primary_specialty: 'Orthopedics',
            primary_procedure: 'TPLO',
            target_audience: 'Veterinary surgeons',
            search_intent: 'procedure guidance',
            updated_at: '2026-05-24T00:00:00.000Z',
            published_at: '2026-05-24T00:00:00.000Z',
            content_localizations: [
              {
                locale: 'en',
                title: 'TPLO Training and Equipment Guide',
                subtitle: null,
                summary: 'Summary',
                hero_title: null,
                hero_subtitle: null,
                seo_title: null,
                seo_description: null,
                body_markdown: 'Body',
                body_json: {},
                opening_answer: 'Answer',
                references_json: [],
                faq_json: [],
              },
            ],
            content_blocks: [],
            content_relations: [],
          },
        },
        error: null,
      },
    );

    const result = await getPublishedIntlContentBySlug({
      locale: 'en',
      contentType: 'procedure',
      slug: 'tplo',
    });

    expect(result).toMatchObject({
      slug: 'tplo',
      title: 'TPLO Training and Equipment Guide',
      content_type: 'procedure',
    });
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.queryBuilder.or).not.toHaveBeenCalled();
  });
});