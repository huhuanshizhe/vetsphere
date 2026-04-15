import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@vetsphere/shared/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * Locale to currency mapping (same as getLocaleCurrency)
 */
function getLocaleCurrency(locale: string): string {
  switch (locale) {
    case 'zh':
    case 'cn':
      return 'CNY';
    case 'ja':
      return 'JPY';
    case 'th':
      return 'THB';
    case 'en':
    default:
      return 'USD';
  }
}

/**
 * Get the correct price field from SKU based on currency
 */
function getSkuPrice(sku: any, currency: string): number {
  switch (currency) {
    case 'CNY':
      return sku.selling_price || sku.selling_price_usd || 0;
    case 'JPY':
      return sku.selling_price_jpy || sku.selling_price_usd || 0;
    case 'THB':
      return sku.selling_price_thb || sku.selling_price_usd || 0;
    default: // USD
      return sku.selling_price_usd || sku.selling_price || 0;
  }
}

/**
 * POST /api/cart-prices
 * Batch fetch locale-specific SKU prices for cart items
 *
 * Request body:
 * {
 *   "items": [
 *     { "skuId": "xxx", "productId": "yyy", "quantity": 2 },
 *     ...
 *   ],
 *   "locale": "ja"
 * }
 *
 * Response:
 * {
 *   "prices": {
 *     "skuId_1": { "price": 15000, "currency": "JPY", "inStock": true },
 *     ...
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, locale } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const currency = getLocaleCurrency(locale);
    const supabase = getSupabaseAdmin();

    // Collect all unique SKU IDs
    const skuIds = [...new Set(items.map((item: any) => item.skuId).filter(Boolean))];

    const prices: Record<string, { price: number; currency: string; inStock: boolean }> = {};

    // Fetch SKU prices if we have SKU IDs
    if (skuIds.length > 0) {
      const { data: skus, error } = await supabase
        .from('product_skus')
        .select(`
          id,
          sku_code,
          selling_price,
          selling_price_usd,
          selling_price_jpy,
          selling_price_thb,
          stock_quantity,
          is_active,
          product_id
        `)
        .in('id', skuIds);

      if (error) throw error;

      // Map SKU ID to price
      (skus || []).forEach((sku: any) => {
        const price = getSkuPrice(sku, currency);
        prices[sku.id] = {
          price,
          currency,
          inStock: sku.is_active && (sku.stock_quantity === null || sku.stock_quantity > 0),
        };
      });

      // Check for tier pricing
      const { data: tiers, error: tierError } = await supabase
        .from('product_price_tiers')
        .select('*')
        .in('sku_id', skuIds)
        .order('min_quantity', { ascending: true });

      if (!tierError && tiers && tiers.length > 0) {
        items.forEach((item: any) => {
          if (!item.skuId) return;
          const quantity = item.quantity || 1;

          // Find applicable tier for this quantity
          let tierPrice: number | null = null;
          for (const tier of tiers) {
            if (tier.sku_id === item.skuId &&
                quantity >= tier.min_quantity &&
                (!tier.max_quantity || quantity <= tier.max_quantity)) {
              // Get tier price in the target currency
              switch (currency) {
                case 'CNY':
                  tierPrice = tier.price_cny || tier.price_usd;
                  break;
                case 'JPY':
                  tierPrice = tier.price_jpy || tier.price_usd;
                  break;
                case 'THB':
                  tierPrice = tier.price_thb || tier.price_usd;
                  break;
                default:
                  tierPrice = tier.price_usd;
              }
              break;
            }
          }

          // Use tier price if found and greater than 0
          if (tierPrice && tierPrice > 0) {
            prices[item.skuId] = {
              price: tierPrice,
              currency,
              inStock: prices[item.skuId]?.inStock ?? true,
            };
          }
        });
      }
    }

    // Handle items without SKU ID: fetch SKUs by product_id
    const itemsWithoutSku = items.filter((item: any) => !item.skuId);
    if (itemsWithoutSku.length > 0) {
      const productIds = [...new Set(itemsWithoutSku.map((item: any) => item.productId).filter(Boolean))];

      if (productIds.length > 0) {
        // Query SKUs by product_id (products table doesn't have multi-currency price columns)
        const { data: skus, error } = await supabase
          .from('product_skus')
          .select(`
            id,
            product_id,
            selling_price,
            selling_price_usd,
            selling_price_jpy,
            selling_price_thb,
            stock_quantity,
            is_active
          `)
          .in('product_id', productIds)
          .eq('is_active', true)
          .limit(1); // Get first active SKU per product

        if (error) throw error;

        // Group SKUs by product_id and take the first one
        const skuByProduct: Record<string, any> = {};
        (skus || []).forEach((sku: any) => {
          if (!skuByProduct[sku.product_id]) {
            skuByProduct[sku.product_id] = sku;
          }
        });

        Object.entries(skuByProduct).forEach(([productId, sku]: [string, any]) => {
          const price = getSkuPrice(sku, currency);
          prices[productId] = {
            price,
            currency,
            inStock: sku.is_active && (sku.stock_quantity === null || sku.stock_quantity > 0),
          };
        });
      }
    }

    return NextResponse.json({ prices }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('Failed to fetch cart prices:', error);
    return NextResponse.json({ prices: {} });
  }
}
