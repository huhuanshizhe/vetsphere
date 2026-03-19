-- Migration 025: Product Images Table
-- Purpose: Support multiple images per product with main/detail distinction
-- Part of: Supplier Product Management Optimization - Phase 1

-- ============================================
-- 0. Drop existing table if it exists (to ensure clean migration)
-- ============================================

DROP TABLE IF EXISTS product_images CASCADE;

-- ============================================
-- 1. Create product_images table
-- ============================================

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'detail' CHECK (type IN ('main', 'detail')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    alt_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_type ON product_images(type);
CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON product_images(sort_order);

-- ============================================
-- 3. Enable RLS
-- ============================================

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies
-- ============================================

-- Allow public read access to product images (for storefront display)
CREATE POLICY "product_images_select_policy" ON product_images
    FOR SELECT
    USING (true);

-- Allow suppliers to insert images for their own products
CREATE POLICY "product_images_insert_policy" ON product_images
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_images.product_id
            AND products.supplier_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

-- Allow suppliers to update images for their own products
CREATE POLICY "product_images_update_policy" ON product_images
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN product_images pi ON p.id = pi.product_id
            WHERE pi.id = product_images.id
            AND p.supplier_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

-- Allow suppliers to delete images for their own products
CREATE POLICY "product_images_delete_policy" ON product_images
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN product_images pi ON p.id = pi.product_id
            WHERE pi.id = product_images.id
            AND p.supplier_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

-- ============================================
-- 5. Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_images_updated_at_trigger
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_product_images_updated_at();

-- ============================================
-- 6. Trigger to ensure only one main image per product
-- ============================================

CREATE OR REPLACE FUNCTION ensure_single_main_image()
RETURNS TRIGGER AS $$
BEGIN
    -- If inserting or updating a main image
    IF NEW.type = 'main' THEN
        -- Set all other images for this product to detail
        UPDATE product_images
        SET type = 'detail'
        WHERE product_id = NEW.product_id
        AND id != NEW.id
        AND type = 'main';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_main_image_trigger
    BEFORE INSERT OR UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_main_image();

-- ============================================
-- 7. Function to migrate existing image_url to product_images
-- ============================================

CREATE OR REPLACE FUNCTION migrate_existing_product_images()
RETURNS void AS $$
DECLARE
    product_record RECORD;
BEGIN
    -- For each product with an image_url but no main image in product_images
    FOR product_record IN
        SELECT id, image_url
        FROM products
        WHERE image_url IS NOT NULL
        AND image_url != ''
        AND NOT EXISTS (
            SELECT 1 FROM product_images
            WHERE product_id = products.id
            AND type = 'main'
        )
    LOOP
        INSERT INTO product_images (product_id, url, type, sort_order)
        VALUES (product_record.id, product_record.image_url, 'main', 0);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute migration (safe to run multiple times)
SELECT migrate_existing_product_images();

-- ============================================
-- 8. Comments for documentation
-- ============================================

COMMENT ON TABLE product_images IS 'Product images with support for main/detail distinction and sorting';
COMMENT ON COLUMN product_images.type IS 'main: primary product image shown in listings; detail: additional images shown in product detail page';
COMMENT ON COLUMN product_images.sort_order IS 'Display order, lower numbers appear first';
