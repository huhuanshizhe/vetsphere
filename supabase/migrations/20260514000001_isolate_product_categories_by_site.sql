-- ============================================
-- Migration: Isolate product categories by site
-- Date: 2026-05-14
-- Description:
-- 1. Replace global slug uniqueness with site-scoped uniqueness
-- 2. Enforce parent/child site consistency for category trees
-- 3. Clone legacy global category trees into CN / INTL site trees
-- 4. Migrate single-site product references onto site-scoped categories
-- 5. Add site_code to category_mappings and split legacy mappings per site
-- ============================================

CREATE OR REPLACE FUNCTION public.build_site_category_id(p_site_code text, p_source_id text)
RETURNS text AS $$
BEGIN
  IF p_source_id IS NULL OR p_source_id = '' THEN
    RETURN NULL;
  END IF;

  RETURN format('cat-%s-%s', p_site_code, regexp_replace(p_source_id, '^cat-', ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS name_zh text,
  ADD COLUMN IF NOT EXISTS site_code text DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS rich_description jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rich_description_above jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rich_description_below jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS faq_content jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_product_count boolean DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.product_categories'::regclass
      AND conname = 'product_categories_slug_key'
  ) THEN
    ALTER TABLE public.product_categories DROP CONSTRAINT product_categories_slug_key;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_product_categories_slug;
DROP INDEX IF EXISTS public.idx_product_categories_site_slug;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_site_slug
  ON public.product_categories(site_code, slug);

CREATE INDEX IF NOT EXISTS idx_product_categories_site_parent
  ON public.product_categories(site_code, parent_id);

CREATE OR REPLACE FUNCTION public.validate_product_category_site_consistency()
RETURNS trigger AS $$
DECLARE
  parent_site_code text;
  parent_level integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    IF COALESCE(NEW.level, 1) <> 1 THEN
      RAISE EXCEPTION 'Level % category must have a parent', NEW.level;
    END IF;

    RETURN NEW;
  END IF;

  SELECT site_code, level
  INTO parent_site_code, parent_level
  FROM public.product_categories
  WHERE id = NEW.parent_id;

  IF parent_site_code IS NULL THEN
    RAISE EXCEPTION 'Parent category % does not exist', NEW.parent_id;
  END IF;

  IF parent_site_code <> NEW.site_code THEN
    RAISE EXCEPTION 'Category site_code % must match parent site_code %', NEW.site_code, parent_site_code;
  END IF;

  IF parent_level IS NOT NULL AND COALESCE(NEW.level, parent_level + 1) <> parent_level + 1 THEN
    RAISE EXCEPTION 'Category level % must be parent level % + 1', NEW.level, parent_level;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_product_category_site_consistency ON public.product_categories;

CREATE TRIGGER trg_validate_product_category_site_consistency
BEFORE INSERT OR UPDATE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION public.validate_product_category_site_consistency();

CREATE TEMP TABLE tmp_site_category_seed ON COMMIT DROP AS
WITH RECURSIVE site_targets AS (
  SELECT 'cn'::text AS site_code
  UNION ALL
  SELECT 'intl'::text AS site_code
), source_categories AS (
  SELECT *
  FROM public.product_categories
  WHERE site_code = 'global'
  UNION
  SELECT parent.*
  FROM public.product_categories parent
  JOIN source_categories child ON child.parent_id = parent.id
), canonical_source_categories AS (
  SELECT DISTINCT ON (id)
    id,
    slug,
    parent_id,
    name,
    name_zh,
    name_en,
    name_th,
    name_ja,
    level,
    icon,
    description,
    description_en,
    description_th,
    description_ja,
    site_code,
    sort_order,
    display_order,
    is_active,
    rich_description,
    rich_description_above,
    rich_description_below,
    faq_content,
    show_product_count,
    meta_title_en,
    meta_title_th,
    meta_title_ja,
    meta_description_en,
    meta_description_th,
    meta_description_ja
  FROM source_categories
  ORDER BY id, CASE WHEN site_code = 'global' THEN 0 ELSE 1 END
)
SELECT
  COALESCE(existing.id, public.build_site_category_id(targets.site_code, source_category.id)) AS id,
  source_category.name,
  source_category.name_zh,
  source_category.name_en,
  source_category.name_th,
  source_category.name_ja,
  source_category.slug,
  CASE
    WHEN source_category.parent_id IS NULL THEN NULL
    ELSE COALESCE(parent_existing.id, public.build_site_category_id(targets.site_code, source_category.parent_id))
  END AS parent_id,
  source_category.level,
  source_category.icon,
  source_category.description,
  source_category.description_en,
  source_category.description_th,
  source_category.description_ja,
  targets.site_code,
  source_category.sort_order,
  source_category.display_order,
  source_category.is_active,
  source_category.rich_description,
  source_category.rich_description_above,
  source_category.rich_description_below,
  source_category.faq_content,
  source_category.show_product_count,
  source_category.meta_title_en,
  source_category.meta_title_th,
  source_category.meta_title_ja,
  source_category.meta_description_en,
  source_category.meta_description_th,
  source_category.meta_description_ja
FROM canonical_source_categories source_category
CROSS JOIN site_targets targets
LEFT JOIN public.product_categories existing
  ON existing.site_code = targets.site_code
 AND existing.slug = source_category.slug
LEFT JOIN public.product_categories parent_existing
  ON parent_existing.site_code = targets.site_code
 AND parent_existing.slug = (
   SELECT parent.slug
   FROM canonical_source_categories parent
   WHERE parent.id = source_category.parent_id
 );

INSERT INTO public.product_categories (
  id,
  name,
  name_zh,
  name_en,
  name_th,
  name_ja,
  slug,
  parent_id,
  level,
  icon,
  description,
  description_en,
  description_th,
  description_ja,
  site_code,
  sort_order,
  display_order,
  is_active,
  rich_description,
  rich_description_above,
  rich_description_below,
  faq_content,
  show_product_count,
  meta_title_en,
  meta_title_th,
  meta_title_ja,
  meta_description_en,
  meta_description_th,
  meta_description_ja
)
SELECT
  seed.id,
  seed.name,
  seed.name_zh,
  seed.name_en,
  seed.name_th,
  seed.name_ja,
  seed.slug,
  seed.parent_id,
  seed.level,
  seed.icon,
  seed.description,
  seed.description_en,
  seed.description_th,
  seed.description_ja,
  seed.site_code,
  seed.sort_order,
  seed.display_order,
  seed.is_active,
  seed.rich_description,
  seed.rich_description_above,
  seed.rich_description_below,
  seed.faq_content,
  seed.show_product_count,
  seed.meta_title_en,
  seed.meta_title_th,
  seed.meta_title_ja,
  seed.meta_description_en,
  seed.meta_description_th,
  seed.meta_description_ja
FROM tmp_site_category_seed seed
WHERE seed.level = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_categories pc
    WHERE pc.id = seed.id
  );

INSERT INTO public.product_categories (
  id,
  name,
  name_zh,
  name_en,
  name_th,
  name_ja,
  slug,
  parent_id,
  level,
  icon,
  description,
  description_en,
  description_th,
  description_ja,
  site_code,
  sort_order,
  display_order,
  is_active,
  rich_description,
  rich_description_above,
  rich_description_below,
  faq_content,
  show_product_count,
  meta_title_en,
  meta_title_th,
  meta_title_ja,
  meta_description_en,
  meta_description_th,
  meta_description_ja
)
SELECT
  seed.id,
  seed.name,
  seed.name_zh,
  seed.name_en,
  seed.name_th,
  seed.name_ja,
  seed.slug,
  seed.parent_id,
  seed.level,
  seed.icon,
  seed.description,
  seed.description_en,
  seed.description_th,
  seed.description_ja,
  seed.site_code,
  seed.sort_order,
  seed.display_order,
  seed.is_active,
  seed.rich_description,
  seed.rich_description_above,
  seed.rich_description_below,
  seed.faq_content,
  seed.show_product_count,
  seed.meta_title_en,
  seed.meta_title_th,
  seed.meta_title_ja,
  seed.meta_description_en,
  seed.meta_description_th,
  seed.meta_description_ja
FROM tmp_site_category_seed seed
WHERE seed.level = 2
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_categories pc
    WHERE pc.id = seed.id
  );

INSERT INTO public.product_categories (
  id,
  name,
  name_zh,
  name_en,
  name_th,
  name_ja,
  slug,
  parent_id,
  level,
  icon,
  description,
  description_en,
  description_th,
  description_ja,
  site_code,
  sort_order,
  display_order,
  is_active,
  rich_description,
  rich_description_above,
  rich_description_below,
  faq_content,
  show_product_count,
  meta_title_en,
  meta_title_th,
  meta_title_ja,
  meta_description_en,
  meta_description_th,
  meta_description_ja
)
SELECT
  seed.id,
  seed.name,
  seed.name_zh,
  seed.name_en,
  seed.name_th,
  seed.name_ja,
  seed.slug,
  seed.parent_id,
  seed.level,
  seed.icon,
  seed.description,
  seed.description_en,
  seed.description_th,
  seed.description_ja,
  seed.site_code,
  seed.sort_order,
  seed.display_order,
  seed.is_active,
  seed.rich_description,
  seed.rich_description_above,
  seed.rich_description_below,
  seed.faq_content,
  seed.show_product_count,
  seed.meta_title_en,
  seed.meta_title_th,
  seed.meta_title_ja,
  seed.meta_description_en,
  seed.meta_description_th,
  seed.meta_description_ja
FROM tmp_site_category_seed seed
WHERE seed.level = 3
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_categories pc
    WHERE pc.id = seed.id
  );

WITH single_site_products AS (
  SELECT product_id, MIN(site_code) AS site_code
  FROM public.product_site_views
  GROUP BY product_id
  HAVING COUNT(*) = 1
)
UPDATE public.products p
SET category_id = site_category.id
FROM single_site_products ssp,
     public.product_categories legacy_category,
     public.product_categories site_category
WHERE p.id = ssp.product_id
  AND legacy_category.id = p.category_id
  AND legacy_category.site_code = 'global'
  AND site_category.site_code = ssp.site_code
  AND site_category.slug = legacy_category.slug;

WITH single_site_products AS (
  SELECT product_id, MIN(site_code) AS site_code
  FROM public.product_site_views
  GROUP BY product_id
  HAVING COUNT(*) = 1
)
UPDATE public.products p
SET subcategory_id = site_category.id
FROM single_site_products ssp,
     public.product_categories legacy_category,
     public.product_categories site_category
WHERE p.id = ssp.product_id
  AND legacy_category.id = p.subcategory_id
  AND legacy_category.site_code = 'global'
  AND site_category.site_code = ssp.site_code
  AND site_category.slug = legacy_category.slug;

WITH single_site_products AS (
  SELECT product_id, MIN(site_code) AS site_code
  FROM public.product_site_views
  GROUP BY product_id
  HAVING COUNT(*) = 1
)
UPDATE public.products p
SET level3_category_id = site_category.id
FROM single_site_products ssp,
     public.product_categories legacy_category,
     public.product_categories site_category
WHERE p.id = ssp.product_id
  AND legacy_category.id = p.level3_category_id
  AND legacy_category.site_code = 'global'
  AND site_category.site_code = ssp.site_code
  AND site_category.slug = legacy_category.slug;

ALTER TABLE public.category_mappings
  ADD COLUMN IF NOT EXISTS site_code text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.category_mappings'::regclass
      AND conname = 'category_mappings_excel_l1_excel_l2_excel_l3_key'
  ) THEN
    ALTER TABLE public.category_mappings
      DROP CONSTRAINT category_mappings_excel_l1_excel_l2_excel_l3_key;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_category_mappings_site_excel_unique;

WITH legacy_rows AS (
  SELECT
    cm.id,
    cm.excel_l1,
    cm.excel_l2,
    cm.excel_l3,
    cm.category_id,
    cm.created_at,
    cm.updated_at,
    pc.site_code AS category_site_code,
    pc.slug AS category_slug
  FROM public.category_mappings cm
  LEFT JOIN public.product_categories pc
    ON pc.id = cm.category_id
  WHERE cm.site_code IS NULL
), expanded_rows AS (
  SELECT
    lr.excel_l1,
    lr.excel_l2,
    lr.excel_l3,
    CASE
      WHEN lr.category_site_code IN ('cn', 'intl') THEN lr.category_site_code
      ELSE targets.site_code
    END AS site_code,
    CASE
      WHEN lr.category_site_code IN ('cn', 'intl') THEN lr.category_id
      WHEN lr.category_slug IS NULL THEN NULL
      ELSE site_category.id
    END AS category_id,
    lr.created_at,
    COALESCE(lr.updated_at, NOW()) AS updated_at
  FROM legacy_rows lr
  LEFT JOIN LATERAL (
    SELECT 'cn'::text AS site_code
    UNION ALL
    SELECT 'intl'::text AS site_code
  ) targets ON lr.category_site_code IS NULL OR lr.category_site_code = 'global'
  LEFT JOIN public.product_categories site_category
    ON site_category.site_code = COALESCE(targets.site_code, lr.category_site_code)
   AND site_category.slug = lr.category_slug
)
INSERT INTO public.category_mappings (
  excel_l1,
  excel_l2,
  excel_l3,
  category_id,
  site_code,
  created_at,
  updated_at
)
SELECT
  expanded_rows.excel_l1,
  expanded_rows.excel_l2,
  expanded_rows.excel_l3,
  expanded_rows.category_id,
  expanded_rows.site_code,
  expanded_rows.created_at,
  expanded_rows.updated_at
FROM expanded_rows
WHERE expanded_rows.site_code IN ('cn', 'intl')
  AND NOT EXISTS (
    SELECT 1
    FROM public.category_mappings existing
    WHERE existing.site_code = expanded_rows.site_code
      AND existing.excel_l1 = expanded_rows.excel_l1
      AND COALESCE(existing.excel_l2, '') = COALESCE(expanded_rows.excel_l2, '')
      AND COALESCE(existing.excel_l3, '') = COALESCE(expanded_rows.excel_l3, '')
  );

DELETE FROM public.category_mappings
WHERE site_code IS NULL;

ALTER TABLE public.category_mappings
  ALTER COLUMN site_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.category_mappings'::regclass
      AND conname = 'category_mappings_site_code_check'
  ) THEN
    ALTER TABLE public.category_mappings
      ADD CONSTRAINT category_mappings_site_code_check
      CHECK (site_code IN ('cn', 'intl'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_mappings_site_excel_unique
  ON public.category_mappings(site_code, excel_l1, COALESCE(excel_l2, ''), COALESCE(excel_l3, ''));

CREATE INDEX IF NOT EXISTS idx_category_mappings_site_code
  ON public.category_mappings(site_code);

CREATE OR REPLACE FUNCTION public.validate_category_mapping_site_consistency()
RETURNS trigger AS $$
DECLARE
  category_site text;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT site_code
  INTO category_site
  FROM public.product_categories
  WHERE id = NEW.category_id;

  IF category_site IS NULL THEN
    RAISE EXCEPTION 'Mapped category % does not exist', NEW.category_id;
  END IF;

  IF category_site <> NEW.site_code THEN
    RAISE EXCEPTION 'Mapping site_code % must match category site_code %', NEW.site_code, category_site;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_category_mapping_site_consistency ON public.category_mappings;

CREATE TRIGGER trg_validate_category_mapping_site_consistency
BEFORE INSERT OR UPDATE ON public.category_mappings
FOR EACH ROW
EXECUTE FUNCTION public.validate_category_mapping_site_consistency();

CREATE OR REPLACE FUNCTION public.get_category_tree(p_site_code text DEFAULT 'global')
RETURNS TABLE (
  id text,
  name text,
  slug text,
  level integer,
  parent_id text,
  icon text,
  sort_order integer,
  children jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH level1 AS (
    SELECT
      c.id, c.name, c.slug, c.level, c.parent_id, c.icon, c.sort_order
    FROM public.product_categories c
    WHERE c.parent_id IS NULL
      AND c.is_active = true
      AND c.site_code = p_site_code
    ORDER BY c.sort_order
  ),
  level2 AS (
    SELECT
      c.id, c.name, c.slug, c.level, c.parent_id, c.icon, c.sort_order
    FROM public.product_categories c
    WHERE c.level = 2
      AND c.is_active = true
      AND c.site_code = p_site_code
    ORDER BY c.sort_order
  ),
  level3 AS (
    SELECT
      c.id, c.name, c.slug, c.level, c.parent_id, c.icon, c.sort_order
    FROM public.product_categories c
    WHERE c.level = 3
      AND c.is_active = true
      AND c.site_code = p_site_code
    ORDER BY c.sort_order
  )
  SELECT
    l1.id,
    l1.name,
    l1.slug,
    l1.level,
    l1.parent_id,
    l1.icon,
    l1.sort_order,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', l2.id,
        'name', l2.name,
        'slug', l2.slug,
        'level', l2.level,
        'icon', l2.icon,
        'sort_order', l2.sort_order,
        'children', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', l3.id,
            'name', l3.name,
            'slug', l3.slug,
            'level', l3.level,
            'icon', l3.icon,
            'sort_order', l3.sort_order
          )), '[]'::jsonb)
          FROM level3 l3
          WHERE l3.parent_id = l2.id
        )
      ))
      FROM level2 l2
      WHERE l2.parent_id = l1.id
    ) AS children
  FROM level1 l1;
END;
$$ LANGUAGE plpgsql STABLE;