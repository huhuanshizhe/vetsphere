import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Fetch supplier info for products that have supplier_id
    const supplierIds = [...new Set((products || []).map(p => p.supplier_id).filter(Boolean))];
    let suppliersMap: Record<string, { name: string; email: string }> = {};

    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', supplierIds);

      if (suppliers) {
        suppliers.forEach(s => {
          suppliersMap[s.id] = { name: s.name, email: s.email };
        });
      }
    }

    const enriched = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      specialty: p.specialty,
      group: p.group_category,
      imageUrl: p.image_url,
      description: p.description,
      longDescription: p.long_description,
      specs: p.specs,
      stockStatus: p.stock_status,
      stockQuantity: p.stock_quantity ?? 0,
      status: p.status || 'Published',
      supplierId: p.supplier_id,
      supplierName: suppliersMap[p.supplier_id]?.name || p.supplier_info?.name || '-',
      supplierEmail: suppliersMap[p.supplier_id]?.email || '-',
      rejectionReason: p.rejection_reason,
      updatedAt: p.updated_at,
      createdAt: p.created_at,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json([], { status: 500 });
  }
}
