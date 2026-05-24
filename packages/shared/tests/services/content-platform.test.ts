import { describe, expect, it } from 'vitest';
import {
  CONTENT_TYPE_ROUTE_SEGMENTS,
  buildIntlContentPath,
  getContentRouteSegment,
} from '../../src/services/content-platform';

describe('content-platform routes', () => {
  it('keeps all expected content route segments registered', () => {
    expect(CONTENT_TYPE_ROUTE_SEGMENTS).toMatchObject({
      specialty_hub: 'specialties',
      procedure: 'procedures',
      case: 'cases',
      solution: 'solutions',
      faq_hub: 'faq',
      glossary_term: 'glossary',
      compare_page: 'compare',
      resource: 'resources',
    });
  });

  it('builds locale-aware content paths', () => {
    expect(getContentRouteSegment('compare_page')).toBe('compare');
    expect(buildIntlContentPath('en', 'compare_page', 'rigid-vs-flexible-endoscopy')).toBe(
      '/en/compare/rigid-vs-flexible-endoscopy',
    );
    expect(buildIntlContentPath('ja', 'resource', 'clinic-setup-checklist')).toBe(
      '/ja/resources/clinic-setup-checklist',
    );
  });
});