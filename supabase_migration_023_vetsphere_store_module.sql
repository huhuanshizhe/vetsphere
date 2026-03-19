-- ============================================
-- Migration 023: VetSphere Store Module
-- ============================================
-- 完整商城模块数据库结构
-- 包含：产品、供应商、订单、询盘、分类、站点视图

-- ==========================================
-- 1. 扩展 products 表
-- ==========================================

-- 添加商城所需字段到现有 products 表
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS pricing_mode text DEFAULT 'fixed', -- 'fixed' | 'inquiry'
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_kg numeric,
ADD COLUMN IF NOT EXISTS dimensions jsonb, -- {length, width, height}
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]', -- 多张图片
ADD COLUMN IF NOT EXISTS category_id text,
ADD COLUMN IF NOT EXISTS subcategory_id text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft', -- 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published'
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- 产品分类表 (检查是否存在，不存在则创建)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_categories') THEN
    CREATE TABLE public.product_categories (
      id text primary key,
      name text not null,
      name_zh text,
      name_en text,
      slug text unique not null,
      parent_id text references public.product_categories(id),
      sort_order integer DEFAULT 0,
      is_active boolean DEFAULT true,
      created_at timestamp with time zone default timezone('utc'::text, now())
    );
  END IF;
END $$;

-- 产品站点视图 (Site View 机制) - 已在 migration 017 创建
-- 这里只添加新字段（如果需要）
-- ALTER TABLE public.product_site_views ADD COLUMN IF NOT EXISTS ...

-- ==========================================
-- 2. 供应商表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  company_name text not null,
  company_name_zh text,
  slug text unique,
  email text not null,
  phone text,
  website text,
  address jsonb, -- {country, city, street, zip}
  business_license text,
  tax_id text,
  logo_url text,
  description text,
  description_zh text,
  status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'suspended'
  rejection_reason text,
  is_verified boolean DEFAULT false,
  rating numeric DEFAULT 5.0,
  total_orders integer DEFAULT 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 将现有产品的 supplier_id 关联到 suppliers 表
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_uuid uuid references public.suppliers(id);

-- ==========================================
-- 3. 订单相关表
-- ==========================================

-- 扩展现有 orders 表
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_number text unique,
ADD COLUMN IF NOT EXISTS supplier_id uuid references public.suppliers(id),
ADD COLUMN IF NOT EXISTS subtotal_amount numeric,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS internal_notes text, -- 供应商/管理员备注
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- 订单项目表 (拆分 items JSONB)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id),
  product_name text not null,
  product_sku text,
  product_image text,
  unit_price numeric not null,
  quantity integer not null,
  total_price numeric not null,
  specifications jsonb, -- 购买时的规格
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==========================================
-- 4. 询盘表 (Inquiry)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text unique,
  product_id text references public.products(id),
  product_name text,
  supplier_id uuid references public.suppliers(id),
  
  -- 客户信息
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_company text,
  customer_country text,
  
  -- 询盘内容
  quantity_requested integer,
  target_price numeric,
  requirements text,
  attachments jsonb DEFAULT '[]',
  
  -- 状态
  status text DEFAULT 'pending', -- 'pending' | 'quoted' | 'negotiating' | 'accepted' | 'rejected' | 'expired'
  
  -- 供应商回复
  quoted_price numeric,
  quoted_quantity integer,
  quote_valid_until date,
  supplier_notes text,
  quote_attachments jsonb DEFAULT '[]',
  quoted_at timestamp with time zone,
  
  -- 关联订单
  order_id text references public.orders(id),
  
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==========================================
-- 5. 启用 RLS 和创建策略
-- ==========================================

-- 产品分类
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.product_categories;
CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 产品站点视图
ALTER TABLE public.product_site_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view published site views" ON public.product_site_views;
CREATE POLICY "Anyone can view published site views" ON public.product_site_views FOR SELECT USING (publish_status = 'published');
DROP POLICY IF EXISTS "Admins can manage site views" ON public.product_site_views;
CREATE POLICY "Admins can manage site views" ON public.product_site_views FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 供应商
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view approved suppliers" ON public.suppliers;
CREATE POLICY "Anyone can view approved suppliers" ON public.suppliers FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Suppliers can view own profile" ON public.suppliers;
CREATE POLICY "Suppliers can view own profile" ON public.suppliers FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Suppliers can update own profile" ON public.suppliers;
CREATE POLICY "Suppliers can update own profile" ON public.suppliers FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 订单项目
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Suppliers can view order items for their products" ON public.order_items;
CREATE POLICY "Suppliers can view order items for their products" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    JOIN public.suppliers s ON p.supplier_uuid = s.id 
    WHERE p.id = product_id AND s.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 询盘
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers can view own inquiries" ON public.inquiries;
CREATE POLICY "Customers can view own inquiries" ON public.inquiries FOR SELECT USING (
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "Suppliers can view inquiries for their products" ON public.inquiries;
CREATE POLICY "Suppliers can view inquiries for their products" ON public.inquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Suppliers can update inquiries for their products" ON public.inquiries;
CREATE POLICY "Suppliers can update inquiries for their products" ON public.inquiries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.suppliers WHERE id = supplier_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage inquiries" ON public.inquiries;
CREATE POLICY "Admins can manage inquiries" ON public.inquiries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- ==========================================
-- 6. 创建索引
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_pricing_mode ON public.products(pricing_mode);
CREATE INDEX IF NOT EXISTS idx_products_supplier_uuid ON public.products(supplier_uuid);

CREATE INDEX IF NOT EXISTS idx_product_site_views_product ON public.product_site_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_site_views_site ON public.product_site_views(site_code);
CREATE INDEX IF NOT EXISTS idx_product_site_views_status ON public.product_site_views(publish_status);

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_user ON public.suppliers(user_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_inquiries_product ON public.inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_supplier ON public.inquiries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer ON public.inquiries(customer_email);

-- ==========================================
-- 7. 创建辅助函数
-- ==========================================

-- 生成订单号
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists_check boolean;
BEGIN
  LOOP
    new_number := 'VS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_number = new_number) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 生成询盘号
CREATE OR REPLACE FUNCTION generate_inquiry_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists_check boolean;
BEGIN
  LOOP
    new_number := 'INQ-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.inquiries WHERE inquiry_number = new_number) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. 插入默认分类数据 (仅当表有 name 列时)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_categories' 
    AND column_name = 'name'
  ) THEN
    INSERT INTO public.product_categories (id, name, name_zh, name_en, slug, sort_order) VALUES
    ('cat-powertools', '电动工具', '电动工具', 'Power Tools', 'power-tools', 1),
    ('cat-implants', '植入物', '植入物', 'Implants', 'implants', 2),
    ('cat-instruments', '手术器械', '手术器械', 'Surgical Instruments', 'surgical-instruments', 3),
    ('cat-consumables', '耗材', '耗材', 'Consumables', 'consumables', 4),
    ('cat-equipment', '设备', '设备', 'Equipment', 'equipment', 5),
    ('cat-imaging', '影像设备', '影像设备', 'Imaging', 'imaging', 6)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ==========================================
-- 9. 创建视图：已发布产品（用于前端查询）
-- ==========================================

CREATE OR REPLACE VIEW public.published_products AS
SELECT 
  p.*,
  psv.site_code as published_site,
  psv.published_at as site_published_at,
  s.company_name as supplier_name,
  s.logo_url as supplier_logo,
  s.rating as supplier_rating
FROM public.products p
JOIN public.product_site_views psv ON p.id = psv.product_id
LEFT JOIN public.suppliers s ON p.supplier_uuid = s.id
WHERE p.status = 'published' 
  AND psv.publish_status = 'published'
  AND (s.status = 'approved' OR s.status IS NULL);

-- ==========================================
-- 验证
-- ==========================================
SELECT 'Migration 023 completed successfully!' as status;
