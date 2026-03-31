import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_BATCH_SIZE = 50;

interface BulkRequest {
  action: 'approve' | 'reject' | 'publish' | 'offline' | 'delete';
  product_ids: string[];
  site_codes?: ('cn' | 'intl')[];
  reason?: string;
}

// POST /api/v1/admin/products/bulk
export async function POST(request: NextRequest) {
  try {
    const body: BulkRequest = await request.json();
    const { action, product_ids, site_codes, reason } = body;

    // Validate input
    if (!product_ids || product_ids.length === 0) {
      return NextResponse.json({ error: '请选择产品' }, { status: 400 });
    }

    if (product_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `最多选择${MAX_BATCH_SIZE}条产品` }, { status: 400 });
    }

    let affected = 0;
    const errors: { product_id: string; error: string }[] = [];
    const now = new Date().toISOString();

    switch (action) {
      case 'approve': {
        // Batch approve products (only pending_review)
        const { data, error } = await supabase
          .from('products')
          .update({
            status: 'approved',
            rejection_reason: null,
            updated_at: now
          })
          .in('id', product_ids)
          .in('status', ['pending_review', 'Pending'])
          .select('id');

        if (error) throw error;
        affected = data?.length || 0;
        break;
      }

      case 'reject': {
        if (!reason?.trim()) {
          return NextResponse.json({ error: '请输入拒绝原因' }, { status: 400 });
        }
        // Batch reject products (only pending_review)
        const { data, error } = await supabase
          .from('products')
          .update({
            status: 'rejected',
            rejection_reason: reason,
            updated_at: now
          })
          .in('id', product_ids)
          .in('status', ['pending_review', 'Pending'])
          .select('id');

        if (error) throw error;
        affected = data?.length || 0;
        break;
      }

      case 'publish': {
        if (!site_codes || site_codes.length === 0) {
          return NextResponse.json({ error: '请选择发布站点' }, { status: 400 });
        }

        // Create or update site_views for each product and site
        for (const productId of product_ids) {
          for (const siteCode of site_codes) {
            const { error: upsertError } = await supabase
              .from('product_site_views')
              .upsert({
                product_id: productId,
                site_code: siteCode,
                publish_status: 'published',
                is_enabled: true,
                published_at: now
              }, { onConflict: 'product_id,site_code' });

            if (upsertError) {
              errors.push({ product_id: productId, error: upsertError.message });
            }
          }
        }

        // Update product status to published
        const { data, error } = await supabase
          .from('products')
          .update({
            status: 'published',
            published_at: now,
            updated_at: now
          })
          .in('id', product_ids)
          .select('id');

        if (error) throw error;
        affected = data?.length || 0;
        break;
      }

      case 'offline': {
        if (!site_codes || site_codes.length === 0) {
          return NextResponse.json({ error: '请选择下架站点' }, { status: 400 });
        }

        // Update site_views to offline
        const { error } = await supabase
          .from('product_site_views')
          .update({
            publish_status: 'offline',
            is_enabled: false
          })
          .in('product_id', product_ids)
          .in('site_code', site_codes);

        if (error) throw error;
        affected = product_ids.length;
        break;
      }

      case 'delete': {
        // Batch soft delete
        const { data, error } = await supabase
          .from('products')
          .update({
            deleted_at: now,
            is_deleted: true,
            status: 'offline',
            updated_at: now
          })
          .in('id', product_ids)
          .is('deleted_at', null)
          .select('id');

        if (error) throw error;
        affected = data?.length || 0;
        break;
      }

      default:
        return NextResponse.json({ error: '无效操作' }, { status: 400 });
    }

    console.log(`[Bulk ${action}] Affected: ${affected} products`);

    return NextResponse.json({
      success: true,
      affected,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk operation failed:', error);
    return NextResponse.json(
      { error: '批量操作失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}