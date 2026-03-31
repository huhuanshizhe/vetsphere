import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/products/export
// Query params: status, search, supplier_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const supplierId = searchParams.get('supplier_id');

    // Build query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        brand,
        price,
        stock_quantity,
        status,
        created_at,
        published_at,
        supplier:suppliers(company_name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      query = query.in('status', statusList);
    }

    if (search?.trim()) {
      const keyword = search.trim();
      query = query.or(`name.ilike.%${keyword}%,sku.ilike.%${keyword}%,brand.ilike.%${keyword}%`);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    // Generate CSV
    const headers = ['ID', '名称', 'SKU', '品牌', '价格', '库存', '状态', '供应商', '创建时间', '发布时间'];

    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma or newline
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = products?.map(p => [
      escapeCSV(p.id),
      escapeCSV(p.name),
      escapeCSV(p.sku),
      escapeCSV(p.brand),
      escapeCSV(p.price),
      escapeCSV(p.stock_quantity),
      escapeCSV(p.status),
      escapeCSV(Array.isArray(p.supplier) ? p.supplier[0]?.company_name : p.supplier?.company_name),
      escapeCSV(p.created_at),
      escapeCSV(p.published_at)
    ]) || [];

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Add BOM for Excel to recognize UTF-8
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    const dateStr = new Date().toISOString().split('T')[0];

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products_export_${dateStr}.csv"`
      }
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { error: '导出失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}