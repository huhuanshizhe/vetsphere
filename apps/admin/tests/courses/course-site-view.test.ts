import {
  createDefaultCourseSiteViewDraft,
  mapCourseSiteViewToDraft,
  normalizeCourseSiteViewPayload,
} from '@/lib/course-site-view';

describe('course site view helpers', () => {
  it('creates a sensible default draft per site', () => {
    const draft = createDefaultCourseSiteViewDraft('intl');

    expect(draft.site_code).toBe('intl');
    expect(draft.currency_code).toBe('USD');
    expect(draft.publish_status).toBe('draft');
    expect(draft.cta_config_json).toContain('{');
  });

  it('maps stored site view rows into editable draft strings', () => {
    const draft = mapCourseSiteViewToDraft(
      {
        site_code: 'cn',
        is_enabled: false,
        publish_status: 'published',
        title_override: '中国站标题',
        cta_config_json: { primary_action: 'inquiry' },
      },
      'cn',
    );

    expect(draft.site_code).toBe('cn');
    expect(draft.is_enabled).toBe(false);
    expect(draft.publish_status).toBe('published');
    expect(draft.title_override).toBe('中国站标题');
    expect(draft.cta_config_json).toContain('primary_action');
  });

  it('normalizes payload and parses json fields', () => {
    const result = normalizeCourseSiteViewPayload({
      site_code: 'intl',
      publish_status: 'published',
      title_override: '  Intl Hero  ',
      display_order: '12',
      cta_config_json: '{"primary_action":"buy"}',
      display_config_json: '{"layout":"hero"}',
    });

    expect(result.error).toBeUndefined();
    expect(result.payload?.site_code).toBe('intl');
    expect(result.payload?.title_override).toBe('Intl Hero');
    expect(result.payload?.display_order).toBe(12);
    expect(result.payload?.cta_config_json).toEqual({ primary_action: 'buy' });
  });

  it('rejects invalid json fields', () => {
    const result = normalizeCourseSiteViewPayload({
      site_code: 'cn',
      cta_config_json: '{invalid}',
    });

    expect(result.error).toContain('CTA');
  });
});