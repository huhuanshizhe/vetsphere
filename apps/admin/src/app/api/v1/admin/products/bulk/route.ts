import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_BATCH_SIZE = 50;

interface BulkRequest {
  action: 'approve' | 'reject' | 'publish' | 'offline' | 'delete' | 'submit_review';
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
    let skipped = 0;
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
        skipped = product_ids.length - affected;
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
        skipped = product_ids.length - affected;
        break;
      }

      case 'submit_review': {
        // Only supplier products in draft can be submitted for review
        const { data: products } = await supabase
          .from('products')
          .select('id, supplier_id, status')
          .in('id', product_ids);

        const eligible = (products || []).filter(
          p => p.status === 'draft' && p.supplier_id
        );
        skipped = product_ids.length - eligible.length;

        if (eligible.length > 0) {
          const { data, error } = await supabase
            .from('products')
            .update({ status: 'pending_review', updated_at: now })
            .in('id', eligible.map(p => p.id))
            .select('id');

          if (error) throw error;
          affected = data?.length || 0;
        }
        break;
      }

      case 'publish': {
        if (!site_codes || site_codes.length === 0) {
          return NextResponse.json({ error: '请选择发布站点' }, { status: 400 });
        }

        // Check eligibility: self-owned can publish from any status, supplier must be approved+
        const { data: products } = await supabase
          .from('products')
          .select('id, supplier_id, status')
          .in('id', product_ids);

        const eligible = (products || []).filter(p => {
          if (!p.supplier_id) return true; // self-owned: always publishable
          return ['approved', 'published', 'offline'].includes(p.status);
        });
        const eligibleIds = eligible.map(p => p.id);
        skipped = product_ids.length - eligibleIds.length;

        if (eligibleIds.length > 0) {
          // Create or update site_views for eligible products
          for (const productId of eligibleIds) {
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
            .in('id', eligibleIds)
            .select('id');

          if (error) throw error;
          affected = data?.length || 0;
        }
        break;
      }

      case 'offline': {
        if (!site_codes || site_codes.length === 0) {
          return NextResponse.json({ error: '请选择下架站点' }, { status: 400 });
        }

        // Update site_views to offline for selected sites
        const { error } = await supabase
          .from('product_site_views')
          .update({
            publish_status: 'offline',
            is_enabled: false
          })
          .in('product_id', product_ids)
          .in('site_code', site_codes);

        if (error) throw error;

        // Check if ALL site_views are now offline for each product, sync product status
        for (const productId of product_ids) {
          const { data: remaining } = await supabase
            .from('product_site_views')
            .select('id')
            .eq('product_id', productId)
            .eq('publish_status', 'published')
            .limit(1);

          if (!remaining || remaining.length === 0) {
            // No published site_views remain, set product to offline
            await supabase
              .from('products')
              .update({ status: 'offline', updated_at: now })
              .eq('id', productId)
              .eq('status', 'published');
          }
        }

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

    console.log(`[Bulk ${action}] Affected: ${affected}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      affected,
      skipped: skipped > 0 ? skipped : undefined,
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
