import {
  getIntlProductPriceRange,
  matchesIntlProductPriceRange,
  rankIntlProductsBySearch,
  sortIntlProducts,
} from '../../src/lib/intl-product-discovery';

const ultrasoundProduct = {
  id: 'sv-ultrasound',
  product_id: 'prod-ultrasound',
  display_name: 'Portable Ultrasound Imaging System',
  base_name: 'Portable Ultrasound Imaging System',
  brand: 'VetRay',
  summary: 'High-resolution diagnostic imaging for small animal clinics.',
  description: 'Advanced ultrasound platform for abdominal and cardiac scans.',
  rich_description: '<p>Portable imaging system with Doppler modes.</p>',
  clinical_category: 'imaging-diagnostics',
  display_tags: ['ultrasound', 'diagnostics'],
  published_at: '2026-05-22T10:00:00.000Z',
  is_featured: true,
  display_order: 1,
  pricing_mode: 'fixed',
  purchase_type: 'direct',
  currency_code: 'USD',
  sku_price_usd_min: 180,
  sku_price_usd_max: 260,
  sku_price_jpy_min: 26000,
  sku_price_jpy_max: 39000,
};

const anesthesiaProduct = {
  id: 'sv-anesthesia',
  product_id: 'prod-anesthesia',
  display_name: 'Anesthesia Workstation',
  base_name: 'Anesthesia Workstation',
  brand: 'AeroVet',
  summary: 'Integrated gas anesthesia for surgical suites.',
  description: 'Includes ventilator support and monitoring ports.',
  clinical_category: 'surgery-anesthesia',
  display_tags: ['anesthesia', 'surgery'],
  published_at: '2026-05-18T10:00:00.000Z',
  is_featured: false,
  display_order: 3,
  pricing_mode: 'fixed',
  purchase_type: 'direct',
  currency_code: 'USD',
  sku_price_usd_min: 320,
  sku_price_usd_max: 480,
};

const inquiryProduct = {
  id: 'sv-inquiry',
  product_id: 'prod-inquiry',
  display_name: 'Custom Orthopedic Drill Kit',
  base_name: 'Custom Orthopedic Drill Kit',
  brand: 'OrthoMax',
  summary: 'Custom-configured kit with inquiry pricing.',
  clinical_category: 'surgery-anesthesia',
  display_tags: ['orthopedic', 'drill'],
  published_at: '2026-05-20T10:00:00.000Z',
  is_featured: false,
  display_order: 2,
  pricing_mode: 'inquiry',
  purchase_type: 'quote',
  currency_code: 'USD',
};

const exactFixatorProduct = {
  id: 'sv-fixator-0108',
  product_id: 'prod-fixator-0108',
  display_name: 'Veterinary External Fixator (Fingers & Paws) 6100-0108',
  base_name: 'Veterinary External Fixator (Fingers & Paws) 6100-0108',
  brand: 'FixVet',
  summary: 'External fixator component for small animal orthopedic repair.',
  published_at: '2026-05-21T10:00:00.000Z',
  is_featured: false,
  display_order: 4,
  pricing_mode: 'fixed',
  purchase_type: 'direct',
  currency_code: 'USD',
};

const siblingFixatorProduct = {
  id: 'sv-fixator-0102',
  product_id: 'prod-fixator-0102',
  display_name: 'Veterinary External Fixator (Fingers & Paws) 6100-0102',
  base_name: 'Veterinary External Fixator (Fingers & Paws) 6100-0102',
  brand: 'FixVet',
  summary: 'Sibling fixator part in the same family.',
  published_at: '2026-05-19T10:00:00.000Z',
  is_featured: false,
  display_order: 5,
  pricing_mode: 'fixed',
  purchase_type: 'direct',
  currency_code: 'USD',
};

describe('getIntlProductPriceRange', () => {
  it('prefers locale-specific SKU price ranges when available', () => {
    expect(getIntlProductPriceRange(ultrasoundProduct, 'ja')).toEqual({
      minPrice: 26000,
      maxPrice: 39000,
      currency: 'JPY',
    });
  });

  it('returns null prices for inquiry products', () => {
    expect(getIntlProductPriceRange(inquiryProduct, 'en')).toEqual({
      minPrice: null,
      maxPrice: null,
      currency: 'USD',
    });
  });
});

describe('matchesIntlProductPriceRange', () => {
  it('matches overlapping product price ranges instead of only the minimum price', () => {
    expect(matchesIntlProductPriceRange(ultrasoundProduct, 'en', 200, 240)).toBe(true);
    expect(matchesIntlProductPriceRange(ultrasoundProduct, 'en', 261, 400)).toBe(false);
  });
});

describe('rankIntlProductsBySearch', () => {
  it('returns typo-tolerant fuzzy matches ranked by name relevance', () => {
    const ranked = rankIntlProductsBySearch(
      [anesthesiaProduct, ultrasoundProduct],
      'ultrasuond',
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0].product_id).toBe('prod-ultrasound');
  });

  it('matches brand and rich-description content when searching equipment', () => {
    const ranked = rankIntlProductsBySearch(
      [anesthesiaProduct, ultrasoundProduct],
      'vetray doppler',
    );

    expect(ranked[0].product_id).toBe('prod-ultrasound');
  });

  it('keeps exact model or part-number queries precise instead of returning sibling codes', () => {
    const ranked = rankIntlProductsBySearch(
      [siblingFixatorProduct, exactFixatorProduct],
      '6100-0108',
    );

    expect(ranked.map((product) => product.product_id)).toEqual(['prod-fixator-0108']);
  });
});

describe('sortIntlProducts', () => {
  it('sorts by effective locale-aware minimum price instead of display_price only', () => {
    const sorted = sortIntlProducts(
      [anesthesiaProduct, ultrasoundProduct],
      'en',
      'price-low',
    );

    expect(sorted.map((product) => product.product_id)).toEqual([
      'prod-ultrasound',
      'prod-anesthesia',
    ]);
  });
});