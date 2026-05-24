import { describe, expect, it } from 'vitest';
import {
  buildDefaultLocalization,
  buildDefaultSiteView,
  createContentSlug,
  getContentRoutePath,
  mapAdminContentListItem,
  mapAdminContentRecord,
} from '../src/lib/content-admin';

describe('content-admin helpers', () => {
  it('normalizes titles into stable slugs', () => {
    expect(createContentSlug('  Small Animal Endoscopy!!! Training  ')).toBe(
      'small-animal-endoscopy-training',
    );
  });

  it('falls back to a prefixed generated slug when the input is empty', () => {
    const slug = createContentSlug('   ', 'faq-hub');
    expect(slug.startsWith('faq-hub-')).toBe(true);
  });

  it('builds default localization and site-view drafts', () => {
    expect(buildDefaultLocalization('ja', 'Endoscopy Hub')).toMatchObject({
      locale: 'ja',
      title: 'Endoscopy Hub',
      body_json: {},
      references_json: [],
      faq_json: [],
    });

    expect(buildDefaultSiteView('intl')).toMatchObject({
      site_code: 'intl',
      publish_status: 'draft',
      route_status: 'active',
      is_featured: false,
      display_order: 0,
      route_config_json: {},
    });
  });

  it('maps list rows using the requested locale and falls back to english', () => {
    const item = mapAdminContentListItem(
      {
        id: 'content-1',
        content_type: 'specialty_hub',
        canonical_slug: 'endoscopy-hub',
        workflow_state: 'draft',
        primary_specialty: 'Small Animal Surgery',
        primary_procedure: 'Endoscopy',
        updated_at: '2026-05-24T00:00:00.000Z',
        content_localizations: [
          { locale: 'en', title: 'Endoscopy Hub', summary: 'English summary' },
          { locale: 'ja', title: '内視鏡ハブ', summary: 'Japanese summary' },
        ],
        content_site_views: {
          site_code: 'intl',
          publish_status: 'draft',
          route_status: 'active',
        },
      },
      'ja',
    );

    expect(item).toMatchObject({
      id: 'content-1',
      title: '内視鏡ハブ',
      summary: 'Japanese summary',
      content_type_label: '专科中心',
    });
    expect(item.site_views).toHaveLength(1);
  });

  it('maps editor rows and sorts blocks and relations by display order', () => {
    const item = mapAdminContentRecord({
      id: 'content-2',
      content_type: 'solution',
      canonical_slug: 'clinic-endoscopy-solution',
      workflow_state: 'published',
      source_language: 'en',
      publish_priority: 8,
      content_localizations: [{ locale: 'en', title: 'Clinic Endoscopy Solution' }],
      content_site_views: [{ site_code: 'intl', publish_status: 'published', route_status: 'active' }],
      content_blocks: [
        { id: 'block-2', locale: 'en', block_key: 'cta', block_type: 'cta', display_order: 20 },
        { id: 'block-1', locale: 'en', block_key: 'hero', block_type: 'hero', display_order: 10 },
      ],
      content_relations: [
        { id: 'rel-2', relation_type: 'product', target_type: 'product', target_id: 'p2', display_order: 9 },
        { id: 'rel-1', relation_type: 'course', target_type: 'course', target_id: 'c1', display_order: 1 },
      ],
      created_at: '2026-05-24T00:00:00.000Z',
      updated_at: '2026-05-24T01:00:00.000Z',
      published_at: '2026-05-24T02:00:00.000Z',
    });

    expect(item.blocks.map((block) => block.id)).toEqual(['block-1', 'block-2']);
    expect(item.relations.map((relation) => relation.id)).toEqual(['rel-1', 'rel-2']);
    expect(getContentRoutePath('en', 'solution', 'clinic-endoscopy-solution')).toBe(
      '/en/solutions/clinic-endoscopy-solution',
    );
  });
});