import {
  mapIntlCoursePurchaseContextRow,
  resolveCoursePurchaseMode,
  resolveCourseSitePricing,
} from '../../src/lib/course-site-purchase';

describe('resolveCourseSitePricing', () => {
  it('uses the site currency override when pricing is inherited', () => {
    const pricing = resolveCourseSitePricing(
      {
        price_usd: 1200,
        price_cny: 8600,
        price_jpy: 182000,
        is_free: false,
      },
      {
        pricing_mode: 'inherit',
        currency_code: 'JPY',
      },
      'en',
    );

    expect(pricing).toEqual({
      price: 182000,
      currency: 'JPY',
      isFree: false,
      pricingMode: 'inherit',
    });
  });

  it('hides the base price when the site view uses custom pricing', () => {
    const pricing = resolveCourseSitePricing(
      {
        price_usd: 1200,
        price_cny: 8600,
      },
      {
        pricing_mode: 'custom',
        currency_code: 'USD',
      },
      'en',
    );

    expect(pricing).toEqual({
      price: null,
      currency: 'USD',
      isFree: false,
      pricingMode: 'custom',
    });
  });

  it('marks free site views as free checkout', () => {
    const pricing = resolveCourseSitePricing(
      {
        price_usd: 1200,
        is_free: false,
      },
      {
        pricing_mode: 'free',
        currency_code: 'USD',
      },
      'en',
    );

    expect(pricing).toEqual({
      price: 0,
      currency: 'USD',
      isFree: true,
      pricingMode: 'free',
    });
  });
});

describe('resolveCoursePurchaseMode', () => {
  it('forces inquiry mode when CTA explicitly requests inquiry', () => {
    expect(
      resolveCoursePurchaseMode({
        ctaConfig: { primary_action: 'inquiry' },
        price: 1200,
        isFree: false,
        pricingMode: 'inherit',
      }),
    ).toBe('inquiry');
  });

  it('forces inquiry mode when pricing is custom', () => {
    expect(
      resolveCoursePurchaseMode({
        ctaConfig: {},
        price: null,
        isFree: false,
        pricingMode: 'custom',
      }),
    ).toBe('inquiry');
  });

  it('allows direct checkout when price resolution succeeds', () => {
    expect(
      resolveCoursePurchaseMode({
        ctaConfig: {},
        price: 1200,
        isFree: false,
        pricingMode: 'inherit',
      }),
    ).toBe('direct');
  });
});

describe('mapIntlCoursePurchaseContextRow', () => {
  it('maps the site view row into localized purchase context', () => {
    const context = mapIntlCoursePurchaseContextRow(
      {
        id: 'sv-1',
        course_id: 'course-1',
        site_code: 'intl',
        pricing_mode: 'inherit',
        currency_code: 'USD',
        cta_config_json: {},
        courses: {
          title: 'Fallback Title',
          title_ja: '日本語タイトル',
          cover_image_url: 'https://example.com/course-cover.jpg',
          instructor: {
            name: 'Fallback Instructor',
            name_ja: '日本語讲师',
          },
          location: {
            city: 'Tokyo',
            venue: 'Training Center',
            city_ja: '东京',
            venue_ja: '培训中心',
          },
          start_date: '2026-05-20',
          end_date: '2026-05-22',
          enrollment_deadline: '2026-05-15',
          format: 'offline',
          price_usd: 1200,
          max_enrollment: 24,
          current_enrollment: 12,
          is_free: false,
        },
      },
      'ja',
    );

    expect(context).toEqual({
      site_view_id: 'sv-1',
      course_id: 'course-1',
      site_code: 'intl',
      title: '日本語タイトル',
      cover_image_url: 'https://example.com/course-cover.jpg',
      instructor_name: '日本語讲师',
      start_date: '2026-05-20',
      end_date: '2026-05-22',
      enrollment_deadline: '2026-05-15',
      location_text: '东京 · 培训中心',
      format: 'offline',
      price: 1200,
      currency: 'USD',
      is_free: false,
      pricing_mode: 'inherit',
      purchase_mode: 'direct',
      max_enrollment: 24,
      current_enrollment: 12,
    });
  });
});